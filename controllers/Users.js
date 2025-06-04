const Users = require('../models/UserModel.js');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');

// Fetch all users
const getUsers = async (req, res) => {
  try {
    const users = await Users.findAll({
      attributes: ['id', 'name', 'email', 'role']
    });
    res.json(users);
  } catch (error) {
    console.error("Error fetching users:", error);
    res.status(500).json({ msg: "Server Error" });
  }
};

// Register new user
const register = async (req, res) => {
  const { name, email, password, confPassword, role } = req.body;

  if (!name || !email || !password || !confPassword) {
    return res.status(400).json({ msg: "Please enter all fields" });
  }

  if (password !== confPassword) {
    return res.status(400).json({ msg: "Password and Confirm Password do not match" });
  }

  try {
    const user = await Users.findOne({ where: { email } });

    if (user) {
      return res.status(400).json({ msg: "User already exists" });
    }

    const salt = await bcrypt.genSalt();
    const hashPassword = await bcrypt.hash(password, salt);

    const newUser = await Users.create({
      name,
      email,
      role,
      password: hashPassword
    });

    res.json({ msg: "Registration Successful", user: newUser });
  } catch (error) {
    console.error("Registration error:", error);
    res.status(500).json({ msg: "Server Error" });
  }
};

const login = async (req, res) => {
  try {
    const user = await Users.findOne({ where: { email: req.body.email } });
    if (!user) return res.status(404).json({ message: 'User not found' });

    const match = bcrypt.compareSync(req.body.password, user.password);
    if (!match) return res.status(401).json({ message: 'Invalid credentials' });

    const userId = user.id;
    const name = user.name;
    const email = user.email;
    const role = user.role;

    // Membuat token akses
    const accessToken = jwt.sign({ userId, name, email, role }, process.env.ACCESS_TOKEN_SECRET, {
      expiresIn: '5m' // Token berakhir dalam 5 menit
    });

    // Membuat token refresh
    const refreshToken = jwt.sign({ userId, name, email, role }, process.env.REFRESH_TOKEN_SECRET, {
      expiresIn: '1d' // Token refresh berakhir dalam 1 hari
    });

    

    // Menyimpan token refresh di database
    await Users.update({ refresh_token: refreshToken }, {
      where: { id: userId },
    });

    // Mengatur access token sebagai cookie
    res.cookie('accessToken', accessToken, {
      httpOnly: true, // Mencegah akses cookie melalui JavaScript
      secure: process.env.NODE_ENV === 'production', // Hanya kirim cookie melalui HTTPS di produksi
      sameSite: 'Strict', // Mengurangi risiko CSRF
      maxAge: 5 * 60 * 1000 // Cookie akses token berakhir dalam 5 menit
    });

    // Mengatur refresh token sebagai cookie
    res.cookie('refreshToken', refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'Strict',
      maxAge: 24 * 60 * 60 * 1000 // Cookie refresh token berakhir dalam 1 hari
    });

    // Mengatur role sebagai cookie
res.cookie('userRole', role, {
  httpOnly: true, // Pastikan ini false jika ingin mengaksesnya di frontend
  secure: process.env.NODE_ENV === 'production', // Hanya kirim cookie melalui HTTPS di lingkungan produksi
  sameSite: 'Strict',
  maxAge: 24 * 60 * 60 * 1000 // Cookie berakhir dalam 1 hari
});



    // Mengirim role ke frontend
    res.json({ role }); // Hanya mengirim role
  } catch (error) {
    console.error("Login error:", error);
    res.status(500).json({ message: 'Server error' });
  }
};



const logout = async (req, res) => {
  try {
    const refreshToken = req.cookies.refreshToken;

    if (!refreshToken) {
      // Tidak ada refresh token di cookie => anggap sudah logout
      return res.sendStatus(204);
    }

    // Cari user yang punya refresh token ini
    const user = await Users.findOne({ where: { refresh_token: refreshToken } });

    if (!user) {
      // Token tidak valid/tidak ditemukan di DB, tetap hapus cookie supaya bersih
      res.clearCookie('refreshToken', {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'Strict',
        path: '/',
      });
      res.clearCookie('accessToken', {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'Strict',
        path: '/',
      });
      return res.sendStatus(204);
    }

    // Hapus refresh token dari DB
    await Users.update({ refresh_token: null }, { where: { id: user.id } });

    // Clear cookie di browser
    res.clearCookie('refreshToken', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'Strict',
      path: '/',
    });
    res.clearCookie('accessToken', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'Strict',
      path: '/',
    });

    return res.status(200).json({ message: 'Logout successful' });
  } catch (error) {
    console.error("Logout error:", error);
    return res.status(500).json({ message: "Server error during logout" });
  }
};



// Fetch profile by ID
const getProfile = async (req, res) => {
  const userId = req.user.userId;

  try {
    const user = await Users.findByPk(userId, {
      attributes: ['id', 'name', 'email','role']
    });

    if (!user) {
      return res.status(404).json({ msg: "User not found" });
    }

    res.json(user);
  } catch (error) {
    console.error("Error fetching profile:", error);
    res.status(500).json({ msg: "Server Error" });
  }
};

// Update password based on email
const updatePassword = async (req, res) => {
  const { email, newPassword, confNewPassword } = req.body;

  if (!email || !newPassword || !confNewPassword) {
    return res.status(400).json({ msg: "Please enter all fields" });
  }

  if (newPassword !== confNewPassword) {
    return res.status(400).json({ msg: "New Password and Confirm Password do not match" });
  }

  try {
    const user = await Users.findOne({ where: { email } });

    if (!user) {
      return res.status(404).json({ msg: "User not found" });
    }

    const salt = await bcrypt.genSalt();
    const hashPassword = await bcrypt.hash(newPassword, salt);

    await Users.update({ password: hashPassword }, {
      where: { email }
    });

    res.json({ msg: "Password updated successfully" });
  } catch (error) {
    console.error("Error updating password:", error);
    res.status(500).json({ msg: "Server Error" });
  }
};

// Update username based on email
const updateUsernameByEmail = async (req, res) => {
  const { email, name } = req.body;

  if (!name || !email) {
    return res.status(400).json({ msg: "Please provide both email and a valid name" });
  }

  try {
    const user = await Users.findOne({ where: { email } });

    if (!user) {
      return res.status(404).json({ msg: "User not found" });
    }

    await Users.update({ name }, { where: { email } });

    res.json({ msg: "Username updated successfully" });
  } catch (error) {
    console.error("Error updating username:", error);
    res.status(500).json({ msg: "Server Error" });
  }
};

const getUserById = async (req, res) => {
  const userId = req.params.id; // Mengambil ID dari URL
  try {
      const user = await Users.findByPk(userId, {
          attributes: ['id', 'name', 'email', 'role', 'photo'] // Ambil field yang diperlukan
      });
      if (!user) {
          return res.status(404).json({ msg: "User not found" });
      }
      res.json(user);
  } catch (error) {
      console.error("Error fetching user data:", error);
      res.status(500).json({ msg: "Server Error" });
  }
};

// Update role based on email
const updateRoleByEmail = async (req, res) => {
  const { email, role } = req.body;

  if (!email || !role) {
    return res.status(400).json({ msg: "Please provide both email and a valid role" });
  }

  try {
    const user = await Users.findOne({ where: { email } });

    if (!user) {
      return res.status(404).json({ msg: "User not found" });
    }

    await Users.update({ role }, { where: { email } });

    res.json({ msg: "Role updated successfully" });
  } catch (error) {
    console.error("Error updating role:", error);
    res.status(500).json({ msg: "Server Error" });
  }
};


// controllers/userController.ts
const updateDisplayName = async (req, res) => {
  try {
    const { displayName } = req.body;
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    if (!displayName || displayName.trim() === '') {
      return res.status(400).json({ message: 'Nama tampilan tidak boleh kosong' });
    }

    const user = await models.User.findByPk(userId);
    if (!user) {
      return res.status(404).json({ message: 'User tidak ditemukan' });
    }

    if (user.displayName === displayName.trim()) {
      return res.status(400).json({ message: 'Nama tampilan tidak berubah' });
    }

    await user.update({ displayName: displayName.trim() });

    return res.status(200).json({
      message: 'Nama tampilan berhasil diperbarui',
      user: {
        id: user.id,
        name: user.name,
        displayName: user.displayName,
        email: user.email,
        role: user.role,
        photo: user.photo,
      },
    });
  } catch (error) {
    console.error('Error update display name:', error);
    return res.status(500).json({ message: 'Gagal memperbarui nama tampilan' });
  }
};




module.exports = { updateDisplayName, updateRoleByEmail,getUsers, getUserById, register, login, logout, getProfile, updatePassword,updateUsernameByEmail };