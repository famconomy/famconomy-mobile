import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Gift, Plus, Share2, Copy, Trash2, Edit3, Loader2, ExternalLink, Lock, Unlock, Users as UsersIcon, CheckCircle2 } from 'lucide-react';
import { toast } from 'react-toastify';
import { useFamily } from '../hooks/useFamily';
import { useLinZChat } from '../hooks/useLinZChat';
import type { WishList, WishListItem, WishListVisibility, WishListItemStatus, WishListShareResponse } from '../types/wishlist';
import {
  fetchWishlists,
  createWishlist,
  updateWishlist,
  deleteWishlist,
  addWishlistItem,
  updateWishlistItem,
  deleteWishlistItem,
  toggleWishlistItemClaim,
  generateWishlistShareLink,
  revokeWishlistShareLink,
  CreateWishlistPayload,
  CreateWishlistItemPayload,
} from '../api/wishlists';

interface ShareState {
  [id: number]: WishListShareResponse | undefined;
}

const statusLabel = (status: WishListItemStatus) => {
  if (status === 'PURCHASED') return 'Purchased';
  if (status === 'RESERVED') return 'Reserved';
  return 'Idea';
};

const WishlistsPage: React.FC = () => {
  const { family, activeFamilyId, isLoading: isFamilyLoading } = useFamily();
  const { registerActionHandler, appendLinZMessage } = useLinZChat();

  const [wishlists, setWishlists] = useState<WishList[]>([]);
  const [shareState, setShareState] = useState<ShareState>({});
  const [pageError, setPageError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const [listFormOpen, setListFormOpen] = useState(false);
  const [listFormEditing, setListFormEditing] = useState<WishList | null>(null);
  const [listTitle, setListTitle] = useState('');
  const [listDescription, setListDescription] = useState('');
  const [listOwner, setListOwner] = useState('');
  const [listVisibility, setListVisibility] = useState<WishListVisibility>('FAMILY');

  const [itemFormOpenFor, setItemFormOpenFor] = useState<number | null>(null);
  const [itemEditing, setItemEditing] = useState<WishListItem | null>(null);
  const [itemName, setItemName] = useState('');
  const [itemDetails, setItemDetails] = useState('');
  const [itemLink, setItemLink] = useState('');
  const [itemPriceMin, setItemPriceMin] = useState('');
  const [itemPriceMax, setItemPriceMax] = useState('');
  const [itemStatus, setItemStatus] = useState<WishListItemStatus>('IDEA');

  const familyMembers = useMemo(() => {
    if (!family || !family.members) return [] as { id: string; name: string }[];
    return family.members.map(member => {
      const nameParts = [] as string[];
      if (member.FirstName) nameParts.push(member.FirstName);
      if (member.LastName) nameParts.push(member.LastName);
      const name = nameParts.length ? nameParts.join(' ') : member.Email || 'Family member';
      return { id: member.UserID, name };
    });
  }, [family]);

  const resetListForm = () => {
    setListTitle('');
    setListDescription('');
    setListOwner('');
    setListVisibility('FAMILY');
    setListFormEditing(null);
  };

  const resetItemForm = () => {
    setItemName('');
    setItemDetails('');
    setItemLink('');
    setItemPriceMin('');
    setItemPriceMax('');
    setItemStatus('IDEA');
    setItemFormOpenFor(null);
    setItemEditing(null);
  };

  const loadWishlists = useCallback(async () => {
    if (!activeFamilyId) {
      setWishlists([]);
      return;
    }
    try {
      setLoading(true);
      setPageError(null);
      const data = await fetchWishlists(activeFamilyId);
      setWishlists(data);
      setShareState(previous => {
        const next: ShareState = { ...previous };
        data.forEach(list => {
          if (!list.shareLinkActive && next[list.WishListID]) {
            delete next[list.WishListID];
          }
        });
        return next;
      });
    } catch (error) {
      setPageError(error instanceof Error ? error.message : 'Failed to load wishlists');
    } finally {
      setLoading(false);
    }
  }, [activeFamilyId]);

  useEffect(() => {
    loadWishlists();
  }, [loadWishlists]);

  useEffect(() => {
    const unregisterCreate = registerActionHandler('wishlist.create', () => {
      resetListForm();
      setListFormOpen(true);
    });

    const unregisterAddItem = registerActionHandler('wishlist.add_item', payload => {
      if (!wishlists.length) {
        toast.info('Create a wishlist first so LinZ can add ideas for you.');
        appendLinZMessage('Once you have a wishlist I can add gift ideas to it automatically.');
        return;
      }
      let target = wishlists[0];
      if (payload && typeof payload === 'object') {
        const title = (payload as any).title;
        if (typeof title === 'string') {
          const normalized = title.trim().toLowerCase();
          const match = wishlists.find(list => list.Title.trim().toLowerCase() === normalized);
          if (match) target = match;
        }
      }
      setItemFormOpenFor(target.WishListID);
      setItemEditing(null);
    });

    return () => {
      unregisterCreate();
      unregisterAddItem();
    };
  }, [appendLinZMessage, registerActionHandler, wishlists]);

  const handleSaveList = async () => {
    if (!activeFamilyId) return;
    if (!listTitle.trim()) {
      toast.error('A title is required');
      return;
    }
    const payload: CreateWishlistPayload = {
      title: listTitle.trim(),
      description: listDescription.trim() ? listDescription.trim() : undefined,
      ownerUserId: listOwner ? listOwner : null,
      visibility: listVisibility,
    };
    try {
      if (listFormEditing) {
        await updateWishlist(activeFamilyId, listFormEditing.WishListID, payload);
        toast.success('Wishlist updated');
      } else {
        await createWishlist(activeFamilyId, payload);
        toast.success('Wishlist created');
      }
      setListFormOpen(false);
      resetListForm();
      loadWishlists();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Unable to save wishlist');
    }
  };

  const handleDeleteList = async (wishlistId: number) => {
    if (!activeFamilyId) return;
    try {
      await deleteWishlist(activeFamilyId, wishlistId);
      toast.success('Wishlist deleted');
      loadWishlists();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Unable to delete wishlist');
    }
  };

  const handleOpenItemForm = (wishlist: WishList, item?: WishListItem) => {
    if (item) {
      setItemEditing(item);
      setItemName(item.Name);
      setItemDetails(item.Details || '');
      setItemLink(item.TargetUrl || '');
      setItemPriceMin(item.PriceMin || '');
      setItemPriceMax(item.PriceMax || '');
      setItemStatus(item.Status);
    } else {
      resetItemForm();
    }
    setItemFormOpenFor(wishlist.WishListID);
  };

  const handleSaveItem = async () => {
    if (!activeFamilyId || itemFormOpenFor === null) return;
    if (!itemName.trim()) {
      toast.error('Item name is required');
      return;
    }
    const payload: CreateWishlistItemPayload = {
      name: itemName.trim(),
      details: itemDetails.trim() ? itemDetails.trim() : undefined,
      targetUrl: itemLink.trim() ? itemLink.trim() : undefined,
      priceMin: itemPriceMin === '' ? null : itemPriceMin,
      priceMax: itemPriceMax === '' ? null : itemPriceMax,
      status: itemStatus,
    };
    try {
      if (itemEditing) {
        await updateWishlistItem(activeFamilyId, itemFormOpenFor, itemEditing.WishListItemID, payload);
        toast.success('Idea updated');
      } else {
        await addWishlistItem(activeFamilyId, itemFormOpenFor, payload);
        toast.success('Idea added');
      }
      resetItemForm();
      loadWishlists();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Unable to save idea');
    }
  };

  const handleUpdateStatus = async (wishlistId: number, itemId: number, status: WishListItemStatus) => {
    if (!activeFamilyId) return;
    try {
      await updateWishlistItem(activeFamilyId, wishlistId, itemId, { status });
      toast.success('Status updated');
      loadWishlists();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Unable to update status');
    }
  };

  const handleDeleteItem = async (wishlistId: number, itemId: number) => {
    if (!activeFamilyId) return;
    try {
      await deleteWishlistItem(activeFamilyId, wishlistId, itemId);
      toast.success('Idea removed');
      loadWishlists();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Unable to remove idea');
    }
  };

  const handleClaimItem = async (wishlistId: number, itemId: number, action: 'claim' | 'unclaim') => {
    if (!activeFamilyId) return;
    try {
      await toggleWishlistItemClaim(activeFamilyId, wishlistId, itemId, action);
      toast.success(action === 'claim' ? 'Idea reserved' : 'Reservation cleared');
      loadWishlists();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Unable to update reservation');
    }
  };

  const handleGenerateShare = async (wishlist: WishList) => {
    if (!activeFamilyId) return;
    try {
      const response = await generateWishlistShareLink(activeFamilyId, wishlist.WishListID);
      setShareState(prev => ({ ...prev, [wishlist.WishListID]: response }));
      loadWishlists();
      await navigator.clipboard.writeText(response.shareUrl);
      toast.success('Share link copied to clipboard');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Unable to generate share link');
    }
  };

  const handleRevokeShare = async (wishlist: WishList) => {
    if (!activeFamilyId) return;
    try {
      await revokeWishlistShareLink(activeFamilyId, wishlist.WishListID);
      setShareState(prev => {
        const next = { ...prev };
        delete next[wishlist.WishListID];
        return next;
      });
      loadWishlists();
      toast.info('Share link revoked');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Unable to revoke share link');
    }
  };

  const shareLinkFor = (wishlistId: number) => {
    const info = shareState[wishlistId];
    return info ? info.shareUrl : undefined;
  };

  const renderWishlistItem = (wishlist: WishList, item: WishListItem) => {
    const badgeClass = statusBadgeClass(item.Status);
    const claimed = Boolean(item.ClaimedByUserID);
    const priceDisplay = item.PriceMin || item.PriceMax ? (item.PriceMin || '') + (item.PriceMin && item.PriceMax ? ' - ' : '') + (item.PriceMax || '') : '';

    return (
      <div key={item.WishListItemID} className="rounded-xl border border-neutral-200 bg-neutral-50 p-4 dark:border-neutral-700 dark:bg-neutral-900/40">
        <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-lg font-semibold text-neutral-900 dark:text-white">{item.Name}</h3>
              <span className={'inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ' + badgeClass}>
                <CheckCircle2 className="h-3 w-3" /> {statusLabel(item.Status)}
              </span>
              {claimed && item.claimedBy ? (
                <span className="inline-flex items-center gap-1 rounded-full bg-accent-100 px-2 py-0.5 text-xs font-medium text-accent-700 dark:bg-accent-900/30 dark:text-accent-200">
                  Reserved by {item.claimedBy.FirstName || 'someone'}
                </span>
              ) : null}
            </div>
            {item.Details ? <p className="mt-1 text-sm text-neutral-600 dark:text-neutral-300">{item.Details}</p> : null}
            <div className="mt-2 flex flex-wrap gap-3 text-sm text-neutral-500 dark:text-neutral-400">
              {priceDisplay ? <span>{priceDisplay}</span> : null}
              {item.TargetUrl ? (
                <a href={item.TargetUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-primary-600 hover:underline dark:text-primary-300">
                  <ExternalLink className="h-3 w-3" /> View link
                </a>
              ) : null}
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <button onClick={() => handleOpenItemForm(wishlist, item)} className="inline-flex items-center gap-2 rounded-xl border border-neutral-300 px-3 py-2 text-sm text-neutral-600 transition hover:bg-neutral-100 dark:border-neutral-600 dark:text-neutral-300 dark:hover:bg-neutral-700">
              <Edit3 className="h-4 w-4" />
            </button>
            <button onClick={() => handleUpdateStatus(wishlist.WishListID, item.WishListItemID, 'PURCHASED')} className="inline-flex items-center gap-2 rounded-xl border border-success-200 px-3 py-2 text-sm text-success-700 transition hover:bg-success-50 dark:border-success-500/40 dark:text-success-200">
              <CheckCircle2 className="h-4 w-4" />
            </button>
            <button onClick={() => handleClaimItem(wishlist.WishListID, item.WishListItemID, claimed ? 'unclaim' : 'claim')} className="inline-flex items-center gap-2 rounded-xl border border-warning-200 px-3 py-2 text-sm text-warning-700 transition hover:bg-warning-50 dark:border-warning-500/40 dark:text-warning-200">
              {claimed ? <Unlock className="h-4 w-4" /> : <Lock className="h-4 w-4" />}
            </button>
            <button onClick={() => handleDeleteItem(wishlist.WishListID, item.WishListItemID)} className="inline-flex items-center gap-2 rounded-xl border border-error-200 px-3 py-2 text-sm text-error-600 transition hover:bg-error-50 dark:border-error-500/40 dark:text-error-200">
              <Trash2 className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>
    );
  };
  const renderShareBlock = (wishlist: WishList) => {
    const link = shareLinkFor(wishlist.WishListID);
    if (!link) return null;
    return (
      <div className="mt-4 rounded-xl border border-primary-200 bg-primary-50 px-4 py-3 text-sm text-primary-700 dark:border-primary-500/40 dark:bg-primary-900/30 dark:text-primary-200">
        <p className="font-medium">Share link</p>
        <p className="mt-1 break-words text-xs">{link}</p>
        <div className="mt-2 flex gap-2">
          <button
            onClick={() => navigator.clipboard.writeText(link).then(() => toast.success('Link copied'))}
            className="inline-flex items-center gap-2 rounded-xl border border-primary-300 px-3 py-2 text-xs font-medium text-primary-600 transition hover:bg-primary-100 dark:border-primary-500/40 dark:text-primary-200"
          >
            <Copy className="h-3 w-3" /> Copy
          </button>
          <button
            onClick={() => window.open(link, '_blank', 'noopener')}
            className="inline-flex items-center gap-2 rounded-xl border border-primary-300 px-3 py-2 text-xs font-medium text-primary-600 transition hover:bg-primary-100 dark:border-primary-500/40 dark:text-primary-200"
          >
            <ExternalLink className="h-3 w-3" /> Open
          </button>
        </div>
      </div>
    );
  };
  const renderWishlistCard = (list: WishList) => {
    const ownerSummary = familyMembers.find(member => member.id === list.OwnerUserID);
    const visibilityBadge = list.Visibility === 'PARENTS'
      ? 'Parents only'
      : list.Visibility === 'LINK'
      ? 'Shareable link'
      : 'Family';
    const visibilityClass = list.Visibility === 'PARENTS'
      ? 'text-xs inline-flex items-center gap-1 rounded-full bg-secondary-100 px-2 py-0.5 text-secondary-700 dark:bg-secondary-900/30 dark:text-secondary-200'
      : list.Visibility === 'LINK'
      ? 'text-xs inline-flex items-center gap-1 rounded-full bg-primary-100 px-2 py-0.5 text-primary-700 dark:bg-primary-900/30 dark:text-primary-200'
      : 'text-xs inline-flex items-center gap-1 rounded-full bg-neutral-100 px-2 py-0.5 text-neutral-700 dark:bg-neutral-700/40 dark:text-neutral-200';

    return (
      <div key={list.WishListID} className="rounded-2xl border border-neutral-200 bg-white p-6 shadow-card transition hover:shadow-card-hover dark:border-neutral-700 dark:bg-neutral-800">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <h2 className="text-xl font-semibold text-neutral-900 dark:text-white">{list.Title}</h2>
            {list.Description ? <p className="text-sm text-neutral-600 dark:text-neutral-400 mt-1">{list.Description}</p> : null}
            <div className="mt-3 flex flex-wrap gap-2">
              <span className={visibilityClass}>{visibilityBadge}</span>
              {ownerSummary ? (
                <span className="inline-flex items-center gap-2 rounded-full bg-primary-100 px-3 py-1 text-sm font-medium text-primary-700 dark:bg-primary-900/30 dark:text-primary-200">
                  <UsersIcon className="h-4 w-4" /> {ownerSummary.name}
                </span>
              ) : null}
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => handleOpenItemForm(list)}
              className="inline-flex items-center gap-2 rounded-xl border border-primary-200 px-3 py-2 text-sm font-medium text-primary-600 transition hover:bg-primary-50 dark:border-primary-500/40 dark:text-primary-200 dark:hover:bg-primary-900/30"
            >
              <Plus className="h-4 w-4" /> Idea
            </button>
            <button
              onClick={() => {
                const link = shareLinkFor(list.WishListID);
                if (link) {
                  navigator.clipboard.writeText(link).then(() => toast.success('Share link copied'));
                } else {
                  handleGenerateShare(list);
                }
              }}
              className="inline-flex items-center gap-2 rounded-xl bg-secondary-600 px-3 py-2 text-sm font-medium text-white transition hover:bg-secondary-500"
            >
              <Share2 className="h-4 w-4" /> Share
            </button>
            {list.shareLinkActive ? (
              <button
                onClick={() => handleRevokeShare(list)}
                className="inline-flex items-center gap-2 rounded-xl border border-neutral-300 px-3 py-2 text-sm font-medium text-neutral-600 transition hover:bg-neutral-100 dark:border-neutral-600 dark:text-neutral-300 dark:hover:bg-neutral-700"
              >
                <Unlock className="h-4 w-4" /> Revoke
              </button>
            ) : null}
            <button
              onClick={() => {
                setListFormEditing(list);
                setListTitle(list.Title);
                setListDescription(list.Description || '');
                setListOwner(list.OwnerUserID || '');
                setListVisibility(list.Visibility);
                setListFormOpen(true);
              }}
              className="inline-flex items-center gap-2 rounded-xl border border-neutral-300 px-3 py-2 text-sm font-medium text-neutral-600 transition hover:bg-neutral-100 dark:border-neutral-600 dark:text-neutral-300 dark:hover:bg-neutral-700"
            >
              <Edit3 className="h-4 w-4" /> Edit
            </button>
            <button
              onClick={() => handleDeleteList(list.WishListID)}
              className="inline-flex items-center gap-2 rounded-xl border border-error-200 px-3 py-2 text-sm font-medium text-error-600 transition hover:bg-error-50 dark:border-error-500/40 dark:text-error-200"
            >
              <Trash2 className="h-4 w-4" /> Remove
            </button>
          </div>
        </div>

        <div className="mt-6 space-y-3">
          {!list.items.length ? (
            <div className="rounded-xl border border-dashed border-neutral-300 p-4 text-sm text-neutral-500 dark:border-neutral-700 dark:text-neutral-400">
              No ideas yet. Add the first gift to get started!
            </div>
          ) : (
            list.items.map(item => renderWishlistItem(list, item))
          )}
        </div>

        {renderShareBlock(list)}
      </div>
    );
  };
  const renderWishlists = () => {
    if (loading) {
      return (
        <div className="min-h-[30vh] flex items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary-500" />
        </div>
      );
    }
    if (!wishlists.length) {
      return (
        <div className="rounded-2xl border border-dashed border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-800 p-12 text-center">
          <Gift className="mx-auto h-12 w-12 text-primary-500" />
          <h2 className="mt-4 text-xl font-semibold text-neutral-900 dark:text-white">No wishlists yet</h2>
          <p className="mt-2 text-neutral-600 dark:text-neutral-400">Start a list for birthdays, holidays, or just to remember favorites.</p>
          <button
            onClick={() => {
              resetListForm();
              setListFormOpen(true);
            }}
            className="mt-4 inline-flex items-center gap-2 rounded-xl bg-primary-600 px-4 py-2 text-white shadow-sm transition hover:bg-primary-500"
          >
            <Plus className="h-5 w-5" /> Create your first wishlist
          </button>
        </div>
      );
    }
    return (
      <div className="grid grid-cols-1 gap-5 xl:grid-cols-2">
        {wishlists.map(renderWishlistCard)}
      </div>
    );
  };

  if (isFamilyLoading) {
    return (
      <div className="min-h-[40vh] flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary-500" />
      </div>
    );
  }

  if (!activeFamilyId || !family) {
    return (
      <div className="max-w-3xl mx-auto py-16 text-center">
        <Gift className="mx-auto h-12 w-12 text-primary-500" />
        <h1 className="mt-4 text-2xl font-semibold text-neutral-900 dark:text-white">Wishlists live inside a household</h1>
        <p className="mt-2 text-neutral-600 dark:text-neutral-400">Join or create a family to start collecting gift ideas and favorites.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h1 className="text-3xl font-bold text-neutral-900 dark:text-white flex items-center gap-3">
            <Gift className="h-8 w-8 text-primary-500" /> Family Wishlists
          </h1>
          <p className="text-neutral-600 dark:text-neutral-400">Collect gift ideas, clothing sizes, and favorites so celebrations are easier for everyone.</p>
        </div>
        <div className="flex flex-wrap gap-3">
          <button
            onClick={() => {
              resetListForm();
              setListFormOpen(true);
            }}
            className="inline-flex items-center gap-2 rounded-xl bg-primary-600 px-4 py-2 text-white shadow-sm transition hover:bg-primary-500"
          >
            <Plus className="h-5 w-5" /> New wishlist
          </button>
        </div>
      </div>

      {pageError ? (
        <div className="rounded-xl border border-error-200 bg-error-50 px-4 py-3 text-error-700 dark:border-error-500/30 dark:bg-error-900/30 dark:text-error-200">{pageError}</div>
      ) : null}

      {renderWishlists()}

      {listFormOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-neutral-900/50 backdrop-blur-sm p-4">
          <div className="w-full max-w-lg rounded-2xl bg-white shadow-2xl dark:bg-neutral-800">
            <div className="flex items-center justify-between border-b border-neutral-200 p-4 dark:border-neutral-700">
              <h2 className="text-lg font-semibold text-neutral-900 dark:text-white">{listFormEditing ? 'Edit wishlist' : 'Create wishlist'}</h2>
              <button onClick={() => { setListFormOpen(false); resetListForm(); }} className="text-neutral-500 hover:text-neutral-700 dark:text-neutral-400 dark:hover:text-neutral-200">&times;</button>
            </div>
            <div className="space-y-4 p-4">
              <div>
                <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300">Title</label>
                <input value={listTitle} onChange={event => setListTitle(event.target.value)} className="mt-1 w-full rounded-xl border border-neutral-300 px-3 py-2 text-neutral-900 focus:outline-none focus:ring-2 focus:ring-primary-500 dark:border-neutral-600 dark:bg-neutral-800 dark:text-white" />
              </div>
              <div>
                <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300">Description</label>
                <textarea value={listDescription} onChange={event => setListDescription(event.target.value)} rows={3} className="mt-1 w-full rounded-xl border border-neutral-300 px-3 py-2 text-neutral-900 focus:outline-none focus:ring-2 focus:ring-primary-500 dark:border-neutral-600 dark:bg-neutral-800 dark:text-white" />
              </div>
              <div>
                <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300">Owner</label>
                <select value={listOwner} onChange={event => setListOwner(event.target.value)} className="mt-1 w-full rounded-xl border border-neutral-300 px-3 py-2 text-neutral-900 focus:outline-none focus:ring-2 focus:ring-primary-500 dark:border-neutral-600 dark:bg-neutral-800 dark:text-white">
                  <option value="">No specific owner</option>
                  {familyMembers.map(member => (
                    <option key={member.id} value={member.id}>{member.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300">Visibility</label>
                <div className="mt-2 space-y-2">
                  {visibilityOptions.map(option => (
                    <label key={option.value} className={'flex cursor-pointer flex-col rounded-xl border px-3 py-3 transition ' + (listVisibility === option.value ? 'border-primary-400 bg-primary-50 dark:border-primary-400/40 dark:bg-primary-900/30' : 'border-neutral-200 dark:border-neutral-700')}>
                      <span className="flex items-center justify-between">
                        <span className="text-sm font-semibold text-neutral-900 dark:text-white">{option.label}</span>
                        <input type="radio" checked={listVisibility === option.value} onChange={() => setListVisibility(option.value)} />
                      </span>
                      <span className="mt-1 text-xs text-neutral-500 dark:text-neutral-400">{option.description}</span>
                    </label>
                  ))}
                </div>
              </div>
            </div>
            <div className="flex justify-end gap-3 border-t border-neutral-200 p-4 dark:border-neutral-700">
              <button onClick={() => { setListFormOpen(false); resetListForm(); }} className="rounded-xl px-4 py-2 text-sm font-medium text-neutral-600 hover:bg-neutral-100 dark:text-neutral-300 dark:hover:bg-neutral-700">Cancel</button>
              <button onClick={handleSaveList} className="rounded-xl bg-primary-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-primary-500">Save</button>
            </div>
          </div>
        </div>
      ) : null}

      {itemFormOpenFor !== null ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-neutral-900/50 backdrop-blur-sm p-4">
          <div className="w-full max-w-lg rounded-2xl bg-white shadow-2xl dark:bg-neutral-800">
            <div className="flex items-center justify-between border-b border-neutral-200 p-4 dark:border-neutral-700">
              <h2 className="text-lg font-semibold text-neutral-900 dark:text-white">{itemEditing ? 'Edit idea' : 'Add idea'}</h2>
              <button onClick={() => resetItemForm()} className="text-neutral-500 hover:text-neutral-700 dark:text-neutral-400 dark:hover:text-neutral-200">&times;</button>
            </div>
            <div className="space-y-4 p-4">
              <div>
                <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300">Name</label>
                <input value={itemName} onChange={event => setItemName(event.target.value)} className="mt-1 w-full rounded-xl border border-neutral-300 px-3 py-2 text-neutral-900 focus:outline-none focus:ring-2 focus:ring-primary-500 dark:border-neutral-600 dark:bg-neutral-800 dark:text-white" />
              </div>
              <div>
                <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300">Details</label>
                <textarea value={itemDetails} onChange={event => setItemDetails(event.target.value)} rows={3} className="mt-1 w-full rounded-xl border border-neutral-300 px-3 py-2 text-neutral-900 focus:outline-none focus:ring-2 focus:ring-primary-500 dark:border-neutral-600 dark:bg-neutral-800 dark:text-white" />
              </div>
              <div>
                <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300">Link</label>
                <input value={itemLink} onChange={event => setItemLink(event.target.value)} className="mt-1 w-full rounded-xl border border-neutral-300 px-3 py-2 text-neutral-900 focus:outline-none focus:ring-2 focus:ring-primary-500 dark:border-neutral-600 dark:bg-neutral-800 dark:text-white" />
              </div>
              <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                <div>
                  <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300">Min price</label>
                  <input value={itemPriceMin} onChange={event => setItemPriceMin(event.target.value)} className="mt-1 w-full rounded-xl border border-neutral-300 px-3 py-2 text-neutral-900 focus:outline-none focus:ring-2 focus:ring-primary-500 dark:border-neutral-600 dark:bg-neutral-800 dark:text-white" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300">Max price</label>
                  <input value={itemPriceMax} onChange={event => setItemPriceMax(event.target.value)} className="mt-1 w-full rounded-xl border border-neutral-300 px-3 py-2 text-neutral-900 focus:outline-none focus:ring-2 focus:ring-primary-500 dark:border-neutral-600 dark:bg-neutral-800 dark:text-white" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300">Status</label>
                  <select value={itemStatus} onChange={event => setItemStatus(event.target.value as WishListItemStatus)} className="mt-1 w-full rounded-xl border border-neutral-300 px-3 py-2 text-neutral-900 focus:outline-none focus:ring-2 focus:ring-primary-500 dark:border-neutral-600 dark:bg-neutral-800 dark:text-white">
                    <option value="IDEA">Idea</option>
                    <option value="RESERVED">Reserved</option>
                    <option value="PURCHASED">Purchased</option>
                  </select>
                </div>
              </div>
            </div>
            <div className="flex justify-end gap-3 border-t border-neutral-200 p-4 dark:border-neutral-700">
              <button onClick={() => resetItemForm()} className="rounded-xl px-4 py-2 text-sm font-medium text-neutral-600 hover:bg-neutral-100 dark:text-neutral-300 dark:hover:bg-neutral-700">Cancel</button>
              <button onClick={handleSaveItem} className="rounded-xl bg-primary-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-primary-500">Save</button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
};

export default WishlistsPage;
