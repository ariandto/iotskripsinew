'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {


    await queryInterface.addColumn('led_status', 'gpioVoltage', {
      type: Sequelize.FLOAT,
      allowNull: true,
    });

    await queryInterface.addColumn('led_status', 'forwardVoltage', {
      type: Sequelize.FLOAT,
      allowNull: true,
    });

  
  },

  down: async (queryInterface, Sequelize) => {
   
    await queryInterface.removeColumn('led_status', 'gpioVoltage');
    await queryInterface.removeColumn('led_status', 'forwardVoltage');

  }
};
