/**
 * Dependencies.
 */

var async = require('async');
var _ = require('lodash');
var activities = require('../constants/activities');

/**
 * Controller.
 */

module.exports = (app) => {

  /**
   * Internal Dependencies.
   */

  const errors = app.errors;

  const models = app.set('models');
  const Card = models.Card;
  const User = models.User;
  const Transaction = models.Transaction;
  const Activity = models.Activity;
  const Group = models.Group;

  const transactions = require('./transactions')(app);

  const handleCanceledSubscription = (payload, res, next) => {
    const subscription = payload.event.data.object;

    Transaction.update({
      subscriptionIsActive: false
    }, {
      where: {
        stripeSubscriptionId: subscription.id
      },
      returning: true
    })
    .spread((count) => {
      if (count === 0) {
        return cb(new errors.BadRequest('Transaction not found: unknown subscription id'));
      }

      return res.sendStatus(200);
    })
    .catch(next);
  };

  const handleInvoicePayment = (payload, res, next) => {
    const event = payload.event;
    const isProduction = payload.isProduction;
    const eventId = payload.eventId;
    const stripeAccount = payload.stripeAccount;

    const invoice = event.data.object;
    const invoiceLineItems = invoice.lines.data;
    const subscription = _.find(invoiceLineItems, { type: 'subscription' });

    async.auto({
      createActivity: [(cb) => {
        // Only save activity when the event is valid
        Activity.create({
          type: activities.WEBHOOK_STRIPE_RECEIVED,
          data: {
            event,
            stripeAccount,
            eventId,
            dashboardUrl: `https://dashboard.stripe.com/${stripeAccount}/events/${eventId}`
          }
        })
        .done(cb);
      }],

      fetchPendingTransaction: ['createActivity', (cb) => {
        Transaction.findOne({
          where: {
            stripeSubscriptionId: subscription.id,
            isWaitingFirstInvoice: true
          }
        })
        .done(cb);
      }],

      fetchTransaction: ['createActivity', (cb) => {
        Transaction.findOne({
          where: {
            stripeSubscriptionId: subscription.id
          },
          include: [
            { model: Group },
            { model: User },
            { model: Card }
          ]
        })
        .then((transaction) => {

          /**
           * Stripe doesn't make a difference between development, test, staging
           * environments. If we get a webhook from another env, `transaction.stripeSubscriptionId`
           * will not be found and throw an error. Stripe will retry to send the webhook
           * if it doesn't get a 2XX status code.
           * For non-production environments, we will simply return 200 to avoid
           * the retry on Stripe side (and the email from Stripe support).
           */
          if (!transaction && !isProduction) {
            return res.sendStatus(200);
          }

          if (!transaction) {
            return cb(new errors.BadRequest('Transaction not found: unknown subscription id'));
          }

          return cb(null, transaction);
        })
        .catch(cb)
      }],

      createOrUpdateTransaction: ['fetchTransaction', 'fetchPendingTransaction', (cb, results) => {
        const pendingTransaction = results.fetchPendingTransaction;

        // If the transaction is pending, we will just update it
        // We only use pending transactions for the first subscription invoice
        if (pendingTransaction && pendingTransaction.isWaitingFirstInvoice) {
          pendingTransaction.isWaitingFirstInvoice = false;

          return pendingTransaction.save()
            .tap(transaction => {
              return Activity.create({
                    type: activities.SUBSCRIPTION_CONFIRMED,
                    data: {
                      event,
                      group: results.fetchTransaction.Group,
                      user: results.fetchTransaction.User,
                      transaction
                    }
                  });
            })
            .then(transaction => cb(null, transaction))
            .catch(cb);
        }

        const transaction = results.fetchTransaction;
        const user = transaction.User || {};
        const group = transaction.Group || {};
        const card = transaction.Card || {};

        const newTransaction = {
            type: 'payment',
            amount: subscription.amount / 100,
            currency: subscription.currency,
            paidby: user && user.id,
            description: 'Recurring subscription',
            tags: ['Donation'],
            approved: true,
            stripeSubscriptionId: subscription.id
          };

        transactions._create({
          transaction: newTransaction,
          user,
          group,
          card
        }, cb);
      }]

    }, (err) => {
      if (err) return next(err);

      /**
       * We need to return a 200 to tell stripe to not retry the webhook.
       */
      res.sendStatus(200);
    });
  };

  const stripe = (req, res, next) => {
    const body = req.body;
    const isProduction = app.set('env') === 'production'; // keep here for testing purposes

    // Stripe send test events to production as well
    // don't do anything if the event is not livemode
    if (isProduction && !body.livemode) {
      return res.sendStatus(200);
    }

    /**
     * We check the event on stripe to be sure we don't get a fake event from
     * someone else
     */
    app.stripe.events.retrieve(body.id, {
      stripe_account: body.user_id
    })
    .then(event => {

      const payload = {
        stripeAccount: body.user_id,
        eventId: body.id,
        event,
        isProduction
      };

      switch (event.type) {
        case 'invoice.payment_succeeded': // subscription payment is successful
          return handleInvoicePayment(payload, res, next);

        case 'customer.subscription.deleted': // subscription got deleted (canceled)
          return handleCanceledSubscription(payload, res, next);

        default:
          return next(new errors.BadRequest('Wrong event type received'));
      }
    })
    .catch(next);
  };

  return {
    stripe
  };

};
