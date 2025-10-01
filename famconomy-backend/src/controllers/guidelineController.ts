import { Request, Response } from 'express';
import { prisma } from '../db';

const NEW_RULE_WINDOW_DAYS = parseInt(process.env.NEW_RULE_WINDOW_DAYS ?? '21', 10);

const ensureFamilyMembership = async (familyId: number, userId: string) => {
  const membership = await prisma.familyUsers.findFirst({
    where: { FamilyID: familyId, UserID: userId },
  });

  if (!membership) {
    const error = new Error('ACCESS_DENIED');
    (error as any).statusCode = 403;
    throw error;
  }
};

const serializeGuideline = (row: any) => {
  return {
    GuidelineID: row.GuidelineID,
    FamilyID: row.FamilyID,
    Type: row.Type,
    Title: row.Title,
    Description: row.Description,
    ParentID: row.ParentID,
    Status: row.Status,
    ProposedByUserID: row.ProposedByUserID,
    ProposedBy: row.proposedBy
      ? {
          UserID: row.proposedBy.UserID,
          FirstName: row.proposedBy.FirstName,
          LastName: row.proposedBy.LastName,
          Email: row.proposedBy.Email,
        }
      : null,
    ProposedAt: row.ProposedAt?.toISOString?.() ?? row.ProposedAt,
    ActivatedAt: row.ActivatedAt ? row.ActivatedAt.toISOString() : null,
    ExpiresAt: row.ExpiresAt ? row.ExpiresAt.toISOString() : null,
    Metadata: row.Metadata ?? null,
    approvals: row.approvals?.map((approval: any) => ({
      GuidelineID: approval.GuidelineID,
      UserID: approval.UserID,
      Approved: approval.Approved,
      ApprovedAt: approval.ApprovedAt ? approval.ApprovedAt.toISOString() : null,
      User: approval.user
        ? {
            UserID: approval.user.UserID,
            FirstName: approval.user.FirstName,
            LastName: approval.user.LastName,
            Email: approval.user.Email,
          }
        : null,
    })) ?? [],
    children: [] as any[],
  };
};

const buildTree = (rows: any[]) => {
  const nodes = new Map<number, any>();
  rows.forEach(row => {
    nodes.set(row.GuidelineID, serializeGuideline(row));
  });
  const roots: any[] = [];
  nodes.forEach(node => {
    if (node.ParentID && nodes.has(node.ParentID)) {
      nodes.get(node.ParentID).children.push(node);
    } else {
      roots.push(node);
    }
  });
  const sortRecursive = (items: any[]) => {
    items.sort((a, b) => a.Title.localeCompare(b.Title));
    items.forEach(child => sortRecursive(child.children));
  };
  sortRecursive(roots);
  return roots;
};

const maybeActivateGuideline = async (guidelineId: number) => {
  const guideline = await prisma.familyGuideline.findUnique({
    where: { GuidelineID: guidelineId },
    include: { approvals: true },
  });
  if (!guideline) return;
  if (guideline.Status === 'ACTIVE' || guideline.Status === 'RETIRED') return;
  const allApproved = guideline.approvals.length > 0 && guideline.approvals.every(entry => entry.Approved);
  if (allApproved) {
    const activatedAt = new Date();
    await prisma.familyGuideline.update({
      where: { GuidelineID: guidelineId },
      data: {
        Status: 'ACTIVE',
        ActivatedAt: activatedAt,
        ExpiresAt: guideline.Type === 'RULE' ? new Date(activatedAt.getTime() + NEW_RULE_WINDOW_DAYS * 24 * 60 * 60 * 1000) : null,
      },
    });
  }
};

const guidelineInclude = {
  approvals: {
    include: {
      user: {
        select: {
          UserID: true,
          FirstName: true,
          LastName: true,
          Email: true,
        },
      },
    },
  },
  proposedBy: {
    select: {
      UserID: true,
      FirstName: true,
      LastName: true,
      Email: true,
    },
  },
};

const guidelineResponse = (rows: any[], type: string) => {
  const activeRows = rows.filter(row => row.Status === 'ACTIVE');
  const underReviewRows = rows.filter(row => row.Status === 'UNDER_REVIEW');

  const activeTree = buildTree(activeRows);
  const underReviewTree = buildTree(underReviewRows);

  const payload: any = {
    active: activeTree,
    underReview: underReviewTree,
  };

  if (type === 'RULE') {
    const cutoff = new Date(Date.now() - NEW_RULE_WINDOW_DAYS * 24 * 60 * 60 * 1000);
    const newRuleRows = activeRows.filter(row => row.ActivatedAt && row.ActivatedAt > cutoff);
    if (newRuleRows.length) {
      payload.newRules = buildTree(newRuleRows);
    }
  }

  return payload;
};

export const listGuidelines = async (req: Request & { userId?: string }, res: Response) => {
  try {
    const userId = req.userId;
    if (!userId) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    const familyId = parseInt(req.params.familyId, 10);
    if (Number.isNaN(familyId)) {
      return res.status(400).json({ message: 'Invalid family id' });
    }

    await ensureFamilyMembership(familyId, userId);

    const typeParam = (req.query.type as string | undefined)?.toUpperCase() ?? 'VALUE';
    const type = typeParam === 'RULE' ? 'RULE' : 'VALUE';

    const rows = await prisma.familyGuideline.findMany({
      where: { FamilyID: familyId, Type: type },
      include: guidelineInclude,
      orderBy: [{ ParentID: 'asc' }, { Title: 'asc' }],
    });

    res.json(guidelineResponse(rows, type));
  } catch (error: any) {
    const status = error?.statusCode || 500;
    res.status(status).json({ message: error?.message || 'Failed to load guidelines' });
  }
};

export const createGuideline = async (req: Request & { userId?: string }, res: Response) => {
  try {
    const userId = req.userId;
    if (!userId) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    const familyId = parseInt(req.params.familyId, 10);
    if (Number.isNaN(familyId)) {
      return res.status(400).json({ message: 'Invalid family id' });
    }

    await ensureFamilyMembership(familyId, userId);

    const { type, title, description, parentId, metadata } = req.body ?? {};
    if (type !== 'VALUE' && type !== 'RULE') {
      return res.status(400).json({ message: 'Guideline type is required' });
    }
    if (!title || typeof title !== 'string' || !title.trim()) {
      return res.status(400).json({ message: 'Title is required' });
    }

    let validatedParent: number | null = null;
    if (parentId !== undefined && parentId !== null) {
      const parentGuideline = await prisma.familyGuideline.findUnique({ where: { GuidelineID: Number(parentId) } });
      if (!parentGuideline || parentGuideline.FamilyID !== familyId || parentGuideline.Type !== type) {
        return res.status(400).json({ message: 'Parent guideline is invalid' });
      }
      validatedParent = parentGuideline.GuidelineID;
    }

    const result = await prisma.$transaction(async tx => {
      const guideline = await tx.familyGuideline.create({
        data: {
          FamilyID: familyId,
          Type: type,
          Title: title.trim(),
          Description: description?.trim() || null,
          ParentID: validatedParent,
          ProposedByUserID: userId,
          Metadata: metadata ?? null,
        },
      });

      const members = await tx.familyUsers.findMany({
        where: { FamilyID: familyId },
        select: { UserID: true },
      });

      if (members.length) {
        await tx.guidelineApproval.createMany({
          data: members.map(member => ({
            GuidelineID: guideline.GuidelineID,
            UserID: member.UserID,
            Approved: member.UserID === userId,
            ApprovedAt: member.UserID === userId ? new Date() : null,
          })),
        });
      }

      return guideline;
    });

    await maybeActivateGuideline(result.GuidelineID);

    const payload = await prisma.familyGuideline.findUnique({
      where: { GuidelineID: result.GuidelineID },
      include: guidelineInclude,
    });

    res.status(201).json(serializeGuideline(payload));
  } catch (error: any) {
    const status = error?.statusCode || 500;
    res.status(status).json({ message: error?.message || 'Failed to create guideline' });
  }
};

export const approveGuideline = async (req: Request & { userId?: string }, res: Response) => {
  try {
    const userId = req.userId;
    if (!userId) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    const familyId = parseInt(req.params.familyId, 10);
    const guidelineId = parseInt(req.params.guidelineId, 10);
    const { approved } = req.body ?? {};

    if (Number.isNaN(familyId) || Number.isNaN(guidelineId)) {
      return res.status(400).json({ message: 'Invalid identifier' });
    }

    await ensureFamilyMembership(familyId, userId);

    const guideline = await prisma.familyGuideline.findUnique({ where: { GuidelineID: guidelineId } });
    if (!guideline || guideline.FamilyID !== familyId) {
      return res.status(404).json({ message: 'Guideline not found' });
    }

    await prisma.guidelineApproval.update({
      where: {
        GuidelineID: guidelineId,
        UserID: userId,
      },
      data: {
        Approved: Boolean(approved),
        ApprovedAt: Boolean(approved) ? new Date() : null,
      },
    });

    await maybeActivateGuideline(guidelineId);

    const refreshed = await prisma.familyGuideline.findUnique({
      where: { GuidelineID: guidelineId },
      include: guidelineInclude,
    });

    res.json(serializeGuideline(refreshed));
  } catch (error: any) {
    const status = error?.statusCode || 500;
    res.status(status).json({ message: error?.message || 'Failed to update approval' });
  }
};

export const updateGuideline = async (req: Request & { userId?: string }, res: Response) => {
  try {
    const userId = req.userId;
    if (!userId) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    const familyId = parseInt(req.params.familyId, 10);
    const guidelineId = parseInt(req.params.guidelineId, 10);
    if (Number.isNaN(familyId) || Number.isNaN(guidelineId)) {
      return res.status(400).json({ message: 'Invalid identifier' });
    }

    await ensureFamilyMembership(familyId, userId);

    const guideline = await prisma.familyGuideline.findUnique({ where: { GuidelineID: guidelineId } });
    if (!guideline || guideline.FamilyID !== familyId) {
      return res.status(404).json({ message: 'Guideline not found' });
    }

    const { title, description, metadata, status, parentId } = req.body ?? {};
    const updateData: any = {};

    if (title !== undefined) {
      if (typeof title !== 'string' || !title.trim()) {
        return res.status(400).json({ message: 'Invalid title' });
      }
      updateData.Title = title.trim();
    }

    if (description !== undefined) {
      updateData.Description = typeof description === 'string' ? description.trim() || null : null;
    }

    if (metadata !== undefined) {
      updateData.Metadata = metadata ?? null;
    }

    if (status === 'RETIRED' || status === 'ACTIVE') {
      updateData.Status = status;
      if (status === 'ACTIVE' && !guideline.ActivatedAt) {
        const now = new Date();
        updateData.ActivatedAt = now;
        updateData.ExpiresAt = guideline.Type === 'RULE' ? new Date(now.getTime() + NEW_RULE_WINDOW_DAYS * 24 * 60 * 60 * 1000) : null;
      }
    }

    if (parentId !== undefined) {
      if (parentId === null || parentId === '') {
        updateData.ParentID = null;
      } else {
        const parentGuideline = await prisma.familyGuideline.findUnique({ where: { GuidelineID: Number(parentId) } });
        if (!parentGuideline || parentGuideline.FamilyID !== familyId || parentGuideline.Type !== guideline.Type || parentGuideline.GuidelineID === guidelineId) {
          return res.status(400).json({ message: 'Invalid parent guideline' });
        }
        updateData.ParentID = parentGuideline.GuidelineID;
      }
    }

    await prisma.familyGuideline.update({
      where: { GuidelineID: guidelineId },
      data: updateData,
    });

    if (status === 'ACTIVE') {
      await maybeActivateGuideline(guidelineId);
    }

    const refreshed = await prisma.familyGuideline.findUnique({
      where: { GuidelineID: guidelineId },
      include: guidelineInclude,
    });

    res.json(serializeGuideline(refreshed));
  } catch (error: any) {
    const status = error?.statusCode || 500;
    res.status(status).json({ message: error?.message || 'Failed to update guideline' });
  }
};
