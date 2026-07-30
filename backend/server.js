import express from 'express';
import cors from 'cors';
import { connectDB, getDBStatus } from './config/db.js';
import { checkSupabaseStatus } from './config/supabase.js';

import personnelRoutes from './routes/personnelRoutes.js';
import ordersRoutes from './routes/ordersRoutes.js';
import assignmentsRoutes from './routes/assignmentsRoutes.js';
import educationRoutes from './routes/educationRoutes.js';
import promotionsRoutes from './routes/promotionsRoutes.js';
import trainingRoutes from './routes/trainingRoutes.js';
import leaveRoutes from './routes/leaveRoutes.js';
import awardsRoutes from './routes/awardsRoutes.js';

const app = express();
const PORT = process.env.PORT || 5000;
const configuredOrigins = (process.env.CORS_ORIGIN || '')
  .split(',')
  .map(origin => origin.trim())
  .filter(Boolean);
const allowedOrigins = new Set([
  ...configuredOrigins,
  'http://localhost:3000',
  'http://127.0.0.1:3000'
]);

// Middleware
app.use(cors({
  origin(origin, callback) {
    if (!origin || allowedOrigins.has(origin)) {
      return callback(null, true);
    }
    return callback(new Error('Origin is not allowed by CORS'));
  }
}));
app.use(express.json({ limit: '5mb' }));

// Request logger middleware
app.use((req, res, next) => {
  const timestamp = new Date().toISOString();
  console.log(`[${timestamp}] ${req.method} ${req.originalUrl}`);
  next();
});

// API Health & Status Endpoint
app.get('/api/health', async (req, res) => {
  const mongoStatus = getDBStatus();
  const supabaseStatus = await checkSupabaseStatus();
  
  res.json({
    status: 'online',
    system: 'PNP-ITMS PAIS 2.0 Backend Service',
    database: {
      activeAdapter: supabaseStatus.isConnected ? 'Supabase PostgreSQL (Connected - HTTPS Port 443)' : (mongoStatus.isConnected ? 'MongoDB Atlas (Connected)' : 'In-Memory Fallback'),
      supabase: supabaseStatus,
      mongoDB: mongoStatus
    },
    timestamp: new Date().toISOString(),
    endpoints: [
      '/api/personnel',
      '/api/orders',
      '/api/assignments',
      '/api/education',
      '/api/promotions',
      '/api/training',
      '/api/leave',
      '/api/awards',
    ]
  });
});

// Mount Routes
app.use('/api/personnel', personnelRoutes);
app.use('/api/orders', ordersRoutes);
app.use('/api/assignments', assignmentsRoutes);
app.use('/api/education', educationRoutes);
app.use('/api/promotions', promotionsRoutes);
app.use('/api/training', trainingRoutes);
app.use('/api/leave', leaveRoutes);
app.use('/api/awards', awardsRoutes);

// Global Error Handler
app.use((err, req, res, next) => {
  console.error('Unhandled Server Error:', err);
  res.status(500).json({
    success: false,
    message: 'Internal Server Error',
    error: err.message
  });
});

// 404 Route Handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: `API endpoint ${req.originalUrl} not found`
  });
});

// Connect Databases and Start Server
const startServer = async () => {
  // Supabase is the primary adapter. Only attempt MongoDB when Supabase is
  // unavailable so an unused Mongo connection cannot delay server startup.
  const supabaseStatus = await checkSupabaseStatus();
  if (!supabaseStatus.isConnected) {
    await connectDB();
  }
  
  app.listen(PORT, () => {
    console.log(`===================================================`);
    console.log(` PNP ITMS PAIS 2.0 REST API Server is running`);
    console.log(` URL: http://localhost:${PORT}`);
    console.log(` Health Check: http://localhost:${PORT}/api/health`);
    console.log(` Primary Database: Supabase PostgreSQL (${supabaseStatus.isConnected ? 'CONNECTED' : 'DISCONNECTED'})`);
    console.log(`===================================================`);
  });
};

startServer();
