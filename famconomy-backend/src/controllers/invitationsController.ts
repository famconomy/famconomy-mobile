import { Request, Response } from 'express';
import { prisma } from '../db';
import { sendEmail } from '../utils/emailService';
import { randomBytes } from 'crypto';
import fs from 'fs';
import path from 'path';

export const createInvitation = async (req: Request, res: Response) => {
  const { familyId, email, invitedBy, relationshipId } = req.body; // Change 'role' to 'relationshipId'

  try {
    let invitation;
    const existingInvitation = await prisma.invitation.findUnique({
      where: { Email: email },
    });

    const token = randomBytes(32).toString('hex');
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7); // Token expires in 7 days

    if (existingInvitation) {
      // Update existing invitation
      invitation = await prisma.invitation.update({
        where: { InvitationID: existingInvitation.InvitationID },
        data: {
          FamilyID: parseInt(familyId),
          Token: token,
          ExpiresAt: expiresAt,
          InvitedBy: invitedBy,
          RelationshipID: relationshipId, // Change 'Role' to 'RelationshipID'
        },
      });
    } else {
      // Create new invitation
      invitation = await prisma.invitation.create({
        data: {
          FamilyID: parseInt(familyId),
          Email: email,
          Token: token,
          ExpiresAt: expiresAt,
          InvitedBy: invitedBy,
          RelationshipID: relationshipId, // Change 'Role' to 'RelationshipID'
        },
      });
    }

    const invitationLink = `https://famconomy.com/app/join?token=${token}`;
    const logoPath = path.resolve('/home/wpbiggs/apps/famconomy/Logo.png');
    const logoAttachment = {
      filename: 'Logo.png',
      path: logoPath,
      cid: 'logo'
    }

    const emailHtml = `
      <div style="font-family: sans-serif; text-align: center; padding: 2rem;">
        <img src="cid:logo" alt="FamConomy Logo" style="width: 150px; margin-bottom: 1rem;" />
        <h2>You've been invited to join a family on FamConomy!</h2>
        <p>Click the button below to accept the invitation.</p>
        <a href="${invitationLink}" style="background-color: #4F46E5; color: white; padding: 0.75rem 1.5rem; text-decoration: none; border-radius: 0.5rem; display: inline-block;">Accept Invitation</a>
      </div>
    `;

    await sendEmail({
      to: email,
      subject: 'You have been invited to join a family on FamConomy!',
      html: emailHtml,
      attachments: [logoAttachment]
    });

    // Notify existing user
    const existingUser = await prisma.users.findUnique({
      where: { Email: email },
    });

    if (existingUser) {
      console.log(`createInvitation: Found existing user ${existingUser.Email}. Attempting to create notification.`);
      const family = await prisma.family.findUnique({
        where: { FamilyID: parseInt(familyId) },
      });

      if (family) {
        console.log(`createInvitation: Found family ${family.FamilyName}. Creating notification.`);
        await prisma.notification.create({
          data: {
            UserID: existingUser.UserID,
            Message: `You have been invited to join the ${family.FamilyName} family.`,
            IsRead: false,
            Type: 'invitation',
            Link: `/family?token=${invitation.Token}`,
          },
        });
        console.log(`createInvitation: Notification created for ${existingUser.Email}.`);
      } else {
        console.log(`createInvitation: Family with ID ${familyId} not found.`);
      }
    } else {
      console.log(`createInvitation: Existing user with email ${email} not found. Notification not created.`);
    }

    res.status(201).json(invitation);
  } catch (error) {
    console.error('Error creating invitation:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const acceptInvitation = async (req: Request & { userId?: string }, res: Response) => {
  const { token } = req.body;
  const userId = req.userId;

  try {
    const invitation = await prisma.invitation.findUnique({
      where: { Token: token },
    });

    if (!invitation || invitation.ExpiresAt < new Date()) {
      return res.status(400).json({ error: 'Invalid or expired invitation token.' });
    }

    if (userId) {
      // User is authenticated, add them to the family directly
      await prisma.familyUsers.create({
        data: {
          UserID: userId,
          FamilyID: invitation.FamilyID,
          RelationshipID: invitation.RelationshipID || 1, // Use RelationshipID from invitation, default to 1 (parent)
        },
      });

      // Delete the invitation
      await prisma.invitation.delete({ where: { InvitationID: invitation.InvitationID } });

      res.status(200).json({ message: 'Invitation accepted successfully.' });
    } else {
      // User is not authenticated, store invitation details in the session
      (req.session as any).invitation = {
        familyId: invitation.FamilyID,
        email: invitation.Email,
      };

      res.status(200).json({ message: 'Invitation accepted successfully.', email: invitation.Email });
    }
  } catch (error) {
    console.error('Error accepting invitation:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const getInvitationDetails = async (req: Request, res: Response) => {
  const { token } = req.query;

  try {
    const invitation = await prisma.invitation.findUnique({
      where: { Token: token as string },
    });

    if (!invitation || invitation.ExpiresAt < new Date()) {
      return res.status(400).json({ error: 'Invalid or expired invitation token.' });
    }

    const family = await prisma.family.findUnique({
      where: { FamilyID: invitation.FamilyID },
      select: { FamilyName: true },
    });

    const inviter = await prisma.users.findUnique({
      where: { UserID: invitation.InvitedBy },
      select: { FirstName: true, LastName: true },
    });

    res.status(200).json({
      email: invitation.Email,
      familyName: family?.FamilyName || 'Unknown Family',
      inviterName: inviter ? `${inviter.FirstName} ${inviter.LastName}` : 'Unknown Inviter',
    });
  } catch (error) {
    console.error('Error getting invitation details:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const getPendingInvitations = async (req: Request & { userId?: string }, res: Response) => {
  const userId = req.userId;

  if (!userId) {
    return res.status(401).json({ message: 'Unauthorized' });
  }

  try {
    const user = await prisma.users.findUnique({ where: { UserID: userId } });
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    const invitations = await prisma.invitation.findMany({
      where: { Email: user.Email },
      include: {
        Family: {
          select: {
            FamilyName: true,
          },
        },
      },
    });

    res.json(invitations);
  } catch (error) {
    console.error('Error getting pending invitations:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const declineInvitation = async (req: Request, res: Response) => {
  const { token } = req.body;

  try {
    const invitation = await prisma.invitation.findUnique({
      where: { Token: token },
    });

    if (!invitation) {
      return res.status(404).json({ error: 'Invitation not found.' });
    }

    await prisma.invitation.delete({ where: { InvitationID: invitation.InvitationID } });

    res.status(200).json({ message: 'Invitation declined successfully.' });
  } catch (error) {
    console.error('Error declining invitation:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};