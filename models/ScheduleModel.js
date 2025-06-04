const { Sequelize, DataTypes } = require('sequelize');
const sequelize = require('../config/Database.js'); // Import konfigurasi database
const { IotLedStatusModel } = require('./IotLedStatusModel'); // Import model IotLedStatus
const moment = require('moment-timezone'); // Library untuk timezone handling

// Helper function untuk mendapatkan timestamp WIB
function getWIBTimestamp() {
  return moment().tz("Asia/Jakarta").format("YYYY-MM-DD HH:mm:ss");
}

const Schedule = sequelize.define('Schedule', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
  },
  room: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  action: {
    type: DataTypes.TINYINT(1), // Menyesuaikan dengan tinyint(1)
    allowNull: false,
    defaultValue: 0,
  },
  time: {
    type: DataTypes.TIME, // Format waktu HH:mm
    allowNull: false,
  },
  statusresult: {
    type: DataTypes.ENUM('success', 'failed'),
    allowNull: false,
    defaultValue: 'failed',
  },
  createdAt: {
    type: DataTypes.DATE,
    defaultValue: Sequelize.NOW, // Timestamp otomatis
    field: 'created_at',
  },
  updatedAt: {
    type: DataTypes.DATE,
    defaultValue: Sequelize.NOW,
    onUpdate: Sequelize.NOW, // Timestamp otomatis saat diperbarui
    field: 'updated_at',
  },
}, {
  tableName: 'schedule', // Nama tabel di database
  timestamps: true, // Mengaktifkan createdAt dan updatedAt
});

// Hook untuk memperbarui status ruangan di IotLedStatusModel setelah update jadwal
Schedule.afterUpdate(async (schedule, options) => {
  try {
    const { room, action, statusresult } = schedule; // Ambil data room, action, dan statusresult
    const existingLedStatus = await IotLedStatusModel.findOne({ where: { room } });

    if (existingLedStatus) {
      // Jika LED status sudah ada, perbarui statusnya
      await existingLedStatus.update({ status: action });
      console.log(`Status ruangan '${room}' diperbarui ke ${action === 1 ? 'ON' : 'OFF'}`);
      
      // Update statusresult berdasarkan action
      await schedule.update({ statusresult: 'success' }); // Update statusresult menjadi success jika berhasil

      // Simpan status LED berdasarkan action (ON/OFF)
      await saveLedStatus(room, action === 1); // Assuming action 1 means ON and 0 means OFF
    } else {
      // Jika ruangan tidak ditemukan, perbarui status sebagai failed
      console.warn(`Ruangan '${room}' tidak ditemukan di IotLedStatusModel.`);
      await schedule.update({ statusresult: 'failed' });
    }
  } catch (error) {
    console.error('Gagal memperbarui status IotLedStatusModel:', error);
    // Jika terjadi error, set status result ke failed
    await schedule.update({ statusresult: 'failed' });
  }
});

// Function untuk menyimpan status LED
const saveLedStatus = async (room, status) => {
  try {
    const timestamp = getWIBTimestamp();
    const [ledStatus, created] = await IotLedStatusModel.upsert({
      room,
      status,
      timestamp,
    });

    console.log(`Status LED pada room ${room} berhasil diperbarui ke ${status ? 'ON' : 'OFF'}.`);
  } catch (error) {
    console.error('Failed to save LED status:', error);
  }
};

module.exports = Schedule;
