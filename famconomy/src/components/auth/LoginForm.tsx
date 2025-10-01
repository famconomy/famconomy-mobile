import React, { useState } from 'react';
import { useAuth } from '../../hooks/useAuth';
import { LoadingSpinner } from '../ui/LoadingSpinner';
import { Eye, EyeOff } from 'lucide-react';
import { useNavigate, Link } from 'react-router-dom';

export const LoginForm: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const { login, loginWithProvider, isLoading, error } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await login({ email, password });
      navigate('/app'); // Navigate to dashboard after successful login
    } catch (err: any) {
      const errorMessage = err.message || '';
      if (errorMessage.includes('User not found')) {
        navigate('/join', { state: { email, password } }); // Redirect to join page if user not found
      } else if (errorMessage.includes('Invalid credentials')) {
        setError('Invalid email or password.');
      }
      // Error handling is already done in useAuth for other errors
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {error && (
        <div className="p-3 bg-error-50 border border-error-200 text-error-700 rounded-md text-sm">
          {error}
        </div>
      )}
      
      <div>
        <label htmlFor="email" className="block text-sm font-medium text-neutral-700 mb-1">
          Email address
        </label>
        <input
          id="email"
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="w-full px-3 py-2 border border-neutral-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
          placeholder="admin@example.com"
        />
      </div>
      
      <div>
        <label htmlFor="password" className="block text-sm font-medium text-neutral-700 mb-1">
          Password
        </label>
        <div className="relative">
          <input
            id="password"
            type={showPassword ? 'text' : 'password'}
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full px-3 py-2 border border-neutral-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
            placeholder="••••••••"
          />
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            className="absolute right-3 top-2 text-neutral-500"
          >
            {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
          </button>
        </div>
        <div className="flex justify-end mt-1">
          <Link to="/forgot-password" className="text-sm text-primary-600 hover:text-primary-700">
            Forgot password?
          </Link>
        </div>
      </div>
      
      <button
        type="submit"
        disabled={isLoading}
        className="w-full bg-primary-600 hover:bg-primary-700 text-white rounded-md px-4 py-3 font-medium transition-colors disabled:opacity-70"
      >
        {isLoading ? <LoadingSpinner size="sm" /> : 'Sign in'}
      </button>

      <div className="relative">
        <div className="absolute inset-0 flex items-center">
          <div className="w-full border-t border-neutral-300" />
        </div>
        <div className="relative flex justify-center text-sm">
          <span className="px-2 text-neutral-500 bg-white">Or continue with</span>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
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

      <div className="mt-6 text-center">
        <p className="text-sm text-neutral-600">
          Don't have an account? {' '}
          <Link to="/join" className="font-medium text-primary-600 hover:text-primary-500">
            Join FamConomy
          </Link>
        </p>
      </div>
    </form>
  );
};
