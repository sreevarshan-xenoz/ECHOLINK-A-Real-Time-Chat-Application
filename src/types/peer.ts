import { User } from './user';

export interface Peer {
  id: string;
  connection: RTCPeerConnection;
  dataChannel?: RTCDataChannel;
  status: PeerConnectionStatus;
  userInfo?: User;
  lastActivity?: string;
  unreadCount?: number;
  isTyping?: boolean;
  encryptionKey?: string;
}

export type PeerConnectionStatus = 
  | 'connecting' 
  | 'connected' 
  | 'disconnected' 
  | 'failed' 
  | 'closed';

export interface PeerGroup {
  id: string;
  name: string;
  members: string[];
  createdAt: string;
  createdBy: string;
  isEncrypted: boolean;
  lastActivity?: string;
  unreadCount?: number;
}

export interface PeerSignal {
  type: 'offer' | 'answer' | 'ice-candidate';
  sender: string;
  recipient: string;
  sessionId?: string;
  data: any;
  timestamp: string;
} 