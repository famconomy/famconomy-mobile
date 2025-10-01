import { Request, Response } from 'express';
import { Prisma } from '@prisma/client';
import { createGigsFromTemplates } from './gigController';
import { randomBytes } from 'crypto';
import { sendEmail } from '../utils/emailService';
import path from 'path';
import fs from 'fs';
import { prisma } from '../db';
const shouldLogOnboardingCommit =
  process.env.DEBUG_ONBOARDING_COMMIT === 'true' || process.env.DEBUG_ONBOARDING === 'true';

type OnboardingMember = {
  name: string;
  role: string;
  email?: string | null;
};

type OnboardingRoom = string;

const relationshipAlias: Record<string, string> = {
  mom: 'Parent',
  mother: 'Parent',
  dad: 'Parent',
  father: 'Parent',
  parent: 'Parent',
  guardian: 'Guardian',
  wife: 'Parent',
  husband: 'Parent',
  partner: 'Parent',
  spouse: 'Parent',
  son: 'Child',
  sons: 'Child',
  daughter: 'Child',
  daughters: 'Child',
  kid: 'Child',
  kids: 'Child',
  child: 'Child',
  children: 'Child',
  boy: 'Child',
  boys: 'Child',
  girl: 'Child',
  girls: 'Child',
  teen: 'Child',
  teenager: 'Child',
  grandma: 'Grandparent',
  grandfather: 'Grandparent',
  grandpa: 'Grandparent',
  grandmother: 'Grandparent',
  grandparent: 'Grandparent',
  cousin: 'Relative',
  uncle: 'Relative',
  aunt: 'Relative',
  friend: 'Friend',
};

const PLACEHOLDER_EMAIL_DOMAIN = 'famc.local';
const resolveLogoAsset = (): string | null => {
  const explicit = process.env.ONBOARDING_LOGO_PATH;
  if (explicit && fs.existsSync(explicit)) {
    return explicit;
  }

  const candidateDirs = [
    path.resolve(process.cwd(), 'public'),
    path.resolve(process.cwd(), 'assets'),
    path.resolve(process.cwd(), 'dist/assets'),
    path.resolve('/var/www/html/app/assets'),
    path.resolve('/var/www/html/app'),
    path.resolve('/home/wpbiggs/apps/famconomy'),
  ];

  for (const dir of candidateDirs) {
    try {
      const entries = fs.readdirSync(dir);
      const match = entries.find(file => /^Logo.*\.png$/i.test(file));
      if (match) {
        return path.join(dir, match);
      }
    } catch (err) {
      // ignore missing directories
    }
  }

  return null;
};

const LOGO_PATH = resolveLogoAsset();
const ONBOARDING_FACT_KEYS = ['family.name', 'onboarding.status', 'onboarding.members', 'onboarding.rooms', 'onboarding.tour_seen'];
const ROOM_STOP_WORDS = new Set([
  'no',
  'none',
  'nah',
  'nope',
  'na',
  'n/a',
  'not now',
  "that's all",
  'that is all',
  'thats all',
  "that's it",
  'thats it',
  'all good',
  'all set',
  'good',
  'we are good',
  'we are all good',
]);

const normalizeRoleText = (role?: string | null) => {
  if (!role) return role;
  return role.replace(/[\p{P}\p{S}]+/gu, ' ').replace(/\s+/g, ' ').trim();
};

const ROOM_TOKEN_SYNONYMS: Record<string, string> = {
  bathrooms: 'bathroom',
  bathroom: 'bathroom',
  bath: 'bathroom',
  baths: 'bathroom',
  restroom: 'bathroom',
  restrooms: 'bathroom',
  toilet: 'bathroom',
  toilets: 'bathroom',
  powder: 'bathroom',
  lavatory: 'bathroom',
  entryway: 'entry',
  entry: 'entry',
  foyer: 'entry',
  mudroom: 'entry',
  mud: 'entry',
  hallway: 'entry',
  hall: 'entry',
  foyerway: 'entry',
  living: 'living',
  lounge: 'living',
  family: 'living',
  den: 'living',
  great: 'living',
  room: 'room',
  rooms: 'room',
  kitchen: 'kitchen',
  pantry: 'kitchen',
  kitchenette: 'kitchen',
  dining: 'dining',
  breakfast: 'dining',
  eat: 'dining',
  bedroom: 'bedroom',
  bedrooms: 'bedroom',
  bed: 'bedroom',
  suite: 'suite',
  master: 'master',
  primary: 'master',
  owner: 'master',
  kids: 'kid',
  kid: 'kid',
  child: 'kid',
  children: 'kid',
  teen: 'kid',
  toddler: 'kid',
  nursery: 'nursery',
  office: 'office',
  study: 'office',
  workspace: 'office',
  desk: 'office',
  playroom: 'play',
  play: 'play',
  game: 'play',
  media: 'play',
  guest: 'guest',
  garage: 'garage',
  laundry: 'laundry',
  utility: 'laundry',
  wash: 'laundry',
  closet: 'closet',
  porch: 'porch',
  patio: 'patio',
  deck: 'deck',
  backyard: 'yard',
  yard: 'yard',
  garden: 'yard',
};

const normalizeRoomName = (value: string) =>
  value
    .toLowerCase()
    .replace(/\(.*?\)/g, '')
    .replace(/[^a-z0-9]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

const collapseRoomName = (value: string) => normalizeRoomName(value).replace(/\s+/g, '');

const singularizeToken = (token: string) => {
  if (token.length > 3 && token.endsWith('s')) {
    return token.slice(0, -1);
  }
  return token;
};

const tokenizeRoomName = (value: string) => {
  const normalized = normalizeRoomName(value).replace(/\d+/g, ' ');
  const baseTokens = normalized.split(' ').filter(Boolean);
  return baseTokens
    .map(token => ROOM_TOKEN_SYNONYMS[token] ?? token)
    .map(singularizeToken)
    .filter(Boolean);
};

const matchRoomTemplateId = (
  roomName: string,
  roomTemplates: { id: number; name: string }[],
  defaultTemplateId: number
) => {
  if (!roomTemplates.length) {
    return defaultTemplateId;
  }

  const processedTemplates = roomTemplates.map(template => {
    const normalizedName = normalizeRoomName(template.name);
    const collapsedName = collapseRoomName(template.name);
    const tokens = new Set(tokenizeRoomName(template.name));
    tokens.delete('template');
    return {
      id: template.id,
      normalizedName,
      collapsedName,
      tokens,
    };
  });

  const rawLower = roomName.toLowerCase();
  const normalizedInput = normalizeRoomName(roomName);
  const collapsedInput = collapseRoomName(roomName);
  const collapsedVariants = new Set<string>([collapsedInput]);

  if (collapsedInput.endsWith('s')) {
    collapsedVariants.add(collapsedInput.slice(0, -1));
  }

  for (const variant of collapsedVariants) {
    const exact = processedTemplates.find(template => template.collapsedName === variant);
    if (exact) {
      return exact.id;
    }
  }

  const inputTokens = new Set(tokenizeRoomName(roomName));
  inputTokens.delete('template');
  if (/\b[a-z]+['’]s\s+room\b/.test(rawLower)) {
    inputTokens.add('bedroom');
    inputTokens.add('kid');
  }

  if (/kids?\s+bed(room)?/.test(rawLower)) {
    inputTokens.add('bedroom');
    inputTokens.add('kid');
  }

  if (/suite/.test(rawLower)) {
    inputTokens.add('suite');
  }

  if (inputTokens.size === 0 && normalizedInput.includes('room')) {
    inputTokens.add('room');
  }

  const inputTokensArray = Array.from(inputTokens);

  let bestTemplateId = defaultTemplateId;
  let bestScore = -Infinity;

  for (const template of processedTemplates) {
    const templateTokens = new Set(template.tokens);
    templateTokens.delete('room');
    const intersection = inputTokensArray.filter(token => templateTokens.has(token));
    const intersectionCount = intersection.length;

    let score = intersectionCount * 12;

    if (template.collapsedName === collapsedInput) {
      score += 100;
    }

    if (intersectionCount === inputTokens.size && inputTokens.size > 0) {
      score += 15;
    }

    if (inputTokens.has('entry') && templateTokens.has('entry')) score += 14;
    if (inputTokens.has('bathroom') && templateTokens.has('bathroom')) score += 10;
    if (inputTokens.has('kitchen') && templateTokens.has('kitchen')) score += 10;
    if (inputTokens.has('dining') && templateTokens.has('dining')) score += 8;
    if (inputTokens.has('living') && templateTokens.has('living')) score += 8;
    if (inputTokens.has('kid') && templateTokens.has('kid')) score += 6;
    if (inputTokens.has('suite') && templateTokens.has('suite')) score += 6;

    if (inputTokens.has('kid') && templateTokens.has('bathroom') && !templateTokens.has('kid')) {
      score -= 6;
    }

    const unmatchedTokens = inputTokens.size - intersectionCount;
    if (unmatchedTokens > 0) {
      score -= unmatchedTokens * 3;
    }

    if (score > bestScore) {
      bestScore = score;
      bestTemplateId = template.id;
    }
  }

  if (bestScore <= 0) {
    const generalTemplate = processedTemplates.find(template =>
      /general|common|other|misc/.test(template.normalizedName)
    );
    if (generalTemplate) {
      return generalTemplate.id;
    }
  }

  return bestTemplateId ?? defaultTemplateId;
};

function generatePlaceholderPasswordHash(): string {
  return randomBytes(16).toString('hex');
}

function parseJsonValue<T>(value: unknown): T | undefined {
  if (value === null || value === undefined) return undefined;
  if (typeof value === 'string') {
    try {
      return JSON.parse(value) as T;
    } catch (error) {
      console.warn('Failed to parse JSON value from memory:', value, error);
      return undefined;
    }
  }
  return value as T;
}

function ensureArray<T>(value: unknown): T[] {
  if (Array.isArray(value)) {
    return value as T[];
  }
  return [];
}

function splitName(fullName: string): { firstName: string; lastName: string } {
  if (!fullName) {
    return { firstName: 'Member', lastName: '' };
  }
  const parts = fullName.trim().split(/\s+/);
  const firstName = parts.shift() ?? 'Member';
  const lastName = parts.join(' ');
  return { firstName, lastName };
}

function resolveRelationshipId(
  relationships: { RelationshipID: number; RelationshipName: string }[],
  role: string | undefined
): number {
  if (!relationships.length) {
    throw new Error('Relationship reference data is missing.');
  }

  const map = new Map(relationships.map(rel => [rel.RelationshipName.toLowerCase(), rel.RelationshipID]));
  const defaultRelationshipId = map.get('other') ?? relationships[0]?.RelationshipID;

  if (!role) return defaultRelationshipId;

  const normalized = role.trim().toLowerCase();
  if (map.has(normalized)) {
    return map.get(normalized)!;
  }

  const alias = relationshipAlias[normalized];
  if (alias) {
    const aliasKey = alias.toLowerCase();
    if (map.has(aliasKey)) {
      return map.get(aliasKey)!;
    }
  }

  for (const [name, id] of map.entries()) {
    if (normalized.includes(name)) {
      return id;
    }
  }

  return defaultRelationshipId;
}

async function upsertInvitation(
  tx: Prisma.TransactionClient,
  params: { familyId: number; email: string; invitedBy: string; relationshipId: number | null }
) {
  const token = randomBytes(32).toString('hex');
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

  const invitation = await tx.invitation.upsert({
    where: { Email: params.email },
    create: {
      FamilyID: params.familyId,
      Email: params.email,
      Token: token,
      ExpiresAt: expiresAt,
      InvitedBy: params.invitedBy,
      RelationshipID: params.relationshipId ?? undefined,
    },
    update: {
      FamilyID: params.familyId,
      Token: token,
      ExpiresAt: expiresAt,
      InvitedBy: params.invitedBy,
      RelationshipID: params.relationshipId ?? undefined,
    },
  });

  return invitation;
}

async function sendOnboardingInvitationEmail(email: string, token: string) {
  try {
    const invitationLink = `https://famconomy.com/app/join?token=${token}`;
    const attachments = LOGO_PATH
      ? [
          {
            filename: path.basename(LOGO_PATH),
            path: LOGO_PATH,
            cid: 'logo',
          },
        ]
      : undefined;

    await sendEmail({
      to: email,
      subject: 'You have been invited to join a family on FamConomy!',
      html: `
        <div style="font-family: sans-serif; text-align: center; padding: 2rem;">
          ${LOGO_PATH ? '<img src="cid:logo" alt="FamConomy Logo" style="width: 150px; margin-bottom: 1rem;" />' : ''}
          <h2>You've been invited to join a family on FamConomy!</h2>
          <p>Click the button below to accept the invitation.</p>
          <a href="${invitationLink}" style="background-color: #4F46E5; color: white; padding: 0.75rem 1.5rem; text-decoration: none; border-radius: 0.5rem; display: inline-block;">Accept Invitation</a>
        </div>
      `,
      attachments,
    });
  } catch (emailError) {
    console.error('Failed to send onboarding invitation email:', emailError);
  }
}

function buildPlaceholderEmail(name: string): string {
  const slug = name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 10);
  return `${slug || 'member'}-${Date.now()}@${PLACEHOLDER_EMAIL_DOMAIN}`;
}

export const commitOnboarding = async (req: Request, res: Response) => {
  const { familyId, userId } = req.body;

  if (!familyId) {
    return res.status(400).json({ error: 'familyId is required.' });
  }

  if (!userId) {
    return res.status(400).json({ error: 'userId is required to commit onboarding.' });
  }

  try {
    const result = await prisma.$transaction(async (tx) => {
      const onboardingMemory = await tx.linZMemory.findMany({
        where: {
          familyId,
          userId: userId || null,
          key: { in: ['family_name', 'member_candidates', 'room_candidates', 'status'] },
        },
      });

      const getMemoryValue = (key: string) => {
        const item = onboardingMemory.find(m => m.key === key);
        return item?.value;
      };

      const familyName = (req.body.family_name ?? parseJsonValue<string>(getMemoryValue('family_name')) ?? getMemoryValue('family_name')) as string | undefined;
      const memberCandidates = ensureArray<OnboardingMember>(req.body.members ?? parseJsonValue(getMemoryValue('member_candidates')));
      const roomCandidates = ensureArray<OnboardingRoom>(req.body.rooms ?? parseJsonValue(getMemoryValue('room_candidates')));

      if (!familyName || !familyName.trim()) {
        throw new Error('Missing family name from onboarding data.');
      }

      if (!memberCandidates.length) {
        throw new Error('No member candidates found in onboarding data.');
      }

      if (!roomCandidates.length) {
        throw new Error('No room candidates found in onboarding data.');
      }

      const normalizedMembers = memberCandidates
        .map(member => ({
          name: member.name?.trim(),
          role: normalizeRoleText(member.role),
          email: member.email?.toLowerCase() || null,
        }))
        .filter(member => !!member.name);

      const normalizedRoomsRaw = Array.from(
        new Set(
          roomCandidates
            .map(room => (typeof room === 'string' ? room : ''))
            .filter(Boolean)
            .map(room => room.trim())
        )
      );

      const normalizedRooms = normalizedRoomsRaw.filter(room => !ROOM_STOP_WORDS.has(room.toLowerCase()));


      if (shouldLogOnboardingCommit) {
        console.log('[onboarding-commit] Resolved inputs', {
          familyId,
          userId,
          familyName,
          memberCandidates: memberCandidates.length,
          normalizedMembers: normalizedMembers.map(member => ({
            name: member.name,
            role: member.role,
            email: member.email,
          })),
          roomCandidates: roomCandidates.length,
          normalizedRooms,
        });
      }

      if (!normalizedMembers.length) {
        throw new Error('No valid member data found.');
      }

      if (!normalizedRooms.length) {
        throw new Error('No valid room data found.');
      }

      let family = await tx.family.findUnique({ where: { FamilyID: familyId } });
      if (family) {
        family = await tx.family.update({
          where: { FamilyID: familyId },
          data: { FamilyName: familyName },
        });
      } else {
        family = await tx.family.create({
          data: {
            FamilyID: familyId,
            FamilyName: familyName,
            CreatedByUserID: userId,
          },
        });
      }

      const relationships = await tx.relationship.findMany();
      if (!relationships.length) {
        throw new Error('Relationship reference data is unavailable.');
      }

      const roomTemplates = await tx.roomTemplate.findMany();
      const defaultRoomTemplateId = roomTemplates[0]?.id ?? 1;

      const createdMembers: Array<{ name: string; email: string | null; relationshipId: number; relationshipName: string; placeholder: boolean }> = [];
      const invitationsToSend: Array<{ email: string; token: string }> = [];
      for (const member of normalizedMembers) {
        const relationshipId = resolveRelationshipId(relationships, member.role);

        if (member.email) {
          const existingUser = await tx.users.findUnique({ where: { Email: member.email } });

          if (existingUser) {
            await tx.familyUsers.upsert({
              where: {
                UserID_FamilyID: {
                  UserID: existingUser.UserID,
                  FamilyID: family.FamilyID,
                },
              },
              create: {
                UserID: existingUser.UserID,
                FamilyID: family.FamilyID,
                RelationshipID: relationshipId,
              },
              update: {
                RelationshipID: relationshipId,
              },
            });
          }

          const invitation = await upsertInvitation(tx, {
            familyId: family.FamilyID,
            email: member.email,
            invitedBy: userId,
            relationshipId,
          });

          invitationsToSend.push({ email: member.email, token: invitation.Token });

          createdMembers.push({ name: member.name!, email: member.email, relationshipId, relationshipName: (relationships.find(rel => rel.RelationshipID === relationshipId)?.RelationshipName ?? (member.role ?? 'Member')), placeholder: false });
        } else {
          const { firstName, lastName } = splitName(member.name!);
          const placeholderEmail = buildPlaceholderEmail(member.name!);

          const placeholderUser = await tx.users.create({
            data: {
              FirstName: firstName,
              LastName: lastName,
              Email: placeholderEmail,
              PasswordHash: generatePlaceholderPasswordHash(),
            },
          });

          await tx.familyUsers.create({
            data: {
              UserID: placeholderUser.UserID,
              FamilyID: family.FamilyID,
              RelationshipID: relationshipId,
            },
          });

          createdMembers.push({ name: member.name!, email: null, relationshipId, relationshipName: (relationships.find(rel => rel.RelationshipID === relationshipId)?.RelationshipName ?? (member.role ?? 'Member')), placeholder: true });
        }
      }

      const existingRooms = await tx.familyRoom.findMany({ where: { familyId: family.FamilyID } });
      const existingRoomNames = new Set(existingRooms.map(room => room.name.toLowerCase()));
      const createdRoomIds: number[] = [];
      const createdRooms: string[] = [];

      for (const roomName of normalizedRooms) {
        if (existingRoomNames.has(roomName.toLowerCase())) {
          continue;
        }
        const matchedTemplateId = matchRoomTemplateId(roomName, roomTemplates, defaultRoomTemplateId);
        const newRoom = await tx.familyRoom.create({
          data: {
            familyId: family.FamilyID,
            name: roomName,
            roomTemplateId: matchedTemplateId,
          },
        });
        createdRoomIds.push(newRoom.id);
        createdRooms.push(roomName);
      }

      if (shouldLogOnboardingCommit) {
        console.log('[onboarding-commit] Prepared persistence payload', {
          createdMembers,
          createdRooms,
          createdRoomIds,
        });
      }

      if (createdRoomIds.length) {
        await createGigsFromTemplates(
          { body: { familyId: family.FamilyID, roomIds: createdRoomIds } } as Request,
          undefined,
          tx
        );
      }

      const upsertMemoryValue = async (key: string, value: unknown) => {
        await tx.linZMemory.upsert({
          where: {
            familyId_userId_key: {
              familyId,
              userId: userId || null,
              key,
            },
          },
          create: {
            familyId,
            userId: userId || null,
            key,
            value: JSON.stringify(value),
          },
          update: { value: JSON.stringify(value) },
        });
      };

      await tx.linZFacts.upsert({
        where: { familyId_key_userId: { familyId, userId: userId || null, key: 'family.name' } },
        create: {
          familyId,
          userId: userId || null,
          key: 'family.name',
          value: familyName,
          source: 'onboarding',
          confidence: 1.0,
        },
        update: { value: familyName, lastConfirmedAt: new Date(), source: 'onboarding' },
      });

      await tx.linZFacts.upsert({
        where: { familyId_key_userId: { familyId, userId: userId || null, key: 'onboarding.status' } },
        create: {
          familyId,
          userId: userId || null,
          key: 'onboarding.status',
          value: 'completed',
          source: 'onboarding',
          confidence: 1.0,
        },
        update: { value: 'completed', lastConfirmedAt: new Date(), source: 'onboarding' },
      });

      await tx.linZFacts.upsert({
        where: { familyId_key_userId: { familyId, userId: userId || null, key: 'onboarding.members' } },
        create: {
          familyId,
          userId: userId || null,
          key: 'onboarding.members',
          value: createdMembers,
          source: 'onboarding',
          confidence: 0.8,
        },
        update: { value: createdMembers, lastConfirmedAt: new Date(), source: 'onboarding' },
      });

      await tx.linZFacts.upsert({
        where: { familyId_key_userId: { familyId, userId: userId || null, key: 'onboarding.rooms' } },
        create: {
          familyId,
          userId: userId || null,
          key: 'onboarding.rooms',
          value: createdRooms,
          source: 'onboarding',
          confidence: 0.8,
        },
        update: { value: createdRooms, lastConfirmedAt: new Date(), source: 'onboarding' },
      });

      await tx.linZMemory.deleteMany({
        where: {
          familyId,
          userId: userId || null,
          key: { in: ['family_name', 'member_candidates', 'room_candidates', 'status'] },
        },
      });

      await upsertMemoryValue('family_name', familyName);
      await upsertMemoryValue('member_candidates', createdMembers);
      await upsertMemoryValue('room_candidates', createdRooms);
      await upsertMemoryValue('status', { state: 'completed', completedAt: new Date().toISOString() });

      console.log(`Audit: ONBOARDING_COMMIT - Family ID: ${familyId}, User ID: ${userId}`);

      return {
        family,
        members: createdMembers,
        rooms: createdRooms,
        invitations: invitationsToSend,
      };
    });

    if (result?.invitations?.length) {
      await Promise.all(result.invitations.map(invite => sendOnboardingInvitationEmail(invite.email, invite.token)));
    }

    const { invitations, ...responsePayload } = result;
    res.status(200).json({ message: 'Onboarding committed successfully.', ...responsePayload });
  } catch (error: any) {
    console.error('Error committing onboarding:', error);
    const message = error instanceof Error ? error.message : 'Failed to commit onboarding.';
    const validationMessages = [
      'Missing family name',
      'No member candidates found',
      'No room candidates found',
      'No valid member data found.',
      'No valid room data found.',
      'Relationship reference data is unavailable.'
    ];
    if (validationMessages.some(msg => message.includes(msg))) {
      return res.status(400).json({ error: message });
    }
    res.status(500).json({ error: message });
  }
};

export const resetOnboarding = async (req: Request, res: Response) => {
  const { familyId: rawFamilyId, userId } = req.body as { familyId?: number | null; userId?: string };

  if (!userId) {
    return res.status(400).json({ error: 'userId is required to reset onboarding.' });
  }

  const familyId = rawFamilyId !== undefined && rawFamilyId !== null ? Number(rawFamilyId) : null;
  const conversationMemoryKey =
    familyId !== null && userId
      ? `conversation_history_family_${familyId}_user_${userId}`
      : null;

  try {
    await prisma.$transaction(async tx => {
      const baseMemoryKeys = ['family_name', 'member_candidates', 'room_candidates', 'status'];
      const memoryKeys = conversationMemoryKey ? [...baseMemoryKeys, conversationMemoryKey] : baseMemoryKeys;
      if (familyId !== null) {
        await tx.linZMemory.deleteMany({
          where: {
            familyId,
            userId,
            key: { in: memoryKeys },
          },
        });
      }

      if (familyId !== null) {
        const userMatchConditions = [{ userId: null }];
        if (userId) {
          userMatchConditions.push({ userId });
        }

        const onboardingRoomsFact = await tx.linZFacts.findFirst({
          where: {
            familyId,
            key: 'onboarding.rooms',
            OR: userMatchConditions,
          },
        });

        const roomsToRemove = onboardingRoomsFact ? ensureArray<string>(parseJsonValue(onboardingRoomsFact.value)) : [];

        if (roomsToRemove.length) {
          const existingRooms = await tx.familyRoom.findMany({ where: { familyId } });
          const normalizedTargets = new Set(roomsToRemove.map(room => room.toLowerCase()));
        const roomIds = existingRooms
          .filter(room => normalizedTargets.has(room.name.toLowerCase()))
          .map(room => room.id);

        if (roomIds.length) {
          await tx.familyGig.deleteMany({
            where: {
              familyRoomId: {
                in: roomIds,
              },
            },
          });
          await tx.familyRoom.deleteMany({ where: { id: { in: roomIds } } });
        }
      }

      const placeholderUsers = await tx.users.findMany({
          where: {
            Email: {
              endsWith: `@${PLACEHOLDER_EMAIL_DOMAIN}`,
            },
            FamilyUsers: {
              some: {
                FamilyID: familyId,
              },
            },
          },
          select: { UserID: true },
        });

        const placeholderUserIds = placeholderUsers.map(user => user.UserID);

        if (placeholderUserIds.length) {
          await tx.familyUsers.deleteMany({
            where: {
              FamilyID: familyId,
              UserID: { in: placeholderUserIds },
            },
          });

          await tx.users.deleteMany({
            where: {
              UserID: { in: placeholderUserIds },
            },
          });
        }

        const factDeleteConditions = [{ userId: null }];
        if (userId) {
          factDeleteConditions.push({ userId });
        }

        await tx.linZFacts.deleteMany({
          where: {
            familyId,
            key: { in: ONBOARDING_FACT_KEYS },
            OR: factDeleteConditions,
          },
        });
      } else {
        await tx.linZFacts.deleteMany({
          where: {
            key: { in: ONBOARDING_FACT_KEYS },
            userId,
          },
        });
      }
    });

    return res.status(200).json({ success: true });
  } catch (error: any) {
    console.error('Failed to reset onboarding state:', error);
    return res.status(500).json({ error: 'Failed to reset onboarding state.' });
  }
};
