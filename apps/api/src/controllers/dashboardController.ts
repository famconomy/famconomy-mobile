import { Request, Response } from 'express';
import { prisma } from '../db';

const parseFamilyValues = (raw: string | null | undefined): string[] => {
  if (!raw) {
    return [];
  }
  try {
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) {
      return parsed
        .map((value) => (typeof value === 'string' ? value.trim() : ''))
        .filter(Boolean);
    }
  } catch (error) {
    // Ignore JSON parse errors and fall back to treating the raw string as a single value
  }
  const trimmed = raw.trim();
  return trimmed ? [trimmed] : [];
};

export const getDashboardData = async (req: Request, res: Response) => {
  const { familyId } = req.params;
  const familyIdInt = parseInt(familyId);

  try {
    const [upcomingEvents, pendingTasks, activeMembers, familyRecord] = await Promise.all([
      prisma.calendarEvents.count({
        where: {
          FamilyID: familyIdInt,
          StartTime: {
            gte: new Date(),
          },
        },
      }),
      prisma.task.count({
        where: {
          FamilyID: familyIdInt,
          TaskStatus: {
            StatusName: {
              not: 'Completed',
            },
          },
        },
      }),
      prisma.familyUsers.count({
        where: {
          FamilyID: familyIdInt,
        },
      }),
      prisma.family.findUnique({
        where: { FamilyID: familyIdInt },
        select: {
          FamilyName: true,
          FamilyMantra: true,
          FamilyValues: true,
        },
      }),
    ]);

    const leaderboardRaw = await prisma.task.groupBy({
      by: ['AssignedToUserID'],
      where: {
        FamilyID: familyIdInt,
        AssignedToUserID: {
          not: null,
        },
        TaskStatus: {
          StatusName: {
            in: ['Completed', 'completed', 'COMPLETE', 'complete'],
          },
        },
      },
      _count: {
        TaskID: true,
      },
      _sum: {
        RewardValue: true,
      },
    });

    const userIds = leaderboardRaw
      .map((entry) => entry.AssignedToUserID)
      .filter((id): id is string => typeof id === 'string' && id.length > 0);

    let leaderboard: Array<{ userId: string; fullName: string; completedTasks: number; totalPoints: number }> = [];

    if (userIds.length) {
      const users = await prisma.users.findMany({
        where: {
          UserID: {
            in: Array.from(new Set(userIds)),
          },
        },
        select: {
          UserID: true,
          FirstName: true,
          LastName: true,
        },
      });

      const userMap = new Map(users.map((user) => [user.UserID, user]));

      leaderboard = leaderboardRaw
        .map((entry) => {
          const userId = entry.AssignedToUserID as string | null;
          if (!userId) {
            return null;
          }
          const user = userMap.get(userId);
          const fullName = user ? `${user.FirstName ?? ''} ${user.LastName ?? ''}`.trim() || user.FirstName || 'Family Member' : 'Family Member';
          const totalPoints = Number(entry._sum.RewardValue ?? 0);
          return {
            userId,
            fullName,
            completedTasks: entry._count.TaskID,
            totalPoints,
          };
        })
        .filter((entry): entry is { userId: string; fullName: string; completedTasks: number; totalPoints: number } => Boolean(entry))
        .sort((a, b) => {
          if (b.completedTasks !== a.completedTasks) {
            return b.completedTasks - a.completedTasks;
          }
          return b.totalPoints - a.totalPoints;
        })
        .slice(0, 5);
    }

    // This is a placeholder, as unread messages are not tracked yet.
    const unreadMessages = 0;

    res.json({
      upcomingEvents,
      pendingTasks,
      unreadMessages,
      activeMembers,
      familyName: familyRecord?.FamilyName ?? null,
      familyMantra: familyRecord?.FamilyMantra ?? null,
      familyValues: parseFamilyValues(familyRecord?.FamilyValues),
      leaderboard,
    });
  } catch (err: any) {
    res.status(500).json({ message: 'Failed to fetch dashboard data', error: err.message });
  }
};
