import { configureStore } from '@reduxjs/toolkit';
import userReducer from './slices/userSlice';
import messagesReducer from './slices/messagesSlice';
import peersReducer from './slices/peersSlice';
import githubReducer from './slices/githubSlice';
import uiReducer from './slices/uiSlice';
import aiReducer from './slices/aiSlice';

// Create the store with the proper reducer structure
export const store = configureStore({
  reducer: {
    user: userReducer,
    messages: messagesReducer,
    peers: peersReducer,
    github: githubReducer,
    ui: uiReducer,
    ai: aiReducer,
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: {
        // Ignore these paths in the state
        ignoredActions: ['peers/setPeerConnection', 'peers/setDataChannel'],
        ignoredPaths: ['peers.connections', 'peers.dataChannels'],
      },
    }),
});

// Infer types from the store itself
export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch; 