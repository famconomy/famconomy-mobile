import { Request, Response } from 'express';
import { PlaidApi, Configuration, PlaidEnvironments } from 'plaid';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

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
    const response = await plaidClient.linkTokenCreate({
      user: {
        client_user_id: req.userId,
      },
      client_name: 'FamConomy',
      products: ['transactions'],
      country_codes: ['US'],
      language: 'en',
    });
    res.json(response.data);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to create link token' });
  }
};

export const exchangePublicToken = async (req: Request, res: Response) => {
  const { public_token, familyId } = req.body;
  try {
    const response = await plaidClient.itemPublicTokenExchange({
      public_token,
    });

    const { access_token, item_id } = response.data;

    const plaidItem = await prisma.plaidItem.create({
      data: {
        userId: req.userId,
        familyId: familyId,
        accessToken: access_token,
        itemId: item_id,
      },
    });

    const accountsResponse = await plaidClient.accountsGet({
      access_token,
    });

    for (const account of accountsResponse.data.accounts) {
      await prisma.plaidAccount.create({
        data: {
          id: account.account_id,
          itemId: plaidItem.itemId,
          name: account.name,
          mask: account.mask,
          type: account.type,
          subtype: account.subtype,
        },
      });
    }

    const transactionsResponse = await plaidClient.transactionsGet({
      access_token,
      start_date: '2024-01-01',
      end_date: '2025-12-31',
    });

    console.log(`Found ${transactionsResponse.data.transactions.length} transactions to sync.`);

    for (const plaidTransaction of transactionsResponse.data.transactions) {
      try {
        const category = plaidTransaction.category && plaidTransaction.category.length > 0 ? plaidTransaction.category[0] : 'Uncategorized';
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

        await prisma.transaction.create({ data });
      } catch (error) {
        console.error(`Failed to create transaction for ${plaidTransaction.name}:`, error);
      }
    }


    res.json({ message: 'Public token exchanged successfully' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to exchange public token' });
  }
};

export const getAccounts = async (req: Request, res: Response) => {
  const userId = req.userId;
  const { familyId } = req.query;

  try {
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
        const balanceResponse = await plaidClient.accountsBalanceGet({ access_token: item.accessToken });
        const balancesByAccountId = new Map(
          balanceResponse.data.accounts.map((account) => [account.account_id, account.balances?.current ?? null]) as Array<[string, number | null]>
        );

        return item.accounts.map((dbAccount) => ({
          ...dbAccount,
          balance: balancesByAccountId.has(dbAccount.id) ? balancesByAccountId.get(dbAccount.id) : null,
        }));
      } catch (balanceError) {
        console.error('Failed to fetch balances for Plaid item', item.itemId, balanceError);
        return item.accounts.map((dbAccount) => ({
          ...dbAccount,
          balance: null,
          balanceError: true,
        }));
      }
    });

    const balanceResults = await Promise.allSettled(balancePromises);
    const accountsWithBalances = balanceResults.flatMap((result) => (result.status === 'fulfilled' ? result.value : []));

    res.json(accountsWithBalances);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to get accounts' });
  }
};

export const getTransactions = async (req: Request, res: Response) => {
  const { accessToken } = req.body;
  try {
    const response = await plaidClient.transactionsGet({
      access_token: accessToken,
      start_date: '2024-01-01',
      end_date: '2024-12-31',
    });

    res.json(response.data);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to get transactions' });
  }
};

export const deleteAccount = async (req: Request, res: Response) => {
  const { id } = req.params;
  const userId = req.userId;

  try {
    await prisma.$transaction(async (tx) => {
      const account = await tx.plaidAccount.findUnique({
        where: { id },
        include: { item: true },
      });

      if (!account) {
        throw new Error('Account not found');
      }

      // If the item exists, check for ownership.
      if (account.item && account.item.userId !== userId) {
        throw new Error('Access denied');
      }

      await tx.transaction.deleteMany({
        where: { plaidAccountId: id },
      });

      await tx.plaidAccount.delete({
        where: { id },
      });

      // If the item exists, check if it needs to be deleted.
      if (account.item) {
        const remaining = await tx.plaidAccount.count({
          where: { itemId: account.itemId },
        });

        if (remaining === 0) {
          try {
            await plaidClient.itemRemove({ access_token: account.item.accessToken });
          } catch (err) {
            console.warn('Plaid itemRemove failed (continuing):', err);
          }

          await tx.plaidItem.delete({
            where: { itemId: account.itemId },
          });
        }
      }
    });

    res.json({ message: 'Account deleted successfully' });
  } catch (error: any) {
    console.error(error);
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
    const account = await prisma.plaidAccount.findUnique({
      where: { id },
      include: { item: true },
    });

    if (!account || account.item.userId !== userId) {
      return res.status(404).json({ error: 'Account not found or access denied' });
    }

    const updatedAccount = await prisma.plaidAccount.update({
      where: { id },
      data: { customName },
    });

    res.json(updatedAccount);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to update account' });
  }
};
