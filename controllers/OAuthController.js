const Users = require('../models/UserModel');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

async function loginWithOAuth(payload) {
  try {
    const { email, name, picture } = payload;

    // Check if the user exists in your DB
    let user = await Users.findOne({ where: { email } });

    // If the user does not exist, create a new user
    if (!user) {
      user = await Users.create({
        email,
        name,
        photo: picture,
        password: bcrypt.hashSync('defaultPassword', 8),  // Or handle default password or add a mechanism
      });
    }

    // Generate JWT token for the user
    const token = jwt.sign({ id: user.id, email: user.email }, process.env.JWT_SECRET, {
      expiresIn: '1h',  // Or your preferred expiration time
    });

    return {
      ...user.toJSON(),
      generateAuthToken: () => token,  // Add method to generate JWT token for authentication
    };
  } catch (error) {
    console.error('Error in loginWithOAuth:', error);
    throw new Error('Error in OAuth login');
  }
}

module.exports = { loginWithOAuth };
