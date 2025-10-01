import React, { useState } from 'react';
import { 
  UserPlus, 
  Bell, 
  FileText, 
  Download 
} from 'lucide-react';

interface QuickActionButtonProps {
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
}

const QuickActionButton: React.FC<QuickActionButtonProps> = ({ 
  icon, 
  label,
  onClick
}) => {
  return (
    <button
      onClick={onClick}
      className="flex items-center p-3 w-full rounded-md border border-neutral-200 hover:bg-neutral-50 transition-colors"
    >
      <div className="mr-3 text-primary-600">{icon}</div>
      <span className="text-sm font-medium text-neutral-700">{label}</span>
    </button>
  );
};

export const QuickActions: React.FC = () => {
  const [showModal, setShowModal] = useState(false);
  const [modalContent, setModalContent] = useState<{
    title: string;
    content: React.ReactNode;
  } | null>(null);

  const handleAddUser = () => {
    setModalContent({
      title: 'Add New User',
      content: (
        <div className="space-y-4">
          <div>
            <label htmlFor="fullName" className="block text-sm font-medium text-neutral-700 mb-1">
              Full Name
            </label>
            <input
              type="text"
              id="fullName"
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
              className="w-full px-3 py-2 border border-neutral-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
              placeholder="john@example.com"
            />
          </div>
          <div>
            <label htmlFor="role" className="block text-sm font-medium text-neutral-700 mb-1">
              Role
            </label>
            <select
              id="role"
              className="w-full px-3 py-2 border border-neutral-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
            >
              <option value="admin">Admin</option>
              <option value="staff">Staff</option>
              <option value="viewer">Viewer</option>
            </select>
          </div>
        </div>
      ),
    });
    setShowModal(true);
  };

  const handleSendNotification = () => {
    setModalContent({
      title: 'Send Notification',
      content: (
        <div className="space-y-4">
          <div>
            <label htmlFor="recipients" className="block text-sm font-medium text-neutral-700 mb-1">
              Recipients
            </label>
            <select
              id="recipients"
              className="w-full px-3 py-2 border border-neutral-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
            >
              <option value="all">All Users</option>
              <option value="admins">Admins Only</option>
              <option value="staff">Staff Only</option>
              <option value="inactive">Inactive Users</option>
            </select>
          </div>
          <div>
            <label htmlFor="message" className="block text-sm font-medium text-neutral-700 mb-1">
              Message
            </label>
            <textarea
              id="message"
              rows={3}
              className="w-full px-3 py-2 border border-neutral-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
              placeholder="Type your notification message here..."
            ></textarea>
          </div>
        </div>
      ),
    });
    setShowModal(true);
  };

  const handleGenerateReport = () => {
    setModalContent({
      title: 'Generate Report',
      content: (
        <div className="space-y-4">
          <div>
            <label htmlFor="reportType" className="block text-sm font-medium text-neutral-700 mb-1">
              Report Type
            </label>
            <select
              id="reportType"
              className="w-full px-3 py-2 border border-neutral-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
            >
              <option value="users">Users Report</option>
              <option value="transactions">Transactions Report</option>
              <option value="activity">Activity Report</option>
            </select>
          </div>
          <div>
            <label htmlFor="dateRange" className="block text-sm font-medium text-neutral-700 mb-1">
              Date Range
            </label>
            <select
              id="dateRange"
              className="w-full px-3 py-2 border border-neutral-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
            >
              <option value="7days">Last 7 Days</option>
              <option value="30days">Last 30 Days</option>
              <option value="90days">Last 90 Days</option>
              <option value="year">This Year</option>
            </select>
          </div>
          <div>
            <label htmlFor="format" className="block text-sm font-medium text-neutral-700 mb-1">
              Format
            </label>
            <select
              id="format"
              className="w-full px-3 py-2 border border-neutral-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
            >
              <option value="csv">CSV</option>
              <option value="pdf">PDF</option>
              <option value="excel">Excel</option>
            </select>
          </div>
        </div>
      ),
    });
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setModalContent(null);
  };

  return (
    <>
      <div className="bg-white rounded-lg shadow-card p-6 h-full">
        <h3 className="text-lg font-medium text-neutral-800 mb-4">Quick Actions</h3>
        
        <div className="space-y-3">
          <QuickActionButton
            icon={<UserPlus size={20} />}
            label="Add New User"
            onClick={handleAddUser}
          />
          
          <QuickActionButton
            icon={<Bell size={20} />}
            label="Send Notification"
            onClick={handleSendNotification}
          />
          
          <QuickActionButton
            icon={<FileText size={20} />}
            label="Generate Report"
            onClick={handleGenerateReport}
          />
          
          <QuickActionButton
            icon={<Download size={20} />}
            label="Export Data"
            onClick={handleGenerateReport}
          />
        </div>
      </div>
      
      {/* Modal */}
      {showModal && modalContent && (
        <div className="fixed inset-0 bg-neutral-900 bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-lg max-w-md w-full animate-fade-in">
            <div className="flex items-center justify-between p-4 border-b border-neutral-200">
              <h3 className="text-lg font-medium text-neutral-800">{modalContent.title}</h3>
              <button
                onClick={closeModal}
                className="text-neutral-500 hover:text-neutral-700"
              >
                &times;
              </button>
            </div>
            
            <div className="p-4">
              {modalContent.content}
            </div>
            
            <div className="flex justify-end p-4 border-t border-neutral-200 space-x-3">
              <button
                onClick={closeModal}
                className="px-4 py-2 text-sm font-medium text-neutral-700 hover:bg-neutral-100 rounded-md"
              >
                Cancel
              </button>
              <button
                onClick={closeModal}
                className="px-4 py-2 text-sm font-medium text-white bg-primary-600 hover:bg-primary-700 rounded-md"
              >
                Confirm
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};