import { create } from 'ipfs-http-client';
import { Buffer } from 'buffer';

class IPFSService {
    constructor() {
        this.node = null;
        this.pubsub = null;
        this.subscribers = new Map();
        this.TOPIC = 'p2p-chat-app';
        this.gateway = 'https://ipfs.io/ipfs/';
        
        // Use Infura's IPFS gateway
        this.projectId = 'YOUR_INFURA_PROJECT_ID';
        this.projectSecret = 'YOUR_INFURA_PROJECT_SECRET';
        this.auth = 'Basic ' + Buffer.from(this.projectId + ':' + this.projectSecret).toString('base64');
    }

    async initialize() {
        try {
            // Initialize IPFS client using Infura
            this.node = create({
                host: 'ipfs.infura.io',
                port: 5001,
                protocol: 'https',
                headers: {
                    authorization: this.auth,
                }
            });

            // Subscribe to pubsub topic
            await this.node.pubsub.subscribe(this.TOPIC, this.handleMessage.bind(this));

            console.log('IPFS Service initialized');
            return true;
        } catch (error) {
            console.error('Failed to initialize IPFS:', error);
            throw error;
        }
    }

    async getId() {
        try {
            if (!this.node) return null;
            const { agentVersion, id } = await this.node.id();
            return id;
        } catch (error) {
            console.error('Error getting IPFS ID:', error);
            return null;
        }
    }

    handleMessage(message) {
        try {
            const data = JSON.parse(new TextDecoder().decode(message.data));
            const subscribers = this.subscribers.get(data.type) || [];
            subscribers.forEach(callback => callback(data));
        } catch (error) {
            console.error('Error handling IPFS message:', error);
        }
    }

    subscribe(type, callback) {
        if (!this.subscribers.has(type)) {
            this.subscribers.set(type, new Set());
        }
        this.subscribers.get(type).add(callback);
        return () => this.subscribers.get(type).delete(callback);
    }

    async publish(data) {
        if (!this.node) return;
        const message = new TextEncoder().encode(JSON.stringify(data));
        await this.node.pubsub.publish(this.TOPIC, message);
    }

    async uploadFile(file) {
        try {
            const buffer = await file.arrayBuffer();
            const result = await this.node.add({
                path: file.name,
                content: Buffer.from(buffer)
            });

            const gatewayUrl = `${this.gateway}${result.path}`;
            
            return {
                cid: result.path,
                name: file.name,
                size: file.size,
                gatewayUrl,
                type: file.type
            };
        } catch (error) {
            console.error('Error uploading file to IPFS:', error);
            throw error;
        }
    }

    async downloadFile(cid, filename) {
        try {
            const url = `${this.gateway}${cid}`;
            const response = await fetch(url);
            const blob = await response.blob();
            const downloadUrl = URL.createObjectURL(blob);
            
            const a = document.createElement('a');
            a.href = downloadUrl;
            a.download = filename;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(downloadUrl);
        } catch (error) {
            console.error('Error downloading file from IPFS:', error);
            throw error;
        }
    }

    async getPeers() {
        if (!this.node) return [];
        const peers = await this.node.swarm.peers();
        return peers.map(peer => peer.peer.toString());
    }

    async connectToPeer(multiaddr) {
        try {
            await this.node.swarm.connect(multiaddr);
            return true;
        } catch (error) {
            console.error('Error connecting to peer:', error);
            return false;
        }
    }

    async getStats() {
        if (!this.node) return null;
        const stats = await this.node.stats.bw();
        return {
            totalIn: stats.totalIn,
            totalOut: stats.totalOut,
            rateIn: stats.rateIn,
            rateOut: stats.rateOut
        };
    }

    async pinFile(cid) {
        try {
            await this.node.pin.add(cid);
            return true;
        } catch (error) {
            console.error('Error pinning file:', error);
            return false;
        }
    }

    async unpinFile(cid) {
        try {
            await this.node.pin.rm(cid);
            return true;
        } catch (error) {
            console.error('Error unpinning file:', error);
            return false;
        }
    }

    async getPinnedFiles() {
        try {
            const pins = [];
            for await (const pin of this.node.pin.ls()) {
                pins.push(pin);
            }
            return pins;
        } catch (error) {
            console.error('Error getting pinned files:', error);
            return [];
        }
    }

    stop() {
        this.node = null;
    }
}

export const ipfsService = new IPFSService(); 