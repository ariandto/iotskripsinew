const Schedule = require('../models/ScheduleModel.js'); // Model Schedule
const { IotLedStatusModel } = require('../models/IotLedStatusModel.js'); // Model LED Status
const moment = require('moment-timezone'); // Untuk handling waktu
const { Op } = require('sequelize'); // Untuk operator Sequelize

// Fungsi untuk mendapatkan timestamp WIB
const getWIBTimestamp = () => moment().tz("Asia/Jakarta").format("YYYY-MM-DD HH:mm:ss");

// Fungsi untuk mengecek dan mengeksekusi jadwal
const executeSchedules = async () => {
  try {
    const now = moment().tz("Asia/Jakarta");
    const formattedNow = now.format("HH:mm:ss");
    console.log(`[${getWIBTimestamp()}] Running scheduled task. Current Time: ${formattedNow}`);

    // Ambil jadwal dalam rentang waktu ±30 detik
    const schedules = await Schedule.findAll({
      where: {
        time: {
          [Op.between]: [
            now.subtract(30, 'seconds').format("HH:mm:ss"),
            now.add(30, 'seconds').format("HH:mm:ss")
          ]
        },
      },
      include: [{
        model: IotLedStatusModel, // Menyertakan relasi dengan IotLedStatus
        required: true,
      }]
    });

    console.log(`[${getWIBTimestamp()}] Retrieved Schedules: ${JSON.stringify(schedules)}`);

    if (schedules.length === 0) {
      console.log(`[${getWIBTimestamp()}] No schedules to execute.`);
      return; // Tidak ada jadwal yang perlu dieksekusi
    }

    // Eksekusi jadwal
    for (const schedule of schedules) {
      const { room, action, IotLedStatusModel: ledStatus } = schedule;
      console.log(`[${getWIBTimestamp()}] [EXECUTING SCHEDULE] Room: ${room}, Action: ${action === 1 ? 'ON' : 'OFF'}`);

      // Update status LED sesuai jadwal
      const result = await ledStatus.update(
        {
          status: action, // Update status LED
          timestamp: moment().tz("Asia/Jakarta").format("YYYY-MM-DD HH:mm:ss") // Update timestamp
        }
      );

      // Mengecek apakah status LED berhasil diperbarui
      if (result[0] === 0) {
        console.warn(`[${getWIBTimestamp()}] [WARNING] Room: ${room} not found in led_status table.`);
      } else {
        console.log(`[${getWIBTimestamp()}] [HARDWARE COMMAND SUCCESS] Room: ${room}, LED Status: ${action === 1 ? 'ON' : 'OFF'}`);
      }
    }
  } catch (error) {
    console.error(`[${getWIBTimestamp()}] Error executing schedules:`, error.message);
    console.error(error); // Menyertakan rincian error
  }
};

// Mengekspor fungsi untuk dipanggil di tempat lain
module.exports = { executeSchedules };
