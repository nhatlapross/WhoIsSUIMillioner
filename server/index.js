const { logWithTimestamp } = require('./utils');
const { createServer, setupPeriodicTasks } = require('./serverSetup');
const { connectDB } = require('../scripts/database-services');

// Global storage
const gameRooms = new Map();
const playerConnections = new Map();

// Initialize database connection
connectDB().then(() => {
    logWithTimestamp('🔗 Connected to MongoDB successfully');
}).catch(err => {
    logWithTimestamp('❌ Failed to connect to MongoDB:', err.message);
});

// Create server and WebSocket setup
const { server, wss } = createServer(gameRooms, playerConnections);

// Setup heartbeat mechanism
setInterval(() => {
    wss.clients.forEach((ws) => {
        if (ws.isAlive === false) {
            ws.terminate();
            return;
        }
        ws.isAlive = false;
        ws.ping();
    });
}, 30000);

// Setup periodic tasks
setupPeriodicTasks();

// Start server
const PORT = process.env.PORT || 8080;
server.listen(PORT, '0.0.0.0', () => {
    logWithTimestamp(`🚀 Enhanced WebSocket server with MongoDB ready on port ${PORT}`);
    logWithTimestamp(`📡 Health check available at http://localhost:${PORT}/health`);
    logWithTimestamp(`💾 Database integration enabled`);
});

module.exports = { server, wss, gameRooms };