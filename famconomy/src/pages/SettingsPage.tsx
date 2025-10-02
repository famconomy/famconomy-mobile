import React, { useState, useEffect, useCallback } from 'react';
import { 
  Settings,
  Bell,
  Lock,
  Globe,
  Smartphone,
  Moon,
  Sun,
  Languages,
  Clock,
  Calendar,
  Shield,
  LogOut,
  Trash,
  ChevronRight,
  UserCircle,
  Mail,
  Phone
} from 'lucide-react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { UserSettings, SecuritySettings } from '../types/settings';
import { useAuth } from '../hooks/useAuth';
import { deleteUser as deleteUserApi } from '../api/users';
import apiClient from '../api/apiClient';
import { toast } from 'react-toastify';
import { getIntegrationStatus, disconnectInstacart } from '../api/integrations';
import { ScreenTimePanel } from '../components/screen-time/ScreenTimePanel';
import { useFamily } from '../hooks/useFamily';

// Function to convert VAPID public key to Uint8Array
const urlBase64ToUint8Array = (base64String: string) => {
  const padding = '='.repeat((4 - base64String.length % 4) % 4);
  const base64 = (base64String + padding)
    .replace(/\-/g, '+')
    .replace(/_/g, '/');

  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);

  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
};

export const SettingsPage: React.FC = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const { rewardMode } = useFamily(); // Assumes useFamily provides rewardMode

  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  
  // Push Notification States
  const [isPushEnabled, setIsPushEnabled] = useState(false);
  const [vapidPublicKey, setVapidPublicKey] = useState<string | null>(null);
  const [pushLoading, setPushLoading] = useState(true);
  const [pushError, setPushError] = useState<string | null>(null);
  const [isStandalone, setIsStandalone] = useState(false);
  const [isIos, setIsIos] = useState(false);

  // Integration States
  const [integrations, setIntegrations] = useState<string[]>([]);

  useEffect(() => {
    setIsStandalone(window.matchMedia('(display-mode: standalone)').matches);
    setIsIos(/iPad|iPhone|iPod/.test(navigator.userAgent));
  }, []);

  // Fetch VAPID public key and check subscription status
  useEffect(() => {
    const fetchVapidKeyAndSubscriptionStatus = async () => {
      try {
        setPushLoading(true);
        const keyResponse = await apiClient.get('/vapid-public-key');
        setVapidPublicKey(keyResponse.data.publicKey);

        if ('serviceWorker' in navigator && navigator.serviceWorker.ready) {
          const registration = await navigator.serviceWorker.ready;
          const subscription = await registration.pushManager.getSubscription();
          setIsPushEnabled(!!subscription);
        }
      } catch (err: any) {
        console.error('Error fetching VAPID key or checking subscription:', err);
        setPushError(err.message || 'Failed to load push notification status.');
      } finally {
        setPushLoading(false);
      }
    };

    fetchVapidKeyAndSubscriptionStatus();
  }, []);

  // Fetch integration status and check for callbacks
  useEffect(() => {
    getIntegrationStatus().then(setIntegrations).catch(err => {
      console.error('Failed to fetch integration status', err);
      toast.error('Could not load integration status.');
    });

    const queryParams = new URLSearchParams(location.search);
    if (queryParams.get('integration') === 'instacart_success') {
      toast.success('Successfully connected to Instacart!');
      navigate('/settings', { replace: true });
    } else if (queryParams.get('integration') === 'shipt_success') {
      toast.success('Successfully connected to Shipt!');
      navigate('/settings', { replace: true });
    } else if (queryParams.get('integration') === 'kroger_success') {
      toast.success('Successfully connected to Kroger!');
      navigate('/settings', { replace: true });
    }
  }, [location.search, navigate]);

  const subscribeToPush = useCallback(async () => { /* ... existing code ... */ }, [vapidPublicKey]);
  const unsubscribeFromPush = useCallback(async () => { /* ... existing code ... */ }, []);

  const handleDisconnect = async (provider: string) => {
    try {
      if (provider.toUpperCase() === 'INSTACART') {
        await disconnectInstacart();
        toast.success('Disconnected from Instacart.');
        setIntegrations(prev => prev.filter(p => p !== 'INSTACART'));
      } else if (provider.toUpperCase() === 'SHIPT') {
        await disconnectShipt();
        toast.success('Disconnected from Shipt.');
        setIntegrations(prev => prev.filter(p => p !== 'SHIPT'));
      } else if (provider.toUpperCase() === 'KROGER') {
        await disconnectKroger();
        toast.success('Disconnected from Kroger.');
        setIntegrations(prev => prev.filter(p => p !== 'KROGER'));
      }
    } catch (err) {
      toast.error(`Failed to disconnect from ${provider}.`);
    }
  };

  const handleDeleteAccount = useCallback(async () => {
    const targetId = (user as any)?.id ?? (user as any)?.UserID ?? null;
    if (!targetId) {
      toast.error('Unable to determine which account to delete.');
      return;
    }

    setIsDeleting(true);
    try {
      await deleteUserApi(String(targetId));
      toast.success('Your account has been deleted.');
      setShowDeleteModal(false);
      await logout();
      navigate('/login', { replace: true });
    } catch (error: any) {
      console.error('Failed to delete account', error);
      const message = error?.response?.data?.error || error?.message || 'Failed to delete account.';
      toast.error(message);
    } finally {
      setIsDeleting(false);
    }
  }, [logout, navigate, user]);

  const handleSignOut = useCallback(async () => {
    await logout();
    navigate('/login', { replace: true });
  }, [logout, navigate]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-neutral-900 dark:text-white mb-1">Settings</h1>
        <p className="text-neutral-500 dark:text-neutral-400">Manage your account preferences and settings</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Navigation */}
        <div className="lg:col-span-1">
          <nav className="space-y-1">
            <Link to="/profile" className="flex items-center px-4 py-3 text-neutral-900 dark:text-white bg-white dark:bg-neutral-800 rounded-2xl shadow-card">
              <UserCircle className="h-5 w-5 text-primary-500" />
              <span className="ml-3">Profile</span>
              <ChevronRight className="ml-auto h-5 w-5 text-neutral-400" />
            </Link>
            {/* Other nav links... */}
          </nav>

          <div className="mt-6 space-y-4">
            <button
              type="button"
              onClick={handleSignOut}
              className="flex items-center w-full px-4 py-3 text-neutral-700 dark:text-neutral-300 hover:bg-white dark:hover:bg-neutral-800 rounded-2xl transition-colors"
            >
              <LogOut className="h-5 w-5 text-neutral-500" />
              <span className="ml-3">Sign out</span>
            </button>
            <button 
              onClick={() => setShowDeleteModal(true)}
              disabled={isDeleting}
              className="flex items-center w-full px-4 py-3 text-error-600 hover:bg-error-50 dark:hover:bg-error-900/30 rounded-2xl transition-colors disabled:cursor-not-allowed disabled:opacity-70"
            >
              <Trash className="h-5 w-5" />
              <span className="ml-3">Delete Account</span>
            </button>
          </div>
        </div>

        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          

          {/* Push Notifications Section */}
          <section id="push-notifications" className="bg-white dark:bg-neutral-800 rounded-2xl shadow-card p-6">
            <h2 className="text-lg font-semibold text-neutral-900 dark:text-white mb-6">Push Notifications</h2>

            {isIos && !isStandalone ? (
              <div>
                <p className="text-neutral-500 dark:text-neutral-400">
                  To enable push notifications, you need to add this web app to your Home Screen.
                </p>
                <p className="text-neutral-500 dark:text-neutral-400 mt-2">
                  Tap the <span className="font-bold">Share</span> button ( <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" className="bi bi-box-arrow-up inline-block" viewBox="0 0 16 16"><path fill-rule="evenodd" d="M3.5 6a.5.5 0 0 0-.5.5v8a.5.5 0 0 0 .5.5h9a.5.5 0 0 0 .5-.5v-8a.5.5 0 0 0-.5-.5h-2a.5.5 0 0 1 0-1h2A1.5 1.5 0 0 1 14 6.5v8a1.5 1.5 0 0 1-1.5 1.5h-9A1.5 1.5 0 0 1 2 14.5v-8A1.5 1.5 0 0 1 3.5 5h2a.5.5 0 0 1 0 1h-2z"/><path fill-rule="evenodd" d="M7.646.146a.5.5 0 0 1 .708 0l3 3a.5.5 0 0 1-.708.708L8.5 1.707V10.5a.5.5 0 0 1-1 0V1.707L5.354 3.854a.5.5 0 1 1-.708-.708l3-3z"/></svg> ) in Safari and then select 'Add to Home Screen'.
                </p>
              </div>
            ) : pushLoading ? (
              <p className="text-neutral-500 dark:text-neutral-400">Loading push notification status...</p>
            ) : pushError ? (
              <p className="text-red-500">{pushError}</p>
            ) : (
              <div className="flex items-center justify-between">
                <label htmlFor="push-toggle" className="text-neutral-700 dark:text-neutral-300">
                  Enable Push Notifications
                </label>
                <input
                  type="checkbox"
                  id="push-toggle"
                  checked={isPushEnabled}
                  onChange={() => {
                    if (isPushEnabled) {
                      unsubscribeFromPush();
                    } else {
                      subscribeToPush();
                    }
                  }}
                  className="relative w-10 h-5 transition-colors duration-200 ease-in-out bg-neutral-200 dark:bg-neutral-700 rounded-full focus:outline-none focus:ring-2 focus:ring-primary-500 dark:focus:ring-primary-400 cursor-pointer appearance-none
                  checked:bg-primary-500 checked:after:translate-x-full checked:after:border-white
                  after:content-[''] after:absolute after:top-0.5 after:left-0.5 after:h-4 after:w-4 after:rounded-full after:bg-white after:shadow-md after:transition-transform after:duration-200 after:ease-in-out"
                />
              </div>
            )}
          </section>

          <section id="integrations" className="bg-white dark:bg-neutral-800 rounded-2xl shadow-card p-6">
            <h2 className="text-lg font-semibold text-neutral-900 dark:text-white mb-6">Integrations</h2>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-medium text-neutral-900 dark:text-white">Instacart</h3>
                  <p className="text-sm text-neutral-500 dark:text-neutral-400">Connect your Instacart account to add shopping lists directly to your cart.</p>
                </div>
                {integrations.includes('INSTACART') ? (
                  <button 
                    onClick={() => handleDisconnect('INSTACART')}
                    className="px-4 py-2 text-sm font-medium text-white bg-red-500 hover:bg-red-600 rounded-xl"
                  >
                    Disconnect
                  </button>
                ) : (
                  <a 
                    href={`${apiClient.defaults.baseURL}/integrations/instacart/connect`}
                    className="px-4 py-2 text-sm font-medium text-white bg-primary-500 hover:bg-primary-600 rounded-xl"
                  >
                    Connect
                  </a>
                )}
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-medium text-neutral-900 dark:text-white">Shipt</h3>
                  <p className="text-sm text-neutral-500 dark:text-neutral-400">Connect your Shipt account to add shopping lists directly to your cart.</p>
                </div>
                {integrations.includes('SHIPT') ? (
                  <button 
                    onClick={() => handleDisconnect('SHIPT')}
                    className="px-4 py-2 text-sm font-medium text-white bg-red-500 hover:bg-red-600 rounded-xl"
                  >
                    Disconnect
                  </button>
                ) : (
                  <a 
                    href={`${apiClient.defaults.baseURL}/integrations/shipt/connect`}
                    className="px-4 py-2 text-sm font-medium text-white bg-primary-500 hover:bg-primary-600 rounded-xl"
                  >
                    Connect
                  </a>
                )}
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-medium text-neutral-900 dark:text-white">Kroger</h3>
                  <p className="text-sm text-neutral-500 dark:text-neutral-400">Connect your Kroger account to add shopping lists directly to your cart.</p>
                </div>
                {integrations.includes('KROGER') ? (
                  <button 
                    onClick={() => handleDisconnect('KROGER')}
                    className="px-4 py-2 text-sm font-medium text-white bg-red-500 hover:bg-red-600 rounded-xl"
                  >
                    Disconnect
                  </button>
                ) : (
                  <a 
                    href={`${apiClient.defaults.baseURL}/integrations/kroger/connect`}
                    className="px-4 py-2 text-sm font-medium text-white bg-primary-500 hover:bg-primary-600 rounded-xl"
                  >
                    Connect
                  </a>
                )}
              </div>
            </div>
          </section>

          {/* Conditionally render ScreenTimePanel if rewardMode is 'screenTime' or 'hybrid' */}
          {(rewardMode === 'screenTime' || rewardMode === 'hybrid') && (
            <section id="screen-time" className="bg-white dark:bg-neutral-800 rounded-2xl shadow-card p-6">
              <ScreenTimePanel />
            </section>
          )}

          {/* Other sections... */}
        </div>
      </div>

      {showDeleteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl dark:bg-neutral-800">
            <div className="mb-4 flex items-center">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-error-100 text-error-600 dark:bg-error-900/40 dark:text-error-300">
                <Trash className="h-5 w-5" />
              </div>
              <h2 className="ml-3 text-lg font-semibold text-neutral-900 dark:text-white">Delete account</h2>
            </div>
            <p className="mb-6 text-sm text-neutral-600 dark:text-neutral-300">
              Deleting your FamConomy account removes your personal data and access. This action cannot be undone.
            </p>
            <div className="flex flex-col gap-3 sm:flex-row sm:justify-end">
              <button
                type="button"
                onClick={() => setShowDeleteModal(false)}
                className="w-full rounded-xl border border-neutral-200 px-4 py-2 text-sm font-medium text-neutral-700 transition-colors hover:bg-neutral-50 dark:border-neutral-700 dark:text-neutral-300 dark:hover:bg-neutral-700/60 sm:w-auto"
                disabled={isDeleting}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDeleteAccount}
                className="w-full rounded-xl bg-red-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-70 dark:bg-red-500 dark:hover:bg-red-400 sm:w-auto"
                disabled={isDeleting}
              >
                {isDeleting ? 'Deleting...' : 'Delete account'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
