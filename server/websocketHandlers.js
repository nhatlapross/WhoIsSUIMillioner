const { v4: uuidv4 } = require('uuid');
const { MessageType } = require('./constants');
const { logWithTimestamp } = require('./utils');
const { EnhancedGameRoom } = require('./GameRoom');

function createWebSocketHandlers(gameRooms, playerConnections) {
    return {
        async handleCreateRoom(ws, data) {
            try {
                if (!data.playerName || data.playerName.trim().length < 2) {
                    ws.send(JSON.stringify({
                        type: MessageType.ERROR,
                        data: { message: 'Invalid player name' }
                    }));
                    return { success: false };
                }

                const roomId = Math.random().toString(36).substr(2, 6).toUpperCase();
                const playerId = uuidv4();

                const player = {
                    id: playerId,
                    name: data.playerName.trim(),
                    connection: ws,
                    eliminated: false,
                    walletAddress: data.walletAddress || playerId
                };

                const room = new EnhancedGameRoom(roomId, playerId, data.entryFee || 0.5);
                const result = await room.addPlayer(player);

                if (!result.success) {
                    ws.send(JSON.stringify({
                        type: MessageType.ERROR,
                        data: { message: result.error }
                    }));
                    return { success: false };
                }

                gameRooms.set(roomId, room);
                playerConnections.set(playerId, ws);

                ws.send(JSON.stringify({
                    type: MessageType.ROOM_UPDATE,
                    data: {
                        ...room.getRoomInfo(),
                        playerId: playerId,
                        success: true,
                        gamePhase: 'lobby'
                    }
                }));

                logWithTimestamp(`✅ Enhanced room created: ${roomId} by ${data.playerName}`);
                return { success: true, playerId, roomId };
            } catch (error) {
                logWithTimestamp(`❌ Failed to create room:`, error.message);
                ws.send(JSON.stringify({
                    type: MessageType.ERROR,
                    data: { message: 'Failed to create room' }
                }));
                return { success: false };
            }
        },

        async handleJoinRoom(ws, data) {
            try {
                if (!data.playerName || !data.roomId) {
                    ws.send(JSON.stringify({
                        type: MessageType.ERROR,
                        data: { message: 'Missing player name or room ID' }
                    }));
                    return { success: false };
                }

                const room = gameRooms.get(data.roomId.toUpperCase());
                if (!room) {
                    ws.send(JSON.stringify({
                        type: MessageType.ERROR,
                        data: { message: 'Room not found' }
                    }));
                    return { success: false };
                }

                const playerId = uuidv4();
                const player = {
                    id: playerId,
                    name: data.playerName.trim(),
                    connection: ws,
                    eliminated: false,
                    walletAddress: data.walletAddress || playerId
                };

                const result = await room.addPlayer(player);
                if (!result.success) {
                    ws.send(JSON.stringify({
                        type: MessageType.ERROR,
                        data: { message: result.error }
                    }));
                    return { success: false };
                }

                playerConnections.set(playerId, ws);

                ws.send(JSON.stringify({
                    type: MessageType.ROOM_UPDATE,
                    data: {
                        ...room.getRoomInfo(),
                        playerId: playerId,
                        success: true,
                        gamePhase: 'lobby'
                    }
                }));

                return { success: true, playerId, roomId: data.roomId.toUpperCase() };
            } catch (error) {
                logWithTimestamp(`❌ Failed to join room:`, error.message);
                ws.send(JSON.stringify({
                    type: MessageType.ERROR,
                    data: { message: 'Failed to join room' }
                }));
                return { success: false };
            }
        },

        async handleLeaveRoom(playerId, currentRoomId) {
            if (!currentRoomId || !playerId) return;

            try {
                const room = gameRooms.get(currentRoomId);
                if (room) {
                    await room.removePlayer(playerId, gameRooms, playerConnections);
                }
            } catch (error) {
                logWithTimestamp(`❌ Error leaving room:`, error.message);
            }
        },

        async handleStartGame(ws, data, playerId, currentRoomId) {
            try {
                if (!currentRoomId || !playerId) {
                    ws.send(JSON.stringify({
                        type: MessageType.ERROR,
                        data: { message: 'No active room' }
                    }));
                    return;
                }

                const room = gameRooms.get(currentRoomId);
                if (!room || room.creator !== playerId) {
                    ws.send(JSON.stringify({
                        type: MessageType.ERROR,
                        data: { message: 'Only creator can start game' }
                    }));
                    return;
                }

                const result = await room.startGame(data && data.questions ? data.questions : null);
                if (!result.success) {
                    ws.send(JSON.stringify({
                        type: MessageType.ERROR,
                        data: { message: result.error }
                    }));
                }
            } catch (error) {
                logWithTimestamp(`❌ Failed to start game:`, error.message);
                ws.send(JSON.stringify({
                    type: MessageType.ERROR,
                    data: { message: 'Failed to start game' }
                }));
            }
        },

        async handlePlayerAnswer(ws, data, playerId, currentRoomId) {
            try {
                if (!currentRoomId || !playerId || !data.answer) {
                    ws.send(JSON.stringify({
                        type: MessageType.ERROR,
                        data: { message: 'Invalid answer submission' }
                    }));
                    return;
                }

                const room = gameRooms.get(currentRoomId);
                if (!room) {
                    ws.send(JSON.stringify({
                        type: MessageType.ERROR,
                        data: { message: 'Room not found' }
                    }));
                    return;
                }

                const result = await room.submitAnswer(playerId, data.answer);
                if (!result.success) {
                    ws.send(JSON.stringify({
                        type: MessageType.ERROR,
                        data: { message: result.error }
                    }));
                }
            } catch (error) {
                logWithTimestamp(`❌ Failed to handle answer:`, error.message);
                ws.send(JSON.stringify({
                    type: MessageType.ERROR,
                    data: { message: 'Failed to process answer' }
                }));
            }
        }
    };
}

module.exports = { createWebSocketHandlers };