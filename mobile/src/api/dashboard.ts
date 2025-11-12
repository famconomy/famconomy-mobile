import { apiClient } from './client';
import { getCalendarEvents } from './calendar';
import { getTasks } from './tasks';
import { getChats } from './messages';
import type {
  CalendarEvent,
  Task,
  Chat,
} from '../types';

export interface LeaderboardEntry {
  userId: string;
  userName: string;
  points: number;
  rank: number;
  avatar?: string;
}

export interface DashboardEventPreview {
  eventId: string;
  title: string;
  startTime: string;
  endTime?: string;
  location?: string;
  assignedToName?: string;
}

export interface DashboardTaskPreview {
  taskId: number;
  title: string;
  dueDate?: string;
  assignedToName?: string;
  priority?: Task['priority'];
  status: Task['status'];
}

export interface DashboardMessagePreview {
  chatId: string;
  chatName: string;
  lastMessageSnippet?: string;
  lastMessageSender?: string;
  unreadCount: number;
  lastMessageAt?: string;
}

export interface DashboardMemberPreview {
  userId: string;
  fullName?: string;
  role?: string;
  avatar?: string;
  joinedAt?: string;
  lastActive?: string;
}

export interface ActivityItem {
  id: string;
  type: 'event' | 'task' | 'message' | 'member_joined';
  title: string;
  description?: string;
  actor?: string;
  timestamp: string;
  icon?: string;
}

export const MAX_PREVIEW_ITEMS = 3;

const toIsoString = (value?: string | null): string | undefined => {
  if (!value) return undefined;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return undefined;
  }
  return date.toISOString();
};

export const mapEventPreview = (event: CalendarEvent): DashboardEventPreview => ({
  eventId: String(event.eventId ?? event.title ?? Math.random().toString(36)),
  title: event.title || 'Upcoming event',
  startTime: event.startTime,
  endTime: event.endTime,
  location: event.location,
  assignedToName: event.assignedToName ?? event.createdByName,
});

export const mapTaskPreview = (task: Task): DashboardTaskPreview => ({
  taskId: Number(task.taskId),
  title: task.title,
  dueDate: task.dueDate,
  assignedToName: task.assignedToName ?? task.createdByName,
  priority: task.priority,
  status: task.status,
});

export const mapMessagePreview = (chat: Chat): DashboardMessagePreview => {
  const participantFallback = chat.participants?.length
    ? `Chat with ${chat.participants.length > 1 ? `${chat.participants.length} members` : '1 member'}`
    : 'Family chat';
  const chatName = chat.name || chat.lastMessage?.senderName || participantFallback;
  const snippet = chat.lastMessage?.content ?? undefined;
  return {
    chatId: chat.id,
    chatName,
    lastMessageSnippet: snippet,
    lastMessageSender: chat.lastMessage?.senderName,
    unreadCount: chat.unreadCount ?? 0,
    lastMessageAt: chat.lastMessage?.timestamp ?? chat.lastMessageTime,
  };
};

export const mapMemberPreview = (member: any): DashboardMemberPreview | null => {
  const userId = member?.UserID ?? member?.userId ?? member?.id;
  if (!userId) return null;
  const first = member?.firstName ?? member?.FirstName ?? '';
  const last = member?.lastName ?? member?.LastName ?? '';
  const composedName = member?.fullName ??
    [first, last].filter(Boolean).join(' ').trim();
  const fullName = composedName?.length ? composedName : undefined;
  const roleRaw = member?.role ?? member?.RoleName ?? member?.RelationshipName;
  const joinedAt = member?.CreatedDate ?? member?.joinedAt ?? member?.JoinedAt;
  const lastActive = member?.LastLogin ?? member?.lastActive ?? member?.LastSeen;

  return {
    userId: String(userId),
    fullName,
    role: roleRaw ? String(roleRaw).toLowerCase() : undefined,
    avatar: member?.ProfilePhotoUrl ?? member?.avatar ?? undefined,
    joinedAt: toIsoString(joinedAt),
    lastActive: toIsoString(lastActive),
  };
};

export const buildActivityFeed = (
  events: DashboardEventPreview[],
  tasks: DashboardTaskPreview[],
  messages: DashboardMessagePreview[],
  members: DashboardMemberPreview[],
): ActivityItem[] => {
  const nowIso = new Date().toISOString();
  const items: ActivityItem[] = [];

  events.slice(0, MAX_PREVIEW_ITEMS).forEach((event) => {
    items.push({
      id: `event-${event.eventId}`,
      type: 'event',
      title: event.title,
      description: event.location,
      actor: event.assignedToName,
      timestamp: event.startTime ?? nowIso,
    });
  });

  tasks.slice(0, MAX_PREVIEW_ITEMS).forEach((task) => {
    const baseTitle =
      task.status === 'completed'
        ? `Task completed: ${task.title}`
        : task.status === 'in_progress'
        ? `Task in progress: ${task.title}`
        : `Task pending: ${task.title}`;
    items.push({
      id: `task-${task.taskId}`,
      type: 'task',
      title: baseTitle,
      description: task.assignedToName ? `Assigned to ${task.assignedToName}` : undefined,
      actor: task.assignedToName,
      timestamp: task.dueDate ?? nowIso,
    });
  });

  messages.slice(0, MAX_PREVIEW_ITEMS).forEach((message) => {
    if (!message.unreadCount && !message.lastMessageSnippet) {
      return;
    }
    items.push({
      id: `message-${message.chatId}`,
      type: 'message',
      title: message.chatName,
      description: message.lastMessageSnippet,
      actor: message.lastMessageSender,
      timestamp: message.lastMessageAt ?? nowIso,
    });
  });

  members
    .filter((member) => member.joinedAt)
    .slice(0, MAX_PREVIEW_ITEMS)
    .forEach((member) => {
      items.push({
        id: `member-${member.userId}`,
        type: 'member_joined',
        title: `${member.fullName ?? 'New member'} joined`,
        description: member.role ? `Role: ${member.role}` : undefined,
        actor: member.fullName,
        timestamp: member.joinedAt ?? nowIso,
      });
    });

  return items
    .filter((item) => Boolean(item.timestamp))
    .sort((a, b) => {
      const aTime = new Date(a.timestamp).getTime();
      const bTime = new Date(b.timestamp).getTime();
      return bTime - aTime;
    })
    .slice(0, 10);
};

export const normalizeLeaderboard = (rawLeaderboard: any): LeaderboardEntry[] => {
  if (!Array.isArray(rawLeaderboard)) {
    return [];
  }
  return rawLeaderboard
    .map((entry: any, idx: number) => ({
      userId: String(entry.userId ?? entry.UserID ?? ''),
      userName: String(entry.userName ?? entry.fullName ?? 'Family Member'),
      points: Number(entry.points ?? entry.totalPoints ?? 0),
      rank: Number(entry.rank ?? idx + 1),
      avatar: entry.avatar ?? entry.profilePhotoUrl ?? undefined,
    }))
    .filter((entry: LeaderboardEntry) => Boolean(entry.userId));
};

const fetchFamilyMemberPreviews = async (familyId: string): Promise<DashboardMemberPreview[]> => {
  try {
    const response = await apiClient.get('/family');
  const families: any[] = (response.data && (response.data as any).families) ?? [];
    if (!Array.isArray(families)) {
      return [];
    }
    const familyRecord = families.find((fam: any) => {
      const id = fam?.FamilyID ?? fam?.id ?? fam?.familyId;
      return String(id) === String(familyId);
    });
    if (!familyRecord) {
      return [];
    }
    const membersSource = familyRecord.members ?? familyRecord.FamilyUsers ?? [];
    return membersSource
      .map(mapMemberPreview)
      .filter((member: DashboardMemberPreview | null): member is DashboardMemberPreview => Boolean(member));
  } catch (error) {
    console.warn('Failed to fetch family member previews for dashboard:', error);
    return [];
  }
};

export interface DashboardResponse {
  upcomingEvents: number;
  pendingTasks: number;
  unreadMessages: number;
  activeMembers: number;
  familyName?: string;
  familyMantra?: string;
  familyValues: string[];
  leaderboard: LeaderboardEntry[];
  recentActivity: ActivityItem[];
  upcomingEventPreviews?: DashboardEventPreview[];
  pendingTaskPreviews?: DashboardTaskPreview[];
  unreadMessagePreviews?: DashboardMessagePreview[];
  activeMemberPreviews?: DashboardMemberPreview[];
}

/**
 * Fetch dashboard data for the current family
 */
export const getDashboardData = async (familyId: string | number): Promise<DashboardResponse> => {
  try {
    const familyIdString = String(familyId);
    // Backend expects path parameter: GET /dashboard/:familyId
    const response = await apiClient.get<any>(`/dashboard/${familyIdString}`);
    const raw = response.data || {};

    const [
      eventsResult,
      tasksResult,
      chatsResult,
      membersResult,
    ] = await Promise.allSettled([
      getCalendarEvents(familyIdString),
      getTasks(familyIdString),
      getChats(familyIdString),
      fetchFamilyMemberPreviews(familyIdString),
    ]);

    const events: CalendarEvent[] =
      eventsResult.status === 'fulfilled' ? eventsResult.value : [];
    const tasks: Task[] =
      tasksResult.status === 'fulfilled' ? tasksResult.value.tasks ?? [] : [];
    const chats: Chat[] =
      chatsResult.status === 'fulfilled' ? chatsResult.value : [];
    const memberPreviews: DashboardMemberPreview[] =
      membersResult.status === 'fulfilled' ? membersResult.value : [];

    const upcomingEventCandidates = events
      .map(mapEventPreview)
      .filter((event) => {
        const time = new Date(event.startTime).getTime();
        if (Number.isNaN(time)) {
          return false;
        }
        const threshold = Date.now() - 6 * 60 * 60 * 1000; // include events within last 6 hours
        return time >= threshold;
      })
      .sort(
        (a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime(),
      );
    const upcomingEventPreviews = upcomingEventCandidates.slice(0, MAX_PREVIEW_ITEMS);

    const pendingTaskCandidates = tasks.filter((task) => task.status !== 'completed');
    const pendingTaskPreviews = pendingTaskCandidates
      .sort((a, b) => {
        const aTime = a.dueDate ? new Date(a.dueDate).getTime() : Number.MAX_SAFE_INTEGER;
        const bTime = b.dueDate ? new Date(b.dueDate).getTime() : Number.MAX_SAFE_INTEGER;
        return aTime - bTime;
      })
      .map(mapTaskPreview)
      .slice(0, MAX_PREVIEW_ITEMS);

    const unreadMessagePreviews = chats
      .map(mapMessagePreview)
      .filter((preview) => preview.unreadCount > 0)
      .sort((a, b) => {
        const aTime = a.lastMessageAt ? new Date(a.lastMessageAt).getTime() : 0;
        const bTime = b.lastMessageAt ? new Date(b.lastMessageAt).getTime() : 0;
        return bTime - aTime;
      })
      .slice(0, MAX_PREVIEW_ITEMS);

    const totalUnreadMessages = chats.reduce(
      (count, chat) => count + (chat.unreadCount ?? 0),
      0,
    );

    const normalizedLeaderboard = normalizeLeaderboard(raw.leaderboard);

    const activityFeed = buildActivityFeed(
      upcomingEventPreviews,
      pendingTaskPreviews,
      unreadMessagePreviews,
      memberPreviews,
    );

    const uniqueFamilyValues: string[] = Array.isArray(raw.familyValues)
      ? Array.from(
          new Set(
            raw.familyValues
              .map((value: unknown) =>
                typeof value === 'string' ? value.trim() : '',
              )
              .filter((v: any): v is string => typeof v === 'string' && Boolean(v)),
          ),
        )
      : [];

    const pendingTasksCount =
      Number(raw.pendingTasks ?? pendingTaskCandidates.length ?? 0);
    const upcomingEventsCount =
      Number(raw.upcomingEvents ?? upcomingEventCandidates.length ?? 0);
    const activeMembersCount =
      Number(raw.activeMembers ?? memberPreviews.length ?? 0);

    return {
      upcomingEvents: upcomingEventsCount,
      pendingTasks: pendingTasksCount,
      unreadMessages: Number(raw.unreadMessages ?? totalUnreadMessages ?? 0),
      activeMembers: activeMembersCount,
      familyName: raw.familyName ?? undefined,
      familyMantra: raw.familyMantra ?? undefined,
      familyValues: uniqueFamilyValues,
      leaderboard: normalizedLeaderboard,
      recentActivity:
        Array.isArray(raw.recentActivity) && raw.recentActivity.length
          ? raw.recentActivity
          : activityFeed,
      upcomingEventPreviews,
      pendingTaskPreviews,
      unreadMessagePreviews,
      activeMemberPreviews: memberPreviews,
    };
  } catch (error) {
    throw handleDashboardError(error);
  }
};

/**
 * Fetch only dashboard stats (lightweight)
 */
// Note: Backend does not expose a separate stats endpoint yet.
// If needed, re-fetch the full dashboard data and derive stats from it.

/**
 * Fetch recent activity for dashboard
 */
export const getRecentActivity = async (familyId: string, limit: number = 10): Promise<ActivityItem[]> => {
  try {
    const response = await apiClient.get<ActivityItem[]>(`/dashboard/activity?familyId=${familyId}&limit=${limit}`);
    return response.data;
  } catch (error) {
    throw handleDashboardError(error);
  }
};

/**
 * Fetch leaderboard for family
 */
export const getLeaderboard = async (familyId: string, limit: number = 10): Promise<LeaderboardEntry[]> => {
  try {
    const response = await apiClient.get<LeaderboardEntry[]>(`/dashboard/leaderboard?familyId=${familyId}&limit=${limit}`);
    return response.data;
  } catch (error) {
    throw handleDashboardError(error);
  }
};

function handleDashboardError(error: any): Error {
  if (error.response?.data?.error) {
    return new Error(error.response.data.error);
  }
  if (error.response?.status === 404) {
    return new Error('Family not found');
  }
  if (error.message) {
    return new Error(error.message);
  }
  return new Error('Failed to load dashboard data');
}
