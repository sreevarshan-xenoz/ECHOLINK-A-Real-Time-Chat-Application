export interface User {
  id: string;
  displayName?: string;
  avatarUrl?: string;
  status?: UserStatus;
  lastSeen?: string;
  preferences?: UserPreferences;
}

export type UserStatus = 'online' | 'offline' | 'away' | 'busy' | 'invisible';

export interface UserPreferences {
  theme: 'light' | 'dark' | 'system';
  notifications: boolean;
  language: string;
  encryption: boolean;
  autoTranslate: boolean;
  fontScale: number;
  messageHistory: boolean;
}

export interface UserProfile extends User {
  email?: string;
  bio?: string;
  location?: string;
  createdAt?: string;
  connections?: string[];
  githubUsername?: string;
  badges?: string[];
} 