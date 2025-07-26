# WiFi File Drop

WiFi File Drop is a web application that allows for seamless and secure file transfers directly between devices on the same local network. It leverages peer-to-peer (P2P) technology, eliminating the need to upload files to a central server, which ensures both privacy and high-speed transfers.

This project was built in Firebase Studio.

## Key Features

- **Serverless Peer-to-Peer Transfers:** Files are sent directly from one device to another using WebRTC, ensuring data never leaves your local network.
- **Automatic Device Discovery:** Using Firebase Realtime Database as a lightweight signaling server, devices automatically discover each other on the network without any manual configuration.
- **Drag-and-Drop Interface:** An intuitive user interface for easily selecting and sending files.
- **Multi-File & Batch Transfers:** Send multiple files at once to any discovered device.
- **Real-time Transfer Status:** Monitor the progress of your file transfers with live progress bars and status updates.
- **Responsive Design:** A clean, modern interface that works on both desktop (laptops) and mobile devices.
- **Session-Based History:** View a history of files you've received within the current session.

## How It Works

1.  **Discovery:** When you open the application, it registers itself on a shared Firebase Realtime Database instance. It then listens for other devices that have also registered themselves on the same network.
2.  **Signaling:** Once devices are discovered, they use the Realtime Database to exchange the necessary WebRTC signaling messages (offers, answers, and ICE candidates) to establish a direct connection.
3.  **Direct Connection:** After the handshake is complete, a direct, encrypted WebRTC data channel is established between the two devices. The Firebase database is no longer used for this connection.
4.  **File Transfer:** Files selected for sending are broken into chunks, sent over the direct P2P connection, and reassembled on the receiving device.

## Technology Stack

- **Framework:** [Next.js](https://nextjs.org/) (with App Router)
- **UI:** [React](https://reactjs.org/), [TypeScript](https://www.typescriptlang.org/), and [Tailwind CSS](https://tailwindcss.com/)
- **UI Components:** [shadcn/ui](https://ui.shadcn.com/)
- **Peer-to-Peer Communication:** [WebRTC](https://webrtc.org/) via the `simple-peer` library.
- **Signaling & Discovery:** [Firebase Realtime Database](https://firebase.google.com/docs/database)

## Getting Started

To get started with the application, simply open `src/app/page.tsx`, which serves as the main entry point for the user interface. The core client-side logic is located in `src/components/wifi-file-drop-client.tsx`, and the WebRTC peer connection management can be found in `src/hooks/use-peer.ts`.
