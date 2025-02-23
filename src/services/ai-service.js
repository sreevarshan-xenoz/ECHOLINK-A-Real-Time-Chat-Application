import * as tf from '@tensorflow/tfjs';
import { load } from '@tensorflow-models/universal-sentence-encoder';
import OpenAI from 'openai';

class AIService {
    constructor() {
        this.model = null;
        this.encoder = null;
        this.openai = null;
        this.messageHistory = [];
        this.maxHistoryLength = 10;
        this.isInitialized = false;
    }

    async initialize(apiKey) {
        try {
            // Initialize OpenAI
            this.openai = new OpenAI({
                apiKey: apiKey,
                dangerouslyAllowBrowser: true
            });

            // Load Universal Sentence Encoder
            this.encoder = await load();
            
            console.log('AI Service initialized successfully');
            this.isInitialized = true;
        } catch (error) {
            console.error('Failed to initialize AI Service:', error);
            throw error;
        }
    }

    addToHistory(message) {
        this.messageHistory.push({
            text: message.text,
            sender: message.sender,
            timestamp: message.timestamp
        });

        if (this.messageHistory.length > this.maxHistoryLength) {
            this.messageHistory.shift();
        }
    }

    async getSentiment(text) {
        if (!this.isInitialized) return null;

        try {
            const response = await this.openai.chat.completions.create({
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

            return response.choices[0].message.content.trim();
        } catch (error) {
            console.error('Error analyzing sentiment:', error);
            return null;
        }
    }

    async getSmartReplies(message, context = []) {
        if (!this.isInitialized) return [];

        try {
            const conversationContext = this.messageHistory
                .map(msg => `${msg.sender}: ${msg.text}`)
                .join('\n');

            const response = await this.openai.chat.completions.create({
                model: "gpt-3.5-turbo",
                messages: [
                    {
                        role: "system",
                        content: "Generate 3 short, natural, and contextually appropriate reply suggestions. Format as JSON array of strings. Keep replies concise and conversational."
                    },
                    {
                        role: "user",
                        content: `Previous messages:\n${conversationContext}\n\nCurrent message: ${message}`
                    }
                ],
                max_tokens: 100,
                temperature: 0.7
            });

            const suggestions = JSON.parse(response.choices[0].message.content);
            return suggestions.slice(0, 3); // Ensure we only return 3 suggestions
        } catch (error) {
            console.error('Error generating smart replies:', error);
            return [];
        }
    }

    async getMessageCompletion(partialMessage) {
        if (!this.isInitialized || !partialMessage.trim()) return '';

        try {
            const response = await this.openai.chat.completions.create({
                model: "gpt-3.5-turbo",
                messages: [
                    {
                        role: "system",
                        content: "Complete the partial message naturally. Provide only the completion part."
                    },
                    {
                        role: "user",
                        content: partialMessage
                    }
                ],
                max_tokens: 50,
                temperature: 0.5,
                stop: [".","!","?","\n"]
            });

            return response.choices[0].message.content.trim();
        } catch (error) {
            console.error('Error getting message completion:', error);
            return '';
        }
    }

    async detectLanguage(text) {
        if (!this.isInitialized) return null;

        try {
            const response = await this.openai.chat.completions.create({
                model: "gpt-3.5-turbo",
                messages: [
                    {
                        role: "system",
                        content: "Detect the language of the following text. Respond with the ISO 639-1 language code only (e.g., 'en', 'es', 'fr')."
                    },
                    {
                        role: "user",
                        content: text
                    }
                ],
                max_tokens: 2,
                temperature: 0
            });

            return response.choices[0].message.content.trim();
        } catch (error) {
            console.error('Error detecting language:', error);
            return null;
        }
    }

    async analyzeMessageIntent(text) {
        if (!this.isInitialized) return null;

        try {
            const response = await this.openai.chat.completions.create({
                model: "gpt-3.5-turbo",
                messages: [
                    {
                        role: "system",
                        content: "Analyze the intent of the message and categorize it as one of: QUESTION, STATEMENT, REQUEST, GREETING, FAREWELL, or EMOTION. Respond with the category only."
                    },
                    {
                        role: "user",
                        content: text
                    }
                ],
                max_tokens: 1,
                temperature: 0
            });

            return response.choices[0].message.content.trim();
        } catch (error) {
            console.error('Error analyzing message intent:', error);
            return null;
        }
    }
}

export const aiService = new AIService(); 