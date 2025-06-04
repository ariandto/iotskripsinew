const { DataTypes } = require('sequelize');
const db = require('../config/Database.js'); // Pastikan path ke config benar

// Definisikan model IotLedStatus dengan ID sebagai Primary Key
const IotLedStatusModel = db.define('IotLedStatus', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true, // Menambahkan auto-increment untuk ID
    allowNull: false,
  },
  room: {
    type: DataTypes.STRING(50), // Sesuaikan dengan varchar(50)
    allowNull: false,
    unique: true,
  },
  status: {
    type: DataTypes.TINYINT(1), // Menyesuaikan dengan tinyint(1)
    allowNull: false,
    defaultValue: 0, // Default 0 (OFF)
  },
  timestamp: {
    type: DataTypes.DATE, // Sesuaikan dengan datetime
    allowNull: false,
    defaultValue: DataTypes.NOW, // Set timestamp saat data pertama kali dibuat
  },

  power_consumption: {
    type: DataTypes.FLOAT, // Menyimpan konsumsi daya (Wh)
    allowNull: false,
    defaultValue: 0, // Mulai dari 0
  },
}, {
  tableName: 'led_status',
  timestamps: false, // Tidak perlu createdAt dan updatedAt
});

module.exports = { IotLedStatusModel };
