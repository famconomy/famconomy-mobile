import { Request, Response } from 'express';
import { prisma } from '../db';
import axios from 'axios';
import * as instacartService from '../services/instacartService';

// Placeholder for Instacart's OAuth 2.0 credentials and URLs
const INSTACART_AUTHORIZATION_URL = 'https://www.instacart.com/oauth/authorize';
const INSTACART_TOKEN_URL = 'https://www.instacart.com/oauth/token';
const INSTACART_CLIENT_ID = process.env.INSTACART_CLIENT_ID;
const INSTACART_CLIENT_SECRET = process.env.INSTACART_CLIENT_SECRET;
// This must match the redirect URI registered with Instacart
const INSTACART_REDIRECT_URI = process.env.INSTACART_REDIRECT_URI;

// Shipt OAuth 2.0 credentials and URLs (placeholders)
const SHIPT_AUTHORIZATION_URL = 'https://api.shipt.com/oauth/authorize'; // Placeholder
const SHIPT_TOKEN_URL = 'https://api.shipt.com/oauth/token'; // Placeholder
const SHIPT_CLIENT_ID = process.env.SHIPT_CLIENT_ID;
const SHIPT_CLIENT_SECRET = process.env.SHIPT_CLIENT_SECRET;
const SHIPT_REDIRECT_URI = process.env.SHIPT_REDIRECT_URI;

// Kroger OAuth 2.0 credentials and URLs (placeholders)
const KROGER_AUTHORIZATION_URL = 'https://api.kroger.com/v1/connect/oauth2/authorize'; // Placeholder
const KROGER_TOKEN_URL = 'https://api.kroger.com/v1/connect/oauth2/token'; // Placeholder
const KROGER_CLIENT_ID = process.env.KROGER_CLIENT_ID;
const KROGER_CLIENT_SECRET = process.env.KROGER_CLIENT_SECRET;
const KROGER_REDIRECT_URI = process.env.KROGER_REDIRECT_URI;

/**
 * Step 1: Redirect the user to Instacart's authorization page.
 */
export const redirectToInstacart = async (req: Request, res: Response) => {
  const userId = (req as any).userId; // Assuming userId is available on the request from auth middleware

  if (!userId) {
    return res.status(401).json({ error: 'User not authenticated.' });
  }

  const state = userId; // Use userId as state to verify the callback

  const authUrl = new URL(INSTACART_AUTHORIZATION_URL);
  authUrl.searchParams.append('client_id', INSTACART_CLIENT_ID || '');
  authUrl.searchParams.append('redirect_uri', INSTACART_REDIRECT_URI || '');
  authUrl.searchParams.append('response_type', 'code');
  authUrl.searchParams.append('scope', 'shopping_cart.write'); // Example scope
  authUrl.searchParams.append('state', state);

  res.redirect(authUrl.toString());
};

/**
 * Step 2: Handle the callback from Instacart after user authorization.
 */
export const handleInstacartCallback = async (req: Request, res: Response) => {
  const { code, state } = req.query;
  const userId = (req as any).userId; // Cast to any to access userId, assuming it's on the request

  if (state !== userId) {
    return res.status(403).send('State mismatch. Possible CSRF attack.');
  }

  if (!code) {
    return res.status(400).send('Authorization code not provided.');
  }

  try {
    // Exchange authorization code for an access token
    const tokenResponse = await axios.post(INSTACART_TOKEN_URL, {
      grant_type: 'authorization_code',
      code: code as string,
      redirect_uri: INSTACART_REDIRECT_URI,
      client_id: INSTACART_CLIENT_ID,
      client_secret: INSTACART_CLIENT_SECRET,
    });

    const { access_token, refresh_token, expires_in } = tokenResponse.data;

    const expiresAt = new Date(Date.now() + expires_in * 1000);

    // Save the tokens to the database
    await prisma.integration.upsert({
      where: {
        provider_userId: {
          provider: 'INSTACART',
          userId: userId,
        },
      },
      update: {
        accessToken: access_token,
        refreshToken: refresh_token,
        expiresAt: expiresAt,
      },
      create: {
        provider: 'INSTACART',
        userId: userId,
        accessToken: access_token,
        refreshToken: refresh_token,
        expiresAt: expiresAt,
      },
    });

    // Redirect user back to the settings page with a success message
    res.redirect('/settings?integration=instacart_success');

  } catch (error) {
    console.error('Error exchanging Instacart authorization code:', error);
    res.status(500).send('Failed to connect to Instacart.');
  }
};

/**
 * Get the status of all integrations for the current user.
 */
export const getIntegrationStatus = async (req: Request, res: Response) => {
  const userId = (req as any).userId;

  try {
    const integrations = await prisma.integration.findMany({
      where: { userId: userId },
      select: {
        provider: true,
      },
    });

    const activeProviders = integrations.map(int => int.provider);
    res.json({ activeProviders });

  } catch (error) {
    console.error('Error fetching integration status:', error);
    res.status(500).json({ error: 'Failed to fetch integration status.' });
  }
};

/**
 * Disconnect a user's Instacart integration.
 */
export const disconnectInstacart = async (req: Request, res: Response) => {
  const userId = (req as any).userId;

  try {
    await prisma.integration.delete({
      where: {
        provider_userId: {
          provider: 'INSTACART',
          userId: userId,
        },
      },
    });

    res.status(200).json({ message: 'Successfully disconnected from Instacart.' });

  } catch (error) {
    console.error('Error disconnecting from Instacart:', error);
    res.status(500).json({ error: 'Failed to disconnect from Instacart.' });
  }
};

export const redirectToShipt = async (req: Request, res: Response) => {
  const userId = (req as any).userId;
  const state = userId;
  const authUrl = new URL(SHIPT_AUTHORIZATION_URL);
  authUrl.searchParams.append('client_id', SHIPT_CLIENT_ID || '');
  authUrl.searchParams.append('redirect_uri', SHIPT_REDIRECT_URI || '');
  authUrl.searchParams.append('response_type', 'code');
  authUrl.searchParams.append('scope', 'cart.write'); // Example scope
  authUrl.searchParams.append('state', state);
  res.redirect(authUrl.toString());
};

export const handleShiptCallback = async (req: Request, res: Response) => {
  const { code, state } = req.query;
  const userId = (req as any).userId;

  if (state !== userId) {
    return res.status(403).send('State mismatch.');
  }

  try {
    const tokenResponse = await axios.post(SHIPT_TOKEN_URL, {
      grant_type: 'authorization_code',
      code: code as string,
      redirect_uri: SHIPT_REDIRECT_URI,
      client_id: SHIPT_CLIENT_ID,
      client_secret: SHIPT_CLIENT_SECRET,
    });

    const { access_token, refresh_token, expires_in } = tokenResponse.data;
    const expiresAt = new Date(Date.now() + expires_in * 1000);

    await prisma.integration.upsert({
      where: { provider_userId: { provider: 'SHIPT', userId: userId } },
      update: { accessToken: access_token, refreshToken: refresh_token, expiresAt: expiresAt },
      create: { provider: 'SHIPT', userId: userId, accessToken: access_token, refreshToken: refresh_token, expiresAt: expiresAt },
    });

    res.redirect('/settings?integration=shipt_success');
  } catch (error) {
    console.error('Error exchanging Shipt authorization code:', error);
    res.status(500).send('Failed to connect to Shipt.');
  }
};

export const disconnectShipt = async (req: Request, res: Response) => {
  const userId = (req as any).userId;

  try {
    await prisma.integration.delete({
      where: {
        provider_userId: {
          provider: 'SHIPT',
          userId: userId,
        },
      },
    });

    res.status(200).json({ message: 'Successfully disconnected from Shipt.' });

  } catch (error) {
    console.error('Error disconnecting from Shipt:', error);
    res.status(500).json({ error: 'Failed to disconnect from Shipt.' });
  }
};

export const redirectToKroger = async (req: Request, res: Response) => {
  const userId = (req as any).userId;
  const state = userId;
  const authUrl = new URL(KROGER_AUTHORIZATION_URL);
  authUrl.searchParams.append('client_id', KROGER_CLIENT_ID || '');
  authUrl.searchParams.append('redirect_uri', KROGER_REDIRECT_URI || '');
  authUrl.searchParams.append('response_type', 'code');
  authUrl.searchParams.append('scope', 'cart.basic:write'); // Example scope
  authUrl.searchParams.append('state', state);
  res.redirect(authUrl.toString());
};

export const handleKrogerCallback = async (req: Request, res: Response) => {
  const { code, state } = req.query;
  const userId = (req as any).userId;

  if (state !== userId) {
    return res.status(403).send('State mismatch.');
  }

  try {
    const tokenResponse = await axios.post(KROGER_TOKEN_URL, {
      grant_type: 'authorization_code',
      code: code as string,
      redirect_uri: KROGER_REDIRECT_URI,
    }, {
      headers: {
        'Authorization': `Basic ${Buffer.from(`${KROGER_CLIENT_ID}:${KROGER_CLIENT_SECRET}`).toString('base64')}`,
      }
    });

    const { access_token, refresh_token, expires_in } = tokenResponse.data;
    const expiresAt = new Date(Date.now() + expires_in * 1000);

    await prisma.integration.upsert({
      where: { provider_userId: { provider: 'KROGER', userId: userId } },
      update: { accessToken: access_token, refreshToken: refresh_token, expiresAt: expiresAt },
      create: { provider: 'KROGER', userId: userId, accessToken: access_token, refreshToken: refresh_token, expiresAt: expiresAt },
    });

    res.redirect('/settings?integration=kroger_success');
  } catch (error) {
    console.error('Error exchanging Kroger authorization code:', error);
    res.status(500).send('Failed to connect to Kroger.');
  }
};

export const disconnectKroger = async (req: Request, res: Response) => {
  const userId = (req as any).userId;

  try {
    await prisma.integration.delete({
      where: {
        provider_userId: {
          provider: 'KROGER',
          userId: userId,
        },
      },
    });

    res.status(200).json({ message: 'Successfully disconnected from Kroger.' });

  } catch (error) {
    console.error('Error disconnecting from Kroger:', error);
    res.status(500).json({ error: 'Failed to disconnect from Kroger.' });
  }
};

// --- Instacart Shopping Actions ---

export const searchInstacart = async (req: Request, res: Response) => {
  const userId = (req as any).userId;
  const { query } = req.body;

  if (!query) {
    return res.status(400).json({ error: 'Search query is required.' });
  }

  try {
    const results = await instacartService.searchProducts(userId, query);
    res.json(results);
  } catch (error) {
    console.error('Error searching Instacart:', error);
    res.status(500).json({ error: 'Failed to search Instacart.' });
  }
};

export const addInstacartItem = async (req: Request, res: Response) => {
  const userId = (req as any).userId;
  const { productId, quantity } = req.body;

  if (!productId || !quantity) {
    return res.status(400).json({ error: 'productId and quantity are required.' });
  }

  try {
    await instacartService.addItemToCart(userId, productId, quantity);
    res.status(200).json({ message: 'Item added to Instacart cart successfully.' });
  } catch (error) {
    console.error('Error adding item to Instacart cart:', error);
    res.status(500).json({ error: 'Failed to add item to cart.' });
  }
};