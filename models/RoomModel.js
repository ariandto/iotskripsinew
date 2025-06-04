const { Sequelize, DataTypes } = require('sequelize');
const sequelize = require('../config/Database.js'); // Pastikan path ini sesuai dengan konfigurasi database Anda

// Definisi model untuk tabel "room"
const Room = sequelize.define('Room', {
  idmyroom: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,  // ID otomatis bertambah
    allowNull: false,     // Tidak boleh null
  },
  room: {
    type: DataTypes.STRING(50),
    allowNull: false,     // Tidak boleh null
    unique: true,         // Nama ruangan harus unik
  },
  createdAt: {
    type: DataTypes.DATE,
    allowNull: true,
    defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'), // Set default ke timestamp saat data dibuat
  },
}, {
  tableName: 'rooms', // Nama tabel di database
  timestamps: false, // Kita menggunakan createdAt manual
});

// Sinkronisasi model dengan database
(async () => {
  try {
    await sequelize.sync();  // Sinkronisasi model dengan tabel di database
    console.log("Model Room berhasil disinkronkan.");
  } catch (error) {
    console.error('Gagal menyinkronkan model Room:', error);
  }
})();

module.exports = Room;
