/**
 * Dependencies.
 */
var async = require('async');
var _ = require('lodash');
var exec = require('child-process-promise').exec;
var app = require('../index');
var data  = require('./mocks/data.json');

/**
 * Private methods.
 */
var getData = function(item) {
  return _.extend({}, data[item]); // to avoid changing these data
};

var createSuperApplication = function(callback) {
  app.set('models').Application.create(getData('applicationSuper')).done(callback);
};

/**
 * Utils.
 */
module.exports = function() {

  return {

    cleanAllDb: function(callback) {
      exec('pg_restore -O -c -d opencollective_test test.dump')
      .then((res) => {
        console.log('out', res.stdout);
        createSuperApplication(callback);
      })
      .catch((err) => {
        console.log('Truncate DB error', err);
        callback();
      });
    },

    /**
     * Test data.
     */
    data: getData

  }

}
