import { createSlice, PayloadAction, createEntityAdapter } from '@reduxjs/toolkit';
import { Message, MessageEdit, Reaction, TranslationState } from '../../types/message';
import { RootState } from '../index';

// Create an entity adapter for messages
const messagesAdapter = createEntityAdapter<Message>({
  selectId: (message) => message.id,
  sortComparer: (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime(),
});

// Define additional state
interface MessagesState {
  activeConversationId: string | null;
  isLoading: boolean;
  error: string | null;
  typing: Record<string, boolean>;
  translations: TranslationState;
  lastRead: Record<string, string>; // conversationId -> last message timestamp read
  searchQuery: string;
  searchResults: string[]; // message IDs
  offline: {
    queuedMessages: Message[];
    isSyncing: boolean;
  };
}

// Initial state with normalized messages
const initialState = messagesAdapter.getInitialState<MessagesState>({
  activeConversationId: null,
  isLoading: false,
  error: null,
  typing: {},
  translations: {},
  lastRead: {},
  searchQuery: '',
  searchResults: [],
  offline: {
    queuedMessages: [],
    isSyncing: false,
  },
});

export const messagesSlice = createSlice({
  name: 'messages',
  initialState,
  reducers: {
    // Add one message
    addMessage: messagesAdapter.addOne,
    
    // Add many messages (bulk)
    addMessages: messagesAdapter.addMany,
    
    // Update a message
    updateMessage: messagesAdapter.updateOne,
    
    // Update many messages
    updateMessages: messagesAdapter.updateMany,
    
    // Remove a message
    removeMessage: messagesAdapter.removeOne,
    
    // Set all messages (replace existing)
    setAllMessages: messagesAdapter.setAll,
    
    // Set active conversation
    setActiveConversation: (state, action: PayloadAction<string | null>) => {
      state.activeConversationId = action.payload;
    },
    
    // Set loading state
    setLoading: (state, action: PayloadAction<boolean>) => {
      state.isLoading = action.payload;
    },
    
    // Set error state
    setError: (state, action: PayloadAction<string | null>) => {
      state.error = action.payload;
    },
    
    // Add a reaction to a message
    addReaction: (state, action: PayloadAction<{ messageId: string, reaction: Reaction }>) => {
      const { messageId, reaction } = action.payload;
      const message = state.entities[messageId];
      
      if (message) {
        message.reactions = [...(message.reactions || []), reaction];
      }
    },
    
    // Set typing status for a peer
    setTypingStatus: (state, action: PayloadAction<{ peerId: string, isTyping: boolean }>) => {
      const { peerId, isTyping } = action.payload;
      state.typing[peerId] = isTyping;
    },
    
    // Add translation for a message
    addTranslation: (state, action: PayloadAction<{ messageId: string, translation: string }>) => {
      const { messageId, translation } = action.payload;
      state.translations[messageId] = translation;
    },
    
    // Set last read timestamp for a conversation
    setLastRead: (state, action: PayloadAction<{ conversationId: string, timestamp: string }>) => {
      const { conversationId, timestamp } = action.payload;
      state.lastRead[conversationId] = timestamp;
    },
    
    // Set search query
    setSearchQuery: (state, action: PayloadAction<string>) => {
      state.searchQuery = action.payload;
    },
    
    // Set search results
    setSearchResults: (state, action: PayloadAction<string[]>) => {
      state.searchResults = action.payload;
    },
    
    // Add a queued offline message
    addQueuedMessage: (state, action: PayloadAction<Message>) => {
      state.offline.queuedMessages.push(action.payload);
    },
    
    // Remove a queued message after it's sent
    removeQueuedMessage: (state, action: PayloadAction<string>) => {
      state.offline.queuedMessages = state.offline.queuedMessages.filter(
        (msg) => msg.id !== action.payload
      );
    },
    
    // Set syncing state
    setSyncing: (state, action: PayloadAction<boolean>) => {
      state.offline.isSyncing = action.payload;
    },
  },
});

// Export actions
export const {
  addMessage,
  addMessages,
  updateMessage,
  updateMessages,
  removeMessage,
  setAllMessages,
  setActiveConversation,
  setLoading,
  setError,
  addReaction,
  setTypingStatus,
  addTranslation,
  setLastRead,
  setSearchQuery,
  setSearchResults,
  addQueuedMessage,
  removeQueuedMessage,
  setSyncing,
} = messagesSlice.actions;

// Export the reusable selectors
export const {
  selectAll: selectAllMessages,
  selectById: selectMessageById,
  selectIds: selectMessageIds,
} = messagesAdapter.getSelectors<RootState>((state) => state.messages);

// Additional selectors
export const selectActiveConversationMessages = (state: RootState) => {
  const activePeerId = state.messages.activeConversationId;
  if (!activePeerId) return [];
  
  return selectAllMessages(state).filter(
    (message) => 
      message.sender === activePeerId || 
      message.receiverId === activePeerId || 
      message.groupId === activePeerId
  );
};

export default messagesSlice.reducer; 