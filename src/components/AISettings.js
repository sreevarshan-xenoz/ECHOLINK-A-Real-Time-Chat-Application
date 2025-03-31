import React, { useState, useEffect } from 'react';
import aiService from '../services/ai-service';
import './AISettings.css';

const AISettings = ({ onClose, addNotification }) => {
    const [provider, setProvider] = useState('openai');
    const [apiKey, setApiKey] = useState('');
    const [selectedModel, setSelectedModel] = useState('');
    const [availableModels, setAvailableModels] = useState([]);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');

    const providers = [
        { id: 'openai', name: 'OpenAI', models: ['gpt-3.5-turbo', 'gpt-4'] },
        { id: 'gemini', name: 'Google Gemini', models: ['gemini-pro'] },
        { id: 'ollama', name: 'Ollama (Local)', models: [] }
    ];

    useEffect(() => {
        if (provider === 'ollama') {
            fetchOllamaModels();
        } else {
            setAvailableModels(providers.find(p => p.id === provider).models);
        }
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
        setProvider(e.target.value);
        setApiKey('');
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

                {availableModels.length > 0 && (
                    <div className="form-group">
                        <label>Select Model:</label>
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
                    </div>
                )}

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