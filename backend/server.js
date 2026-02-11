require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const path = require('path');

// Import routes
const authRoutes = require('./src/routes/auth');
const userRoutes = require('./src/routes/users');
const projectRoutes = require('./src/routes/projects');
const dailyReportRoutes = require('./src/routes/dailyReports');
const photoRoutes = require('./src/routes/photos');
const rfiRoutes = require('./src/routes/rfis');
const changeRoutes = require('./src/routes/changes');
const taskRoutes = require('./src/routes/tasks');
const timecardRoutes = require('./src/routes/timecards');
const documentRoutes = require('./src/routes/documents');
const materialRoutes = require('./src/routes/materials');
const punchListRoutes = require('./src/routes/punchList');
const decisionRoutes = require('./src/routes/decisions');

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(helmet());
app.use(cors());
app.use(morgan('combined'));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Static file serving for uploads
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/projects', projectRoutes);
app.use('/api/daily-reports', dailyReportRoutes);
app.use('/api/photos', photoRoutes);
app.use('/api/rfis', rfiRoutes);
app.use('/api/changes', changeRoutes);
app.use('/api/tasks', taskRoutes);
app.use('/api/timecards', timecardRoutes);
app.use('/api/documents', documentRoutes);
app.use('/api/materials', materialRoutes);
app.use('/api/punch-list', punchListRoutes);
app.use('/api/decisions', decisionRoutes);

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(err.status || 500).json({
    error: {
      message: err.message || 'Internal Server Error',
      ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
    }
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: { message: 'Route not found' } });
});

app.listen(PORT, () => {
  console.log(`🚀 Office Bridge API running on port ${PORT}`);
  console.log(`📁 Environment: ${process.env.NODE_ENV || 'development'}`);
});

module.exports = app;
