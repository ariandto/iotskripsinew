const Room = require('../models/RoomModel.js'); // Import model Room

// 1. Menambahkan room baru
const addRoom = async (req, res) => {
  const { room } = req.body;

  if (!room || typeof room !== 'string') {
    return res.status(400).json({
      success: false,
      message: 'Nama room harus berupa string dan tidak boleh kosong.',
    });
  }

  try {
    // Cek jumlah ID unik di tabel Room berdasarkan idmyroom
    const roomCount = await Room.count({ distinct: 'idmyroom' });

    if (roomCount >= 6) {
      return res.status(400).json({
        success: false,
        message: 'Jumlah ruangan yang dapat ditambahkan telah mencapai batas maksimum (6 ruangan).',
      });
    }

    // Membuat room baru
    const newRoom = await Room.create({ room });

    res.status(201).json({
      success: true,
      message: `Ruangan ${room} berhasil ditambahkan.`,
      data: newRoom,
    });
  } catch (error) {
    console.error('Error saat menambahkan room:', error);
    res.status(500).json({
      success: false,
      message: 'Gagal menambahkan ruangan.',
      error: error.message,
    });
  }
};


// 2. Mendapatkan semua room
const getAllRooms = async (req, res) => {
  try {
    const rooms = await Room.findAll();

    res.status(200).json({
      success: true,
      message: 'Data ruangan berhasil diambil.',
      data: rooms,
    });
  } catch (error) {
    console.error('Error saat mengambil data ruangan:', error);
    res.status(500).json({
      success: false,
      message: 'Gagal mengambil data ruangan.',
      error: error.message,
    });
  }
};

// 3. Mendapatkan room berdasarkan ID
const getRoomById = async (req, res) => {
  const { idmyroom } = req.params;

  try {
    const room = await Room.findOne({
      where: { idmyroom },
    });

    if (!room) {
      return res.status(404).json({
        success: false,
        message: `Ruangan dengan ID ${idmyroom} tidak ditemukan.`,
      });
    }

    res.status(200).json({
      success: true,
      message: 'Data ruangan berhasil diambil.',
      data: room,
    });
  } catch (error) {
    console.error('Error saat mengambil data ruangan:', error);
    res.status(500).json({
      success: false,
      message: 'Gagal mengambil data ruangan.',
      error: error.message,
    });
  }
};

// 4. Mengupdate nama room
const updateRoom = async (req, res) => {
  const { idmyroom } = req.params;
  const { room } = req.body;

  // Validasi bahwa room tidak kosong dan harus berupa string
  if (!room || typeof room !== 'string') {
    return res.status(400).json({
      success: false,
      message: 'Nama room harus berupa string dan tidak boleh kosong.',
    });
  }

  try {
    const roomToUpdate = await Room.findOne({
      where: { idmyroom },
    });

    // Jika ruangan tidak ditemukan
    if (!roomToUpdate) {
      return res.status(404).json({
        success: false,
        message: `Ruangan dengan ID ${idmyroom} tidak ditemukan.`,
      });
    }

    // Mengupdate nama room
    roomToUpdate.room = room;
    await roomToUpdate.save();

    res.status(200).json({
      success: true,
      message: 'Nama ruangan berhasil diperbarui.',
      data: roomToUpdate,
    });
  } catch (error) {
    console.error('Error saat mengupdate nama ruangan:', error);
    res.status(500).json({
      success: false,
      message: 'Gagal mengupdate nama ruangan.',
      error: error.message,
    });
  }
};

// 5. Menghapus room berdasarkan ID
const deleteRoom = async (req, res) => {
  const { idmyroom } = req.params;

  try {
    const deletedRoom = await Room.destroy({
      where: { idmyroom },
    });

    if (deletedRoom === 0) {
      return res.status(404).json({
        success: false,
        message: `Ruangan dengan ID ${idmyroom} tidak ditemukan.`,
      });
    }

    res.status(200).json({
      success: true,
      message: `Ruangan dengan ID ${idmyroom} berhasil dihapus.`,
    });
  } catch (error) {
    console.error('Error saat menghapus ruangan:', error);
    res.status(500).json({
      success: false,
      message: 'Gagal menghapus ruangan.',
      error: error.message,
    });
  }
};

module.exports = {
  addRoom,
  getAllRooms,
  getRoomById,
  updateRoom,
  deleteRoom,
};
