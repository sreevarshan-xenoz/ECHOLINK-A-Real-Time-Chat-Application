import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { 
  AIModelType, 
  AIModelConfig, 
  AIMessage, 
  SentimentAnalysisResult, 
  TranslationResponse 
} from '../../types/ai';
import { RootState } from '../index';

interface AIState {
  isInitialized: boolean;
  selectedModel: AIModelType;
  apiKey: string | null;
  supportedModels: AIModelConfig[];
  isLoading: boolean;
  error: string | null;
  conversation: {
    messages: AIMessage[];
    isTyping: boolean;
    lastResponse: string | null;
  };
  translation: {
    isBusy: boolean;
    detectedLanguage: string | null;
    history: Record<string, TranslationResponse>;
  };
  sentiment: {
    isBusy: boolean;
    messageResults: Record<string, SentimentAnalysisResult>;
  };
  suggestions: {
    isBusy: boolean;
    smartReplies: string[];
  };
  voiceTranscription: {
    isBusy: boolean;
    isEnabled: boolean;
    lastTranscription: string | null;
  };
}

const defaultModels: AIModelConfig[] = [
  {
    id: 'openai-default',
    name: 'OpenAI GPT',
    type: 'openai',
    requires_api_key: true,
    description: 'OpenAI GPT model for natural language understanding and generation',
    capabilities: ['chat', 'completion', 'summarization', 'translation'],
  },
  {
    id: 'google-gemini',
    name: 'Google Gemini',
    type: 'google',
    requires_api_key: true,
    description: 'Google\'s advanced language model',
    capabilities: ['chat', 'completion', 'code_generation'],
  },
  {
    id: 'local-model',
    name: 'Local Model',
    type: 'local',
    requires_api_key: false,
    description: 'Locally running language model for enhanced privacy',
    capabilities: ['chat', 'completion'],
  },
];

const initialState: AIState = {
  isInitialized: false,
  selectedModel: 'openai',
  apiKey: null,
  supportedModels: defaultModels,
  isLoading: false,
  error: null,
  conversation: {
    messages: [],
    isTyping: false,
    lastResponse: null,
  },
  translation: {
    isBusy: false,
    detectedLanguage: null,
    history: {},
  },
  sentiment: {
    isBusy: false,
    messageResults: {},
  },
  suggestions: {
    isBusy: false,
    smartReplies: [],
  },
  voiceTranscription: {
    isBusy: false,
    isEnabled: true,
    lastTranscription: null,
  },
};

export const aiSlice = createSlice({
  name: 'ai',
  initialState,
  reducers: {
    // Initialization
    setInitialized: (state, action: PayloadAction<boolean>) => {
      state.isInitialized = action.payload;
    },
    
    setApiKey: (state, action: PayloadAction<string | null>) => {
      state.apiKey = action.payload;
      // If we're setting a key, we're initialized
      if (action.payload) {
        state.isInitialized = true;
      }
    },
    
    selectModel: (state, action: PayloadAction<AIModelType>) => {
      state.selectedModel = action.payload;
    },
    
    // Model management
    addSupportedModel: (state, action: PayloadAction<AIModelConfig>) => {
      state.supportedModels.push(action.payload);
    },
    
    updateSupportedModel: (state, action: PayloadAction<{ id: string; changes: Partial<AIModelConfig> }>) => {
      const { id, changes } = action.payload;
      const modelIndex = state.supportedModels.findIndex(model => model.id === id);
      
      if (modelIndex !== -1) {
        state.supportedModels[modelIndex] = { 
          ...state.supportedModels[modelIndex], 
          ...changes 
        };
      }
    },
    
    removeSupportedModel: (state, action: PayloadAction<string>) => {
      state.supportedModels = state.supportedModels.filter(
        model => model.id !== action.payload
      );
    },
    
    // Loading/error state
    setLoading: (state, action: PayloadAction<boolean>) => {
      state.isLoading = action.payload;
    },
    
    setError: (state, action: PayloadAction<string | null>) => {
      state.error = action.payload;
    },
    
    // Conversation
    addMessage: (state, action: PayloadAction<AIMessage>) => {
      state.conversation.messages.push(action.payload);
    },
    
    clearConversation: (state) => {
      state.conversation.messages = [];
      state.conversation.lastResponse = null;
    },
    
    setTyping: (state, action: PayloadAction<boolean>) => {
      state.conversation.isTyping = action.payload;
    },
    
    setLastResponse: (state, action: PayloadAction<string | null>) => {
      state.conversation.lastResponse = action.payload;
    },
    
    // Translation
    setTranslationBusy: (state, action: PayloadAction<boolean>) => {
      state.translation.isBusy = action.payload;
    },
    
    setDetectedLanguage: (state, action: PayloadAction<string | null>) => {
      state.translation.detectedLanguage = action.payload;
    },
    
    addTranslation: (state, action: PayloadAction<{ 
      key: string; 
      translation: TranslationResponse;
    }>) => {
      state.translation.history[action.payload.key] = action.payload.translation;
    },
    
    // Sentiment analysis
    setSentimentBusy: (state, action: PayloadAction<boolean>) => {
      state.sentiment.isBusy = action.payload;
    },
    
    addSentimentResult: (state, action: PayloadAction<{
      messageId: string;
      result: SentimentAnalysisResult;
    }>) => {
      state.sentiment.messageResults[action.payload.messageId] = action.payload.result;
    },
    
    // Suggestions
    setSuggestionsBusy: (state, action: PayloadAction<boolean>) => {
      state.suggestions.isBusy = action.payload;
    },
    
    setSmartReplies: (state, action: PayloadAction<string[]>) => {
      state.suggestions.smartReplies = action.payload;
    },
    
    // Voice transcription
    setVoiceTranscriptionBusy: (state, action: PayloadAction<boolean>) => {
      state.voiceTranscription.isBusy = action.payload;
    },
    
    setVoiceTranscriptionEnabled: (state, action: PayloadAction<boolean>) => {
      state.voiceTranscription.isEnabled = action.payload;
    },
    
    setLastTranscription: (state, action: PayloadAction<string | null>) => {
      state.voiceTranscription.lastTranscription = action.payload;
    },
    
    // Reset state
    resetAIState: (state) => {
      return {
        ...initialState,
        supportedModels: state.supportedModels, // Preserve models list
      };
    },
  },
});

export const {
  setInitialized,
  setApiKey,
  selectModel,
  addSupportedModel,
  updateSupportedModel,
  removeSupportedModel,
  setLoading,
  setError,
  addMessage,
  clearConversation,
  setTyping,
  setLastResponse,
  setTranslationBusy,
  setDetectedLanguage,
  addTranslation,
  setSentimentBusy,
  addSentimentResult,
  setSuggestionsBusy,
  setSmartReplies,
  setVoiceTranscriptionBusy,
  setVoiceTranscriptionEnabled,
  setLastTranscription,
  resetAIState,
} = aiSlice.actions;

// Selectors
export const selectIsAIInitialized = (state: RootState) => state.ai.isInitialized;
export const selectSelectedAIModel = (state: RootState) => state.ai.selectedModel;
export const selectSupportedModels = (state: RootState) => state.ai.supportedModels;
export const selectAIError = (state: RootState) => state.ai.error;
export const selectAIIsLoading = (state: RootState) => state.ai.isLoading;
export const selectConversation = (state: RootState) => state.ai.conversation;
export const selectSmartReplies = (state: RootState) => state.ai.suggestions.smartReplies;
export const selectVoiceTranscriptionEnabled = (state: RootState) => 
  state.ai.voiceTranscription.isEnabled;

export default aiSlice.reducer; 