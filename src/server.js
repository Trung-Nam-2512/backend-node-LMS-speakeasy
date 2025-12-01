// Load environment variables first
const dotenv = require('dotenv');
const path = require('path');

// Try to load .env file
const envPath = path.join(__dirname, '..', '.env');
const result = dotenv.config({
    path: envPath,
    override: false,
    debug: false
});

// Only log errors, not successful loads (security)
if (result.error) {
    console.error('❌ Error loading .env file:', result.error.message);
} else if (result.parsed && Object.keys(result.parsed).length === 0) {
    console.warn('⚠️  .env file exists but no variables were loaded');
}
const http = require('http');
const app = require('./app');
require('./config/database.config');

const PORT = process.env.PORT || 3000;

(async () => {
    const server = http.createServer(app);
    server.setTimeout(30_000); // 30s

    server.listen(PORT, () => {
        console.log(`API listening on :${PORT}`);
    });

    const shutdown = () => {
        console.log('Shutting down gracefully...');
        server.close(() => process.exit(0));
        setTimeout(() => process.exit(1), 10_000).unref();
    };
    process.on('SIGTERM', shutdown);
    process.on('SIGINT', shutdown);
})();
