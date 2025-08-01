/**
 * AI Service Module (TypeScript)
 * Provides AI-powered functionalities such as sentiment analysis, smart replies, etc.
 */

import * as tf from '@tensorflow/tfjs';
import { load } from '@tensorflow-models/universal-sentence-encoder';
import OpenAI from 'openai';
import { GoogleGenerativeAI } from '@google/generative-ai';
import config from '../config/environment';

// Define types for AI request and response
interface AIRequest {
  text: string;
  context?: string[];
}

interface AIResponse {
  type: string;
  content: string;
  sender: string;
  timestamp: string;
  id: string;
}

interface Message {
  text: string;
  sender: string;
  timestamp: string;
}

class AIService {
  private model: any = null;
  private encoder: any = null;
  private openai: OpenAI | null = null;
  private gemini: GoogleGenerativeAI | null = null;
  private ollamaEndpoint: string = 'http://localhost:11434';
  private apiType: string | null = null;
  private messageHistory: Message[] = [];
  private maxHistoryLength: number = 10;
  private isInitialized: boolean = false;
  private aiChatHistory: any[] = [];
  private aiPersonality: string = "You are Echo, a friendly and helpful AI assistant.";
  private selectedModel: string | null = null;
  private helpResponses: Record<string, string> = {
    'how to use': 'To use EchoLink, start by connecting with others using their peer ID.',
    'features': 'EchoLink features include: Real-time messaging, smart replies, etc.',
  };

  public setModel(modelName: string): void {
    if (!modelName) throw new Error('Model name is required');
    this.selectedModel = modelName;
  }

  public async initialize(apiKey: string): Promise<void> {
    try {
      if (!apiKey || apiKey.trim() === '') {
        throw new Error('API key is required');
      }

      // Reset previous state
      this.openai = null;
      this.gemini = null;
      this.apiType = null;
      this.isInitialized = false;

      // Detect API type based on key format
      if (apiKey.toLowerCase() === 'ollama') {
        await this.initializeOllama();
      } else if (apiKey.startsWith('sk-')) {
        await this.initializeOpenAI(apiKey);
      } else {
        await this.initializeGemini(apiKey);
      }

      this.encoder = await load();

      console.log('AI Service initialized successfully with', this.apiType);
      this.isInitialized = true;
    } catch (error) {
      console.error('Failed to initialize AI Service:', error);
      this.isInitialized = false;
      this.openai = null;
      this.gemini = null;
      this.apiType = null;
      throw error;
    }
  }

  private async initializeOllama(): Promise<void> {
    try {
      const response = await fetch(`${this.ollamaEndpoint}/api/tags`);
      if (!response.ok) throw new Error('Failed to connect to Ollama');
      this.apiType = 'ollama';
    } catch (error) {
      throw new Error('Could not connect to Ollama. Ensure it is running locally.');
    }
  }

  private async initializeOpenAI(apiKey: string): Promise<void> {
    this.openai = new OpenAI({
      apiKey: apiKey,
      dangerouslyAllowBrowser: true
    });

    try {
      await this.openai.chat.completions.create({
        model: this.selectedModel || "gpt-3.5-turbo",
        messages: [{ role: "system", content: "Test" }],
        max_tokens: 1
      });
      this.apiType = 'openai';
    } catch (error) {
      throw new Error(`OpenAI initialization failed: ${error.message}`);
    }
  }

  private async initializeGemini(apiKey: string): Promise<void> {
    this.gemini = new GoogleGenerativeAI(apiKey);

    try {
      const model = this.gemini.getGenerativeModel({ model: this.selectedModel || "gemini-pro" });
      const result = await model.generateContent("Test message");

      if (!result?.response) {
        throw new Error('Failed to initialize AI model');
      }

      const response = await result.response;
      const text = response.text();

      if (!text) {
        throw new Error('Empty response from Gemini API');
      }

      this.apiType = 'gemini';
    } catch (error) {
      if (error.message?.includes('API key not valid')) {
        throw new Error('Invalid Gemini API key');
      } else if (error.message?.includes('quota')) {
        throw new Error('Gemini API quota exceeded');
      } else {
        throw new Error(`Gemini API error: ${error.message}`);
      }
    }
  }

  public async handleHelpQuery(query: string): Promise<AIResponse> {
    query = query.toLowerCase();
    let response = "I'm here to help! Ask me about how to use the app.";

    for (const [key, value] of Object.entries(this.helpResponses)) {
      if (query.includes(key)) {
        response = value;
        break;
      }
    }

    return {
      type: 'CHAT',
      content: response,
      sender: 'AI_ASSISTANT',
      timestamp: new Date().toISOString(),
      id: Math.random().toString(36).substr(2, 9)
    };
  }

  public addToHistory(message: Message): void {
    this.messageHistory.push({
      text: message.text,
      sender: message.sender,
      timestamp: message.timestamp
    });

    if (this.messageHistory.length > this.maxHistoryLength) {
      this.messageHistory.shift();
    }
  }

  public async getSentiment(text: string): Promise<string | null> {
    if (!this.isInitialized) return null;

    try {
      const response = await this.openai?.chat.completions.create({
        model: "gpt-3.5-turbo",
        messages: [
          {
            role: "system",
            content: "Analyze the sentiment of the following message. Respond with POSITIVE, NEGATIVE, or NEUTRAL only."
          },
          {
            role: "user",
            content: text
          }
        ],
        max_tokens: 1,
        temperature: 0
      });

      return response?.choices[0].message.content.trim() || null;
    } catch (error) {
      console.error('Error analyzing sentiment:', error);
      return null;
    }
  }

  public async getSmartReplies(message: string, context: string[] = []): Promise<string[]> {
    if (!this.isInitialized) return [];

    try {
      const conversationContext = this.messageHistory
        .map(msg => `${msg.sender}: ${msg.text}`)
        .join('\n');

      const response = await this.openai?.chat.completions.create({
        model: "gpt-3.5-turbo",
        messages: [
          { role: "system", content: "Generate a smart reply." },
          { role: "user", content: `${conversationContext}\nUser: ${message}` }
        ],
        max_tokens: 50
      });

      return response?.choices[0].message.content.trim().split('\n') || [];
    } catch (error) {
      console.error('Error generating smart replies:', error);
      return [];
    }
  }

  /**
   * Generate text using the configured AI model
   */
  public async generateText(prompt: string, options?: {
    maxTokens?: number;
    temperature?: number;
    model?: string;
  }): Promise<string> {
    if (!this.isInitialized) {
      throw new Error('AI service not initialized');
    }

    const { maxTokens = 2048, temperature = 0.7, model } = options || {};

    try {
      if (this.apiType === 'openai' && this.openai) {
        const response = await this.openai.chat.completions.create({
          model: model || this.selectedModel || "gpt-3.5-turbo",
          messages: [
            { role: "system", content: this.aiPersonality },
            { role: "user", content: prompt }
          ],
          max_tokens: maxTokens,
          temperature
        });

        return response.choices[0].message.content?.trim() || '';
      }

      if (this.apiType === 'gemini' && this.gemini) {
        const modelInstance = this.gemini.getGenerativeModel({ 
          model: model || this.selectedModel || "gemini-pro" 
        });
        const result = await modelInstance.generateContent(prompt);
        const response = await result.response;
        return response.text();
      }

      if (this.apiType === 'ollama') {
        const response = await fetch(`${this.ollamaEndpoint}/api/generate`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            model: model || this.selectedModel || 'llama2',
            prompt: prompt,
            stream: false
          })
        });

        if (!response.ok) {
          throw new Error('Ollama request failed');
        }

        const data = await response.json();
        return data.response || '';
      }

      throw new Error('No AI service configured');
    } catch (error) {
      console.error('Error generating text:', error);
      throw new Error(`AI text generation failed: ${error.message}`);
    }
  }

  /**
   * Chat with AI maintaining conversation history
   */
  public async chatWithAI(message: string, userId?: string): Promise<AIResponse> {
    if (!this.isInitialized) {
      throw new Error('AI service not initialized');
    }

    try {
      // Add user message to chat history
      this.aiChatHistory.push({
        role: 'user',
        content: message,
        timestamp: new Date().toISOString()
      });

      // Prepare conversation context
      const messages = [
        { role: 'system', content: this.aiPersonality },
        ...this.aiChatHistory.slice(-10).map(msg => ({
          role: msg.role,
          content: msg.content
        }))
      ];

      let responseText = '';

      if (this.apiType === 'openai' && this.openai) {
        const response = await this.openai.chat.completions.create({
          model: this.selectedModel || "gpt-3.5-turbo",
          messages: messages as any,
          max_tokens: 1000,
          temperature: 0.7
        });
        responseText = response.choices[0].message.content?.trim() || '';
      } else if (this.apiType === 'gemini' && this.gemini) {
        const modelInstance = this.gemini.getGenerativeModel({ 
          model: this.selectedModel || "gemini-pro" 
        });
        const result = await modelInstance.generateContent(message);
        const response = await result.response;
        responseText = response.text();
      } else if (this.apiType === 'ollama') {
        const response = await fetch(`${this.ollamaEndpoint}/api/generate`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            model: this.selectedModel || 'llama2',
            prompt: message,
            stream: false
          })
        });
        const data = await response.json();
        responseText = data.response || '';
      }

      // Add AI response to chat history
      this.aiChatHistory.push({
        role: 'assistant',
        content: responseText,
        timestamp: new Date().toISOString()
      });

      return {
        type: 'CHAT',
        content: responseText,
        sender: 'AI_ASSISTANT',
        timestamp: new Date().toISOString(),
        id: Math.random().toString(36).substr(2, 9)
      };
    } catch (error) {
      console.error('Error in AI chat:', error);
      throw new Error(`AI chat failed: ${error.message}`);
    }
  }

  /**
   * Translate text to specified language
   */
  public async translateText(text: string, targetLanguage: string): Promise<string> {
    if (!this.isInitialized) return text;

    try {
      const prompt = `Translate the following text to ${targetLanguage}. Only return the translated text, no explanations:\n\n${text}`;
      return await this.generateText(prompt, { maxTokens: 500, temperature: 0.3 });
    } catch (error) {
      console.error('Error translating text:', error);
      return text;
    }
  }

  /**
   * Get message completion suggestions
   */
  public async getMessageCompletion(partialMessage: string): Promise<string[]> {
    if (!this.isInitialized || partialMessage.length < 3) return [];

    try {
      const prompt = `Complete this message naturally (provide 3 different completions, one per line):\n${partialMessage}`;
      const result = await this.generateText(prompt, { maxTokens: 100, temperature: 0.8 });
      return result.split('\n').filter(line => line.trim()).slice(0, 3);
    } catch (error) {
      console.error('Error getting message completion:', error);
      return [];
    }
  }

  /**
   * Detect language of text
   */
  public async detectLanguage(text: string): Promise<string | null> {
    if (!this.isInitialized) return null;

    try {
      const prompt = `Detect the language of this text and respond with only the language name in English:\n${text}`;
      const result = await this.generateText(prompt, { maxTokens: 10, temperature: 0 });
      return result.trim();
    } catch (error) {
      console.error('Error detecting language:', error);
      return null;
    }
  }

  /**
   * Get AI service status
   */
  public getStatus(): {
    isInitialized: boolean;
    apiType: string | null;
    selectedModel: string | null;
    historyLength: number;
  } {
    return {
      isInitialized: this.isInitialized,
      apiType: this.apiType,
      selectedModel: this.selectedModel,
      historyLength: this.messageHistory.length
    };
  }

  /**
   * Clear AI chat history
   */
  public clearChatHistory(): void {
    this.aiChatHistory = [];
  }
}

export const aiService = new AIService();
export default aiService;
