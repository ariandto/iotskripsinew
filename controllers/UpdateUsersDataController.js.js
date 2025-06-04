const Users = require('../models/UserModel.js');

// Update user data (role and name) based on email
const updateUserData = async (req, res) => {
  const { email, name, role } = req.body;

  if (!email || (!name && !role)) {
    return res.status(400).json({ msg: "Please provide email and at least one field to update (name or role)" });
  }

  try {
    const user = await Users.findOne({ where: { email } });

    if (!user) {
      return res.status(404).json({ msg: "User not found" });
    }

    const updatedFields = {};
    if (name) updatedFields.name = name;
    if (role) updatedFields.role = role;

    await Users.update(updatedFields, { where: { email } });

    res.json({ msg: "User data updated successfully" });
  } catch (error) {
    console.error("Error updating user data:", error);
    res.status(500).json({ msg: "Server Error" });
  }
};

module.exports = { updateUserData };
