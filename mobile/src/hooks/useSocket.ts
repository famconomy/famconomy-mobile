import { useEffect, useMemo, useState } from 'react';
import { io, Socket } from 'socket.io-client';

interface UseSocketOptions {
  namespace?: string;
  query?: Record<string, string | number | boolean | undefined>;
  enabled?: boolean;
}

const SOCKET_PATH = '/socket.io';

const getSocketBaseUrl = () => {
  const envUrl = process.env.REACT_APP_SOCKET_URL || process.env.REACT_APP_API_BASE_URL;
  const fallback = 'https://famconomy.com';
  const url = envUrl ?? fallback;
  // Strip trailing /api if present
  return url.endsWith('/api') ? url.slice(0, -4) : url;
};

export const useSocket = ({ namespace = '/', query, enabled = true }: UseSocketOptions) => {
  const [socket, setSocket] = useState<Socket | null>(null);
  const baseUrl = useMemo(() => getSocketBaseUrl(), []);
  const queryKey = useMemo(() => JSON.stringify(query ?? {}), [query]);

  useEffect(() => {
    if (!enabled) {
      setSocket(null);
      return;
    }

    const socketUrl = `${baseUrl}${namespace.startsWith('/') ? namespace : `/${namespace}`}`;
    const socket = io(socketUrl, {
      path: SOCKET_PATH,
      transports: ['websocket'],
      autoConnect: true,
      withCredentials: true,
      query,
    });

    setSocket(socket);

    return () => {
      socket.disconnect();
      setSocket(null);
    };
  }, [baseUrl, enabled, namespace, queryKey]);

  return socket;
};
