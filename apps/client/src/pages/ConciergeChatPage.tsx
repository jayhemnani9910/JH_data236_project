import React, { useState, useEffect, useRef } from 'react';
import { Send, Sparkles, Wifi, WifiOff } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent, Button, Input, Badge } from '../components/ui';
import { conciergeApi } from '../services/api';
import { useWebSocket } from '../hooks/useWebSocket';

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  text: string;
  isAlert?: boolean;
}

export const ConciergeChatPage: React.FC = () => {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const { isConnected, lastMessage } = useWebSocket();
  const scrollRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  // Handle incoming WebSocket messages
  useEffect(() => {
    if (lastMessage) {
      const { type, data } = lastMessage;
      let text = '';
      let isAlert = false;

      switch (type) {
        case 'deal_alert':
          text = `🔔 DEAL ALERT: ${data?.message || JSON.stringify(data)}`;
          isAlert = true;
          break;
        case 'price_watch':
          text = `📉 PRICE DROP: ${data?.message || JSON.stringify(data)}`;
          isAlert = true;
          break;
        case 'recommendation':
          text = `💡 Recommendation: ${data?.message || JSON.stringify(data)}`;
          break;
        case 'chat_response': // In case backend supports socket chat
          text = data?.message || data?.text;
          break;
        default:
          // Ignore unknown types or handle generically
          if (data?.message) text = data.message;
          break;
      }

      if (text) {
        setMessages(prev => [
          ...prev,
          {
            id: `ws_${Date.now()}_${Math.random()}`,
            role: 'assistant',
            text,
            isAlert
          }
        ]);
      }
    }
  }, [lastMessage]);

  const sendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = input.trim();
    if (!trimmed) return;

    const userMsg: ChatMessage = {
      id: `user_${Date.now()}`,
      role: 'user',
      text: trimmed
    };
    setMessages((prev) => [...prev, userMsg]);
    setInput('');
    setLoading(true);

    try {
      // We still use REST for the primary interaction as per current backend capability,
      // but we are now "listening" for real-time follow-ups via WS.
      const response = await conciergeApi.chat(trimmed);
      const data = response.data.data || {};

      const bundlesSummary = data.bundles?.bundles?.length
        ? `Found ${data.bundles.bundles.length} bundle(s).`
        : 'No bundles found for your query.';

      const assistantText = [
        data.message || 'Here is what I understood from your request.',
        bundlesSummary
      ]
        .filter(Boolean)
        .join('\n\n');

      const assistantMsg: ChatMessage = {
        id: `assistant_${Date.now()}`,
        role: 'assistant',
        text: assistantText
      };
      setMessages((prev) => [...prev, assistantMsg]);
    } catch (err: any) {
      const assistantMsg: ChatMessage = {
        id: `assistant_${Date.now()}`,
        role: 'assistant',
        text: 'Sorry, I could not process your request. Please try again with more details.'
      };
      setMessages((prev) => [...prev, assistantMsg]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[calc(100vh-4rem)] bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4">
        <Card>
          <CardHeader className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-brand" />
              <CardTitle>Concierge Chat</CardTitle>
            </div>
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-1 text-sm">
                {isConnected ? (
                  <Badge variant="success" className="flex items-center gap-1">
                    <Wifi className="w-3 h-3" /> Live
                  </Badge>
                ) : (
                  <Badge variant="default" className="flex items-center gap-1 text-gray-500">
                    <WifiOff className="w-3 h-3" /> Offline
                  </Badge>
                )}
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div
              ref={scrollRef}
              className="h-96 overflow-y-auto border border-gray-200 rounded-md p-4 bg-white mb-4"
            >
              {messages.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-gray-400 space-y-2">
                  <Sparkles className="w-8 h-8 text-gray-300" />
                  <p className="text-sm">Start a conversation by describing your ideal trip.</p>
                  <p className="text-xs">"Weekend in NYC under $800 for 2"</p>
                </div>
              ) : (
                messages.map((m) => (
                  <div
                    key={m.id}
                    className={`mb-3 flex ${m.role === 'user' ? 'justify-end' : 'justify-start'
                      }`}
                  >
                    <div
                      className={`max-w-[80%] rounded-lg px-4 py-2 text-sm whitespace-pre-line shadow-sm ${m.role === 'user'
                        ? 'bg-brand text-white'
                        : m.isAlert
                          ? 'bg-red-50 border border-red-100 text-red-800'
                          : 'bg-gray-100 text-gray-900'
                        }`}
                    >
                      {m.text}
                    </div>
                  </div>
                ))
              )}
            </div>

            <form onSubmit={sendMessage} className="flex gap-2">
              <Input
                placeholder="Describe your trip (dates, budget, destination, preferences)..."
                value={input}
                onChange={(e) => setInput(e.target.value)}
                disabled={loading}
                className="flex-1"
              />
              <Button type="submit" disabled={loading || !input.trim()}>
                <Send className="w-4 h-4 mr-1" />
                {loading ? 'Thinking...' : 'Send'}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default ConciergeChatPage;
