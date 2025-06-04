const { Sequelize, DataTypes } = require('sequelize');
const db = require('../config/Database.js');

const Users = db.define(
  'users',
  {
    name: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    email: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true,
    },
    displayName: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    google_id: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true,
    },
    role: {
      type: DataTypes.STRING,
      allowNull: true,
      unique: false, // Set unique to false
    },
    password: {
      type: DataTypes.STRING,
      allowNull: true, 
    },
    refresh_token: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    photo: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    customPhoto: {
      type: DataTypes.STRING,
      allowNull: true,
    },
  },
  {
    freezeTableName: true,
  }
);

module.exports = Users;
