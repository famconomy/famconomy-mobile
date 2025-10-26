# Quick Reference: Using @famconomy/shared

## Import Types

```typescript
import {
  // Types
  Task,
  TaskStatus,
  User,
  UserRole,
  UserStatus,
  Family,
  FamilyMember,
  FamilyInvite,
  Message,
  Chat,
  ScreenTime,
  Gig,
  Room,
  ShoppingList,
  ShoppingListItem,
  Recipe,
  Meal,
  Wishlist,
  WishlistItem,
  Guideline,
  Budget,
  SavingsGoal,
} from '@famconomy/shared';
```

## Use API Clients

### Tasks
```typescript
import { taskClient } from '@famconomy/shared';

// Get all tasks for a family
const tasks = await taskClient.getAll(familyId);

// Get specific task
const task = await taskClient.getById(taskId);

// Create a new task
const newTask = await taskClient.create({
  title: 'Clean room',
  description: 'Clean your bedroom',
  familyId,
  status: 'pending',
});

// Update task
const updated = await taskClient.update(taskId, {
  status: 'completed',
});

// Approve task
await taskClient.approve(taskId, approvalStatusId);

// Upload attachment
await taskClient.uploadAttachment(taskId, file);

// Delete task
await taskClient.delete(taskId);
```

### Family Management
```typescript
import { familyClient } from '@famconomy/shared';

// Get family
const family = await familyClient.get(familyId);

// Get members
const members = await familyClient.getMembers(familyId);

// Add member
const member = await familyClient.addMember(familyId, userId, 'child');

// Remove member
await familyClient.removeMember(familyId, userId);

// Send invitation
const invite = await familyClient.sendInvite(familyId, 'email@example.com', 'child');

// Accept invitation
await familyClient.acceptInvite(inviteId);

// Decline invitation
await familyClient.declineInvite(inviteId);
```

### Messages
```typescript
import { messageClient } from '@famconomy/shared';

// Get all chats
const chats = await messageClient.getChats(familyId);

// Get specific chat
const chat = await messageClient.getChat(chatId);

// Get messages
const messages = await messageClient.getMessages(chatId, 50, 0);

// Send message
const message = await messageClient.sendMessage(chatId, 'Hello!', 'text');

// Mark as read
await messageClient.markAsRead(messageId);

// Delete message
await messageClient.deleteMessage(messageId);
```

### Screen Time
```typescript
import { screenTimeClient } from '@famconomy/shared';

// Get all screen time for family
const screenTimes = await screenTimeClient.getAll(familyId);

// Get user's screen time
const userScreenTime = await screenTimeClient.getByUser(userId);

// Record screen time
const record = await screenTimeClient.create({
  userId,
  familyId,
  appName: 'YouTube',
  duration: 30,
  date: new Date(),
});

// Delete record
await screenTimeClient.delete(screenTimeId);
```

## Use in React Components

```typescript
import { useEffect, useState } from 'react';
import { Task, taskClient } from '@famconomy/shared';

export function TaskList({ familyId }: { familyId: string }) {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    taskClient.getAll(familyId)
      .then(setTasks)
      .finally(() => setLoading(false));
  }, [familyId]);

  if (loading) return <div>Loading...</div>;

  return (
    <ul>
      {tasks.map(task => (
        <li key={task.id}>{task.title}</li>
      ))}
    </ul>
  );
}
```

## Use in Custom Hooks

```typescript
import { useEffect, useState } from 'react';
import { Task, taskClient } from '@famconomy/shared';

export function useFamilyTasks(familyId: string) {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    taskClient.getAll(familyId)
      .then(setTasks)
      .catch(setError)
      .finally(() => setLoading(false));
  }, [familyId]);

  return { tasks, loading, error };
}

// Usage in component
export function TasksPage() {
  const { tasks, loading } = useFamilyTasks('family-123');
  
  if (loading) return <div>Loading...</div>;
  
  return <div>{tasks.map(t => t.title)}</div>;
}
```

## Common Type Patterns

### Check task status
```typescript
if (task.status === 'completed') {
  // Task is done
}

// Available statuses
type TaskStatus = 'pending' | 'assigned' | 'in_progress' | 'completed' | 'approved';
```

### Check user role
```typescript
if (user.role === 'parent') {
  // Show parent features
}

// Available roles
type UserRole = 'admin' | 'parent' | 'child' | 'guardian';
```

### Type-safe API calls with TypeScript
```typescript
import { Task, taskClient } from '@famconomy/shared';

const task: Task = await taskClient.create({
  title: 'New task',
  familyId: 'fam-123',
  status: 'pending', // TypeScript ensures valid status
});

// This would error:
// status: 'invalid' // ❌ Error: Type '"invalid"' is not assignable to type 'TaskStatus'
```

## Base URL Configuration

The API client uses these environment variables:
- `REACT_APP_API_URL` (for React apps)
- `API_URL` (fallback)
- Defaults to `http://localhost:3000/api`

Set in `.env`:
```
REACT_APP_API_URL=https://api.example.com
```

## Authentication

The API client automatically adds authorization headers from localStorage:
```typescript
// Automatically included in all requests
const token = localStorage.getItem('authToken');
// Sent as: Authorization: Bearer {token}
```

Make sure to set the token after login:
```typescript
localStorage.setItem('authToken', token);
```

## Error Handling

```typescript
import { taskClient } from '@famconomy/shared';

try {
  const tasks = await taskClient.getAll(familyId);
} catch (error) {
  if (error.response?.status === 401) {
    // Unauthorized - redirect to login
  } else if (error.response?.status === 404) {
    // Not found
  } else {
    // Other error
  }
}
```
