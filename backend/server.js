import express from 'express';
import cors from 'cors';

import personnelRoutes from './routes/personnelRoutes.js';
import ordersRoutes from './routes/ordersRoutes.js';
import assignmentsRoutes from './routes/assignmentsRoutes.js';
import educationRoutes from './routes/educationRoutes.js';
import promotionsRoutes from './routes/promotionsRoutes.js';
import trainingRoutes from './routes/trainingRoutes.js';
import leaveRoutes from './routes/leaveRoutes.js';

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());

// Request logger middleware
app.use((req, res, next) => {
  const timestamp = new Date().toISOString();
  console.log(`[${timestamp}] ${req.method} ${req.originalUrl}`);
  next();
});

// API Health & Status Endpoint
app.get('/api/health', (req, res) => {
  res.json({
    status: 'online',
    system: 'PNP-ITMS PAIS 2.0 Backend Service',
    databaseAdapter: 'In-Memory Repository (Database Ready)',
    timestamp: new Date().toISOString(),
    endpoints: [
      '/api/personnel',
      '/api/orders',
      '/api/assignments',
      '/api/education',
      '/api/promotions',
      '/api/training',
      '/api/leave'
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

app.listen(PORT, () => {
  console.log(`===================================================`);
  console.log(` PNP ITMS PAIS 2.0 REST API Server is running`);
  console.log(` URL: http://localhost:${PORT}`);
  console.log(` Health Check: http://localhost:${PORT}/api/health`);
  console.log(` Ready for Database Migration (Prisma/Postgres/SQLite)`);
  console.log(`===================================================`);
});
