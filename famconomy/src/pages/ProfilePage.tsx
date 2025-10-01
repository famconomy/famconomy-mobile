import React, { useState, useEffect } from 'react';
import { useAuth } from '../hooks/useAuth';
import { updateUser, uploadProfilePhoto } from '../api/users';
import { User } from '../types';
import { Link } from 'react-router-dom';
import { ChevronLeft } from 'lucide-react';
import { createDebugLogger } from '../utils/debug';

const profileDebug = createDebugLogger('profile-page');

export const ProfilePage: React.FC = () => {
  const { user, setUser } = useAuth();
  const [firstName, setFirstName] = useState(user?.firstName || '');
  const [lastName, setLastName] = useState(user?.lastName || '');
  const [email, setEmail] = useState(user?.email || '');
  const [phoneNumber, setPhoneNumber] = useState(user?.phoneNumber || '');

  useEffect(() => {
    if (user) {
      const [first, ...last] = user.fullName.split(' ');
      setFirstName(first || '');
      setLastName(last.join(' ') || '');
      setEmail(user.email);
      setPhoneNumber(user.phoneNumber || '');
    }
  }, [user]);

  const handleProfileUpdate = async () => {
    if (!user) return;

    const updatedUserData = {
      FirstName: firstName,
      LastName: lastName,
      Email: email,
      PhoneNumber: phoneNumber,
    };

    try {
      const updatedUser = await updateUser(user.id, updatedUserData as Partial<User>);
      setUser(updatedUser);
      alert('Profile updated successfully!');
    } catch (error: any) {
      profileDebug.error('Failed to update profile:', error.response || error);
      alert('Failed to update profile.');
    }
  };

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0] && user) {
      try {
        const updatedUser = await uploadProfilePhoto(user.id, e.target.files[0]);
        setUser(updatedUser);
        alert('Profile photo updated successfully!');
      } catch (error) {
        alert('Failed to upload profile photo.');
      }
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center space-x-4">
        <Link to="/settings" className="p-2 rounded-xl hover:bg-neutral-100 dark:hover:bg-neutral-700 text-neutral-500 dark:text-neutral-400">
          <ChevronLeft size={24} />
        </Link>
        <h1 className="text-2xl font-bold text-neutral-900 dark:text-white">Profile</h1>
      </div>

      <section className="bg-white dark:bg-neutral-800 rounded-2xl shadow-card p-6">
        <h2 className="text-lg font-semibold text-neutral-900 dark:text-white mb-6">Profile Information</h2>
        
        <div className="flex items-center space-x-4 mb-6">
          <img
            src={user?.profilePhotoUrl || 'https://i.pravatar.cc/100'}
            alt="Profile"
            className="h-20 w-20 rounded-full object-cover"
          />
          <div>
            <h2 className="text-lg font-semibold text-neutral-900 dark:text-white">Profile Photo</h2>
            <input
              type="file"
              id="profile-photo-upload"
              className="hidden"
              onChange={handlePhotoUpload}
            />
            <label
              htmlFor="profile-photo-upload"
              className="cursor-pointer text-sm text-primary-500 hover:text-primary-600"
            >
              Upload new photo
            </label>
          </div>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1">
              Full Name
            </label>
            <input
              type="text"
              value={`${firstName} ${lastName}`}
              onChange={(e) => {
                const [first, ...last] = e.target.value.split(' ');
                setFirstName(first || '');
                setLastName(last.join(' ') || '');
              }}
              className="w-full px-3 py-2 rounded-xl border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-neutral-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1">
              Email Address
            </label>
            <div className="flex items-center space-x-2">
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="flex-1 px-3 py-2 rounded-xl border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-neutral-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-500"
              />
              <span className="px-2 py-1 text-xs rounded-full bg-success-100 text-success-800 dark:bg-success-900/30 dark:text-success-400">
                Verified
              </span>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1">
              Phone Number
            </label>
            <input
              type="tel"
              value={phoneNumber}
              onChange={(e) => setPhoneNumber(e.target.value)}
              className="w-full px-3 py-2 rounded-xl border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-neutral-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-500"
            />
          </div>

          <div className="pt-4 border-t border-neutral-200 dark:border-neutral-700">
            <button onClick={handleProfileUpdate} className="px-4 py-2 text-sm font-medium text-white bg-primary-500 hover:bg-primary-600 dark:hover:bg-primary-400 rounded-xl">
              Save Changes
            </button>
          </div>
        </div>
      </section>
    </div>
  );
};
