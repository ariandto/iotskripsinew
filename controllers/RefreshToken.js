const Users = require('../models/UserModel.js');
const jwt = require('jsonwebtoken');

const refreshToken = async (req, res) => {
    try {
        // Ambil refresh token dari cookie
        const refreshToken = req.cookies.refreshToken;

        // Jika tidak ada refresh token, kirim status 401 Unauthorized
        if (!refreshToken) {
            return res.status(401).json({ message: "No refresh token provided" });
        }

        // Verifikasi refresh token
        jwt.verify(refreshToken, process.env.REFRESH_TOKEN_SECRET, async (err, decoded) => {
            if (err) {
                console.log('Error verifying refresh token:', err.message);
                return res.status(403).json({ message: "Invalid or expired refresh token" });
            }

            // Cari user berdasarkan decoded.userId
            const user = await Users.findOne({ where: { id: decoded.userId } });

            // Jika tidak ada user yang sesuai dengan userId pada refresh token
            if (!user) {
                return res.status(403).json({ message: "User not found" });
            }

            // Membuat access token baru
            const { id: userId, name, email, role } = user;
            const accessToken = jwt.sign(
                { userId, name, email, role },
                process.env.ACCESS_TOKEN_SECRET,
                { expiresIn: '1h' } // Token baru valid untuk 1 jam
            );

            // Kirim access token baru dalam response
            console.log('New access token generated:', accessToken);
            res.json({ accessToken, email, role });
        });
    } catch (error) {
        console.error('Error processing refresh token:', error);
        res.status(500).json({ message: "Internal server error" });
    }
};

module.exports = { refreshToken };
