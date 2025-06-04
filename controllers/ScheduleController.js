const { Sequelize } = require('sequelize');
const Schedule = require('../models/ScheduleModel.js');
const { IotLedStatusModel } = require('../models/IotLedStatusModel.js');
const moment = require('moment-timezone');

// Function to get current WIB time
function getWIBTimestamp() {
  return moment().tz("Asia/Jakarta").format("YYYY-MM-DD HH:mm:ss");
}

  const addSchedule = async (req, res) => {
    const { room, action, time } = req.body;

    try {
      // Validasi input
      if (!room || !action || !time) {
        return res.status(400).json({ success: false, message: 'All fields are required.' });
      }

      // Validasi format waktu
      const isValidTime = moment(time, "HH:mm:ss", true).isValid();
      if (!isValidTime) {
        return res.status(400).json({ success: false, message: 'Time must be in HH:mm:ss format.' });
      }

      // Ambil tanggal saat ini dan gabungkan dengan waktu yang dikirim
      const currentDate = moment().tz("Asia/Jakarta").format("YYYY-MM-DD");
      const wibTime = moment(`${currentDate} ${time}`, "YYYY-MM-DD HH:mm:ss").tz("Asia/Jakarta").format("YYYY-MM-DD HH:mm:ss");

      const ledAction = action === 'ON' ? 1 : action === 'OFF' ? 0 : null;
      if (ledAction === null) {
        return res.status(400).json({ success: false, message: 'Invalid action. Use ON or OFF.' });
      }

      // Cek apakah jadwal sudah ada
      const existingSchedule = await Schedule.findOne({ where: { room, time: wibTime } });
      if (existingSchedule) {
        return res.status(400).json({ success: false, message: 'Schedule already exists for this room at this time.' });
      }

      // Simpan jadwal ke database dengan waktu WIB
      const newSchedule = await Schedule.create({ room, action: ledAction, time: wibTime });
      console.log(`[${getWIBTimestamp()}] Schedule added successfully: Room ${room}, Action: ${action}, Time: ${wibTime}`);

      // Handle IotLedStatusModel untuk memastikan status sesuai dengan jadwal
      const existingLedStatus = await IotLedStatusModel.findOne({ where: { room } });
      if (existingLedStatus) {
        // Jika status saat ini sudah sesuai (OFF), tidak perlu update lagi
        if (existingLedStatus.status === ledAction) {
          console.log(`[${getWIBTimestamp()}] LED status for room '${room}' is already '${action === 'ON' ? 'ON' : 'OFF'}'.`);
        } else {
          // Jika ada perubahan status, update status LED
          await existingLedStatus.update({ status: ledAction });
          console.log(`[${getWIBTimestamp()}] LED status for room '${room}' updated to '${action === 'ON' ? 'ON' : 'OFF'}'`);

          // Save LED status to IotLedStatusModel
          await saveLedStatus(room, ledAction === 1); // Save the status (1 for ON, 0 for OFF)
        }
      } else {
        // Jika ruangan tidak ditemukan di led_status, buat entri baru dengan status sesuai jadwal
        await IotLedStatusModel.create({
          room,
          status: ledAction,
          timestamp: getWIBTimestamp(),
        });
        console.log(`[${getWIBTimestamp()}] LED status for room '${room}' created with status '${action === 'ON' ? 'ON' : 'OFF'}'`);
      }

      // Mengembalikan respons setelah jadwal berhasil disimpan
      res.status(201).json({
        success: true,
        message: 'Schedule added successfully.',
        data: newSchedule,
      });
    } catch (error) {
      console.error(`[ERROR] Failed to add schedule: ${error.message}`, error);
      res.status(500).json({ success: false, message: 'Failed to add schedule.' });
    }
  };



// Get all schedules
const getAllSchedules = async (req, res) => {
  try {
    const schedules = await Schedule.findAll();
    console.log(`[${getWIBTimestamp()}] Retrieved all schedules:`, schedules);
    res.status(200).json({ success: true, data: schedules });
  } catch (error) {
    console.error(`[ERROR] Failed to fetch schedules: ${error.message}`, error);
    res.status(500).json({ success: false, message: 'Failed to fetch schedules.' });
  }
};

// Get schedule by ID
const getScheduleById = async (req, res) => {
  const { id } = req.params;

  try {
    const schedule = await Schedule.findByPk(id);
    if (!schedule) {
      return res.status(404).json({ success: false, message: 'Schedule not found.' });
    }

    console.log(`[${getWIBTimestamp()}] Retrieved schedule with ID ${id}:`, schedule);
    res.status(200).json({ success: true, data: schedule });
  } catch (error) {
    console.error(`[ERROR] Failed to fetch schedule with ID ${id}: ${error.message}`, error);
    res.status(500).json({ success: false, message: 'Failed to fetch schedule.' });
  }
};

// Update schedule
const updateSchedule = async (req, res) => {
  const { id } = req.params;
  const { room, action, time } = req.body;

  try {
    const schedule = await Schedule.findByPk(id);
    if (!schedule) {
      return res.status(404).json({ success: false, message: 'Schedule not found.' });
    }

    if (time) {
      const isValidTime = moment(time, "HH:mm:ss", true).isValid();
      if (!isValidTime) {
        return res.status(400).json({ success: false, message: 'Time must be in HH:mm:ss format.' });
      }

      // Convert time to WIB and check if another schedule exists at the same time for the same room
      const wibTime = moment.tz(time, "Asia/Jakarta").format("HH:mm:ss");
      const existingSchedule = await Schedule.findOne({
        where: { room: room || schedule.room, time: wibTime, id: { [Sequelize.Op.ne]: id } },
      });
      if (existingSchedule) {
        return res.status(400).json({ success: false, message: 'Another schedule exists for this room at the same time.' });
      }
      schedule.time = wibTime;
    }

    // Update fields
    if (room) schedule.room = room;
    if (action) schedule.action = action === 'ON' ? 1 : action === 'OFF' ? 0 : schedule.action;

    await schedule.save();
    console.log(`[${getWIBTimestamp()}] Schedule updated successfully: Room ${schedule.room}, Action: ${schedule.action === 1 ? 'ON' : 'OFF'}, Time: ${schedule.time}`);
    res.status(200).json({
      success: true,
      message: 'Schedule updated successfully.',
      data: schedule,
    });
  } catch (error) {
    console.error(`[ERROR] Failed to update schedule with ID ${id}: ${error.message}`, error);
    res.status(500).json({ success: false, message: 'Failed to update schedule.' });
  }
};

// Delete schedule
const deleteSchedule = async (req, res) => {
  const { id } = req.params;

  try {
    const schedule = await Schedule.findByPk(id);
    if (!schedule) {
      return res.status(404).json({ success: false, message: 'Schedule not found.' });
    }

    await schedule.destroy();
    console.log(`[${getWIBTimestamp()}] Schedule with ID ${id} deleted successfully.`);
    res.status(200).json({ success: true, message: 'Schedule deleted successfully.' });
  } catch (error) {
    console.error(`[ERROR] Failed to delete schedule with ID ${id}: ${error.message}`, error);
    res.status(500).json({ success: false, message: 'Failed to delete schedule.' });
  }
};

// Execute schedules
// Function to execute schedules based on WIB time
const executeSchedules = async () => {
  try {
    // Ambil waktu saat ini dalam WIB
    const now = moment().tz("Asia/Jakarta").format("HH:mm:ss");
    console.log(`[${getWIBTimestamp()}] Checking for schedules at ${now}`);

    // Cari jadwal yang sesuai dengan waktu saat ini (WIB)
    const schedules = await Schedule.findAll({ where: { time: now } });

    if (schedules.length === 0) {
      console.log(`[${getWIBTimestamp()}] No schedules to execute at ${now}`);
      return;
    }

    // Eksekusi jadwal
    for (const schedule of schedules) {
      const { room, action } = schedule;
      console.log(`[${getWIBTimestamp()}] [EXECUTING SCHEDULE] Room: ${room}, Action: ${action === 1 ? 'ON' : 'OFF'}`);

      // Update status LED sesuai jadwal
      const result = await IotLedStatusModel.update(
        { status: action },
        { where: { room } }
      );

      if (result[0] === 0) {
        console.warn(`[${getWIBTimestamp()}] [WARNING] Room: ${room} not found in led_status table.`);
      } else {
        console.log(`[${getWIBTimestamp()}] [HARDWARE COMMAND SUCCESS] Room: ${room}, LED Status: ${action === 1 ? 'ON' : 'OFF'}`);
      }
    }
  } catch (error) {
    console.error(`[${getWIBTimestamp()}] [ERROR] Failed to execute schedules: ${error.message}`, error);
  }
};

module.exports = {
  addSchedule,
  getAllSchedules,
  getScheduleById,
  updateSchedule,
  deleteSchedule,
  executeSchedules,
};
