// libp2p-client.js
    import { createLibp2p } from 'libp2p';
    import { WebSockets } from '@libp2p/websockets';
    import { Noise } from '@chainsafe/libp2p-noise';
    import { Mplex } from '@libp2p/mplex';
    import { Bootstrap } from '@libp2p/bootstrap';
    import { TCP } from '@libp2p/tcp';

    async function createNode() {
      const node = await createLibp2p({
        transports: [new WebSockets(), new TCP()],
        connectionEncryption: [new Noise()],
        streamMuxers: [new Mplex()],
        peerDiscovery: [
          new Bootstrap({
            list: [
              // Add bootstrap nodes here
            ],
          }),
        ],
      });

      console.log('libp2p node has started', node.peerId.toString());

      node.addEventListener('peer:discovery', (evt) => {
        console.log('Discovered:', evt.detail.id.toString());
      });

      node.addEventListener('peer:connect', (evt) => {
        console.log('Connected to:', evt.detail.toString());
      });

      return node;
    }

    export { createNode };