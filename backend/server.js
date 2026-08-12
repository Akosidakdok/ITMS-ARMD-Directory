import express from 'express';
import cors from 'cors';
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
  const supabaseStatus = await checkSupabaseStatus();
  
  res.json({
    status: 'online',
    system: 'PNP-ITMS PAIS 2.0 Backend Service',
    database: {
      activeAdapter: supabaseStatus.isConnected
        ? 'Supabase PostgreSQL (Connected - HTTPS Port 443)'
        : 'Supabase Unavailable - Local Memory Fallback',
      primary: 'Supabase PostgreSQL',
      fallback: 'Local Memory',
      supabase: supabaseStatus
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

// Start the API first, then check Supabase in the background. Supabase is the
// only external database adapter; local memory is used only as a temporary
// fallback when Supabase is paused or unreachable.
const startServer = async () => {
  app.listen(PORT, () => {
    console.log(`===================================================`);
    console.log(` PNP ITMS PAIS 2.0 REST API Server is running`);
    console.log(` URL: http://localhost:${PORT}`);
    console.log(` Health Check: http://localhost:${PORT}/api/health`);
    console.log(` Primary Database: Checking external database status...`);
    console.log(`===================================================`);
  });

  const supabaseStatus = await checkSupabaseStatus();
  console.log(` Supabase PostgreSQL: ${supabaseStatus.isConnected ? 'CONNECTED' : supabaseStatus.state}`);
  if (!supabaseStatus.isConnected) {
    console.log(` Fallback Store: Local Memory (temporary until Supabase is available)`);
  }
};

startServer();
