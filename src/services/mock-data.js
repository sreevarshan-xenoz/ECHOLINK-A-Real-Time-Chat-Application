// Mock data service for demo purposes
export const mockUsers = [
    {
        id: 'demo-user-1',
        name: 'Alice Johnson',
        email: 'alice@demo.com',
        avatar: 'https://images.unsplash.com/photo-1494790108755-2616b612b786?w=150',
        status: 'online'
    },
    {
        id: 'demo-user-2', 
        name: 'Bob Smith',
        email: 'bob@demo.com',
        avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150',
        status: 'online'
    },
    {
        id: 'demo-user-3',
        name: 'Carol Davis',
        email: 'carol@demo.com', 
        avatar: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=150',
        status: 'away'
    }
];

export const mockMessages = [
    {
        id: 'msg-1',
        text: 'Hey! Welcome to EchoLink! 👋',
        sender: 'demo-user-1',
        timestamp: new Date(Date.now() - 300000).toISOString(),
        type: 'CHAT',
        status: 'read'
    },
    {
        id: 'msg-2', 
        text: 'This is a secure P2P chat application with AI integration!',
        sender: 'demo-user-2',
        timestamp: new Date(Date.now() - 240000).toISOString(),
        type: 'CHAT',
        status: 'read'
    },
    {
        id: 'msg-3',
        text: 'You can share files, send voice messages, and even collaborate on code! 🚀',
        sender: 'demo-user-1',
        timestamp: new Date(Date.now() - 180000).toISOString(),
        type: 'CHAT', 
        status: 'read'
    },
    {
        id: 'msg-4',
        text: 'Try asking the AI assistant something!',
        sender: 'demo-user-3',
        timestamp: new Date(Date.now() - 120000).toISOString(),
        type: 'CHAT',
        status: 'delivered'
    }
];

export const mockAIResponses = [
    "Hello! I'm Echo, your AI assistant. How can I help you today?",
    "That's a great question! Let me help you with that.",
    "I can assist with coding, translations, explanations, and much more!",
    "Feel free to ask me anything - I'm here to help make your chat experience better!",
    "Did you know EchoLink supports real-time collaboration? Try sharing some code!",
    "I can help translate messages, provide smart replies, and even analyze sentiment!"
];

export const mockProjects = [
    {
        id: 'proj-1',
        name: 'EchoLink Chat App',
        description: 'Real-time P2P chat with AI integration',
        language: 'JavaScript',
        stars: 128,
        forks: 24,
        updated: '2 hours ago'
    },
    {
        id: 'proj-2',
        name: 'AI Assistant API',
        description: 'Multi-provider AI service wrapper',
        language: 'Python', 
        stars: 89,
        forks: 15,
        updated: '1 day ago'
    },
    {
        id: 'proj-3',
        name: 'WebRTC Utils',
        description: 'Utilities for WebRTC connections',
        language: 'TypeScript',
        stars: 45,
        forks: 8,
        updated: '3 days ago'
    }
];

export const getRandomAIResponse = () => {
    return mockAIResponses[Math.floor(Math.random() * mockAIResponses.length)];
};

export const getRandomUser = () => {
    return mockUsers[Math.floor(Math.random() * mockUsers.length)];
};

export const generateMockMessage = (text, sender = null) => {
    return {
        id: `msg-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        text,
        sender: sender || getRandomUser().id,
        timestamp: new Date().toISOString(),
        type: 'CHAT',
        status: 'sent'
    };
};