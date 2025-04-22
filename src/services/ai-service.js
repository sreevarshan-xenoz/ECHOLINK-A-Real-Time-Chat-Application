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
        this.ollamaEndpoint = 'http://localhost:11434';
        this.huggingFaceToken = process.env.REACT_APP_HUGGINGFACE_TOKEN || '';
        this.apiType = null; // 'openai', 'gemini', 'ollama', or 'huggingface'
        this.messageHistory = [];
        this.maxHistoryLength = 10;
        this.isInitialized = false;
        this.aiChatHistory = [];
        this.aiPersonality = "You are AURA, the default AI assistant for EchoLink. You're helpful, friendly, and designed to assist users with their communication needs.";
        this.selectedModel = null;
        this.huggingFaceClient = null;
        this.huggingFaceEndpoints = {
            defaultModel: "Qwen/QwQ-32B-Demo",
            chat: "/submit",
            newChat: "/new_chat"
        };
        this.helpResponses = {
            'how to use': 'To use EchoLink, start by connecting with others using their peer ID. You can share files, send messages, and even use AI features for smart replies and translations.',
            'how to connect': 'To connect with others: 1) Share your Peer ID with them 2) Enter their Peer ID in the connection dialog 3) Click connect to establish a secure P2P connection.',
            'features': 'EchoLink features include: \n- Real-time P2P messaging\n- File sharing\n- Voice messages\n- AI-powered smart replies\n- Message translation\n- Code sharing\n- Reactions and emojis',
            'privacy': 'EchoLink uses end-to-end encryption for messages and P2P connections. Your data stays private and secure between you and your chat partner.',
            'settings': 'Access settings by clicking the gear icon. You can customize:\n- Theme and appearance\n- Notifications\n- Privacy settings\n- AI features\n- Chat preferences',
            'ai features': 'AI features include:\n- Smart replies\n- Message translation\n- Code assistance\n- Sentiment analysis\n- Message completion\nEnable AI chat to access these features.'
        };
    }

    setModel(modelName) {
        if (!modelName) throw new Error('Model name is required');
        this.selectedModel = modelName;
    }

    async initialize(apiKey) {
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
            if (apiKey === 'huggingface' || apiKey.startsWith('hf_')) {
                if (apiKey !== 'huggingface') {
                    this.huggingFaceToken = apiKey;
                }
                await this.initializeHuggingFace();
            } else if (apiKey.toLowerCase() === 'ollama') {
                await this.initializeOllama();
            } else if (apiKey.startsWith('sk-')) {
                await this.initializeOpenAI(apiKey);
            } else {
                await this.initializeGemini(apiKey);
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
            throw error;
        }
    }

    async initializeOllama() {
        try {
            const response = await fetch(`${this.ollamaEndpoint}/api/tags`);
            if (!response.ok) throw new Error('Failed to connect to Ollama');
            this.apiType = 'ollama';
        } catch (error) {
            throw new Error('Could not connect to Ollama. Make sure it\'s running locally.');
        }
    }

    async initializeOpenAI(apiKey) {
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

    async initializeGemini(apiKey) {
        this.gemini = new GoogleGenerativeAI(apiKey);
        
        try {
            const model = this.gemini.getGenerativeModel({ 
                model: this.selectedModel || "gemini-pro" 
            });
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

    async initializeHuggingFace() {
        try {
            // Verify token is valid by making a test API call
            const response = await fetch(`https://api-inference.huggingface.co/models/${this.huggingFaceEndpoints.defaultModel}`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${this.huggingFaceToken}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ inputs: "Test message" })
            });

            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.error || 'Failed to initialize Hugging Face API');
            }

            this.apiType = 'huggingface';
            console.log('Hugging Face API initialized successfully');
        } catch (error) {
            console.error('Hugging Face initialization error:', error);
            throw new Error(`Hugging Face initialization failed: ${error.message}`);
        }
    }

    async handleHelpQuery(query) {
        query = query.toLowerCase();
        let response = "I'm here to help! Ask me about how to use the app, connect with others, or explore features.";

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
            throw new Error('AI service is not initialized');
        }

        // Get recent chat history
        const recentHistory = this.aiChatHistory
            .slice(-contextLength)
            .map(msg => ({
                role: msg.sender === 'AI_ASSISTANT' ? 'assistant' : 'user',
                content: msg.content
            }));

        // Create a new message object
        const newMessage = {
            type: 'CHAT',
            content: message,
            sender: 'USER',
            timestamp: new Date().toISOString(),
            id: Math.random().toString(36).substr(2, 9)
        };

        // Add to history
        this.aiChatHistory.push(newMessage);

        try {
            let response;

            if (this.apiType === 'huggingface') {
                response = await this.sendHuggingFaceMessage(message, recentHistory);
            } else if (this.apiType === 'openai') {
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

                response = response.choices[0].message.content.trim();
            } else if (this.apiType === 'gemini') {
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
                response = response.text();
                
                if (!response) {
                    throw new Error('Empty response from Gemini API');
                }
            } else if (this.apiType === 'ollama') {
                const response = await fetch(`${this.ollamaEndpoint}/api/chat`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        model: 'llama2',
                        messages: [
                            { role: 'system', content: this.aiPersonality },
                            ...recentHistory
                        ],
                        stream: true
                    })
                });

                if (!response.ok) throw new Error('Ollama API request failed');
                const reader = response.body.getReader();
                let streamedResponse = '';

                while (true) {
                    const { done, value } = await reader.read();
                    if (done) break;
                    const chunk = new TextDecoder().decode(value);
                    const lines = chunk.split('\n').filter(line => line.trim());
                    
                    for (const line of lines) {
                        try {
                            const data = JSON.parse(line);
                            if (data.message?.content) {
                                streamedResponse += data.message.content;
                            }
                        } catch (e) {}
                    }
                }

                response = streamedResponse.trim();
            } else {
                throw new Error('No valid AI service configured');
            }

            // Create AI response message
            const aiResponse = {
                type: 'CHAT',
                content: response,
                sender: 'AI_ASSISTANT',
                timestamp: new Date().toISOString(),
                id: Math.random().toString(36).substr(2, 9)
            };

            // Add to history
            this.aiChatHistory.push(aiResponse);

            return aiResponse;
        } catch (error) {
            console.error('AI chat error:', error);
            
            // Create error message
            const errorResponse = {
                type: 'CHAT',
                content: `Sorry, I encountered an error: ${error.message}`,
                sender: 'AI_ASSISTANT',
                timestamp: new Date().toISOString(),
                id: Math.random().toString(36).substr(2, 9),
                error: true
            };
            
            // Add to history
            this.aiChatHistory.push(errorResponse);
            
            return errorResponse;
        }
    }

    async sendHuggingFaceMessage(message, messageHistory) {
        try {
            // For new conversations, create a new chat session
            if (messageHistory.length === 0) {
                await fetch(`https://api-inference.huggingface.co/models/${this.huggingFaceEndpoints.defaultModel}`, {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${this.huggingFaceToken}`,
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        api_name: this.huggingFaceEndpoints.newChat
                    })
                });
            }

            // Send the actual message
            const response = await fetch(`https://api-inference.huggingface.co/models/${this.huggingFaceEndpoints.defaultModel}`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${this.huggingFaceToken}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    sender_value: message,
                    api_name: this.huggingFaceEndpoints.chat
                })
            });

            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.error || 'Failed to get response from Hugging Face API');
            }

            const result = await response.json();
            return result;
        } catch (error) {
            console.error('Hugging Face chat error:', error);
            throw error;
        }
    }

    setAIPersonality(personality) {
        this.aiPersonality = personality;
    }

    clearAIChatHistory() {
        this.aiChatHistory = [];
    }
}

export default new AIService();