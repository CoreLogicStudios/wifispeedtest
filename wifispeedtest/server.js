const express = require('express');
const cors = require('cors');
const crypto = require('crypto');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

// Enable CORS for all origins
app.use(cors({
    origin: '*',
    methods: ['GET', 'POST', 'HEAD', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Cache-Control', 'Content-Length']
}));

// Serve static files (your HTML speed test)
app.use(express.static('public'));

// Middleware for raw body parsing (for upload tests)
app.use('/upload', express.raw({ limit: '100mb', type: '*/*' }));

// Root route - serve the speed test
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Download test endpoint - serves random data with cache-busting
app.get('/download', (req, res) => {
    const size = parseInt(req.query.size) || 10000000; // Default 10MB
    const maxSize = 100 * 1024 * 1024; // 100MB limit
    
    if (size > maxSize) {
        return res.status(400).json({ error: 'Size too large, max 100MB' });
    }

    // Aggressive cache prevention headers
    res.setHeader('Content-Type', 'application/octet-stream');
    res.setHeader('Content-Length', size);
    res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate, max-age=0');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');
    res.setHeader('Last-Modified', new Date().toUTCString());
    res.setHeader('ETag', Math.random().toString(36));
    
    // Stream random data in chunks for better performance
    let sent = 0;
    const chunkSize = 65536; // 64KB chunks
    
    const sendChunk = () => {
        if (sent >= size) {
            res.end();
            return;
        }
        
        const remaining = size - sent;
        const currentChunkSize = Math.min(chunkSize, remaining);
        
        // Generate random data
        const chunk = crypto.randomBytes(currentChunkSize);
        
        res.write(chunk);
        sent += currentChunkSize;
        
        // Use setImmediate to prevent blocking the event loop
        setImmediate(sendChunk);
    };
    
    sendChunk();
});

// Upload test endpoint - receives and measures data
app.post('/upload', (req, res) => {
    const contentLength = parseInt(req.headers['content-length']) || 0;
    const receivedSize = req.body ? req.body.length : 0;
    
    // Cache prevention headers
    res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');
    res.setHeader('Content-Type', 'application/json');
    
    res.json({ 
        received: receivedSize,
        contentLength: contentLength,
        status: 'success',
        timestamp: Date.now()
    });
});

// Ping test endpoint - minimal latency measurement
app.all('/ping', (req, res) => {
    res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');
    res.setHeader('Content-Type', 'application/json');
    
    res.json({ 
        timestamp: Date.now(),
        server: 'Railway Speed Test Server',
        method: req.method
    });
});

// Empty endpoint for ultra-fast ping tests
app.all('/empty', (req, res) => {
    res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
    res.setHeader('Content-Length', '0');
    res.status(204).end();
});

// Get client IP information
app.get('/ip', (req, res) => {
    const clientIP = req.headers['x-forwarded-for'] || 
                     req.headers['x-real-ip'] || 
                     req.connection.remoteAddress ||
                     req.socket.remoteAddress ||
                     req.ip;
    
    res.json({
        ip: clientIP,
        userAgent: req.headers['user-agent'],
        timestamp: Date.now()
    });
});

// Server info endpoint
app.get('/info', (req, res) => {
    res.json({
        server: 'Railway Speed Test Server',
        version: '1.0.0',
        platform: 'Railway.app',
        endpoints: {
            download: '/download?size=<bytes>',
            upload: '/upload',
            ping: '/ping',
            empty: '/empty',
            ip: '/ip'
        },
        features: [
            'Real-time speed testing',
            'Multiple connection support',
            'Cache-busting',
            'Large file support up to 100MB'
        ]
    });
});

// Health check for Railway
app.get('/health', (req, res) => {
    res.json({ 
        status: 'healthy', 
        timestamp: Date.now(),
        uptime: process.uptime(),
        memory: process.memoryUsage()
    });
});

// Handle 404s
app.use('*', (req, res) => {
    res.status(404).json({ 
        error: 'Endpoint not found',
        availableEndpoints: ['/download', '/upload', '/ping', '/empty', '/ip', '/info', '/health']
    });
});

// Error handling middleware
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).json({ 
        error: 'Internal server error',
        message: process.env.NODE_ENV === 'development' ? err.message : 'Something went wrong'
    });
});

app.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 Speed Test Server running on port ${PORT}`);
    console.log('📊 Endpoints available:');
    console.log(`   Download: http://localhost:${PORT}/download?size=10000000`);
    console.log(`   Upload:   http://localhost:${PORT}/upload`);
    console.log(`   Ping:     http://localhost:${PORT}/ping`);
    console.log(`   Info:     http://localhost:${PORT}/info`);
    console.log(`   Health:   http://localhost:${PORT}/health`);
});

module.exports = app;
