import { NextRequest, NextResponse } from 'next/server';
import { GameService, UserService, QuestionService } from '@/services/database';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type');

    switch (type) {
      case 'games':
        const gameStats = await GameService.getGameStats();
        return NextResponse.json({ stats: gameStats });

      case 'questions':
        const questionStats = await QuestionService.getQuestionStats();
        return NextResponse.json({ stats: questionStats });

      case 'overview':
      default:
        const [gameStats2, userCount, questionStats2] = await Promise.all([
          GameService.getGameStats(),
          UserService.getUserCount(),
          QuestionService.getQuestionStats()
        ]);

        const overviewStats = {
          users: {
            total: userCount
          },
          games: gameStats2,
          questions: questionStats2,
          timestamp: new Date().toISOString()
        };

        return NextResponse.json({ stats: overviewStats });
    }
  } catch (error) {
    console.error('Error fetching stats:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}