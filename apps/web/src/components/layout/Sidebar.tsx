import React, { useState, useMemo } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { 
  LayoutDashboard,
  CalendarDays,
  CheckSquare,
  MessageCircle,
  ShoppingCart,
  Gift,
  PiggyBank,
  Users,
  BookHeart,
  Star,
  Settings,
  Moon,
  Sun,
  ChevronLeft,
  ChevronRight,
  LogOut,
  MessageSquarePlus,
  Briefcase,
  BookOpen,
  ChefHat
} from 'lucide-react';
import { createDebugLogger } from '../../utils/debug';
import { useAuth } from '../../hooks/useAuth';
import { useTheme } from '../../contexts/ThemeContext';
import { Logo } from '../ui/Logo';
import { FeedbackModal } from '../FeedbackModal';
import { submitFeedback } from '../../api/feedback';

interface SidebarProps {
  onNavigate?: () => void;
  collapsed: boolean;
  onCollapsedChange: (collapsed: boolean) => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ onNavigate, collapsed, onCollapsedChange }) => {
  const [isFeedbackModalOpen, setIsFeedbackModalOpen] = useState(false);
  const { logout, user } = useAuth();
  const { isDarkMode, toggleTheme } = useTheme();
  const navigate = useNavigate();
  const sidebarDebug = useMemo(() => createDebugLogger('sidebar'), []);

  const handleLogoClick = () => {
    navigate('/');
    onNavigate?.();
  };

  const handleFeedbackSubmit = async (feedbackType: string, message: string, screenshot?: File) => {
    try {
      await submitFeedback(feedbackType, message, screenshot);
      alert('Feedback submitted successfully!');
    } catch (error) {
      sidebarDebug.error('Error submitting feedback:', error);
      alert('There was an error submitting your feedback. Please try again.');
    }
  };

  const navItems = [
    { id: 'nav-dashboard', name: 'Dashboard', path: '/', icon: <LayoutDashboard size={20} />, color: 'hover:bg-primary-100 hover:text-primary-600 dark:hover:bg-primary-900/30 dark:hover:text-primary-400' },
    { id: 'nav-calendar', name: 'Calendar', path: '/calendar', icon: <CalendarDays size={20} />, color: 'hover:bg-secondary-100 hover:text-secondary-600 dark:hover:bg-secondary-900/30 dark:hover:text-secondary-400' },
    { id: 'nav-tasks', name: 'Tasks', path: '/tasks', icon: <CheckSquare size={20} />, color: 'hover:bg-accent-100 hover:text-accent-600 dark:hover:bg-accent-900/30 dark:hover:text-accent-400' },
    { id: 'nav-gigs', name: 'Gigs', path: '/gigs', icon: <Briefcase size={20} />, color: 'hover:bg-primary-100 hover:text-primary-600 dark:hover:bg-primary-900/30 dark:hover:text-primary-400' },
    { id: 'nav-messages', name: 'Messages', path: '/messages', icon: <MessageCircle size={20} />, color: 'hover:bg-secondary-100 hover:text-secondary-600 dark:hover:bg-secondary-900/30 dark:hover:text-secondary-400' },
    { id: 'nav-recipes', name: 'Recipes', path: '/recipes', icon: <ChefHat size={20} />, color: 'hover:bg-accent-100 hover:text-accent-600 dark:hover:bg-accent-900/30 dark:hover:text-accent-400' },
    { id: 'nav-shopping', name: 'Shopping', path: '/shopping', icon: <ShoppingCart size={20} />, color: 'hover:bg-highlight-teal/20 hover:text-highlight-teal dark:hover:bg-highlight-teal/30 dark:hover:text-highlight-teal' },
    { id: 'nav-wishlists', name: 'Wishlists', path: '/wishlists', icon: <Gift size={20} />, color: 'hover:bg-primary-100 hover:text-primary-600 dark:hover:bg-primary-900/30 dark:hover:text-primary-400' },
    { id: 'nav-budget', name: 'Finance', path: '/budget', icon: <PiggyBank size={20} />, color: 'hover:bg-secondary-100 hover:text-secondary-600 dark:hover:bg-secondary-900/30 dark:hover:text-secondary-400' },
    { id: 'nav-family', name: 'Family', path: '/family', icon: <Users size={20} />, color: 'hover:bg-accent-100 hover:text-accent-600 dark:hover:bg-accent-900/30 dark:hover:text-accent-400' },
    { id: 'nav-values', name: 'Values', path: '/family/values', icon: <Star size={20} />, color: 'hover:bg-primary-100 hover:text-primary-600 dark:hover:bg-primary-900/30 dark:hover:text-primary-400' },
    { id: 'nav-journal', name: 'Journal', path: '/journal', icon: <BookHeart size={20} />, color: 'hover:bg-secondary-100 hover:text-secondary-600 dark:hover:bg-secondary-900/30 dark:hover:text-secondary-400' },
    { id: 'nav-resources', name: 'Resources', path: '/resources', icon: <BookOpen size={20} />, color: 'hover:bg-accent-100 hover:text-accent-600 dark:hover:bg-accent-900/30 dark:hover:text-accent-400' },
    { id: 'nav-settings', name: 'Settings', path: '/settings', icon: <Settings size={20} />, color: 'hover:bg-neutral-100 hover:text-neutral-600 dark:hover:bg-neutral-700 dark:hover:text-neutral-300' },
  ];

  const handleNavigation = () => {
    onNavigate?.();
  };

  const toggleDarkMode = () => {
    toggleTheme();
  };

  return (
    <>
      <aside 
        className={`bg-white/80 dark:bg-neutral-800/80 backdrop-blur-lg h-screen border-r border-neutral-200 dark:border-neutral-700 transition-all duration-300 flex flex-col ${
          collapsed ? 'w-20' : 'w-64'
        }`}
      >
        <div className="flex items-center p-4 border-b border-neutral-200 dark:border-neutral-700 h-16">
          <button onClick={handleLogoClick} className="flex-1">
            {collapsed ? (
              <Logo variant="icon" size="sm" />
            ) : (
              <Logo size="md" />
            )}
          </button>
          <button 
            onClick={() => onCollapsedChange(!collapsed)}
            className={`p-1 rounded-md hover:bg-neutral-100 dark:hover:bg-neutral-700 text-neutral-500 dark:text-neutral-400`}
          >
            {collapsed ? <ChevronRight size={18} /> : <ChevronLeft size={18} />}
            </button>
          </div>
          
          <nav className="flex-1 py-4 overflow-y-auto">
            <ul className="px-2 space-y-1">
              {navItems.map((item) => (
                <li key={item.path}>
                  <NavLink
                    id={item.id}
                    to={item.path}
                    onClick={handleNavigation}
                    className={({ isActive }) => `
                      flex items-center px-3 py-2 rounded-2xl transition-colors ${
                        isActive 
                          ? 'bg-primary-50 text-primary-500 dark:bg-primary-900/50 dark:text-primary-400' 
                          : `text-neutral-600 dark:text-neutral-400 ${item.color}`
                      }
                    `}
                  >
                    <span className="flex-shrink-0">{item.icon}</span>
                    {!collapsed && <span className="ml-3">{item.name}</span>}
                  </NavLink>
                </li>
              ))}
            </ul>
          </nav>
          
          <div className="p-4 border-t border-neutral-200 dark:border-neutral-700 space-y-2">
            <button 
              id="sidebar-feedback"
              onClick={() => setIsFeedbackModalOpen(true)}
              className="flex items-center w-full px-3 py-2 text-neutral-600 dark:text-neutral-400 rounded-2xl hover:bg-neutral-100 dark:hover:bg-neutral-700 transition-colors"
            >
              <MessageSquarePlus size={20} />
              {!collapsed && <span className="ml-3">Feedback</span>}
            </button>

            <button 
              onClick={toggleDarkMode}
              className="flex items-center w-full px-3 py-2 text-neutral-600 dark:text-neutral-400 rounded-2xl hover:bg-neutral-100 dark:hover:bg-neutral-700 transition-colors"
            >
              {isDarkMode ? <Sun size={20} /> : <Moon size={20} />}
              {!collapsed && <span className="ml-3">Theme</span>}
            </button>
            
            <button 
              onClick={logout}
              className="flex items-center w-full px-3 py-2 text-neutral-600 dark:text-neutral-400 rounded-2xl hover:bg-neutral-100 dark:hover:bg-neutral-700 transition-colors"
            >
              <LogOut size={20} />
              {!collapsed && <span className="ml-3">Logout</span>}
            </button>
          </div>
        </aside>
        <FeedbackModal
          isOpen={isFeedbackModalOpen}
          onClose={() => setIsFeedbackModalOpen(false)}
          onSubmit={handleFeedbackSubmit}
        />
      </>
    );
  };
