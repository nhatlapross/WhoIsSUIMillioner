// components/DebugGemini.tsx
'use client';
import React, { useState } from 'react';
import { Search, Copy, CheckCircle, AlertCircle } from 'lucide-react';

interface DebugGeminiProps {
  apiKey: string;
}

const DebugGemini: React.FC<DebugGeminiProps> = ({ apiKey }) => {
  const [models, setModels] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const listModels = async () => {
    setLoading(true);
    setError(null);
    
    try {
      console.log('🔍 Listing available Gemini models...');
      
      const response = await fetch(`https://generativelanguage.googleapis.com/v1/models?key=${apiKey}`);
      
      console.log('📡 Response status:', response.status);
      console.log('📡 Response headers:', Object.fromEntries(response.headers.entries()));
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error('❌ API Error:', errorText);
        throw new Error(`HTTP ${response.status}: ${errorText}`);
      }
      
      const data = await response.json();
      console.log('✅ Models data:', data);
      
      setModels(data);
    } catch (err: any) {
      console.error('❌ Error:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const getGenerateContentModels = () => {
    if (!models?.models) return [];
    
    return models.models.filter((model: any) => 
      model.supportedGenerationMethods?.includes('generateContent')
    );
  };

  return (
    <div className="bg-gray-800 rounded-lg p-6 text-white">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-bold">🔍 Debug Gemini API</h3>
        <button
          onClick={listModels}
          disabled={loading}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 rounded-lg transition-colors"
        >
          <Search className="w-4 h-4" />
          {loading ? 'Loading...' : 'List Models'}
        </button>
      </div>

      {error && (
        <div className="bg-red-500/20 border border-red-500/50 rounded-lg p-4 mb-4">
          <div className="flex items-center gap-2 text-red-300">
            <AlertCircle className="w-5 h-5" />
            <span className="font-medium">Error:</span>
          </div>
          <pre className="text-sm text-red-200 mt-2 whitespace-pre-wrap">{error}</pre>
        </div>
      )}

      {models && (
        <div className="space-y-4">
          <div className="bg-gray-700 rounded-lg p-4">
            <h4 className="font-medium text-green-300 mb-2">✅ API Connection Successful</h4>
            <p className="text-sm text-gray-300">
              Total models found: {models.models?.length || 0}
            </p>
          </div>

          {/* Generate Content Models */}
          <div className="bg-gray-700 rounded-lg p-4">
            <h4 className="font-medium text-blue-300 mb-3">
              🎯 Models supporting generateContent:
            </h4>
            <div className="space-y-2">
              {getGenerateContentModels().map((model: any, index: number) => (
                <div key={index} className="bg-gray-600 rounded p-3">
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-sm text-green-300">
                      {model.name}
                    </span>
                    <button
                      onClick={() => copyToClipboard(model.name)}
                      className="flex items-center gap-1 px-2 py-1 bg-gray-500 hover:bg-gray-400 rounded text-xs transition-colors"
                    >
                      {copied ? <CheckCircle className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                      Copy
                    </button>
                  </div>
                  <p className="text-xs text-gray-400 mt-1">
                    {model.displayName || 'No display name'}
                  </p>
                  <p className="text-xs text-gray-400">
                    Methods: {model.supportedGenerationMethods?.join(', ') || 'None'}
                  </p>
                </div>
              ))}
            </div>
          </div>

          {/* Recommended URLs */}
          <div className="bg-green-500/20 border border-green-500/50 rounded-lg p-4">
            <h4 className="font-medium text-green-300 mb-2">💡 Recommended API URLs:</h4>
            <div className="space-y-2 text-sm">
              {getGenerateContentModels().slice(0, 3).map((model: any, index: number) => (
                <div key={index} className="bg-gray-700 rounded p-2">
                  <code className="text-green-200">
                    https://generativelanguage.googleapis.com/v1/{model.name}:generateContent
                  </code>
                </div>
              ))}
            </div>
          </div>

          {/* Raw Response */}
          <details className="bg-gray-700 rounded-lg">
            <summary className="p-4 cursor-pointer font-medium">
              📄 Raw API Response (Click to expand)
            </summary>
            <pre className="p-4 text-xs bg-gray-800 rounded-b-lg overflow-auto max-h-96">
              {JSON.stringify(models, null, 2)}
            </pre>
          </details>
        </div>
      )}

      {!models && !loading && (
        <div className="text-center text-gray-400 py-8">
          <Search className="w-12 h-12 mx-auto mb-2 opacity-50" />
          <p>Click "List Models" to debug API connection</p>
        </div>
      )}
    </div>
  );
};

export default DebugGemini;