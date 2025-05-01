import { createSlice, PayloadAction, createEntityAdapter } from '@reduxjs/toolkit';
import { Peer, PeerConnectionStatus, PeerGroup } from '../../types/peer';
import { RootState } from '../index';

// Create entity adapters for peers and groups
const peersAdapter = createEntityAdapter<Peer>({
  selectId: peer => peer.id,
});

const groupsAdapter = createEntityAdapter<PeerGroup>({
  selectId: group => group.id,
  sortComparer: (a, b) => a.name.localeCompare(b.name),
});

interface PeersState {
  // Non-serializable data stored outside Redux
  connections: Record<string, RTCPeerConnection>;
  dataChannels: Record<string, RTCDataChannel>;
  
  // Other peer state
  selectedPeerId: string | null;
  selectedGroupId: string | null;
  isConnecting: boolean;
  error: string | null;
  
  // Discovery
  discoveredPeers: string[];
  isPeerDiscoveryEnabled: boolean;
  
  // Groups state from the adapter
  groups: ReturnType<typeof groupsAdapter.getInitialState>;
}

// Initial peers state
const initialState = peersAdapter.getInitialState<PeersState>({
  connections: {},
  dataChannels: {},
  selectedPeerId: null,
  selectedGroupId: null,
  isConnecting: false,
  error: null,
  discoveredPeers: [],
  isPeerDiscoveryEnabled: true,
  groups: groupsAdapter.getInitialState(),
});

export const peersSlice = createSlice({
  name: 'peers',
  initialState,
  reducers: {
    // Peer entity operations
    addPeer: peersAdapter.addOne,
    addPeers: peersAdapter.addMany,
    updatePeer: peersAdapter.updateOne,
    removePeer: peersAdapter.removeOne,
    
    // Selection
    setSelectedPeer: (state, action: PayloadAction<string | null>) => {
      state.selectedPeerId = action.payload;
      if (action.payload) {
        state.selectedGroupId = null;
      }
    },
    
    setSelectedGroup: (state, action: PayloadAction<string | null>) => {
      state.selectedGroupId = action.payload;
      if (action.payload) {
        state.selectedPeerId = null;
      }
    },
    
    // Connection status
    setPeerConnection: (state, action: PayloadAction<{ 
      peerId: string; 
      connection: RTCPeerConnection;
    }>) => {
      const { peerId, connection } = action.payload;
      // Store non-serializable connection outside Redux
      state.connections[peerId] = connection;
      
      // Update serializable peer info
      const existingPeer = state.entities[peerId];
      if (existingPeer) {
        existingPeer.status = 'connecting';
      } else {
        // Add a new peer entry if it doesn't exist
        peersAdapter.addOne(state, {
          id: peerId,
          connection,
          status: 'connecting',
        });
      }
    },
    
    setDataChannel: (state, action: PayloadAction<{
      peerId: string;
      dataChannel: RTCDataChannel;
    }>) => {
      const { peerId, dataChannel } = action.payload;
      state.dataChannels[peerId] = dataChannel;
      
      // Update peer status
      const peer = state.entities[peerId];
      if (peer) {
        peer.status = 'connected';
      }
    },
    
    updatePeerStatus: (state, action: PayloadAction<{
      peerId: string;
      status: PeerConnectionStatus;
    }>) => {
      const { peerId, status } = action.payload;
      const peer = state.entities[peerId];
      if (peer) {
        peer.status = status;
      }
    },
    
    // Connection lifecycle
    setConnecting: (state, action: PayloadAction<boolean>) => {
      state.isConnecting = action.payload;
    },
    
    setError: (state, action: PayloadAction<string | null>) => {
      state.error = action.payload;
    },
    
    // Peer discovery
    addDiscoveredPeer: (state, action: PayloadAction<string>) => {
      if (!state.discoveredPeers.includes(action.payload)) {
        state.discoveredPeers.push(action.payload);
      }
    },
    
    removeDiscoveredPeer: (state, action: PayloadAction<string>) => {
      state.discoveredPeers = state.discoveredPeers.filter(id => id !== action.payload);
    },
    
    setIsPeerDiscoveryEnabled: (state, action: PayloadAction<boolean>) => {
      state.isPeerDiscoveryEnabled = action.payload;
    },
    
    // Group operations
    addGroup: (state, action: PayloadAction<PeerGroup>) => {
      groupsAdapter.addOne(state.groups, action.payload);
    },
    
    updateGroup: (state, action: PayloadAction<{
      id: string;
      changes: Partial<PeerGroup>;
    }>) => {
      groupsAdapter.updateOne(state.groups, action.payload);
    },
    
    removeGroup: (state, action: PayloadAction<string>) => {
      groupsAdapter.removeOne(state.groups, action.payload);
      
      // If the removed group was selected, deselect it
      if (state.selectedGroupId === action.payload) {
        state.selectedGroupId = null;
      }
    },
    
    // Reset state when disconnecting
    resetPeerState: state => {
      peersAdapter.removeAll(state);
      state.connections = {};
      state.dataChannels = {};
      state.selectedPeerId = null;
      state.selectedGroupId = null;
      state.isConnecting = false;
      state.error = null;
      state.discoveredPeers = [];
    },
  },
});

// Export actions
export const {
  addPeer,
  addPeers,
  updatePeer,
  removePeer,
  setSelectedPeer,
  setSelectedGroup,
  setPeerConnection,
  setDataChannel,
  updatePeerStatus,
  setConnecting,
  setError,
  addDiscoveredPeer,
  removeDiscoveredPeer,
  setIsPeerDiscoveryEnabled,
  addGroup,
  updateGroup,
  removeGroup,
  resetPeerState,
} = peersSlice.actions;

// Export peer selectors
export const {
  selectAll: selectAllPeers,
  selectById: selectPeerById,
  selectIds: selectPeerIds,
} = peersAdapter.getSelectors<RootState>((state) => state.peers);

// Export group selectors
export const {
  selectAll: selectAllGroups,
  selectById: selectGroupById,
  selectIds: selectGroupIds,
} = groupsAdapter.getSelectors<RootState>((state) => state.peers.groups);

// Additional selectors
export const selectConnectedPeers = (state: RootState) => 
  selectAllPeers(state).filter(peer => peer.status === 'connected');

export const selectSelectedPeer = (state: RootState) => 
  state.peers.selectedPeerId ? selectPeerById(state, state.peers.selectedPeerId) : null;

export const selectSelectedGroup = (state: RootState) => 
  state.peers.selectedGroupId ? selectGroupById(state, state.peers.selectedGroupId) : null;

export default peersSlice.reducer; 