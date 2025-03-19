// config/sequelize.js

// 1. Import Sequelize and dotenv
const { Sequelize } = require('sequelize');
require('dotenv').config();
const isProduction = process.env.NODE_ENV === 'production';

// 2. Create a new Sequelize instance
const sequelize = new Sequelize(process.env.DATABASE_URL, {
  logging: console.log,
  dialect: 'postgres',
    dialectOptions: {
      ssl: isProduction
        ? {
            require: true,
            rejectUnauthorized: false,
          }
        : false,
    },
  });

// 3. Test the database connection
sequelize.authenticate()
  .then(() => {
    console.log('Sequelize connected to PostgreSQL database.');
  })
  .catch((error) => {
    console.error('Unable to connect to the database:', error);
  });

// 4. Export the sequelize instance
module.exports = sequelize;
