const express = require('express');
const cors = require('cors');
const errorHandler = require('./src/middleware/errorHandler');
const authRoutes = require('./src/routes/auth.routes');
const complaintRoutes = require('./src/routes/complaint.routes');
const noticeRoutes = require('./src/routes/notice.routes');
const dashboardRoutes = require('./src/routes/dashboard.routes');
const aiRoutes = require('./src/routes/ai.routes');

const app = express();

// ─── Core Middleware ───────────────────────────────────────────────────────────

app.use(cors({
  origin: process.env.CLIENT_URL,
  credentials: true,
}));

app.use(express.json());

app.get("/", (req, res) => {
  res.json({
    success: true,
    message: "Society Maintenance API is running",
  });
});

app.get("/health", (req, res) => {
  res.status(200).json({
    status: "OK",
  });
});

// ─── Routes ───────────────────────────────────────────────────────────────────

app.use('/api/auth', authRoutes);
app.use('/api/complaints', complaintRoutes);
app.use('/api/notices', noticeRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/ai', aiRoutes);

app.get('/api/health', (req, res) => {
  res.status(200).json({ status: 'ok', timestamp: new Date().toISOString() });
});

// ─── Error Handler (must be last) ─────────────────────────────────────────────

app.use(errorHandler);

module.exports = app;
