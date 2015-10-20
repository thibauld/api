/**
 * Create Slack notifications in response to Activities being created.
 *
 * See the Activity model - these events are fired in a Sequelize hook
 */

var Slack = require('slack-node');
var eventEmitter = require('../lib/activity_events');

// we use this name for the bot, no matter where we are
var SLACK_BOT_NAME = 'ocbot';

// For now at least, the OpenCollective Slack channel sees every
// event.
// TODO put this in configuration
// TODO each group gets its own configurable webhook
var OMNISCIENT_SLACK_CONFIG = {
  name: 'omni',
  webhookUri: 'https://hooks.slack.com/services/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',
  channel: 'logs'
};

/**
 * Given a slack configuration, return a closure that
 * sends a bot message to that slack channel
 * @param Object slackConfig {webhookUri: String, channel: String}
 * @return Function
 */
function getSlackMessager(slackConfig) {
  var slack = new Slack();
  slack.setWebhook(slackConfig.webhookUri);
  var channel = '#' + slackConfig.channel;

  /**
   * What to do after a slack webhook call
   * @param String err
   * @param Object response
   */
  function next(err, response) {
    var errorInResponse = false;
    if (!('status' in response && response.statusCode == 200 && response.status == 'ok')) {
      errorInResponse = true;
    }

    if (err || errorInResponse) {
      console.log('Slack message error!', err, response, slackConfig.name, slackConfig.webhookUri, channel);
    } else {
      console.log('Slack message sent', response, slackConfig.name, slackConfig.webhookUri, channel);
    }
  }

  return function(text) {
    console.log('message text is ', text);
    var message = {
      channel: channel,
      text: text,
      username: SLACK_BOT_NAME
    };
    slack.webhook(message, next);
  };
}

/**
 * Given a group, look up its slack configuration, if it has any.
 * Return closure to send message (may be a noop);
 * @param Object group
 * @return Function
 */
function getGroupSlackMessager(group) {
  return function() {};
}

var sendOmniscientMessage = getSlackMessager(OMNISCIENT_SLACK_CONFIG);

eventEmitter.on('user.created', function(data) {
  console.log('user.created event fired!');
  if (!('user' in data)) {
    // TODO how do we log?
    console.err('this seems very wrong - user.created event with no user');
  }

  var text = 'some user called ' + data.user.name + ' was created';
  sendOmniscientMessage(text);
});

// TODO lookup group when group is relevant
eventEmitter.on('groupEventThingy', function(data) {
  // check for group, then...
  getGroupSlackMessager(data.group)(data);
});

module.exports = function(app) {
  /* TODO obtain global config */
};
