import { NextRequest, NextResponse } from 'next/server';
import { GameService } from '@/services/database';

export async function GET(
  request: NextRequest,
  { params }: { params: { gameId: string } }
) {
  try {
    const { gameId } = params;
    
    const game = await GameService.findGameById(gameId);
    
    if (!game) {
      return NextResponse.json({ error: 'Game not found' }, { status: 404 });
    }

    return NextResponse.json({ game });
  } catch (error) {
    console.error('Error fetching game:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { gameId: string } }
) {
  try {
    const { gameId } = params;
    const body = await request.json();
    
    const updatedGame = await GameService.updateGame(gameId, body);
    
    if (!updatedGame) {
      return NextResponse.json({ error: 'Game not found' }, { status: 404 });
    }

    return NextResponse.json({ game: updatedGame });
  } catch (error) {
    console.error('Error updating game:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}