# FamConomy iOS - Feature Implementation Roadmap

## Overview
This document maps all features from the web app that need to be implemented on iOS, organized by priority and complexity.

---

## ✅ COMPLETED (Foundation Only)

### Navigation & Basic Structure
- Root navigation with Auth/Main flows
- Tab-based navigation (5 tabs)
- Stack navigation for detail screens
- Screen placeholder templates
- Theme system with dark mode support

### Authentication
- Login screen UI
- SignUp screen UI
- Forgot password screen UI
- Auth state management
- Token persistence

### UI Components
- Button, Card, Input, Text, Alert, LoadingSpinner
- Header component
- Theme system

---

## 🚧 PHASE 1: CRITICAL FEATURES (Weeks 1-3)

These are the core features that make the app functional for daily use.

### 1. Dashboard Screen [8-12 hours]
**Status**: Placeholder screen exists, needs API integration

**Tasks**:
- [ ] Fetch DashboardData from API endpoint
- [ ] Display welcome message with user name
- [ ] Show family name and mantra
- [ ] Display widget stats:
  - [ ] Upcoming events count
  - [ ] Pending tasks count
  - [ ] Unread messages count
  - [ ] Active family members count
- [ ] Display family values carousel (rotating)
- [ ] Show recent activity feed
- [ ] Add loading states and error handling
- [ ] Implement refresh/pull-to-refresh

**API Endpoints Needed**:
- `GET /api/dashboard/{familyId}`

**Files to Modify**:
- `src/screens/main/DashboardScreen.tsx`
- Create `src/api/dashboard.ts`

---

### 2. Authentication Flow [10-14 hours]
**Status**: UI only, no API integration

**Tasks**:
- [ ] Implement login API call
- [ ] Implement signup API call
- [ ] Implement password reset flow
- [ ] Add form validation
- [ ] Add error messages
- [ ] Implement "remember me" functionality
- [ ] Handle session expiration
- [ ] Add Google OAuth integration
- [ ] Add Apple OAuth integration

**API Endpoints Needed**:
- `POST /api/auth/login` - Email/password login
- `POST /api/auth/signup` - Create account
- `POST /api/auth/forgot-password` - Reset password
- `POST /api/auth/reset-password` - Complete reset
- `POST /api/auth/refresh-token` - Token refresh

**Files to Modify**:
- `src/screens/auth/LoginScreen.tsx`
- `src/screens/auth/SignUpScreen.tsx`
- `src/screens/auth/ForgotPasswordScreen.tsx`
- Create `src/api/auth.ts`
- Update `src/store/authStore.ts`

---

### 3. Family Management [12-16 hours]
**Status**: Placeholder screen with member list

**Tasks**:
- [ ] Fetch family data and members
- [ ] Display family name and settings
- [ ] Show all family members with roles
- [ ] Implement invite member workflow
- [ ] Show pending invitations
- [ ] Accept/decline invitations
- [ ] Remove family members
- [ ] Edit family settings (name, mantra, values)
- [ ] Display member profiles
- [ ] Add member avatars

**API Endpoints Needed**:
- `GET /api/family/{familyId}` - Get family data
- `GET /api/family/{familyId}/members` - List members
- `POST /api/family/{familyId}/invite` - Send invite
- `GET /api/family/invitations` - List pending invites
- `POST /api/family/invitations/{id}/accept` - Accept invite
- `DELETE /api/family/invitations/{id}` - Decline invite
- `DELETE /api/family/{familyId}/members/{userId}` - Remove member
- `PUT /api/family/{familyId}/settings` - Update family settings

**Files to Modify**:
- `src/screens/main/FamilyScreen.tsx`
- `src/screens/details/MemberProfileScreen.tsx`
- Create `src/api/family.ts`
- Create modals for invite/settings

---

### 4. Tasks Management [14-18 hours]
**Status**: Placeholder screen with filter tabs

**Tasks**:
- [ ] Fetch tasks from API
- [ ] Display tasks by status (pending, in_progress, completed)
- [ ] Implement task creation modal
- [ ] Implement task editing
- [ ] Implement task completion workflow
- [ ] Show task details (title, description, due date, assignee, reward)
- [ ] Support task categories (chores, homework, shopping, activities)
- [ ] Display reward information
- [ ] Add recurring task support
- [ ] Show task attachments
- [ ] Add task filters and search

**API Endpoints Needed**:
- `GET /api/tasks?familyId={id}&status={status}` - List tasks
- `GET /api/tasks/{taskId}` - Get task details
- `POST /api/tasks` - Create task
- `PUT /api/tasks/{taskId}` - Update task
- `PATCH /api/tasks/{taskId}/status` - Change status
- `DELETE /api/tasks/{taskId}` - Delete task
- `POST /api/tasks/{taskId}/attachments` - Add attachment

**Files to Modify**:
- `src/screens/main/TasksScreen.tsx`
- `src/screens/details/TaskDetailsScreen.tsx`
- Create `src/api/tasks.ts`
- Create task creation/edit modals
- Create task detail component

---

### 5. Messages/Chat [16-20 hours]
**Status**: Placeholder screen, no functionality

**Tasks**:
- [ ] Fetch conversation list
- [ ] Display recent messages
- [ ] Implement real-time messaging with Socket.IO
- [ ] Show message status (sent, delivered, read)
- [ ] Implement typing indicators
- [ ] Add user presence
- [ ] Create direct message conversations
- [ ] Create group conversations
- [ ] Show member avatars
- [ ] Implement message reactions (emojis)
- [ ] Add photo/file sharing (basic)
- [ ] Implement message search

**API Endpoints & WebSocket Needed**:
- `GET /api/messages/conversations` - List chats
- `GET /api/messages/{chatId}?limit=50` - Get messages
- `POST /api/messages/{chatId}` - Send message
- `WebSocket: message:new` - Real-time messages
- `WebSocket: message:read` - Read receipts
- `WebSocket: user:typing` - Typing indicator

**Files to Modify**:
- `src/screens/main/MessagesScreen.tsx`
- `src/screens/details/ChatDetailScreen.tsx`
- Create `src/api/messages.ts`
- Create `src/hooks/useSocket.ts` - Socket.IO hook
- Create message components
- Add Socket.IO client setup

---

### 6. Calendar Events [12-16 hours]
**Status**: Placeholder screen, no calendar view

**Tasks**:
- [ ] Integrate calendar library (react-native-calendar-format or similar)
- [ ] Fetch events from API
- [ ] Display events on calendar
- [ ] Implement event creation modal
- [ ] Show event details
- [ ] Edit events
- [ ] Delete events
- [ ] Support recurring events
- [ ] Color-code by category
- [ ] Show event reminders
- [ ] Support private/public events

**API Endpoints Needed**:
- `GET /api/events?familyId={id}&start={date}&end={date}` - List events
- `GET /api/events/{eventId}` - Get event details
- `POST /api/events` - Create event
- `PUT /api/events/{eventId}` - Update event
- `DELETE /api/events/{eventId}` - Delete event
- `POST /api/events/{eventId}/reminder` - Set reminder

**Files to Modify**:
- `src/screens/main/CalendarScreen.tsx`
- `src/screens/details/EventDetailsScreen.tsx`
- Create `src/api/calendar.ts`
- Create calendar components with recurring support
- Create event creation/edit modals

---

## 🎯 PHASE 2: CORE FEATURES (Weeks 4-6)

These are important features that enhance the app's value.

### 7. Shopping Lists [10-14 hours]
**Status**: Placeholder screen with list view

**Tasks**:
- [ ] Fetch shopping lists
- [ ] Create new shopping list
- [ ] Add items to list
- [ ] Edit list items (quantity, category)
- [ ] Mark items as completed
- [ ] Delete items
- [ ] Share lists with family members
- [ ] Real-time collaboration (see others' updates)
- [ ] Category filtering
- [ ] List deletion
- [ ] Add suggested items

**API Endpoints Needed**:
- `GET /api/shopping-lists?familyId={id}` - List all lists
- `GET /api/shopping-lists/{listId}` - Get list with items
- `POST /api/shopping-lists` - Create list
- `POST /api/shopping-lists/{listId}/items` - Add item
- `PUT /api/shopping-lists/{listId}/items/{itemId}` - Update item
- `PATCH /api/shopping-lists/{listId}/items/{itemId}/complete` - Mark complete
- `DELETE /api/shopping-lists/{listId}/items/{itemId}` - Delete item
- `DELETE /api/shopping-lists/{listId}` - Delete list

**Files to Modify**:
- `src/screens/main/ShoppingScreen.tsx`
- Create `src/api/shopping.ts`
- Create shopping list components
- Create item creation/edit modals

---

### 8. Budget & Finance [14-18 hours]
**Status**: Placeholder screen with summary card

**Tasks**:
- [ ] Fetch budgets and transactions
- [ ] Display total budget summary
- [ ] Show budget breakdown by category
- [ ] Display spending progress bars
- [ ] Create transaction entries
- [ ] Track expenses by category
- [ ] Show transaction history
- [ ] Implement budget alerts (approaching limit)
- [ ] Calculate monthly spending trends
- [ ] Generate spending reports
- [ ] Set savings goals

**API Endpoints Needed**:
- `GET /api/budgets?familyId={id}` - List budgets
- `GET /api/budgets/{budgetId}` - Get budget details
- `POST /api/budgets` - Create budget
- `PUT /api/budgets/{budgetId}` - Update budget
- `GET /api/transactions?familyId={id}` - List transactions
- `POST /api/transactions` - Add transaction
- `GET /api/transactions/summary` - Budget summary

**Files to Modify**:
- `src/screens/main/BudgetScreen.tsx`
- Create `src/api/budget.ts`
- Create budget components
- Create transaction entry modal
- Create spending charts component

---

### 9. Journal/Diary [8-12 hours]
**Status**: Not yet implemented (in More menu)

**Tasks**:
- [ ] Create Journal screen
- [ ] List journal entries
- [ ] Create new entry with rich text editor
- [ ] Edit entries
- [ ] Delete entries
- [ ] View entry details
- [ ] Search entries
- [ ] Support markdown/formatting
- [ ] Add tags/categories
- [ ] Support private entries

**API Endpoints Needed**:
- `GET /api/journal?userId={id}` - List entries
- `POST /api/journal` - Create entry
- `GET /api/journal/{entryId}` - Get entry
- `PUT /api/journal/{entryId}` - Update entry
- `DELETE /api/journal/{entryId}` - Delete entry

**Files to Modify**:
- Create `src/screens/main/JournalScreen.tsx`
- Create `src/api/journal.ts`
- Add Journal to navigation

---

### 10. Recipes/Meal Planning [16-20 hours]
**Status**: Not yet implemented (in More menu)

**Tasks**:
- [ ] Create Recipes screen
- [ ] List family recipes
- [ ] View recipe details (ingredients, steps, memories)
- [ ] Create new recipe
- [ ] Edit recipes
- [ ] Delete recipes
- [ ] Mark favorite recipes
- [ ] Share recipe memories/stories
- [ ] Meal planning calendar view
- [ ] Suggest meals for week
- [ ] Auto-generate shopping list from recipe

**API Endpoints Needed**:
- `GET /api/recipes?familyId={id}` - List recipes
- `GET /api/recipes/{recipeId}` - Get recipe details
- `POST /api/recipes` - Create recipe
- `PUT /api/recipes/{recipeId}` - Update recipe
- `DELETE /api/recipes/{recipeId}` - Delete recipe
- `POST /api/recipes/{recipeId}/memories` - Add memory
- `POST /api/recipes/{recipeId}/favorite` - Mark favorite
- `GET /api/meal-plans?week={date}` - Get meal plan

**Files to Modify**:
- Create `src/screens/main/RecipesScreen.tsx`
- Create `src/api/recipes.ts`
- Create recipe detail components
- Create recipe editor with ingredients/steps

---

### 11. Wishlists [8-12 hours]
**Status**: Not yet implemented (in More menu)

**Tasks**:
- [ ] Create Wishlists screen
- [ ] Create personal wishlist
- [ ] Add items to wishlist
- [ ] Edit wishlist items (title, description, price, priority)
- [ ] Share wishlist with family
- [ ] Claim items (mark someone is buying it)
- [ ] View family member wishlists
- [ ] Delete items and wishlists
- [ ] Filter by priority

**API Endpoints Needed**:
- `GET /api/wishlists?userId={id}` - User's wishlists
- `GET /api/wishlists/{wishlistId}` - Get wishlist
- `POST /api/wishlists` - Create wishlist
- `POST /api/wishlists/{wishlistId}/items` - Add item
- `PUT /api/wishlists/{wishlistId}/items/{itemId}` - Update item
- `DELETE /api/wishlists/{wishlistId}/items/{itemId}` - Delete item
- `POST /api/wishlists/{wishlistId}/share` - Share with family

**Files to Modify**:
- Create `src/screens/main/WishlistsScreen.tsx`
- Create `src/api/wishlists.ts`
- Create wishlist components

---

## 🎨 PHASE 3: ENHANCEMENT FEATURES (Weeks 7-8)

These features enhance the user experience and engagement.

### 12. Family Guidelines/Values [6-8 hours]
**Status**: Not yet implemented (in More menu)

**Tasks**:
- [ ] Create Family Values screen
- [ ] Display family guidelines
- [ ] Create/edit guidelines
- [ ] Set family mantra
- [ ] Set family values list
- [ ] Share with family members
- [ ] Archive old guidelines

**API Endpoints Needed**:
- `GET /api/family/{familyId}/guidelines` - Get guidelines
- `PUT /api/family/{familyId}/guidelines` - Update guidelines
- `PUT /api/family/{familyId}/mantra` - Update mantra
- `PUT /api/family/{familyId}/values` - Update values

**Files to Modify**:
- Create `src/screens/main/GuidelinesScreen.tsx`
- Create `src/api/guidelines.ts`

---

### 13. Member Profiles [8-10 hours]
**Status**: Detail screen exists, needs enhancement

**Tasks**:
- [ ] Display member profile with avatar
- [ ] Show member role and joined date
- [ ] Display member stats (tasks completed, points, achievements)
- [ ] Show member's recent activity
- [ ] Display task history
- [ ] Show contact information
- [ ] Edit own profile
- [ ] Upload profile picture

**API Endpoints Needed**:
- `GET /api/users/{userId}` - Get user profile
- `GET /api/users/{userId}/stats` - Get user stats
- `PUT /api/users/{userId}` - Update profile
- `POST /api/users/{userId}/avatar` - Upload avatar

**Files to Modify**:
- Enhance `src/screens/details/MemberProfileScreen.tsx`
- Create `src/api/memberProfiles.ts`

---

### 14. Notifications System [10-12 hours]
**Status**: Not implemented

**Tasks**:
- [ ] Fetch notification list from API
- [ ] Display notifications in app
- [ ] Real-time notification via WebSocket
- [ ] Setup Apple Push Notifications (APNs)
- [ ] Show badge counts on tabs
- [ ] Mark notifications as read
- [ ] Handle notification taps (deep linking)
- [ ] Notification preferences/settings

**API Endpoints Needed**:
- `GET /api/notifications` - List notifications
- `PATCH /api/notifications/{id}/read` - Mark read
- `POST /api/notifications/subscribe` - Subscribe to push
- `WebSocket: notification:new` - Real-time notifications

**Files to Modify**:
- Create `src/screens/NotificationsScreen.tsx`
- Create `src/api/notifications.ts`
- Create `src/hooks/useNotifications.ts`
- Setup APNs configuration

---

### 15. User Settings & Preferences [6-8 hours]
**Status**: More screen placeholder only

**Tasks**:
- [ ] Create full Settings screen
- [ ] Theme toggle (light/dark)
- [ ] Notification preferences
- [ ] Privacy settings
- [ ] Account security
- [ ] Language preference
- [ ] Time zone setting
- [ ] Data management (export, delete)
- [ ] Logout functionality
- [ ] About & help

**API Endpoints Needed**:
- `GET /api/users/preferences` - Get preferences
- `PUT /api/users/preferences` - Update preferences
- `POST /api/auth/logout` - Logout

**Files to Modify**:
- Enhance `src/screens/main/MoreScreen.tsx` into `SettingsScreen.tsx`
- Create `src/api/settings.ts`

---

## 🔌 PHASE 4: NATIVE INTEGRATION (Weeks 9-10)

These features require native iOS integration for Family Controls and device management.

### 16. Family Controls Authorization [12-16 hours]
**Status**: Native module exists (`FamilyControlsNativeModule.swift`), needs UI wrapper

**Tasks**:
- [ ] Create authorization request UI
- [ ] Show permission prompts to parents
- [ ] Display authorization status
- [ ] Show granted permissions
- [ ] Implement revoke authorization flow
- [ ] Handle authorization errors
- [ ] Store authorization tokens

**Files to Modify**:
- Create `src/screens/native/AuthorizationScreen.tsx`
- Create `src/api/familyControls.ts`
- Create `src/hooks/useFamilyControls.ts`
- Connect to native module via bridge

---

### 17. Screen Time Management [14-18 hours]
**Status**: Native module exists (`ScreenTimeManager.swift`), needs UI wrapper

**Tasks**:
- [ ] Create Screen Time screen
- [ ] Display current screen time
- [ ] Set daily time limits
- [ ] Configure time periods (start/end)
- [ ] Show usage by app category
- [ ] Set app-specific limits
- [ ] Override approval workflow
- [ ] Display warnings
- [ ] Show screen time history
- [ ] Analytics/trends

**Files to Modify**:
- Create `src/screens/native/ScreenTimeScreen.tsx`
- Create `src/screens/native/ScreenTimeSettingsScreen.tsx`
- Create screen time components
- Implement polling for real-time updates

---

### 18. Device Control [10-14 hours]
**Status**: Native module exists (`DeviceControlManager.swift`), needs UI wrapper

**Tasks**:
- [ ] Create Device Management screen
- [ ] App blocking interface
- [ ] Device locking controls
- [ ] Content restrictions settings
- [ ] Show locked app list
- [ ] Unlock workflow (parent approval)
- [ ] Display device status
- [ ] Emergency unlock options

**Files to Modify**:
- Create `src/screens/native/DeviceControlScreen.tsx`
- Create device control components
- Connect to native device manager

---

### 19. Push Notifications Integration [8-10 hours]
**Status**: Not implemented

**Tasks**:
- [ ] Setup APNs certificate
- [ ] Implement device token registration
- [ ] Handle foreground notifications
- [ ] Handle background notifications
- [ ] Implement deep linking from notifications
- [ ] Show notification badge counts
- [ ] Test notification delivery

**Files to Modify**:
- Create `src/services/notificationService.ts`
- Update `src/App.tsx` with notification setup
- Create notification handlers

---

### 20. Background Task Syncing [8-10 hours]
**Status**: Not implemented

**Tasks**:
- [ ] Implement background task updates
- [ ] Sync data periodically
- [ ] Handle offline mode
- [ ] Queue local changes
- [ ] Sync when online
- [ ] Show sync status
- [ ] Handle sync conflicts

**Files to Modify**:
- Create `src/services/syncService.ts`
- Create `src/hooks/useOfflineMode.ts`
- Update stores with sync logic

---

## 📊 FEATURE COMPLETION MATRIX

| Feature | Priority | Complexity | Estimated Hours | API Ready | Status |
|---------|----------|------------|-----------------|-----------|--------|
| Dashboard | P0 | Medium | 10 | ❓ | Placeholder |
| Authentication | P0 | Medium | 12 | ❓ | UI Only |
| Family Management | P0 | High | 14 | ❓ | Placeholder |
| Tasks | P0 | High | 16 | ❓ | Placeholder |
| Messages | P0 | High | 18 | ❓ | Placeholder |
| Calendar | P0 | High | 14 | ❓ | Placeholder |
| Shopping Lists | P1 | Medium | 12 | ❓ | Placeholder |
| Budget & Finance | P1 | High | 16 | ❓ | Placeholder |
| Journal | P1 | Low | 10 | ❓ | Not Started |
| Recipes | P1 | High | 18 | ❓ | Not Started |
| Wishlists | P1 | Low | 10 | ❓ | Not Started |
| Guidelines | P1 | Low | 7 | ❓ | Not Started |
| Member Profiles | P2 | Medium | 9 | ❓ | Partial |
| Notifications | P2 | Medium | 11 | ❓ | Not Started |
| Settings | P2 | Low | 7 | ❓ | Placeholder |
| Family Controls Auth | P3 | High | 14 | ✅ | Native Ready |
| Screen Time Mgmt | P3 | High | 16 | ✅ | Native Ready |
| Device Control | P3 | High | 12 | ✅ | Native Ready |
| Push Notifications | P3 | Medium | 9 | ❓ | Not Started |
| Background Sync | P3 | High | 9 | ❓ | Not Started |

---

## 🚀 RECOMMENDED BUILD ORDER

### Week 1-2: Authentication & Dashboard
1. Implement authentication API integration
2. Build dashboard with real data
3. Setup API error handling

### Week 3-4: Core Features
1. Tasks management (CRUD)
2. Family management (members, invites)
3. Calendar with events

### Week 5-6: Communication
1. Messages with Socket.IO
2. Real-time updates
3. Notifications setup

### Week 7-8: Secondary Features
1. Shopping lists
2. Budget tracking
3. Journal entries

### Week 9-10: Enhanced Features
1. Recipes/meal planning
2. Wishlists
3. Member profiles

### Week 11-12: Native Integration
1. Family Controls UI
2. Screen time management
3. Device controls

### Week 13-14: Polish
1. Push notifications
2. Background syncing
3. Offline support

---

## 📋 IMPLEMENTATION CHECKLIST

Use this to track progress:

### Phase 1 (Critical)
- [ ] Dashboard API integration
- [ ] Authentication complete
- [ ] Family management
- [ ] Tasks management
- [ ] Messages with Socket.IO
- [ ] Calendar events

### Phase 2 (Core)
- [ ] Shopping lists
- [ ] Budget & finance
- [ ] Journal entries
- [ ] Recipes & meal planning
- [ ] Wishlists
- [ ] Guidelines

### Phase 3 (Enhancement)
- [ ] Member profiles enhanced
- [ ] Notifications system
- [ ] Settings screen complete

### Phase 4 (Native)
- [ ] Family Controls UI
- [ ] Screen time management
- [ ] Device control UI
- [ ] Push notifications
- [ ] Background syncing

---

## ⚠️ BLOCKERS & DEPENDENCIES

**Before Starting Implementation:**
1. ✅ Backend API must be available with documented endpoints
2. ✅ Socket.IO server must support real-time messaging
3. ✅ APNs certificate must be configured
4. ✅ Native modules must be compiled and working
5. ⏳ Web app final API contracts must be documented

**Inter-feature Dependencies:**
- Messages depends on Socket.IO setup
- Notifications depends on Messages and APNs
- Family Controls depends on native module compilation
- Background sync depends on offline-first architecture

---

## 💡 NEXT IMMEDIATE STEPS

1. **Verify backend API is ready** with documented endpoints
2. **Start with Phase 1 Week 1**: Authentication + Dashboard
3. **Create API endpoint constants file**
4. **Implement API calls incrementally**
5. **Test each feature as it's built**

---

**Total Estimated Development Time**: 140-180 hours (4-5 weeks of full-time development)

This represents building complete feature parity with the web app while maintaining iOS best practices and full TypeScript type safety.
