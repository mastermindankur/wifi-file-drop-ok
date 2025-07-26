'use client';
import { useState, useEffect, useRef, useCallback } from 'react';
import Peer from 'simple-peer';
import { db } from '@/lib/firebase';
import { ref, onValue, set, onDisconnect, push, child } from 'firebase/database';

export interface Device {
  id: string;
  name: string;
  type: 'laptop' | 'phone';
}

export interface ReceivedFile {
    id: string;
    name: string;
    size: number;
    type: string;
    date: string;
    dataUrl: string;
}

const PEERS_REF = 'peers';
const SIGNALS_REF = 'signals';

export function usePeer(onFileReceived: (file: ReceivedFile) => void) {
  const [myId, setMyId] = useState<string | null>(null);
  const [devices, setDevices] = useState<Device[]>([]);
  const peersRef = useRef<{ [key: string]: Peer.Instance }>({});

  const myDevice = useRef<Device>({
    id: '',
    name: `Device-${Math.random().toString(36).substring(2, 7)}`,
    type: Math.random() > 0.5 ? 'laptop' : 'phone',
  });

  const handleSignal = useCallback((data: any, peerId: string) => {
    const signalRef = push(ref(db, `${SIGNALS_REF}/${peerId}`));
    set(signalRef, {
      sender: myId,
      data: data,
    });
  }, [myId]);

  const createPeer = useCallback((peerId: string, initiator: boolean) => {
    // Avoid creating duplicate peers
    if (peersRef.current[peerId]) {
      return peersRef.current[peerId];
    }
    
    const peer = new Peer({
      initiator: initiator,
      trickle: false, // Set to false to send one single signal event
    });

    peer.on('signal', (data) => {
      handleSignal(data, peerId);
    });

    peer.on('data', (data) => {
        try {
            const fileData = JSON.parse(data.toString());
            const blob = new Blob([fileData.chunk], { type: fileData.type });
            const dataUrl = URL.createObjectURL(blob);
            
            const newFile: ReceivedFile = {
              id: fileData.id,
              name: fileData.name,
              size: fileData.size,
              type: fileData.type,
              date: new Date().toLocaleDateString(),
              dataUrl: dataUrl
            };
            onFileReceived(newFile);
        } catch(e) {
            console.error("Error receiving data", e);
        }
    });
    
    peer.on('error', (err) => console.error('Peer error:', peerId, err));
    peer.on('connect', () => console.log('Peer connected:', peerId));
    peer.on('close', () => {
        console.log("closing peer", peerId);
        delete peersRef.current[peerId];
    });


    peersRef.current[peerId] = peer;
    return peer;
  }, [handleSignal, onFileReceived]);

  useEffect(() => {
    const newPeerId = push(ref(db, PEERS_REF)).key;
    if (newPeerId) {
        setMyId(newPeerId);
        myDevice.current.id = newPeerId;
        const peerRef = ref(db, `${PEERS_REF}/${newPeerId}`);
        onDisconnect(peerRef).remove();
        set(peerRef, myDevice.current);
    }

    return () => {
        if(newPeerId) {
            set(ref(db, `${PEERS_REF}/${newPeerId}`), null);
        }
    }
  }, []);

  useEffect(() => {
    if (!myId) return;

    const peersDbRef = ref(db, PEERS_REF);
    const unsubscribeDevices = onValue(peersDbRef, (snapshot) => {
      const data = snapshot.val();
      const discoveredDevices: Device[] = [];
      if (data) {
        for (const key in data) {
          if (key !== myId) {
            discoveredDevices.push({ id: key, ...data[key] });
            // Proactively create a peer connection
            createPeer(key, true);
          }
        }
      }
      setDevices(discoveredDevices);
    });

    const signalsRef = ref(db, `${SIGNALS_REF}/${myId}`);
    const unsubscribeSignals = onValue(signalsRef, async (snapshot) => {
        const data = snapshot.val();
        if (data) {
            for (const key in data) {
                const { sender, data: signalData } = data[key];
                
                let peer = peersRef.current[sender];
                if (!peer) {
                    peer = createPeer(sender, false);
                }
                
                // Prevent signaling race conditions
                if (signalData.type === 'offer' && peer.initiator) {
                    continue;
                }

                peer.signal(signalData);
                
                // Remove signal after processing
                await set(child(signalsRef, key), null);
            }
        }
    });

    return () => {
        unsubscribeDevices();
        unsubscribeSignals();
        if(myId) {
            set(ref(db, `${PEERS_REF}/${myId}`), null);
        }
        Object.values(peersRef.current).forEach(peer => {
          if (!peer.destroyed) peer.destroy();
        });
    };
  }, [myId, createPeer]);
  
  const sendFile = (file: File, device: Device) => {
    let peer = peersRef.current[device.id];
    if (!peer) {
      peer = createPeer(device.id, true);
    }
    
    const send = () => sendFileChunked(peer, file);

    if (peer.connected) {
        send();
    } else {
        peer.once('connect', send);
    }

    return () => {
       // The connection is managed by the main effect, so we don't destroy it here.
       // We can remove the connect listener if it hasn't fired yet.
       peer.removeListener('connect', send);
    }
  };

  const sendFileChunked = (peer: Peer.Instance, file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
        if (e.target?.result) {
          const fileData = {
              id: `${file.name}-${Date.now()}`,
              name: file.name,
              type: file.type,
              size: file.size,
              chunk: e.target.result,
          };
          peer.send(JSON.stringify(fileData));
        }
    };
    reader.readAsArrayBuffer(file);
  }

  return { myId, devices, sendFile };
}
