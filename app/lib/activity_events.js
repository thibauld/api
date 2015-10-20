/*
 * This module wraps events, because it may be useful
 * to constrain the kinds of events that can be emitted, someday.
 *
 * Also, it helps to show that these have a lot to do with the
 * Activities.
 */
var EventEmitter = require('events').EventEmitter;
var eventEmitter = new EventEmitter();

module.exports = eventEmitter;
