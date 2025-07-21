const WebSocket = require('ws');
const http = require('http');
const { MessageType } = require('./constants');
const { logWithTimestamp } = require('./utils');
const { createWebSocketHandlers } = require('./websocketHandlers');
const { UserService, GameService, GameSessionService, LeaderboardService } = require('../scripts/database-services');

function createServer(gameRooms, playerConnections) {
    const server = http.createServer(async (req, res) => {
        if (req.url === '/health' && req.method === 'GET') {
            try {
                const gameStats = await GameService.getGameStats();
                const userCount = await UserService.getUserCount();
                
                res.writeHead(200, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({
                    status: 'healthy',
                    timestamp: new Date().toISOString(),
                    activeRooms: gameRooms.size,
                    activeConnections: server.wss ? server.wss.clients.size : 0,
                    playerConnections: playerConnections.size,
                    database: {
                        totalUsers: userCount,
                        totalGames: gameStats.totalGames,
                        activeGames: gameStats.activeGames
                    }
                }));
            } catch (error) {
                res.writeHead(500, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({
                    status: 'unhealthy',
                    error: error.message,
                    timestamp: new Date().toISOString()
                }));
            }
            return;
        }

        res.writeHead(404, { 'Content-Type': 'text/plain' });
        res.end('Enhanced WebSocket Server - Use WSS connection');
    });

    const wss = new WebSocket.Server({ server });
    server.wss = wss;

    const handlers = createWebSocketHandlers(gameRooms, playerConnections);

    wss.on('connection', (ws, req) => {
        const clientIP = req.socket.remoteAddress;
        const connectionId = Math.random().toString(36).substr(2, 8);

        logWithTimestamp(`🔌 New connection from ${clientIP} (ID: ${connectionId})`);

        let playerId = null;
        let currentRoomId = null;

        ws.isAlive = true;
        ws.on('pong', () => {
            ws.isAlive = true;
        });

        ws.on('message', async (message) => {
            try {
                const data = JSON.parse(message.toString());
                
                switch (data.type) {
                    case MessageType.CREATE_ROOM:
                        const createResult = await handlers.handleCreateRoom(ws, data.data);
                        if (createResult.success) {
                            playerId = createResult.playerId;
                            currentRoomId = createResult.roomId;
                        }
                        break;
                    case MessageType.JOIN_ROOM:
                        const joinResult = await handlers.handleJoinRoom(ws, data.data);
                        if (joinResult.success) {
                            playerId = joinResult.playerId;
                            currentRoomId = joinResult.roomId;
                        }
                        break;
                    case MessageType.LEAVE_ROOM:
                        await handlers.handleLeaveRoom(playerId, currentRoomId);
                        playerId = null;
                        currentRoomId = null;
                        break;
                    case MessageType.START_GAME:
                        await handlers.handleStartGame(ws, data.data, playerId, currentRoomId);
                        break;
                    case MessageType.PLAYER_ANSWER:
                        await handlers.handlePlayerAnswer(ws, data.data, playerId, currentRoomId);
                        break;
                    case MessageType.PING:
                        ws.send(JSON.stringify({ type: MessageType.PONG }));
                        break;
                    default:
                        logWithTimestamp(`❓ Unknown message type: ${data.type}`);
                }
            } catch (error) {
                logWithTimestamp(`❌ Error processing message:`, error.message);
                ws.send(JSON.stringify({
                    type: MessageType.ERROR,
                    data: { message: 'Invalid message format' }
                }));
            }
        });

        ws.on('close', async () => {
            logWithTimestamp(`🔌 Connection ${connectionId} closed`);
            if (playerId) {
                playerConnections.delete(playerId);
                await handlers.handleLeaveRoom(playerId, currentRoomId);
            }
        });
    });

    return { server, wss };
}

function setupPeriodicTasks() {
    // Heartbeat mechanism
    setInterval(() => {
        // This will be set up in the main server file
    }, 30000);

    // Periodic database maintenance
    setInterval(async () => {
        try {
            const cleanedSessions = await GameSessionService.cleanupAbandonedSessions(2);
            if (cleanedSessions > 0) {
                logWithTimestamp(`🧩 Cleaned up ${cleanedSessions} abandoned game sessions`);
            }

            const now = new Date();
            if (now.getMinutes() === 0) {
                await LeaderboardService.generatePeriodicLeaderboards();
                logWithTimestamp(`📊 Updated periodic leaderboards`);
            }
        } catch (error) {
            logWithTimestamp(`❌ Database maintenance error:`, error.message);
        }
    }, 60000);
}

module.exports = { createServer, setupPeriodicTasks };