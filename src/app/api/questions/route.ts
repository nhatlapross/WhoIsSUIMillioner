import { NextRequest, NextResponse } from 'next/server';
import { QuestionService } from '@/services/database';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const count = parseInt(searchParams.get('count') || '10');
    const difficulty = searchParams.get('difficulty') as 'easy' | 'medium' | 'hard' | null;
    const category = searchParams.get('category');
    const excludeIds = searchParams.get('excludeIds')?.split(',') || [];
    const search = searchParams.get('search');

    if (search) {
      const filters = {
        difficulty: difficulty || undefined,
        category: category || undefined
      };
      const questions = await QuestionService.searchQuestions(search, filters, count);
      return NextResponse.json({ questions });
    }

    if (difficulty && category) {
      const questions = await QuestionService.getQuestionsByCategory(category, count);
      const filtered = questions.filter(q => q.difficulty === difficulty);
      return NextResponse.json({ questions: filtered.slice(0, count) });
    }

    if (difficulty) {
      const questions = await QuestionService.getQuestionsByDifficulty(difficulty, count);
      return NextResponse.json({ questions });
    }

    if (category) {
      const questions = await QuestionService.getQuestionsByCategory(category, count);
      return NextResponse.json({ questions });
    }

    const questions = await QuestionService.getRandomQuestions(
      count,
      difficulty,
      category,
      excludeIds
    );
    return NextResponse.json({ questions });
  } catch (error) {
    console.error('Error fetching questions:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { questions } = body;

    if (Array.isArray(questions)) {
      const createdQuestions = await QuestionService.createMultipleQuestions(questions);
      return NextResponse.json({ questions: createdQuestions }, { status: 201 });
    } else {
      const question = await QuestionService.createQuestion(body);
      return NextResponse.json({ question }, { status: 201 });
    }
  } catch (error) {
    console.error('Error creating questions:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}