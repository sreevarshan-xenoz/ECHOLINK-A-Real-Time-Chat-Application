import React, { useState, useEffect } from 'react';
import aiService from '../services/ai-service';
import { saveAISettings } from '../services/supabase-service';
import './AISettings.css';

const AISettings = ({ onClose, addNotification, currentUser }) => {
    const [provider, setProvider] = useState('openai');
    const [apiKey, setApiKey] = useState('');
    const [selectedModel, setSelectedModel] = useState('');
    const [availableModels, setAvailableModels] = useState([]);
    const [temperature, setTemperature] = useState(0.7);
    const [maxTokens, setMaxTokens] = useState(2048);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');

    useEffect(() => {
        // Load saved API key from localStorage
        const savedApiKey = localStorage.getItem(`${provider}_api_key`);
        if (savedApiKey) {
            setApiKey(savedApiKey);
        }
    }, [provider]);

    const providers = [
        { 
            id: 'openai', 
            name: 'OpenAI', 
            models: [
                'gpt-4-1106-preview',
                'gpt-4',
                'gpt-4-32k',
                'gpt-3.5-turbo-1106',
                'gpt-3.5-turbo',
                'gpt-3.5-turbo-16k',
                'text-davinci-003',
                'text-davinci-002'
            ]
        },
        { 
            id: 'gemini', 
            name: 'Google Gemini', 
            models: [
                'gemini-pro',
                'gemini-pro-vision',
                'gemini-ultra'
            ]
        },
        { 
            id: 'ollama', 
            name: 'Ollama (Local)', 
            models: [] 
        }
    ];

    useEffect(() => {
        const updateModels = async () => {
            if (provider === 'ollama') {
                await fetchOllamaModels();
            } else {
                const selectedProvider = providers.find(p => p.id === provider);
                const providerModels = selectedProvider ? selectedProvider.models : [];
                setAvailableModels(providerModels);
                if (providerModels.length > 0) {
                    setSelectedModel(providerModels[0]);
                }
            }
        };
        updateModels();
    }, [provider]);

    const fetchOllamaModels = async () => {
        try {
            const response = await fetch('http://localhost:11434/api/tags');
            if (!response.ok) throw new Error('Failed to fetch Ollama models');
            const data = await response.json();
            const models = data.models || [];
            setAvailableModels(models.map(model => model.name));
        } catch (error) {
            setError('Could not connect to Ollama. Make sure it\'s running locally.');
            setAvailableModels([]);
        }
    };

    const handleProviderChange = (e) => {
        const newProvider = e.target.value;
        setProvider(newProvider);
        const savedApiKey = localStorage.getItem(`${newProvider}_api_key`);
        setApiKey(savedApiKey || '');
        setSelectedModel('');
        setError('');
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setIsLoading(true);
        setError('');

        try {
            await aiService.initialize(provider === 'ollama' ? 'ollama' : apiKey);
            if (selectedModel) {
                aiService.setModel(selectedModel);
            }
            
            // Save to localStorage as a fallback
            if (provider !== 'ollama' && apiKey) {
                localStorage.setItem(`${provider}_api_key`, apiKey);
            }
            
            // Save to Supabase if user is logged in
            if (currentUser?.id) {
                const aiSettings = {
                    provider,
                    apiKey: provider === 'ollama' ? 'ollama' : apiKey,
                    model: selectedModel,
                    temperature,
                    maxTokens
                };
                
                await saveAISettings(currentUser.id, aiSettings);
            }
            
            addNotification('AI settings updated successfully', 'success');
            onClose();
        } catch (error) {
            setError(error.message);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="ai-settings-container">
            <div className="ai-settings-header">
                <h2>AI Provider Settings</h2>
                <button className="close-button" onClick={onClose}>×</button>
            </div>
            <form onSubmit={handleSubmit} className="ai-settings-form">
                <div className="form-group">
                    <label>Select Provider:</label>
                    <select 
                        value={provider} 
                        onChange={handleProviderChange}
                        className="provider-select"
                    >
                        {providers.map(p => (
                            <option key={p.id} value={p.id}>{p.name}</option>
                        ))}
                    </select>
                </div>

                {provider !== 'ollama' && (
                    <div className="form-group">
                        <label>API Key:</label>
                        <input
                            type="password"
                            value={apiKey}
                            onChange={(e) => setApiKey(e.target.value)}
                            placeholder={`Enter your ${provider === 'openai' ? 'OpenAI' : 'Google'} API key`}
                            className="api-key-input"
                            required
                        />
                    </div>
                )}

                <div className="form-group">
                    <label>Select Model:</label>
                    {provider === 'ollama' && availableModels.length === 0 ? (
                        <div className="no-models-message">No models found locally. Please install Ollama models first.</div>
                    ) : (
                        <select
                            value={selectedModel}
                            onChange={(e) => setSelectedModel(e.target.value)}
                            className="model-select"
                            required
                        >
                            <option value="">Choose a model</option>
                            {availableModels.map(model => (
                                <option key={model} value={model}>{model}</option>
                            ))}
                        </select>
                    )}
                </div>

                <div className="form-group">
                    <label>Temperature: {temperature}</label>
                    <input
                        type="range"
                        min="0"
                        max="1"
                        step="0.1"
                        value={temperature}
                        onChange={(e) => setTemperature(parseFloat(e.target.value))}
                        className="slider"
                    />
                    <div className="slider-labels">
                        <span>More Precise</span>
                        <span>More Creative</span>
                    </div>
                </div>

                <div className="form-group">
                    <label>Max Tokens: {maxTokens}</label>
                    <input
                        type="range"
                        min="256"
                        max="8192"
                        step="256"
                        value={maxTokens}
                        onChange={(e) => setMaxTokens(parseInt(e.target.value))}
                        className="slider"
                    />
                </div>

                {error && <div className="error-message">{error}</div>}

                <button 
                    type="submit" 
                    className="save-button" 
                    disabled={isLoading || (!apiKey && provider !== 'ollama') || !selectedModel}
                >
                    {isLoading ? 'Connecting...' : 'Save Settings'}
                </button>
            </form>
        </div>
    );
};

export default AISettings;