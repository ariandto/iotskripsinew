const { IotLedStatusModel } = require('../models/IotLedStatusModel.js');
const db = require('../config/Database.js');
const moment = require('moment-timezone');

// Helper: Get current timestamp in WIB
const getWIBTimestamp = () => moment().tz("Asia/Jakarta").format("YYYY-MM-DD HH:mm:ss");

// Helper: Calculate power consumption
const calculatePowerConsumption = (prevTimestamp, currentTimestamp, powerRate = 5) => {
  const durationSeconds = moment(currentTimestamp).diff(moment(prevTimestamp), 'seconds');
  return durationSeconds > 0 ? (durationSeconds / 3600) * powerRate : 0;
};

// 1. Get All LED Data with Pagination
const getAllData = async (req, res) => {
  const { page = 1, limit = 10 } = req.query;
  try {
    const data = await IotLedStatusModel.findAll({
      offset: (page - 1) * parseInt(limit),
      limit: parseInt(limit),
      attributes: ['id', 'room', 'status', 'timestamp', 'power_consumption']
    });

    res.status(200).json({ success: true, message: 'Data retrieved successfully', data });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to retrieve data', error: error.message });
  }
};

// 2. Update LED Status (ON/OFF)
const updateStatus = async (req, res) => {
  const { id, status } = req.body;
  if (![0, 1].includes(parseInt(status))) {
    return res.status(400).json({ success: false, message: 'Status must be 0 (OFF) or 1 (ON).' });
  }
  
  try {
    const led = await IotLedStatusModel.findByPk(id);
    if (!led) return res.status(404).json({ success: false, message: `LED ID ${id} not found.` });
    
    const currentTimestamp = getWIBTimestamp();
    let powerConsumption = 0;
    
    if (led.status === 1 && parseInt(status) === 0) {
      powerConsumption = calculatePowerConsumption(led.timestamp, currentTimestamp);
    }

    await IotLedStatusModel.update(
      { 
        status: parseInt(status), 
        timestamp: currentTimestamp, 
        power_consumption: db.literal(`IFNULL(power_consumption, 0) + ${powerConsumption}`)
      },
      { where: { id } }
    );

    res.status(200).json({ 
      success: true, 
      message: 'Status updated successfully', 
      data: { id, room: led.room, status: parseInt(status), powerConsumption } 
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to update status.', error: error.message });
  }
};

// 3. Get Power Consumption per Room
const getPowerConsumptionPerRoom = async (req, res) => {
  try {
    const data = await IotLedStatusModel.findAll({
      attributes: ['room', [db.fn('SUM', db.col('power_consumption')), 'total_power']],
      group: ['room']
    });
    res.json({ success: true, message: 'Power consumption data retrieved', data });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to retrieve power data', error: error.message });
  }
};

// 4. Save LED Status by Room
const saveLedStatus = async (req, res) => {
  const { room } = req.params;
  const { status } = req.body;

  if (!room || typeof room !== 'string') {
    return res.status(400).json({ success: false, message: 'Room must be a non-empty string.' });
  }
  
  // Convert to numeric status to ensure consistency
  const numericStatus = status === true || status === 1 || status === '1' ? 1 : 0;

  const timestamp = getWIBTimestamp();
  let powerConsumption = 0;

  try {
    const prevData = await IotLedStatusModel.findOne({ where: { room } });

    if (prevData?.status === 1 && numericStatus === 0) {
      powerConsumption = calculatePowerConsumption(prevData.timestamp, timestamp);
    }

    await IotLedStatusModel.upsert({ 
      room, 
      status: numericStatus, 
      timestamp, 
      power_consumption: db.literal(`IFNULL(power_consumption, 0) + ${powerConsumption}`) 
    });

    res.status(200).json({
      success: true,
      message: 'LED status updated successfully.',
      data: { room, status: numericStatus, timestamp, powerConsumption },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to update LED status.', error: error.message });
  }
};

// 5. Get LED Status by Room
const getLedStatus = async (req, res) => {
  try {
    const data = await IotLedStatusModel.findAll({ 
      attributes: ['id', 'room', 'status', 'timestamp', 'power_consumption'] 
    });

    const uniqueData = data.reduce((acc, item) => {
      if (!acc[item.room] || new Date(acc[item.room].timestamp) < new Date(item.timestamp)) {
        acc[item.room] = item;
      }
      return acc;
    }, {});

    res.json({ success: true, message: 'LED status retrieved.', data: Object.values(uniqueData) });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to retrieve LED status', error: error.message });
  }
};

// 6. Calculate Real-time Power Consumption
const calculateRealtimePower = async (req, res) => {
  const { room } = req.params;
  try {
    const led = await IotLedStatusModel.findOne({ where: { room } });
    if (!led || led.status === 0) {
      return res.status(400).json({ success: false, message: 'LED is OFF or not found.' });
    }

    const currentTimestamp = getWIBTimestamp();
    const powerConsumption = calculatePowerConsumption(led.timestamp, currentTimestamp);

    if (powerConsumption > 0) {
      await IotLedStatusModel.update(
        { 
          power_consumption: db.literal(`power_consumption + ${powerConsumption}`), 
          timestamp: currentTimestamp 
        },
        { where: { room } }
      );
    }

    res.status(200).json({
      success: true,
      message: 'Real-time power consumption calculated and saved.',
      data: { room, powerConsumption }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to calculate power consumption.', error: error.message });
  }
};

// Update power consumption periodically
const updatePowerConsumptionPeriodically = async () => {
  try {
    const ledDevices = await IotLedStatusModel.findAll({ where: { status: 1 } });
    if (ledDevices.length === 0) {
      console.log("No rooms with lights ON. Power update canceled.");
      return;
    }

    const currentTimestamp = getWIBTimestamp();
    for (const led of ledDevices) {
      const latestLed = await IotLedStatusModel.findOne({
        where: { room: led.room },
        order: [['timestamp', 'DESC']]
      });
      
      if (!latestLed || latestLed.status !== 1) continue;

      const powerConsumption = calculatePowerConsumption(latestLed.timestamp, currentTimestamp);
      if (powerConsumption > 0) {
        await IotLedStatusModel.update(
          { 
            power_consumption: db.literal(`power_consumption + ${powerConsumption}`), 
            timestamp: currentTimestamp 
          },
          { where: { id: latestLed.id } } 
        );
        console.log(`Updated power consumption for room ${latestLed.room}: +${powerConsumption}`);
      }
    }
  } catch (error) {
    console.error("Failed to update power consumption:", error);
  }
};

// Schedule periodic updates (only once)
const intervalId = setInterval(async () => {
  await updatePowerConsumptionPeriodically();
}, 5000); 

// Export functions
module.exports = {
  getAllData,
  updateStatus,
  saveLedStatus,
  getLedStatus,
  getPowerConsumptionPerRoom,
  getWIBTimestamp,
  calculateRealtimePower,
  updatePowerConsumptionPeriodically
};