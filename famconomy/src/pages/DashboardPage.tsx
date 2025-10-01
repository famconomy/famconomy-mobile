
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useAuth } from '../hooks/useAuth';
import { useFamily } from '../hooks/useFamily';
import { getDashboardData, DashboardData, DashboardLeaderboardEntry } from '../api/dashboard';
import { 
  CalendarDays,
  CheckSquare,
  MessageCircle,
  ShoppingCart,
  PiggyBank,
  Users,
  BookHeart,
  TrendingUp,
  Star,
  Award,
  Loader2
} from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { CreateFamily } from '../components/family/CreateFamily';
import { NotificationsList } from '../components/dashboard/NotificationsList';

interface DashboardWidgetProps {
  title: string;
  icon: React.ReactNode;
  description: string;
  link: string;
  stats?: {
    value: string;
    label: string;
  };
  color: string;
  id?: string;
}

const DashboardWidget: React.FC<DashboardWidgetProps> = ({ 
  title, 
  icon, 
  description, 
  link,
  stats,
  color,
  id
}) => {
  return (
    <Link 
      to={link}
      id={id}
      className="bg-white dark:bg-neutral-800 rounded-2xl shadow-card hover:shadow-card-hover transition-all p-6"
    >
      <div className="flex items-center justify-between mb-4">
        <div className={`p-3 rounded-xl ${color}`}>
          {icon}
        </div>
        {stats && (
          <div className="text-right">
            <p className="text-2xl font-semibold text-neutral-900 dark:text-white">
              {stats.value}
            </p>
            <p className="text-sm text-neutral-500 dark:text-neutral-400">
              {stats.label}
            </p>
          </div>
        )}
      </div>
      <h3 className="text-lg font-semibold text-neutral-900 dark:text-white mb-2">
        {title}
      </h3>
      <p className="text-neutral-500 dark:text-neutral-400">
        {description}
      </p>
    </Link>
  );
};

const formatNumber = (value?: number | null): string => {
  if (value === undefined || value === null || Number.isNaN(value)) return '0';
  return value.toLocaleString();
};

const formatPoints = (value?: number | null): string => {
  if (value === undefined || value === null || Number.isNaN(value)) return '0';
  const options: Intl.NumberFormatOptions = Number.isInteger(value)
    ? { maximumFractionDigits: 0 }
    : { maximumFractionDigits: 1 };
  return value.toLocaleString(undefined, options);
};

const normalizeValues = (values: string[] = []): string[] =>
  Array.from(new Set(values.map(value => value.trim()).filter(Boolean)));

export const DashboardPage: React.FC = () => {
  const { user } = useAuth();
  const { family, isLoading: isFamilyLoading } = useFamily();
  const navigate = useNavigate();
  const [dashboardData, setDashboardData] = useState<DashboardData | null>(null);
  const [isDashboardLoading, setIsDashboardLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fallbackDashboardData: DashboardData = useMemo(() => ({
    upcomingEvents: 0,
    pendingTasks: 0,
    unreadMessages: 0,
    activeMembers: 0,
    familyName: family?.FamilyName ?? null,
    familyMantra: family?.FamilyMantra ?? null,
    familyValues: Array.isArray(family?.FamilyValues) ? [...(family?.FamilyValues ?? [])] : [],
    leaderboard: [],
  }), [family?.FamilyName, family?.FamilyMantra, family?.FamilyValues]);

  const fetchData = useCallback(async () => {
    if (!family) {
      if (!isFamilyLoading) {
        setIsDashboardLoading(false);
      }
      return;
    }
    try {
      setIsDashboardLoading(true);
      const data = await getDashboardData(family.FamilyID.toString());
      setDashboardData(data);
      setError(null);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'We had trouble loading the latest dashboard insights.';
      setError(message);
      setDashboardData(prev => prev ?? fallbackDashboardData);
    } finally {
      setIsDashboardLoading(false);
    }
  }, [family, fallbackDashboardData, isFamilyLoading]);

  useEffect(() => {
    if (isFamilyLoading) {
      return;
    }
    fetchData();
  }, [fetchData, isFamilyLoading]);

  const familyDisplayName = (dashboardData?.familyName ?? family?.FamilyName)?.trim();
  const greetingName = familyDisplayName ? `${familyDisplayName} Family` : user?.fullName || 'Guest';
  const familyMantra = dashboardData?.familyMantra ?? family?.FamilyMantra ?? '';

  const familyValuesList = useMemo(() => {
    const values = dashboardData?.familyValues && dashboardData.familyValues.length
      ? dashboardData.familyValues
      : family?.FamilyValues ?? [];
    return normalizeValues(values);
  }, [dashboardData?.familyValues, family?.FamilyValues]);

  const [currentValueIndex, setCurrentValueIndex] = useState(0);

  useEffect(() => {
    if (!familyValuesList.length) {
      setCurrentValueIndex(0);
      return;
    }
    setCurrentValueIndex(Math.floor(Math.random() * familyValuesList.length));
  }, [familyValuesList]);

  useEffect(() => {
    if (familyValuesList.length < 2) return;
    const interval = window.setInterval(() => {
      setCurrentValueIndex(prev => (prev + 1) % familyValuesList.length);
    }, 8000);
    return () => window.clearInterval(interval);
  }, [familyValuesList]);

  const featuredValue = familyValuesList.length ? familyValuesList[currentValueIndex] : null;

  const parentWidgets = [
    {
      title: 'Family Calendar',
      icon: <CalendarDays className="text-primary-600 dark:text-primary-400" size={24} />,
      description: 'View and manage family events and schedules',
      link: '/calendar',
      stats: { value: dashboardData?.upcomingEvents.toString() || '0', label: 'Upcoming events' },
      color: 'bg-primary-100 dark:bg-primary-900/30'
    },
    {
      title: 'Finance Overview',
      icon: <PiggyBank className="text-secondary-600 dark:text-secondary-400" size={24} />,
      description: 'Track family finances, expenses and savings',
      link: '/budget',
      stats: { value: '$0', label: 'Monthly budget' }, // Placeholder
      color: 'bg-secondary-100 dark:bg-secondary-900/30',
      id: 'budget-widget'
    },
    {
      title: 'Family Members',
      icon: <Users className="text-accent-600 dark:text-accent-400" size={24} />,
      description: 'Manage family members and permissions',
      link: '/family',
      stats: { value: dashboardData?.activeMembers.toString() || '0', label: 'Active members' },
      color: 'bg-accent-100 dark:bg-accent-900/30'
    },
    {
      title: 'Shopping Lists',
      icon: <ShoppingCart className="text-highlight-teal" size={24} />,
      description: 'Organize household shopping and needs',
      link: '/shopping',
      stats: { value: '0', label: 'Active lists' }, // Placeholder
      color: 'bg-highlight-teal/20 dark:bg-highlight-teal/30'
    }
  ];

  const childWidgets = [
    {
      title: 'My Tasks',
      icon: <CheckSquare className="text-primary-600 dark:text-primary-400" size={24} />,
      description: 'View and complete your assigned tasks',
      link: '/tasks',
      stats: { value: dashboardData?.pendingTasks.toString() || '0', label: 'Pending tasks' },
      color: 'bg-primary-100 dark:bg-primary-900/30',
      id: 'tasks-widget'
    },
    {
      title: 'Messages',
      icon: <MessageCircle className="text-secondary-600 dark:text-secondary-400" size={24} />,
      description: 'Chat with family members',
      link: '/messages',
      stats: { value: dashboardData?.unreadMessages.toString() || '0', label: 'Unread messages' },
      color: 'bg-secondary-100 dark:bg-secondary-900/30'
    },
    {
      title: 'Journal',
      icon: <BookHeart className="text-accent-600 dark:text-accent-400" size={24} />,
      description: 'Write about your day and experiences',
      link: '/journal',
      color: 'bg-accent-100 dark:bg-accent-900/30'
    },
    {
      title: 'Achievements',
      icon: <Star className="text-highlight-teal" size={24} />,
      description: 'Track your progress and rewards',
      link: '/achievements',
      stats: { value: '0', label: 'Points earned' }, // Placeholder
      color: 'bg-highlight-teal/20 dark:bg-highlight-teal/30'
    }
  ];

  const widgets = user?.role === 'parent' ? parentWidgets : childWidgets;

  if (!family) {
    if (isFamilyLoading) {
      return (
        <div className="min-h-[40vh] flex items-center justify-center">
          <Loader2 className="h-6 w-6 animate-spin text-primary-500" />
        </div>
      );
    }
    return <CreateFamily onFamilyCreated={() => navigate('/family')} />;
  }

  if (isDashboardLoading) {
    return (
      <div className="min-h-[40vh] flex items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-primary-500" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {error && (
        <div className="rounded-xl border border-warning-200 bg-warning-50 px-4 py-3 text-warning-800 dark:border-warning-400/40 dark:bg-warning-900/30 dark:text-warning-200">
          <p className="font-medium">Some insights are unavailable right now.</p>
          <p className="text-sm opacity-80">{error}</p>
        </div>
      )}
      <div id="dashboard-title">
        <h1 className="text-3xl font-bold text-neutral-900 dark:text-white mb-2">
          Welcome, {user?.fullName || 'Guest'}
        </h1>
        <p className="text-neutral-500 dark:text-neutral-400">
          Here's an overview of your family's activities and important updates
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {widgets.map((widget) => (
          <DashboardWidget key={widget.title} {...widget} />
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-white dark:bg-neutral-800 rounded-2xl shadow-card p-6">
          <h2 className="text-lg font-semibold text-neutral-900 dark:text-white mb-4">
            Recent Activity
          </h2>
          <div className="space-y-4">
            {/* This will be replaced with real data later */}
            <div className="flex items-center gap-4">
              <div className="p-2 rounded-lg bg-primary-100 dark:bg-primary-900/30 text-primary-600 dark:text-primary-400">
                <CalendarDays size={20} />
              </div>
              <div>
                <p className="text-neutral-900 dark:text-white">
                  Family dinner scheduled for tomorrow at 7 PM
                </p>
                <p className="text-sm text-neutral-500 dark:text-neutral-400">
                  2 hours ago
                </p>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <div className="p-2 rounded-lg bg-secondary-100 dark:bg-secondary-900/30 text-secondary-600 dark:text-secondary-400">
                <CheckSquare size={20} />
              </div>
              <div>
                <p className="text-neutral-900 dark:text-white">
                  Emma completed homework task
                </p>
                <p className="text-sm text-neutral-500 dark:text-neutral-400">
                  4 hours ago
                </p>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <div className="p-2 rounded-lg bg-accent-100 dark:bg-accent-900/30 text-accent-600 dark:text-accent-400">
                <ShoppingCart size={20} />
              </div>
              <div>
                <p className="text-neutral-900 dark:text-white">
                  New items added to grocery list
                </p>
                <p className="text-sm text-neutral-500 dark:text-neutral-400">
                  Yesterday
                </p>
              </div>
            </div>
          </div>
        </div>
        <div className="lg:col-span-1">
          <NotificationsList />
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white dark:bg-neutral-800 rounded-2xl shadow-card p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-neutral-900 dark:text-white">
              Task Completion
            </h3>
            <TrendingUp className="text-success-500" size={24} />
          </div>
          <p className="text-3xl font-bold text-neutral-900 dark:text-white mb-2">
            0%
          </p>
          <p className="text-neutral-500 dark:text-neutral-400">
            Weekly progress
          </p>
        </div>

        <div className="bg-white dark:bg-neutral-800 rounded-2xl shadow-card p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-neutral-900 dark:text-white">
              Family Goals
            </h3>
            <Star className="text-warning-500" size={24} />
          </div>
          <p className="text-3xl font-bold text-neutral-900 dark:text-white mb-2">
            0/0
          </p>
          <p className="text-neutral-500 dark:text-neutral-400">
            Monthly goals achieved
          </p>
        </div>

        <div className="bg-white dark:bg-neutral-800 rounded-2xl shadow-card p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-neutral-900 dark:text-white">
              Active Members
            </h3>
            <Users className="text-primary-500" size={24} />
          </div>
          <p className="text-3xl font-bold text-neutral-900 dark:text-white mb-2">
            {dashboardData?.activeMembers.toString() || '0'}
          </p>
          <p className="text-neutral-500 dark:text-neutral-400">
            Currently online
          </p>
        </div>
      </div>
    </div>
  );
};
