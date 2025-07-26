"use client";

import { useState, useEffect, useRef, useCallback } from 'react';
import { Laptop, Smartphone, UploadCloud, Send, Download, Trash2, Wifi, WifiOff } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { FileIcon } from '@/components/file-icon';
import { cn, formatBytes } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';

interface Device {
  id: string;
  name: string;
  type: 'laptop' | 'phone';
}

interface TransferringFile {
  id: string;
  file: File;
  progress: number;
  status: 'transferring' | 'complete' | 'error';
  targetDevice: string;
}

interface ReceivedFile {
  id: string;
  name: string;
  size: number;
  type: string;
  date: string;
  dataUrl: string; 
}

// A very simple mock peer-to-peer service for device discovery.
// In a real app, this would be replaced by a proper networking solution (e.g., WebRTC).
const peerService = {
  listeners: new Set<(devices: Device[]) => void>(),
  devices: [] as Device[],
  myDevice: null as Device | null,

  join(device: Device) {
    this.myDevice = device;
    // Simulate discovering other devices over time
    setTimeout(() => this.addDevice({ id: 'device-1', name: 'Living Room PC', type: 'laptop' }), 1500);
    setTimeout(() => this.addDevice({ id: 'device-2', name: 'My Galaxy S24', type: 'phone' }), 3000);
    this.emitChange();
  },
  
  addDevice(device: Device) {
    if (!this.devices.find(d => d.id === device.id) && device.id !== this.myDevice?.id) {
        this.devices.push(device);
        this.emitChange();
    }
  },

  getDevices() {
    return this.devices;
  },
  
  subscribe(callback: (devices: Device[]) => void) {
    this.listeners.add(callback);
    return () => this.listeners.delete(callback);
  },
  
  emitChange() {
    this.listeners.forEach(cb => cb([...this.devices]));
  },

  leave() {
    this.devices = [];
    this.myDevice = null;
    this.emitChange();
  }
};


export function WiFiFileDropClient() {
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [transferringFiles, setTransferringFiles] = useState<TransferringFile[]>([]);
  const [receivedFiles, setReceivedFiles] = useState<ReceivedFile[]>([]);
  const [discoveredDevices, setDiscoveredDevices] = useState<Device[]>([]);
  const [isOnline, setIsOnline] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  useEffect(() => {
    const myDevice: Device = {
        id: `device-${Math.random().toString(36).substr(2, 9)}`,
        name: 'My Device',
        type: Math.random() > 0.5 ? 'laptop' : 'phone'
    };
    peerService.join(myDevice);
    setIsOnline(true);
    
    const unsubscribe = peerService.subscribe(setDiscoveredDevices);

    const storedFiles = localStorage.getItem('receivedFiles');
    if (storedFiles) {
        setReceivedFiles(JSON.parse(storedFiles));
    }

    return () => {
        unsubscribe();
        peerService.leave();
        setIsOnline(false);
    };
  }, []);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files) {
      setSelectedFiles(prev => [...prev, ...Array.from(event.target.files!)]);
    }
  };

  const handleSendFiles = (device: Device) => {
    if (selectedFiles.length === 0) return;

    const newTransfers: TransferringFile[] = selectedFiles.map(file => ({
      id: `${device.id}-${file.name}-${Math.random()}`,
      file,
      progress: 0,
      status: 'transferring',
      targetDevice: device.name,
    }));

    setTransferringFiles(prev => [...newTransfers, ...prev]);
    setSelectedFiles([]);
    
    toast({
        title: "Transfer Started",
        description: `Sending ${newTransfers.length} file(s) to ${device.name}.`
    });
  };

  const removeSelectedFile = (index: number) => {
    setSelectedFiles(prev => prev.filter((_, i) => i !== index));
  };
    
  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      setSelectedFiles(prev => [...prev, ...Array.from(e.dataTransfer.files)]);
      e.dataTransfer.clearData();
    }
  };
  
  const handleDragEvents = (e: React.DragEvent<HTMLDivElement>, isEntering: boolean) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(isEntering);
  };
  
  const downloadFile = (file: ReceivedFile) => {
    const link = document.createElement('a');
    link.href = file.dataUrl;
    link.download = file.name;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  useEffect(() => {
    const interval = setInterval(() => {
      setTransferringFiles(prev =>
        prev.map(f => {
          if (f.status === 'transferring' && f.progress < 100) {
            const newProgress = f.progress + Math.random() * 25;
            const isComplete = newProgress >= 100;
            
            if (isComplete) {
                toast({
                    title: "Transfer Complete",
                    description: `${f.file.name} sent to ${f.targetDevice}.`,
                });
            }

            return {
              ...f,
              progress: Math.min(newProgress, 100),
              status: isComplete ? 'complete' : 'transferring',
            };
          }
          return f;
        }).filter(f => f.status !== 'complete' || f.progress < 100) // Keep for a moment
      );
    }, 500);

    return () => clearInterval(interval);
  }, [toast]);
  
  useEffect(() => {
    localStorage.setItem('receivedFiles', JSON.stringify(receivedFiles));
  }, [receivedFiles]);


  return (
    <div className="bg-background min-h-screen">
      <header className="py-4 px-6 flex items-center justify-between">
        <div className="flex items-center gap-3">
            <div className="p-2 bg-primary/10 text-primary rounded-lg">
               <Wifi className="h-6 w-6" />
            </div>
            <h1 className="text-2xl font-bold text-foreground">WiFi File Drop</h1>
        </div>
        <Badge variant={isOnline ? "default" : "destructive"} className={cn("transition-all", isOnline ? "bg-green-500/80" : "bg-destructive")}>
            {isOnline ? <Wifi className="mr-2 h-4 w-4" /> : <WifiOff className="mr-2 h-4 w-4" />}
            {isOnline ? "Online" : "Offline"}
        </Badge>
      </header>
      <main className="p-4 sm:p-6 md:p-8 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 flex flex-col gap-8">
          <Card 
            className={cn(
                "transition-all duration-300",
                isDragging && "border-primary ring-2 ring-primary"
            )}
            onDragEnter={e => handleDragEvents(e, true)}
            onDragLeave={e => handleDragEvents(e, false)}
            onDragOver={e => handleDragEvents(e, true)}
            onDrop={handleDrop}
          >
            <CardHeader>
              <CardTitle>Send Files</CardTitle>
              <CardDescription>Select or drop files here, then choose a device to send them to.</CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col gap-6">
                <div
                    onClick={() => fileInputRef.current?.click()}
                    className={cn(
                        "flex flex-col items-center justify-center p-10 border-2 border-dashed rounded-lg cursor-pointer hover:bg-accent/50 transition-colors",
                        isDragging ? "border-primary bg-primary/10" : "border-border"
                    )}
                >
                    <UploadCloud className="w-12 h-12 text-muted-foreground" />
                    <p className="mt-4 text-center text-muted-foreground">
                        {isDragging ? "Drop files to upload" : "Click to select files or drag and drop"}
                    </p>
                    <input type="file" multiple ref={fileInputRef} onChange={handleFileChange} className="hidden" />
                </div>
              
                {selectedFiles.length > 0 && (
                  <div>
                    <h3 className="font-medium mb-2">Selected Files:</h3>
                    <ul className="space-y-2">
                        {selectedFiles.map((file, index) => (
                        <li key={index} className="flex items-center justify-between p-2 bg-secondary/50 rounded-md text-sm">
                            <div className="flex items-center gap-3 overflow-hidden">
                                <FileIcon mimeType={file.type} className="w-5 h-5 text-muted-foreground shrink-0"/>
                                <span className="truncate">{file.name}</span>
                                <span className="text-muted-foreground shrink-0">{formatBytes(file.size)}</span>
                            </div>
                            <Button variant="ghost" size="icon" className="h-7 w-7 shrink-0" onClick={() => removeSelectedFile(index)}>
                                <Trash2 className="w-4 h-4 text-destructive/80" />
                            </Button>
                        </li>
                        ))}
                    </ul>
                  </div>
                )}
            </CardContent>
          </Card>

          {transferringFiles.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Ongoing Transfers</CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-4">
                  {transferringFiles.map(item => (
                    <li key={item.id}>
                      <div className="flex items-center gap-3 text-sm mb-2">
                        <FileIcon mimeType={item.file.type} className="w-5 h-5 text-muted-foreground" />
                        <span className="font-medium truncate flex-1">{item.file.name} to <span className="text-primary">{item.targetDevice}</span></span>
                         <Badge variant={item.status === 'complete' ? 'default' : 'secondary'} className={cn(item.status === 'complete' && "bg-green-500/80 hover:bg-green-500/70 text-primary-foreground")}>
                           {item.status}
                         </Badge>
                      </div>
                      <Progress value={item.progress} className="h-2" />
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          )}

           <Card>
            <CardHeader>
              <CardTitle>File History</CardTitle>
              <CardDescription>A list of files you have received.</CardDescription>
            </CardHeader>
            <CardContent>
             {receivedFiles.length === 0 ? (
                <div className="text-center text-muted-foreground py-10">
                    <p>No files received yet.</p>
                </div>
             ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>File</TableHead>
                    <TableHead className="hidden sm:table-cell">Size</TableHead>
                    <TableHead className="hidden md:table-cell">Date</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {receivedFiles.map(file => (
                    <TableRow key={file.id}>
                      <TableCell className="font-medium">
                        <div className="flex items-center gap-3">
                           <FileIcon mimeType={file.type} className="w-6 h-6 text-muted-foreground hidden sm:block" />
                           <span className="truncate">{file.name}</span>
                        </div>
                      </TableCell>
                      <TableCell className="hidden sm:table-cell">{formatBytes(file.size)}</TableCell>
                      <TableCell className="hidden md:table-cell">{file.date}</TableCell>
                      <TableCell className="text-right">
                        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => downloadFile(file)}>
                          <Download className="w-4 h-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              )}
            </CardContent>
          </Card>
        </div>

        <div className="lg:col-span-1">
          <Card>
            <CardHeader>
              <CardTitle>Available Devices</CardTitle>
              <CardDescription>Devices found on your WiFi network.</CardDescription>
            </CardHeader>
            <CardContent>
              {isOnline && discoveredDevices.length > 0 ? (
                <ul className="space-y-3">
                  {discoveredDevices.map(device => (
                    <li key={device.id} className="flex items-center justify-between p-3 bg-secondary/50 rounded-md">
                      <div className="flex items-center gap-3">
                        {device.type === 'laptop' ? <Laptop className="w-6 h-6 text-muted-foreground" /> : <Smartphone className="w-6 h-6 text-muted-foreground" />}
                        <span className="font-medium">{device.name}</span>
                      </div>
                      <Button size="sm" onClick={() => handleSendFiles(device)} disabled={selectedFiles.length === 0}>
                        <Send className="w-4 h-4 mr-2" />
                        Send
                      </Button>
                    </li>
                  ))}
                </ul>
              ) : (
                <div className="text-center text-muted-foreground py-10">
                    <p>{isOnline ? "Searching for devices..." : "You are offline."}</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}

    