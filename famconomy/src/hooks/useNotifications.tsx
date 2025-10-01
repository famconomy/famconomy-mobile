import { useState, useEffect, createContext, useContext } from 'react';
import { Notification } from '../types';
import { fetchNotifications, markNotificationAsRead } from '../api/notifications';
import { useAuth } from './useAuth';
import { io, Socket } from 'socket.io-client'; // Import io and Socket
import { createDebugLogger } from '../utils/debug';

interface NotificationsContextType {
  notifications: Notification[];
  unreadCount: number;
  isLoading: boolean;
  error: string | null;
  markAsRead: (id: string) => Promise<void>;
  markAllAsRead: () => Promise<void>;
  fetchNotificationData: () => Promise<void>;
}

const NotificationsContext = createContext<NotificationsContextType | null>(null);

export const NotificationsProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { user } = useAuth();
  const notificationsDebug = createDebugLogger('notifications');

  const fetchNotificationData = async () => {
    // Removed 'if (!user) return;' to allow notifications to fetch even if user is not fully loaded
    // The fetchNotifications API call will handle cases where user.id might be undefined or null
    // if the user is not authenticated, it will likely return an empty array or an error.

    setIsLoading(true);
    setError(null);
    
    try {
      if (user?.id === 'demo-admin') { // Use optional chaining for user?.id
        // Mock data for demo user
        setNotifications([
          { id: '1', userId: 'demo-admin', message: 'Welcome to the FamConomy demo!', readStatus: false, timestamp: new Date().toISOString(), type: 'system' },
          { id: '2', userId: 'demo-admin', message: 'You have a new task assigned.', readStatus: false, timestamp: new Date().toISOString(), type: 'task' },
        ]);
      } else if (user?.id) { // Only fetch if user.id is available
        const data = await fetchNotifications(user.id);
        notificationsDebug.log('Fetched notifications data:', data);
        setNotifications(data);
      } else {
        // If user is not authenticated or user.id is not available, clear notifications
        setNotifications([]);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch notifications');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    let socket: Socket | undefined;

    if (user) {
      fetchNotificationData(); // Initial fetch

      // Setup WebSocket connection
      if (user.id !== 'demo-admin') { // Don't connect for demo user
        socket = io('https://famconomy.com', { // Connect to your backend Socket.IO server
          query: { userId: user.id }, // Pass user ID for room joining
          transports: ['websocket'], // Force WebSocket
        });

        socket.on('connect', () => {
          notificationsDebug.log('Socket.IO connected:', socket?.id);
        });

        socket.on('newNotification', (newNotification: Notification) => {
          notificationsDebug.log('New notification received via WebSocket:', newNotification);
          setNotifications((prevNotifications) => [newNotification, ...prevNotifications]);
        });

        socket.on('disconnect', () => {
          notificationsDebug.log('Socket.IO disconnected.');
        });

        socket.on('connect_error', (err) => {
          notificationsDebug.error('Socket.IO connection error:', err.message);
        });

        const intervalId = setInterval(fetchNotificationData, 30000); // Keep polling as a fallback/initial load
        
        return () => {
          clearInterval(intervalId);
          if (socket) {
            socket.disconnect();
          }
        };
      }
    }
  }, [user]); // Re-run effect when user changes

  const markAsRead = async (id: string) => {
    try {
      if (user?.id !== 'demo-admin') {
        await markNotificationAsRead(id);
      }
      
      setNotifications((prevNotifications) =>
        prevNotifications.map((notification) =>
          notification.id === id
            ? { ...notification, readStatus: true }
            : notification
        )
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to mark notification as read');
    }
  };

  const markAllAsRead = async () => {
    try {
      setNotifications((prevNotifications) =>
        prevNotifications.map((notification) => ({
          ...notification,
          readStatus: true,
        }))
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to mark all notifications as read');
    }
  };

  const unreadCount = notifications.filter((n) => !n.readStatus).length;

  return (
    <NotificationsContext.Provider
      value={{
        notifications,
        unreadCount,
        isLoading,
        error,
        markAsRead,
        markAllAsRead,
        fetchNotificationData,
      }}
    >
      {children}
    </NotificationsContext.Provider>
  );
};

export const useNotifications = () => {
  const context = useContext(NotificationsContext);
  if (!context) {
    throw new Error('useNotifications must be used within a NotificationsProvider');
  }
  return context;
};
