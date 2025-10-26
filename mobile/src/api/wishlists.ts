import apiClient from './apiClient';

export type WishListVisibility = 'FAMILY' | 'PARENTS' | 'LINK';
export type WishListItemStatus = 'IDEA' | 'RESERVED' | 'PURCHASED';

export interface WishListItem {
  WishListItemID: number;
  WishListID: number;
  Name: string;
  Details: string | null;
  TargetUrl: string | null;
  ImageUrl: string | null;
  PriceMin: string | null;
  PriceMax: string | null;
  Priority: number | null;
  Status: WishListItemStatus;
  ClaimedByUserID: string | null;
  ClaimedNote: string | null;
  ClaimedAt: string | null;
  CreatedByUserID: string;
  UpdatedByUserID: string | null;
  CreatedAt: string;
  UpdatedAt: string;
  claimedBy?: {
    UserID: string;
    FirstName: string | null;
    LastName: string | null;
  } | null;
}

export interface WishListOwnerSummary {
  UserID: string;
  FirstName: string | null;
  LastName: string | null;
  ProfilePhotoUrl?: string | null;
}

export interface WishList {
  WishListID: number;
  FamilyID: number;
  OwnerUserID: string | null;
  Title: string;
  Description: string | null;
  Visibility: WishListVisibility;
  shareLinkActive?: boolean;
  CreatedByUserID: string;
  UpdatedByUserID: string | null;
  CreatedAt: string;
  UpdatedAt: string;
  owner?: WishListOwnerSummary | null;
  items: WishListItem[];
}

export interface WishListShareResponse {
  shareUrl: string;
  expiresAt: string;
}

export interface CreateWishlistPayload {
  Title: string;
  Description?: string;
  OwnerUserID?: string;
  Visibility?: WishListVisibility;
}

export interface CreateWishlistItemPayload {
  Name: string;
  Details?: string;
  TargetUrl?: string;
  ImageUrl?: string;
  PriceMin?: string;
  PriceMax?: string;
  Priority?: number;
  Status?: WishListItemStatus;
}

// Get all wishlists for a family
export const fetchWishlists = async (familyId: number): Promise<WishList[]> => {
  const response = await apiClient.get(`/wishlists/${familyId}/wishlists`);
  return response.data;
};

// Get single wishlist
export const fetchWishlist = async (
  familyId: number,
  wishlistId: number
): Promise<WishList> => {
  const response = await apiClient.get(
    `/wishlists/${familyId}/wishlists/${wishlistId}`
  );
  return response.data;
};

// Create wishlist
export const createWishlist = async (
  familyId: number,
  payload: CreateWishlistPayload
): Promise<WishList> => {
  const response = await apiClient.post(
    `/wishlists/${familyId}/wishlists`,
    payload
  );
  return response.data;
};

// Update wishlist
export const updateWishlist = async (
  familyId: number,
  wishlistId: number,
  payload: Partial<CreateWishlistPayload>
): Promise<WishList> => {
  const response = await apiClient.put(
    `/wishlists/${familyId}/wishlists/${wishlistId}`,
    payload
  );
  return response.data;
};

// Delete wishlist
export const deleteWishlist = async (
  familyId: number,
  wishlistId: number
): Promise<void> => {
  await apiClient.delete(`/wishlists/${familyId}/wishlists/${wishlistId}`);
};

// Add item to wishlist
export const addWishlistItem = async (
  familyId: number,
  wishlistId: number,
  payload: CreateWishlistItemPayload
): Promise<WishListItem> => {
  const response = await apiClient.post(
    `/wishlists/${familyId}/wishlists/${wishlistId}/items`,
    payload
  );
  return response.data;
};

// Update wishlist item
export const updateWishlistItem = async (
  familyId: number,
  wishlistId: number,
  itemId: number,
  payload: Partial<CreateWishlistItemPayload>
): Promise<WishListItem> => {
  const response = await apiClient.put(
    `/wishlists/${familyId}/wishlists/${wishlistId}/items/${itemId}`,
    payload
  );
  return response.data;
};

// Delete wishlist item
export const deleteWishlistItem = async (
  familyId: number,
  wishlistId: number,
  itemId: number
): Promise<void> => {
  await apiClient.delete(
    `/wishlists/${familyId}/wishlists/${wishlistId}/items/${itemId}`
  );
};

// Toggle item claim
export const toggleWishlistItemClaim = async (
  familyId: number,
  wishlistId: number,
  itemId: number,
  note?: string
): Promise<WishListItem> => {
  const response = await apiClient.post(
    `/wishlists/${familyId}/wishlists/${wishlistId}/items/${itemId}/toggle-claim`,
    { note }
  );
  return response.data;
};

// Generate share link
export const generateWishlistShareLink = async (
  familyId: number,
  wishlistId: number
): Promise<WishListShareResponse> => {
  const response = await apiClient.post(
    `/wishlists/${familyId}/wishlists/${wishlistId}/share`
  );
  return response.data;
};

// Revoke share link
export const revokeWishlistShareLink = async (
  familyId: number,
  wishlistId: number
): Promise<void> => {
  await apiClient.delete(
    `/wishlists/${familyId}/wishlists/${wishlistId}/share`
  );
};
