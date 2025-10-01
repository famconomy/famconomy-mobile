import { Request, Response } from 'express';
import { Prisma } from '@prisma/client';
import { prisma } from '../db';
import { upload } from '../middleware/upload';

const PLACEHOLDER_EMAIL_DOMAIN = 'deleted.local';

const generatePlaceholderEmail = (userId: string) => {
  const compactId = userId.replace(/[^a-z0-9]/gi, '').slice(0, 8).toLowerCase() || 'user';
  const token = Math.random().toString(36).slice(2, 6);
  let email = `deleted-${compactId}-${token}@${PLACEHOLDER_EMAIL_DOMAIN}`;
  if (email.length > 50) {
    const overflow = email.length - 50;
    const trimmedId = compactId.slice(0, Math.max(1, compactId.length - overflow));
    email = `deleted-${trimmedId}-${token}@${PLACEHOLDER_EMAIL_DOMAIN}`;
  }
  return email;
};

const sanitizeUserRecord = async (tx: Prisma.TransactionClient, userId: string) => {
  await tx.users.update({
    where: { UserID: userId },
    data: {
      FirstName: 'Deleted',
      LastName: 'User',
      Email: generatePlaceholderEmail(userId),
      PasswordHash: '',
      ProfilePhotoUrl: null,
      BirthDate: null,
      PhoneNumber: null,
      googleAccessToken: null,
      googleRefreshToken: null,
      facebookAccessToken: null,
      facebookRefreshToken: null,
      appleAccessToken: null,
      appleRefreshToken: null,
      microsoftAccessToken: null,
      microsoftRefreshToken: null,
      plaidItemId: null,
      IsDeleted: true,
      UpdatedDate: new Date(),
    },
  });
};

const deleteFamilyGraph = async (tx: Prisma.TransactionClient, familyId: number) => {
  await tx.claim.deleteMany({ where: { familyGig: { familyId } } });
  await tx.rewardLedger.deleteMany({ where: { familyGig: { familyId } } });
  await tx.familyGig.deleteMany({ where: { familyId } });
  await tx.familyRoom.deleteMany({ where: { familyId } });

  await tx.mealPlanEntry.deleteMany({ where: { MealPlanWeek: { FamilyID: familyId } } });
  await tx.mealPlanWeek.deleteMany({ where: { FamilyID: familyId } });
  await tx.mealIngredient.deleteMany({ where: { Meal: { FamilyID: familyId } } });
  await tx.mealTag.deleteMany({ where: { Meal: { FamilyID: familyId } } });
  await tx.meal.deleteMany({ where: { FamilyID: familyId } });

  await tx.taskAttachment.deleteMany({ where: { Task: { FamilyID: familyId } } });
  await tx.task.deleteMany({ where: { FamilyID: familyId } });

  await tx.journalComment.deleteMany({ where: { JournalEntry: { FamilyID: familyId } } });
  await tx.journalTag.deleteMany({ where: { JournalEntry: { FamilyID: familyId } } });
  await tx.journalEntry.deleteMany({ where: { FamilyID: familyId } });

  await tx.message.deleteMany({ where: { FamilyID: familyId } });

  await tx.photo.deleteMany({ where: { PhotoAlbum: { FamilyID: familyId } } });
  await tx.photoAlbum.deleteMany({ where: { FamilyID: familyId } });

  await tx.transaction.deleteMany({ where: { Budget: { FamilyID: familyId } } });
  await tx.transaction.deleteMany({ where: { TransactionCategory: { FamilyID: familyId } } });
  await tx.budget.deleteMany({ where: { FamilyID: familyId } });
  await tx.transactionCategory.deleteMany({ where: { FamilyID: familyId } });

  await tx.calendarEvents.deleteMany({ where: { FamilyID: familyId } });
  await tx.familyRule.deleteMany({ where: { FamilyID: familyId } });
  await tx.modulePermission.deleteMany({ where: { FamilyID: familyId } });
  await tx.savingsGoal.deleteMany({ where: { FamilyID: familyId } });
  await tx.shoppingItem.deleteMany({ where: { ShoppingList: { FamilyID: familyId } } });
  await tx.shoppingList.deleteMany({ where: { FamilyID: familyId } });
  await tx.invitation.deleteMany({ where: { FamilyID: familyId } });

  await tx.linZMemory.deleteMany({ where: { familyId } });
  await tx.linZFacts.deleteMany({ where: { familyId } });
  await tx.linZConversation.deleteMany({ where: { familyId } });
  await tx.conversationSummary.deleteMany({ where: { familyId } });
  await tx.auditLog.deleteMany({ where: { familyId } });
  await tx.familySetting.deleteMany({ where: { familyId } });
  await tx.plaidAccount.deleteMany({ where: { item: { familyId } } });
  await tx.plaidItem.deleteMany({ where: { familyId } });

  await tx.familyUsers.deleteMany({ where: { FamilyID: familyId } });
  await tx.family.delete({ where: { FamilyID: familyId } });
};

// Get all users
export const getUsers = async (req: Request, res: Response) => {
  try {
    const users = await prisma.users.findMany({
        where: { IsDeleted: false }
    });
    res.json(users);
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Get user by ID
export const getUserById = async (req: Request, res: Response) => {
  const { id } = req.params;
  try {
    const user = await prisma.users.findUnique({
      where: { UserID: id },
    });
    if (!user || user.IsDeleted) {
      return res.status(404).json({ error: 'User not found' });
    }
    res.json(user);
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Update user
export const updateUser = async (req: Request, res: Response) => {
  console.log('updateUser req.body:', req.body);
  const { id } = req.params;
  const { FirstName, LastName, Email, ProfilePhotoUrl, BirthDate, PhoneNumber, RelationshipID } = req.body;
  try {
    const updatedUser = await prisma.users.update({
      where: { UserID: id },
      data: {
        FirstName,
        LastName,
        Email,
        ProfilePhotoUrl,
        BirthDate,
        PhoneNumber,
        UpdatedDate: new Date(),
      },
    });

    if (RelationshipID) {
      const familyUser = await prisma.familyUsers.findFirst({
        where: { UserID: id },
      });

      if (familyUser) {
        await prisma.familyUsers.update({
          where: { FamilyUserID: familyUser.FamilyUserID },
          data: { RelationshipID: RelationshipID },
        });
      }
    }

    res.json(updatedUser);
  } catch (error: any) {
    console.error('Error during Prisma update:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Delete user
export const deleteUser = async (req: Request & { userId?: string }, res: Response) => {
  const { id } = req.params;

  if (!req.userId || req.userId !== id) {
    return res.status(403).json({ error: 'Not authorized to delete this account.' });
  }

  try {
    await prisma.$transaction(async tx => {
      const memberships = await tx.familyUsers.findMany({
        where: { UserID: id },
        select: { FamilyID: true },
      });

      const familyStates = await Promise.all(
        memberships.map(async membership => {
          const otherMembers = await tx.familyUsers.count({
            where: { FamilyID: membership.FamilyID, UserID: { not: id } },
          });
          return { familyId: membership.FamilyID, otherMembers };
        })
      );

      const familiesToDelete = familyStates.filter(f => f.otherMembers === 0).map(f => f.familyId);
      const familiesToKeep = familyStates.filter(f => f.otherMembers > 0).map(f => f.familyId);

      for (const familyId of familiesToDelete) {
        await deleteFamilyGraph(tx, familyId);
      }

      // Reassign ownership for any remaining families that reference this user
      const familiesOwnedByUser = await tx.family.findMany({
        where: { CreatedByUserID: id },
        select: { FamilyID: true },
      });

      for (const family of familiesOwnedByUser) {
        if (familiesToDelete.includes(family.FamilyID)) {
          continue;
        }

        const replacementOwner = await tx.familyUsers.findFirst({
          where: { FamilyID: family.FamilyID, UserID: { not: id } },
          select: { UserID: true },
        });

        if (replacementOwner) {
          await tx.family.update({
            where: { FamilyID: family.FamilyID },
            data: { CreatedByUserID: replacementOwner.UserID },
          });
        } else {
          await deleteFamilyGraph(tx, family.FamilyID);
        }
      }

      if (familiesToKeep.length) {
        await tx.familyUsers.deleteMany({ where: { UserID: id, FamilyID: { in: familiesToKeep } } });
        await tx.task.updateMany({
          where: { FamilyID: { in: familiesToKeep }, AssignedToUserID: id },
          data: { AssignedToUserID: null },
        });

        const placeholderUserIds = await tx.users.findMany({
          where: {
            Email: { endsWith: `@${PLACEHOLDER_EMAIL_DOMAIN}` },
            FamilyUsers: {
              some: {
                FamilyID: { in: familiesToKeep },
              },
            },
          },
          select: { UserID: true },
        }).then(list => list.map(u => u.UserID));

        if (placeholderUserIds.length) {
          await tx.familyUsers.deleteMany({
            where: {
              FamilyID: { in: familiesToKeep },
              UserID: { in: placeholderUserIds },
            },
          });

          await tx.users.deleteMany({ where: { UserID: { in: placeholderUserIds } } });
        }
      } else {
        await tx.familyUsers.deleteMany({ where: { UserID: id } });
      }

      await tx.pushSubscription.deleteMany({ where: { UserID: id } });
      await tx.linZMemory.deleteMany({ where: { userId: id } });
      await tx.linZFacts.deleteMany({ where: { userId: id } });
      await tx.linZConversation.deleteMany({ where: { userId: id } });
      await tx.conversationSummary.deleteMany({ where: { userId: id } });
      await tx.notification.deleteMany({ where: { UserID: id } });

      const shouldDeleteUserCompletely = familiesToKeep.length === 0;

      if (shouldDeleteUserCompletely) {
        await tx.claim.deleteMany({ where: { userId: id } });
        await tx.rewardLedger.deleteMany({ where: { userId: id } });
        await tx.shoppingItem.deleteMany({ where: { AddedByUserID: id } });
        await tx.shoppingList.deleteMany({ where: { CreatedByUserID: id } });
        await tx.savingsGoal.deleteMany({ where: { CreatedByUserID: id } });
        await tx.mealPlanEntry.deleteMany({ where: { AddedByUserID: id } });
        await tx.meal.deleteMany({ where: { CreatedByUserID: id } });
        await tx.taskAttachment.deleteMany({ where: { Task: { CreatedByUserID: id } } });
        await tx.task.deleteMany({
          where: {
            OR: [
              { CreatedByUserID: id },
              { AssignedToUserID: id },
              { SuggestedByChildID: id },
              { ApprovedByUserID: id },
            ],
          },
        });
        await tx.transaction.deleteMany({ where: { CreatedByUserID: id } });
        await tx.budget.deleteMany({ where: { CreatedByUserID: id } });
        await tx.calendarEvents.deleteMany({
          where: {
            OR: [
              { CreatedByUserID: id },
              { ApprovedByUserID: id },
            ],
          },
        });
        await tx.familyRule.deleteMany({ where: { CreatedByUserID: id } });
        await tx.photo.deleteMany({ where: { UploadedByUserID: id } });
        await tx.photoAlbum.deleteMany({ where: { CreatedByUserID: id } });
        await tx.journalComment.deleteMany({ where: { CreatedByUserID: id } });
        await tx.journalEntry.deleteMany({ where: { CreatedByUserID: id } });
        await tx.invitation.deleteMany({ where: { InvitedBy: id } });
        await tx.modulePermission.deleteMany({ where: { UserID: id } });
        await tx.userPermission.deleteMany({ where: { UserID: id } });
        await tx.userRole.deleteMany({ where: { UserID: id } });
        await tx.message.deleteMany({ where: { SenderID: id } });
        await tx.auditLog.deleteMany({ where: { userId: id } });
        await tx.users.delete({ where: { UserID: id } });
      } else {
        await sanitizeUserRecord(tx, id);
      }
    });

    res.clearCookie('fam_token');
    return res.status(200).json({ success: true });
  } catch (error) {
    console.error('Error deleting user:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
};

// Upload profile photo
export const uploadProfilePhoto = async (req: Request, res: Response) => {
  const { id } = req.params;
  const file = req.file;

  if (!file) {
    return res.status(400).json({ error: 'No file uploaded.' });
  }

  try {
    const updatedUser = await prisma.users.update({
      where: { UserID: id },
      data: { ProfilePhotoUrl: `/uploads/${file.filename}` },
    });
    res.json(updatedUser);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const createUser = async (req: Request, res: Response) => {
  const { FirstName, LastName, Email, PasswordHash, ProfilePhotoUrl, BirthDate, PhoneNumber } = req.body;
  try {
    const newUser = await prisma.users.create({
      data: {
        FirstName,
        LastName,
        Email: Email || null, // Email can be null for non-email users
        PasswordHash: PasswordHash || '', // Provide a default or handle securely
        ProfilePhotoUrl,
        BirthDate,
        PhoneNumber,
      },
    });
    res.status(201).json(newUser);
  } catch (error) {
    console.error('Error creating user:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};
