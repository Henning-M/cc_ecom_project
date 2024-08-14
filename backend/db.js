const { Pool } = require('pg');

const pool = new Pool({
  user: 'postgres',  // replace with your PostgreSQL username
  host: 'localhost',
  database: 'cc_ecom_db',  // replace with your database name
  password: 'postgres',  // replace with your PostgreSQL password
  port: 5432,
});

module.exports = pool;
