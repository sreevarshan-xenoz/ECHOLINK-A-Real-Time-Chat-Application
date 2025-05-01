export type AIModelType = 'openai' | 'google' | 'local' | 'huggingface';

export interface AIModelConfig {
  id: string;
  name: string;
  type: AIModelType;
  requires_api_key: boolean;
  description: string;
  endpoint?: string;
  capabilities: AICapability[];
}

export type AICapability = 
  | 'chat' 
  | 'completion' 
  | 'summarization' 
  | 'translation' 
  | 'code_generation' 
  | 'code_completion'
  | 'sentiment_analysis'
  | 'entity_recognition';

export interface AIMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface AIResponse {
  text: string;
  model: string;
  usage?: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
  created: number;
}

export interface TranslationRequest {
  text: string;
  source_language?: string;
  target_language: string;
}

export interface TranslationResponse {
  translated_text: string;
  detected_source_language?: string;
}

export interface SentimentAnalysisResult {
  sentiment: 'positive' | 'negative' | 'neutral';
  score: number;
  entities?: {
    text: string;
    sentiment: 'positive' | 'negative' | 'neutral';
    score: number;
  }[];
}

export interface CodeAnalysisResult {
  language: string;
  tokens: number;
  functions: {
    name: string;
    complexity: number;
    lines: number;
  }[];
  suggestions?: string[];
} 