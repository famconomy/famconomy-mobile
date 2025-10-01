import React, { useState, useMemo } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import apiClient from '../api/apiClient';
import { Logo } from '../components/ui/Logo';

export const ResetPasswordPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const token = useMemo(() => searchParams.get('token') || '', [searchParams]);
  const email = useMemo(() => searchParams.get('email') || '', [searchParams]);

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');

  const isLinkInvalid = !token || !email;

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (isLinkInvalid) {
      setErrorMessage('This reset link is missing required information. Please request a new one.');
      return;
    }

    if (!password || password.length < 8) {
      setErrorMessage('Please enter a password that is at least 8 characters long.');
      return;
    }

    if (password !== confirmPassword) {
      setErrorMessage('Passwords do not match. Please try again.');
      return;
    }

    setIsSubmitting(true);
    setErrorMessage('');
    setSuccessMessage('');

    try {
      await apiClient.post('/auth/reset-password', { token, email, password });
      setSuccessMessage('Your password has been reset. You can now sign in with your new password.');
      setPassword('');
      setConfirmPassword('');
    } catch (error: any) {
      setErrorMessage(error.response?.data?.message || 'Unable to reset password. The link may have expired.');
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
          Set a new password
        </h2>
        <p className="mt-2 text-center text-sm text-neutral-600">
          Enter and confirm your new password below.
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-4 shadow-card sm:rounded-lg sm:px-10">
          {isLinkInvalid ? (
            <div className="space-y-6">
              <div className="rounded-md bg-error-50 border border-error-200 px-4 py-3 text-sm text-error-700">
                This reset link is invalid or incomplete. Please request a new password reset email.
              </div>
              <div className="text-center text-sm text-neutral-600">
                <Link to="/forgot-password" className="font-medium text-primary-600 hover:text-primary-500">
                  Request a new reset link
                </Link>
              </div>
            </div>
          ) : (
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
                <label htmlFor="password" className="block text-sm font-medium text-neutral-700">
                  New password
                </label>
                <div className="mt-1">
                  <input
                    id="password"
                    type="password"
                    autoComplete="new-password"
                    required
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                    className="w-full px-3 py-2 border border-neutral-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                    placeholder="Enter a strong password"
                  />
                </div>
              </div>

              <div>
                <label htmlFor="confirm-password" className="block text-sm font-medium text-neutral-700">
                  Confirm password
                </label>
                <div className="mt-1">
                  <input
                    id="confirm-password"
                    type="password"
                    autoComplete="new-password"
                    required
                    value={confirmPassword}
                    onChange={(event) => setConfirmPassword(event.target.value)}
                    className="w-full px-3 py-2 border border-neutral-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                    placeholder="Re-enter your new password"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full flex justify-center rounded-md border border-transparent bg-primary-600 py-3 px-4 text-sm font-medium text-white shadow-sm hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 disabled:opacity-70"
              >
                {isSubmitting ? 'Updating password…' : 'Update password'}
              </button>
            </form>
          )}

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
