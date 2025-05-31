const express = require('express');
const cors = require('cors');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.raw({ limit: '10mb', type: '*/*' }));
app.use(express.json({ limit: '10mb' }));

// Serve static files (your HTML)
app.use(express.static(path.join(__dirname, 'public')));

// API Routes

// Ping endpoint for latency testing
app.get('/api/ping', (req, res) => {
    res.json({ 
        timestamp: Date.now(),
        server: 'render',
        status: 'ok'
    });
});

// Download endpoint for speed testing
app.get('/api/download', (req, res) => {
    try {
        // Get size parameter (default 1MB, max 50MB)
        const sizeParam = req.query.size || '1MB';
        const sizeMatch = sizeParam.match(/(\d+)/);
        const size = Math.min(parseInt(sizeMatch ? sizeMatch[1] : '1'), 50);
        const bytes = size * 1024 * 1024;
        
        // Set headers
        res.setHeader('Content-Type', 'application/octet-stream');
        res.setHeader('Content-Length', bytes.toString());
        res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
        res.setHeader('Access-Control-Allow-Origin', '*');
        
        // Generate and send test data in chunks
        const chunkSize = 64 * 1024; // 64KB chunks
        let sent = 0;
        
        const sendChunk = () => {
            if (sent >= bytes) {
                res.end();
                return;
            }
            
            const remaining = bytes - sent;
            const currentChunkSize = Math.min(chunkSize, remaining);
            const chunk = Buffer.alloc(currentChunkSize, 'A');
            
            res.write(chunk);
            sent += currentChunkSize;
            
            // Use setImmediate to avoid blocking
            setImmediate(sendChunk);
        };
        
        sendChunk();
        
    } catch (error) {
        console.error('Download error:', error);
        res.status(500).json({ error: 'Download test failed' });
    }
});

// Upload endpoint for speed testing
app.post('/api/upload', (req, res) => {
    try {
        const startTime = Date.now();
        const contentLength = parseInt(req.headers['content-length'] || '0');
        let receivedBytes = 0;
        
        // Handle raw body data
        req.on('data', (chunk) => {
            receivedBytes += chunk.length;
        });
        
        req.on('end', () => {
            const endTime = Date.now();
            const duration = endTime - startTime;
            
            res.json({
                received: receivedBytes,
                contentLength: contentLength,
                duration: duration,
                timestamp: endTime,
                server: 'render',
                status: 'success'
            });
        });
        
        req.on('error', (error) => {
            console.error('Upload error:', error);
            res.status(500).json({
                error: 'Upload failed',
                message: error.message
            });
        });
        
    } catch (error) {
        console.error('Upload handler error:', error);
        res.status(500).json({ error: 'Upload test failed' });
    }
});

// Health check endpoint
app.get('/health', (req, res) => {
    res.json({ 
        status: 'healthy',
        timestamp: Date.now(),
        uptime: process.uptime()
    });
});

// Serve the main page
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Handle 404s
app.use('*', (req, res) => {
    res.status(404).json({ error: 'Endpoint not found' });
});

// Error handling middleware
app.use((error, req, res, next) => {
    console.error('Server error:', error);
    res.status(500).json({ 
        error: 'Internal server error',
        message: error.message 
    });
});

// Start server
app.listen(PORT, () => {
    console.log(`Speed test server running on port ${PORT}`);
    console.log(`Health check: http://localhost:${PORT}/health`);
    console.log(`API endpoints:`);
    console.log(`  - GET  /api/ping`);
    console.log(`  - GET  /api/download?size=5MB`);
    console.log(`  - POST /api/upload`);
});

module.exports = app;