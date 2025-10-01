import React, { useEffect, useState } from 'react';
import { useSearchParams, useNavigate, useLocation } from 'react-router-dom';
import apiClient from '../api/apiClient';
import { useAuth } from '../hooks/useAuth';


export const JoinPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { login, loginWithProvider } = useAuth();
  const location = useLocation();

  const [email, setEmail] = useState(location.state?.email || '');
  const [password, setPassword] = useState(location.state?.password || '');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isInvitationFlow, setIsInvitationFlow] = useState(false);
  const [invitationAccepted, setInvitationAccepted] = useState(false);

  useEffect(() => {
    const token = searchParams.get('token');
    if (token) {
      setIsInvitationFlow(true);
      setMessage('Checking invitation...');
      const checkInvitation = async () => {
        try {
          const response = await apiClient.get(`/invitations/details?token=${token}`);
          const { email } = response.data;
          
          const emailExistsResponse = await apiClient.get(`/auth/check-email?email=${email}`);
          if (emailExistsResponse.data.exists) {
            setMessage('You already have an account. Please log in to accept the invitation.');
            navigate('/login', { state: { email, from: location } });
          } else {
            setEmail(email);
            setInvitationAccepted(true);
            setMessage('Welcome to the family! Please complete your registration.');
          }
        } catch (err) {
          const errorMessage = err instanceof Error ? err.message : 'Failed to process invitation.';
          setError(errorMessage);
          setMessage(`Error: ${errorMessage}`);
        }
      };
      checkInvitation();
    }
  }, [searchParams, navigate, location]);

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setMessage('');

    try {
      // Assuming a backend endpoint for registration
      await apiClient.post('/auth/register', { email, password, firstName, lastName });
      setMessage('Registration successful! Redirecting...');
      await login({ email, password });

      if (isInvitationFlow && invitationAccepted) {
        navigate('/', { replace: true });
      } else {
        navigate('/onboarding', { replace: true });
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Registration failed.';
      setError(errorMessage);
      setMessage(`Registration failed: ${errorMessage}`);
    }
  };

  return (
    <div className="min-h-screen bg-neutral-50 dark:bg-neutral-900 flex items-center justify-center">
      <div className="bg-white dark:bg-neutral-800 p-8 rounded-lg shadow-lg text-center w-full max-w-md">
        <h2 className="text-2xl font-bold text-neutral-900 dark:text-white mb-6">
          {isInvitationFlow && invitationAccepted ? "Welcome to the Family!" : "Join FamConomy"}
        </h2>

        {message && (
          <p className={`mb-4 ${error ? 'text-red-500' : 'text-green-500'}`}>
            {message}
          </p>
        )}

        {(!isInvitationFlow || invitationAccepted || error) && (
          <form onSubmit={handleRegister} className="space-y-4">
            <div>
              <input
                type="email"
                placeholder="Email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="w-full px-4 py-2 border border-neutral-300 dark:border-neutral-600 rounded-md bg-neutral-100 dark:bg-neutral-700 text-neutral-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-500"
                disabled={isInvitationFlow && invitationAccepted} // Disable email if pre-filled from invitation
              />
            </div>
            <div>
              <input
                type="password"
                placeholder="Password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="w-full px-4 py-2 border border-neutral-300 dark:border-neutral-600 rounded-md bg-neutral-100 dark:bg-neutral-700 text-neutral-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-500"
              />
            </div>
            <div>
              <input
                type="text"
                placeholder="First Name"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                required
                className="w-full px-4 py-2 border border-neutral-300 dark:border-neutral-600 rounded-md bg-neutral-100 dark:bg-neutral-700 text-neutral-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-500"
              />
            </div>
            <div>
              <input
                type="text"
                placeholder="Last Name"
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                required
                className="w-full px-4 py-2 border border-neutral-300 dark:border-neutral-600 rounded-md bg-neutral-100 dark:bg-neutral-700 text-neutral-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-500"
              />
            </div>
            <button
              type="submit"
              className="w-full bg-primary-600 text-white py-2 px-4 rounded-md hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2"
            >
              Register
            </button>
          </form>
        )}

        <div className="relative mt-6">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-neutral-300 dark:border-neutral-600" />
          </div>
          <div className="relative flex justify-center text-sm">
            <span className="px-2 text-neutral-500 dark:text-neutral-400 bg-white dark:bg-neutral-800">Or continue with</span>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3 mt-6">
          <button
            type="button"
            onClick={() => loginWithProvider('google')}
            className="flex items-center justify-center px-4 py-2 border border-neutral-300 rounded-md shadow-sm text-sm font-medium text-neutral-700 bg-white hover:bg-neutral-50"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="mr-2"><path d="M21.4 10.2c0-.7-.1-1.4-.2-2.1h-9.2v4h5.2c-.2 1.3-1 2.5-2.2 3.3v2.7h3.5c2-1.9 3.2-4.7 3.2-7.9z"></path><path d="M12 21c2.8 0 5.2-1 6.9-2.6l-3.5-2.7c-.9.6-2.1 1-3.4 1-2.6 0-4.8-1.8-5.6-4.2H2.9v2.8C4.7 18.5 8.1 21 12 21z"></path><path d="M6.4 12.9c-.1-.6-.1-1.2 0-1.8V8.3H2.9c-1.5 3-1.5 6.4 0 9.4l3.5-2.8z"></path><path d="M12 3.9c1.5 0 2.9.5 3.9 1.5l3.1-3.1C17.2.6 14.8 0 12 0 8.1 0 4.7 2.5 2.9 6.2l3.5 2.8c.8-2.4 3-4.1 5.6-4.1z"></path></svg>
            Google
          </button>
          <button
            type="button"
            onClick={() => loginWithProvider('facebook')}
            className="flex items-center justify-center px-4 py-2 border border-neutral-300 rounded-md shadow-sm text-sm font-medium text-neutral-700 bg-white hover:bg-neutral-50"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="mr-2"><path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z"></path></svg>
            Facebook
          </button>
          <button
            type="button"
            onClick={() => loginWithProvider('apple')}
            className="flex items-center justify-center px-4 py-2 border border-neutral-300 rounded-md shadow-sm text-sm font-medium text-neutral-700 bg-white hover:bg-neutral-50"
          >
<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="mr-2"><path d="M12 20.94c1.5 0 2.75-1.12 2.75-2.63 0-1.5-1.25-2.62-2.75-2.62s-2.75 1.12-2.75 2.62c0 1.51 1.25 2.63 2.75 2.63zM12 4.38c-2.25 0-4.25 1.5-4.25 3.5 0 1.5 1 2.62 2.25 3.12-1.25.5-2.25 1.62-2.25 3.12 0 2 2 3.5 4.25 3.5s4.25-1.5 4.25-3.5c0-1.5-1-2.62-2.25-3.12 1.25-.5 2.25-1.62 2.25-3.12 0-2-2-3.5-4.25-3.5z"></path></svg>
            Apple
          </button>
          <button
            type="button"
            onClick={() => loginWithProvider('microsoft')}
            className="flex items-center justify-center px-4 py-2 border border-neutral-300 rounded-md shadow-sm text-sm font-medium text-neutral-700 bg-white hover:bg-neutral-50"
          >
<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="mr-2"><rect x="2" y="2" width="9" height="9" rx="1"></rect><rect x="13" y="2" width="9" height="9" rx="1"></rect><rect x="2" y="13" width="9" height="9" rx="1"></rect><rect x="13" y="13" width="9" height="9" rx="1"></rect></svg>
            Microsoft
          </button>
        </div>
      </div>
    </div>
  );
};
