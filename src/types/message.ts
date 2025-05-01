import { User } from './user';

export type MessageStatus = 'sending' | 'sent' | 'delivered' | 'read' | 'error' | 'queued';
export type MessageType = 'TEXT' | 'FILE_META' | 'REACTION' | 'VOICE' | 'CODE' | 'SYSTEM';

export interface Reaction {
  emoji: string;
  userId: string;
  timestamp: string;
}

export interface Message {
  id: string;
  text?: string;
  type: MessageType;
  sender: string;
  timestamp: string;
  status: MessageStatus;
  reactions?: Reaction[];
  offline?: boolean;
  edited?: boolean;
  editHistory?: string[];
  receiverId?: string;
  groupId?: string;
  fileMetadata?: FileMetadata;
  codeMetadata?: CodeMetadata;
  voiceMetadata?: VoiceMetadata;
}

export interface FileMetadata {
  name: string;
  size: number;
  type: string;
  url?: string;
}

export interface CodeMetadata {
  language: string;
  code: string;
  isCollaborative?: boolean;
}

export interface VoiceMetadata {
  duration: number;
  url?: string;
  transcription?: string;
}

export interface MessageWithSenderInfo extends Message {
  senderInfo?: User;
}

export interface MessageEdit {
  messageId: string;
  newContent: string;
  timestamp: string;
}

export interface TranslationState {
  [messageId: string]: string;
} 