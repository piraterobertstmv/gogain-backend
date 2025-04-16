require('dotenv').config();
const { connectDb } = require('./src/services/mongoose');
const userRoutes = require('./src/routes/user');
const serviceRoutes = require('./src/routes/service');
const centerRoutes = require('./src/routes/center');
const clientRoutes = require('./src/routes/client');
const transactionRoutes = require('./src/routes/transaction');
const costsRoutes = require('./src/routes/costs');

const cors = require('cors');
const express = require('express');
const app = express();
const port = process.env.PORT || 3000;

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

// CORS configuration
const corsOptions = {
  origin: process.env.NODE_ENV === 'production'
    ? ['https://gogain-frontend.vercel.app', 'https://gogain-frontend-fresh.vercel.app']  // Updated with actual frontend domains
    : 'http://localhost:5173',
  credentials: true,
  optionsSuccessStatus: 200
};

app.use(cors(corsOptions));
app.use(express.json());
app.use(userRoutes);
app.use(serviceRoutes);
app.use(centerRoutes);
app.use(clientRoutes);
app.use(transactionRoutes);
app.use(costsRoutes);

connectDb().catch(err => console.log(err));

app.listen(port, () => {
    console.log(`Server running in ${process.env.NODE_ENV || 'development'} mode`);
    if (process.env.NODE_ENV === 'production') {
        console.log(`Server listening on port ${port}`);
    } else {
        console.log(`Server listening at http://localhost:${port}`);
    }
});