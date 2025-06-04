const { Sequelize } = require('sequelize');
const dotenv = require('dotenv');

dotenv.config();

const db = new Sequelize(process.env.DB_NAME, process.env.DB_USERNAME, process.env.DB_PASSWORD, {
    host: process.env.DB_HOST,
    dialect: process.env.DB_CONNECTION, // mysql
    port: process.env.DB_PORT,
    logging: console.log, // Menonaktifkan logging jika tidak diperlukan
     timezone: "+07:00"
});

module.exports = db;
