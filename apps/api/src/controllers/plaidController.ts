import { Request, Response } from 'express';
import { PlaidApi, Configuration, PlaidEnvironments } from 'plaid';
import { prisma } from '../db';
import { logger } from '../utils/logger';
import { encryptToken, decryptToken, redactToken, PlaidSyncManager } from '../services/plaidService';
import { verifyFamilyMembership } from '../utils/authUtils';

const configuration = new Configuration({
  basePath: PlaidEnvironments.sandbox,
  baseOptions: {
    headers: {
      'PLAID-CLIENT-ID': process.env.PLAID_CLIENT_ID,
      'PLAID-SECRET': process.env.PLAID_SECRET,
    },
  },
});

const plaidClient = new PlaidApi(configuration);

export const createLinkToken = async (req: Request, res: Response) => {
  try {
    if (!req.userId) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const response = await plaidClient.linkTokenCreate({
      user: {
        client_user_id: req.userId,
      },
      client_name: 'FamConomy',
      products: ['transactions'],
      country_codes: ['US'],
      language: 'en',
    });

    logger.info('Plaid link token created', { 
      userId: req.userId,
      tokenId: response.data.link_token?.substring(0, 8) + '...'
    });

    res.json(response.data);
  } catch (error) {
    logger.error('Failed to create Plaid link token', { 
      userId: req.userId,
      error: error instanceof Error ? error.message : 'Unknown error'
    });
    res.status(500).json({ error: 'Failed to create link token' });
  }
};

export const exchangePublicToken = async (req: Request, res: Response) => {
  const { public_token, familyId } = req.body;
  
  try {
    if (!req.userId) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    // Verify family membership if familyId provided
    if (familyId) {
      const hasAccess = await verifyFamilyMembership(req.userId, familyId);
      if (!hasAccess) {
        return res.status(403).json({ error: 'Access denied to family' });
      }
    }

    const response = await plaidClient.itemPublicTokenExchange({
      public_token,
    });

    const { access_token, item_id } = response.data;
    const syncManager = PlaidSyncManager.getInstance();

    // Encrypt access token before storing
    const encryptedToken = encryptToken(access_token);

    const plaidItem = await prisma.plaidItem.create({
      data: {
        userId: req.userId,
        familyId: familyId,
        accessToken: encryptedToken,
        itemId: item_id,
      },
    });

    logger.info('Plaid item created', {
      userId: req.userId,
      familyId,
      itemId: item_id,
      accessToken: redactToken(access_token)
    });

    // Use sync manager for concurrent-safe batched sync
    if (await syncManager.canSync(item_id)) {
      await syncManager.markSyncAttempt(item_id);

      try {
        const accountsResponse = await plaidClient.accountsGet({
          access_token,
        });

        // Create accounts in batch
        const accountsToCreate = accountsResponse.data.accounts.map(account => ({
          id: account.account_id,
          itemId: plaidItem.itemId,
          name: account.name,
          mask: account.mask,
          type: account.type,
          subtype: account.subtype,
        }));

        await prisma.$transaction(async (tx) => {
          for (const accountData of accountsToCreate) {
            await tx.plaidAccount.create({ data: accountData });
          }
        });

        // Sync transactions with retry logic
        const syncTransactions = async () => {
          const transactionsResponse = await plaidClient.transactionsGet({
            access_token,
            start_date: '2024-01-01',
            end_date: '2025-12-31',
          });

          logger.info('Plaid transactions sync started', {
            itemId: item_id,
            transactionCount: transactionsResponse.data.transactions.length,
            userId: req.userId
          });

          // Process transactions in batches to avoid overwhelming the database
          const batchSize = 50;
          const transactions = transactionsResponse.data.transactions;
          
          for (let i = 0; i < transactions.length; i += batchSize) {
            const batch = transactions.slice(i, i + batchSize);
            
            await prisma.$transaction(async (tx) => {
              for (const plaidTransaction of batch) {
                try {
                  const category = plaidTransaction.category && plaidTransaction.category.length > 0 
                    ? plaidTransaction.category[0] 
                    : 'Uncategorized';
                    
                  const data: any = {
                    Description: plaidTransaction.name,
                    Amount: plaidTransaction.amount,
                    Date: new Date(plaidTransaction.date),
                    account: {
                      connect: { id: plaidTransaction.account_id },
                    },
                    Users: {
                      connect: { UserID: req.userId },
                    },
                  };

                  if (familyId) {
                    data.Budget = {
                      connectOrCreate: {
                        where: { FamilyID_Name: { FamilyID: familyId, Name: category } },
                        create: {
                          FamilyID: familyId,
                          Name: category,
                          TotalAmount: 0,
                          Users: {
                            connect: { UserID: req.userId },
                          },
                        },
                      },
                    };
                  }

                  await tx.transaction.create({ data });
                } catch (error) {
                  logger.error('Failed to create transaction', {
                    transactionName: plaidTransaction.name,
                    transactionId: plaidTransaction.transaction_id,
                    error: error instanceof Error ? error.message : 'Unknown error'
                  });
                }
              }
            });
          }
        };

        await syncTransactions();
        await syncManager.clearSync(item_id);

      } catch (syncError) {
        logger.error('Plaid sync failed', {
          itemId: item_id,
          userId: req.userId,
          error: syncError instanceof Error ? syncError.message : 'Unknown error'
        });

        if (await syncManager.shouldRetry(item_id)) {
          await syncManager.scheduleRetry(item_id, async () => {
            const decryptedToken = decryptToken(encryptedToken);
            // Retry logic would go here
          });
        }
        throw syncError;
      }
    } else {
      logger.warn('Plaid sync skipped due to rate limiting', {
        itemId: item_id,
        userId: req.userId
      });
    }


    res.json({ message: 'Public token exchanged successfully' });
  } catch (error) {
    logger.error('Failed to exchange public token', {
      userId: req.userId,
      familyId,
      error: error instanceof Error ? error.message : 'Unknown error'
    });
    res.status(500).json({ error: 'Failed to exchange public token' });
  }
};

export const getAccounts = async (req: Request, res: Response) => {
  const userId = req.userId;
  const { familyId } = req.query;

  try {
    if (!userId) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    // Verify family membership if familyId provided
    if (familyId) {
      const hasAccess = await verifyFamilyMembership(userId, parseInt(familyId as string));
      if (!hasAccess) {
        return res.status(403).json({ error: 'Access denied to family accounts' });
      }
    }

    let plaidItems;
    if (familyId) {
      plaidItems = await prisma.plaidItem.findMany({
        where: { familyId: parseInt(familyId as string) },
        include: { accounts: true },
      });
    } else {
      plaidItems = await prisma.plaidItem.findMany({
        where: { userId },
        include: { accounts: true },
      });
    }

    if (!plaidItems.length) {
      return res.json([]);
    }

    const balancePromises = plaidItems.map(async (item) => {
      try {
        // Decrypt token for API call
        const decryptedToken = decryptToken(item.accessToken);
        const balanceResponse = await plaidClient.accountsBalanceGet({ 
          access_token: decryptedToken 
        });
        
        const balancesByAccountId = new Map(
          balanceResponse.data.accounts.map((account) => [
            account.account_id, 
            account.balances?.current ?? null
          ]) as Array<[string, number | null]>
        );

        return item.accounts.map((dbAccount) => ({
          ...dbAccount,
          balance: balancesByAccountId.has(dbAccount.id) ? balancesByAccountId.get(dbAccount.id) : null,
        }));
      } catch (balanceError) {
        logger.error('Failed to fetch balances for Plaid item', {
          itemId: item.itemId,
          userId,
          error: balanceError instanceof Error ? balanceError.message : 'Unknown error'
        });
        return item.accounts.map((dbAccount) => ({
          ...dbAccount,
          balance: null,
          balanceError: true,
        }));
      }
    });

    const balanceResults = await Promise.allSettled(balancePromises);
    const accountsWithBalances = balanceResults.flatMap((result) => 
      result.status === 'fulfilled' ? result.value : []
    );

    logger.info('Plaid accounts retrieved', {
      userId,
      familyId,
      accountCount: accountsWithBalances.length
    });

    res.json(accountsWithBalances);
  } catch (error) {
    logger.error('Failed to get Plaid accounts', {
      userId,
      familyId,
      error: error instanceof Error ? error.message : 'Unknown error'
    });
    res.status(500).json({ error: 'Failed to get accounts' });
  }
};

export const getTransactions = async (req: Request, res: Response) => {
  const { accessToken } = req.body;
  
  try {
    if (!req.userId) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    if (!accessToken) {
      return res.status(400).json({ error: 'Access token required' });
    }

    // Verify the user owns this access token
    const plaidItem = await prisma.plaidItem.findFirst({
      where: { 
        accessToken: encryptToken(accessToken),
        userId: req.userId 
      }
    });

    if (!plaidItem) {
      return res.status(403).json({ error: 'Access denied to transaction data' });
    }

    const response = await plaidClient.transactionsGet({
      access_token: accessToken,
      start_date: '2024-01-01',
      end_date: '2024-12-31',
    });

    logger.info('Plaid transactions retrieved', {
      userId: req.userId,
      itemId: plaidItem.itemId,
      transactionCount: response.data.transactions.length
    });

    res.json(response.data);
  } catch (error) {
    logger.error('Failed to get Plaid transactions', {
      userId: req.userId,
      error: error instanceof Error ? error.message : 'Unknown error'
    });
    res.status(500).json({ error: 'Failed to get transactions' });
  }
};

export const deleteAccount = async (req: Request, res: Response) => {
  const { id } = req.params;
  const userId = req.userId;

  try {
    if (!userId) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    await prisma.$transaction(async (tx) => {
      const account = await tx.plaidAccount.findUnique({
        where: { id },
        include: { item: true },
      });

      if (!account) {
        throw new Error('Account not found');
      }

      // Verify ownership
      if (account.item && account.item.userId !== userId) {
        throw new Error('Access denied');
      }

      // Delete associated transactions
      await tx.transaction.deleteMany({
        where: { plaidAccountId: id },
      });

      await tx.plaidAccount.delete({
        where: { id },
      });

      // Check if item needs to be deleted
      if (account.item) {
        const remaining = await tx.plaidAccount.count({
          where: { itemId: account.itemId },
        });

        if (remaining === 0) {
          try {
            // Decrypt token for API call
            const decryptedToken = decryptToken(account.item.accessToken);
            await plaidClient.itemRemove({ access_token: decryptedToken });
            
            logger.info('Plaid item removed', {
              itemId: account.itemId,
              userId
            });
          } catch (err) {
            logger.warn('Plaid itemRemove failed (continuing)', {
              itemId: account.itemId,
              userId,
              error: err instanceof Error ? err.message : 'Unknown error'
            });
          }

          await tx.plaidItem.delete({
            where: { itemId: account.itemId },
          });
        }
      }
    });

    logger.info('Plaid account deleted', {
      accountId: id,
      userId
    });

    res.json({ message: 'Account deleted successfully' });
  } catch (error: any) {
    logger.error('Failed to delete Plaid account', {
      accountId: id,
      userId,
      error: error instanceof Error ? error.message : 'Unknown error'
    });

    if (error.message === 'Account not found' || error.message === 'Access denied') {
      res.status(404).json({ error: 'Account not found or access denied' });
    } else {
      res.status(500).json({ error: 'Failed to delete account' });
    }
  }
};

export const updateAccount = async (req: Request, res: Response) => {
  const { id } = req.params;
  const { customName } = req.body;
  const userId = req.userId;

  try {
    if (!userId) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const account = await prisma.plaidAccount.findUnique({
      where: { id },
      include: { item: true },
    });

    if (!account || !account.item || account.item.userId !== userId) {
      return res.status(404).json({ error: 'Account not found or access denied' });
    }

    const updatedAccount = await prisma.plaidAccount.update({
      where: { id },
      data: { customName },
    });

    logger.info('Plaid account updated', {
      accountId: id,
      userId,
      customName
    });

    res.json(updatedAccount);
  } catch (error) {
    logger.error('Failed to update Plaid account', {
      accountId: id,
      userId,
      error: error instanceof Error ? error.message : 'Unknown error'
    });
    res.status(500).json({ error: 'Failed to update account' });
  }
};
