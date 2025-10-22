import React, { useState, useRef, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Bot, X } from 'lucide-react';
import { LoadingSpinner } from '../components/ui/LoadingSpinner';
import { Logo } from '../components/ui/Logo';
import { useOnboardingContext } from '../hooks/useOnboardingContext';
import { useOnboardingTour } from '../hooks/useOnboardingTour';
import { useLinZChat } from '../hooks/useLinZChat';
import { useAuth } from '../hooks/useAuth';
import { useFamily } from '../hooks/useFamily';

export const OnboardingPage: React.FC = () => {
  const { state, sendUserMessage, commitOnboardingData, resetOnboarding } = useOnboardingContext();
  const auth = useAuth();
  const user = auth.user;
  const isAuthenticated = auth.isAuthenticated;
  const authLoading = Boolean(auth.isLoading);
  const userId = user?.UserID ?? (user as any)?.id ?? null;
  const { family } = useFamily();
  const familyId = family?.FamilyID ?? null;
  const { startTour, hasSeenTour } = useOnboardingTour({ familyId, userId });
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [inputValue, setInputValue] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { toggleChat, isOpen } = useLinZChat();
  const autoStartRef = useRef(false);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [state.messages, state.streamingMessage]);

  useEffect(() => {
    if (state.loading) return;
    if (autoStartRef.current) return;

    const focusParam = searchParams.get('focus');
    const sessionFocus = sessionStorage.getItem('onboarding-focus');

    if ((focusParam === 'rooms' || sessionFocus === 'rooms') && state.currentStep !== 'committed') {
      autoStartRef.current = true;
      sessionStorage.removeItem('onboarding-focus');
      void sendUserMessage('We just reset our floor plan and need help designing a fresh layout for our home.');
    }
  }, [state.loading, state.currentStep, searchParams, sendUserMessage]);

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      navigate('/login', { replace: true });
    }
  }, [authLoading, isAuthenticated, navigate]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && inputValue.trim()) {
      sendUserMessage(inputValue);
      setInputValue('');
    }
  };

  if (state.loading) {
    return (
      <div className="min-h-screen bg-neutral-50 dark:bg-neutral-900 flex items-center justify-center">
        <LoadingSpinner />
        <p className="ml-2 text-neutral-600">Loading onboarding data...</p>
      </div>
    );
  }

  const handleGoToDashboard = async () => {
    if (state.loading) return;
    if (state.currentStep !== 'committed' && state.currentStep !== 'completed') {
      const success = await commitOnboardingData();
      if (!success) return;
    }
    if (hasSeenTour === false) {
      startTour();
    }
    navigate('/app');
  };

  const handleRestartOnboarding = async () => {
    if (state.loading) return;
    await resetOnboarding();
    setInputValue('');
  };

  const canSendMessages = state.awaitingResetConfirmation || (state.currentStep !== 'committed' && state.currentStep !== 'completed');

  return (
    <div className="relative min-h-screen bg-neutral-50 flex flex-col items-center justify-center py-12 sm:px-6 lg:px-8">
      <div className="mb-8 text-center">
        <Logo size="lg" />
        <p className="mt-2 text-neutral-600">Let's get your family space ready together.</p>
      </div>
      <div className="bg-white p-8 rounded-lg shadow-card w-full max-w-md flex flex-col" style={{ height: '70vh' }}>
        <div className="flex-grow overflow-y-auto mb-4">
          {state.messages.map((msg, index) => (
            <div key={index} className={`mb-2 ${msg.sender === 'user' ? 'text-right' : 'text-left'}`}>
              <div className={`inline-block p-2 rounded-lg ${msg.sender === 'user' ? 'bg-primary-100 text-primary-800' : 'bg-primary-600 text-white'}`}>
                {msg.text}
              </div>
            </div>
          ))}
          {state.streamingMessage !== null && (
            <div className="mb-2 text-left">
              <div className="inline-block p-2 rounded-lg bg-primary-600 text-white">
                {state.streamingMessage ? (
                  state.streamingMessage
                ) : (
                  <div className="flex items-center space-x-1">
                    <span className="w-2 h-2 bg-white/80 rounded-full animate-bounce" />
                    <span className="w-2 h-2 bg-white/80 rounded-full animate-bounce [animation-delay:-0.15s]" />
                    <span className="w-2 h-2 bg-white/80 rounded-full animate-bounce [animation-delay:-0.3s]" />
                  </div>
                )}
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {canSendMessages && (
          <div className="flex items-center">
            <input
              type="text"
              placeholder="Type your response..."
              className="flex-grow px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyDown={handleKeyDown}
            />
            <button
              onClick={() => {
                if (inputValue.trim()) {
                  sendUserMessage(inputValue);
                  setInputValue('');
                }
              }}
              className="ml-2 px-4 py-2 bg-primary-600 text-white rounded-md"
            >
              Send
            </button>
          </div>
        )}

        {state.currentStep === 'committed' && (
          <div className="text-center mt-4">
            <h2 className="text-2xl font-bold mb-4">All set 🎉</h2>
            <p className="mb-4">Your family space is ready!</p>
            <div className="flex flex-col sm:flex-row gap-2 justify-center">
              <button onClick={handleGoToDashboard} className="px-4 py-2 bg-primary-600 text-white rounded-md">Go to Dashboard</button>
              <button onClick={() => void handleRestartOnboarding()} className="px-4 py-2 border border-neutral-300 text-neutral-700 rounded-md">Start Over</button>
            </div>
          </div>
        )}
        {state.currentStep === 'completed' && (
          <div className="text-center mt-4">
            <h2 className="text-2xl font-bold mb-4">Onboarding Complete!</h2>
            <p className="mb-4">You can now explore FamConomy.</p>
            <div className="flex flex-col sm:flex-row gap-2 justify-center">
              <button onClick={handleGoToDashboard} className="px-4 py-2 bg-primary-600 text-white rounded-md">Go to Dashboard</button>
              <button onClick={() => void handleRestartOnboarding()} className="px-4 py-2 border border-neutral-300 text-neutral-700 rounded-md">Restart Onboarding</button>
            </div>
          </div>
        )}
      </div>
      <button
        type="button"
        onClick={() => toggleChat({ greet: true })}
        className="fixed bottom-6 right-6 z-50 bg-gradient-to-r from-primary-500 via-secondary-500 to-accent-500 text-white rounded-full p-4 shadow-lg hover:opacity-90 transition-opacity"
        aria-label={isOpen ? 'Close LinZ chat' : 'Open LinZ chat'}
      >
        {isOpen ? <X size={28} /> : <Bot size={28} />}
      </button>
    </div>
  );
};
