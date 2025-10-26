import { Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import { prisma } from '../db';
import { sendEmail } from '../utils/emailService';
import { getAppBaseUrl } from '../utils/urlConfig';
import type { Users } from '@prisma/client';
const JWT_SECRET = process.env.JWT_SECRET || 'changeme';

let passwordResetTableEnsured = false;

const normalizeRoleName = (role?: string | null): 'parent' | 'guardian' | 'child' | 'admin' | 'none' => {
  if (!role) {
    return 'none';
  }
  const value = role.trim().toLowerCase();
  if (value.includes('child')) return 'child';
  if (value.includes('guardian')) return 'guardian';
  if (value.includes('admin')) return 'admin';
  if (value.includes('parent')) return 'parent';
  return 'none';
};

const mapUserForResponse = async (user: Users) => {
  const roleRecord = await prisma.userRole.findFirst({
    where: { UserID: user.UserID },
    include: { Role: true },
  });

  const firstName = user.FirstName?.trim() || '';
  const lastName = user.LastName?.trim() || '';
  const fullName = `${firstName} ${lastName}`.trim();

  return {
    id: user.UserID,
    email: user.Email,
    firstName: firstName || undefined,
    lastName: lastName || undefined,
    full_name: fullName || undefined,
    avatar: user.ProfilePhotoUrl || undefined,
    profilePhotoUrl: user.ProfilePhotoUrl || undefined,
    role: normalizeRoleName(roleRecord?.Role?.RoleName),
    status: user.IsDeleted ? 'inactive' : 'active',
    created_at: user.CreatedDate,
    updated_at: user.UpdatedDate,
  };
};

const ensurePasswordResetTable = async () => {
  if (passwordResetTableEnsured) {
    return;
  }

  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS PasswordResetTokens (
      id INT AUTO_INCREMENT PRIMARY KEY,
      userId VARCHAR(36) NOT NULL,
      tokenHash VARCHAR(255) NOT NULL,
      expiresAt DATETIME NOT NULL,
      createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
      INDEX idx_user_expires (userId, expiresAt),
      CONSTRAINT fk_password_reset_user FOREIGN KEY (userId) REFERENCES Users(UserID) ON DELETE CASCADE
    ) ENGINE=InnoDB;
  `);

  passwordResetTableEnsured = true;
};

export const registerUser = async (req: Request, res: Response) => {
  console.log('registerUser: Received request with body:', req.body);
  const { email, password, firstName, lastName } = req.body;
  try {
    const existingUser = await prisma.users.findUnique({ where: { Email: email } });
    if (existingUser) {
      console.log('registerUser: User already exists.');
      return res.status(400).json({ message: 'User already exists' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const user = await prisma.users.create({
      data: {
        Email: email,
        PasswordHash: hashedPassword,
        FirstName: firstName,
        LastName: lastName,
        ProfilePhotoUrl: '',
      },
    });

    // Check if there is an invitation in the session
    if ((req.session as any).invitation) {
      const { familyId } = (req.session as any).invitation;
      console.log(`registerUser: Adding user to family ${familyId}`);
      await prisma.familyUsers.create({
        data: {
          UserID: user.UserID,
          FamilyID: familyId,
          RelationshipID: 1, // You may need to adjust this value
        },
      });
      // Clear the invitation from the session
      (req.session as any).invitation = null;
    }

    const token = jwt.sign({ id: user.UserID }, JWT_SECRET, { expiresIn: '7d' });
    res.cookie('fam_token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
    });
    const mappedUser = await mapUserForResponse(user);
    res.json({ user: mappedUser });
  } catch (err: any) {
    console.error('registerUser: Registration failed.', err);
    res.status(500).json({ message: 'Registration failed', error: err });
  }
};

export const loginUser = async (req: Request, res: Response) => {
  console.log('loginUser: Received request with body:', req.body);
  const { email, password } = req.body;
  try {
    const user = await prisma.users.findUnique({ where: { Email: email } });
    if (!user) return res.status(401).json({ message: 'Invalid credentials' });

    const valid = await bcrypt.compare(password, user.PasswordHash || '');
    if (!valid) return res.status(401).json({ message: 'Invalid credentials' });

    const token = jwt.sign({ id: user.UserID }, JWT_SECRET, { expiresIn: '7d' });
    res.cookie('fam_token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
    });
    const mappedUser = await mapUserForResponse(user);
    res.json({ user: mappedUser });
  } catch (err: any) {
    console.error('loginUser: Login failed.', err);
    res.status(500).json({ message: 'Login failed', error: err });
  }
};

export const getCurrentUser = async (req: Request & { userId?: string }, res: Response) => {
  try {
    const userId = req.userId;
    const user = await prisma.users.findUnique({ where: { UserID: userId } });
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    const mappedUser = await mapUserForResponse(user);
    res.json(mappedUser);
  } catch (err: any) {
    res.status(500).json({ message: 'Failed to fetch user', error: err });
  }
};

export const checkEmail = async (req: Request, res: Response) => {
  const { email } = req.query;
  if (!email) {
    return res.status(400).json({ message: 'Email is required' });
  }
  try {
    const user = await prisma.users.findUnique({ where: { Email: email as string } });
    res.json({ exists: !!user });
  } catch (err: any) {
    res.status(500).json({ message: 'Failed to check email', error: err });
  }
};

export const getVapidPublicKey = async (req: Request, res: Response) => {
  try {
    const publicKey = process.env.VAPID_PUBLIC_KEY;
    console.log('VAPID_PUBLIC_KEY from env:', publicKey); // Add this line for debugging
    if (!publicKey) {
      return res.status(500).json({ error: 'VAPID public key not configured.' });
    }
    res.status(200).json({ publicKey });
  } catch (error: any) {
    console.error('Error getting VAPID public key:', error);
    res.status(500).json({ error: error.message || 'Internal server error' });
  }
};

export const requestPasswordReset = async (req: Request, res: Response) => {
  const { email } = req.body;

  if (!email || typeof email !== 'string') {
    return res.status(400).json({ message: 'Email is required.' });
  }

  try {
    const user = await prisma.users.findUnique({ where: { Email: email } });

    if (!user) {
      // Respond with success to avoid leaking valid emails
      return res.json({ message: 'If an account exists for that email, we\'ve sent reset instructions.' });
    }

    await ensurePasswordResetTable();

    await prisma.$executeRaw`DELETE FROM PasswordResetTokens WHERE userId = ${user.UserID}`;

    const token = crypto.randomBytes(32).toString('hex');
    const tokenHash = await bcrypt.hash(token, 10);
    const expiresAt = new Date(Date.now() + 1000 * 60 * 60); // 1 hour

    await prisma.$executeRaw`INSERT INTO PasswordResetTokens (userId, tokenHash, expiresAt) VALUES (${user.UserID}, ${tokenHash}, ${expiresAt})`;

    const baseUrl = getAppBaseUrl().replace(/\/$/, '');
    const resetUrl = `${baseUrl}/reset-password?token=${token}&email=${encodeURIComponent(email)}`;

    const firstName = user.FirstName || 'there';

    await sendEmail({
      to: email,
      subject: 'Reset your FamConomy password',
      html: `
        <p>Hi ${firstName},</p>
        <p>We received a request to reset the password for your FamConomy account. Click the button below to set a new password:</p>
        <p style="text-align:center; margin: 24px 0;">
          <a href="${resetUrl}" style="display:inline-block; padding:12px 24px; background-color:#4F46E5; color:#ffffff; text-decoration:none; border-radius:8px;">Reset Password</a>
        </p>
        <p>If the button doesn\'t work, copy and paste this link into your browser:</p>
        <p style="word-break:break-all;">${resetUrl}</p>
        <p>This link will expire in one hour. If you didn\'t request a password reset, you can safely ignore this email.</p>
        <p>— The FamConomy Team</p>
      `,
    });

    return res.json({ message: 'If an account exists for that email, we\'ve sent reset instructions.' });
  } catch (err: any) {
    console.error('requestPasswordReset: Failed to create reset token.', err);
    return res.status(500).json({ message: 'Unable to process password reset request. Please try again later.' });
  }
};

export const resetPassword = async (req: Request, res: Response) => {
  const { token, email, password } = req.body as { token?: string; email?: string; password?: string };

  if (!token || !email || !password) {
    return res.status(400).json({ message: 'Token, email, and password are required.' });
  }

  if (password.length < 8) {
    return res.status(400).json({ message: 'Password must be at least 8 characters long.' });
  }

  try {
    const user = await prisma.users.findUnique({ where: { Email: email } });

    if (!user) {
      return res.status(400).json({ message: 'Invalid or expired reset link.' });
    }

    await ensurePasswordResetTable();

    const records = await prisma.$queryRaw<{ tokenHash: string; expiresAt: Date }[]>`
      SELECT tokenHash, expiresAt
      FROM PasswordResetTokens
      WHERE userId = ${user.UserID}
      ORDER BY createdAt DESC
    `;

    if (!records.length) {
      return res.status(400).json({ message: 'Invalid or expired reset link.' });
    }

    let validRecord: { tokenHash: string; expiresAt: Date } | null = null;
    for (const record of records) {
      const matches = await bcrypt.compare(token, record.tokenHash);
      if (matches) {
        validRecord = record;
        break;
      }
    }

    if (!validRecord) {
      return res.status(400).json({ message: 'Invalid or expired reset link.' });
    }

    if (new Date(validRecord.expiresAt).getTime() < Date.now()) {
      await prisma.$executeRaw`DELETE FROM PasswordResetTokens WHERE userId = ${user.UserID}`;
      return res.status(400).json({ message: 'This reset link has expired. Please request a new one.' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    await prisma.users.update({
      where: { UserID: user.UserID },
      data: { PasswordHash: hashedPassword },
    });

    await prisma.$executeRaw`DELETE FROM PasswordResetTokens WHERE userId = ${user.UserID}`;

    return res.json({ message: 'Password updated successfully.' });
  } catch (err: any) {
    console.error('resetPassword: Failed to reset password.', err);
    return res.status(500).json({ message: 'Unable to reset password. Please request a new link and try again.' });
  }
};
