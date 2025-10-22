import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { Gift, Loader2, ExternalLink } from 'lucide-react';
import { fetchSharedWishlist, SharedWishlistResponse } from '../api/wishlists';

const SharedWishlistPage: React.FC = () => {
  const { token } = useParams<{ token: string }>();
  const [wishlist, setWishlist] = useState<SharedWishlistResponse | null>(null);
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
        const data = await fetchSharedWishlist(token);
        setWishlist(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unable to load wishlist');
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

  if (error || !wishlist) {
    return (
      <div className="max-w-2xl mx-auto py-16 text-center">
        <Gift className="mx-auto h-12 w-12 text-primary-500" />
        <h1 className="mt-4 text-2xl font-semibold text-neutral-900 dark:text-white">Wishlist unavailable</h1>
        <p className="mt-2 text-neutral-600 dark:text-neutral-400">{error || 'This wishlist link may have expired or been revoked.'}</p>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto py-12 space-y-6">
      <div className="rounded-2xl border border-neutral-200 bg-white p-6 shadow-card dark:border-neutral-700 dark:bg-neutral-800">
        <div className="flex items-start gap-4">
          <div className="h-12 w-12 rounded-full bg-primary-100 flex items-center justify-center text-primary-600 dark:bg-primary-900/30">
            <Gift className="h-6 w-6" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-neutral-900 dark:text-white">{wishlist.Title}</h1>
            {wishlist.Owner ? (
              <p className="text-sm text-neutral-600 dark:text-neutral-400">Curated for {wishlist.Owner.FirstName || wishlist.Owner.UserID}</p>
            ) : null}
            {wishlist.Description ? (
              <p className="mt-2 text-neutral-700 dark:text-neutral-300">{wishlist.Description}</p>
            ) : null}
          </div>
        </div>
      </div>

      <div className="space-y-4">
        {wishlist.Items.length === 0 ? (
          <div className="rounded-xl border border-dashed border-neutral-300 p-6 text-center text-neutral-500 dark:border-neutral-700 dark:text-neutral-400">
            No ideas to share yet.
          </div>
        ) : (
          wishlist.Items.map(item => (
            <div key={item.WishListItemID} className="rounded-xl border border-neutral-200 bg-white p-5 shadow-sm dark:border-neutral-700 dark:bg-neutral-900/30">
              <div className="flex flex-col gap-2 md:flex-row md:items-start md:justify-between">
                <div>
                  <h3 className="text-lg font-semibold text-neutral-900 dark:text-white">{item.Name}</h3>
                  {item.Details ? <p className="text-sm text-neutral-600 dark:text-neutral-300">{item.Details}</p> : null}
                  <div className="mt-2 flex flex-wrap gap-3 text-sm text-neutral-500 dark:text-neutral-400">
                    {item.PriceMin || item.PriceMax ? (
                      <span>
                        {item.PriceMin ? item.PriceMin : ''}
                        {item.PriceMin && item.PriceMax ? ' - ' : ''}
                        {item.PriceMax ? item.PriceMax : ''}
                      </span>
                    ) : null}
                    {item.TargetUrl ? (
                      <a href={item.TargetUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-primary-600 hover:underline dark:text-primary-300">
                        <ExternalLink className="h-3 w-3" /> View link
                      </a>
                    ) : null}
                  </div>
                </div>
                <div className="flex flex-wrap gap-2">
                  <span className="rounded-full bg-neutral-100 px-3 py-1 text-xs font-medium text-neutral-700 dark:bg-neutral-700/40 dark:text-neutral-200">
                    {item.Status === 'IDEA' ? 'Idea' : item.Status === 'RESERVED' ? 'Reserved' : 'Purchased'}
                  </span>
                  {item.claimedBy ? (
                    <span className="rounded-full bg-accent-100 px-3 py-1 text-xs font-medium text-accent-700 dark:bg-accent-900/30 dark:text-accent-200">
                      Reserved by {item.claimedBy.FirstName || 'someone'}
                    </span>
                  ) : null}
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default SharedWishlistPage;
