import React from 'react';
import { Link } from 'react-router-dom';
import { Bell } from 'lucide-react';
import { Notification } from '../../types';
import { formatDistanceToNow } from 'date-fns';
import { useNotifications } from '../../hooks/useNotifications';

export const NotificationsList: React.FC = () => {
  const { notifications, markAsRead } = useNotifications();
  
  return (
    <div className="bg-white/90 dark:bg-neutral-800/90 backdrop-blur-sm rounded-2xl shadow-card border border-neutral-200/60 dark:border-neutral-700/60 p-6 h-full">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-neutral-900 dark:text-white">Recent Notifications</h3>
        <button className="text-primary-600 dark:text-primary-400 text-sm font-medium hover:text-primary-700 dark:hover:text-primary-300 transition-colors">
          View all
        </button>
      </div>
      
      <div className="space-y-3">
        {notifications.length > 0 ? (
          notifications.slice(0, 5).map((notification: Notification) => {
            // Add a check here to ensure notification and notification.createdAt are valid
            if (!notification || !notification.createdAt) {
              return null; // Skip rendering this invalid notification
            }
            const notificationContent = (
              <div
                className={`flex items-start gap-3 p-4 rounded-2xl border transition-colors ${
                  !notification.readStatus
                    ? 'bg-primary-50/70 border-primary-100 dark:bg-primary-900/30 dark:border-primary-800'
                    : 'bg-neutral-50 border-neutral-100 dark:bg-neutral-800 dark:border-neutral-700'
                }`}
              >
                <div className="p-2 rounded-full bg-primary-100 text-primary-600 dark:bg-primary-900/50 dark:text-primary-300">
                  <Bell size={16} />
                </div>

                <div className="flex-1">
                  <p className="text-sm text-neutral-700 dark:text-neutral-200">{notification.message}</p>
                  <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-1">
                    {formatDistanceToNow(new Date(notification.createdAt), { addSuffix: true })}
                  </p>
                </div>

                {!notification.readStatus && (
                  <button
                    onClick={(e) => {
                      if (notification.link) e.preventDefault();
                      markAsRead(notification.id);
                    }}
                    className="text-xs font-medium text-primary-600 dark:text-primary-300 hover:text-primary-700 dark:hover:text-primary-200"
                  >
                    Mark as read
                  </button>
                )}
              </div>
            );

            if (notification.link) {
              return (
                <Link to={notification.link} key={notification.id}>
                  {notificationContent}
                </Link>
              );
            }
            return <div key={notification.id}>{notificationContent}</div>;
          })
        ) : (
          <div className="text-center py-6 text-neutral-500 dark:text-neutral-400">
            <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-neutral-100 dark:bg-neutral-700/60">
              <Bell size={24} className="text-neutral-400 dark:text-neutral-300" />
            </div>
            <p className="text-sm">No new notifications</p>
          </div>
        )}
      </div>
    </div>
  );
};
