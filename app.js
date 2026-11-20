require('dotenv').config();
const { connectDb } = require('./src/services/mongoose');
const userRoutes = require('./src/routes/user');
const serviceRoutes = require('./src/routes/service');
const centerRoutes = require('./src/routes/center');
const clientRoutes = require('./src/routes/client');
const transactionRoutes = require('./src/routes/transaction');
const costsRoutes = require('./src/routes/costs');
const costTransactionRoutes = require('./src/routes/costTransaction');
const reportRoutes = require('./src/routes/reports');

const cors = require('cors');
const compression = require('compression');
const express = require('express');
const app = express();
const port = process.env.PORT || 3001;

if (!process.env.JWT_SECRET) {
  console.error('JWT_SECRET is required. Set the JWT_SECRET environment variable.');
  process.exit(1);
}

// Configure CORS — explicit origins only (no wildcard: any *.vercel.app site could call the API).
// Override with CORS_ORIGINS="https://a.com,https://b.com" if the frontend lives elsewhere.
const defaultOrigins = process.env.NODE_ENV === 'production'
  ? [
      'https://gogain-frontend.vercel.app',
      'https://gogain.co',
      'https://pdf-expense-tracker.vercel.app' // external PDF extractor that posts imports
    ]
  // Development: any localhost / 127.0.0.1 port (Vite moves to 5174, 5175… when 5173 is busy)
  : [/^http:\/\/(localhost|127\.0\.0\.1):\d+$/];

const allowedOrigins = process.env.CORS_ORIGINS
  ? process.env.CORS_ORIGINS.split(',').map(origin => origin.trim()).filter(Boolean)
  : defaultOrigins;

const corsOptions = {
  origin: allowedOrigins,
  methods: 'GET,HEAD,PUT,PATCH,POST,DELETE',
  credentials: true,
  optionsSuccessStatus: 204,
  maxAge: 86400 // 24 hours
};
app.use(cors(corsOptions));

// gzip responses: the transaction list is ~2 MB of JSON and compresses ~8–10x
app.use(compression());

// Security headers
app.use((req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
  next();
});

// Request logger middleware
app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
  next();
});

app.use(express.json());
app.use(userRoutes);
app.use(serviceRoutes);
app.use(centerRoutes);
app.use(clientRoutes);
app.use(transactionRoutes);
app.use(costsRoutes);
app.use(costTransactionRoutes);
app.use(reportRoutes);

// Basic route to confirm the server is running
app.get('/', (req, res) => {
  res.send('GoGain API is running. Please use the appropriate endpoints.');
});

// Simple ping endpoint for keep-alive requests
app.get('/ping', (req, res) => {
  res.status(200).send({ status: 'ok', timestamp: new Date().toISOString() });
});

// Handle database connection and server startup
async function startServer() {
  try {
    // Connect to MongoDB
    await connectDb();
    
    // Start the server
    app.listen(port, () => {
      console.log(`Server running in ${process.env.NODE_ENV || 'development'} mode`);
      if (process.env.NODE_ENV === 'production') {
        console.log(`Server listening on port ${port}`);
      } else {
        console.log(`Server listening at http://localhost:${port}`);
      }
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
}

startServer();