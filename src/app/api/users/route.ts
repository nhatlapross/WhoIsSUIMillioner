import { NextRequest, NextResponse } from 'next/server';
import { UserService } from '@/services/database';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { walletAddress, username, email } = body;
    
    if (!walletAddress) {
      return NextResponse.json({ error: 'Wallet address is required' }, { status: 400 });
    }

    // Check if user already exists
    const existingUser = await UserService.findByWalletAddress(walletAddress);
    if (existingUser) {
      return NextResponse.json({ error: 'User already exists' }, { status: 409 });
    }

    const userData = {
      walletAddress,
      username: username || `User_${walletAddress.slice(-6)}`,
      email,
      lastActive: new Date()
    };

    const user = await UserService.createUser(userData);
    return NextResponse.json({ user }, { status: 201 });
  } catch (error) {
    console.error('Error creating user:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const query = searchParams.get('search');
    const limit = parseInt(searchParams.get('limit') || '10');

    if (query) {
      const users = await UserService.searchUsers(query, limit);
      return NextResponse.json({ users });
    } else {
      const users = await UserService.getTopUsers(limit);
      return NextResponse.json({ users });
    }
  } catch (error) {
    console.error('Error fetching users:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}