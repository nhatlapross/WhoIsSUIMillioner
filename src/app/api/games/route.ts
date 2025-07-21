import { NextRequest, NextResponse } from 'next/server';
import { GameService } from '@/services/database';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const gameType = searchParams.get('type') as 'solo' | 'multiplayer' | null;
    const status = searchParams.get('status');
    const walletAddress = searchParams.get('walletAddress');
    const limit = parseInt(searchParams.get('limit') || '20');
    const skip = parseInt(searchParams.get('skip') || '0');

    if (status === 'active') {
      const games = await GameService.getActiveGames(gameType);
      return NextResponse.json({ games });
    }

    if (status === 'waiting' && gameType === 'multiplayer') {
      const games = await GameService.getWaitingMultiplayerGames();
      return NextResponse.json({ games });
    }

    if (walletAddress) {
      const games = await GameService.getPlayerGameHistory(walletAddress, limit);
      return NextResponse.json({ games });
    }

    const games = await GameService.getGameHistory(undefined, limit, skip);
    return NextResponse.json({ games });
  } catch (error) {
    console.error('Error fetching games:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const game = await GameService.createGame(body);
    return NextResponse.json({ game }, { status: 201 });
  } catch (error) {
    console.error('Error creating game:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}