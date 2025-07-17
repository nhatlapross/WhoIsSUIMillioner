// services/geminiQuestionGenerator.ts
import { QuizQuestion } from '@/types/game';
import { useState } from 'react';

interface GeminiResponse {
  candidates: Array<{
    content: {
      parts: Array<{
        text: string;
      }>;
    };
  }>;
}

interface GeneratedQuestion {
  question: string;
  choices: string[];
  correctAnswer: string;
  difficulty: 'easy' | 'medium' | 'hard';
  category: string;
}

export class GeminiQuestionGenerator {
  private apiKey: string;
  private apiUrl = 'https://generativelanguage.googleapis.com/v1/models/gemini-2.0-flash:generateContent';
  private listModelsUrl = 'https://generativelanguage.googleapis.com/v1/models';

  constructor(apiKey: string) {
    this.apiKey = apiKey;
  }

  /**
   * List available models for debugging
   */
  async listAvailableModels(): Promise<any> {
    try {
      console.log('🔍 Listing available models...');
      const response = await fetch(`${this.listModelsUrl}?key=${this.apiKey}`);
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error('❌ List Models Error:', errorText);
        throw new Error(`Failed to list models: ${response.status}`);
      }

      const data = await response.json();
      console.log('✅ Available Models:', data);
      return data;
    } catch (error) {
      console.error('❌ Error listing models:', error);
      throw error;
    }
  }
  async generateQuestions(
    count: number = 5,
    categories: string[] = ['geography', 'history', 'culture', 'science', 'general'],
    difficulty: 'easy' | 'medium' | 'hard' = 'medium'
  ): Promise<QuizQuestion[]> {
    try {
      const questions: QuizQuestion[] = [];
      
      for (let i = 0; i < count; i++) {
        const category = categories[i % categories.length];
        const question = await this.generateSingleQuestion(category, difficulty);
        if (question) {
          questions.push(this.convertToQuizQuestion(question));
        }
      }

      return questions;
    } catch (error) {
      console.error('Error generating questions:', error);
      return this.getFallbackQuestions();
    }
  }

  /**
   * Generate a single question for specific category
   */
  private async generateSingleQuestion(
    category: string,
    difficulty: 'easy' | 'medium' | 'hard'
  ): Promise<GeneratedQuestion | null> {
    const prompt = this.createPrompt(category, difficulty);
    
    try {
      console.log('🚀 Sending request to Gemini API...');
      console.log('📄 API URL:', this.apiUrl);
      console.log('🔑 API Key (first 10 chars):', this.apiKey.substring(0, 10) + '...');
      
      const requestBody = {
        contents: [{
          parts: [{
            text: prompt
          }]
        }],
        generationConfig: {
          temperature: 0.7,
          topK: 40,
          topP: 0.95,
          maxOutputTokens: 1024,
        },
        safetySettings: [
          {
            category: "HARM_CATEGORY_HARASSMENT",
            threshold: "BLOCK_MEDIUM_AND_ABOVE"
          },
          {
            category: "HARM_CATEGORY_HATE_SPEECH", 
            threshold: "BLOCK_MEDIUM_AND_ABOVE"
          },
          {
            category: "HARM_CATEGORY_SEXUALLY_EXPLICIT",
            threshold: "BLOCK_MEDIUM_AND_ABOVE"
          },
          {
            category: "HARM_CATEGORY_DANGEROUS_CONTENT",
            threshold: "BLOCK_MEDIUM_AND_ABOVE"
          }
        ]
      };
      
      console.log('📦 Request body:', JSON.stringify(requestBody, null, 2));
      
      const response = await fetch(`${this.apiUrl}?key=${this.apiKey}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody)
      });

      console.log('📡 Response status:', response.status);
      console.log('📡 Response headers:', Object.fromEntries(response.headers.entries()));

      if (!response.ok) {
        const errorText = await response.text();
        console.error('❌ API Error Response:', errorText);
        
        // Try to parse error JSON for better debugging
        try {
          const errorJson = JSON.parse(errorText);
          console.error('❌ Parsed error:', errorJson);
        } catch (e) {
          console.error('❌ Could not parse error as JSON');
        }
        
        throw new Error(`HTTP error! status: ${response.status} - ${errorText}`);
      }

      const data: GeminiResponse = await response.json();
      console.log('✅ API Response:', JSON.stringify(data, null, 2));
      
      if (!data.candidates || data.candidates.length === 0) {
        console.error('❌ No candidates in response');
        throw new Error('No candidates returned from API');
      }
      
      const generatedText = data.candidates[0]?.content?.parts[0]?.text;
      console.log('📝 Generated text:', generatedText);
      
      if (generatedText) {
        const parsedQuestion = this.parseGeneratedQuestion(generatedText, category, difficulty);
        console.log('🎯 Parsed question:', parsedQuestion);
        return parsedQuestion;
      }
      
      console.warn('⚠️ No generated text found');
      return null;
    } catch (error) {
      console.error('❌ Error calling Gemini API:', error);
      return null;
    }
  }

  /**
   * Create prompt for Gemini AI
   */
  private createPrompt(category: string, difficulty: string): string {
    const categoryPrompts = {
      geography: 'về địa lý Việt Nam (thành phố, tỉnh, núi, sông, biển)',
      history: 'về lịch sử Việt Nam (các triều đại, nhân vật lịch sử, sự kiện quan trọng)',
      culture: 'về văn hóa Việt Nam (lễ hội, ẩm thực, trang phục, nghệ thuật)',
      science: 'về khoa học tổng quát (vật lý, hóa học, sinh học, toán học)',
      general: 'về kiến thức tổng quát phù hợp với người Việt Nam'
    };

    const difficultyLevel = {
      easy: 'dễ (phù hợp học sinh tiểu học)',
      medium: 'trung bình (phù hợp học sinh trung học)',
      hard: 'khó (phù hợp sinh viên đại học)'
    };

    return `
Tạo 1 câu hỏi trắc nghiệm ${categoryPrompts[category as keyof typeof categoryPrompts] || categoryPrompts.general} 
với độ khó ${difficultyLevel[difficulty as keyof typeof difficultyLevel]}.

Yêu cầu format chính xác:
QUESTION: [Câu hỏi bằng tiếng Việt, rõ ràng và chính xác]
A: [Đáp án A]
B: [Đáp án B] 
C: [Đáp án C]
D: [Đáp án D]
CORRECT: [A/B/C/D]

Lưu ý:
- Câu hỏi phải chính xác về mặt thông tin
- 4 đáp án phải hợp lý và không quá dễ đoán
- Chỉ có 1 đáp án đúng duy nhất
- Sử dụng tiếng Việt chuẩn, không viết tắt
- Không sử dụng ký tự đặc biệt phức tạp
`;
  }

  /**
   * Parse generated text from Gemini
   */
  private parseGeneratedQuestion(
    text: string, 
    category: string, 
    difficulty: 'easy' | 'medium' | 'hard'
  ): GeneratedQuestion | null {
    try {
      const lines = text.trim().split('\n').map(line => line.trim()).filter(line => line);
      
      let question = '';
      const choices: string[] = [];
      let correctAnswer = '';

      for (const line of lines) {
        if (line.startsWith('QUESTION:')) {
          question = line.replace('QUESTION:', '').trim();
        } else if (line.startsWith('A:')) {
          choices[0] = line.replace('A:', '').trim();
        } else if (line.startsWith('B:')) {
          choices[1] = line.replace('B:', '').trim();
        } else if (line.startsWith('C:')) {
          choices[2] = line.replace('C:', '').trim();
        } else if (line.startsWith('D:')) {
          choices[3] = line.replace('D:', '').trim();
        } else if (line.startsWith('CORRECT:')) {
          const answer = line.replace('CORRECT:', '').trim().toUpperCase();
          correctAnswer = answer === 'A' ? 'a' : answer === 'B' ? 'b' : answer === 'C' ? 'c' : 'd';
        }
      }

      // Validate parsed data
      if (question && choices.length === 4 && choices.every(c => c) && correctAnswer) {
        return {
          question,
          choices,
          correctAnswer,
          difficulty,
          category
        };
      }

      return null;
    } catch (error) {
      console.error('Error parsing generated question:', error);
      return null;
    }
  }

  /**
   * Convert GeneratedQuestion to QuizQuestion format
   */
  private convertToQuizQuestion(generated: GeneratedQuestion): QuizQuestion {
    return {
      question: generated.question,
      choices: generated.choices,
      correctAnswer: generated.correctAnswer
    };
  }

  /**
   * Get fallback questions if API fails
   */
  private getFallbackQuestions(): QuizQuestion[] {
    return [
      {
        question: "Thủ đô của Việt Nam là gì?",
        choices: ['Hà Nội', 'Hồ Chí Minh', 'Đà Nẵng', 'Hải Phòng'],
        correctAnswer: 'a'
      },
      {
        question: "Sông nào dài nhất Việt Nam?",
        choices: ['Sông Hồng', 'Sông Mekong', 'Sông Đồng Nai', 'Sông Hương'],
        correctAnswer: 'b'
      },
      {
        question: "Ai là vị hoàng đế đầu tiên của Việt Nam?",
        choices: ['Lý Thái Tổ', 'Trần Thái Tông', 'Đinh Tiên Hoàng', 'Ngô Quyền'],
        correctAnswer: 'c'
      },
      {
        question: "Món ăn nào được coi là đặc sản của Việt Nam?",
        choices: ['Phở', 'Sushi', 'Hamburger', 'Pizza'],
        correctAnswer: 'a'
      },
      {
        question: "Đỉnh núi cao nhất Việt Nam là?",
        choices: ['Phan Xi Păng', 'Pu Ta Leng', 'Tà Chì Nhù', 'Pu Si Lung'],
        correctAnswer: 'a'
      }
    ];
  }

  /**
   * Generate questions by specific topics
   */
  async generateQuestionsByTopic(
    topic: string,
    count: number = 5,
    difficulty: 'easy' | 'medium' | 'hard' = 'medium'
  ): Promise<QuizQuestion[]> {
    const customPrompt = `
Tạo ${count} câu hỏi trắc nghiệm về chủ đề "${topic}" với độ khó ${difficulty}.

Format cho mỗi câu hỏi:
QUESTION: [Câu hỏi]
A: [Đáp án A]
B: [Đáp án B]
C: [Đáp án C] 
D: [Đáp án D]
CORRECT: [A/B/C/D]

---

Lặp lại format trên cho ${count} câu hỏi khác nhau.
`;

    try {
      const response = await fetch(`${this.apiUrl}?key=${this.apiKey}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          contents: [{
            parts: [{
              text: customPrompt
            }]
          }],
          generationConfig: {
            temperature: 0.8,
            topK: 40,
            topP: 0.95,
            maxOutputTokens: 2048,
          },
          safetySettings: [
            {
              category: "HARM_CATEGORY_HARASSMENT",
              threshold: "BLOCK_MEDIUM_AND_ABOVE"
            },
            {
              category: "HARM_CATEGORY_HATE_SPEECH", 
              threshold: "BLOCK_MEDIUM_AND_ABOVE"
            },
            {
              category: "HARM_CATEGORY_SEXUALLY_EXPLICIT",
              threshold: "BLOCK_MEDIUM_AND_ABOVE"
            },
            {
              category: "HARM_CATEGORY_DANGEROUS_CONTENT",
              threshold: "BLOCK_MEDIUM_AND_ABOVE"
            }
          ]
        })
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('API Error Response:', errorText);
        throw new Error(`HTTP error! status: ${response.status} - ${errorText}`);
      }

      const data: GeminiResponse = await response.json();
      
      if (!data.candidates || data.candidates.length === 0) {
        throw new Error('No candidates returned from API');
      }
      
      const generatedText = data.candidates[0]?.content?.parts[0]?.text;
      
      if (generatedText) {
        return this.parseMultipleQuestions(generatedText);
      }
      
      return this.getFallbackQuestions();
    } catch (error) {
      console.error('Error generating questions by topic:', error);
      return this.getFallbackQuestions();
    }
  }

  /**
   * Parse multiple questions from generated text
   */
  private parseMultipleQuestions(text: string): QuizQuestion[] {
    const questions: QuizQuestion[] = [];
    const sections = text.split('---').filter(section => section.trim());
    
    for (const section of sections) {
      const parsed = this.parseGeneratedQuestion(section, 'custom', 'medium');
      if (parsed) {
        questions.push(this.convertToQuizQuestion(parsed));
      }
    }
    
    return questions.length > 0 ? questions : this.getFallbackQuestions();
  }

  /**
   * Test API connection
   */
  async testConnection(): Promise<boolean> {
    try {
      console.log('🧪 Testing API connection...');
      
      // First try to list models
      const models = await this.listAvailableModels();
      
      // Then try a simple generation test
      const testQuestion = await this.generateSingleQuestion('general', 'easy');
      const result = testQuestion !== null;
      
      console.log(`🧪 Connection test result: ${result ? '✅ Success' : '❌ Failed'}`);
      return result;
    } catch (error) {
      console.error('❌ Gemini API connection test failed:', error);
      return false;
    }
  }
}

// Export singleton instance
let geminiGenerator: GeminiQuestionGenerator | null = null;

export const initializeGeminiGenerator = (apiKey: string): GeminiQuestionGenerator => {
  geminiGenerator = new GeminiQuestionGenerator(apiKey);
  return geminiGenerator;
};

export const getGeminiGenerator = (): GeminiQuestionGenerator | null => {
  return geminiGenerator;
};

// Hook for React components
export const useGeminiQuestions = () => {
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const generateQuestions = async (
    count: number = 5,
    categories?: string[],
    difficulty?: 'easy' | 'medium' | 'hard'
  ): Promise<QuizQuestion[]> => {
    if (!geminiGenerator) {
      throw new Error('Gemini generator not initialized');
    }

    setIsGenerating(true);
    setError(null);

    try {
      const questions = await geminiGenerator.generateQuestions(count, categories, difficulty);
      return questions;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred';
      setError(errorMessage);
      throw err;
    } finally {
      setIsGenerating(false);
    }
  };

  const generateByTopic = async (
    topic: string,
    count: number = 5,
    difficulty?: 'easy' | 'medium' | 'hard'
  ): Promise<QuizQuestion[]> => {
    if (!geminiGenerator) {
      throw new Error('Gemini generator not initialized');
    }

    setIsGenerating(true);
    setError(null);

    try {
      const questions = await geminiGenerator.generateQuestionsByTopic(topic, count, difficulty);
      return questions;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred';
      setError(errorMessage);
      throw err;
    } finally {
      setIsGenerating(false);
    }
  };

  return {
    generateQuestions,
    generateByTopic,
    isGenerating,
    error
  };
};