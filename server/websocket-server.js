// server/websocket-server.js - ENHANCED answer processing with detailed debugging
const WebSocket = require('ws');
const http = require('http');
const { v4: uuidv4 } = require('uuid');

// Message types
const MessageType = {
    CREATE_ROOM: 'create_room',
    JOIN_ROOM: 'join_room',
    LEAVE_ROOM: 'leave_room',
    ROOM_UPDATE: 'room_update',
    START_GAME: 'start_game',
    GAME_STARTED: 'game_started',
    NEXT_QUESTION: 'next_question',
    PLAYER_ANSWER: 'player_answer',
    PLAYER_ELIMINATED: 'player_eliminated',
    GAME_OVER: 'game_over',
    ERROR: 'error',
    PING: 'ping',
    PONG: 'pong'
};

const GameState = {
    WAITING: 'waiting',
    STARTING: 'starting',
    PLAYING: 'playing',
    FINISHED: 'finished'
};

// Global storage
const gameRooms = new Map();
const playerConnections = new Map(); // playerId -> websocket connection

function logWithTimestamp(message, data) {
    const timestamp = new Date().toISOString();
    if (data) {
        console.log(`[${timestamp}] ${message}`, data);
    } else {
        console.log(`[${timestamp}] ${message}`);
    }
}

function broadcastToRoom(roomId, message, excludePlayerId = null) {
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

// ENHANCED: Connection tracking
function addPlayerConnection(playerId, ws) {
    playerConnections.set(playerId, ws);
    logWithTimestamp(`🔗 Added player connection mapping: ${playerId}`);
}

function removePlayerConnection(playerId) {
    playerConnections.delete(playerId);
    logWithTimestamp(`🔗 Removed player connection mapping: ${playerId}`);
}

function getPlayerConnection(playerId) {
    return playerConnections.get(playerId);
}

function getDefaultMultiplayerQuestions() {
    return [
        {
            question: "Thủ đô của Việt Nam là gì?",
            choices: ['Hà Nội', 'Hồ Chí Minh', 'Đà Nẵng', 'Hải Phòng'],
            correctAnswer: 'a'
        },
        {
            question: "Sông nào dài nhất Việt Nam?",
            choices: ['Sông Hồng', 'Sông Mekong', 'Sông Đồng Nai', 'Sông Hương'],
            correctAnswer: 'b'
        },
        {
            question: "Đỉnh núi cao nhất Việt Nam là?",
            choices: ['Phan Xi Păng', 'Pu Ta Leng', 'Tà Chì Nhù', 'Pu Si Lung'],
            correctAnswer: 'a'
        },
        {
            question: "Tỉnh nào có diện tích lớn nhất Việt Nam?",
            choices: ['Nghệ An', 'Gia Lai', 'Lâm Đồng', 'Đắk Lắk'],
            correctAnswer: 'a'
        },
        {
            question: "Thành phố nào có biệt danh 'Thành phố Hoa phượng đỏ'?",
            choices: ['Hà Nội', 'Huế', 'Hải Phòng', 'Đà Nẵng'],
            correctAnswer: 'd'
        }
    ];
}

// GameRoom class with ENHANCED answer processing
class GameRoom {
    constructor(id, creator, entryFee = 0.5) {
        this.id = id;
        this.creator = creator;
        this.entryFee = entryFee;
        this.players = [];
        this.state = GameState.WAITING;
        this.currentQuestion = 0;
        this.questions = [];
        this.prizePool = 0;
        this.maxPlayers = 50;
        this.startTime = null;
        this.questionStartTime = null;
        this.eliminatedPlayers = [];
        this.questionTimer = null;
        this.countdownTimer = null;

        logWithTimestamp(`🏠 Created room ${id} by player ${creator}, entry fee: ${entryFee} SUI`);
    }

    addPlayer(player) {
        logWithTimestamp(`👤 Player ${player.id} (${player.name}) attempting to join room ${this.id}`);

        if (this.players.length >= this.maxPlayers) {
            return { success: false, error: 'Room is full' };
        }

        if (this.state !== GameState.WAITING) {
            return { success: false, error: 'Game already started' };
        }

        if (this.players.some(p => p.name === player.name)) {
            return { success: false, error: 'Player name already taken' };
        }

        this.players.push(player);
        this.prizePool += this.entryFee;

        // ENHANCED: Add connection mapping
        addPlayerConnection(player.id, player.connection);

        logWithTimestamp(`✅ Player ${player.id} joined room ${this.id}. Players: ${this.players.length}, Prize pool: ${this.prizePool} SUI`);

        if (this.state === GameState.WAITING) {
            this.broadcastToRoom({
                type: MessageType.ROOM_UPDATE,
                data: this.getRoomInfo()
            });
        }

        return { success: true };
    }

    removePlayer(playerId) {
        logWithTimestamp(`👋 Player ${playerId} leaving room ${this.id}`);

        const playerIndex = this.players.findIndex(p => p.id === playerId);
        if (playerIndex === -1) {
            return;
        }

        // ENHANCED: Remove connection mapping
        removePlayerConnection(playerId);

        this.players.splice(playerIndex, 1);
        this.prizePool = Math.max(0, this.prizePool - this.entryFee);

        if (this.creator === playerId) {
            if (this.players.length > 0) {
                this.creator = this.players[0].id;
                logWithTimestamp(`👑 New creator for room ${this.id}: ${this.creator}`);
            } else {
                logWithTimestamp(`🗑️ Deleting empty room ${this.id}`);
                this.cleanup();
                gameRooms.delete(this.id);
                return;
            }
        }

        if (this.state === GameState.WAITING) {
            this.broadcastToRoom({
                type: MessageType.ROOM_UPDATE,
                data: this.getRoomInfo()
            });
        }

        if (this.state === GameState.PLAYING && this.getAlivePlayers().length <= 1) {
            setTimeout(() => this.endGame(), 1000);
        }
    }

    startGame(questions) {
        logWithTimestamp(`🎮 STARTING GAME in room ${this.id} with ${this.players.length} players`);

        if (this.players.length < 2) {
            return { success: false, error: 'Need at least 2 players' };
        }

        this.questions = questions && questions.length > 0 ? questions : getDefaultMultiplayerQuestions();
        this.state = GameState.STARTING;
        this.startTime = Date.now();

        logWithTimestamp(`⏱️ Game countdown starting for room ${this.id}, state changed to STARTING`);
        logWithTimestamp(`📝 Loaded ${this.questions.length} questions`);

        let countdown = 3;

        const initialCountdownData = {
            countdown: countdown,
            totalQuestions: this.questions.length,
            prizePool: this.prizePool,
            roomState: this.state
        };

        logWithTimestamp(`📡 Broadcasting initial countdown to all ${this.players.length} players`);
        this.broadcastToRoom({
            type: MessageType.GAME_STARTED,
            data: initialCountdownData
        });

        this.countdownTimer = setInterval(() => {
            countdown--;
            logWithTimestamp(`⏰ Countdown: ${countdown}`);

            if (countdown > 0) {
                const countdownData = {
                    countdown: countdown,
                    totalQuestions: this.questions.length,
                    prizePool: this.prizePool,
                    roomState: this.state
                };

                this.broadcastToRoom({
                    type: MessageType.GAME_STARTED,
                    data: countdownData
                });
            } else {
                logWithTimestamp(`🚀 Countdown finished! Transitioning to PLAYING state`);
                
                if (this.countdownTimer) {
                    clearInterval(this.countdownTimer);
                    this.countdownTimer = null;
                }

                if (this.state === GameState.STARTING && gameRooms.has(this.id)) {
                    this.state = GameState.PLAYING;
                    logWithTimestamp(`▶️ Game state changed to PLAYING in room ${this.id}`);

                    const finalCountdownData = {
                        countdown: 0,
                        totalQuestions: this.questions.length,
                        prizePool: this.prizePool,
                        roomState: this.state
                    };

                    this.broadcastToRoom({
                        type: MessageType.GAME_STARTED,
                        data: finalCountdownData
                    });

                    setTimeout(() => {
                        if (this.state === GameState.PLAYING && gameRooms.has(this.id)) {
                            logWithTimestamp(`❓ Starting first question`);
                            this.nextQuestion();
                        }
                    }, 1500);
                }
            }
        }, 1000);

        return { success: true };
    }

    nextQuestion() {
        if (!gameRooms.has(this.id) || this.state !== GameState.PLAYING) {
            logWithTimestamp(`❌ Cannot proceed to next question - room ${this.id} state: ${this.state}`);
            return;
        }

        if (this.currentQuestion >= this.questions.length) {
            logWithTimestamp(`📝 All questions completed in room ${this.id}`);
            this.endGame();
            return;
        }

        const question = this.questions[this.currentQuestion];
        this.questionStartTime = Date.now();

        if (this.questionTimer) {
            clearTimeout(this.questionTimer);
            this.questionTimer = null;
        }

        // ENHANCED: Reset player answers with detailed logging
        this.players.forEach(player => {
            if (!player.eliminated) {
                player.currentAnswer = undefined;
                player.answerTime = undefined;
                logWithTimestamp(`🔄 Reset answer for player ${player.name} (${player.id})`);
            }
        });

        logWithTimestamp(`❓ Question ${this.currentQuestion + 1}/${this.questions.length}: "${question.question}"`);

        const questionData = {
            questionNumber: this.currentQuestion + 1,
            question: question.question,
            choices: question.choices,
            correctAnswer: question.correctAnswer,
            timeLimit: 15,
            alivePlayers: this.getAlivePlayers().length,
            totalQuestions: this.questions.length
        };

        logWithTimestamp(`📡 Broadcasting question to all ${this.getAlivePlayers().length} alive players`);
        this.broadcastToRoom({
            type: MessageType.NEXT_QUESTION,
            data: questionData
        });

        // Auto-process answers after time limit
        this.questionTimer = setTimeout(() => {
            if (gameRooms.has(this.id) && this.state === GameState.PLAYING) {
                logWithTimestamp(`⏰ Time limit reached for question ${this.currentQuestion + 1}`);
                this.processAnswers();
            }
        }, 15000);
    }

    // ENHANCED: submitAnswer with detailed debugging
    submitAnswer(playerId, answer) {
        logWithTimestamp(`🔍 SUBMIT ANSWER DEBUG:`, {
            playerId,
            answer,
            roomId: this.id,
            roomState: this.state,
            currentQuestion: this.currentQuestion + 1,
            timestamp: new Date().toISOString()
        });

        const player = this.players.find(p => p.id === playerId);
        if (!player) {
            logWithTimestamp(`❌ Player not found: ${playerId}`);
            return { success: false, error: 'Player not found' };
        }

        if (player.eliminated) {
            logWithTimestamp(`❌ Player ${player.name} is already eliminated`);
            return { success: false, error: 'Player eliminated' };
        }

        if (this.state !== GameState.PLAYING) {
            logWithTimestamp(`❌ Answer submitted but game not playing (state: ${this.state})`);
            return { success: false, error: `Game not in playing state: ${this.state}` };
            }

        if (player.currentAnswer !== undefined) {
            logWithTimestamp(`⚠️ Player ${player.name} already answered: ${player.currentAnswer}`);
            return { success: false, error: 'Answer already submitted' };
        }

        // ENHANCED: Record answer with validation
        player.currentAnswer = answer.toLowerCase();
        player.answerTime = Date.now() - (this.questionStartTime || Date.now());

        logWithTimestamp(`✅ Answer recorded for ${player.name}:`, {
            answer: answer.toLowerCase(),
            answerTime: player.answerTime,
            playerId
        });

        // Send confirmation back to player
        try {
            if (player.connection && player.connection.readyState === WebSocket.OPEN) {
                player.connection.send(JSON.stringify({
                    type: MessageType.PLAYER_ANSWER,
                    data: {
                        success: true,
                        answer: answer,
                        questionNumber: this.currentQuestion + 1
                    }
                }));
                logWithTimestamp(`📤 Sent answer confirmation to ${player.name}`);
            }
        } catch (error) {
            logWithTimestamp(`❌ Failed to send confirmation to ${player.name}:`, error.message);
        }

        // Check if all alive players answered
        const alivePlayers = this.getAlivePlayers();
        const answeredPlayers = alivePlayers.filter(p => p.currentAnswer !== undefined);

        logWithTimestamp(`📊 Room ${this.id}: ${answeredPlayers.length}/${alivePlayers.length} players answered`);

        if (answeredPlayers.length === alivePlayers.length) {
            logWithTimestamp(`✅ All players answered, processing early`);
            if (this.questionTimer) {
                clearTimeout(this.questionTimer);
                this.questionTimer = null;
            }
            setTimeout(() => {
                if (gameRooms.has(this.id) && this.state === GameState.PLAYING) {
                    this.processAnswers();
                }
            }, 500);
        }

        return { success: true };
    }

    processAnswers() {
        if (!gameRooms.has(this.id) || this.state !== GameState.PLAYING) {
            return;
        }

        const correctAnswer = this.questions[this.currentQuestion].correctAnswer.toLowerCase();
        const eliminatedThisRound = [];

        logWithTimestamp(`🔍 Processing answers for question ${this.currentQuestion + 1}. Correct: ${correctAnswer}`);

        this.players.forEach(player => {
            if (player.eliminated) return;

            const playerAnswer = player.currentAnswer ? player.currentAnswer.toLowerCase() : null;

            logWithTimestamp(`🔍 Player ${player.name}: answered "${playerAnswer}", correct is "${correctAnswer}"`);

            if (playerAnswer !== correctAnswer) {
                player.eliminated = true;
                player.eliminationRound = this.currentQuestion + 1;
                eliminatedThisRound.push({
                    id: player.id,
                    name: player.name,
                    answer: playerAnswer || 'NO ANSWER'
                });
                logWithTimestamp(`❌ Player ${player.name} eliminated (answered ${playerAnswer || 'NO ANSWER'})`);
            } else {
                logWithTimestamp(`✅ Player ${player.name} survived`);
            }

            player.currentAnswer = undefined;
            player.answerTime = undefined;
        });

        logWithTimestamp(`📊 Round ${this.currentQuestion + 1}: ${eliminatedThisRound.length} eliminated, ${this.getAlivePlayers().length} remaining`);

        // Broadcast elimination results
        const eliminationData = {
            correctAnswer,
            eliminated: eliminatedThisRound,
            remaining: this.getAlivePlayers().length
        };

        this.broadcastToRoom({
            type: MessageType.PLAYER_ELIMINATED,
            data: eliminationData
        });

        this.currentQuestion++;

        // Check game end conditions
        const alivePlayers = this.getAlivePlayers();
        if (alivePlayers.length <= 1) {
            logWithTimestamp(`🏁 Game ending - ${alivePlayers.length} players left`);
            setTimeout(() => this.endGame(), 2000);
        } else if (this.currentQuestion >= this.questions.length) {
            logWithTimestamp(`📝 All questions completed`);
            setTimeout(() => this.endGame(), 2000);
        } else {
            logWithTimestamp(`➡️ Moving to next question`);
            setTimeout(() => {
                if (gameRooms.has(this.id) && this.state === GameState.PLAYING) {
                    this.nextQuestion();
                }
            }, 3000);
        }
    }

    endGame() {
        if (!gameRooms.has(this.id)) {
            return;
        }

        this.state = GameState.FINISHED;
        const alivePlayers = this.getAlivePlayers();
        const winner = alivePlayers.length === 1 ? alivePlayers[0] : null;

        const prizeDistribution = {
            winnerPrize: this.prizePool * 0.95,
            platformFee: this.prizePool * 0.05,
            total: this.prizePool
        };

        if (winner) {
            logWithTimestamp(`🏆 Winner: ${winner.name} - Prize: ${prizeDistribution.winnerPrize} SUI`);
        }

        const gameOverData = {
            winner: winner ? {
                id: winner.id,
                name: winner.name,
                prize: prizeDistribution.winnerPrize
            } : null,
            prizePool: this.prizePool,
            totalQuestions: this.currentQuestion,
            finalStats: {
                totalPlayers: this.players.length,
                questionsAnswered: this.currentQuestion
            }
        };

        logWithTimestamp(`📡 Broadcasting game over to all players`);
        this.broadcastToRoom({
            type: MessageType.GAME_OVER,
            data: gameOverData
        });

        this.cleanup();

        // Auto-delete room after 30 seconds
        setTimeout(() => {
            if (gameRooms.has(this.id)) {
                logWithTimestamp(`🗑️ Auto-deleting room ${this.id}`);
                gameRooms.delete(this.id);
            }
        }, 30000);
    }

    getAlivePlayers() {
        return this.players.filter(p => !p.eliminated);
    }

    getRoomInfo() {
        return {
            id: this.id,
            creator: this.creator,
            entryFee: this.entryFee,
            playerCount: this.players.length,
            maxPlayers: this.maxPlayers,
            prizePool: this.prizePool,
            state: this.state,
            currentQuestion: this.currentQuestion + 1,
            totalQuestions: this.questions.length,
            players: this.players.map(p => ({
                id: p.id,
                name: p.name,
                isCreator: p.id === this.creator,
                eliminated: p.eliminated || false
            }))
        };
    }

    broadcastToRoom(message, excludePlayerId) {
        broadcastToRoom(this.id, message, excludePlayerId);
    }

    cleanup() {
        if (this.questionTimer) {
            clearTimeout(this.questionTimer);
            this.questionTimer = null;
        }

        if (this.countdownTimer) {
            clearInterval(this.countdownTimer);
            this.countdownTimer = null;
        }

        this.players.forEach(player => {
            if (player.connection) {
                removePlayerConnection(player.id);
            }
        });
    }
}

// Create WebSocket server
const server = http.createServer((req, res) => {
  if (req.url === '/health' && req.method === 'GET') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ 
      status: 'healthy', 
      timestamp: new Date().toISOString(),
      activeRooms: gameRooms.size,
      activeConnections: wss ? wss.clients.size : 0,
      playerConnections: playerConnections.size
    }));
    return;
  }

  res.writeHead(404, { 'Content-Type': 'text/plain' });
  res.end('WebSocket Server - Use WSS connection');
});

const wss = new WebSocket.Server({ server });

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

    // ENHANCED: Message handling with better debugging
    ws.on('message', (message) => {
        try {
            const data = JSON.parse(message.toString());
            logWithTimestamp(`📨 Message from ${connectionId}:`, {
                type: data.type,
                playerId: playerId,
                roomId: currentRoomId,
                hasData: !!data.data
            });

            switch (data.type) {
                case MessageType.CREATE_ROOM:
                    handleCreateRoom(data.data);
                    break;
                case MessageType.JOIN_ROOM:
                    handleJoinRoom(data.data);
                    break;
                case MessageType.LEAVE_ROOM:
                    handleLeaveRoom();
                    break;
                case MessageType.START_GAME:
                    handleStartGame(data.data);
                    break;
                case MessageType.PLAYER_ANSWER:
                    handlePlayerAnswer(data.data);
                    break;
                case MessageType.PING:
                    ws.send(JSON.stringify({ type: MessageType.PONG }));
                    break;
                default:
                    logWithTimestamp(`❓ Unknown message type: ${data.type}`);
            }
        } catch (error) {
            logWithTimestamp(`❌ Error processing message from ${connectionId}:`, error.message);
            ws.send(JSON.stringify({
                type: MessageType.ERROR,
                data: { message: 'Invalid message format' }
            }));
        }
    });

    ws.on('close', () => {
        logWithTimestamp(`🔌 Connection ${connectionId} closed`);
        if (playerId) {
            removePlayerConnection(playerId);
        }
        handleLeaveRoom();
    });

    // ENHANCED: Message handlers with better error handling
    function handleCreateRoom(data) {
        if (!data.playerName || data.playerName.trim().length < 2) {
            ws.send(JSON.stringify({
                type: MessageType.ERROR,
                data: { message: 'Invalid player name' }
            }));
            return;
        }

        const roomId = Math.random().toString(36).substr(2, 6).toUpperCase();
        playerId = uuidv4();

        const player = {
            id: playerId,
            name: data.playerName.trim(),
            connection: ws,
            eliminated: false
        };

        const room = new GameRoom(roomId, playerId, data.entryFee || 0.5);
        const result = room.addPlayer(player);

        if (!result.success) {
            ws.send(JSON.stringify({
                type: MessageType.ERROR,
                data: { message: result.error }
            }));
            return;
        }

        gameRooms.set(roomId, room);
        currentRoomId = roomId;

        ws.send(JSON.stringify({
            type: MessageType.ROOM_UPDATE,
            data: {
                ...room.getRoomInfo(),
                playerId: playerId,
                success: true,
                gamePhase: 'lobby'
            }
        }));

        logWithTimestamp(`✅ Room created: ${roomId} by ${data.playerName}`);
    }

    function handleJoinRoom(data) {
        if (!data.playerName || !data.roomId) {
            ws.send(JSON.stringify({
                type: MessageType.ERROR,
                data: { message: 'Missing player name or room ID' }
            }));
            return;
        }

        const room = gameRooms.get(data.roomId.toUpperCase());
        if (!room) {
            ws.send(JSON.stringify({
                type: MessageType.ERROR,
                data: { message: 'Room not found' }
            }));
            return;
        }

        playerId = uuidv4();
        const player = {
            id: playerId,
            name: data.playerName.trim(),
            connection: ws,
            eliminated: false
        };

        const result = room.addPlayer(player);
        if (!result.success) {
            ws.send(JSON.stringify({
                type: MessageType.ERROR,
                data: { message: result.error }
            }));
            return;
        }

        currentRoomId = data.roomId.toUpperCase();

        ws.send(JSON.stringify({
            type: MessageType.ROOM_UPDATE,
            data: {
                ...room.getRoomInfo(),
                playerId: playerId,
                success: true,
                gamePhase: 'lobby'
            }
        }));

        logWithTimestamp(`✅ ${data.playerName} joined room ${data.roomId}`);
    }

    function handleLeaveRoom() {
        if (!currentRoomId || !playerId) return;

        const room = gameRooms.get(currentRoomId);
        if (room) {
            room.removePlayer(playerId);
        }
        currentRoomId = null;
        playerId = null;
    }

    function handleStartGame(data) {
        logWithTimestamp(`🎮 START_GAME request from player ${playerId} in room ${currentRoomId}`);

        if (!currentRoomId || !playerId) {
            ws.send(JSON.stringify({
                type: MessageType.ERROR,
                data: { message: 'No active room' }
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

        if (room.creator !== playerId) {
            ws.send(JSON.stringify({
                type: MessageType.ERROR,
                data: { message: 'Only creator can start game' }
            }));
            return;
        }

        if (room.state !== GameState.WAITING) {
            ws.send(JSON.stringify({
                type: MessageType.ERROR,
                data: { message: `Cannot start game. State: ${room.state}` }
            }));
            return;
        }

        if (room.players.length < 2) {
            ws.send(JSON.stringify({
                type: MessageType.ERROR,
                data: { message: 'Need at least 2 players' }
            }));
            return;
        }

        const questions = data && data.questions ? data.questions : getDefaultMultiplayerQuestions();
        const result = room.startGame(questions);
        
        if (!result.success) {
            ws.send(JSON.stringify({
                type: MessageType.ERROR,
                data: { message: result.error }
            }));
        }
    }

    // ENHANCED: handlePlayerAnswer with detailed debugging
    function handlePlayerAnswer(data) {
        logWithTimestamp(`🔍 PLAYER_ANSWER received:`, {
            playerId,
            roomId: currentRoomId,
            answer: data.answer,
            connectionId,
            timestamp: new Date().toISOString()
        });

        if (!currentRoomId || !playerId || !data.answer) {
            const error = 'Invalid answer submission';
            logWithTimestamp(`❌ ${error}:`, {
                hasRoom: !!currentRoomId,
                hasPlayerId: !!playerId,
                hasAnswer: !!data.answer
            });
            
            ws.send(JSON.stringify({
                type: MessageType.ERROR,
                data: { message: error }
            }));
            return;
        }

        const room = gameRooms.get(currentRoomId);
        if (!room) {
            logWithTimestamp(`❌ Room not found: ${currentRoomId}`);
            ws.send(JSON.stringify({
                type: MessageType.ERROR,
                data: { message: 'Room not found' }
            }));
            return;
        }

        // Submit answer to room
        const result = room.submitAnswer(playerId, data.answer);
        
        if (!result.success) {
            logWithTimestamp(`❌ Failed to submit answer: ${result.error}`);
            ws.send(JSON.stringify({
                type: MessageType.ERROR,
                data: { message: result.error }
            }));
        }
        // Note: Success confirmation is sent by room.submitAnswer()
    }
});

// Heartbeat
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

// Start server
const PORT = process.env.PORT || 8080;
server.listen(PORT, '0.0.0.0', () => {
  logWithTimestamp(`🚀 WebSocket server ready on port ${PORT}`);
  logWithTimestamp(`📡 Health check available at http://localhost:${PORT}/health`);
});

module.exports = { server, wss, gameRooms };