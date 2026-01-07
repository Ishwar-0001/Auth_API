const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const morgan = require('morgan');

const authRoutes = require('./routes/auth.routes');
const gameResultRoutes = require('./routes/gameResult.routes');

const app = express();

// ===== MIDDLEWARE =====
app.use(express.json());
app.use(helmet());
app.use(cors({
  origin: 'http://localhost:5173', 
  credentials: true
}));
app.use(morgan('dev'));

// ===== ROUTES =====
app.use('/api/auth', authRoutes);               // login/register
app.use('/api/game', gameResultRoutes); // game results

// ===== HEALTH CHECK =====
app.get('/', (req, res) => {
  res.json({ message: 'API is running!' });
});

// ===== ERROR HANDLING =====
app.use((req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(err.status || 500).json({
    error: err.message || 'Server Error',
  });
});

module.exports = app;
