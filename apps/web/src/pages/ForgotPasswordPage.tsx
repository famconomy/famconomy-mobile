import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import apiClient from '../api/apiClient';
import { Logo } from '../components/ui/Logo';

export const ForgotPasswordPage: React.FC = () => {
  const [email, setEmail] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!email) {
      setErrorMessage('Please enter the email address associated with your account.');
      setSuccessMessage('');
      return;
    }

    setIsSubmitting(true);
    setErrorMessage('');
    setSuccessMessage('');

    try {
      await apiClient.post('/auth/forgot-password', { email });
      setSuccessMessage('If an account exists for that email, we\'ve sent instructions to reset your password.');
      setEmail('');
    } catch (error: any) {
      setErrorMessage(error.response?.data?.message || 'Something went wrong. Please try again in a few minutes.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-neutral-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <div className="flex justify-center">
          <Logo size="lg" />
        </div>
        <h2 className="mt-6 text-center text-3xl font-bold tracking-tight text-neutral-900">
          Reset your password
        </h2>
        <p className="mt-2 text-center text-sm text-neutral-600">
          Enter the email associated with your FamConomy account and we\'ll send reset instructions.
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-4 shadow-card sm:rounded-lg sm:px-10">
          <form onSubmit={handleSubmit} className="space-y-6">
            {successMessage && (
              <div className="rounded-md bg-success-50 border border-success-200 px-4 py-3 text-sm text-success-800">
                {successMessage}
              </div>
            )}

            {errorMessage && (
              <div className="rounded-md bg-error-50 border border-error-200 px-4 py-3 text-sm text-error-700">
                {errorMessage}
              </div>
            )}

            <div>
              <label htmlFor="email" className="block text-sm font-medium text-neutral-700">
                Email address
              </label>
              <div className="mt-1">
                <input
                  id="email"
                  type="email"
                  autoComplete="email"
                  required
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  className="w-full px-3 py-2 border border-neutral-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                  placeholder="you@example.com"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full flex justify-center rounded-md border border-transparent bg-primary-600 py-3 px-4 text-sm font-medium text-white shadow-sm hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 disabled:opacity-70"
            >
              {isSubmitting ? 'Sending instructions…' : 'Send reset link'}
            </button>
          </form>

          <div className="mt-6 text-center text-sm text-neutral-600">
            <Link to="/login" className="font-medium text-primary-600 hover:text-primary-500">
              Back to sign in
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};
