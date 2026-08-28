try {
  require('dotenv').config();
} catch (e) {}

const app = require('../server/src/app');

module.exports = app;
