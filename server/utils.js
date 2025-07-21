const WebSocket = require('ws');

function logWithTimestamp(message, data) {
    const timestamp = new Date().toISOString();
    if (data) {
        console.log(`[${timestamp}] ${message}`, data);
    } else {
        console.log(`[${timestamp}] ${message}`);
    }
}

function broadcastToRoom(gameRooms, roomId, message, excludePlayerId = null) {
    const room = gameRooms.get(roomId);
    if (!room) {
        logWithTimestamp(`❌ Cannot broadcast to room ${roomId} - room not found`);
        return;
    }

    let sentCount = 0;
    let failedCount = 0;

    room.players.forEach(player => {
        if (player.id !== excludePlayerId && player.connection.readyState === WebSocket.OPEN) {
            try {
                player.connection.send(JSON.stringify(message));
                sentCount++;
                logWithTimestamp(`📤 Sent ${message.type} to player ${player.name} (${player.id})`);
            } catch (error) {
                logWithTimestamp(`❌ Failed to send message to player ${player.id}:`, error.message);
                failedCount++;
            }
        }
    });

    logWithTimestamp(`📡 Broadcast ${message.type} to room ${roomId}: ${sentCount} sent, ${failedCount} failed`);
}

module.exports = { logWithTimestamp, broadcastToRoom };