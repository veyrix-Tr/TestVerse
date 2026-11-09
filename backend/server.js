const express = require('express');
const cors    = require('cors');
require('dotenv').config();

const app  = express();
const PORT = process.env.PORT || 5000;

if (!process.env.JWT_SECRET) {
  console.error('JWT_SECRET is not set — copy .env.example to .env and fill it in.');
  if (require.main === module) process.exit(1);
}

// Middleware
const allowedOrigins = process.env.FRONTEND_URL
  ? [process.env.FRONTEND_URL, 'http://localhost:5173', 'http://localhost:4173']
  : ['http://localhost:5173', 'http://localhost:4173'];
app.use(cors({ origin: allowedOrigins }));
// Question papers are big (180 questions, Hindi, solutions), so admin routes
// get a larger limit. This must come before the general parser.
app.use('/api/admin', express.json({ limit: '5mb' }));
app.use(express.json({ limit: '100kb' }));
// Express 5 leaves req.body undefined when nothing was sent (DELETE, empty POST)
app.use((req, res, next) => { if (req.body === undefined) req.body = {}; next(); });

// Routes
app.get('/', (req, res) => {
  res.json({
    message: 'Testverse API is running',
    version: '1.0.0'
  });
});

const authRoutes = require('./routes/authRoutes');
app.use('/api/auth', authRoutes);

const adminTestRoutes = require('./routes/adminTestRoutes');
app.use('/api/admin', adminTestRoutes);

const adminStudentRoutes = require('./routes/adminStudentRoutes');
app.use('/api/admin', adminStudentRoutes);

const adminOverviewRoutes = require('./routes/adminOverviewRoutes');
app.use('/api/admin', adminOverviewRoutes);

const testRoutes = require('./routes/testRoutes');
app.use('/api/tests', testRoutes);

const subscriptionRoutes = require('./routes/subscriptionRoutes');
app.use('/api', subscriptionRoutes);

app.use('/api', (req, res) => res.status(404).json({ error: 'Not found' }));

// Local dev runs the server; Vercel imports this file as a module
if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
  });
}

module.exports = app;
