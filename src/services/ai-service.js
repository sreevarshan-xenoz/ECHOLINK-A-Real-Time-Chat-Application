import * as tf from '@tensorflow/tfjs';
import { load } from '@tensorflow-models/universal-sentence-encoder';
import OpenAI from 'openai';
import { GoogleGenerativeAI } from '@google/generative-ai';

class AIService {
    constructor() {
        this.model = null;
        this.encoder = null;
        this.openai = null;
        this.gemini = null;
        this.apiType = null; // 'openai' or 'gemini'
        this.messageHistory = [];
        this.maxHistoryLength = 10;
        this.isInitialized = false;
        this.aiChatHistory = [];
        this.aiPersonality = "You are Echo, a friendly and helpful AI assistant. You're knowledgeable but concise in your responses.";
    }

    async initialize(apiKey) {
        try {
            if (!apiKey || apiKey.trim() === '') {
                throw new Error('API key is required');
            }

            // Detect API type based on key format
            if (apiKey.startsWith('sk-')) {
                // OpenAI API key format
                this.apiType = 'openai';
                this.openai = new OpenAI({
                    apiKey: apiKey,
                    dangerouslyAllowBrowser: true
                });
                
                // Test the OpenAI API key
                await this.openai.chat.completions.create({
                    model: "gpt-3.5-turbo",
                    messages: [{ role: "system", content: "Test" }],
                    max_tokens: 1
                });
            } else {
                // Gemini API key
                this.apiType = 'gemini';
                this.gemini = new GoogleGenerativeAI(apiKey);
                
                // Test the Gemini API key with better error handling
                try {
                    const model = this.gemini.getGenerativeModel({ model: "gemini-pro" });
                    const prompt = "Test message";
                    const result = await model.generateContent(prompt);
                    
                    // Check if the result is valid
                    if (!result || !result.response) {
                        throw new Error('No response from Gemini API');
                    }
                    
                    // Try to access the response text to validate the API key
                    const response = await result.response;
                    const text = response.text();
                    
                    if (!text) {
                        throw new Error('Empty response from Gemini API');
                    }
                } catch (geminiError) {
                    console.error('Gemini API test failed:', geminiError);
                    // Check for specific error types
                    if (geminiError.message?.includes('API key not valid')) {
                        throw new Error('Invalid Gemini API key');
                    } else if (geminiError.message?.includes('quota')) {
                        throw new Error('Gemini API quota exceeded');
                    } else {
                        throw new Error(`Gemini API error: ${geminiError.message}`);
                    }
                }
            }

            // Load Universal Sentence Encoder
            this.encoder = await load();
            
            console.log('AI Service initialized successfully with', this.apiType);
            this.isInitialized = true;
        } catch (error) {
            console.error('Failed to initialize AI Service:', error);
            this.isInitialized = false;
            this.openai = null;
            this.gemini = null;
            this.apiType = null;
            throw error; // Throw the original error to preserve the message
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

    async translateText(text, fromLang, toLang) {
        if (!this.isInitialized) return null;

        try {
            const response = await this.openai.chat.completions.create({
                model: "gpt-3.5-turbo",
                messages: [
                    {
                        role: "system",
                        content: `Translate the following text from ${fromLang} to ${toLang}. Provide only the translation, maintaining the original tone and context.`
                    },
                    {
                        role: "user",
                        content: text
                    }
                ],
                temperature: 0.3,
                max_tokens: 150
            });

            return response.choices[0].message.content.trim();
        } catch (error) {
            console.error('Translation error:', error);
            throw error;
        }
    }

    async getSupportedLanguages() {
        return [
            { code: 'en', name: 'English' },
            { code: 'es', name: 'Spanish' },
            { code: 'fr', name: 'French' },
            { code: 'de', name: 'German' },
            { code: 'it', name: 'Italian' },
            { code: 'pt', name: 'Portuguese' },
            { code: 'ru', name: 'Russian' },
            { code: 'ja', name: 'Japanese' },
            { code: 'ko', name: 'Korean' },
            { code: 'zh', name: 'Chinese' },
            { code: 'ar', name: 'Arabic' },
            { code: 'hi', name: 'Hindi' }
        ];
    }

    async transcribeAudio(audioBlob) {
        if (!this.isInitialized) return null;

        try {
            // Convert audio blob to base64
            const buffer = await audioBlob.arrayBuffer();
            const base64Audio = Buffer.from(buffer).toString('base64');

            const response = await this.openai.audio.transcriptions.create({
                file: new Blob([buffer], { type: 'audio/webm' }),
                model: "whisper-1",
                language: "en"
            });

            return response.text;
        } catch (error) {
            console.error('Error transcribing audio:', error);
            return null;
        }
    }

    async chatWithAI(message, contextLength = 5) {
        if (!this.isInitialized) {
            throw new Error('AI service not initialized. Please check your API key.');
        }

        try {
            if (!message || message.trim() === '') {
                throw new Error('Message cannot be empty');
            }

            console.log('Sending message to AI:', message);
            
            // Add user message to history
            this.aiChatHistory.push({ role: "user", content: message });

            // Keep only recent messages for context
            const recentHistory = this.aiChatHistory.slice(-contextLength);

            let aiResponse;

            if (this.apiType === 'openai') {
                const response = await this.openai.chat.completions.create({
                    model: "gpt-3.5-turbo",
                    messages: [
                        { role: "system", content: this.aiPersonality },
                        ...recentHistory
                    ],
                    max_tokens: 150,
                    temperature: 0.7,
                    presence_penalty: 0.6
                });

                aiResponse = response.choices[0].message.content.trim();
            } else {
                // Gemini API
                try {
                    const model = this.gemini.getGenerativeModel({ model: "gemini-pro" });
                    const chat = model.startChat({
                        history: recentHistory.map(msg => ({
                            role: msg.role === "user" ? "user" : "model",
                            parts: [{ text: msg.content }]
                        })),
                        generationConfig: {
                            maxOutputTokens: 150,
                            temperature: 0.7
                        }
                    });

                    const result = await chat.sendMessage(message);
                    const response = await result.response;
                    aiResponse = response.text();
                    
                    if (!aiResponse) {
                        throw new Error('Empty response from Gemini API');
                    }
                } catch (geminiError) {
                    console.error('Gemini chat error:', geminiError);
                    throw new Error('Failed to get response from Gemini. Please check your API key and try again.');
                }
            }

            // Add AI response to history
            this.aiChatHistory.push({ role: "assistant", content: aiResponse });

            return {
                text: aiResponse,
                timestamp: new Date().toISOString()
            };
        } catch (error) {
            console.error('Error in AI chat:', error.message);
            if (error.message.includes('API key')) {
                throw new Error('Invalid API key. Please check your API key.');
            } else if (error.message.includes('quota') || error.message.includes('limit')) {
                throw new Error('API quota exceeded. Please check your usage limits.');
            } else {
                throw new Error(`AI chat error: ${error.message}`);
            }
        }
    }

    setAIPersonality(personality) {
        this.aiPersonality = personality;
    }

    clearAIChatHistory() {
        this.aiChatHistory = [];
    }
}

const aiService = new AIService();
export default aiService; 