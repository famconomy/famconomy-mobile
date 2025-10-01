import { Request, Response } from 'express';
import { prisma } from '../db';
import { createGigsFromTemplates } from './gigController';

export const getRooms = async (req: Request & { userId?: string }, res: Response) => {
  const userId = req.userId;

  if (!userId) {
    return res.status(401).json({ message: 'Unauthorized' });
  }

  const rawFamilyId = req.query.familyId;
  let requestedFamilyId: number | undefined;
  if (rawFamilyId !== undefined) {
    const candidate = Array.isArray(rawFamilyId) ? rawFamilyId[0] : rawFamilyId;
    const parsed = Number(candidate);
    if (!Number.isInteger(parsed)) {
      return res.status(400).json({ message: 'familyId must be an integer.' });
    }
    requestedFamilyId = parsed;
  }

  try {
    const familyUser = await prisma.familyUsers.findFirst({
      where: {
        UserID: userId,
        ...(requestedFamilyId !== undefined ? { FamilyID: requestedFamilyId } : {}),
      },
    });

    if (!familyUser) {
      if (requestedFamilyId !== undefined) {
        return res.status(403).json({ message: 'User is not a member of the requested family.' });
      }
      return res.status(404).json({ message: 'Family not found for this user.' });
    }

    const effectiveFamilyId = requestedFamilyId ?? familyUser.FamilyID;

    const query = {
      where: {
        familyId: effectiveFamilyId,
      },
    };
    console.log('--- DEBUG: Prisma query for rooms ---', JSON.stringify(query, null, 2));

    let rooms = await prisma.familyRoom.findMany({
      ...query,
      include: {
        roomTemplate: true,
      },
    });

    if (!rooms.length) {
      const roomTemplates = await prisma.roomTemplate.findMany();
      if (roomTemplates.length) {
        console.log('--- INFO: Seeding default rooms for family ---', effectiveFamilyId);
        const createdRooms = await prisma.$transaction(
          roomTemplates.map((template) =>
            prisma.familyRoom.create({
              data: {
                familyId: effectiveFamilyId,
                name: template.name,
                roomTemplateId: template.id,
              },
              select: { id: true },
            })
          )
        );

        const createdRoomIds = createdRooms.map((room) => room.id);

        rooms = await prisma.familyRoom.findMany({
          ...query,
          include: {
            roomTemplate: true,
          },
        });

        if (createdRoomIds.length) {
          try {
            await createGigsFromTemplates({
              body: { familyId: effectiveFamilyId, roomIds: createdRoomIds },
            } as Request);
          } catch (seedError) {
            console.log('--- WARN: Failed to seed gigs for default rooms ---', seedError);
          }
        }
      }
    }

    res.json(rooms);
  } catch (error) {
    console.log('--- ERROR in getRooms ---', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const createRoom = async (req: Request & { userId?: string }, res: Response) => {
  const userId = req.userId;
  const { familyId, name, roomTemplateId } = req.body;

  if (!userId) {
    return res.status(401).json({ message: 'Unauthorized' });
  }

  try {
    const familyUser = await prisma.familyUsers.findFirst({
      where: { UserID: userId, FamilyID: familyId },
    });

    if (!familyUser) {
      return res.status(404).json({ message: 'Family not found for this user.' });
    }

    let templateId = roomTemplateId;
    if (!templateId) {
      const firstTemplate = await prisma.roomTemplate.findFirst({ orderBy: { id: 'asc' } });
      templateId = firstTemplate?.id;
    }

    if (!templateId) {
      return res.status(400).json({ message: 'No room templates are configured.' });
    }

    const newRoom = await prisma.familyRoom.create({
      data: {
        family: {
          connect: { FamilyID: familyUser.FamilyID },
        },
        name,
        roomTemplate: {
          connect: { id: templateId },
        },
      },
      include: {
        roomTemplate: true,
      },
    });

    res.status(201).json(newRoom);
  } catch (error) {
    console.log('--- ERROR in createRoom ---', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const deleteRoom = async (req: Request & { userId?: string }, res: Response) => {
  const userId = req.userId;
  const { roomId } = req.params;

  if (!userId) {
    return res.status(401).json({ message: 'Unauthorized' });
  }

  try {
    const roomIdentifier = Number(roomId);
    if (Number.isNaN(roomIdentifier)) {
      return res.status(400).json({ message: 'Invalid room id' });
    }

    const room = await prisma.familyRoom.findUnique({
      where: { id: roomIdentifier },
    });

    if (!room) {
      return res.status(404).json({ message: 'Room not found.' });
    }

    const familyUser = await prisma.familyUsers.findFirst({
      where: { UserID: userId, FamilyID: room.familyId },
    });

    if (!familyUser) {
      return res.status(403).json({ message: 'You do not have permission to modify this room.' });
    }

    await prisma.familyGig.deleteMany({ where: { familyRoomId: room.id } });
    await prisma.familyRoom.delete({ where: { id: room.id } });

    res.status(204).send();
  } catch (error) {
    console.log('--- ERROR in deleteRoom ---', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const resetRooms = async (req: Request & { userId?: string }, res: Response) => {
  const userId = req.userId;
  const { familyId } = req.body;

  if (!userId) {
    return res.status(401).json({ message: 'Unauthorized' });
  }

  try {
    const targetFamilyId = familyId !== undefined ? Number(familyId) : undefined;
    if (targetFamilyId !== undefined && Number.isNaN(targetFamilyId)) {
      return res.status(400).json({ message: 'Invalid family id' });
    }

    const familyUser = await prisma.familyUsers.findFirst({
      where: {
        UserID: userId,
        ...(targetFamilyId !== undefined ? { FamilyID: targetFamilyId } : {}),
      },
    });

    if (!familyUser) {
      return res.status(404).json({ message: 'Family not found for this user.' });
    }

    await prisma.familyGig.deleteMany({ where: { familyId: familyUser.FamilyID } });
    await prisma.familyRoom.deleteMany({ where: { familyId: familyUser.FamilyID } });

    res.status(204).send();
  } catch (error) {
    console.log('--- ERROR in resetRooms ---', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};
