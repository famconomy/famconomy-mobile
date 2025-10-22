import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Bell, Search, Menu, X } from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import { Notification } from '../../types';
import { useNotifications } from '../../hooks/useNotifications';
// Removed direct import of markNotificationAsRead
import { Logo } from '../ui/Logo';

interface HeaderProps {
  onMenuToggle: () => void;
  isMobileMenuOpen: boolean;
}

export const Header: React.FC<HeaderProps> = ({ onMenuToggle, isMobileMenuOpen }) => {
  const { user, logout } = useAuth();
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const { notifications, markAsRead } = useNotifications(); // Destructure markAsRead
  
  const unreadCount = notifications.filter(n => !n.readStatus).length;

  return (
    <header className="bg-white dark:bg-neutral-800 border-b border-neutral-200 dark:border-neutral-700 h-16 px-4 flex items-center justify-between">
      <div className="lg:hidden flex items-center">
        <button 
          id="nav-toggle"
          onClick={onMenuToggle}
          className="p-2 rounded-2xl text-neutral-500 dark:text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-700"
        >
          {isMobileMenuOpen ? <X size={20} /> : <Menu size={20} />}
        </button>
      </div>

      <div className="lg:hidden">
        <Logo size="sm" />
      </div>
      
      <div className="hidden md:flex items-center flex-1 max-w-xl">
        <div className="relative w-full">
          <input
            type="text"
            placeholder="Search..."
            className="w-full pl-10 pr-4 py-2 rounded-2xl border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-neutral-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-500 dark:focus:ring-primary-400"
          />
          <Search className="absolute left-3 top-2.5 text-neutral-400 dark:text-neutral-500" size={18} />
        </div>
      </div>
      
      <div className="flex items-center ml-auto space-x-4">
        <div className="relative">
          <button 
            onClick={() => setIsNotificationsOpen(!isNotificationsOpen)}
            className="p-2 rounded-2xl hover:bg-neutral-100 dark:hover:bg-neutral-700 relative"
          >
            <Bell size={20} className="text-neutral-600 dark:text-neutral-400" />
            {unreadCount > 0 && (
              <span className="absolute top-0 right-0 h-5 w-5 text-xs flex items-center justify-center bg-accent-400 text-white rounded-full">
                {unreadCount > 9 ? '9+' : unreadCount}
              </span>
            )}
          </button>
          
          {isNotificationsOpen && (
            <div className="absolute right-0 mt-2 w-80 bg-white dark:bg-neutral-800 rounded-2xl shadow-dropdown border border-neutral-200 dark:border-neutral-700 py-2 z-10 animate-fade-in">
              <div className="px-4 py-2 border-b border-neutral-200 dark:border-neutral-700">
                <h3 className="font-medium text-neutral-900 dark:text-white">Notifications</h3>
              </div>
              
              <div className="max-h-96 overflow-y-auto">
                {notifications.length > 0 ? (
                  notifications.slice(0, 5).map((notification: Notification) => {
                    // Add a check here to ensure notification and notification.createdAt are valid
                    if (!notification || !notification.createdAt) {
                      return null; // Skip rendering this invalid notification
                    }
                    return (
                      <Link
                        to={notification.link || '/notifications'} // Use notification.link or default to /notifications
                        key={notification.id}
                        onClick={() => markAsRead(notification.id)} // Mark as read when clicked
                        className={`block px-4 py-3 border-b border-neutral-100 dark:border-neutral-700 hover:bg-neutral-50 dark:hover:bg-neutral-700/50 ${
                          !notification.readStatus ? 'bg-primary-50 dark:bg-primary-900/30' : ''
                        }`}
                      >
                        <p className="text-sm text-neutral-700 dark:text-neutral-300">
                          {notification.message}
                        </p>
                        <p className="text-xs text-neutral-500 dark:text-neutral-500 mt-1">
                          {new Date(notification.createdAt).toLocaleString()}
                        </p>
                      </Link>
                    );
                  })
                ) : (
                  <div className="px-4 py-3 text-sm text-neutral-500 dark:text-neutral-400">
                    No notifications
                  </div>
                )}
              </div>
              
              
            </div>
          )}
        </div>
        
        <div className="relative">
          <button 
            onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
            className="flex items-center space-x-2 hover:bg-neutral-100 dark:hover:bg-neutral-700 rounded-2xl p-2"
          >
            <div className="h-8 w-8 rounded-full bg-primary-100 dark:bg-primary-900 flex items-center justify-center text-primary-500 dark:text-primary-400">
              {user?.fullName?.charAt(0) || 'U'}
            </div>
            <span className="hidden md:block text-sm font-medium text-neutral-700 dark:text-neutral-300">
              {user?.fullName || 'User'}
            </span>
          </button>
          
          {isUserMenuOpen && (
            <div className="absolute right-0 mt-2 w-48 bg-white dark:bg-neutral-800 rounded-2xl shadow-dropdown border border-neutral-200 dark:border-neutral-700 py-1 z-10 animate-fade-in">
              <Link 
                to="/profile" 
                className="block px-4 py-2 text-sm text-neutral-700 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-700"
              >
                Your Profile
              </Link>
              <Link 
                to="/settings" 
                className="block px-4 py-2 text-sm text-neutral-700 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-700"
              >
                Settings
              </Link>
              <hr className="my-1 border-neutral-200 dark:border-neutral-700" />
              <button 
                onClick={logout}
                className="block w-full text-left px-4 py-2 text-sm text-neutral-700 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-700"
              >
                Sign out
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};
