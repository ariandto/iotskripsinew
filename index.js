const express = require('express');
const dotenv = require('dotenv');
const cookieParser = require('cookie-parser');
const cors = require('cors');
const db = require('./config/Database.js');
const router = require('./routes/route.js');
const path = require('path');
const passport = require('passport');



dotenv.config();

const app = express();

// Konfigurasi CORS
const corsOptions = {
  origin: [
    'https://sla.iotdevariandto.pro',
    'http://localhost:3000',
    'https://sla.iotdevariandto.pro',
    'http://sla.iotdevariandto.pro',
    'www.sla.iotdevariandto.pro',
  ],
  credentials: true,
  optionsSuccessStatus: 200,
  methods: ['GET', 'PUT', 'POST', 'DELETE', 'OPTIONS'],
  allowedHeaders: [
    'Origin',
    'X-Requested-With',
    'Content-Type',
    'Accept',
    'Authorization',
  ],
};

app.use(cors(corsOptions));
app.use(cookieParser());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Middleware Passport.js
app.use(passport.initialize());

// Statis folder untuk upload
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));
app.use('/uploadProduct', express.static(path.join(__dirname, 'uploadProduct')));

// Gunakan router
app.use(router);

// Middleware error handler
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ message: 'Internal server error', error: err.message });
});

// Sinkronisasi database
db.sync()
  .then(() => {
    console.log('✅ Database synced successfully');
  })
  .catch((error) => {
    console.error('❌ Failed to sync database:', error);
  });

// Menjalankan server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🚀 Server running at port ${PORT} in ${process.env.NODE_ENV || 'development'} mode`);

  // 🔹 Jalankan cronjob setelah server berjalan

  console.log('⏳ Cronjob Power Calculation started');
});
