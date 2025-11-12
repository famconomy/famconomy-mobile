import { describe, expect, it } from 'vitest';
import {
  buildActivityFeed,
  mapEventPreview,
  mapTaskPreview,
  mapMessagePreview,
  mapMemberPreview,
  MAX_PREVIEW_ITEMS,
  type DashboardEventPreview,
  type DashboardTaskPreview,
  type DashboardMessagePreview,
  type DashboardMemberPreview,
} from '../dashboard';

const iso = (offsetMs: number): string => new Date(Date.now() + offsetMs).toISOString();

describe('dashboard preview helpers', () => {
  it('buildActivityFeed stitches events, tasks, messages, and members in recency order', () => {
    const events: DashboardEventPreview[] = [
      {
        eventId: 'event-1',
        title: 'Family dinner',
        startTime: iso(60_000),
      },
    ];

    const tasks: DashboardTaskPreview[] = [
      {
        taskId: 42,
        title: 'Clean room',
        status: 'in_progress',
        dueDate: iso(90_000),
      },
    ];

    const messages: DashboardMessagePreview[] = [
      {
        chatId: 'chat-1',
        chatName: 'Family Chat',
        lastMessageSnippet: 'See you soon!',
        unreadCount: 2,
        lastMessageAt: iso(120_000),
      },
      {
        chatId: 'chat-muted',
        chatName: 'Muted Chat',
        unreadCount: 0,
      },
    ];

    const members: DashboardMemberPreview[] = [
      {
        userId: 'user-77',
        fullName: 'Taylor Swift',
        role: 'parent',
        joinedAt: iso(-300_000),
      },
    ];

    const feed = buildActivityFeed(events, tasks, messages, members);

    expect(feed).toHaveLength(4);
    expect(feed[0].id).toBe('message-chat-1');
    expect(feed[0].type).toBe('message');
    expect(feed[1].type).toBe('task');
    expect(feed[1].title).toContain('Task in progress');
    expect(feed[2].type).toBe('event');
    expect(feed[3].type).toBe('member_joined');
  });

  it('map helpers pick the expected fields from raw records', () => {
    const event = mapEventPreview({
      eventId: 1,
      familyId: 2,
      title: 'Practice',
      startTime: iso(10_000),
      createdByUserId: 'abc',
      createdByName: 'Casey',
    } as any);
    expect(event.assignedToName).toBe('Casey');

    const task = mapTaskPreview({
      taskId: 3,
      title: 'Homework',
      status: 'pending',
      assignedToName: 'Alex',
    } as any);
    expect(task.assignedToName).toBe('Alex');

    const message = mapMessagePreview({
      id: 'chat-22',
      unreadCount: 5,
      lastMessage: { content: 'Hello', senderName: 'Jamie', timestamp: iso(5) },
    } as any);
    expect(message.chatName).toBe('Jamie');
    expect(message.lastMessageSnippet).toBe('Hello');

    const member = mapMemberPreview({
      UserID: 'user-1',
      FirstName: 'Chris',
      LastName: 'Pine',
      LastLogin: iso(-1000),
    });

    expect(member?.fullName).toBe('Chris Pine');
    expect(member?.lastActive).toBeDefined();
  });

  it('buildActivityFeed caps each preview group to MAX_PREVIEW_ITEMS before flattening', () => {
    const manyEvents = Array.from({ length: MAX_PREVIEW_ITEMS + 2 }, (_, index) =>
      mapEventPreview({
        eventId: index + 1,
        title: `Event ${index + 1}`,
        startTime: iso((index + 1) * 1_000),
      } as any),
    );

    const feed = buildActivityFeed(manyEvents, [], [], []);
    expect(feed.length).toBe(MAX_PREVIEW_ITEMS);
  });
});
