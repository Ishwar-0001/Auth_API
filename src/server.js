// require('dotenv').config();
// const app = require('./app');
// const connectDB = require('./config/db');

// connectDB();

// app.listen(process.env.PORT || 5000, () => {
//   console.log(`Server running on port ${process.env.PORT || 5000}`);
// });

require('dotenv').config();
const serverless = require('serverless-http');
const app = require('./app');
const connectDB = require('./config/db');

let isDBConnected = false;

const ensureDBConnection = async () => {
  if (!isDBConnected) {
    await connectDB(process.env.MONGO_URI);
    isDBConnected = true;
    console.log('MongoDB connected');
  }
};

module.exports = async (req, res) => {
  await ensureDBConnection();
  return app(req, res); // Express app handles the request
};
