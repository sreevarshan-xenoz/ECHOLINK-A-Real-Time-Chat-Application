import { createSlice, PayloadAction } from '@reduxjs/toolkit';

export interface UserUnlocks {
  aiUnlocked: boolean;
  collaborativeWhiteboard: boolean;
  codeEditor: boolean;
  fileSharing: boolean;
  voiceMessages: boolean;
  githubIntegration: boolean;
}

export interface UserPreferences {
  theme: 'light' | 'dark' | 'auto';
  aiDefaultModel: 'openai' | 'gemini' | 'ollama';
  messageDensity: 'compact' | 'comfortable' | 'spacious';
  animationLevel: 'none' | 'reduced' | 'full';
  notifications: {
    sound: boolean;
    desktop: boolean;
    email: boolean;
  };
}

export interface UserState {
  id: string | null;
  email: string | null;
  name: string | null;
  avatar: string | null;
  isAuthenticated: boolean;
  unlocks: UserUnlocks;
  preferences: UserPreferences;
  stats: {
    messagesSent: number;
    peersConnected: number;
    aiInteractions: number;
    collaborationSessions: number;
  };
  onboardingCompleted: boolean;
  tourSeen: boolean;
}

const initialState: UserState = {
  id: null,
  email: null,
  name: null,
  avatar: null,
  isAuthenticated: false,
  unlocks: {
    aiUnlocked: false,
    collaborativeWhiteboard: false,
    codeEditor: false,
    fileSharing: false,
    voiceMessages: false,
    githubIntegration: false,
  },
  preferences: {
    theme: 'dark',
    aiDefaultModel: 'openai',
    messageDensity: 'comfortable',
    animationLevel: 'full',
    notifications: {
      sound: true,
      desktop: true,
      email: false,
    },
  },
  stats: {
    messagesSent: 0,
    peersConnected: 0,
    aiInteractions: 0,
    collaborationSessions: 0,
  },
  onboardingCompleted: false,
  tourSeen: false,
};

const userSlice = createSlice({
  name: 'user',
  initialState,
  reducers: {
    setUser: (state, action: PayloadAction<{
      id: string;
      email: string;
      name?: string;
      avatar?: string;
    }>) => {
      state.id = action.payload.id;
      state.email = action.payload.email;
      state.name = action.payload.name || null;
      state.avatar = action.payload.avatar || null;
      state.isAuthenticated = true;
    },

    clearUser: (state) => {
      state.id = null;
      state.email = null;
      state.name = null;
      state.avatar = null;
      state.isAuthenticated = false;
    },

    unlockFeature: (state, action: PayloadAction<keyof UserUnlocks>) => {
      state.unlocks[action.payload] = true;
    },

    updatePreferences: (state, action: PayloadAction<Partial<UserPreferences>>) => {
      state.preferences = { ...state.preferences, ...action.payload };
    },

    incrementStat: (state, action: PayloadAction<keyof UserState['stats']>) => {
      state.stats[action.payload] += 1;
    },

    setOnboardingCompleted: (state, action: PayloadAction<boolean>) => {
      state.onboardingCompleted = action.payload;
    },

    setTourSeen: (state, action: PayloadAction<boolean>) => {
      state.tourSeen = action.payload;
    },

    // Progressive unlock triggers
    triggerFirstMessage: (state) => {
      state.unlocks.aiUnlocked = true;
      state.stats.messagesSent += 1;
    },

    triggerPeerConnection: (state) => {
      state.unlocks.fileSharing = true;
      state.unlocks.voiceMessages = true;
      state.stats.peersConnected += 1;
    },

    triggerAIInteraction: (state) => {
      state.stats.aiInteractions += 1;
    },

    triggerCollaboration: (state) => {
      state.unlocks.collaborativeWhiteboard = true;
      state.unlocks.codeEditor = true;
      state.stats.collaborationSessions += 1;
    },
  },
});

export const {
  setUser,
  clearUser,
  unlockFeature,
  updatePreferences,
  incrementStat,
  setOnboardingCompleted,
  setTourSeen,
  triggerFirstMessage,
  triggerPeerConnection,
  triggerAIInteraction,
  triggerCollaboration,
} = userSlice.actions;

export default userSlice.reducer;