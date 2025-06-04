'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    // Membuat atau memperbarui tabel room
    await queryInterface.createTable('rooms', {
      idmyroom: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true,
        allowNull: false,
      },
      room: {
        type: Sequelize.STRING(50),
        allowNull: false,
        unique: true,
      },
      createdAt: {
        type: Sequelize.DATE,
        allowNull: true,
        defaultValue: Sequelize.NOW,
      },
    });

    // Membuat atau memperbarui tabel led_status
    await queryInterface.createTable('led_status', {
      id: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true,
        allowNull: false,
      },
      room: {
        type: Sequelize.STRING(50),
        allowNull: false,
        references: {
          model: 'rooms', // Tabel 'rooms'
          key: 'room',
        },
        onDelete: 'CASCADE', // Pastikan data terkait terhapus saat room dihapus
      },
      status: {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: false,
      },
      timestamp: {
        type: Sequelize.DATE,
        allowNull: true,
        defaultValue: Sequelize.NOW,
      },
    });
  },

  down: async (queryInterface, Sequelize) => {
    // Menghapus tabel jika rollback
    await queryInterface.dropTable('led_status');
    await queryInterface.dropTable('rooms');
  }
};
