const deviceConnectionStatus = new Map();

// Fungsi untuk menyamarkan alamat IP
const maskIpAddress = (ipAddress) => {
  if (!ipAddress) return null;
  const firstDotPos = ipAddress.indexOf('.');
  return firstDotPos !== -1 ? ipAddress.substring(0, firstDotPos) + ".xxx.xxx.xxx" : ipAddress;
};

// Update the device connection status
const updateConnectionStatus = (req, res) => {
  try {
    const { deviceId, rssi, ipAddress } = req.body;

    if (!deviceId) {
      return res.status(400).json({ message: 'Device ID is required' });
    }

    // Update status dengan IP yang telah disamarkan
    deviceConnectionStatus.set(deviceId, {
      connected: true,
      lastSeen: new Date(),
      rssi: rssi || null,
      ipAddress: maskIpAddress(ipAddress) // Simpan IP dalam format yang disamarkan
    });

    return res.status(200).json({
      message: 'Connection status updated successfully',
      status: 'connected'
    });
  } catch (error) {
    console.error('Error updating connection status:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
};

// Get the connection status of a specific device
const getConnectionStatus = (req, res) => {
  try {
    const { deviceId } = req.params;
    const status = deviceConnectionStatus.get(deviceId);

    if (!status) {
      return res.status(404).json({
        message: 'Device not found or never connected',
        status: 'unknown'
      });
    }

    // Consider a device disconnected if not seen in the last 30 seconds
    const isStillConnected = (new Date() - status.lastSeen) < 30000;

    return res.status(200).json({
      deviceId,
      connected: isStillConnected,
      lastSeen: status.lastSeen.toISOString(),
      rssi: status.rssi,
      ipAddress: status.ipAddress, // IP sudah disamarkan saat disimpan
      status: isStillConnected ? 'connected' : 'disconnected'
    });
  } catch (error) {
    console.error('Error getting connection status:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
};

// Get the connection status of all devices
const getAllConnectionStatus = (req, res) => {
  try {
    const connectedDevices = [];
    const now = new Date();

    deviceConnectionStatus.forEach((status, deviceId) => {
      const isStillConnected = (now - status.lastSeen) < 30000;
      connectedDevices.push({
        deviceId,
        connected: isStillConnected,
        lastSeen: status.lastSeen.toISOString(),
        rssi: status.rssi,
        ipAddress: status.ipAddress // IP sudah dalam format "192.xxx.xxx.xxx"
      });
    });

    return res.status(200).json({
      count: connectedDevices.length,
      devices: connectedDevices
    });
  } catch (error) {
    console.error('Error getting all connection statuses:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
};

module.exports = {
  updateConnectionStatus,
  getConnectionStatus,
  getAllConnectionStatus
};
