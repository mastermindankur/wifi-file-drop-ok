
'use client';
import { useState, useEffect, useRef, useCallback } from 'react';
import Peer from 'simple-peer';
import { db } from '@/lib/firebase';
import { ref, onValue, set, onDisconnect, push, serverTimestamp, get, child } from 'firebase/database';

export interface Device {
  id: string;
  name: string;
  type: 'laptop' | 'phone';
}

export interface SignalData {
  type: 'offer' | 'answer';
  sdp: any;
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
    name: 'My Device',
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
    const peer = new Peer({
      initiator: initiator,
      trickle: false,
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
    
    peer.on('error', (err) => console.error('Peer error:', err));
    peer.on('connect', () => console.log('Peer connected:', peerId));
    peer.on('close', () => {
        console.log("closing peer", peerId)
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
      if (data) {
        const discoveredDevices = Object.keys(data)
          .filter(key => key !== myId)
          .map(key => ({ id: key, ...data[key] }));
        setDevices(discoveredDevices);
      } else {
        setDevices([]);
      }
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
                peer.signal(signalData);
                
                // Remove signal after processing
                await set(child(signalsRef, key), null);
            }
        }
    });

    return () => {
        unsubscribeDevices();
        unsubscribeSignals();
        Object.values(peersRef.current).forEach(peer => peer.destroy());
        if(myId) {
            set(ref(db, `${PEERS_REF}/${myId}`), null);
        }
    };
  }, [myId, createPeer]);
  
  const sendFile = (file: File, device: Device) => {
    let peer = peersRef.current[device.id];
    if (!peer) {
      peer = createPeer(device.id, true);
    }
    
    if (peer.connected) {
        sendFileChunked(peer, file);
    } else {
        peer.on('connect', () => {
            sendFileChunked(peer, file);
        });
    }

    return () => {
        if (peersRef.current[device.id] && !peersRef.current[device.id].destroyed) {
            peersRef.current[device.id].destroy();
        }
    }
  };

  const sendFileChunked = (peer: Peer.Instance, file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
        const fileData = {
            id: `${file.name}-${Date.now()}`,
            name: file.name,
            type: file.type,
            size: file.size,
            chunk: e.target?.result,
        };
        peer.send(JSON.stringify(fileData));
    };
    reader.readAsArrayBuffer(file);
  }

  return { myId, devices, sendFile };
}
