import type { Request, Response } from 'express';
import { describe, it, expect, beforeEach, vi } from 'vitest';

let mockTx: ReturnType<typeof createMockTransaction>;

const createGigsFromTemplatesMock = vi.fn();
vi.mock('./gigController', () => ({
  createGigsFromTemplates: createGigsFromTemplatesMock,
}));

const sendEmailMock = vi.fn();
vi.mock('../utils/emailService', () => ({
  sendEmail: sendEmailMock,
}));

const transactionSpy = vi.fn(async (callback: any) => callback(mockTx));
vi.mock('../db', () => ({
  prisma: {
    $transaction: transactionSpy,
  },
}));

import { prisma } from '../db';
import { commitOnboarding } from './onboardingController';

const DEFAULT_FAMILY_ID = 101;
const DEFAULT_USER_ID = 'user-123';

type MemoryEntry = { key: string; value: string };

type Relationship = { RelationshipID: number; RelationshipName: string };

type RoomTemplate = { id: number; name: string };

interface TransactionOverrides {
  onboardingMemory?: MemoryEntry[];
  existingFamily?: any | null;
  existingUser?: any | null;
  relationships?: Relationship[];
  roomTemplates?: RoomTemplate[];
  invitationToken?: string;
}

function createMockTransaction(overrides: TransactionOverrides = {}) {
  const onboardingMemory =
    overrides.onboardingMemory ?? [
      { key: 'family_name', value: JSON.stringify('The Parkers') },
      {
        key: 'member_candidates',
        value: JSON.stringify([
          {
            name: 'Alex Parker',
            role: 'Dad',
            email: 'alex@example.com',
          },
        ]),
      },
      { key: 'room_candidates', value: JSON.stringify(['Kitchen', 'Living Room']) },
    ];

  const relationships =
    overrides.relationships ?? ([
      { RelationshipID: 1, RelationshipName: 'Parent' },
      { RelationshipID: 2, RelationshipName: 'Child' },
    ] satisfies Relationship[]);

  const roomTemplates = overrides.roomTemplates ?? [{ id: 501, name: 'General' }];
  const invitationToken = overrides.invitationToken ?? 'invite-token-1';

  const createdFamily =
    overrides.existingFamily ?? ({
      FamilyID: DEFAULT_FAMILY_ID,
      FamilyName: 'The Parkers',
      CreatedByUserID: DEFAULT_USER_ID,
    } as const);

  let nextRoomId = 2000;

  return {
    linZMemory: {
      findMany: vi.fn().mockResolvedValue(onboardingMemory),
      upsert: vi.fn().mockResolvedValue(undefined),
      deleteMany: vi.fn().mockResolvedValue(undefined),
    },
    family: {
      findUnique: vi.fn().mockResolvedValue(overrides.existingFamily ?? null),
      create: vi.fn().mockResolvedValue(createdFamily),
      update: vi.fn().mockResolvedValue(createdFamily),
    },
    relationship: {
      findMany: vi.fn().mockResolvedValue(relationships),
    },
    roomTemplate: {
      findMany: vi.fn().mockResolvedValue(roomTemplates),
    },
    users: {
      findUnique: vi.fn().mockResolvedValue(overrides.existingUser ?? null),
      create: vi.fn(),
      findMany: vi.fn(),
    },
    familyUsers: {
      upsert: vi.fn(),
      create: vi.fn(),
      deleteMany: vi.fn(),
    },
    invitation: {
      upsert: vi.fn().mockResolvedValue({ Token: invitationToken }),
    },
    familyRoom: {
      findMany: vi.fn().mockResolvedValue([]),
      create: vi.fn().mockImplementation(async ({ data }: { data: any }) => ({
        id: nextRoomId++,
        ...data,
      })),
      deleteMany: vi.fn(),
    },
    familyGig: {
      deleteMany: vi.fn(),
    },
    linZFacts: {
      upsert: vi.fn().mockResolvedValue(undefined),
      deleteMany: vi.fn(),
      findFirst: vi.fn().mockResolvedValue(null),
    },
  };
}

function createMockResponse() {
  const res: Partial<Response> & { statusCode?: number; jsonPayload?: any } = {};
  res.status = vi.fn(function status(this: Response, code: number) {
    res.statusCode = code;
    return this;
  }) as Response['status'];
  res.json = vi.fn(function json(this: Response, payload: any) {
    res.jsonPayload = payload;
    return this;
  }) as Response['json'];
  return res as Response & { statusCode?: number; jsonPayload?: any };
}

beforeEach(() => {
  mockTx = createMockTransaction();
  vi.clearAllMocks();
  transactionSpy.mockImplementation(async (callback: any) => callback(mockTx));
  createGigsFromTemplatesMock.mockResolvedValue(undefined);
  sendEmailMock.mockResolvedValue(undefined);
});

describe('commitOnboarding', () => {
  it('commits onboarding successfully and sends invitations', async () => {
    const req = {
      body: {
        familyId: DEFAULT_FAMILY_ID,
        userId: DEFAULT_USER_ID,
      },
    } as Request;
    const res = createMockResponse();

    await commitOnboarding(req, res);

    expect(prisma.$transaction).toHaveBeenCalledTimes(1);
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.jsonPayload).toMatchObject({
      message: 'Onboarding committed successfully.',
      family: expect.objectContaining({ FamilyID: DEFAULT_FAMILY_ID }),
      rooms: ['Kitchen', 'Living Room'],
      members: [
        expect.objectContaining({
          name: 'Alex Parker',
          email: 'alex@example.com',
          placeholder: false,
        }),
      ],
    });

    expect(mockTx.linZMemory.deleteMany).toHaveBeenCalled();
    expect(mockTx.linZFacts.upsert).toHaveBeenCalled();
    expect(createGigsFromTemplatesMock).toHaveBeenCalledTimes(1);
    expect(sendEmailMock).toHaveBeenCalledWith(
      expect.objectContaining({ to: 'alex@example.com' })
    );
  });

  it('updates existing family and links existing user', async () => {
    const existingFamily = { FamilyID: DEFAULT_FAMILY_ID, FamilyName: 'Old Name' };
    const existingUser = { UserID: 'existing-1', Email: 'alex@example.com' };
    mockTx = createMockTransaction({ existingFamily, existingUser });
    transactionSpy.mockImplementation(async (callback: any) => callback(mockTx));

    const req = {
      body: {
        familyId: DEFAULT_FAMILY_ID,
        userId: DEFAULT_USER_ID,
      },
    } as Request;
    const res = createMockResponse();

    await commitOnboarding(req, res);

    expect(mockTx.family.findUnique).toHaveBeenCalledWith({ where: { FamilyID: DEFAULT_FAMILY_ID } });
    expect(mockTx.family.update).toHaveBeenCalledWith({
      where: { FamilyID: DEFAULT_FAMILY_ID },
      data: { FamilyName: 'The Parkers' },
    });
    expect(mockTx.family.create).not.toHaveBeenCalled();
    expect(mockTx.familyUsers.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          UserID_FamilyID: {
            UserID: existingUser.UserID,
            FamilyID: DEFAULT_FAMILY_ID,
          },
        },
      })
    );
    expect(mockTx.users.create).not.toHaveBeenCalled();
    expect(sendEmailMock).toHaveBeenCalledWith(expect.objectContaining({ to: 'alex@example.com' }));
  });

  it('creates placeholder member when email is missing', async () => {
    mockTx = createMockTransaction({
      onboardingMemory: [
        { key: 'family_name', value: JSON.stringify('The Parkers') },
        {
          key: 'member_candidates',
          value: JSON.stringify([
            {
              name: 'Jamie Parker',
              role: 'Child',
              email: null,
            },
          ]),
        },
        { key: 'room_candidates', value: JSON.stringify(['Kitchen']) },
      ],
    });
    transactionSpy.mockImplementation(async (callback: any) => callback(mockTx));

    const req = {
      body: {
        familyId: DEFAULT_FAMILY_ID,
        userId: DEFAULT_USER_ID,
      },
    } as Request;
    const res = createMockResponse();

    await commitOnboarding(req, res);

    expect(mockTx.users.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ FirstName: 'Jamie' }),
      })
    );
    expect(mockTx.familyUsers.create).toHaveBeenCalled();
    expect(sendEmailMock).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(200);
  });

  it('returns 400 when familyId is missing', async () => {
    const req = {
      body: {
        userId: DEFAULT_USER_ID,
      },
    } as Request;
    const res = createMockResponse();

    await commitOnboarding(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({ error: 'familyId is required.' });
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });

  it('returns 400 when family name is not provided in onboarding data', async () => {
    mockTx = createMockTransaction({
      onboardingMemory: [
        {
          key: 'member_candidates',
          value: JSON.stringify([
            {
              name: 'Alex Parker',
              role: 'Dad',
              email: 'alex@example.com',
            },
          ]),
        },
        { key: 'room_candidates', value: JSON.stringify(['Kitchen']) },
      ],
    });
    transactionSpy.mockImplementation(async (callback: any) => callback(mockTx));

    const req = {
      body: {
        familyId: DEFAULT_FAMILY_ID,
        userId: DEFAULT_USER_ID,
      },
    } as Request;
    const res = createMockResponse();

    await commitOnboarding(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({ error: 'Missing family name from onboarding data.' });
    expect(createGigsFromTemplatesMock).not.toHaveBeenCalled();
    expect(sendEmailMock).not.toHaveBeenCalled();
  });

  it('returns 500 when transaction throws', async () => {
    const req = {
      body: {
        familyId: DEFAULT_FAMILY_ID,
        userId: DEFAULT_USER_ID,
      },
    } as Request;
    const res = createMockResponse();

    transactionSpy.mockImplementation(async () => {
      throw new Error('database unavailable');
    });

    await commitOnboarding(req, res);

    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({ error: 'database unavailable' });
  });
});
