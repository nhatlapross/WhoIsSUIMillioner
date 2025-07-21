import mongoose, { Document, Schema } from 'mongoose';

export interface IQuestion extends Document {
  questionId: string;
  questionText: string;
  options: string[];
  correctAnswer: number;
  difficulty: 'easy' | 'medium' | 'hard';
  category: string;
  topic?: string;
  language: string;
  source: 'gemini' | 'manual' | 'imported';
  usageCount: number;
  correctRate: number;
  tags: string[];
  isActive: boolean;
  createdBy?: string;
  createdAt: Date;
  updatedAt: Date;
}

const questionSchema = new Schema<IQuestion>({
  questionId: {
    type: String,
    required: true,
    unique: true,
    index: true
  },
  questionText: {
    type: String,
    required: true,
    trim: true
  },
  options: [{
    type: String,
    required: true,
    trim: true
  }],
  correctAnswer: {
    type: Number,
    required: true,
    min: 0,
    max: 3
  },
  difficulty: {
    type: String,
    enum: ['easy', 'medium', 'hard'],
    required: true
  },
  category: {
    type: String,
    required: true,
    trim: true
  },
  topic: {
    type: String,
    trim: true
  },
  language: {
    type: String,
    default: 'vi',
    enum: ['vi', 'en']
  },
  source: {
    type: String,
    enum: ['gemini', 'manual', 'imported'],
    default: 'gemini'
  },
  usageCount: {
    type: Number,
    default: 0
  },
  correctRate: {
    type: Number,
    default: 0,
    min: 0,
    max: 1
  },
  tags: [{
    type: String,
    trim: true
  }],
  isActive: {
    type: Boolean,
    default: true
  },
  createdBy: {
    type: String
  }
}, {
  timestamps: true,
  collection: 'questions'
});

questionSchema.index({ difficulty: 1, category: 1, isActive: 1 });
questionSchema.index({ usageCount: 1 });
questionSchema.index({ correctRate: -1 });
questionSchema.index({ tags: 1 });

export default mongoose.models.Question || mongoose.model<IQuestion>('Question', questionSchema);