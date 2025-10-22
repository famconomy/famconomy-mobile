import { Request, Response } from 'express';
import { Prisma } from '@prisma/client';
import { prisma } from '../db';
import { generateShareToken, hashShareToken, computeExpiryDate } from '../utils/shareToken';

const parseVisibility = (value: unknown): 'FAMILY' | 'PARENTS' | 'LINK' => {
  if (typeof value !== 'string') {
    return 'FAMILY';
  }
  const normalized = value.trim().toUpperCase();
  if (['FAMILY', 'PARENTS', 'LINK'].includes(normalized)) {
    return normalized as 'FAMILY' | 'PARENTS' | 'LINK';
  }
  return 'FAMILY';
};

const parseItemStatus = (value: unknown): 'IDEA' | 'RESERVED' | 'PURCHASED' => {
  if (typeof value !== 'string') {
    return 'IDEA';
  }
  const normalized = value.trim().toUpperCase();
  if (['IDEA', 'RESERVED', 'PURCHASED'].includes(normalized)) {
    return normalized as 'IDEA' | 'RESERVED' | 'PURCHASED';
  }
  return 'IDEA';
};

const ensureFamilyMembership = async (familyId: number, userId: string) => {
  const membership = await prisma.familyUsers.findFirst({
    where: { FamilyID: familyId, UserID: userId },
  });

  if (!membership) {
    const error = new Error('ACCESS_DENIED');
    (error as any).statusCode = 403;
    throw error;
  }
};

const ensureOwnerMembership = async (familyId: number, ownerUserId?: string | null) => {
  if (!ownerUserId) {
    return;
  }
  const ownerMembership = await prisma.familyUsers.findFirst({
    where: { FamilyID: familyId, UserID: ownerUserId },
  });
  if (!ownerMembership) {
    const error = new Error('INVALID_OWNER');
    (error as any).statusCode = 400;
    throw error;
  }
};

const sanitizeWishList = (wishlist: any) => {
  const { ShareToken, ...rest } = wishlist;
  return {
    ...rest,
    shareLinkActive: Boolean(ShareToken),
  };
};

export const listWishlists = async (req: Request & { userId?: string }, res: Response) => {
  try {
    const userId = req.userId;
    if (!userId) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    const familyId = parseInt(req.params.familyId, 10);
    if (Number.isNaN(familyId)) {
      return res.status(400).json({ message: 'Invalid family id' });
    }

    await ensureFamilyMembership(familyId, userId);

    const wishlists = await prisma.wishList.findMany({
      where: { FamilyID: familyId },
      orderBy: { CreatedAt: 'asc' },
      include: {
        owner: {
          select: { UserID: true, FirstName: true, LastName: true, ProfilePhotoUrl: true },
        },
        items: {
          orderBy: { CreatedAt: 'asc' },
          include: {
            claimedBy: {
              select: { UserID: true, FirstName: true, LastName: true },
            },
          },
        },
      },
    });

    res.json(wishlists.map(sanitizeWishList));
  } catch (error: any) {
    const status = error?.statusCode || 500;
    res.status(status).json({ message: error?.message || 'Failed to load wishlists' });
  }
};

export const createWishlist = async (req: Request & { userId?: string }, res: Response) => {
  try {
    const userId = req.userId;
    if (!userId) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    const familyId = parseInt(req.params.familyId, 10);
    if (Number.isNaN(familyId)) {
      return res.status(400).json({ message: 'Invalid family id' });
    }

    await ensureFamilyMembership(familyId, userId);

    const { title, description, ownerUserId, visibility } = req.body;
    if (!title || typeof title !== 'string') {
      return res.status(400).json({ message: 'Title is required' });
    }

    await ensureOwnerMembership(familyId, ownerUserId);

    const wishlist = await prisma.wishList.create({
      data: {
        FamilyID: familyId,
        Title: title.trim(),
        Description: description ?? null,
        OwnerUserID: ownerUserId ?? null,
        Visibility: parseVisibility(visibility),
        CreatedByUserID: userId,
      },
      include: {
        owner: {
          select: { UserID: true, FirstName: true, LastName: true, ProfilePhotoUrl: true },
        },
        items: true,
      },
    });

    res.status(201).json(sanitizeWishList(wishlist));
  } catch (error: any) {
    const status = error?.statusCode || 500;
    res.status(status).json({ message: error?.message || 'Failed to create wishlist' });
  }
};

const getWishlistWithAccess = async (wishlistId: number, userId: string) => {
  const wishlist = await prisma.wishList.findUnique({
    where: { WishListID: wishlistId },
  });

  if (!wishlist) {
    const error = new Error('Wishlist not found');
    (error as any).statusCode = 404;
    throw error;
  }

  await ensureFamilyMembership(wishlist.FamilyID, userId);

  return wishlist;
};

export const updateWishlist = async (req: Request & { userId?: string }, res: Response) => {
  try {
    const userId = req.userId;
    if (!userId) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    const wishlistId = parseInt(req.params.wishlistId, 10);
    if (Number.isNaN(wishlistId)) {
      return res.status(400).json({ message: 'Invalid wishlist id' });
    }

    const wishlist = await getWishlistWithAccess(wishlistId, userId);

    const { title, description, ownerUserId, visibility } = req.body;

    if (ownerUserId && ownerUserId !== wishlist.OwnerUserID) {
      await ensureOwnerMembership(wishlist.FamilyID, ownerUserId);
    }

    const updated = await prisma.wishList.update({
      where: { WishListID: wishlistId },
      data: {
        Title: typeof title === 'string' ? title.trim() : undefined,
        Description: description ?? undefined,
        OwnerUserID: ownerUserId !== undefined ? ownerUserId : undefined,
        Visibility: visibility !== undefined ? parseVisibility(visibility) : undefined,
        UpdatedByUserID: userId,
      },
      include: {
        owner: {
          select: { UserID: true, FirstName: true, LastName: true, ProfilePhotoUrl: true },
        },
        items: {
          orderBy: { CreatedAt: 'asc' },
          include: {
            claimedBy: {
              select: { UserID: true, FirstName: true, LastName: true },
            },
          },
        },
      },
    });

    res.json(sanitizeWishList(updated));
  } catch (error: any) {
    const status = error?.statusCode || 500;
    res.status(status).json({ message: error?.message || 'Failed to update wishlist' });
  }
};

export const deleteWishlist = async (req: Request & { userId?: string }, res: Response) => {
  try {
    const userId = req.userId;
    if (!userId) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    const wishlistId = parseInt(req.params.wishlistId, 10);
    if (Number.isNaN(wishlistId)) {
      return res.status(400).json({ message: 'Invalid wishlist id' });
    }

    const wishlist = await getWishlistWithAccess(wishlistId, userId);

    await prisma.wishList.delete({ where: { WishListID: wishlist.WishListID } });

    res.status(204).send();
  } catch (error: any) {
    const status = error?.statusCode || 500;
    res.status(status).json({ message: error?.message || 'Failed to delete wishlist' });
  }
};

export const addWishlistItem = async (req: Request & { userId?: string }, res: Response) => {
  try {
    const userId = req.userId;
    if (!userId) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    const wishlistId = parseInt(req.params.wishlistId, 10);
    if (Number.isNaN(wishlistId)) {
      return res.status(400).json({ message: 'Invalid wishlist id' });
    }

    await getWishlistWithAccess(wishlistId, userId);

    const { name, details, targetUrl, imageUrl, priceMin, priceMax, priority, status } = req.body;
    if (!name || typeof name !== 'string') {
      return res.status(400).json({ message: 'Item name is required' });
    }

    const item = await prisma.wishListItem.create({
      data: {
        WishListID: wishlistId,
        Name: name.trim(),
        Details: details ?? null,
        TargetUrl: targetUrl ?? null,
        ImageUrl: imageUrl ?? null,
        PriceMin: priceMin ? new Prisma.Decimal(priceMin) : null,
        PriceMax: priceMax ? new Prisma.Decimal(priceMax) : null,
        Priority: priority ?? null,
        Status: parseItemStatus(status),
        CreatedByUserID: userId,
      },
      include: {
        claimedBy: {
          select: { UserID: true, FirstName: true, LastName: true },
        },
      },
    });

    res.status(201).json(item);
  } catch (error: any) {
    const status = error?.statusCode || 500;
    res.status(status).json({ message: error?.message || 'Failed to add wishlist item' });
  }
};

export const updateWishlistItem = async (req: Request & { userId?: string }, res: Response) => {
  try {
    const userId = req.userId;
    if (!userId) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    const wishlistId = parseInt(req.params.wishlistId, 10);
    const itemId = parseInt(req.params.itemId, 10);

    if (Number.isNaN(wishlistId) || Number.isNaN(itemId)) {
      return res.status(400).json({ message: 'Invalid identifiers' });
    }

    await getWishlistWithAccess(wishlistId, userId);

    const { name, details, targetUrl, imageUrl, priceMin, priceMax, priority, status } = req.body;

    const item = await prisma.wishListItem.update({
      where: { WishListItemID: itemId },
      data: {
        Name: typeof name === 'string' ? name.trim() : undefined,
        Details: details ?? undefined,
        TargetUrl: targetUrl ?? undefined,
        ImageUrl: imageUrl ?? undefined,
        PriceMin: priceMin !== undefined ? (priceMin === null ? null : new Prisma.Decimal(priceMin)) : undefined,
        PriceMax: priceMax !== undefined ? (priceMax === null ? null : new Prisma.Decimal(priceMax)) : undefined,
        Priority: priority ?? undefined,
        Status: status !== undefined ? parseItemStatus(status) : undefined,
        UpdatedByUserID: userId,
      },
      include: {
        claimedBy: {
          select: { UserID: true, FirstName: true, LastName: true },
        },
      },
    });

    res.json(item);
  } catch (error: any) {
    const status = error?.statusCode || 500;
    res.status(status).json({ message: error?.message || 'Failed to update wishlist item' });
  }
};

export const deleteWishlistItem = async (req: Request & { userId?: string }, res: Response) => {
  try {
    const userId = req.userId;
    if (!userId) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    const wishlistId = parseInt(req.params.wishlistId, 10);
    const itemId = parseInt(req.params.itemId, 10);

    if (Number.isNaN(wishlistId) || Number.isNaN(itemId)) {
      return res.status(400).json({ message: 'Invalid identifiers' });
    }

    await getWishlistWithAccess(wishlistId, userId);

    await prisma.wishListItem.delete({ where: { WishListItemID: itemId } });

    res.status(204).send();
  } catch (error: any) {
    const status = error?.statusCode || 500;
    res.status(status).json({ message: error?.message || 'Failed to delete wishlist item' });
  }
};

export const claimWishlistItem = async (req: Request & { userId?: string }, res: Response) => {
  try {
    const userId = req.userId;
    if (!userId) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    const wishlistId = parseInt(req.params.wishlistId, 10);
    const itemId = parseInt(req.params.itemId, 10);

    if (Number.isNaN(wishlistId) || Number.isNaN(itemId)) {
      return res.status(400).json({ message: 'Invalid identifiers' });
    }

    await getWishlistWithAccess(wishlistId, userId);

    const { action, note } = req.body ?? {};
    const claim = action === 'unclaim'
      ? {
          ClaimedByUserID: null,
          ClaimedNote: null,
          ClaimedAt: null,
        }
      : {
          ClaimedByUserID: userId,
          ClaimedNote: typeof note === 'string' ? note.slice(0, 500) : null,
          ClaimedAt: new Date(),
        };

    const item = await prisma.wishListItem.update({
      where: { WishListItemID: itemId },
      data: {
        ...claim,
        UpdatedByUserID: userId,
      },
      include: {
        claimedBy: {
          select: { UserID: true, FirstName: true, LastName: true },
        },
      },
    });

    res.json(item);
  } catch (error: any) {
    const status = error?.statusCode || 500;
    res.status(status).json({ message: error?.message || 'Failed to update claim status' });
  }
};

const BUILD_SHARE_BASE_URL = () => {
  const baseFromEnv = process.env.SHARE_BASE_URL?.trim();
  if (baseFromEnv) {
    return baseFromEnv.replace(/\/$/, '');
  }
  return 'https://famconomy.com';
};

export const generateWishlistShareLink = async (req: Request & { userId?: string }, res: Response) => {
  try {
    const userId = req.userId;
    if (!userId) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    const wishlistId = parseInt(req.params.wishlistId, 10);
    if (Number.isNaN(wishlistId)) {
      return res.status(400).json({ message: 'Invalid wishlist id' });
    }

    const wishlist = await getWishlistWithAccess(wishlistId, userId);

    const ttlHours = parseInt(process.env.WISHLIST_SHARE_TTL_HOURS ?? '336', 10);
    const token = generateShareToken();
    const hashed = hashShareToken(token);
    const expiresAt = computeExpiryDate(ttlHours);

    await prisma.wishList.update({
      where: { WishListID: wishlist.WishListID },
      data: {
        ShareToken: hashed,
        ShareTokenExpiresAt: expiresAt,
        UpdatedByUserID: userId,
      },
    });

    const shareUrl = `${BUILD_SHARE_BASE_URL()}/share/wishlists/${token}`;
    res.json({ shareUrl, expiresAt });
  } catch (error: any) {
    const status = error?.statusCode || 500;
    res.status(status).json({ message: error?.message || 'Failed to generate share link' });
  }
};

export const revokeWishlistShareLink = async (req: Request & { userId?: string }, res: Response) => {
  try {
    const userId = req.userId;
    if (!userId) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    const wishlistId = parseInt(req.params.wishlistId, 10);
    if (Number.isNaN(wishlistId)) {
      return res.status(400).json({ message: 'Invalid wishlist id' });
    }

    const wishlist = await getWishlistWithAccess(wishlistId, userId);

    await prisma.wishList.update({
      where: { WishListID: wishlist.WishListID },
      data: {
        ShareToken: null,
        ShareTokenExpiresAt: null,
        UpdatedByUserID: userId,
      },
    });

    res.status(204).send();
  } catch (error: any) {
    const status = error?.statusCode || 500;
    res.status(status).json({ message: error?.message || 'Failed to revoke share link' });
  }
};

export const getSharedWishlist = async (req: Request, res: Response) => {
  try {
    const { token } = req.params;
    if (!token || typeof token !== 'string' || token.length < 8) {
      return res.status(400).json({ message: 'Invalid share token' });
    }

    const hashed = hashShareToken(token);

    const wishlist = await prisma.wishList.findFirst({
      where: {
        ShareToken: hashed,
        ShareTokenExpiresAt: {
          gt: new Date(),
        },
      },
      include: {
        family: {
          select: { FamilyID: true, FamilyName: true },
        },
        owner: {
          select: { UserID: true, FirstName: true, LastName: true, ProfilePhotoUrl: true },
        },
        items: {
          where: { Status: { in: ['IDEA', 'RESERVED', 'PURCHASED'] } },
          orderBy: { CreatedAt: 'asc' },
          include: {
            claimedBy: {
              select: { FirstName: true, LastName: true },
            },
          },
        },
      },
    });

    if (!wishlist) {
      return res.status(404).json({ message: 'Wishlist not found or expired' });
    }

    res.json({
      WishListID: wishlist.WishListID,
      Title: wishlist.Title,
      Description: wishlist.Description,
      Visibility: wishlist.Visibility,
      Family: wishlist.family,
      Owner: wishlist.owner,
      Items: wishlist.items,
      ExpiresAt: wishlist.ShareTokenExpiresAt,
    });
  } catch (error: any) {
    res.status(500).json({ message: 'Failed to load shared wishlist' });
  }
};
