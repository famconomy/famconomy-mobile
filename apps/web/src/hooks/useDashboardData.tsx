import { useState, useEffect } from 'react';
import { MetricCard, ChartData, User, Transaction } from '../types';
import { fetchMetrics, fetchUserGrowth, fetchRevenue, fetchUserRoles, fetchUsers, fetchTransactions } from '../api/dashboard';

interface DashboardData {
  metrics: {
    totalUsers: number;
    userGrowth: number;
    activeUsers: number;
    activeUserChange: number;
    monthlyRevenue: number;
    revenueGrowth: number;
    conversionRate: number;
    conversionChange: number;
  };
  chartData: {
    userGrowth: ChartData;
    revenue: ChartData;
    userRoles: ChartData;
  };
  recentUsers: User[];
  recentTransactions: Transaction[];
}

export const useDashboardData = () => {
  const [data, setData] = useState<DashboardData>({
    metrics: {
      totalUsers: 0,
      userGrowth: 0,
      activeUsers: 0,
      activeUserChange: 0,
      monthlyRevenue: 0,
      revenueGrowth: 0,
      conversionRate: 0,
      conversionChange: 0,
    },
    chartData: {
      userGrowth: {
        labels: [],
        datasets: [],
      },
      revenue: {
        labels: [],
        datasets: [],
      },
      userRoles: {
        labels: [],
        datasets: [],
      },
    },
    recentUsers: [],
    recentTransactions: [],
  });
  
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchDashboardData = async () => {
      setIsLoading(true);
      setError(null);
      
      try {
        // In a real app, these would be API calls
        const metrics = await fetchMetrics();
        const userGrowthData = await fetchUserGrowth();
        const revenueData = await fetchRevenue();
        const userRolesData = await fetchUserRoles();
        const recentUsers = await fetchUsers({ limit: 5 });
        const recentTransactions = await fetchTransactions({ limit: 5 });
        
        setData({
          metrics,
          chartData: {
            userGrowth: userGrowthData,
            revenue: revenueData,
            userRoles: userRolesData,
          },
          recentUsers,
          recentTransactions,
        });
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to fetch dashboard data');
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchDashboardData();
  }, []);

  return { ...data, isLoading, error };
};