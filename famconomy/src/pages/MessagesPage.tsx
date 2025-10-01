import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Send, Image, Paperclip, Plus, Search, Phone, Video, MoreVertical, Users, MessageCircle } from 'lucide-react';
import { Message } from '../types';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../hooks/useAuth';
import { useFamily } from '../hooks/useFamily';
import { getMessages, createMessage } from '../api/messages';

const messageTimestampFormatter = new Intl.DateTimeFormat(undefined, {
  month: 'short',
  day: 'numeric',
  year: 'numeric',
  hour: 'numeric',
  minute: '2-digit',
});

const formatMessageTimestamp = (timestamp: string) => {
  const date = new Date(timestamp);
  if (Number.isNaN(date.getTime())) return '';
  return messageTimestampFormatter.format(date);
};

export const MessagesPage: React.FC = () => {
  const { user } = useAuth();
  const { family } = useFamily();
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [newMessage, setNewMessage] = useState('');
  const messagesEndRef = useRef<null | HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  const fetchMessages = useCallback(async () => {
    if (!family) return;
    try {
      setIsLoading(true);
      const messagesData = await getMessages(family.FamilyID.toString());
      setMessages(messagesData);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch messages');
    } finally {
      setIsLoading(false);
    }
  }, [family]);

  useEffect(() => {
    fetchMessages();
  }, [fetchMessages]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSendMessage = async () => {
    if (!newMessage.trim() || !family || !user) return;
    try {
      await createMessage({
        FamilyID: family.FamilyID,
        MessageText: newMessage,
        SenderID: user.id,
      } as any);
      setNewMessage('');
      fetchMessages(); // Refresh messages list
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to send message');
    }
  };

  if (isLoading) return <div>Loading messages...</div>;
  if (error) return <div className="text-error-500">Error: {error}</div>;

  return (
    <div className="h-[calc(100vh-7rem)] flex flex-col bg-white dark:bg-neutral-800 rounded-2xl shadow-card">
      <div className="p-4 border-b border-neutral-200 dark:border-neutral-700 flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div className="h-10 w-10 rounded-full bg-primary-100 dark:bg-primary-900 flex items-center justify-center text-primary-700 dark:text-primary-300">
            <Users size={18} />
          </div>
          <div>
            <h2 className="font-semibold text-neutral-900 dark:text-white">
              {family?.FamilyName} Chat
            </h2>
            <p className="text-sm text-neutral-500 dark:text-neutral-400">
              {family?.members.length} members
            </p>
          </div>
        </div>
      </div>
      
      <div id="messages-thread" className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((msg) => {
          const isOwnMessage = msg.SenderID === user?.id;
          const sender = family?.members.find(m => m.UserID === msg.SenderID);
          return (
            <div key={msg.MessageID} className={`flex ${isOwnMessage ? 'justify-end' : 'justify-start'}`}>
              <div className={`max-w-[70%] flex ${isOwnMessage ? 'flex-row-reverse' : 'flex-row'} items-end space-x-2`}>
                {!isOwnMessage && sender && (
                  <img
                    src={sender.ProfilePhotoUrl || ''}
                    alt={sender.FirstName}
                    className="h-8 w-8 rounded-full object-cover"
                  />
                )}
                <div className={`px-4 py-2 rounded-2xl ${isOwnMessage ? 'bg-primary-500 text-white' : 'bg-neutral-100 dark:bg-neutral-700'}`}>
                  {!isOwnMessage && <p className="text-xs font-bold mb-1">{sender?.FirstName}</p>}
                  <p>{msg.MessageText}</p>
                  <p className="text-xs mt-1 opacity-70 text-right">{formatMessageTimestamp(msg.Timestamp)}</p>
                </div>
              </div>
            </div>
          );
        })}
        <div ref={messagesEndRef} />
      </div>

      <div className="p-4 border-t border-neutral-200 dark:border-neutral-700">
        <div className="flex items-center space-x-2">
          <input
            type="text"
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            placeholder="Type a message..."
            className="flex-1 px-4 py-2 rounded-xl border bg-white dark:bg-neutral-800 focus:outline-none focus:ring-2 focus:ring-primary-500"
            onKeyPress={(e) => { if (e.key === 'Enter') handleSendMessage(); }}
          />
          <button onClick={handleSendMessage} disabled={!newMessage.trim()} className="p-2 rounded-xl bg-primary-500 text-white disabled:opacity-50">
            <Send size={20} />
          </button>
        </div>
      </div>
    </div>
  );
};
