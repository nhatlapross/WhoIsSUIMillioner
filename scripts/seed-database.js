// Database seeding script for testing
const { v4: uuidv4 } = require('uuid');

// Import database services
const { UserService, QuestionService, connectDB } = require('./database-services');

async function seedDatabase() {
    console.log('🌱 Starting database seeding...');

    try {
        await connectDB();
        console.log('✅ Connected to MongoDB');

        // Seed sample users
        const sampleUsers = [
            {
                walletAddress: '0x1234567890abcdef1234567890abcdef12345678',
                username: 'TestUser1',
                email: 'test1@example.com',
                totalWinnings: 1500,
                highestScore: 12000,
                statistics: {
                    soloGames: 15,
                    multiplayerGames: 8,
                    questionsAnswered: 230,
                    correctAnswers: 180,
                    winRate: 0.65
                }
            },
            {
                walletAddress: '0xabcdef1234567890abcdef1234567890abcdef12',
                username: 'TestUser2',
                email: 'test2@example.com',
                totalWinnings: 2300,
                highestScore: 15000,
                statistics: {
                    soloGames: 20,
                    multiplayerGames: 12,
                    questionsAnswered: 320,
                    correctAnswers: 280,
                    winRate: 0.75
                }
            }
        ];

        for (const userData of sampleUsers) {
            try {
                const existingUser = await UserService.findByWalletAddress(userData.walletAddress);
                if (!existingUser) {
                    await UserService.createUser(userData);
                    console.log(`👤 Created user: ${userData.username}`);
                } else {
                    console.log(`👤 User already exists: ${userData.username}`);
                }
            } catch (error) {
                console.error(`❌ Error creating user ${userData.username}:`, error.message);
            }
        }

        // Seed sample questions
        const sampleQuestions = [
            {
                questionId: `q_${uuidv4()}`,
                questionText: "Thủ đô của Việt Nam là gì?",
                options: ['Hà Nội', 'Hồ Chí Minh', 'Đà Nẵng', 'Hải Phòng'],
                correctAnswer: 0,
                difficulty: 'easy',
                category: 'Địa lý',
                language: 'vi',
                source: 'manual',
                tags: ['việt nam', 'thủ đô', 'địa lý']
            },
            {
                questionId: `q_${uuidv4()}`,
                questionText: "Sông nào dài nhất Việt Nam?",
                options: ['Sông Hồng', 'Sông Mekong', 'Sông Đồng Nai', 'Sông Hương'],
                correctAnswer: 1,
                difficulty: 'medium',
                category: 'Địa lý',
                language: 'vi',
                source: 'manual',
                tags: ['việt nam', 'sông', 'địa lý']
            },
            {
                questionId: `q_${uuidv4()}`,
                questionText: "Đỉnh núi cao nhất Việt Nam là?",
                options: ['Phan Xi Păng', 'Pu Ta Leng', 'Tà Chì Nhù', 'Pu Si Lung'],
                correctAnswer: 0,
                difficulty: 'medium',
                category: 'Địa lý',
                language: 'vi',
                source: 'manual',
                tags: ['việt nam', 'núi', 'địa lý']
            },
            {
                questionId: `q_${uuidv4()}`,
                questionText: "Tỉnh nào có diện tích lớn nhất Việt Nam?",
                options: ['Nghệ An', 'Gia Lai', 'Lâm Đồng', 'Đắk Lắk'],
                correctAnswer: 0,
                difficulty: 'hard',
                category: 'Địa lý',
                language: 'vi',
                source: 'manual',
                tags: ['việt nam', 'tỉnh', 'diện tích']
            },
            {
                questionId: `q_${uuidv4()}`,
                questionText: "Thành phố nào có biệt danh 'Thành phố Hoa phượng đỏ'?",
                options: ['Hà Nội', 'Huế', 'Hải Phòng', 'Đà Nẵng'],
                correctAnswer: 3,
                difficulty: 'medium',
                category: 'Văn hóa',
                language: 'vi',
                source: 'manual',
                tags: ['việt nam', 'thành phố', 'văn hóa']
            },
            {
                questionId: `q_${uuidv4()}`,
                questionText: "Năm nào Việt Nam giành độc lập?",
                options: ['1945', '1946', '1954', '1975'],
                correctAnswer: 0,
                difficulty: 'easy',
                category: 'Lịch sử',
                language: 'vi',
                source: 'manual',
                tags: ['việt nam', 'lịch sử', 'độc lập']
            },
            {
                questionId: `q_${uuidv4()}`,
                questionText: "Ai là người sáng lập ra chữ Quốc ngữ?",
                options: ['Alexandre de Rhodes', 'Phan Bội Châu', 'Nguyễn Du', 'Hồ Chí Minh'],
                correctAnswer: 0,
                difficulty: 'hard',
                category: 'Lịch sử',
                language: 'vi',
                source: 'manual',
                tags: ['việt nam', 'chữ quốc ngữ', 'lịch sử']
            },
            {
                questionId: `q_${uuidv4()}`,
                questionText: "Tác phẩm 'Truyện Kiều' có bao nhiêu câu?",
                options: ['3254', '3252', '3250', '3256'],
                correctAnswer: 0,
                difficulty: 'hard',
                category: 'Văn học',
                language: 'vi',
                source: 'manual',
                tags: ['việt nam', 'văn học', 'truyện kiều']
            },
            {
                questionId: `q_${uuidv4()}`,
                questionText: "Loại tiền tệ của Việt Nam là gì?",
                options: ['Đồng', 'Xu', 'Hào', 'Kip'],
                correctAnswer: 0,
                difficulty: 'easy',
                category: 'Kinh tế',
                language: 'vi',
                source: 'manual',
                tags: ['việt nam', 'tiền tệ', 'kinh tế']
            },
            {
                questionId: `q_${uuidv4()}`,
                questionText: "Món ăn nào được coi là đặc trưng nhất của Việt Nam?",
                options: ['Phở', 'Bún chả', 'Bánh mì', 'Chả cá'],
                correctAnswer: 0,
                difficulty: 'easy',
                category: 'Ẩm thực',
                language: 'vi',
                source: 'manual',
                tags: ['việt nam', 'ẩm thực', 'phở']
            }
        ];

        console.log(`📝 Seeding ${sampleQuestions.length} questions...`);
        const createdQuestions = await QuestionService.createMultipleQuestions(sampleQuestions);
        console.log(`✅ Created ${createdQuestions.length} questions`);

        // Get and display statistics
        const userCount = await UserService.getUserCount();
        const questionStats = await QuestionService.getQuestionStats();

        console.log('\n📊 Database Statistics:');
        console.log(`👥 Total Users: ${userCount}`);
        console.log(`❓ Total Questions: ${questionStats.total}`);
        console.log(`📈 Questions by Difficulty:`, questionStats.byDifficulty);
        console.log(`📚 Questions by Category:`, questionStats.byCategory);

        console.log('\n🎉 Database seeding completed successfully!');
        
    } catch (error) {
        console.error('❌ Error seeding database:', error);
        process.exit(1);
    }
}

// Run the seeding script
if (require.main === module) {
    seedDatabase().then(() => {
        console.log('✅ Seeding script completed');
        process.exit(0);
    }).catch(error => {
        console.error('❌ Seeding script failed:', error);
        process.exit(1);
    });
}

module.exports = { seedDatabase };