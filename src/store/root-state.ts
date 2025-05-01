import { AIState } from './slices/aiSlice';
import { GitHubState } from './slices/githubSlice';
import { MessagesState } from './slices/messagesSlice';
import { PeersState } from './slices/peersSlice';
import { UIState } from './slices/uiSlice';
import { UserState } from './slices/userSlice';

// Define the shape of the root state
export interface RootState {
  user: UserState;
  messages: MessagesState;
  peers: PeersState;
  github: GitHubState;
  ui: UIState;
  ai: AIState;
} 