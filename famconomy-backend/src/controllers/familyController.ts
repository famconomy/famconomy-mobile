import { Request, Response } from 'express';
import { prisma } from '../db';

const parseFamilyValues = (raw: unknown): string[] => {
  if (raw === null || raw === undefined) {
    return [];
  }
  if (Array.isArray(raw)) {
    return raw
      .map((value) => (typeof value === 'string' ? value.trim() : ''))
      .filter(Boolean);
  }
  if (typeof raw === 'string') {
    try {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        return parsed
          .map((value) => (typeof value === 'string' ? value.trim() : ''))
          .filter(Boolean);
      }
    } catch (error) {
      // Ignore parse errors and fall through to treating the raw string as a single value
    }
    const trimmed = raw.trim();
    return trimmed ? [trimmed] : [];
  }
  return [];
};

const serializeFamilyValues = (input: unknown): string | null => {
  const values = parseFamilyValues(input);
  return values.length ? JSON.stringify(values) : null;
};

// Get the family details for the currently authenticated user
export const getMyFamily = async (req: Request & { userId?: string }, res: Response) => {
  try {
    const userId = req.userId;
    if (!userId) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    const families = await prisma.family.findMany({
      where: {
        FamilyUsers: {
          some: {
            UserID: userId,
          },
        },
      },
      orderBy: {
        CreatedDate: 'desc',
      },
      include: {
        FamilyUsers: {
          include: {
            Users: true,
          },
        },
      },
    });

    const formattedFamilies = families.map(family => {
      const { FamilyUsers, FamilyValues, rewardMode, ...familyData } = family;
      return {
        ...familyData,
        FamilyValues: parseFamilyValues(FamilyValues),
        rewardMode,
        members: FamilyUsers.map(member => ({
          ...member.Users,
          RelationshipID: member.RelationshipID,
        })),
      };
    });

    const activeFamilyId = formattedFamilies.length ? formattedFamilies[0].FamilyID : null;

    res.json({
      families: formattedFamilies,
      activeFamilyId,
    });
  } catch (err: any) {
    res.status(500).json({ message: 'Failed to fetch family data', error: err.message });
  }
};

export const createFamily = async (req: Request & { userId?: string }, res: Response) => {
  console.log('--- DEBUG: createFamily controller called ---');
  const { familyName, rewardMode } = req.body;
  const userId = req.userId;

  if (!userId) {
    return res.status(401).json({ message: 'Unauthorized' });
  }

  if (!familyName) {
    return res.status(400).json({ message: 'Family name is required' });
  }

  try {
    // Find or create the 'Parent' relationship
    const parentRelationship = await prisma.relationship.upsert({
      where: { RelationshipID: 1 },
      update: { RelationshipName: 'Parent' },
      create: {
        RelationshipID: 1,
        RelationshipName: 'Parent',
      },
    });

    const newFamily = await prisma.$transaction(async (prisma) => {
      const createdFamily = await prisma.family.create({
        data: {
          FamilyName: familyName,
          CreatedByUserID: userId,
          rewardMode: rewardMode || 'points',
        },
      });

      await prisma.familyUsers.create({
        data: {
          UserID: userId,
          FamilyID: createdFamily.FamilyID,
          RelationshipID: parentRelationship.RelationshipID,
        },
      });

      return createdFamily;
    });

    res.status(201).json(newFamily);
  } catch (err: any) {
    console.error('--- ERROR in createFamily ---', err);
    res.status(500).json({ message: 'Failed to create family', error: err.message });
  }
};

// Update a family
export const updateFamily = async (req: Request, res: Response) => {
  const { id } = req.params;
  const { FamilyName, FamilyMantra, familyName, familyMantra, FamilyValues, familyValues, rewardMode } = req.body;

  const nextName = FamilyName ?? familyName;
  const nextMantra = FamilyMantra ?? familyMantra;
  const nextValues = FamilyValues ?? familyValues;

  if (!nextName) {
    return res.status(400).json({ error: 'Family name is required.' });
  }

  try {
    const updatedFamily = await prisma.family.update({
      where: { FamilyID: parseInt(id) },
      data: {
        FamilyName: nextName,
        FamilyMantra: nextMantra ?? null,
        FamilyValues: serializeFamilyValues(nextValues),
        ...(rewardMode ? { rewardMode } : {}),
      },
    });
    res.json({
      ...updatedFamily,
      FamilyValues: parseFamilyValues(updatedFamily.FamilyValues),
      rewardMode: updatedFamily.rewardMode,
    });
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const removeFamilyMember = async (req: Request, res: Response) => {
  const { familyId, memberId } = req.params;
  try {
    await prisma.familyUsers.delete({
      where: {
        UserID_FamilyID: {
          UserID: memberId,
          FamilyID: parseInt(familyId),
        },
      },
    });
    res.status(204).send();
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const leaveFamily = async (req: Request & { userId?: string }, res: Response) => {
  const userId = req.userId;

  if (!userId) {
    return res.status(401).json({ message: 'Unauthorized' });
  }

  try {
    const familyUser = await prisma.familyUsers.findFirst({
      where: { UserID: userId },
    });

    if (!familyUser) {
      return res.status(404).json({ message: 'You are not in a family.' });
    }

    await prisma.familyUsers.delete({
      where: {
        UserID_FamilyID: {
          UserID: userId,
          FamilyID: familyUser.FamilyID,
        },
      },
    });

    res.status(204).send();
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal server error' });
  }
};
