import React, { useState } from 'react';
import { Plus, Search, Filter, MoreHorizontal, Trash, Edit, UserCheck, UserX } from 'lucide-react';
import { DataTable } from '../components/dashboard/DataTable';
import { useUsers } from '../hooks/useUsers';
import { User, UserRole, UserStatus } from '../types';

export const UsersPage: React.FC = () => {
  const { users, isLoading } = useUsers();
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState<UserRole | 'all'>('all');
  const [statusFilter, setStatusFilter] = useState<UserStatus | 'all'>('all');
  const [showModal, setShowModal] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [actionType, setActionType] = useState<'add' | 'edit'>('add');

  const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(e.target.value);
  };

  const handleAddNewUser = () => {
    setSelectedUser(null);
    setActionType('add');
    setShowModal(true);
  };

  const handleEditUser = (user: User) => {
    setSelectedUser(user);
    setActionType('edit');
    setShowModal(true);
  };

  const filteredUsers = users.filter((user) => {
    const matchesSearch = user.fullName.toLowerCase().includes(searchTerm.toLowerCase()) || 
                         user.email.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesRole = roleFilter === 'all' || user.role === roleFilter;
    const matchesStatus = statusFilter === 'all' || user.status === statusFilter;
    
    return matchesSearch && matchesRole && matchesStatus;
  });

  const columns = [
    {
      accessorKey: 'fullName',
      header: 'User',
      cell: ({ row }: any) => (
        <div className="flex items-center">
          <div className="h-8 w-8 rounded-full bg-primary-100 flex items-center justify-center text-primary-700 mr-3">
            {row.getValue('fullName').charAt(0)}
          </div>
          <div>
            <p className="font-medium text-neutral-800">{row.getValue('fullName')}</p>
            <p className="text-xs text-neutral-500">{row.original.email}</p>
          </div>
        </div>
      ),
    },
    {
      accessorKey: 'role',
      header: 'Role',
      cell: ({ row }: any) => {
        const roleStyles: Record<string, string> = {
          admin: 'bg-primary-100 text-primary-800',
          staff: 'bg-secondary-100 text-secondary-800',
          viewer: 'bg-neutral-100 text-neutral-800',
        };
        
        return (
          <span className={`px-2 py-1 text-xs rounded-full ${roleStyles[row.getValue('role')]}`}>
            {row.getValue('role')}
          </span>
        );
      },
    },
    {
      accessorKey: 'status',
      header: 'Status',
      cell: ({ row }: any) => {
        const statusStyles: Record<string, string> = {
          active: 'bg-success-100 text-success-800',
          inactive: 'bg-neutral-100 text-neutral-800',
          banned: 'bg-error-100 text-error-800',
        };
        
        return (
          <span className={`px-2 py-1 text-xs rounded-full ${statusStyles[row.getValue('status')]}`}>
            {row.getValue('status')}
          </span>
        );
      },
    },
    {
      accessorKey: 'signupDate',
      header: 'Joined',
      cell: ({ row }: any) => {
        return new Date(row.getValue('signupDate')).toLocaleDateString();
      },
    },
    {
      accessorKey: 'lastLogin',
      header: 'Last Login',
      cell: ({ row }: any) => {
        return row.getValue('lastLogin') 
          ? new Date(row.getValue('lastLogin')).toLocaleDateString() 
          : 'Never';
      },
    },
    {
      id: 'actions',
      header: 'Actions',
      cell: ({ row }: any) => {
        const [showDropdown, setShowDropdown] = useState(false);
        
        return (
          <div className="relative">
            <button 
              onClick={() => setShowDropdown(!showDropdown)}
              className="p-1 rounded-md hover:bg-neutral-100"
            >
              <MoreHorizontal size={18} />
            </button>
            
            {showDropdown && (
              <div className="absolute right-0 mt-1 w-48 bg-white rounded-md shadow-dropdown border border-neutral-200 py-1 z-10 animate-fade-in">
                <button
                  onClick={() => {
                    handleEditUser(row.original);
                    setShowDropdown(false);
                  }}
                  className="flex items-center w-full px-4 py-2 text-sm text-neutral-700 hover:bg-neutral-100"
                >
                  <Edit size={16} className="mr-2" />
                  Edit User
                </button>
                
                {row.original.status === 'active' ? (
                  <button
                    className="flex items-center w-full px-4 py-2 text-sm text-neutral-700 hover:bg-neutral-100"
                  >
                    <UserX size={16} className="mr-2" />
                    Deactivate
                  </button>
                ) : (
                  <button
                    className="flex items-center w-full px-4 py-2 text-sm text-neutral-700 hover:bg-neutral-100"
                  >
                    <UserCheck size={16} className="mr-2" />
                    Activate
                  </button>
                )}
                
                <button
                  className="flex items-center w-full px-4 py-2 text-sm text-error-600 hover:bg-neutral-100"
                >
                  <Trash size={16} className="mr-2" />
                  Delete
                </button>
              </div>
            )}
          </div>
        );
      },
    },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-neutral-900 mb-1">Users</h1>
        <p className="text-neutral-500">Manage user accounts and permissions</p>
      </div>
      
      <div className="bg-white rounded-lg shadow-card">
        <div className="p-6 border-b border-neutral-200">
          <div className="flex flex-col md:flex-row gap-4 justify-between">
            <div className="flex-1 max-w-md relative">
              <input
                type="text"
                placeholder="Search users..."
                value={searchTerm}
                onChange={handleSearch}
                className="w-full pl-10 pr-4 py-2 rounded-md border border-neutral-300 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              />
              <Search className="absolute left-3 top-2.5 text-neutral-400" size={18} />
            </div>
            
            <div className="flex flex-wrap gap-3">
              <div className="relative">
                <button className="flex items-center px-3 py-2 rounded-md border border-neutral-300 text-neutral-700 hover:bg-neutral-50">
                  <Filter size={16} className="mr-2" />
                  <span>Filter</span>
                </button>
              </div>
              
              <button 
                onClick={handleAddNewUser}
                className="flex items-center px-3 py-2 rounded-md bg-primary-600 text-white hover:bg-primary-700 transition-colors"
              >
                <Plus size={16} className="mr-2" />
                <span>Add User</span>
              </button>
            </div>
          </div>
        </div>
        
        {isLoading ? (
          <div className="flex justify-center items-center p-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left text-neutral-700">
              <thead className="text-xs text-neutral-500 uppercase bg-neutral-50 border-b border-neutral-200">
                <tr>
                  {columns.map((column) => (
                    <th key={column.accessorKey || column.id} className="px-4 py-3">
                      {column.header}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filteredUsers.map((user) => (
                  <tr key={user.id} className="border-b border-neutral-200 hover:bg-neutral-50">
                    <td className="px-4 py-3">
                      <div className="flex items-center">
                        <div className="h-8 w-8 rounded-full bg-primary-100 flex items-center justify-center text-primary-700 mr-3">
                          {user.fullName.charAt(0)}
                        </div>
                        <div>
                          <p className="font-medium text-neutral-800">{user.fullName}</p>
                          <p className="text-xs text-neutral-500">{user.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-1 text-xs rounded-full ${
                        user.role === 'admin' ? 'bg-primary-100 text-primary-800' :
                        user.role === 'staff' ? 'bg-secondary-100 text-secondary-800' :
                        'bg-neutral-100 text-neutral-800'
                      }`}>
                        {user.role}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-1 text-xs rounded-full ${
                        user.status === 'active' ? 'bg-success-100 text-success-800' :
                        user.status === 'banned' ? 'bg-error-100 text-error-800' :
                        'bg-neutral-100 text-neutral-800'
                      }`}>
                        {user.status}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      {new Date(user.signupDate).toLocaleDateString()}
                    </td>
                    <td className="px-4 py-3">
                      {user.lastLogin 
                        ? new Date(user.lastLogin).toLocaleDateString() 
                        : 'Never'}
                    </td>
                    <td className="px-4 py-3">
                      <div className="relative">
                        <button className="p-1 rounded-md hover:bg-neutral-100">
                          <MoreHorizontal size={18} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
      
      {/* User Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-neutral-900 bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-lg max-w-md w-full animate-fade-in">
            <div className="flex items-center justify-between p-4 border-b border-neutral-200">
              <h3 className="text-lg font-medium text-neutral-800">
                {actionType === 'add' ? 'Add New User' : 'Edit User'}
              </h3>
              <button
                onClick={() => setShowModal(false)}
                className="text-neutral-500 hover:text-neutral-700"
              >
                &times;
              </button>
            </div>
            
            <div className="p-4">
              <div className="space-y-4">
                <div>
                  <label htmlFor="fullName" className="block text-sm font-medium text-neutral-700 mb-1">
                    Full Name
                  </label>
                  <input
                    type="text"
                    id="fullName"
                    defaultValue={selectedUser?.fullName || ''}
                    className="w-full px-3 py-2 border border-neutral-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                    placeholder="John Doe"
                  />
                </div>
                <div>
                  <label htmlFor="email" className="block text-sm font-medium text-neutral-700 mb-1">
                    Email
                  </label>
                  <input
                    type="email"
                    id="email"
                    defaultValue={selectedUser?.email || ''}
                    className="w-full px-3 py-2 border border-neutral-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                    placeholder="john@example.com"
                  />
                </div>
                {actionType === 'add' && (
                  <div>
                    <label htmlFor="password" className="block text-sm font-medium text-neutral-700 mb-1">
                      Password
                    </label>
                    <input
                      type="password"
                      id="password"
                      className="w-full px-3 py-2 border border-neutral-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                      placeholder="••••••••"
                    />
                  </div>
                )}
                <div>
                  <label htmlFor="role" className="block text-sm font-medium text-neutral-700 mb-1">
                    Role
                  </label>
                  <select
                    id="role"
                    defaultValue={selectedUser?.role || 'viewer'}
                    className="w-full px-3 py-2 border border-neutral-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                  >
                    <option value="admin">Admin</option>
                    <option value="staff">Staff</option>
                    <option value="viewer">Viewer</option>
                  </select>
                </div>
                <div>
                  <label htmlFor="status" className="block text-sm font-medium text-neutral-700 mb-1">
                    Status
                  </label>
                  <select
                    id="status"
                    defaultValue={selectedUser?.status || 'active'}
                    className="w-full px-3 py-2 border border-neutral-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                  >
                    <option value="active">Active</option>
                    <option value="inactive">Inactive</option>
                    <option value="banned">Banned</option>
                  </select>
                </div>
              </div>
            </div>
            
            <div className="flex justify-end p-4 border-t border-neutral-200 space-x-3">
              <button
                onClick={() => setShowModal(false)}
                className="px-4 py-2 text-sm font-medium text-neutral-700 hover:bg-neutral-100 rounded-md"
              >
                Cancel
              </button>
              <button
                onClick={() => setShowModal(false)}
                className="px-4 py-2 text-sm font-medium text-white bg-primary-600 hover:bg-primary-700 rounded-md"
              >
                {actionType === 'add' ? 'Create User' : 'Save Changes'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};