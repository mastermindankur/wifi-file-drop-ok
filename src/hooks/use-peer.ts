
'use client';
import { useState, useEffect, useRef, useCallback } from 'react';
import Peer from 'simple-peer';
import { db } from '@/lib/firebase';
import { ref, onValue, set, onDisconnect, push, child, serverTimestamp, remove } from 'firebase/database';
import { getDeviceName } from '@/lib/utils';

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
    name: getDeviceName(),
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
    if (peersRef.current[peerId] && !peersRef.current[peerId].destroyed) {
        return peersRef.current[peerId];
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
            // Check for metadata first
            if (data.toString().includes('"type":"metadata"')) {
                const message = JSON.parse(data.toString());
                receivedFileChunks.current[message.fileId] = {
                    chunks: [],
                    metadata: message,
                };
            } else if (data instanceof ArrayBuffer) {
                // This is a raw binary chunk. Find the file it belongs to.
                // The metadata should have already created an entry.
                const fileEntry = Object.values(receivedFileChunks.current).find(
                    (entry) => !entry.metadata.isComplete
                );

                if (fileEntry) {
                    fileEntry.chunks.push(data);
                    const receivedSize = fileEntry.chunks.reduce((acc, chunk) => acc + chunk.byteLength, 0);

                    if (receivedSize >= fileEntry.metadata.fileSize) {
                        const blob = new Blob(fileEntry.chunks, { type: fileEntry.metadata.fileType });
                        const dataUrl = URL.createObjectURL(blob);
                        
                        const newFile: ReceivedFile = {
                          id: fileEntry.metadata.fileId,
                          name: fileEntry.metadata.fileName,
                          size: fileEntry.metadata.fileSize,
                          type: fileEntry.metadata.fileType,
                          date: new Date().toLocaleString(),
                          dataUrl: dataUrl
                        };
                        onFileReceived(newFile);
                        
                        // Mark as complete and clean up
                        fileEntry.metadata.isComplete = true; 
                        delete receivedFileChunks.current[fileEntry.metadata.fileId];
                    }
                }
            }
        } catch(e) {
            console.error("Error receiving data", e, data);
        }
    });
    
    peer.on('error', (err) => {
        console.error('Peer error:', peerId, err);
        updatePeerStatus(peerId, 'failed');
        if (peersRef.current[peerId]) {
            peersRef.current[peerId].destroy();
            delete peersRef.current[peerId];
        }
    });

    peer.on('close', () => {
        console.log("Peer closed", peerId);
        updatePeerStatus(peerId, 'disconnected');
        if (peersRef.current[peerId]) {
            delete peersRef.current[peerId];
        }
    });


    peersRef.current[peerId] = peer;
    return peer;
  }, [handleSignal, onFileReceived, updatePeerStatus]);
  
  const reconnect = useCallback((peerId: string) => {
    if(myId) {
        if (peersRef.current[peerId] && !peersRef.current[peerId].destroyed) {
            peersRef.current[peerId].destroy();
        }
        createPeer(peerId, myId > peerId);
    }
  }, [createPeer, myId]);


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
                 createPeer(key, myId > key);
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
                
                // Avoid race conditions where a peer might signal before it's fully registered.
                if (peer.writable) {
                    peer.signal(signalData);
                    await remove(child(signalsRef, key));
                } else {
                    setTimeout(() => {
                        if (!peer.destroyed) {
                            peer.signal(signalData);
                        }
                        remove(child(signalsRef, key));
                    }, 500);
                }
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
      if(!myId) {
        onError();
        return;
      }
      peer = createPeer(device.id, myId > device.id);
    }
    
    const send = () => sendFileChunked(peer, file, onProgress, onComplete, onError);

    if (peer.connected) {
        send();
    } else {
        const connectTimeout = setTimeout(() => {
            onError();
            updatePeerStatus(device.id, 'failed');
        }, 10000); // 10 second timeout

        peer.once('connect', () => {
            clearTimeout(connectTimeout);
            send();
        });
        peer.once('error', (err) => {
            console.error("Peer connection failed for sendFile", err);
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
            peer.send(chunk);

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

    