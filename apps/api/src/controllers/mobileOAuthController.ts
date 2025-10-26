import { Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import { prisma } from '../db';
import { OAuth2Client } from 'google-auth-library';
import axios from 'axios';

const JWT_SECRET = process.env.JWT_SECRET || 'changeme';
const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID || '';

// Helper to generate JWT token
const generateToken = (userId: string) => {
  return jwt.sign({ id: userId }, JWT_SECRET, { expiresIn: '7d' });
};

// Helper to find or create user by email
const findOrCreateUserByEmail = async (email: string, displayName?: string) => {
  let user = await prisma.users.findUnique({
    where: { Email: email },
  });

  if (!user) {
    const names = displayName?.split(' ') || ['', ''];
    user = await prisma.users.create({
      data: {
        Email: email,
        FirstName: names[0] || '',
        LastName: names[1] || '',
        ProfilePhotoUrl: '',
      },
    });
  }

  return user;
};

/**
 * Google OAuth Mobile Handler
 * Receives idToken and accessToken from mobile app
 * Verifies token and logs in user
 */
export const googleOAuthMobile = async (req: Request, res: Response): Promise<void> => {
  try {
    const { idToken, accessToken } = req.body;

    if (!idToken && !accessToken) {
      res.status(400).json({ message: 'Missing idToken or accessToken' });
      return;
    }

    // Verify Google ID token
    const client = new OAuth2Client(GOOGLE_CLIENT_ID);
    const ticket = await client.verifyIdToken({
      idToken: idToken || '',
      audience: GOOGLE_CLIENT_ID,
    });

    const payload = ticket.getPayload();
    if (!payload) {
      res.status(400).json({ message: 'Invalid token' });
      return;
    }

    const email = payload.email || '';
    const displayName = payload.name || '';

    const user = await findOrCreateUserByEmail(email, displayName);

    const token = generateToken(user.UserID);

    res.cookie('fam_token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });

    res.json({
      id: user.UserID,
      email: user.Email,
      full_name: `${user.FirstName} ${user.LastName}`.trim(),
      avatar: user.ProfilePhotoUrl,
      role: 'none', // Default role for new users
      status: 'active',
      token,
    });
  } catch (error: any) {
    console.error('Google OAuth Mobile error:', error);
    res.status(400).json({ message: 'Google authentication failed', error: error.message });
  }
};

/**
 * Apple OAuth Mobile Handler
 * Receives uid and email from Firebase auth
 */
export const appleOAuthMobile = async (req: Request, res: Response): Promise<void> => {
  try {
    const { email, displayName } = req.body;

    if (!email) {
      res.status(400).json({ message: 'Email is required' });
      return;
    }

    const user = await findOrCreateUserByEmail(email, displayName);
    const token = generateToken(user.UserID);

    res.cookie('fam_token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });

    res.json({
      id: user.UserID,
      email: user.Email,
      full_name: `${user.FirstName} ${user.LastName}`.trim(),
      avatar: user.ProfilePhotoUrl,
      role: 'none',
      status: 'active',
      token,
    });
  } catch (error: any) {
    console.error('Apple OAuth Mobile error:', error);
    res.status(400).json({ message: 'Apple authentication failed', error: error.message });
  }
};

/**
 * Microsoft OAuth Mobile Handler
 * Receives idToken and accessToken from MSAL
 */
export const microsoftOAuthMobile = async (req: Request, res: Response): Promise<void> => {
  try {
    const { idToken, accessToken } = req.body;

    if (!idToken && !accessToken) {
      res.status(400).json({ message: 'Missing idToken or accessToken' });
      return;
    }

    // Use accessToken to get user info from Microsoft Graph
    let email = '';
    let displayName = '';

    if (accessToken) {
      try {
        const response = await axios.get('https://graph.microsoft.com/v1.0/me', {
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        });
        email = response.data.mail || response.data.userPrincipalName || '';
        displayName = response.data.displayName || '';
      } catch (error) {
        console.error('Failed to fetch Microsoft user info:', error);
      }
    }

    if (!email) {
      res.status(400).json({ message: 'Could not retrieve email from Microsoft' });
      return;
    }

    const user = await findOrCreateUserByEmail(email, displayName);
    const token = generateToken(user.UserID);

    res.cookie('fam_token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });

    res.json({
      id: user.UserID,
      email: user.Email,
      full_name: `${user.FirstName} ${user.LastName}`.trim(),
      avatar: user.ProfilePhotoUrl,
      role: 'none',
      status: 'active',
      token,
    });
  } catch (error: any) {
    console.error('Microsoft OAuth Mobile error:', error);
    res.status(400).json({ message: 'Microsoft authentication failed', error: error.message });
  }
};

/**
 * Facebook OAuth Mobile Handler
 * Receives accessToken from native auth
 */
export const facebookOAuthMobile = async (req: Request, res: Response): Promise<void> => {
  try {
    const { accessToken } = req.body;

    if (!accessToken) {
      res.status(400).json({ message: 'Missing accessToken' });
      return;
    }

    // Use accessToken to get user info from Facebook Graph API
    try {
      const response = await axios.get('https://graph.facebook.com/v18.0/me', {
        params: {
          access_token: accessToken,
          fields: 'id,email,name,picture',
        },
      });

      const email = response.data.email || '';
      const displayName = response.data.name || '';

      if (!email) {
        res.status(400).json({ message: 'Could not retrieve email from Facebook' });
        return;
      }

      const user = await findOrCreateUserByEmail(email, displayName);
      const token = generateToken(user.UserID);

      res.cookie('fam_token', token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        path: '/',
        maxAge: 7 * 24 * 60 * 60 * 1000,
      });

      res.json({
        id: user.UserID,
        email: user.Email,
        full_name: `${user.FirstName} ${user.LastName}`.trim(),
        avatar: user.ProfilePhotoUrl,
        role: 'none',
        status: 'active',
        token,
      });
    } catch (error) {
      console.error('Failed to fetch Facebook user info:', error);
      res.status(400).json({ message: 'Could not verify Facebook token' });
    }
  } catch (error: any) {
    console.error('Facebook OAuth Mobile error:', error);
    res.status(400).json({ message: 'Facebook authentication failed', error: error.message });
  }
};
