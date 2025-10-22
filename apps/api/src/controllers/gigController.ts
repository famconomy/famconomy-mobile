import { Request, Response } from 'express';
import { Prisma, WalletLedgerType } from '@prisma/client';
import { prisma } from '../db';
import { transferFromFamilyToUserTx } from '../services/walletService';

const shouldLogGigCreation =
  process.env.DEBUG_ONBOARDING_COMMIT === 'true' || process.env.DEBUG_ONBOARDING === 'true';

export const getGigs = async (req: Request & { userId?: string }, res: Response) => {
  console.log('--- DEBUG: getGigs controller called ---');
  const userId = req.userId;
  console.log('--- DEBUG: userId ---', userId);

  const rawFamilyId = req.query.familyId;
  let requestedFamilyId: number | undefined;
  if (rawFamilyId !== undefined) {
    const familyIdValue = Array.isArray(rawFamilyId) ? rawFamilyId[0] : rawFamilyId;
    const parsedFamilyId = Number(familyIdValue);
    if (!Number.isInteger(parsedFamilyId)) {
      return res.status(400).json({ message: 'familyId must be an integer.' });
    }
    requestedFamilyId = parsedFamilyId;
  }

  if (!userId) {
    return res.status(401).json({ message: 'Unauthorized' });
  }

  try {
    const familyUser = await prisma.familyUsers.findFirst({
      where: {
        UserID: userId,
        ...(requestedFamilyId !== undefined ? { FamilyID: requestedFamilyId } : {}),
      },
    });
    console.log('--- DEBUG: familyUser from prisma ---', JSON.stringify(familyUser, null, 2));

    if (!familyUser) {
      if (requestedFamilyId !== undefined) {
        return res.status(403).json({ message: 'User is not a member of the requested family.' });
      }
      return res.status(404).json({ message: 'Family not found for this user.' });
    }

    const effectiveFamilyId = requestedFamilyId ?? familyUser.FamilyID;

    const familyGigs = await prisma.familyGig.findMany({
      where: {
        familyId: effectiveFamilyId,
        visible: true,
      },
      include: {
        gigTemplate: true,
        familyRoom: {
          include: {
            roomTemplate: true,
          },
        },
        claims: {
          include: {
            user: true,
          },
        },
      },
    });

    res.json(familyGigs);
  } catch (error) {
    console.log('--- ERROR in getGigs ---', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const getGigTemplates = async (req: Request, res: Response) => {
  try {
    const [templates, roomTemplates] = await Promise.all([
      prisma.gigTemplate.findMany(),
      prisma.roomTemplate.findMany({
        select: {
          id: true,
          name: true,
          tags: true,
        },
      }),
    ]);

    const normalizedRoomTemplates = roomTemplates.map((roomTemplate) => ({
      id: roomTemplate.id,
      name: roomTemplate.name,
      tags: roomTemplate.tags
        ? roomTemplate.tags.split(',').map((tag) => tag.trim().toLowerCase()).filter(Boolean)
        : [],
    }));

    const templatesWithRoom = templates.map((template) => {
      const templateTags = template.applicableTags
        ? template.applicableTags.split(',').map((tag) => tag.trim().toLowerCase()).filter(Boolean)
        : [];

      const matchedRoomTemplate = templateTags.length
        ? normalizedRoomTemplates.find((roomTemplate) =>
            roomTemplate.tags.some((tag) => templateTags.includes(tag))
          )
        : undefined;

      return {
        ...template,
        roomTemplate: matchedRoomTemplate
          ? { id: matchedRoomTemplate.id, name: matchedRoomTemplate.name }
          : null,
      };
    });

    res.json(templatesWithRoom);
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const addGigToFamily = async (req: Request & { userId?: string }, res: Response) => {
  const userId = req.userId;
  const { gigTemplateId, roomId, cadenceType, maxPerDay, visible } = req.body;

  if (!userId) {
    return res.status(401).json({ message: 'Unauthorized' });
  }

  try {
    const familyUser = await prisma.familyUsers.findFirst({
      where: { UserID: userId },
    });

    if (!familyUser) {
      return res.status(404).json({ message: 'Family not found for this user.' });
    }

    const newFamilyGig = await prisma.familyGig.create({
      data: {
        familyId: familyUser.FamilyID,
        gigTemplateId,
        familyRoomId: roomId,
        cadenceType,
        maxPerDay,
        visible,
      },
      include: {
        gigTemplate: true,
        familyRoom: true,
      },
    });

    res.status(201).json(newFamilyGig);
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const updateFamilyGig = async (req: Request, res: Response) => {
  const { id } = req.params;
  const { cadenceType, maxPerDay, visible, overridePoints, overrideCurrencyCents, overrideScreenMinutes } = req.body;

  try {
    const updatedFamilyGig = await prisma.familyGig.update({
      where: { id: parseInt(id) },
      data: {
        cadenceType,
        maxPerDay,
        visible,
        overridePoints,
        overrideCurrencyCents,
        overrideScreenMinutes,
      },
    });

    res.json(updatedFamilyGig);
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const removeFamilyGig = async (req: Request, res: Response) => {
  const { id } = req.params;

  try {
    await prisma.familyGig.delete({
      where: { id: parseInt(id) },
    });

    res.status(204).send();
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const claimGig = async (req: Request & { userId?: string }, res: Response) => {
  const { gigId } = req.params;
  const userId = req.userId;

  if (!userId) {
    return res.status(401).json({ message: 'Unauthorized' });
  }

  try {
    const familyGig = await prisma.familyGig.findUnique({
      where: { id: parseInt(gigId) },
    });

    if (!familyGig) {
      return res.status(404).json({ message: 'Gig not found.' });
    }

    // Check if the gig is already claimed by this user for the current period
    // For simplicity, let's assume a daily claim for now. We can make this more sophisticated later.
    const today = new Date();
    const periodKey = `${today.getFullYear()}-${today.getMonth() + 1}-${today.getDate()}`;

    const existingClaim = await prisma.claim.findFirst({
      where: {
        familyGigId: familyGig.id,
        userId: userId,
        periodKey: periodKey,
      },
    });

    if (existingClaim) {
      return res.status(409).json({ message: 'Gig already claimed for this period.' });
    }

    const newClaim = await prisma.claim.create({
      data: {
        familyGigId: familyGig.id,
        userId: userId,
        status: 'claimed',
        periodKey: periodKey,
      },
      include: {
        user: true, // Include the user who claimed the gig
      },
    });

    // Optionally, you might want to return the updated familyGig with claims
    const updatedFamilyGig = await prisma.familyGig.findUnique({
      where: { id: familyGig.id },
      include: {
        gigTemplate: true,
        familyRoom: true,
        claims: {
          include: {
            user: true, // Include the user for each claim
          },
        },
      },
    });

    res.status(200).json(updatedFamilyGig);
  } catch (error) {
    console.error('--- ERROR in claimGig ---', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const completeGig = async (req: Request & { userId?: string }, res: Response) => {
  const { gigId } = req.params;
  const userId = req.userId;

  if (!userId) {
    return res.status(401).json({ message: 'Unauthorized' });
  }

  try {
    const today = new Date();
    const periodKey = `${today.getFullYear()}-${today.getMonth() + 1}-${today.getDate()}`;

    const updatedFamilyGig = await prisma.$transaction(async (tx) => {
      const existingClaim = await tx.claim.findFirst({
        where: {
          familyGigId: parseInt(gigId),
          userId: userId,
          periodKey: periodKey,
          status: 'claimed',
        },
      });

      if (!existingClaim) {
        throw Object.assign(new Error('Claim not found or not in claimed status.'), { statusCode: 404 });
      }

      const updatedClaim = await tx.claim.update({
        where: { id: existingClaim.id },
        data: {
          status: 'completed',
        },
      });

      if (!updatedClaim.rewardLedgerId) {
        const familyGig = await tx.familyGig.findUnique({
          where: { id: parseInt(gigId) },
          include: {
            gigTemplate: true,
          },
        });

        if (!familyGig) {
          throw new Error('Family gig not found');
        }

        const rewardCents = familyGig.overrideCurrencyCents ?? 0;

        if (rewardCents > 0) {
          const ledger = await transferFromFamilyToUserTx(
            {
              familyId: familyGig.familyId,
              userId,
              amountCents: rewardCents,
              description: `Gig reward: ${familyGig.gigTemplate?.name ?? 'Gig'}`,
              referenceType: 'gig_claim',
              referenceId: updatedClaim.id.toString(),
              type: WalletLedgerType.GIG_REWARD,
              initiatedByUserId: userId,
            },
            tx
          );

          await tx.claim.update({
            where: { id: updatedClaim.id },
            data: { rewardLedgerId: ledger.id },
          });
        }
      }

      const familyGigWithRelations = await tx.familyGig.findUnique({
        where: { id: parseInt(gigId) },
        include: {
          gigTemplate: true,
          familyRoom: true,
          claims: {
            include: {
              user: true,
            },
          },
        },
      });

      if (!familyGigWithRelations) {
        throw new Error('Family gig not found after update');
      }

      return familyGigWithRelations;
    });

    res.status(200).json(updatedFamilyGig);
  } catch (error) {
    console.error('--- ERROR in completeGig ---', error);
    if ((error as any)?.statusCode) {
      return res.status((error as any).statusCode).json({ error: (error as Error).message });
    }
    if (error instanceof Error && error.message.includes('Insufficient balance')) {
      return res.status(409).json({ error: error.message });
    }
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const createGigsFromTemplates = async (
  req: Request,
  res?: Response,
  tx?: Prisma.TransactionClient
) => {
  const { familyId, roomIds } = req.body as { familyId?: number; roomIds?: number[] };

  if (!familyId || !roomIds || !Array.isArray(roomIds) || roomIds.length === 0) {
    if (res) {
      return res.status(400).json({ error: 'familyId and roomIds (array) are required.' });
    }
    throw new Error('familyId and roomIds (array) are required.');
  }

  try {
    const createdGigs: any[] = [];
    const client = tx ?? prisma;

    if (shouldLogGigCreation && tx) {
      console.log('[onboarding-commit] Creating gigs from templates within transaction', {
        familyId,
        roomIds,
      });
    }

    const allGigTemplates = await client.gigTemplate.findMany();

    for (const roomId of roomIds) {
      const room = await client.familyRoom.findUnique({
        where: { id: roomId },
        include: {
          roomTemplate: true,
        },
      });

      if (room && room.roomTemplate && room.roomTemplate.tags) {
        const roomTags = room.roomTemplate.tags.split(',');
        const applicableGigs = allGigTemplates.filter(gig => 
          gig.applicableTags && gig.applicableTags.split(',').some(tag => roomTags.includes(tag))
        );

        for (const gigTemplate of applicableGigs) {
          const newFamilyGig = await client.familyGig.create({
            data: {
              familyId,
              gigTemplateId: gigTemplate.id,
              familyRoomId: room.id,
              cadenceType: 'weekly', // Default cadence, can be customized
              visible: true,
            },
          });
          createdGigs.push(newFamilyGig);
        }
      }
    }

    if (shouldLogGigCreation) {
      console.log('[onboarding-commit] Gig creation result', {
        createdGigCount: createdGigs.length,
      });
    }

    if (res) {
      return res.status(201).json({ message: 'Gigs created from templates successfully.', createdGigs });
    }
    return { message: 'Gigs created from templates successfully.', createdGigs };
  } catch (error) {
    console.error('Error creating gigs from templates:', error);
    if (res) {
      return res.status(500).json({ error: 'Failed to create gigs from templates.' });
    }
    throw error;
  }
};
