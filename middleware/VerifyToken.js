const jwt = require('jsonwebtoken');
const { promisify } = require('util');
const Users = require('../models/UserModel');

const verifyToken = async (req, res, next) => {
  try {
    const authHeader = req.headers['authorization'];
    const token = authHeader ? authHeader.split(' ')[1] : req.cookies.accessToken;

    if (!token) {
      return res.status(401).json({ message: 'Access token is missing' });
    }

    const verifyJwt = promisify(jwt.verify);

    try {
      const decoded = await verifyJwt(token, process.env.ACCESS_TOKEN_SECRET);
      req.userId = decoded.userId;
      req.userRole = decoded.role;
      req.userEmail = decoded.email;
      req.googleId = decoded.google_id || null;
      return next();
    } catch (err) {
      // Token expired atau invalid
      if (err.name === 'TokenExpiredError') {
        const refreshToken = req.cookies.refreshToken;
        if (!refreshToken) {
          return res.status(401).json({ message: 'Refresh token is missing, please log in again' });
        }

        try {
          const refreshDecoded = await verifyJwt(refreshToken, process.env.REFRESH_TOKEN_SECRET);
          const user = await Users.findOne({ where: { id: refreshDecoded.userId } });

          if (!user) {
            return res.status(404).json({ message: 'User not found' });
          }

          // Generate access token baru
          const newAccessToken = jwt.sign(
            { userId: user.id, role: user.role, email: user.email, google_id: user.google_id },
            process.env.ACCESS_TOKEN_SECRET,
            { expiresIn: '1h' }
          );

          // Kirim access token baru ke cookie
          res.cookie('accessToken', newAccessToken, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'Strict',
          });

          req.userId = user.id;
          req.userRole = user.role;
          req.userEmail = user.email;
          req.googleId = user.google_id || null;
          return next();
        } catch (refreshErr) {
          return res.status(403).json({ message: 'Invalid or expired refresh token' });
        }
      } else {
        return res.status(403).json({ message: 'Invalid token' });
      }
    }
  } catch (error) {
    console.error('VerifyToken middleware error:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
};

module.exports = { verifyToken };
