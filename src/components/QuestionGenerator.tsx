// components/QuestionGenerator.tsx
'use client';
import React, { useState, useEffect } from 'react';
import { Sparkles, RefreshCw, Settings, Save, AlertCircle, CheckCircle, Brain, Zap, ExternalLink, Bug } from 'lucide-react';
import { QuizQuestion } from '@/types/game';
import { initializeGeminiGenerator, useGeminiQuestions } from '@/services/geminiQuestionGenerator';
import DebugGemini from '@/components/debug/DebugGemini';

interface QuestionGeneratorProps {
  onQuestionsGenerated: (questions: QuizQuestion[]) => void;
  onClose: () => void;
}

const QuestionGenerator: React.FC<QuestionGeneratorProps> = ({
  onQuestionsGenerated,
  onClose
}) => {
  const [apiKey, setApiKey] = useState('');
  const [isApiKeySet, setIsApiKeySet] = useState(false);
  const [questionCount, setQuestionCount] = useState(5);
  const [difficulty, setDifficulty] = useState<'easy' | 'medium' | 'hard'>('medium');
  const [selectedCategories, setSelectedCategories] = useState<string[]>(['geography', 'history', 'culture']);
  const [customTopic, setCustomTopic] = useState('');
  const [useCustomTopic, setUseCustomTopic] = useState(false);
  const [generatedQuestions, setGeneratedQuestions] = useState<QuizQuestion[]>([]);
  const [showPreview, setShowPreview] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<'idle' | 'testing' | 'success' | 'failed'>('idle');
  const [showDebug, setShowDebug] = useState(false);

  const { generateQuestions, generateByTopic, isGenerating, error } = useGeminiQuestions();

  const categories = [
    { id: 'geography', name: 'Địa lý', icon: '🌍' },
    { id: 'history', name: 'Lịch sử', icon: '📚' },
    { id: 'culture', name: 'Văn hóa', icon: '🎭' },
    { id: 'science', name: 'Khoa học', icon: '🔬' },
    { id: 'general', name: 'Tổng quát', icon: '🧠' },
    { id: 'sports', name: 'Thể thao', icon: '⚽' },
    { id: 'food', name: 'Ẩm thực', icon: '🍜' },
    { id: 'technology', name: 'Công nghệ', icon: '💻' }
  ];

  // Load API key from environment variables or localStorage
  useEffect(() => {
    const envApiKey = process.env.NEXT_PUBLIC_GEMINI_API_KEY;
    const savedApiKey = localStorage.getItem('gemini_api_key');
    
    if (envApiKey) {
      setApiKey(envApiKey);
      setIsApiKeySet(true);
      initializeGeminiGenerator(envApiKey);
    } else if (savedApiKey) {
      setApiKey(savedApiKey);
      setIsApiKeySet(true);
      initializeGeminiGenerator(savedApiKey);
    }
  }, []);

  const testApiConnection = async (key: string) => {
    setConnectionStatus('testing');
    try {
      const generator = initializeGeminiGenerator(key);
      const isConnected = await generator.testConnection();
      setConnectionStatus(isConnected ? 'success' : 'failed');
      return isConnected;
    } catch (error) {
      console.error('Connection test failed:', error);
      setConnectionStatus('failed');
      return false;
    }
  };

  const handleSetApiKey = async () => {
    if (apiKey.trim()) {
      const isValid = await testApiConnection(apiKey.trim());
      if (isValid) {
        localStorage.setItem('gemini_api_key', apiKey.trim());
        setIsApiKeySet(true);
      }
    }
  };

  const handleGenerateQuestions = async () => {
    try {
      let questions: QuizQuestion[];
      
      if (useCustomTopic && customTopic.trim()) {
        questions = await generateByTopic(customTopic.trim(), questionCount, difficulty);
      } else {
        questions = await generateQuestions(questionCount, selectedCategories, difficulty);
      }
      
      // Direct to game instead of showing preview
      onQuestionsGenerated(questions);
      onClose();
    } catch (err) {
      console.error('Failed to generate questions:', err);
    }
  };

  const handleSaveQuestions = () => {
    onQuestionsGenerated(generatedQuestions);
    onClose();
  };

  const toggleCategory = (categoryId: string) => {
    setSelectedCategories(prev => 
      prev.includes(categoryId) 
        ? prev.filter(id => id !== categoryId)
        : [...prev, categoryId]
    );
  };

  if (!isApiKeySet) {
    return (
      <div className="fixed inset-0 bg-black/90 backdrop-blur-md flex items-center justify-center z-50 p-4">
        <div className="bg-gradient-to-br from-purple-900/90 to-blue-900/90 rounded-3xl p-8 max-w-md w-full border border-purple-500/30">
          <div className="text-center mb-6">
            <div className="w-16 h-16 bg-gradient-to-r from-purple-500 to-blue-500 rounded-full flex items-center justify-center mx-auto mb-4">
              <Brain className="w-8 h-8 text-white" />
            </div>
            <h2 className="text-2xl font-bold text-white mb-2">Gemini AI Generator</h2>
            <p className="text-gray-300">Nhập API key để tạo câu hỏi tự động</p>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Gemini API Key
              </label>
              <input
                type="password"
                value={apiKey}
                onChange={(e) => {
                  setApiKey(e.target.value);
                  setConnectionStatus('idle');
                }}
                placeholder="AIza..."
                className="w-full px-4 py-3 bg-black/40 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:border-purple-500 focus:outline-none"
              />
              
              {/* Connection Status */}
              {connectionStatus !== 'idle' && (
                <div className="mt-2 flex items-center gap-2 text-sm">
                  {connectionStatus === 'testing' && (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-2 border-blue-500 border-t-transparent"></div>
                      <span className="text-blue-300">Testing connection...</span>
                    </>
                  )}
                  {connectionStatus === 'success' && (
                    <>
                      <CheckCircle className="w-4 h-4 text-green-400" />
                      <span className="text-green-300">Connection successful!</span>
                    </>
                  )}
                  {connectionStatus === 'failed' && (
                    <>
                      <AlertCircle className="w-4 h-4 text-red-400" />
                      <span className="text-red-300">Invalid API key or connection failed</span>
                    </>
                  )}
                </div>
              )}
            </div>

            <div className="bg-blue-500/20 border border-blue-500/30 rounded-lg p-4">
              <p className="text-sm text-blue-200 mb-3">
                💡 <strong>Cách lấy API key:</strong>
              </p>
              <ol className="text-sm text-blue-200 space-y-1 list-decimal list-inside">
                <li>Truy cập Google AI Studio</li>
                <li>Đăng nhập tài khoản Google</li>
                <li>Tạo API key mới</li>
                <li>Copy và paste vào đây</li>
              </ol>
              <a
                href="https://aistudio.google.com/app/apikey"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 mt-2 text-blue-400 hover:text-blue-300 underline text-sm"
              >
                <ExternalLink className="w-3 h-3" />
                Mở Google AI Studio
              </a>
            </div>

            <div className="flex gap-3">
              <button
                onClick={handleSetApiKey}
                disabled={!apiKey.trim() || connectionStatus === 'testing'}
                className="flex-1 bg-gradient-to-r from-purple-500 to-blue-500 hover:from-purple-400 hover:to-blue-400 disabled:from-gray-600 disabled:to-gray-700 text-white font-bold py-3 px-4 rounded-lg transition-all duration-300 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {connectionStatus === 'testing' ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
                    Testing...
                  </>
                ) : (
                  'Xác nhận'
                )}
              </button>
              <button
                onClick={() => setShowDebug(!showDebug)}
                className="px-4 py-3 bg-yellow-600 hover:bg-yellow-500 text-white rounded-lg transition-colors"
                title="Debug API"
              >
                <Bug className="w-4 h-4" />
              </button>
              <button
                onClick={onClose}
                className="px-4 py-3 bg-gray-600 hover:bg-gray-500 text-white rounded-lg transition-colors"
              >
                Hủy
              </button>
            </div>
            
            {/* Debug Panel */}
            {showDebug && apiKey.trim() && (
              <div className="mt-4">
                <DebugGemini apiKey={apiKey.trim()} />
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  if (showPreview) {
    return (
      <div className="fixed inset-0 bg-black/90 backdrop-blur-md flex items-center justify-center z-50 p-4">
        <div className="bg-gradient-to-br from-purple-900/90 to-blue-900/90 rounded-3xl p-8 max-w-4xl w-full max-h-[90vh] overflow-y-auto border border-purple-500/30">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold text-white flex items-center gap-2">
              <CheckCircle className="w-6 h-6 text-green-400" />
              Xem trước câu hỏi ({generatedQuestions.length})
            </h2>
            <button
              onClick={() => setShowPreview(false)}
              className="text-gray-400 hover:text-white"
            >
              ✕
            </button>
          </div>

          <div className="space-y-4 mb-6">
            {generatedQuestions.map((question, index) => (
              <div key={index} className="bg-black/40 rounded-lg p-4 border border-gray-600">
                <h3 className="text-lg font-semibold text-white mb-3">
                  {index + 1}. {question.question}
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                  {question.choices?.map((choice, choiceIndex) => (
                    <div
                      key={choiceIndex}
                      className={`p-2 rounded border ${
                        ['a', 'b', 'c', 'd'][choiceIndex] === question.correctAnswer
                          ? 'bg-green-500/20 border-green-500/50 text-green-300'
                          : 'bg-gray-700/50 border-gray-600 text-gray-300'
                      }`}
                    >
                      <span className="font-bold">{['A', 'B', 'C', 'D'][choiceIndex]}:</span> {choice}
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>

          <div className="flex gap-4">
            <button
              onClick={handleSaveQuestions}
              className="flex-1 bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-400 hover:to-emerald-400 text-white font-bold py-3 px-6 rounded-lg transition-all duration-300 flex items-center justify-center gap-2"
            >
              <Save className="w-5 h-5" />
              Sử dụng câu hỏi này
            </button>
            <button
              onClick={() => setShowPreview(false)}
              className="px-6 py-3 bg-gray-600 hover:bg-gray-500 text-white rounded-lg transition-colors"
            >
              Tạo lại
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black/90 backdrop-blur-md flex items-center justify-center z-50 p-4">
      <div className="bg-gradient-to-br from-purple-900/90 to-blue-900/90 rounded-3xl p-8 max-w-2xl w-full max-h-[90vh] overflow-y-auto border border-purple-500/30">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold text-white flex items-center gap-2">
            <Sparkles className="w-6 h-6 text-yellow-400" />
            Tạo câu hỏi bằng AI
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white"
          >
            ✕
          </button>
        </div>

        {error && (
          <div className="bg-red-500/20 border border-red-500/30 rounded-lg p-4 mb-6 flex items-center gap-2">
            <AlertCircle className="w-5 h-5 text-red-400" />
            <div>
              <span className="text-red-300 font-medium">Lỗi tạo câu hỏi:</span>
              <p className="text-red-200 text-sm mt-1">{error}</p>
              <p className="text-red-200 text-xs mt-2">
                Đang sử dụng câu hỏi mặc định thay thế.
              </p>
            </div>
          </div>
        )}

        <div className="space-y-6">
          {/* Question Count */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Số lượng câu hỏi
            </label>
            <select
              value={questionCount}
              onChange={(e) => setQuestionCount(Number(e.target.value))}
              className="w-full px-4 py-2 bg-black/40 border border-gray-600 rounded-lg text-white focus:border-purple-500 focus:outline-none"
            >
              <option value={3}>3 câu</option>
              <option value={5}>5 câu</option>
              <option value={10}>10 câu</option>
              <option value={15}>15 câu</option>
              <option value={20}>20 câu</option>
            </select>
          </div>

          {/* Difficulty */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Độ khó
            </label>
            <div className="grid grid-cols-3 gap-2">
              {[
                { value: 'easy', label: 'Dễ', color: 'from-green-500 to-emerald-500' },
                { value: 'medium', label: 'Trung bình', color: 'from-yellow-500 to-orange-500' },
                { value: 'hard', label: 'Khó', color: 'from-red-500 to-pink-500' }
              ].map((diff) => (
                <button
                  key={diff.value}
                  onClick={() => setDifficulty(diff.value as any)}
                  className={`p-3 rounded-lg text-white font-medium transition-all ${
                    difficulty === diff.value
                      ? `bg-gradient-to-r ${diff.color}`
                      : 'bg-gray-700 hover:bg-gray-600'
                  }`}
                >
                  {diff.label}
                </button>
              ))}
            </div>
          </div>

          {/* Topic Selection */}
          <div>
            <div className="flex items-center gap-4 mb-3">
              <label className="flex items-center gap-2 text-gray-300">
                <input
                  type="radio"
                  name="topicMode"
                  checked={!useCustomTopic}
                  onChange={() => setUseCustomTopic(false)}
                  className="text-purple-500"
                />
                Chọn chủ đề có sẵn
              </label>
              <label className="flex items-center gap-2 text-gray-300">
                <input
                  type="radio"
                  name="topicMode"
                  checked={useCustomTopic}
                  onChange={() => setUseCustomTopic(true)}
                  className="text-purple-500"
                />
                Chủ đề tùy chỉnh
              </label>
            </div>

            {useCustomTopic ? (
              <div>
                <input
                  type="text"
                  value={customTopic}
                  onChange={(e) => setCustomTopic(e.target.value)}
                  placeholder="VD: Anime Nhật Bản, Blockchain, Ẩm thực Việt Nam..."
                  className="w-full px-4 py-3 bg-black/40 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:border-purple-500 focus:outline-none"
                />
                <p className="text-xs text-gray-400 mt-1">
                  Hãy nhập chủ đề cụ thể để AI tạo câu hỏi phù hợp
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                {categories.map((category) => (
                  <button
                    key={category.id}
                    onClick={() => toggleCategory(category.id)}
                    className={`p-3 rounded-lg text-left transition-all ${
                      selectedCategories.includes(category.id)
                        ? 'bg-purple-500 text-white'
                        : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                    }`}
                  >
                    <div className="text-lg mb-1">{category.icon}</div>
                    <div className="text-sm font-medium">{category.name}</div>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Generate Button */}
          <div className="flex gap-4">
            <button
              onClick={handleGenerateQuestions}
              disabled={isGenerating || (useCustomTopic && !customTopic.trim()) || (!useCustomTopic && selectedCategories.length === 0)}
              className="flex-1 bg-gradient-to-r from-purple-500 to-blue-500 hover:from-purple-400 hover:to-blue-400 disabled:from-gray-600 disabled:to-gray-700 text-white font-bold py-4 px-6 rounded-lg transition-all duration-300 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {isGenerating ? (
                <>
                  <RefreshCw className="w-5 h-5 animate-spin" />
                  Đang tạo câu hỏi...
                </>
              ) : (
                <>
                  <Zap className="w-5 h-5" />
                  Tạo câu hỏi
                </>
              )}
            </button>
            <button
              onClick={onClose}
              className="px-6 py-4 bg-gray-600 hover:bg-gray-500 text-white rounded-lg transition-colors"
            >
              Hủy
            </button>
          </div>

          {/* API Key Management */}
          <div className="pt-4 border-t border-gray-600">
            <button
              onClick={() => {
                localStorage.removeItem('gemini_api_key');
                setIsApiKeySet(false);
                setApiKey('');
                setConnectionStatus('idle');
              }}
              className="text-sm text-gray-400 hover:text-white flex items-center gap-2"
            >
              <Settings className="w-4 h-4" />
              Thay đổi API key
            </button>
          </div>

          {/* Tips */}
          <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-4">
            <h4 className="text-yellow-300 font-medium mb-2">💡 Tips cho kết quả tốt nhất:</h4>
            <ul className="text-sm text-yellow-200 space-y-1">
              <li>• Chủ đề càng cụ thể, câu hỏi càng chất lượng</li>
              <li>• Thử các độ khó khác nhau để phù hợp trình độ</li>
              <li>• Nếu có lỗi, hệ thống sẽ dùng câu hỏi mặc định</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};

export default QuestionGenerator;