module.exports = function(app) {

  /**
	 * Controllers.
	 */
	var cs = {};
	var controllers = [
	  'middlewares',
	  'users'
	];

	/**
	 * Exports.
	 */
  controllers.forEach(function(controller) {
	  cs[controller] = require(__dirname + '/' + controller)(app);
	});

	return cs;

};