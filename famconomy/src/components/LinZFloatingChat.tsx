import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import Draggable from 'react-draggable';
import { motion, AnimatePresence } from 'framer-motion';
import { Bot, X } from 'lucide-react';
import { LinZChat } from './LinZChat';
import { useLinZChat } from '../hooks/useLinZChat';

export const LinZFloatingChat: React.FC = () => {
  const getDefaultPosition = () => {
    if (typeof window === 'undefined') return { x: 0, y: 0 };
    return { x: window.innerWidth - 88, y: window.innerHeight - 88 };
  };

  const [buttonPosition, setButtonPosition] = useState(getDefaultPosition);
  const [isDraggable, setIsDraggable] = useState(true);
  const dragStartRef = useRef<{ x: number; y: number } | null>(null);
  const hasDraggedRef = useRef(false);
  const hasCustomPositionRef = useRef(false);
  const dragThreshold = 6;
  const nodeRef = useRef<HTMLDivElement | null>(null);
  const { isOpen, toggleChat, closeChat, openChat } = useLinZChat();

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const updateState = () => {
      if (!hasCustomPositionRef.current) {
        setButtonPosition(getDefaultPosition());
      }
      setIsDraggable(true);
    };

    updateState();
    window.addEventListener('resize', updateState);
    return () => window.removeEventListener('resize', updateState);
  }, []);

  const handleToggle = useCallback(() => {
    if (hasDraggedRef.current) {
      hasDraggedRef.current = false;
      return;
    }
    toggleChat({ greet: true });
  }, [toggleChat]);

  const handleTouchEnd = useCallback((event: React.TouchEvent<HTMLButtonElement>) => {
    event.preventDefault();
    event.stopPropagation();
    if (hasDraggedRef.current) {
      hasDraggedRef.current = false;
      return;
    }
    toggleChat({ greet: true });
  }, [toggleChat]);

  const buttonClasses = useMemo(() => (
    'bg-gradient-to-r from-primary-500 via-secondary-500 to-accent-500 text-white rounded-full p-4 shadow-lg hover:opacity-90 transition-opacity'
  ), []);

  const bubbleButton = (
    <motion.button
      id="linz-chat-toggle"
      className={`${buttonClasses} ${isDraggable ? 'cursor-grab' : ''}`}
      onClick={handleToggle}
      onTouchEnd={handleTouchEnd}
      type="button"
      aria-label={isOpen ? 'Close LinZ chat' : 'Open LinZ chat'}
    >
      {isOpen ? <X size={28} /> : <Bot size={28} />}
    </motion.button>
  );

  return (
    <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, pointerEvents: 'none', zIndex: 13000 }}>
      {/* Floating Bubble Button */}
      <Draggable
        bounds="parent"
        position={buttonPosition}
        onStart={(_, data) => {
          dragStartRef.current = { x: data.x, y: data.y };
          hasDraggedRef.current = false;
        }}
        onDrag={(_, data) => {
          if (!dragStartRef.current) return;
          const distance = Math.hypot(data.x - dragStartRef.current.x, data.y - dragStartRef.current.y);
          if (distance > dragThreshold) {
            hasDraggedRef.current = true;
          }
        }}
        onStop={(_, data) => {
          setButtonPosition({ x: data.x, y: data.y });
          if (hasDraggedRef.current) {
            hasCustomPositionRef.current = true;
            openChat({ greet: false });
            hasDraggedRef.current = false;
          }
        }}
        nodeRef={nodeRef}
      >
        <div
          ref={nodeRef as React.MutableRefObject<HTMLDivElement | null>}
          style={{ position: 'absolute', top: 0, left: 0, zIndex: 13010, pointerEvents: 'auto' }}
        >
          {bubbleButton}
        </div>
      </Draggable>

      {/* Chat Modal */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            className="fixed bottom-20 right-6 w-80 h-[500px] bg-white dark:bg-gray-800 rounded-lg shadow-xl flex flex-col"
            style={{ zIndex: 13020, pointerEvents: 'auto' }}
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 50 }}
            transition={{ type: 'spring', stiffness: 260, damping: 20 }}
          >
            <div className="flex justify-between items-center p-4 border-b border-gray-200 dark:border-gray-700">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">LinZ Chat</h2>
              <button
                onClick={() => closeChat()}
                className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
              >
                <X size={24} />
              </button>
            </div>
            <div className="flex-1 overflow-hidden">
              <LinZChat />
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
