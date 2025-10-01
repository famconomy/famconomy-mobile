import apiClient from './apiClient';
import type {
  WishList,
  WishListItem,
  WishListVisibility,
  WishListItemStatus,
  WishListShareResponse,
} from '../types/wishlist';

export interface CreateWishlistPayload {
  title: string;
  description?: string;
  ownerUserId?: string | null;
  visibility?: WishListVisibility;
}

export interface UpdateWishlistPayload extends Partial<CreateWishlistPayload> {}

export interface CreateWishlistItemPayload {
  name: string;
  details?: string;
  targetUrl?: string;
  imageUrl?: string;
  priceMin?: string | number | null;
  priceMax?: string | number | null;
  priority?: number | null;
  status?: WishListItemStatus;
}

export interface UpdateWishlistItemPayload extends Partial<CreateWishlistItemPayload> {}

export const fetchWishlists = async (familyId: number | string): Promise<WishList[]> => {
  const { data } = await apiClient.get(`/family/${familyId}/wishlists`);
  return data as WishList[];
};

export const createWishlist = async (
  familyId: number | string,
  payload: CreateWishlistPayload,
): Promise<WishList> => {
  const { data } = await apiClient.post(`/family/${familyId}/wishlists`, payload);
  return data as WishList;
};

export const updateWishlist = async (
  familyId: number | string,
  wishlistId: number,
  payload: UpdateWishlistPayload,
): Promise<WishList> => {
  const { data } = await apiClient.patch(`/family/${familyId}/wishlists/${wishlistId}`, payload);
  return data as WishList;
};

export const deleteWishlist = async (familyId: number | string, wishlistId: number): Promise<void> => {
  await apiClient.delete(`/family/${familyId}/wishlists/${wishlistId}`);
};

export const addWishlistItem = async (
  familyId: number | string,
  wishlistId: number,
  payload: CreateWishlistItemPayload,
): Promise<WishListItem> => {
  const { data } = await apiClient.post(`/family/${familyId}/wishlists/${wishlistId}/items`, payload);
  return data as WishListItem;
};

export const updateWishlistItem = async (
  familyId: number | string,
  wishlistId: number,
  itemId: number,
  payload: UpdateWishlistItemPayload,
): Promise<WishListItem> => {
  const { data } = await apiClient.patch(`/family/${familyId}/wishlists/${wishlistId}/items/${itemId}`, payload);
  return data as WishListItem;
};

export const deleteWishlistItem = async (
  familyId: number | string,
  wishlistId: number,
  itemId: number,
): Promise<void> => {
  await apiClient.delete(`/family/${familyId}/wishlists/${wishlistId}/items/${itemId}`);
};

export const toggleWishlistItemClaim = async (
  familyId: number | string,
  wishlistId: number,
  itemId: number,
  action: 'claim' | 'unclaim',
  note?: string,
): Promise<WishListItem> => {
  const { data } = await apiClient.post(`/family/${familyId}/wishlists/${wishlistId}/items/${itemId}/claim`, {
    action,
    note,
  });
  return data as WishListItem;
};

export const generateWishlistShareLink = async (
  familyId: number | string,
  wishlistId: number,
): Promise<WishListShareResponse> => {
  const { data } = await apiClient.post(`/family/${familyId}/wishlists/${wishlistId}/share`);
  return data as WishListShareResponse;
};

export const revokeWishlistShareLink = async (
  familyId: number | string,
  wishlistId: number,
): Promise<void> => {
  await apiClient.post(`/family/${familyId}/wishlists/${wishlistId}/share/revoke`);
};

export interface SharedWishlistItem {
  WishListItemID: number;
  Name: string;
  Details: string | null;
  TargetUrl: string | null;
  ImageUrl: string | null;
  Status: WishListItemStatus;
  PriceMin: string | null;
  PriceMax: string | null;
  ClaimedBy?: { FirstName: string | null; LastName: string | null } | null;
}

export interface SharedWishlistResponse {
  WishListID: number;
  Title: string;
  Description: string | null;
  Visibility: WishListVisibility;
  Family: { FamilyID: number; FamilyName: string } | null;
  Owner: { UserID: string; FirstName: string | null; LastName: string | null; ProfilePhotoUrl: string | null } | null;
  Items: SharedWishlistItem[];
  ExpiresAt: string | null;
}

export const fetchSharedWishlist = async (token: string): Promise<SharedWishlistResponse> => {
  const { data } = await apiClient.get(`/wishlists/shared/${token}`);
  return data as SharedWishlistResponse;
};
