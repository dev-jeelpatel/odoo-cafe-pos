import { io, Socket } from 'socket.io-client';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';

let socket: Socket | null = null;

export function getSocket(): Socket {
  if (!socket) {
    // Pass JWT token in the Socket.io handshake auth so the server can authenticate the connection
    const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
    socket = io(API_URL, {
      transports: ['websocket'],
      auth: { token: token ?? '' },
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
    });

    socket.on('connect_error', (err) => {
      if (process.env.NODE_ENV !== 'production') {
        console.warn('[Socket] Connection error:', err.message);
      }
    });
  }
  return socket;
}

// Call when a new token is available (after login) to reconnect with auth
export function reconnectSocket(): void {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
  getSocket();
}

export function disconnectSocket() {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
}
