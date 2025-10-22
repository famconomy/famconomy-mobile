import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { Loader2, User as UserIcon, Share2 } from 'lucide-react';
import { fetchSharedProfile, SharedProfileResponse } from '../api/memberProfiles';

const renderList = (title: string, values: string[]) => {
  if (!values.length) return null;
  return (
    <div className="space-y-1">
      <h3 className="text-sm font-semibold text-neutral-700 dark:text-neutral-300">{title}</h3>
      <div className="flex flex-wrap gap-2">
        {values.map(value => (
          <span key={value} className="rounded-full bg-neutral-100 px-3 py-1 text-xs text-neutral-700 dark:bg-neutral-700/30 dark:text-neutral-200">{value}</span>
        ))}
      </div>
    </div>
  );
};

const SharedProfilePage: React.FC = () => {
  const { token } = useParams<{ token: string }>();
  const [profile, setProfile] = useState<SharedProfileResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!token) {
      setError('Missing share token');
      setIsLoading(false);
      return;
    }
    const load = async () => {
      try {
        setIsLoading(true);
        setError(null);
        const data = await fetchSharedProfile(token);
        setProfile(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unable to load shared profile');
      } finally {
        setIsLoading(false);
      }
    };
    load();
  }, [token]);

  if (isLoading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <Loader2 className="h-10 w-10 animate-spin text-primary-500" />
      </div>
    );
  }

  if (error || !profile || !profile.profile) {
    return (
      <div className="max-w-2xl mx-auto py-16 text-center">
        <UserIcon className="mx-auto h-12 w-12 text-primary-500" />
        <h1 className="mt-4 text-2xl font-semibold text-neutral-900 dark:text-white">Care profile unavailable</h1>
        <p className="mt-2 text-neutral-600 dark:text-neutral-400">{error || 'This shared profile may have expired or been revoked.'}</p>
      </div>
    );
  }

  const info = profile.profile;

  const clothingEntries = Object.entries(info.clothingSizes || {});

  return (
    <div className="max-w-3xl mx-auto py-12 space-y-6">
      <div className="rounded-2xl border border-neutral-200 bg-white p-6 shadow-card dark:border-neutral-700 dark:bg-neutral-800">
        <div className="flex items-start gap-4">
          <div className="h-12 w-12 rounded-full bg-primary-100 flex items-center justify-center text-primary-600 dark:bg-primary-900/30">
            <Share2 className="h-6 w-6" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-neutral-900 dark:text-white">Care profile</h1>
            {profile.user ? (
              <p className="text-sm text-neutral-600 dark:text-neutral-400">Shared for {profile.user.FirstName || profile.user.UserID}</p>
            ) : null}
            {profile.family ? (
              <p className="text-xs text-neutral-500 dark:text-neutral-400">Family: {profile.family.FamilyName}</p>
            ) : null}
          </div>
        </div>
      </div>

      <div className="space-y-4">
        {clothingEntries.length ? (
          <div className="rounded-xl border border-neutral-200 bg-white p-5 dark:border-neutral-700 dark:bg-neutral-900/30">
            <h2 className="text-lg font-semibold text-neutral-900 dark:text-white">Clothing sizes</h2>
            <div className="mt-2 grid grid-cols-1 gap-2 sm:grid-cols-2">
              {clothingEntries.map(([key, value]) => (
                <div key={key} className="rounded-lg bg-neutral-100 px-3 py-2 text-sm text-neutral-700 dark:bg-neutral-800 dark:text-neutral-200">
                  <span className="font-medium">{key}: </span>
                  <span>{String(value)}</span>
                </div>
              ))}
            </div>
          </div>
        ) : null}

        {renderList('Favorite colors', info.favoriteColors || [])}
        {renderList('Favorite foods', info.favoriteFoods || [])}
        {renderList('Interests', info.interests || [])}
        {renderList('Allergies', info.allergies || [])}
        {renderList('Favorite brands', info.favoriteBrands || [])}

        {info.notes ? (
          <div className="rounded-xl border border-neutral-200 bg-white p-5 dark:border-neutral-700 dark:bg-neutral-900/30">
            <h2 className="text-lg font-semibold text-neutral-900 dark:text-white">Notes</h2>
            <p className="mt-2 text-sm text-neutral-700 dark:text-neutral-200">{info.notes}</p>
          </div>
        ) : null}

        {info.wishlistSummary ? (
          <div className="rounded-xl border border-neutral-200 bg-white p-5 dark:border-neutral-700 dark:bg-neutral-900/30">
            <h2 className="text-lg font-semibold text-neutral-900 dark:text-white">Wishlist summary</h2>
            <p className="mt-2 text-sm text-neutral-700 dark:text-neutral-200">{info.wishlistSummary}</p>
          </div>
        ) : null}
      </div>
    </div>
  );
};

export default SharedProfilePage;
