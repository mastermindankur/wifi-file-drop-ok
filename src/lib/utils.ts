import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatBytes(bytes: number, decimals = 2) {
  if (!+bytes) return '0 Bytes'

  const k = 1024
  const dm = decimals < 0 ? 0 : decimals
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB']

  const i = Math.floor(Math.log(bytes) / Math.log(k))

  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(dm))} ${sizes[i]}`
}

export function getDeviceName() {
  if (typeof window === 'undefined') {
    return 'Unknown Device';
  }

  const ua = navigator.userAgent;
  let browserName = 'Unknown Browser';
  let osName = 'Unknown OS';

  // Get OS
  if (ua.indexOf('Win') !== -1) osName = 'Windows';
  else if (ua.indexOf('Mac') !== -1) osName = 'macOS';
  else if (ua.indexOf('Linux') !== -1) osName = 'Linux';
  else if (ua.indexOf('Android') !== -1) osName = 'Android';
  else if (ua.indexOf('like Mac') !== -1) osName = 'iOS';

  // Get Browser
  if (ua.indexOf('Chrome') !== -1 && ua.indexOf('Edg') === -1) browserName = 'Chrome';
  else if (ua.indexOf('Firefox') !== -1) browserName = 'Firefox';
  else if (ua.indexOf('Safari') !== -1 && ua.indexOf('Chrome') === -1) browserName = 'Safari';
  else if (ua.indexOf('Edg') !== -1) browserName = 'Edge';
  else if (ua.indexOf('Opera') !== -1 || ua.indexOf('OPR') !== -1) browserName = 'Opera';
  
  return `${browserName} on ${osName}`;
}


export function getFunnyDeviceName() {
    const adjectives = [
      'Silly', 'Dancing', 'Sneaky', 'Captain', 'Agent', 'Professor', 'Doctor',
      'Happy', 'Grumpy', 'Sleepy', 'Dopey', 'Bashful', 'Sneezy', 'Doc',
      'Funky', 'Groovy', 'Cosmic', 'Galactic', 'Quantum', 'Techno', 'Cyber',
      'Super', 'Mega', 'Ultra', 'Hyper', 'Power', 'Wonder', 'Incredible',
    ];
    const nouns = [
      'Penguin', 'Waffles', 'Potato', 'Unicorn', 'Ninja', 'Pickle', 'Robot',
      'Dinosaur', 'Alien', 'Ghost', 'Wizard', 'Dragon', 'Sphinx', 'Gnome',
      'Avocado', 'Taco', 'Burrito', 'Pizza', 'Sushi', 'Noodle', 'Cupcake',
      'Pants', 'Socks', 'Hat', 'Shoes', 'Gloves', 'Scarf', 'Cape', 'Mask',
    ];

    const randomAdjective = adjectives[Math.floor(Math.random() * adjectives.length)];
    const randomNoun = nouns[Math.floor(Math.random() * nouns.length)];

    return `${randomAdjective} ${randomNoun}`;
}
