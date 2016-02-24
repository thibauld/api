'use strict';

module.exports = {
  up: function (queryInterface, DataTypes) {
    return queryInterface.addColumn('Transactions', 'subscriptionIsActive', {
      type: DataTypes.BOOLEAN,
      defaultValue: true
    });
  },

  down: function (queryInterface, Sequelize) {
    return queryInterface.removeColumn('Transactions', 'subscriptionIsActive');
  }
};
