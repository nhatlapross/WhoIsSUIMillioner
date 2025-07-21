import { NextRequest, NextResponse } from 'next/server';
import { LeaderboardService } from '@/services/database';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const period = searchParams.get('period') as 'daily' | 'weekly' | 'monthly' | 'allTime' || 'allTime';
    const limit = parseInt(searchParams.get('limit') || '100');
    const offset = parseInt(searchParams.get('offset') || '0');
    const walletAddress = searchParams.get('walletAddress');

    if (walletAddress) {
      const userRank = await LeaderboardService.getUserRank(walletAddress, period);
      return NextResponse.json({ userRank });
    }

    const leaderboard = await LeaderboardService.getLeaderboard(period, limit, offset);
    const stats = await LeaderboardService.getLeaderboardStats(period);
    
    return NextResponse.json({
      leaderboard,
      stats,
      period,
      pagination: {
        limit,
        offset,
        total: stats.totalPlayers
      }
    });
  } catch (error) {
    console.error('Error fetching leaderboard:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { period, periodStart, periodEnd } = body;

    if (!period || !periodStart || !periodEnd) {
      return NextResponse.json({ 
        error: 'Period, periodStart, and periodEnd are required' 
      }, { status: 400 });
    }

    const leaderboard = await LeaderboardService.updateLeaderboard(
      period,
      new Date(periodStart),
      new Date(periodEnd)
    );

    return NextResponse.json({ leaderboard }, { status: 201 });
  } catch (error) {
    console.error('Error updating leaderboard:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}