# SUI Millionaire - Server Restructure Documentation

## 🏗️ Architecture Overview

The server has been completely restructured for improved maintainability with MongoDB integration. The new architecture provides better data persistence, scalability, and separation of concerns.

## 📁 New Directory Structure

```
src/
├── lib/
│   └── mongodb.ts              # Database connection configuration
├── models/
│   ├── User.ts                 # User data model and schema
│   ├── Game.ts                 # Game and GamePlayer models
│   ├── Question.ts             # Question model with categories
│   ├── Leaderboard.ts          # Leaderboard entries model
│   ├── GameSession.ts          # Individual game session tracking
│   └── index.ts                # Model exports
├── services/
│   └── database/
│       ├── userService.ts      # User CRUD and statistics
│       ├── gameService.ts      # Game management operations
│       ├── questionService.ts  # Question bank management
│       ├── leaderboardService.ts # Leaderboard generation
│       ├── gameSessionService.ts # Session tracking
│       └── index.ts            # Service exports
└── app/
    └── api/
        ├── users/              # User management endpoints
        ├── games/              # Game data endpoints
        ├── questions/          # Question bank endpoints
        ├── leaderboard/        # Leaderboard endpoints
        └── stats/              # Statistics endpoints

server/
├── websocket-server.js         # Original WebSocket server
├── enhanced-websocket-server.js # New MongoDB-integrated server
└── README.md                   # Server documentation

scripts/
├── database-services.js        # CommonJS database wrapper
├── seed-database.js            # Database seeding script
└── test-connection.js          # Connection test utility
```

## 🗄️ Database Models

### User Model
- **Purpose**: Store user profiles, statistics, and achievements
- **Key Features**:
  - Wallet address as primary identifier
  - Game statistics and win rates
  - Achievement tracking
  - Activity timestamps

### Game Model
- **Purpose**: Store game instances and player participation
- **Key Features**:
  - Multiplayer and solo game support
  - Player elimination tracking
  - Prize pool management
  - Question storage per game

### Question Model
- **Purpose**: Manage question bank with categorization
- **Key Features**:
  - Multi-language support (Vietnamese/English)
  - Difficulty levels (easy/medium/hard)
  - Category organization
  - Usage statistics and correct rates

### Leaderboard Model
- **Purpose**: Generate periodic leaderboards
- **Key Features**:
  - Time-based periods (daily/weekly/monthly/all-time)
  - Rank tracking and change calculation
  - Statistics aggregation

### GameSession Model
- **Purpose**: Track individual player game sessions
- **Key Features**:
  - Detailed answer recording
  - Performance metrics
  - Session completion tracking

## 🔧 Database Services

### UserService
```typescript
// Key methods
UserService.findByWalletAddress(address)
UserService.createUser(userData)
UserService.updateUserStats(address, gameData)
UserService.getTopUsers(limit)
UserService.addAchievement(address, achievement)
```

### GameService
```typescript
// Key methods
GameService.createGame(gameData)
GameService.addPlayerToGame(gameId, player)
GameService.getActiveGames(type?)
GameService.finishGame(gameId, winner?, txHash?)
```

### QuestionService
```typescript
// Key methods
QuestionService.getRandomQuestions(count, difficulty?, category?)
QuestionService.createMultipleQuestions(questions)
QuestionService.updateQuestionCorrectRate(id, wasCorrect)
```

### LeaderboardService
```typescript
// Key methods
LeaderboardService.updateLeaderboard(period, start, end)
LeaderboardService.getLeaderboard(period, limit, offset)
LeaderboardService.generatePeriodicLeaderboards()
```

## 🚀 Enhanced WebSocket Server

The new enhanced server (`enhanced-websocket-server.js`) includes:

### Key Improvements
1. **Database Integration**: All game data persisted to MongoDB
2. **User Management**: Automatic user creation and statistics tracking
3. **Question Management**: Dynamic question loading from database
4. **Session Tracking**: Detailed answer and performance recording
5. **Statistics Updates**: Real-time user and question statistics
6. **Enhanced Health Checks**: Database status monitoring

### Usage
```bash
# Start enhanced server
npm run websocket:enhanced

# Health check with DB status
curl http://localhost:8080/health
```

## 🌐 REST API Endpoints

### Users API
- `GET /api/users` - List users or search
- `POST /api/users` - Create new user
- `GET /api/users/[walletAddress]` - Get user profile
- `PUT /api/users/[walletAddress]` - Update user

### Games API
- `GET /api/games` - List games with filters
- `POST /api/games` - Create game
- `GET /api/games/[gameId]` - Get game details
- `PUT /api/games/[gameId]` - Update game

### Questions API
- `GET /api/questions` - Get questions with filters
- `POST /api/questions` - Create questions

### Leaderboard API
- `GET /api/leaderboard` - Get leaderboard by period
- `POST /api/leaderboard` - Update leaderboard

### Statistics API
- `GET /api/stats` - Get system statistics

## 📊 Database Configuration

### Environment Variables
```env
# MongoDB Configuration
MONGODB_URI=mongodb+srv://nhatlapross1:<db_password>@eliza.4vzjl.mongodb.net/?retryWrites=true&w=majority&appName=eliza
DB_PASSWORD=your_actual_password
```

### Connection Features
- **Connection Pooling**: Efficient resource management
- **Error Handling**: Graceful failure handling
- **Reconnection Logic**: Automatic reconnection on failure
- **Global Caching**: Single connection instance

## 🛠️ Setup Instructions

### 1. Install Dependencies
```bash
npm install
# Installs: mongodb, mongoose, @types/mongoose
```

### 2. Configure Database
```bash
# Update .env file with your database password
MONGODB_URI=mongodb+srv://nhatlapross1:YOUR_PASSWORD@eliza.4vzjl.mongodb.net/?retryWrites=true&w=majority&appName=eliza
```

### 3. Test Connection
```bash
node scripts/test-connection.js
```

### 4. Seed Database (Optional)
```bash
npm run db:seed
```

### 5. Start Enhanced Server
```bash
npm run websocket:enhanced
```

## 🔄 Migration from Original Server

### Key Differences
1. **Data Persistence**: Games now saved to database
2. **User Tracking**: Comprehensive user statistics
3. **Question Management**: Dynamic question loading
4. **Performance Monitoring**: Detailed analytics
5. **API Integration**: REST endpoints for frontend

### Backwards Compatibility
- Original WebSocket server still available: `npm run websocket`
- Same message protocols and game flow
- Enhanced server provides additional features

## 📈 Performance Improvements

### Database Operations
- **Indexing**: Optimized queries with strategic indexes
- **Aggregation**: Efficient statistics calculation
- **Batch Operations**: Bulk question creation
- **Connection Pooling**: Resource optimization

### Real-time Features
- **In-memory Game State**: Fast game operations
- **Database Sync**: Asynchronous persistence
- **Heartbeat Monitoring**: Connection health tracking
- **Automatic Cleanup**: Abandoned session management

## 🔧 Maintenance Operations

### Periodic Tasks
- **Session Cleanup**: Remove abandoned sessions every 2 hours
- **Leaderboard Updates**: Generate leaderboards hourly
- **Statistics Refresh**: Update question statistics in real-time
- **Database Maintenance**: Index optimization and cleanup

### Monitoring
- **Health Checks**: Database connectivity and statistics
- **Performance Metrics**: Query execution times
- **Error Logging**: Comprehensive error tracking
- **Usage Statistics**: User and game activity monitoring

## 🚦 Production Deployment

### Environment Setup
1. Set production MongoDB URI
2. Configure connection limits
3. Enable SSL/TLS encryption
4. Set up monitoring alerts

### Security Considerations
- Environment variable protection
- Database access controls
- API rate limiting (recommended)
- Input validation and sanitization

### Scaling Options
- Database connection pooling
- Horizontal WebSocket scaling
- Read replicas for analytics
- Caching layer for frequently accessed data

## 🐛 Troubleshooting

### Common Issues
1. **Connection Errors**: Check MONGODB_URI and password
2. **Model Conflicts**: Clear mongoose model cache
3. **Index Errors**: Drop and recreate problematic indexes
4. **Performance Issues**: Review query patterns and indexes

### Debug Commands
```bash
# Test database connection
node scripts/test-connection.js

# Check server health
curl http://localhost:8080/health

# View server logs
npm run websocket:enhanced | grep ERROR
```

## 📝 Future Enhancements

### Planned Features
1. **Redis Caching**: High-performance data caching
2. **Rate Limiting**: API protection and abuse prevention
3. **Real-time Analytics**: Live game and user metrics
4. **Multi-language Support**: Expanded question languages
5. **Advanced Leaderboards**: Skill-based rankings
6. **Tournament Mode**: Organized competition support

### Database Optimizations
1. **Sharding**: Horizontal scaling for large datasets
2. **Read Replicas**: Separate analytics workloads
3. **Data Archiving**: Historical data management
4. **Performance Monitoring**: Query optimization tools

---

## 📞 Support

For issues or questions about the restructured server:
1. Check the troubleshooting section
2. Review the error logs
3. Test database connectivity
4. Verify environment configuration

The enhanced server provides a robust foundation for the SUI Millionaire game with improved maintainability, better data management, and comprehensive analytics capabilities.