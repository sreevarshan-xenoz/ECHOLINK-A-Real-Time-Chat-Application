import { createLibp2p } from 'libp2p';
import { noise } from '@chainsafe/libp2p-noise';
import { yamux } from '@chainsafe/libp2p-yamux';
import { tcp } from '@libp2p/tcp';
import { webSockets } from '@libp2p/websockets';
import { bootstrap } from '@libp2p/bootstrap';
import { pipe } from 'it-pipe';
import { fromString, toString } from 'uint8arrays';

class P2PService {
    constructor() {
        this.node = null;
        this.peers = new Map();
        this.messageHandlers = new Set();
    }

    async init() {
        try {
            this.node = await createLibp2p({
                transports: [
                    tcp(),
                    webSockets()
                ],
                connectionEncryption: [noise()],
                streamMuxers: [yamux()],
                peerDiscovery: [
                    bootstrap({
                        list: [
                            '/dnsaddr/bootstrap.libp2p.io/p2p/QmNnooDu7bfjPFoTZYxMNLWUQJyrVwtbZg5gBMjTezGAJN',
                            '/dnsaddr/bootstrap.libp2p.io/p2p/QmQCU2EcMqAqQPR2i9bChDtGNJchTbq5TbXJJ16u19uLTa'
                        ]
                    })
                ],
                addresses: {
                    listen: [
                        '/ip4/0.0.0.0/tcp/0',
                        '/ip4/0.0.0.0/tcp/0/ws'
                    ]
                }
            });

            await this.node.start();
            console.log('P2P node started with ID:', this.node.peerId.toString());

            // Handle peer discovery
            this.node.addEventListener('peer:discovery', (evt) => {
                const peer = evt.detail;
                console.log('Discovered peer:', peer.id.toString());
            });

            // Handle incoming connections
            this.node.addEventListener('peer:connect', (evt) => {
                const peerId = evt.detail.toString();
                console.log('Connected to:', peerId);
                this.peers.set(peerId, evt.detail);
                this.broadcastPeerUpdate();
            });

            // Handle disconnections
            this.node.addEventListener('peer:disconnect', (evt) => {
                const peerId = evt.detail.toString();
                console.log('Disconnected from:', peerId);
                this.peers.delete(peerId);
                this.broadcastPeerUpdate();
            });

            // Handle incoming messages
            await this.node.handle('/chat/1.0.0', async ({ stream }) => {
                try {
                    await pipe(
                        stream,
                        async function* (source) {
                            for await (const msg of source) {
                                const message = JSON.parse(toString(msg.subarray()));
                                this.messageHandlers.forEach(handler => handler(message));
                                yield msg;
                            }
                        }.bind(this)
                    );
                } catch (err) {
                    console.error('Error handling message:', err);
                }
            });

        } catch (err) {
            console.error('Failed to initialize P2P node:', err);
            throw err;
        }
    }

    async sendMessage(message) {
        const msgData = fromString(JSON.stringify(message));
        
        for (const peer of this.peers.values()) {
            try {
                const stream = await this.node.dialProtocol(peer, '/chat/1.0.0');
                await pipe([msgData], stream);
            } catch (err) {
                console.error(`Error sending message to ${peer.toString()}:`, err);
            }
        }
    }

    async connectToPeer(multiaddr) {
        try {
            const connection = await this.node.dial(multiaddr);
            console.log('Connected to peer:', connection.remotePeer.toString());
            return connection.remotePeer.toString();
        } catch (err) {
            console.error('Failed to connect to peer:', err);
            throw err;
        }
    }

    onMessage(handler) {
        this.messageHandlers.add(handler);
        return () => this.messageHandlers.delete(handler);
    }

    broadcastPeerUpdate() {
        const peerList = Array.from(this.peers.keys());
        this.messageHandlers.forEach(handler => 
            handler({ type: 'PEER_UPDATE', peers: peerList })
        );
    }

    getPeers() {
        return Array.from(this.peers.keys());
    }

    getMultiaddr() {
        if (!this.node) return null;
        return this.node.getMultiaddrs().map(ma => ma.toString());
    }

    async stop() {
        if (this.node) {
            await this.node.stop();
            this.peers.clear();
            this.messageHandlers.clear();
        }
    }
}

export const p2pService = new P2PService(); 