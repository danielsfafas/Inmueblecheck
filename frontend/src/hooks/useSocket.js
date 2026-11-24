import { useEffect, useState } from 'react';
import { io } from 'socket.io-client';

let socket = null;

export function useSocket() {
  const [socketInstance, setSocketInstance] = useState(null);

  useEffect(() => {
    if (!socket) {
      const token = localStorage.getItem('token');
      if (!token) return;

      const BACKEND_URL = import.meta.env.VITE_API_URL?.replace('/api', '') || 'http://localhost:3001';
      
      socket = io(BACKEND_URL, {
        auth: { token },
        transports: ['websocket', 'polling'],
      });

      socket.on('connect', () => {
        console.log('Socket.IO connected');
      });

      socket.on('disconnect', () => {
        console.log('Socket.IO disconnected');
      });

      socket.on('error', (error) => {
        console.error('Socket.IO error:', error);
      });
    }

    setSocketInstance(socket);

    return () => {
      // No desconectar aquí, mantener conexión mientras app está activa
    };
  }, []);

  return socketInstance;
}

export function disconnectSocket() {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
}
