const db = require('../config/db');
module.exports = { query: (sql, params) => db.query(sql, params), connect: () => db.connect() };
