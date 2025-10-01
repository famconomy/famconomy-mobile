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
