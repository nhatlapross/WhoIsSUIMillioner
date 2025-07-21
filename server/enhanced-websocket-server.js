// Enhanced WebSocket server with MongoDB integration
const WebSocket = require('ws');
const http = require('http');
const { v4: uuidv4 } = require('uuid');

// Import database services - use CommonJS wrapper
const { UserService, GameService, QuestionService, GameSessionService, LeaderboardService, connectDB } = require('../scripts/database-services');

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

// Global storage (in-memory for real-time, persisted in MongoDB)
const gameRooms = new Map();
const playerConnections = new Map();

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

// Enhanced GameRoom class with MongoDB integration
class EnhancedGameRoom {
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
        this.gameSession = null;
        this.dbGameRecord = null;

        logWithTimestamp(`🏠 Created enhanced room ${id} by player ${creator}, entry fee: ${entryFee} SUI`);
        this.initializeGameInDB();
    }

    async initializeGameInDB() {
        try {
            const gameData = {
                gameId: this.id,
                gameType: 'multiplayer',
                status: 'waiting',
                maxPlayers: this.maxPlayers,
                entryFee: this.entryFee,
                prizePool: 0,
                totalQuestions: 15,
                difficulty: 'medium'
            };

            this.dbGameRecord = await GameService.createGame(gameData);
            logWithTimestamp(`💾 Game record created in DB for room ${this.id}`);
        } catch (error) {
            logWithTimestamp(`❌ Failed to create game record in DB:`, error.message);
        }
    }

    async addPlayer(player) {
        logWithTimestamp(`👤 Player ${player.id} (${player.name}) attempting to join enhanced room ${this.id}`);

        if (this.players.length >= this.maxPlayers) {
            return { success: false, error: 'Room is full' };
        }

        if (this.state !== GameState.WAITING) {
            return { success: false, error: 'Game already started' };
        }

        if (this.players.some(p => p.name === player.name)) {
            return { success: false, error: 'Player name already taken' };
        }

        // Create or update user in database
        try {
            let user = await UserService.findByWalletAddress(player.walletAddress || player.id);
            if (!user) {
                user = await UserService.createUser({
                    walletAddress: player.walletAddress || player.id,
                    username: player.name
                });
                logWithTimestamp(`👤 Created new user in DB: ${player.name}`);
            } else {
                await UserService.updateUser(player.walletAddress || player.id, {
                    username: player.name,
                    lastActive: new Date()
                });
                logWithTimestamp(`👤 Updated existing user in DB: ${player.name}`);
            }
        } catch (error) {
            logWithTimestamp(`❌ Failed to handle user in DB:`, error.message);
        }

        this.players.push(player);
        this.prizePool += this.entryFee;
        playerConnections.set(player.id, player.connection);

        // Update game in database
        if (this.dbGameRecord) {
            try {
                const playerData = {
                    walletAddress: player.walletAddress || player.id,
                    username: player.name,
                    score: 0,
                    position: 0,
                    isEliminated: false,
                    correctAnswers: 0,
                    totalAnswers: 0,
                    prizeWon: 0
                };

                await GameService.addPlayerToGame(this.id, playerData);
                await GameService.updateGame(this.id, {
                    prizePool: this.prizePool,
                    totalPlayers: this.players.length
                });
                logWithTimestamp(`💾 Updated game record with new player`);
            } catch (error) {
                logWithTimestamp(`❌ Failed to update game in DB:`, error.message);
            }
        }

        logWithTimestamp(`✅ Player ${player.id} joined enhanced room ${this.id}. Players: ${this.players.length}, Prize pool: ${this.prizePool} SUI`);

        if (this.state === GameState.WAITING) {
            this.broadcastToRoom({
                type: MessageType.ROOM_UPDATE,
                data: this.getRoomInfo()
            });
        }

        return { success: true };
    }

    async removePlayer(playerId) {
        logWithTimestamp(`👋 Player ${playerId} leaving enhanced room ${this.id}`);

        const playerIndex = this.players.findIndex(p => p.id === playerId);
        if (playerIndex === -1) {
            return;
        }

        const player = this.players[playerIndex];
        playerConnections.delete(playerId);
        this.players.splice(playerIndex, 1);
        this.prizePool = Math.max(0, this.prizePool - this.entryFee);

        // Update database
        if (this.dbGameRecord) {
            try {
                await GameService.removePlayerFromGame(this.id, player.walletAddress || player.id);
                await GameService.updateGame(this.id, {
                    prizePool: this.prizePool,
                    totalPlayers: this.players.length
                });
            } catch (error) {
                logWithTimestamp(`❌ Failed to remove player from game in DB:`, error.message);
            }
        }

        if (this.creator === playerId) {
            if (this.players.length > 0) {
                this.creator = this.players[0].id;
                logWithTimestamp(`👑 New creator for enhanced room ${this.id}: ${this.creator}`);
            } else {
                logWithTimestamp(`🗑️ Deleting empty enhanced room ${this.id}`);
                await this.cleanup();
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

    async startGame(customQuestions) {
        logWithTimestamp(`🎮 STARTING ENHANCED GAME in room ${this.id} with ${this.players.length} players`);

        if (this.players.length < 2) {
            return { success: false, error: 'Need at least 2 players' };
        }

        try {
            // Get questions from database or use provided ones
            if (customQuestions && customQuestions.length > 0) {
                this.questions = customQuestions;
            } else {
                // Fetch questions from database
                const dbQuestions = await QuestionService.getRandomQuestions(
                    15, // count
                    'medium', // difficulty
                    null, // any category
                    [] // no exclusions
                );

                if (dbQuestions.length > 0) {
                    this.questions = dbQuestions.map(q => ({
                        question: q.questionText,
                        choices: q.options,
                        correctAnswer: ['a', 'b', 'c', 'd'][q.correctAnswer],
                        questionId: q.questionId
                    }));
                } else {
                    // Fallback to default questions
                    this.questions = this.getDefaultMultiplayerQuestions();
                }
            }

            this.state = GameState.STARTING;
            this.startTime = Date.now();

            // Update database
            if (this.dbGameRecord) {
                await GameService.updateGame(this.id, {
                    status: 'starting',
                    startedAt: new Date(),
                    questions: this.questions.map((q, index) => ({
                        questionId: q.questionId || `q_${index}`,
                        questionText: q.question,
                        options: q.choices,
                        correctAnswer: ['a', 'b', 'c', 'd'].indexOf(q.correctAnswer),
                        difficulty: 'medium',
                        category: 'general'
                    }))
                });
            }

            // Create game sessions for all players
            for (const player of this.players) {
                try {
                    const sessionData = {
                        sessionId: `${this.id}_${player.id}`,
                        gameId: this.id,
                        walletAddress: player.walletAddress || player.id,
                        gameType: 'multiplayer',
                        status: 'active',
                        startedAt: new Date()
                    };
                    await GameSessionService.createSession(sessionData);
                } catch (error) {
                    logWithTimestamp(`❌ Failed to create session for player ${player.name}:`, error.message);
                }
            }

            logWithTimestamp(`⏱️ Enhanced game countdown starting for room ${this.id}`);
            logWithTimestamp(`📝 Loaded ${this.questions.length} questions from database`);

            this.startCountdown();
            return { success: true };
        } catch (error) {
            logWithTimestamp(`❌ Failed to start enhanced game:`, error.message);
            return { success: false, error: 'Failed to start game' };
        }
    }

    startCountdown() {
        let countdown = 3;
        const initialCountdownData = {
            countdown: countdown,
            totalQuestions: this.questions.length,
            prizePool: this.prizePool,
            roomState: this.state
        };

        this.broadcastToRoom({
            type: MessageType.GAME_STARTED,
            data: initialCountdownData
        });

        this.countdownTimer = setInterval(async () => {
            countdown--;
            
            if (countdown > 0) {
                this.broadcastToRoom({
                    type: MessageType.GAME_STARTED,
                    data: {
                        countdown: countdown,
                        totalQuestions: this.questions.length,
                        prizePool: this.prizePool,
                        roomState: this.state
                    }
                });
            } else {
                if (this.countdownTimer) {
                    clearInterval(this.countdownTimer);
                    this.countdownTimer = null;
                }

                if (this.state === GameState.STARTING && gameRooms.has(this.id)) {
                    this.state = GameState.PLAYING;
                    
                    // Update database
                    if (this.dbGameRecord) {
                        try {
                            await GameService.updateGame(this.id, { status: 'playing' });
                        } catch (error) {
                            logWithTimestamp(`❌ Failed to update game status to playing:`, error.message);
                        }
                    }

                    this.broadcastToRoom({
                        type: MessageType.GAME_STARTED,
                        data: {
                            countdown: 0,
                            totalQuestions: this.questions.length,
                            prizePool: this.prizePool,
                            roomState: this.state
                        }
                    });

                    setTimeout(() => {
                        if (this.state === GameState.PLAYING && gameRooms.has(this.id)) {
                            this.nextQuestion();
                        }
                    }, 1500);
                }
            }
        }, 1000);
    }

    async nextQuestion() {
        if (!gameRooms.has(this.id) || this.state !== GameState.PLAYING) {
            return;
        }

        if (this.currentQuestion >= this.questions.length) {
            await this.endGame();
            return;
        }

        const question = this.questions[this.currentQuestion];
        this.questionStartTime = Date.now();

        if (this.questionTimer) {
            clearTimeout(this.questionTimer);
        }

        // Reset player answers
        this.players.forEach(player => {
            if (!player.eliminated) {
                player.currentAnswer = undefined;
                player.answerTime = undefined;
            }
        });

        // Update question usage in database
        if (question.questionId) {
            try {
                await QuestionService.incrementQuestionUsage(question.questionId);
            } catch (error) {
                logWithTimestamp(`❌ Failed to update question usage:`, error.message);
            }
        }

        const questionData = {
            questionNumber: this.currentQuestion + 1,
            question: question.question,
            choices: question.choices,
            correctAnswer: question.correctAnswer,
            timeLimit: 15,
            alivePlayers: this.getAlivePlayers().length,
            totalQuestions: this.questions.length
        };

        this.broadcastToRoom({
            type: MessageType.NEXT_QUESTION,
            data: questionData
        });

        this.questionTimer = setTimeout(async () => {
            if (gameRooms.has(this.id) && this.state === GameState.PLAYING) {
                await this.processAnswers();
            }
        }, 15000);
    }

    async submitAnswer(playerId, answer) {
        const player = this.players.find(p => p.id === playerId);
        if (!player || player.eliminated || this.state !== GameState.PLAYING) {
            return { success: false, error: 'Cannot submit answer' };
        }

        if (player.currentAnswer !== undefined) {
            return { success: false, error: 'Answer already submitted' };
        }

        player.currentAnswer = answer.toLowerCase();
        player.answerTime = Date.now() - (this.questionStartTime || Date.now());

        // Record answer in database session
        try {
            const sessionId = `${this.id}_${player.id}`;
            const question = this.questions[this.currentQuestion];
            const correctAnswerIndex = ['a', 'b', 'c', 'd'].indexOf(question.correctAnswer);
            const selectedAnswerIndex = ['a', 'b', 'c', 'd'].indexOf(answer.toLowerCase());
            const isCorrect = selectedAnswerIndex === correctAnswerIndex;

            await GameSessionService.recordAnswer(sessionId, {
                questionId: question.questionId || `q_${this.currentQuestion}`,
                selectedAnswer: selectedAnswerIndex,
                correctAnswer: correctAnswerIndex,
                isCorrect,
                timeToAnswer: player.answerTime
            });
        } catch (error) {
            logWithTimestamp(`❌ Failed to record answer in database:`, error.message);
        }

        // Send confirmation
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
            }
        } catch (error) {
            logWithTimestamp(`❌ Failed to send confirmation:`, error.message);
        }

        // Check if all players answered
        const alivePlayers = this.getAlivePlayers();
        const answeredPlayers = alivePlayers.filter(p => p.currentAnswer !== undefined);

        if (answeredPlayers.length === alivePlayers.length) {
            if (this.questionTimer) {
                clearTimeout(this.questionTimer);
                this.questionTimer = null;
            }
            setTimeout(async () => {
                if (gameRooms.has(this.id) && this.state === GameState.PLAYING) {
                    await this.processAnswers();
                }
            }, 500);
        }

        return { success: true };
    }

    async processAnswers() {
        if (!gameRooms.has(this.id) || this.state !== GameState.PLAYING) {
            return;
        }

        const question = this.questions[this.currentQuestion];
        const correctAnswer = question.correctAnswer.toLowerCase();
        const eliminatedThisRound = [];

        // Process each player's answer
        for (const player of this.players) {
            if (player.eliminated) continue;

            const playerAnswer = player.currentAnswer ? player.currentAnswer.toLowerCase() : null;
            const isCorrect = playerAnswer === correctAnswer;

            // Update question statistics in database
            if (question.questionId) {
                try {
                    await QuestionService.updateQuestionCorrectRate(question.questionId, isCorrect);
                } catch (error) {
                    logWithTimestamp(`❌ Failed to update question stats:`, error.message);
                }
            }

            if (!isCorrect) {
                player.eliminated = true;
                player.eliminationRound = this.currentQuestion + 1;
                eliminatedThisRound.push({
                    id: player.id,
                    name: player.name,
                    answer: playerAnswer || 'NO ANSWER'
                });

                // Update player in game database
                try {
                    await GameService.updatePlayerInGame(this.id, player.walletAddress || player.id, {
                        isEliminated: true,
                        eliminatedAt: new Date(),
                        position: this.players.length - this.getAlivePlayers().length + eliminatedThisRound.length
                    });
                } catch (error) {
                    logWithTimestamp(`❌ Failed to update eliminated player:`, error.message);
                }
            }

            player.currentAnswer = undefined;
            player.answerTime = undefined;
        }

        // Broadcast results
        this.broadcastToRoom({
            type: MessageType.PLAYER_ELIMINATED,
            data: {
                correctAnswer,
                eliminated: eliminatedThisRound,
                remaining: this.getAlivePlayers().length
            }
        });

        this.currentQuestion++;

        // Check end conditions
        const alivePlayers = this.getAlivePlayers();
        if (alivePlayers.length <= 1 || this.currentQuestion >= this.questions.length) {
            setTimeout(async () => await this.endGame(), 2000);
        } else {
            setTimeout(async () => {
                if (gameRooms.has(this.id) && this.state === GameState.PLAYING) {
                    await this.nextQuestion();
                }
            }, 3000);
        }
    }

    async endGame() {
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

        try {
            // Update game in database
            if (this.dbGameRecord) {
                const winnerData = winner ? {
                    walletAddress: winner.walletAddress || winner.id,
                    username: winner.name,
                    prize: prizeDistribution.winnerPrize
                } : null;

                await GameService.finishGame(this.id, winnerData);

                // Update winner in players collection
                if (winner) {
                    await GameService.updatePlayerInGame(this.id, winner.walletAddress || winner.id, {
                        position: 1,
                        prizeWon: prizeDistribution.winnerPrize
                    });
                }
            }

            // Complete game sessions and update user stats
            for (const player of this.players) {
                try {
                    const sessionId = `${this.id}_${player.id}`;
                    const finalScore = player.eliminated ? 0 : 1000;
                    const prizeWon = (winner && winner.id === player.id) ? prizeDistribution.winnerPrize : 0;

                    await GameSessionService.completeSession(sessionId, finalScore, prizeWon);

                    // Update user statistics
                    const gameData = {
                        gameType: 'multiplayer',
                        score: finalScore,
                        winnings: prizeWon,
                        questionsAnswered: this.currentQuestion,
                        correctAnswers: this.currentQuestion - (player.eliminationRound ? player.eliminationRound - 1 : 0),
                        won: winner && winner.id === player.id
                    };

                    await UserService.updateUserStats(player.walletAddress || player.id, gameData);
                } catch (error) {
                    logWithTimestamp(`❌ Failed to complete session for player ${player.name}:`, error.message);
                }
            }

            logWithTimestamp(`💾 Enhanced game completed and saved to database`);
        } catch (error) {
            logWithTimestamp(`❌ Failed to save game results to database:`, error.message);
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

        this.broadcastToRoom({
            type: MessageType.GAME_OVER,
            data: gameOverData
        });

        await this.cleanup();

        // Auto-delete room after 30 seconds
        setTimeout(() => {
            if (gameRooms.has(this.id)) {
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

    async cleanup() {
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
                playerConnections.delete(player.id);
            }
        });
    }

    getDefaultMultiplayerQuestions() {
        return [
            {
                question: "Thủ đô của Việt Nam là gì?",
                choices: ['Hà Nội', 'Hồ Chí Minh', 'Đà Nẵng', 'Hải Phòng'],
                correctAnswer: 'a',
                questionId: 'default_1'
            },
            {
                question: "Sông nào dài nhất Việt Nam?",
                choices: ['Sông Hồng', 'Sông Mekong', 'Sông Đồng Nai', 'Sông Hương'],
                correctAnswer: 'b',
                questionId: 'default_2'
            },
            {
                question: "Đỉnh núi cao nhất Việt Nam là?",
                choices: ['Phan Xi Păng', 'Pu Ta Leng', 'Tà Chì Nhù', 'Pu Si Lung'],
                correctAnswer: 'a',
                questionId: 'default_3'
            },
            {
                question: "Tỉnh nào có diện tích lớn nhất Việt Nam?",
                choices: ['Nghệ An', 'Gia Lai', 'Lâm Đồng', 'Đắk Lắk'],
                correctAnswer: 'a',
                questionId: 'default_4'
            },
            {
                question: "Thành phố nào có biệt danh 'Thành phố Hoa phượng đỏ'?",
                choices: ['Hà Nội', 'Huế', 'Hải Phòng', 'Đà Nẵng'],
                correctAnswer: 'd',
                questionId: 'default_5'
            }
        ];
    }
}

// Initialize database connection
connectDB().then(() => {
    logWithTimestamp('🔗 Connected to MongoDB successfully');
}).catch(err => {
    logWithTimestamp('❌ Failed to connect to MongoDB:', err.message);
});

// Create HTTP server with enhanced health check
const server = http.createServer(async (req, res) => {
    if (req.url === '/health' && req.method === 'GET') {
        try {
            // Enhanced health check with database status
            const gameStats = await GameService.getGameStats();
            const userCount = await UserService.getUserCount();
            
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({
                status: 'healthy',
                timestamp: new Date().toISOString(),
                activeRooms: gameRooms.size,
                activeConnections: wss ? wss.clients.size : 0,
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

// WebSocket connection handling (similar to original but uses EnhancedGameRoom)
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

    // Message handling with async support
    ws.on('message', async (message) => {
        try {
            const data = JSON.parse(message.toString());
            
            switch (data.type) {
                case MessageType.CREATE_ROOM:
                    await handleCreateRoom(data.data);
                    break;
                case MessageType.JOIN_ROOM:
                    await handleJoinRoom(data.data);
                    break;
                case MessageType.LEAVE_ROOM:
                    await handleLeaveRoom();
                    break;
                case MessageType.START_GAME:
                    await handleStartGame(data.data);
                    break;
                case MessageType.PLAYER_ANSWER:
                    await handlePlayerAnswer(data.data);
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
        }
        await handleLeaveRoom();
    });

    // Enhanced message handlers with database integration
    async function handleCreateRoom(data) {
        try {
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

            logWithTimestamp(`✅ Enhanced room created: ${roomId} by ${data.playerName}`);
        } catch (error) {
            logWithTimestamp(`❌ Failed to create room:`, error.message);
            ws.send(JSON.stringify({
                type: MessageType.ERROR,
                data: { message: 'Failed to create room' }
            }));
        }
    }

    async function handleJoinRoom(data) {
        try {
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
                eliminated: false,
                walletAddress: data.walletAddress || playerId
            };

            const result = await room.addPlayer(player);
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
        } catch (error) {
            logWithTimestamp(`❌ Failed to join room:`, error.message);
            ws.send(JSON.stringify({
                type: MessageType.ERROR,
                data: { message: 'Failed to join room' }
            }));
        }
    }

    async function handleLeaveRoom() {
        if (!currentRoomId || !playerId) return;

        try {
            const room = gameRooms.get(currentRoomId);
            if (room) {
                await room.removePlayer(playerId);
            }
        } catch (error) {
            logWithTimestamp(`❌ Error leaving room:`, error.message);
        } finally {
            currentRoomId = null;
            playerId = null;
        }
    }

    async function handleStartGame(data) {
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
    }

    async function handlePlayerAnswer(data) {
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
});

// Heartbeat mechanism
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

// Periodic database maintenance
setInterval(async () => {
    try {
        // Clean up abandoned sessions
        const cleanedSessions = await GameSessionService.cleanupAbandonedSessions(2);
        if (cleanedSessions > 0) {
            logWithTimestamp(`🧹 Cleaned up ${cleanedSessions} abandoned game sessions`);
        }

        // Update leaderboards periodically (every hour)
        const now = new Date();
        if (now.getMinutes() === 0) {
            await LeaderboardService.generatePeriodicLeaderboards();
            logWithTimestamp(`📊 Updated periodic leaderboards`);
        }
    } catch (error) {
        logWithTimestamp(`❌ Database maintenance error:`, error.message);
    }
}, 60000); // Run every minute

// Start enhanced server
const PORT = process.env.PORT || 8080;
server.listen(PORT, '0.0.0.0', () => {
    logWithTimestamp(`🚀 Enhanced WebSocket server with MongoDB ready on port ${PORT}`);
    logWithTimestamp(`📡 Health check available at http://localhost:${PORT}/health`);
    logWithTimestamp(`💾 Database integration enabled`);
});

module.exports = { server, wss, gameRooms, EnhancedGameRoom };