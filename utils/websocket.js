import { useEffect, useRef } from 'react';

export const useWebSocket = (url, onMessage) => {
  const ws = useRef(null);

  useEffect(() => {
    ws.current = new WebSocket(url);

    ws.current.onopen = () => console.log('WebSocket connected');
    ws.current.onclose = () => console.log('WebSocket disconnected');
    ws.current.onerror = (error) => console.error('WebSocket error:', error);
    ws.current.onmessage = (event) => onMessage(JSON.parse(event.data));

    return () => {
      if (ws.current) {
        ws.current.close();
      }
    };
  }, [url, onMessage]);

  const sendMessage = (message) => {
    if (ws.current && ws.current.readyState === WebSocket.OPEN) {
      ws.current.send(JSON.stringify(message));
    }
  };

  return sendMessage;
};