import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { User, UserPreferences, UserProfile } from '../../types/user';

interface UserState {
  currentUser: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
  profile: UserProfile | null;
  preferences: UserPreferences;
}

const initialPreferences: UserPreferences = {
  theme: 'dark',
  notifications: true,
  language: navigator.language.split('-')[0],
  encryption: true,
  autoTranslate: false,
  fontScale: 1,
  messageHistory: true,
};

const initialState: UserState = {
  currentUser: null,
  isAuthenticated: false,
  isLoading: false,
  error: null,
  profile: null,
  preferences: initialPreferences,
};

export const userSlice = createSlice({
  name: 'user',
  initialState,
  reducers: {
    setCurrentUser: (state, action: PayloadAction<User | null>) => {
      state.currentUser = action.payload;
      state.isAuthenticated = !!action.payload;
    },
    setLoading: (state, action: PayloadAction<boolean>) => {
      state.isLoading = action.payload;
    },
    setError: (state, action: PayloadAction<string | null>) => {
      state.error = action.payload;
    },
    setUserProfile: (state, action: PayloadAction<UserProfile>) => {
      state.profile = action.payload;
    },
    updateUserPreferences: (state, action: PayloadAction<Partial<UserPreferences>>) => {
      state.preferences = { ...state.preferences, ...action.payload };
    },
    logout: (state) => {
      state.currentUser = null;
      state.isAuthenticated = false;
      state.profile = null;
      // Persist preferences
    },
  },
});

export const {
  setCurrentUser,
  setLoading,
  setError,
  setUserProfile,
  updateUserPreferences,
  logout,
} = userSlice.actions;

export default userSlice.reducer; 