import { GuidelineStatus, GuidelineType, Prisma, PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const SAMPLE_SOURCE = 'BiggersFamilySample';
const DAY_MS = 24 * 60 * 60 * 1000;
const NEW_RULE_WINDOW_DAYS = parseInt(process.env.NEW_RULE_WINDOW_DAYS ?? '21', 10);

type RawGuidelineValue = boolean | string | RawGuidelineMap;
interface RawGuidelineMap {
  [key: string]: RawGuidelineValue;
}

interface ImportOptions {
  familyId: number;
  type: GuidelineType;
  status: GuidelineStatus;
  proposerId: string;
  members: string[];
  activatedAt?: Date | null;
  proposedAt?: Date;
}

const BIGGERS_SAMPLE = {
  values: {
    'We love God': true,
    'We take care of each other': {
      'We ask ourselves and others what we can do to be helpful': true,
      'We support each other': true,
      'We treat each other kindly': true,
      "We don't yell": true,
    },
    'We abide by the platinum rule': {
      'We treat others the way they want to be treated': true,
      'As though their perspective were reality': true,
    },
    'We take care of ourselves': true,
    'We communicate clearly': {
      'We share the things we love': true,
      'We are good listeners': true,
      "We don't whine or pitch fits": true,
      "We use our words": true,
    },
    'We are not afraid to fail': {
      'And when we do, we all focus on the recovery not the blame': true,
    },
    'We are generous': true,
    'We value being inclusive': true,
    'We play together': true,
    'We do dangerous things carefully': true,
    'We ask, let me not why me': true,
  },
  valuesUnderReview: {
    'We value Honesty': true,
  },
  rules: {
    'We clean up behind ourselves': true,
    "We don't play on the stairs": true,
    "We don't run in the house": true,
    'We do not solve problems with violence': true,
    "We don't beg": true,
    "We knock on doors that are closed": true,
    'Private Spaces': {
      'Beaux': 'his room',
      'Ryker': 'guest room',
      'Eisla': 'her room',
      "Graer": "mommy and daddy's closet",
      'Rule': 'If any family member communicates they need privacy, the rest of the family respects it and vacates accordingly',
    },
    "We don't climb on furniture": true,
  },
  newRules: {
    'We bathe at least every other day': 'This falls under the value that we take care of ourselves',
  },
} as const;

type TransactionClient = Prisma.TransactionClient;

let createdCount = 0;

const toDateDaysAgo = (days: number): Date => {
  const now = new Date();
  return new Date(now.getTime() - days * DAY_MS);
};

const getArgValue = (flag: string): string | undefined => {
  const prefix = flag + '=';
  for (const entry of process.argv) {
    if (entry.startsWith(prefix)) {
      return entry.slice(prefix.length);
    }
  }
  return undefined;
};

const ensureMembers = (members: string[], proposerId: string): string[] => {
  const seen = new Set<string>();
  members.forEach(memberId => seen.add(memberId));
  if (proposerId) {
    seen.add(proposerId);
  }
  return Array.from(seen);
};

const isPlainObject = (value: RawGuidelineValue): value is RawGuidelineMap => {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
};

const buildMetadata = (): Prisma.JsonObject => ({
  source: SAMPLE_SOURCE,
});

const createGuidelineRecursive = async (
  tx: TransactionClient,
  title: string,
  rawValue: RawGuidelineValue,
  options: ImportOptions,
  parentId: number | null,
): Promise<void> => {
  let description: string | null = null;
  const childEntries: Array<[string, RawGuidelineValue]> = [];

  if (rawValue === true) {
    description = null;
  } else if (typeof rawValue === 'string') {
    description = rawValue;
  } else if (isPlainObject(rawValue)) {
    for (const [childTitle, childValue] of Object.entries(rawValue)) {
      if ((childTitle === 'Rule' || childTitle === 'Description') && typeof childValue === 'string') {
        description = childValue;
      } else {
        childEntries.push([childTitle, childValue]);
      }
    }
  } else {
    description = String(rawValue);
  }

  const activatedAt = options.status === GuidelineStatus.ACTIVE ? options.activatedAt ?? new Date() : null;
  const proposedAt = options.proposedAt ?? (activatedAt ? new Date(activatedAt.getTime() - 5 * DAY_MS) : new Date());
  const expiresAt = options.status === GuidelineStatus.ACTIVE && options.type === GuidelineType.RULE && activatedAt
    ? new Date(activatedAt.getTime() + NEW_RULE_WINDOW_DAYS * DAY_MS)
    : null;

  const guideline = await tx.familyGuideline.create({
    data: {
      FamilyID: options.familyId,
      Type: options.type,
      Title: title,
      Description: description,
      ParentID: parentId,
      Status: options.status,
      ProposedByUserID: options.proposerId,
      ProposedAt: proposedAt,
      ActivatedAt: activatedAt,
      ExpiresAt: expiresAt,
      Metadata: buildMetadata(),
    },
  });

  if (options.members.length) {
    await tx.guidelineApproval.createMany({
      data: options.members.map(memberId => {
        const approved = options.status === GuidelineStatus.ACTIVE || memberId === options.proposerId;
        const approvedAt = approved ? (options.status === GuidelineStatus.ACTIVE ? activatedAt : proposedAt) : null;
        return {
          GuidelineID: guideline.GuidelineID,
          UserID: memberId,
          Approved: approved,
          ApprovedAt: approvedAt,
        };
      }),
    });
  }

  createdCount += 1;

  for (const [childTitle, childValue] of childEntries) {
    await createGuidelineRecursive(tx, childTitle, childValue, options, guideline.GuidelineID);
  }
};

const importMap = async (
  tx: TransactionClient,
  map: RawGuidelineMap,
  options: ImportOptions,
  parentId: number | null = null,
): Promise<void> => {
  for (const [title, rawValue] of Object.entries(map)) {
    await createGuidelineRecursive(tx, title, rawValue, options, parentId);
  }
};

const main = async (): Promise<void> => {
  const familyIdArg = getArgValue('--familyId');
  if (!familyIdArg) {
    throw new Error('Please provide --familyId=<id> when running this script.');
  }
  const familyId = parseInt(familyIdArg, 10);
  if (Number.isNaN(familyId)) {
    throw new Error('Invalid family id provided to --familyId.');
  }

  const family = await prisma.family.findUnique({
    where: { FamilyID: familyId },
    include: { FamilyUsers: true },
  });

  if (!family) {
    throw new Error('Family not found for id ' + familyId);
  }

  if (!family.FamilyUsers.length) {
    throw new Error('Family ' + family.FamilyName + ' has no members. Add members before importing guidelines.');
  }

  const memberIds = ensureMembers(family.FamilyUsers.map(entry => entry.UserID), family.CreatedByUserID);

  await prisma.$transaction(async tx => {
    await tx.guidelineApproval.deleteMany({ where: { guideline: { FamilyID: familyId } } });
    await tx.familyGuideline.deleteMany({ where: { FamilyID: familyId } });

    await importMap(tx, BIGGERS_SAMPLE.values, {
      familyId,
      type: GuidelineType.VALUE,
      status: GuidelineStatus.ACTIVE,
      proposerId: family.CreatedByUserID,
      members: memberIds,
      activatedAt: toDateDaysAgo(120),
      proposedAt: toDateDaysAgo(125),
    });

    await importMap(tx, BIGGERS_SAMPLE.valuesUnderReview, {
      familyId,
      type: GuidelineType.VALUE,
      status: GuidelineStatus.UNDER_REVIEW,
      proposerId: family.CreatedByUserID,
      members: memberIds,
      activatedAt: null,
      proposedAt: new Date(),
    });

    await importMap(tx, BIGGERS_SAMPLE.rules, {
      familyId,
      type: GuidelineType.RULE,
      status: GuidelineStatus.ACTIVE,
      proposerId: family.CreatedByUserID,
      members: memberIds,
      activatedAt: toDateDaysAgo(45),
      proposedAt: toDateDaysAgo(50),
    });

    await importMap(tx, BIGGERS_SAMPLE.newRules, {
      familyId,
      type: GuidelineType.RULE,
      status: GuidelineStatus.ACTIVE,
      proposerId: family.CreatedByUserID,
      members: memberIds,
      activatedAt: new Date(),
      proposedAt: toDateDaysAgo(2),
    });
  });

  console.log('Imported ' + createdCount + ' guidelines for family ' + family.FamilyName + '.');
};

main()
  .catch(error => {
    console.error('Failed to import sample guidelines:', error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
