import { useState, useEffect } from 'react';
import { User, PaginatedResponse } from '../types';
import { fetchUsers } from '../api/users';

interface UseUsersOptions {
  initialPage?: number;
  pageSize?: number;
  autoFetch?: boolean;
}

export const useUsers = (options: UseUsersOptions = {}) => {
  const { initialPage = 1, pageSize = 10, autoFetch = true } = options;
  
  const [users, setUsers] = useState<User[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(initialPage);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchUserData = async (pageNum = page, size = pageSize) => {
    setIsLoading(true);
    setError(null);
    
    try {
      // In a real app, this would call an API endpoint
      const response = await fetchUsers({ page: pageNum, limit: size });
      setUsers(response);
      setTotal(response.length);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch users');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (autoFetch) {
      fetchUserData();
    }
  }, [page, pageSize, autoFetch]);

  const nextPage = () => setPage((p) => Math.min(p + 1, Math.ceil(total / pageSize)));
  const prevPage = () => setPage((p) => Math.max(p - 1, 1));
  const goToPage = (pageNum: number) => setPage(pageNum);

  return {
    users,
    total,
    page,
    pageSize,
    isLoading,
    error,
    fetchUsers: fetchUserData,
    nextPage,
    prevPage,
    goToPage,
  };
};