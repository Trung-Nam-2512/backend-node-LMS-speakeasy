// dotenv is already loaded in server.js, no need to load again
const express = require('express');
const morgan = require('morgan');
const helmet = require('helmet');
const compression = require('compression');
const cors = require('cors');
const passport = require('passport');
const session = require('express-session');
const fs = require('fs');
const path = require('path');
const rfs = require('rotating-file-stream');

const routes = require('./routes'); // tự động gom các route
const { notFound, errorHandler } = require('./middlewares/errorHandler');
const { getMongoDBStatus } = require('./config/database.config');
const apiLogger = require('./middlewares/apiLogger');
const Logger = require('./utils/logger');

// Initialize Passport configuration
require('./config/passport')();

const app = express();

app.disable('x-powered-by');
app.use(helmet());
app.use(compression());

// Setup Morgan với file logging
const logsDir = path.join(__dirname, '../logs');
if (!fs.existsSync(logsDir)) {
    fs.mkdirSync(logsDir, { recursive: true });
}

// Morgan access log với rotation
const accessLogStream = rfs.createStream('access.log', {
    interval: '1d', // Rotate daily
    path: logsDir,
    maxFiles: 30, // Giữ 30 ngày
    compress: 'gzip' // Compress old files
});

// Morgan format cho file (chi tiết)
const morganFormat = ':remote-addr - :remote-user [:date[clf]] ":method :url HTTP/:http-version" :status :res[content-length] ":referrer" ":user-agent" :response-time ms';

// Morgan cho file
app.use(morgan(morganFormat, {
    stream: accessLogStream,
    skip: (req, res) => {
        // Skip health check trong file log (vẫn log trong apiLogger)
        return req.path === '/health';
    }
}));

// Morgan cho console (development)
if (process.env.NODE_ENV !== 'production') {
    app.use(morgan('dev'));
}

// API Logger middleware (log chi tiết vào api-access.log)
app.use(apiLogger);

// CORS Configuration
// Development: Nếu CORS_ALLOWLIST rỗng hoặc "*" → cho phép tất cả
// Production: Chỉ cho phép các domain trong CORS_ALLOWLIST
const corsAllowlist = (process.env.CORS_ALLOWLIST || '').trim();
const isDevelopment = process.env.NODE_ENV === 'development';

let corsOptions = {
    credentials: true,
    optionsSuccessStatus: 200
};

if (isDevelopment || !corsAllowlist || corsAllowlist === '*') {
    // Development mode: Cho phép tất cả origins
    corsOptions.origin = true;
} else {
    // Production mode: Chỉ cho phép các domain trong allowlist
    const allowlist = corsAllowlist
        .split(',')
        .map(s => s.trim())
        .filter(Boolean);

    corsOptions.origin = (origin, cb) => {
        // Cho phép requests không có origin (mobile apps, Postman, etc.)
        if (!origin) return cb(null, true);

        if (allowlist.length === 0 || allowlist.includes(origin)) {
            return cb(null, true);
        }

        return cb(new Error('Not allowed by CORS'));
    };
}

app.use(cors(corsOptions));

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Session configuration for passport
app.use(session({
    secret: process.env.SESSION_SECRET || 'your-secret-key',
    resave: false,
    saveUninitialized: false,
    cookie: {
        secure: process.env.NODE_ENV === 'production',
        maxAge: 24 * 60 * 60 * 1000 // 24 hours
    }
}));

// Initialize passport
app.use(passport.initialize());
app.use(passport.session());

// Health check endpoint with MongoDB status
app.get('/health', (_req, res) => {
    const mongoStatus = getMongoDBStatus();
    const isHealthy = mongoStatus.isConnected;

    res.status(isHealthy ? 200 : 503).json({
        status: isHealthy ? 'healthy' : 'degraded',
        service: 'gateway',
        uptime: process.uptime(),
        mongodb: mongoStatus,
        timestamp: new Date().toISOString()
    });
});

// Routes
app.use(process.env.API_PREFIX || '/api/v1', routes); // Fallback to /api if API_PREFIX is not set

// 404 + Error handler
app.use(notFound);
app.use(errorHandler);

module.exports = app;
