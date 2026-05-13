const path = require('path');
const { Sequelize } = require('sequelize');

const storage = process.env.SQLITE_PATH || path.join(__dirname, '../../data.sqlite');

const sequelize = new Sequelize({
  dialect: 'sqlite',
  storage,
  logging: false
});

const connectDB = async () => {
  await sequelize.authenticate();
  await sequelize.sync();
  console.log('SQLite connected');
};

module.exports = connectDB;
module.exports.sequelize = sequelize;
