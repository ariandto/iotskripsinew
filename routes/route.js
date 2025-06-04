const express = require('express');
const moment = require('moment-timezone');
const cron = require('node-cron');
const { OAuth2Client } = require('google-auth-library');
const jwt = require('jsonwebtoken');
require('dotenv').config();

const { 
  getUsers,
  getUserById,
  register, 
  login, 
  logout, 
  getProfile,
  updatePassword,
  updateUsernameByEmail,
  updateDisplayName
} = require('../controllers/Users.js');

const ScheduleController = require('../controllers/ScheduleController.js'); 
const IotLedController = require('../controllers/IotLedStatusController.js'); 
const { updateUserData } = require('../controllers/UpdateUsersDataController.js');
const { verifyToken } = require('../middleware/VerifyToken.js');
const { refreshToken } = require('../controllers/RefreshToken.js');
const uploadImage = require('../middleware/uploadImage.js'); 
const Users = require('../models/UserModel.js'); 
const RoomController = require('../controllers/RoomController.js');
const CheckConnection = require('../middleware/CheckConnection.js')

const router = express.Router();

// Middleware untuk menambahkan timestamp WIB ke request
router.use((req, res, next) => {
  req.wibTimestamp = moment().tz("Asia/Jakarta").format("YYYY-MM-DD HH:mm:ss");
  next();
});

// Cron job untuk menjalankan `executeSchedules` setiap menit
cron.schedule('* * * * *', () => {
  console.log('Running scheduled task...');
  ScheduleController.executeSchedules(); // Panggil fungsi executeSchedules dari controller
});



// ============ IOT ROUTES ============ //
router.get('/api/iot/data', IotLedController.getAllData);
router.put('/api/iot/status', IotLedController.updateStatus);
router.post('/api/iot/led/:room', IotLedController.saveLedStatus);
router.get('/api/iot/led-status', IotLedController.getLedStatus);
router.get('/api/iot/power/:room', IotLedController.calculateRealtimePower);
router.get('/api/iot/power-consumption', IotLedController.getPowerConsumptionPerRoom);

// 
router.post('/api/iot/connection-status', CheckConnection.updateConnectionStatus);
router.get('/api/iot/connection-status', CheckConnection.getAllConnectionStatus);
router.get('/api/iot/connection-status/:deviceId', CheckConnection.getConnectionStatus);


// ============ USER ROUTES ============ //
router.get('/api/users', verifyToken, getUserById);
router.post('/api/register', register);
router.post('/api/login', login);
router.get('/api/token', refreshToken);
router.delete('/api/logout', verifyToken, logout);

// ============ SCHEDULE ROUTES ============ //
router.post('/api/iot/schedules', verifyToken, ScheduleController.addSchedule);
router.get('/api/iot/schedules', verifyToken, ScheduleController.getAllSchedules);
router.get('/api/iot/schedules/:id', verifyToken, ScheduleController.getScheduleById);
router.put('/api/iot/schedules/:id', verifyToken, ScheduleController.updateSchedule);
router.delete('/api/iot/schedules/:id', verifyToken, ScheduleController.deleteSchedule);

// ============ USER UPDATE ROUTES ============ //
router.put('/api/users/update', verifyToken, updateUserData);

// ============ PROFILE ROUTES ============ //
router.get('/api/profile/:id', verifyToken, getProfile);
router.put('/api/profile/password', verifyToken, updatePassword);
router.put('/api/profile/username', verifyToken, updateUsernameByEmail);

router.put('/api/profile/display-name', verifyToken, updateDisplayName);

router.get('/api/user-profile', verifyToken, async (req, res) => {
  try {
    const userId = req.userId;
    const user = await Users.findByPk(userId, {
      attributes: ['id', 'name', 'email', 'photo', 'customPhoto']
    });

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    const baseUrl = `${req.protocol}://${req.get('host')}`;

    let photoUrl = '';

    if (user.customPhoto && user.customPhoto.trim() !== '') {
      // Jika ada customPhoto, buat URL lengkap
      photoUrl = `${baseUrl}${user.customPhoto}`;
    } else if (user.photo && user.photo.trim() !== '') {
      // Kalau tidak ada customPhoto, fallback ke photo (biasanya Google profile URL)
      photoUrl = user.photo;
    } else {
      // Jika tidak ada keduanya, bisa set default image (optional)
      photoUrl = `${baseUrl}/default-profile.png`; // misal pakai gambar default
    }

    res.json({
      id: user.id,
      name: user.name,
      email: user.email,
      photo: photoUrl,
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error });
  }
});



router.post('/api/profile/upload', verifyToken, uploadImage.single('photo'), async (req, res) => {
  try {
    const userId = req.userId;
    const user = await Users.findByPk(userId);

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    if (!req.file) {
      return res.status(400).json({ message: 'No file uploaded' });
    }

    // Hapus custom photo lama jika ada
    if (user.customPhoto && user.customPhoto.startsWith('/uploads/')) {
      const oldPhotoPath = path.join(__dirname, '..', user.customPhoto);
      if (fs.existsSync(oldPhotoPath)) {
        fs.unlinkSync(oldPhotoPath);
      }
    }

    // Simpan path foto baru
    const newPhotoPath = `/uploads/${req.file.filename}`;
    user.customPhoto = newPhotoPath;
    await user.save();

    res.status(200).json({
      message: 'Foto profil berhasil diperbarui',
      photo: newPhotoPath,
    });
  } catch (error) {
    console.error('Upload error:', error);
    res.status(500).json({ message: 'Terjadi kesalahan server', error: error.message });
  }
});

// ============ IOT ROOM ROUTES ============ //
router.post('/api/iot/rooms', verifyToken, RoomController.addRoom);
router.get('/api/iot/rooms', verifyToken, RoomController.getAllRooms);
router.get('/api/iot/rooms/:idmyroom', verifyToken, RoomController.getRoomById);
router.put('/api/iot/rooms/:idmyroom', verifyToken, RoomController.updateRoom);
router.delete('/api/iot/rooms/:idmyroom', verifyToken, RoomController.deleteRoom);

// ============ OAUTH GOOGLE LOGIN ============ //
const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID;
const ACCESS_TOKEN_SECRET = process.env.ACCESS_TOKEN_SECRET;
const REFRESH_TOKEN_SECRET = process.env.REFRESH_TOKEN_SECRET;

const client = new OAuth2Client(GOOGLE_CLIENT_ID);

router.post('/api/oauth-login', async (req, res) => {
  const { token } = req.body;

  if (!token) {
    console.warn('[OAuth Login] No token received in request body');
    return res.status(400).json({ message: 'Token is required' });
  }

  try {
    console.log('[OAuth Login] Verifying token...');
    const ticket = await client.verifyIdToken({
      idToken: token,
      audience: GOOGLE_CLIENT_ID,
    });

    const payload = ticket.getPayload();

    if (!payload || !payload.sub || !payload.email) {
      console.error('[OAuth Login] Invalid token payload:', payload);
      return res.status(401).json({ message: 'Invalid token payload' });
    }

    const { sub, email, name, picture } = payload;
    console.log(`[OAuth Login] Token verified: ${email} (${sub})`);

    // Cari user berdasarkan google_id
    let user = await Users.findOne({ where: { google_id: sub } });

    if (!user) {
      console.log('[OAuth Login] User not found, creating new user...');
      // Saat buat user baru
    user = await Users.create({
    google_id: sub,
    email,
    name: name || 'Unknown',
    displayName: name || 'Unknown',
    photo: picture || '', // photo = Google profile picture URL
    role: 'visitor',
});
      console.log('[OAuth Login] New user created:', user.id);
    } else {
      console.log('[OAuth Login] User found:', user.id);

      // Jika displayName masih null/undefined, update dengan nama user
      if (!user.displayName) {
        user.displayName = user.name || 'Unknown';
        await user.save();
        console.log('[OAuth Login] Updated displayName to:', user.displayName);
      }
    }

    if (!ACCESS_TOKEN_SECRET || !REFRESH_TOKEN_SECRET) {
      console.error('[OAuth Login] Missing JWT secrets in environment variables');
      return res.status(500).json({ message: 'Server misconfiguration' });
    }

    // Generate access token
    const accessToken = jwt.sign(
      {
        userId: user.id,
        role: user.role,
        email: user.email,
        google_id: user.google_id,
      },
      ACCESS_TOKEN_SECRET,
      { expiresIn: '1h' }
    );

    // Generate refresh token
    const refreshToken = jwt.sign(
      { userId: user.id },
      REFRESH_TOKEN_SECRET,
      { expiresIn: '7d' }
    );

    // Set cookies
    res.cookie('refreshToken', refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'Strict',
    });

    res.cookie('accessToken', accessToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'Strict',
    });

    console.log('[OAuth Login] Login success, tokens set');

    res.json({
      message: 'Login success',
      user: {
        id: user.id,
        name: user.name,
        displayName: user.displayName,  // kirim juga displayName ke frontend
        email: user.email,
        role: user.role,
        photo: user.photo,
      },
      accessToken,
    });
  } catch (err) {
    console.error('[OAuth Login] Error during OAuth login:', err?.message || err);
    res.status(500).json({
      message: 'OAuth login failed',
      error: err?.message || 'Unknown error occurred',
    });
  }
});


// Root Route for API check
router.get('/api', (req, res) => {
  res.send("API is working!");
});

module.exports = router;
