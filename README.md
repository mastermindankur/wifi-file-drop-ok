# WiFi File Drop

WiFi File Drop is a web application that allows you to easily and securely transfer files between devices on the same WiFi network. It uses modern web technologies to create a direct peer-to-peer connection between your devices, meaning your files are never uploaded to a central server.

## Key Features

- **Serverless Peer-to-Peer Transfers:** Files are sent directly between your devices using WebRTC. No cloud storage is involved in the file transfer itself.
- **Automatic Device Discovery:** Devices on the same WiFi network that have the app open will automatically discover each other using a Firebase Realtime Database for signaling.
- **Drag & Drop:** Easily select files to send by dragging them onto the application window.
- **Cross-Platform:** Works in any modern web browser on desktops, laptops, and mobile devices.
- **Received File History:** Keeps a list of the files you've received on your device for easy access and download.

## How It Works

This application cleverly uses a combination of technologies to achieve seamless file transfers:

1.  **Signaling & Discovery:** When you open the app, it registers your device in a shared **Firebase Realtime Database**. This acts as a "directory" allowing other devices on the network to see that you are online. This is the only part that requires an internet connection.
2.  **Peer-to-Peer Connection:** Once devices discover each other, they use the signaling database to exchange network information and establish a direct **WebRTC** connection. This peer-to-peer connection is what allows for direct, local data transfer over your WiFi.
3.  **File Transfer:** Files are broken into chunks, sent over the encrypted WebRTC data channel, and reassembled on the receiving device.

Your files never touch the Firebase database or any other central server.

## Getting Started

To use the application, simply:

1.  Open the application URL on two or more devices that are connected to the same WiFi network.
2.  Your device will appear under "Available Devices" on the other devices' screens.
3.  On the device you want to send from, drag and drop files into the "Send Files" area or click to select them.
4.  Click the "Send" button next to the name of the device you want to send the files to.
5.  The receiving device will get a notification, and the file will appear in its "File History" section, ready to be downloaded.

## Tech Stack

- **Framework:** [Next.js](https://nextjs.org/) (with React)
- **UI:** [Tailwind CSS](https://tailwindcss.com/) & [shadcn/ui](https://ui.shadcn.com/)
- **Signaling:** [Firebase Realtime Database](https://firebase.google.com/products/realtime-database)
- **Peer-to-Peer:** [WebRTC](https://webrtc.org/) via the `simple-peer` library
