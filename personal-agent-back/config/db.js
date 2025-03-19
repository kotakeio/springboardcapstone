// config/db.js

// 1) Load environment variables from .env
require('dotenv').config();

// 2) Import 'pg' package
const { Pool } = require('pg');

// 3) Create a new connection pool to PostgreSQL
const pool = new Pool({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  port: process.env.DB_PORT,
});

// 4) Export the pool so we can query the database elsewhere
module.exports = pool;
