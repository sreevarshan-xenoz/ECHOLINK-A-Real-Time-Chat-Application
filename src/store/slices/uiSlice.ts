import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { RootState } from '../index';

export type ThemeType = 'light' | 'dark' | 'system';
export type SidebarView = 'chats' | 'groups' | 'github' | 'ai' | 'settings';

interface Notification {
  id: string;
  message: string;
  type: 'info' | 'success' | 'warning' | 'error';
  timestamp: number;
  duration?: number;
}

interface UIState {
  // Theme
  theme: ThemeType;
  
  // Sidebar
  sidebarOpen: boolean;
  sidebarView: SidebarView;
  
  // Modals
  activeModal: string | null;
  modalData: Record<string, any>;
  
  // Notifications
  notifications: Notification[];
  
  // App state
  isLoading: boolean;
  loadingText: string;
  
  // Panels
  isPanelOpen: boolean;
  activePanelId: string | null;
  
  // Mobile
  isMobileView: boolean;
  
  // Tour/Tutorial
  showTutorial: boolean;
  tutorialStep: number;
  
  // Search
  isSearchVisible: boolean;
  searchQuery: string;
  
  // UI Settings
  fontScale: number;
  messageGrouping: boolean;
  showTimestamps: boolean;
  showAvatars: boolean;
  showReadReceipts: boolean;
  codeEditorTheme: 'dark' | 'light';
}

// Initial state
const initialState: UIState = {
  theme: 'dark',
  sidebarOpen: true,
  sidebarView: 'chats',
  activeModal: null,
  modalData: {},
  notifications: [],
  isLoading: false,
  loadingText: '',
  isPanelOpen: false,
  activePanelId: null,
  isMobileView: window.innerWidth < 768,
  showTutorial: true,
  tutorialStep: 0,
  isSearchVisible: false,
  searchQuery: '',
  fontScale: 1,
  messageGrouping: true,
  showTimestamps: true,
  showAvatars: true,
  showReadReceipts: true,
  codeEditorTheme: 'dark',
};

export const uiSlice = createSlice({
  name: 'ui',
  initialState,
  reducers: {
    // Theme
    setTheme: (state, action: PayloadAction<ThemeType>) => {
      state.theme = action.payload;
      
      // Apply theme to document
      if (action.payload === 'system') {
        const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
        document.documentElement.setAttribute('data-theme', prefersDark ? 'dark' : 'light');
      } else {
        document.documentElement.setAttribute('data-theme', action.payload);
      }
    },
    
    // Sidebar
    setSidebarOpen: (state, action: PayloadAction<boolean>) => {
      state.sidebarOpen = action.payload;
    },
    
    setSidebarView: (state, action: PayloadAction<SidebarView>) => {
      state.sidebarView = action.payload;
    },
    
    // Modals
    openModal: (state, action: PayloadAction<{ id: string; data?: Record<string, any> }>) => {
      state.activeModal = action.payload.id;
      state.modalData = action.payload.data || {};
    },
    
    closeModal: (state) => {
      state.activeModal = null;
      state.modalData = {};
    },
    
    // Notifications
    addNotification: (state, action: PayloadAction<Omit<Notification, 'id' | 'timestamp'>>) => {
      const id = Date.now().toString();
      state.notifications.push({
        ...action.payload,
        id,
        timestamp: Date.now(),
        duration: action.payload.duration || 5000, // Default 5 seconds
      });
    },
    
    removeNotification: (state, action: PayloadAction<string>) => {
      state.notifications = state.notifications.filter((n) => n.id !== action.payload);
    },
    
    // Loading
    setLoading: (state, action: PayloadAction<{ isLoading: boolean; text?: string }>) => {
      state.isLoading = action.payload.isLoading;
      state.loadingText = action.payload.text || '';
    },
    
    // Panels
    setPanel: (state, action: PayloadAction<{ isOpen: boolean; panelId?: string | null }>) => {
      state.isPanelOpen = action.payload.isOpen;
      state.activePanelId = action.payload.panelId || null;
    },
    
    // Mobile
    setIsMobileView: (state, action: PayloadAction<boolean>) => {
      state.isMobileView = action.payload;
      
      // Auto-close sidebar on mobile
      if (action.payload && state.sidebarOpen) {
        state.sidebarOpen = false;
      }
    },
    
    // Tutorial
    setShowTutorial: (state, action: PayloadAction<boolean>) => {
      state.showTutorial = action.payload;
    },
    
    setTutorialStep: (state, action: PayloadAction<number>) => {
      state.tutorialStep = action.payload;
    },
    
    // Search
    setSearchVisible: (state, action: PayloadAction<boolean>) => {
      state.isSearchVisible = action.payload;
    },
    
    setSearchQuery: (state, action: PayloadAction<string>) => {
      state.searchQuery = action.payload;
    },
    
    // UI Settings
    updateUISettings: (state, action: PayloadAction<Partial<{
      fontScale: number;
      messageGrouping: boolean;
      showTimestamps: boolean;
      showAvatars: boolean;
      showReadReceipts: boolean;
      codeEditorTheme: 'dark' | 'light';
    }>>) => {
      return { ...state, ...action.payload };
    },
  },
});

// Export actions
export const {
  setTheme,
  setSidebarOpen,
  setSidebarView,
  openModal,
  closeModal,
  addNotification,
  removeNotification,
  setLoading,
  setPanel,
  setIsMobileView,
  setShowTutorial,
  setTutorialStep,
  setSearchVisible,
  setSearchQuery,
  updateUISettings,
} = uiSlice.actions;

// Selectors
export const selectTheme = (state: RootState) => state.ui.theme;
export const selectIsMobileView = (state: RootState) => state.ui.isMobileView;
export const selectActiveModal = (state: RootState) => state.ui.activeModal;
export const selectModalData = (state: RootState) => state.ui.modalData;
export const selectNotifications = (state: RootState) => state.ui.notifications;
export const selectSidebarView = (state: RootState) => state.ui.sidebarView;
export const selectSidebarOpen = (state: RootState) => state.ui.sidebarOpen;
export const selectIsLoading = (state: RootState) => state.ui.isLoading;
export const selectLoadingText = (state: RootState) => state.ui.loadingText;
export const selectActivePanel = (state: RootState) => ({
  isOpen: state.ui.isPanelOpen,
  id: state.ui.activePanelId,
});
export const selectTutorial = (state: RootState) => ({
  show: state.ui.showTutorial,
  step: state.ui.tutorialStep,
});
export const selectSearch = (state: RootState) => ({
  isVisible: state.ui.isSearchVisible,
  query: state.ui.searchQuery,
});
export const selectUISettings = (state: RootState) => ({
  fontScale: state.ui.fontScale,
  messageGrouping: state.ui.messageGrouping,
  showTimestamps: state.ui.showTimestamps,
  showAvatars: state.ui.showAvatars,
  showReadReceipts: state.ui.showReadReceipts,
  codeEditorTheme: state.ui.codeEditorTheme,
});

export default uiSlice.reducer; 