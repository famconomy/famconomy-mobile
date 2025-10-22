
import { prisma } from '../db';
import axios from 'axios';

const INSTACART_API_BASE_URL = 'https://api.instacart.com/v2'; // Placeholder URL

/**
 * Retrieves the Instacart access token for a given user.
 * @param userId The ID of the user.
 * @returns The access token.
 * @throws An error if the token is not found or has expired.
 */
async function getAccessToken(userId: string): Promise<string> {
  const integration = await prisma.integration.findUnique({
    where: {
      provider_userId: {
        provider: 'INSTACART',
        userId: userId,
      },
    },
  });

  if (!integration) {
    throw new Error('Instacart integration not found for this user.');
  }

  // TODO: Implement token refresh logic if the token is expired

  return integration.accessToken;
}

export interface InstacartProduct {
  id: string;
  name: string;
  brand: string | null;
  size: string | null;
  thumbnail_url: string;
}

/**
 * Searches for products on Instacart.
 * @param userId The ID of the user performing the search.
 * @param query The search query (e.g., "milk").
 * @returns A promise that resolves to an array of product results.
 */
export async function searchProducts(userId: string, query: string): Promise<InstacartProduct[]> {
  // const accessToken = await getAccessToken(userId);

  // TODO: Replace this with a real API call to Instacart's search endpoint
  console.log(`[Mock] Searching Instacart for: "${query}" for user ${userId}`);

  // Return mock data for UI development
  return [
    {
      id: `mock_${query.replace(/\s/g, '_')}_123`,
      name: `${query} - Brand A`,
      brand: 'Brand A',
      size: '1 gallon',
      thumbnail_url: 'https://via.placeholder.com/150',
    },
    {
      id: `mock_${query.replace(/\s/g, '_')}_456`,
      name: `${query} - Brand B (Organic)`,
      brand: 'Brand B',
      size: '0.5 gallon',
      thumbnail_url: 'https://via.placeholder.com/150',
    },
    {
      id: `mock_${query.replace(/\s/g, '_')}_789`,
      name: `${query} - Brand C`,
      brand: 'Brand C',
      size: '1 quart',
      thumbnail_url: 'https://via.placeholder.com/150',
    },
  ];

  /*
  // Real implementation would look something like this:
  const response = await axios.get(`${INSTACART_API_BASE_URL}/products/search`,
    {
      headers: { Authorization: `Bearer ${accessToken}` },
      params: { query: query },
    }
  );
  return response.data.products;
  */
}

/**
 * Adds an item to the user's Instacart cart.
 * @param userId The ID of the user.
 * @param productId The ID of the product to add.
 * @param quantity The quantity to add.
 */
export async function addItemToCart(userId: string, productId: string, quantity: number): Promise<void> {
  // const accessToken = await getAccessToken(userId);

  // TODO: Replace this with a real API call to Instacart's add to cart endpoint
  console.log(`[Mock] Adding product ${productId} (quantity: ${quantity}) to cart for user ${userId}`);

  // Real implementation would look something like this:
  /*
  await axios.post(`${INSTACART_API_BASE_URL}/cart/items`,
    {
      product_id: productId,
      quantity: quantity,
    },
    {
      headers: { Authorization: `Bearer ${accessToken}` },
    }
  );
  */
}
