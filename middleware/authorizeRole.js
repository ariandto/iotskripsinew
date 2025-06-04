const authorizeRole = (...allowedRoles) => {
    return (req, res, next) => {
        const userRole = req.role; // Periksa peran pengguna dari `req` yang diatur sebelumnya

        if (allowedRoles.includes(userRole)) {
            next(); // Jika peran pengguna sesuai dengan salah satu dari yang diizinkan, lanjutkan
        } else {
            res.sendStatus(403); // Jika tidak, kirim status 403 Forbidden
        }
    };
};

module.exports = { authorizeRole };
