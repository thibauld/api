/**
 * Dependencies.
 */

var async = require('async');
var axios = require('axios');
var qs = require('querystring');
var config = require('config');

var roles = require('../constants/roles');

/**
 * Controller.
 */

module.exports = function(app) {

  /**
   * Internal Dependencies.
   */

  var errors = app.errors;
  var models = app.set('models');

  var AUTHORIZE_URI = 'https://connect.stripe.com/oauth/authorize';
  var TOKEN_URI = 'https://connect.stripe.com/oauth/token';

  var checkIfUserIsHost = function(UserId, cb) {
    models.UserGroup.find({
      where: {
        UserId: UserId,
        role: roles.HOST
      }
    })
    .done((err, userGroup) => {
      if (err) return cb(err)
      if (!userGroup) return cb(new errors.BadRequest(`User is not a host ${UserId}`));

      return cb();
    });
  };

  /**
   * Ask stripe for authorization OAuth
   */

  var authorize = function(req, res, next) {
    checkIfUserIsHost(req.remoteUser.id, (err) => {
      if (err) return next(err);

      var params = qs.stringify({
        response_type: 'code',
        scope: 'read_write',
        client_id: config.stripe.clientId,
        redirect_uri: config.stripe.redirectUri,
        state: req.remoteUser.id
      });

      res.send({
        redirectUrl: `${AUTHORIZE_URI}?${params}`
      });
    })
  };

  /**
   * Callback for the stripe OAuth
   */

  var callback = function(req, res, next) {
    var code = req.query.code;
    var UserId = req.query.state;

    if (!UserId) {
      return next(new errors.BadRequest('No state in the callback'));
    }

    async.auto({

      checkIfUserIsHost: function(cb) {
        checkIfUserIsHost(UserId, cb);
      },

      findHost: ['checkIfUserIsHost', function(cb) {
        models.User.find(UserId)
          .done(cb);
      }],

      getToken: ['findHost', function(cb) {
        axios
          .post(TOKEN_URI, {
            grant_type: 'authorization_code',
            client_id: config.stripe.clientId,
            code: code,
            client_secret: config.stripe.secret
          })
          .then((response) => cb(null, response.data))
          .catch(cb);
      }],

      createStripeAccount: ['getToken', function(cb, results) {
        var data = results.getToken;

        models.StripeAccount.create({
          accessToken: data.access_token,
          refreshToken: data.refresh_token,
          tokenType: data.token_type,
          stripePublishableKey: data.stripe_publishable_key,
          stripeUserId: data.stripe_user_id,
          scope: data.scope
        })
        .done(cb);
      }],

      linkStripeAccountToGroup: ['findHost', 'createStripeAccount', function(cb, results) {
        var host = results.findHost;

        host.setStripeAccount(results.createStripeAccount)
          .then(() => cb())
          .catch(cb);
      }]

    }, (err) => {
      if (err) return next(err);
      res.redirect(`${config.host.webapp}/?stripeStatus=success`);
    });
  };

  return {
    authorize: authorize,
    callback: callback
  };

};
