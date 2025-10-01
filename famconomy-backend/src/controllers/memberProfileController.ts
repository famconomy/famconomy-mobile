import { Request, Response } from 'express';
import { prisma } from '../db';
import { generateShareToken, hashShareToken, computeExpiryDate } from '../utils/shareToken';

const parseVisibility = (value: unknown): 'FAMILY' | 'PARENTS' | 'LINK' | 'PRIVATE' => {
  if (typeof value !== 'string') return 'FAMILY';
  const normalized = value.trim().toUpperCase();
  if (['FAMILY', 'PARENTS', 'LINK', 'PRIVATE'].includes(normalized)) {
    return normalized as 'FAMILY' | 'PARENTS' | 'LINK' | 'PRIVATE';
  }
  return 'FAMILY';
};

const normalizeJsonField = (value: unknown) => {
  if (value === undefined) return undefined;
  if (value === null) return null;
  if (typeof value === 'string') {
    try {
      return JSON.parse(value);
    } catch (error) {
      return value;
    }
  }
  return value;
};

const toArray = (value: unknown): string[] => {
  if (!value) return [];
  if (Array.isArray(value)) {
    return value.filter(item => typeof item === 'string' && item.trim().length > 0);
  }
  return [];
};

const toRecord = (value: unknown): Record<string, unknown> => {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return {};
  }
  return value as Record<string, unknown>;
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

const ensureTargetMember = async (familyId: number, userId: string) => {
  const membership = await prisma.familyUsers.findFirst({
    where: { FamilyID: familyId, UserID: userId },
  });
  if (!membership) {
    const error = new Error('MEMBER_NOT_FOUND');
    (error as any).statusCode = 404;
    throw error;
  }
};

const sanitizeProfile = (profile: any) => {
  if (!profile) return null;
  const {
    ClothingSizes,
    FavoriteColors,
    FavoriteFoods,
    Interests,
    Allergies,
    FavoriteBrands,
    ShareToken,
    user: _user,
    ...rest
  } = profile;

  return {
    ...rest,
    clothingSizes: toRecord(ClothingSizes),
    favoriteColors: toArray(FavoriteColors),
    favoriteFoods: toArray(FavoriteFoods),
    interests: toArray(Interests),
    allergies: toArray(Allergies),
    favoriteBrands: toArray(FavoriteBrands),
    shareLinkActive: Boolean(ShareToken),
  };
};

export const getMemberProfile = async (req: Request & { userId?: string }, res: Response) => {
  try {
    const viewerId = req.userId;
    if (!viewerId) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    const familyId = parseInt(req.params.familyId, 10);
    const memberId = req.params.userId;

    if (Number.isNaN(familyId) || !memberId) {
      return res.status(400).json({ message: 'Invalid parameters' });
    }

    await ensureFamilyMembership(familyId, viewerId);
    await ensureTargetMember(familyId, memberId);

    const profile = await prisma.memberProfile.findUnique({
      where: {
        UserID_FamilyID: {
          UserID: memberId,
          FamilyID: familyId,
        },
      },
      include: {
        user: {
          select: {
            UserID: true,
            FirstName: true,
            LastName: true,
            Email: true,
            ProfilePhotoUrl: true,
          },
        },
      },
    });

    res.json({
      profile: sanitizeProfile(profile),
      user: profile?.user ?? null,
    });
  } catch (error: any) {
    const status = error?.statusCode || 500;
    res.status(status).json({ message: error?.message || 'Failed to load member profile' });
  }
};

export const upsertMemberProfile = async (req: Request & { userId?: string }, res: Response) => {
  try {
    const updaterId = req.userId;
    if (!updaterId) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    const familyId = parseInt(req.params.familyId, 10);
    const memberId = req.params.userId;

    if (Number.isNaN(familyId) || !memberId) {
      return res.status(400).json({ message: 'Invalid parameters' });
    }

    await ensureFamilyMembership(familyId, updaterId);
    await ensureTargetMember(familyId, memberId);

    const payload = {
      ClothingSizes: normalizeJsonField(req.body?.clothingSizes),
      FavoriteColors: normalizeJsonField(req.body?.favoriteColors),
      FavoriteFoods: normalizeJsonField(req.body?.favoriteFoods),
      Interests: normalizeJsonField(req.body?.interests),
      Allergies: normalizeJsonField(req.body?.allergies),
      FavoriteBrands: normalizeJsonField(req.body?.favoriteBrands),
      Notes: req.body?.notes ?? undefined,
      WishlistSummary: req.body?.wishlistSummary ?? undefined,
      Visibility: req.body?.visibility ? parseVisibility(req.body.visibility) : undefined,
    };

    const profile = await prisma.memberProfile.upsert({
      where: {
        UserID_FamilyID: {
          UserID: memberId,
          FamilyID: familyId,
        },
      },
      create: {
        UserID: memberId,
        FamilyID: familyId,
        ClothingSizes: payload.ClothingSizes ?? null,
        FavoriteColors: payload.FavoriteColors ?? null,
        FavoriteFoods: payload.FavoriteFoods ?? null,
        Interests: payload.Interests ?? null,
        Allergies: payload.Allergies ?? null,
        FavoriteBrands: payload.FavoriteBrands ?? null,
        Notes: payload.Notes ?? null,
        WishlistSummary: payload.WishlistSummary ?? null,
        Visibility: payload.Visibility ?? 'FAMILY',
        LastUpdatedBy: updaterId,
        LastUpdatedAt: new Date(),
      },
      update: {
        ...payload,
        LastUpdatedBy: updaterId,
        LastUpdatedAt: new Date(),
      },
      include: {
        user: {
          select: {
            UserID: true,
            FirstName: true,
            LastName: true,
            Email: true,
            ProfilePhotoUrl: true,
          },
        },
      },
    });

    res.json({
      profile: sanitizeProfile(profile),
      user: profile?.user ?? null,
    });
  } catch (error: any) {
    const status = error?.statusCode || 500;
    res.status(status).json({ message: error?.message || 'Failed to update member profile' });
  }
};

const SHARE_BASE_URL = () => {
  const baseFromEnv = process.env.SHARE_BASE_URL?.trim();
  if (baseFromEnv) {
    return baseFromEnv.replace(/\/$/, '');
  }
  return 'https://famconomy.com';
};

export const generateProfileShareLink = async (req: Request & { userId?: string }, res: Response) => {
  try {
    const requesterId = req.userId;
    if (!requesterId) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    const familyId = parseInt(req.params.familyId, 10);
    const memberId = req.params.userId;

    if (Number.isNaN(familyId) || !memberId) {
      return res.status(400).json({ message: 'Invalid parameters' });
    }

    await ensureFamilyMembership(familyId, requesterId);
    await ensureTargetMember(familyId, memberId);

    const ttlHours = parseInt(process.env.PROFILE_SHARE_TTL_HOURS ?? '336', 10);
    const token = generateShareToken();
    const hashed = hashShareToken(token);
    const expiresAt = computeExpiryDate(ttlHours);

    const profile = await prisma.memberProfile.upsert({
      where: {
        UserID_FamilyID: {
          UserID: memberId,
          FamilyID: familyId,
        },
      },
      create: {
        UserID: memberId,
        FamilyID: familyId,
        ShareToken: hashed,
        ShareTokenExpiresAt: expiresAt,
        Visibility: 'FAMILY',
        LastUpdatedBy: requesterId,
        LastUpdatedAt: new Date(),
      },
      update: {
        ShareToken: hashed,
        ShareTokenExpiresAt: expiresAt,
        LastUpdatedBy: requesterId,
        LastUpdatedAt: new Date(),
      },
    });

    const shareUrl = SHARE_BASE_URL() + '/share/profiles/' + token;
    res.json({ shareUrl, expiresAt: profile.ShareTokenExpiresAt });
  } catch (error: any) {
    const status = error?.statusCode || 500;
    res.status(status).json({ message: error?.message || 'Failed to generate share link' });
  }
};

export const revokeProfileShareLink = async (req: Request & { userId?: string }, res: Response) => {
  try {
    const requesterId = req.userId;
    if (!requesterId) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    const familyId = parseInt(req.params.familyId, 10);
    const memberId = req.params.userId;

    if (Number.isNaN(familyId) || !memberId) {
      return res.status(400).json({ message: 'Invalid parameters' });
    }

    await ensureFamilyMembership(familyId, requesterId);
    await ensureTargetMember(familyId, memberId);

    await prisma.memberProfile.update({
      where: {
        UserID_FamilyID: {
          UserID: memberId,
          FamilyID: familyId,
        },
      },
      data: {
        ShareToken: null,
        ShareTokenExpiresAt: null,
        LastUpdatedBy: requesterId,
        LastUpdatedAt: new Date(),
      },
    });

    res.status(204).send();
  } catch (error: any) {
    const status = error?.statusCode || 500;
    res.status(status).json({ message: error?.message || 'Failed to revoke share link' });
  }
};

export const getSharedProfile = async (req: Request, res: Response) => {
  try {
    const { token } = req.params;
    if (!token || typeof token !== 'string' || token.length < 8) {
      return res.status(400).json({ message: 'Invalid share token' });
    }

    const hashed = hashShareToken(token);

    const profile = await prisma.memberProfile.findFirst({
      where: {
        ShareToken: hashed,
        ShareTokenExpiresAt: {
          gt: new Date(),
        },
      },
      include: {
        user: {
          select: {
            UserID: true,
            FirstName: true,
            LastName: true,
            Email: true,
            ProfilePhotoUrl: true,
          },
        },
        family: {
          select: { FamilyID: true, FamilyName: true },
        },
      },
    });

    if (!profile) {
      return res.status(404).json({ message: 'Profile not found or expired' });
    }

    res.json({
      profile: sanitizeProfile(profile),
      user: profile.user,
      family: profile.family,
      expiresAt: profile.ShareTokenExpiresAt,
    });
  } catch (error: any) {
    res.status(500).json({ message: 'Failed to load shared profile' });
  }
};
