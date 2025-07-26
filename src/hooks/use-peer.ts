
'use client';
import { useState, useEffect, useRef, useCallback } from 'react';
import Peer from 'simple-peer';
import { db } from '@/lib/firebase';
import { ref, onValue, set, onDisconnect, push, child, serverTimestamp, remove } from 'firebase/database';

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

export type PeerStatus = 'connecting' | 'connected' | 'disconnected' | 'failed';


const PEERS_REF = 'peers';
const SIGNALS_REF = 'signals';
const CHUNK_SIZE = 64 * 1024; // 64KB

export function usePeer(onFileReceived: (file: ReceivedFile) => void) {
  const [myId, setMyId] = useState<string | null>(null);
  const [devices, setDevices] = useState<Device[]>([]);
  const peersRef = useRef<{ [key: string]: Peer.Instance }>({});
  const [peerStatuses, setPeerStatuses] = useState<{ [key: string]: PeerStatus }>({});
  const receivedFileChunks = useRef<{ [key: string]: { chunks: ArrayBuffer[], metadata: any } }>({});

  const myDevice = useRef<Device>({
    id: '',
    name: `Device-${Math.random().toString(36).substring(2, 7)}`,
    type:  typeof navigator !== 'undefined' && /Mobi|Android/i.test(navigator.userAgent) ? 'phone' : 'laptop',
  });
  
  const updatePeerStatus = useCallback((peerId: string, status: PeerStatus) => {
    setPeerStatuses(prev => ({ ...prev, [peerId]: status }));
  }, []);

  const handleSignal = useCallback((data: any, peerId: string) => {
    if (!myId) return;
    const signalRef = push(child(ref(db, SIGNALS_REF), peerId));
    set(signalRef, {
      sender: myId,
      data: data,
    });
  }, [myId]);

  const createPeer = useCallback((peerId: string, initiator: boolean) => {
    if (peersRef.current[peerId]) {
        peersRef.current[peerId].destroy();
    }
    
    updatePeerStatus(peerId, 'connecting');

    const peer = new Peer({
      initiator: initiator,
      trickle: true,
    });

    peer.on('signal', (data) => {
      handleSignal(data, peerId);
    });
    
    peer.on('connect', () => {
        console.log('Peer connected:', peerId)
        updatePeerStatus(peerId, 'connected');
    });

    peer.on('data', (data) => {
        try {
            const message = JSON.parse(data.toString());

            if (message.type === 'metadata') {
                receivedFileChunks.current[message.fileId] = {
                    chunks: [],
                    metadata: message
                };
            } else if (message.type === 'chunk') {
                const fileRef = receivedFileChunks.current[message.fileId];
                if(fileRef) {
                    fileRef.chunks.push(message.chunk);
                    if (message.isLastChunk) {
                        const blob = new Blob(fileRef.chunks, { type: fileRef.metadata.fileType });
                        const dataUrl = URL.createObjectURL(blob);
                        
                        const newFile: ReceivedFile = {
                          id: fileRef.metadata.fileId,
                          name: fileRef.metadata.fileName,
                          size: fileRef.metadata.fileSize,
                          type: fileRef.metadata.fileType,
                          date: new Date().toLocaleString(),
                          dataUrl: dataUrl
                        };
                        onFileReceived(newFile);
                        delete receivedFileChunks.current[message.fileId];
                    }
                }
            }
        } catch(e) {
            console.error("Error receiving data", e);
        }
    });
    
    peer.on('error', (err) => {
        console.error('Peer error:', peerId, err);
        updatePeerStatus(peerId, 'failed');
    });

    peer.on('close', () => {
        console.log("Peer closed", peerId);
        updatePeerStatus(peerId, 'disconnected');
        delete peersRef.current[peerId];
    });


    peersRef.current[peerId] = peer;
    return peer;
  }, [handleSignal, onFileReceived, updatePeerStatus]);
  
  const reconnect = useCallback((peerId: string) => {
    createPeer(peerId, true);
  }, [createPeer]);


  useEffect(() => {
    const newPeerId = push(ref(db, PEERS_REF)).key;
    if (newPeerId) {
        setMyId(newPeerId);
        myDevice.current.id = newPeerId;
        const peerRef = ref(db, `${PEERS_REF}/${newPeerId}`);
        onDisconnect(peerRef).remove();
        set(peerRef, {...myDevice.current, timestamp: serverTimestamp()});
    }

    const cleanup = () => {
        if(newPeerId) {
            remove(ref(db, `${PEERS_REF}/${newPeerId}`));
        }
        Object.values(peersRef.current).forEach(peer => {
            if (!peer.destroyed) peer.destroy();
        });
    }
    window.addEventListener('beforeunload', cleanup);
    
    return () => {
        cleanup();
        window.removeEventListener('beforeunload', cleanup);
    }
  }, []);

  useEffect(() => {
    if (!myId) return;

    const peersDbRef = ref(db, PEERS_REF);
    const unsubscribeDevices = onValue(peersDbRef, (snapshot) => {
      const data = snapshot.val();
      const discoveredDevices: Device[] = [];
      const currentPeers = peersRef.current;
      if (data) {
        for (const key in data) {
          if (key !== myId) {
            discoveredDevices.push({ id: key, ...data[key] });
            if (!currentPeers[key] || currentPeers[key].destroyed) {
                 createPeer(key, true);
            }
          }
        }
      }
      setDevices(discoveredDevices);
    });

    const signalsRef = ref(db, `${SIGNALS_REF}/${myId}`);
    const unsubscribeSignals = onValue(signalsRef, async (snapshot) => {
        const signals = snapshot.val();
        if (signals) {
            for (const key in signals) {
                const { sender, data: signalData } = signals[key];
                
                let peer = peersRef.current[sender];
                if (!peer || peer.destroyed) {
                    peer = createPeer(sender, false);
                }
                
                if (peer.destroyed) {
                    console.log("ignoring signal for destroyed peer", sender);
                    await remove(child(signalsRef, key));
                    continue;
                }
                
                if (signalData.type === 'offer' && peer.initiator) {
                    console.log("ignoring offer from non-initiator");
                    await remove(child(signalsRef, key));
                    continue;
                }

                peer.signal(signalData);
                await remove(child(signalsRef, key));
            }
        }
    });

    return () => {
      unsubscribeDevices();
      unsubscribeSignals();
    };
  }, [myId, createPeer]);
  
  const sendFile = (
    file: File, 
    device: Device, 
    onProgress: (p: number) => void,
    onComplete: () => void,
    onError: () => void
  ) => {
    let peer = peersRef.current[device.id];
    if (!peer || peer.destroyed) {
      peer = createPeer(device.id, true);
    }
    
    const send = () => sendFileChunked(peer, file, onProgress, onComplete, onError);

    if (peer.connected) {
        send();
    } else {
        const connectTimeout = setTimeout(() => {
            onError();
            updatePeerStatus(device.id, 'failed');
            peer.destroy();
        }, 10000); // 10 second timeout

        peer.once('connect', () => {
            clearTimeout(connectTimeout);
            send();
        });
        peer.once('error', () => {
            clearTimeout(connectTimeout);
            onError();
        })
    }
  };

  const sendFileChunked = (
    peer: Peer.Instance, 
    file: File,
    onProgress: (p: number) => void,
    onComplete: () => void,
    onError: () => void
    ) => {
    const fileId = `${file.name}-${Date.now()}`;
    const metadata = {
        type: 'metadata',
        fileId: fileId,
        fileName: file.name,
        fileSize: file.size,
        fileType: file.type,
    };
    
    try {
        peer.send(JSON.stringify(metadata));
    } catch(e) {
        onError();
        return;
    }

    let offset = 0;
    const reader = new FileReader();

    reader.onload = (e) => {
        if (!e.target?.result) {
            onError();
            return;
        }

        try {
            const chunk = e.target.result as ArrayBuffer;
            peer.send(JSON.stringify({
                type: 'chunk',
                fileId: fileId,
                chunk: Array.from(new Uint8Array(chunk)), // Convert to array for JSON serialization
                isLastChunk: offset + chunk.byteLength >= file.size
            }));

            offset += chunk.byteLength;
            onProgress(Math.min(100, (offset / file.size) * 100));

            if (offset < file.size) {
                readSlice(offset);
            } else {
                onComplete();
            }
        } catch(e) {
            onError();
        }
    };
    
    reader.onerror = () => {
        onError();
    }

    const readSlice = (o: number) => {
        const slice = file.slice(o, o + CHUNK_SIZE);
        reader.readAsArrayBuffer(slice);
    };

    readSlice(0);
  }

  return { myId, devices, sendFile, peerStatuses, reconnect };
}
