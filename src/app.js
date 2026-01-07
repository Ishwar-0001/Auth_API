const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const morgan = require('morgan');

const authRoutes = require('./routes/auth.routes');
const gameResultRoutes = require('./routes/gameResult.routes');

const app = express();

// ✅ CORS FIRST
app.use(cors({
  origin: [
    "http://localhost:5173",
    "https://frontend-zeta-gold-83.vercel.app"
  ],
  credentials: true,
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"]
}));

app.options('*', cors());

// middleware
app.use(express.json());
app.use(helmet());
app.use(morgan('dev'));

// routes
app.use('/api/auth', authRoutes);
app.use('/api/game', gameResultRoutes);

// health
app.get('/', (req, res) => {
  res.json({ message: 'API is running!' });
});

module.exports = app;
