import React, { useState, useRef, useEffect } from 'react';
import { useLinZChat, LinZChatSuggestion } from '../hooks/useLinZChat';

export const LinZChat: React.FC = () => {
  const { messages, sendUserMessage, isSending, emitAction, updateLinZMessage } = useLinZChat();
  const [input, setInput] = useState<string>('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSendMessage = async () => {
    const text = input.trim();
    if (!text) return;
    setInput('');
    await sendUserMessage(text);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const handleSuggestionClick = (messageId: string, currentText: string, suggestion: LinZChatSuggestion) => {
    emitAction(suggestion.action, suggestion.payload ?? undefined);
    updateLinZMessage(messageId, currentText, { allowEmpty: true, suggestions: [] });
  };

  const getSuggestionClasses = (tone: LinZChatSuggestion['tone']) => {
    switch (tone) {
      case 'primary':
        return 'bg-primary-600 text-white hover:bg-primary-700';
      case 'secondary':
        return 'bg-neutral-200 text-neutral-700 hover:bg-neutral-300 dark:bg-neutral-700 dark:text-neutral-100 dark:hover:bg-neutral-600';
      default:
        return 'bg-white text-primary-600 border border-primary-200 hover:bg-primary-50 dark:bg-neutral-800 dark:text-primary-300 dark:border-primary-400/40 dark:hover:bg-neutral-700';
    }
  };

  return (
    <div className="flex flex-col h-full bg-white dark:bg-gray-800 rounded-lg shadow-md p-4">
      <div className="flex-1 overflow-y-auto mb-4">
        {messages.map((msg, index) => {
          const rowClass = 'flex mb-2 ' + (msg.sender === 'user' ? 'justify-end' : 'justify-start');
          const bubbleClass =
            'rounded-lg p-3 max-w-[70%] ' +
            (msg.sender === 'user'
              ? 'bg-blue-500 text-white'
              : 'bg-gray-200 text-gray-800 dark:bg-gray-700 dark:text-gray-200');

          return (
            <div key={msg.id ?? index} className={rowClass}>
              <div className="flex flex-col gap-2 max-w-full">
                <div className={bubbleClass}>{msg.text}</div>
                {msg.suggestions && msg.suggestions.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {msg.suggestions.map(suggestion => (
                      <button
                        key={suggestion.id}
                        type="button"
                        className={`px-3 py-1 text-sm rounded-full transition-colors ${getSuggestionClasses(suggestion.tone)}`}
                        onClick={() => handleSuggestionClick(msg.id, msg.text, suggestion)}
                      >
                        {suggestion.label}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
          );
        })}
        <div ref={messagesEndRef} />
      </div>
      <div className="flex">
        <input
          type="text"
          className="flex-1 border border-gray-300 dark:border-gray-600 rounded-l-lg p-3 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
          placeholder="Type your message..."
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          disabled={isSending}
        />
        <button
          className="bg-blue-500 hover:bg-blue-600 text-white font-bold py-3 px-6 rounded-r-lg transition duration-300 disabled:opacity-60"
          onClick={handleSendMessage}
          disabled={isSending}
        >
          {isSending ? '...' : 'Send'}
        </button>
      </div>
    </div>
  );
};
