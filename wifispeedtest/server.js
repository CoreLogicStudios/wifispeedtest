const express = require('express');
const cors = require('cors');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors({
    origin: '*',
    methods: ['GET', 'POST', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Content-Length']
}));

app.use(express.raw({ limit: '50mb', type: '*/*' }));
app.use(express.json({ limit: '50mb' }));

// Serve static files from public directory
app.use(express.static(path.join(__dirname, 'public')));

// Health check endpoint
app.get('/health', (req, res) => {
    res.json({ 
        status: 'healthy',
        timestamp: Date.now(),
        uptime: process.uptime(),
        server: 'railway'
    });
});

// Ping endpoint for latency testing
app.get('/api/ping', (req, res) => {
    res.json({ 
        timestamp: Date.now(),
        server: 'railway',
        status: 'ok'
    });
});

// Download endpoint for speed testing
app.get('/api/download', (req, res) => {
    try {
        console.log('Download request:', req.query);
        
        // Parse size parameter
        const sizeParam = req.query.size || '1MB';
        const sizeMatch = sizeParam.match(/(\d+)/);
        const size = Math.min(parseInt(sizeMatch ? sizeMatch[1] : '1'), 100); // Max 100MB
        const bytes = size * 1024 * 1024;
        
        console.log(`Generating ${size}MB (${bytes} bytes) of test data`);
        
        // Set headers for download
        res.setHeader('Content-Type', 'application/octet-stream');
        res.setHeader('Content-Length', bytes.toString());
        res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
        res.setHeader('Access-Control-Allow-Origin', '*');
        
        // Generate test data efficiently in chunks
        const chunkSize = 128 * 1024; // 128KB chunks
        let sent = 0;
        
        const sendNextChunk = () => {
            if (sent >= bytes) {
                console.log(`Download complete: ${sent} bytes sent`);
                res.end();
                return;
            }
            
            const remaining = bytes - sent;
            const currentChunkSize = Math.min(chunkSize, remaining);
            
            // Create chunk filled with 'A'
            const chunk = Buffer.alloc(currentChunkSize, 65); // 65 = 'A'
            
            const writeSuccess = res.write(chunk);
            sent += currentChunkSize;
            
            if (writeSuccess) {
                // Continue immediately if buffer isn't full
                setImmediate(sendNextChunk);
            } else {
                // Wait for drain event if buffer is full
                res.once('drain', sendNextChunk);
            }
        };
        
        sendNextChunk();
        
    } catch (error) {
        console.error('Download error:', error);
        res.status(500).json({ 
            error: 'Download test failed',
            message: error.message 
        });
    }
});

// Upload endpoint for speed testing
app.post('/api/upload', (req, res) => {
    try {
        console.log('Upload request received');
        const startTime = Date.now();
        const contentLength = parseInt(req.headers['content-length'] || '0');
        let receivedBytes = 0;
        
        console.log(`Expected upload size: ${contentLength} bytes`);
        
        req.on('data', (chunk) => {
            receivedBytes += chunk.length;
        });
        
        req.on('end', () => {
            const endTime = Date.now();
            const duration = endTime - startTime;
            
            console.log(`Upload complete: ${receivedBytes} bytes in ${duration}ms`);
            
            res.json({
                received: receivedBytes,
                contentLength: contentLength,
                duration: duration,
                timestamp: endTime,
                server: 'railway',
                status: 'success'
            });
        });
        
        req.on('error', (error) => {
            console.error('Upload stream error:', error);
            res.status(500).json({
                error: 'Upload failed',
                message: error.message
            });
        });
        
    } catch (error) {
        console.error('Upload handler error:', error);
        res.status(500).json({ 
            error: 'Upload test failed',
            message: error.message 
        });
    }
});

// Serve main page
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Handle 404s
app.use('*', (req, res) => {
    res.status(404).json({ 
        error: 'Endpoint not found',
        path: req.originalUrl 
    });
});

// Global error handler
app.use((error, req, res, next) => {
    console.error('Global error handler:', error);
    res.status(500).json({ 
        error: 'Internal server error',
        message: error.message 
    });
});

// Start server
app.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 Speed test server running on port ${PORT}`);
    console.log(`📊 Health check: http://localhost:${PORT}/health`);
    console.log(`🌐 Main site: http://localhost:${PORT}`);
    console.log(`🔧 API endpoints:`);
    console.log(`   - GET  /api/ping`);
    console.log(`   - GET  /api/download?size=10MB`);
    console.log(`   - POST /api/upload`);
});

module.exports = app;
