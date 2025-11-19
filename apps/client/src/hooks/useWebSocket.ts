import { useContext, useEffect, useState } from 'react';
import { SocketContext } from '../contexts/SocketContext';

interface WebSocketMessage {
  type: string;
  data: any;
  timestamp: Date;
}

export const useWebSocket = () => {
  const { socket, isConnected, lastMessage } = useContext(SocketContext);
  const [messages, setMessages] = useState<WebSocketMessage[]>([]);

  useEffect(() => {
    if (lastMessage) {
      setMessages((prev) => [lastMessage, ...prev].slice(0, 50)); // Keep last 50 messages
    }
  }, [lastMessage]);

  const sendMessage = (type: string, data: any) => {
    if (socket && isConnected) {
      socket.send(JSON.stringify({ type, data }));
    }
  };

  const clearMessages = () => {
    setMessages([]);
  };

  return {
    socket,
    isConnected,
    messages,
    lastMessage,
    sendMessage,
    clearMessages
  };
};
