# FamConomy iOS Development - Web App Parity Analysis

## Project Overview

**FamConomy** is a comprehensive family operating system designed to help modern families manage:
- Finance and budgeting
- Tasks and chores (gigs)
- Family calendar and events
- Real-time messaging
- Shopping lists and meal planning
- Child monitoring (screen time, app blocking)
- Journal entries and family values
- Wishlists and recipes

---

## Web App Architecture

### Tech Stack
- **Frontend Framework**: React 18.3.1 with TypeScript
- **Build Tool**: Vite 5.4.2
- **Styling**: Tailwind CSS 3.4.1
- **Routing**: React Router DOM 6.18.0
- **State Management**: Zustand 4.4.7
- **HTTP Client**: Axios 1.6.0
- **Real-time Communication**: Socket.IO Client 4.8.1
- **UI Components**: Lucide React icons, Framer Motion animations
- **Data Visualization**: Chart.js with React wrapper
- **Calendar**: FullCalendar 6.1.10
- **Rich Text Editor**: TipTap 2.2.4
- **Forms**: React Hook Form 7.49.2
- **Notifications**: React Toastify 11.0.5

### Core Features Implemented

#### 1. **Authentication & Authorization**
- Email/password login
- OAuth integration (Google, Facebook, Apple, Microsoft)
- Password reset functionality
- Join family workflows
- Role-based access control (admin, parent, guardian, child)

#### 2. **Dashboard**
- Welcome screen with family name and mantra
- Quick stats: upcoming events, pending tasks, unread messages, active members
- Widget-based layout (responsive grid)
- Recent activity feed
- Task completion progress
- Family goals tracking
- Different widget sets for parents vs. children
- Notifications list

#### 3. **Family Management** (`FamilyPage.tsx`)
- Create and manage family circles
- Invite family members via email
- Accept/decline invitations
- Manage member roles and permissions
- Member profiles with customizable information
- Family settings (name, mantra, values)
- Room/space organization within families

#### 4. **Calendar** (`CalendarPage.tsx`)
- Full calendar view with FullCalendar integration
- Event creation and editing
- Event filtering and search
- Event details modal
- Color-coded event categories
- Recurring events with RRule support
- Event privacy settings (private/public)
- Multiple view modes (day, week, month, agenda)

#### 5. **Tasks/Gigs** (`TasksPage.tsx`, `GigsPage.tsx`)
- Task creation with title, description, due date
- Assign tasks to family members
- Task status tracking (pending, in progress, completed)
- Task categories (chores, homework, shopping, activities)
- Reward system (screen time, points, currency)
- Approval workflows for child-suggested tasks
- Recurring tasks
- Task attachments

#### 6. **Budget & Finance** (`BudgetPage.tsx`)
- Budget creation and tracking
- Transaction management
- Savings goals
- Expense categorization
- Financial charts and analytics
- Multi-account support (with Plaid integration for banking)
- Transaction history and filtering

#### 7. **Shopping Lists** (`ShoppingPage.tsx`)
- Create and manage shopping lists
- Add/remove items with quantities
- Item categorization (groceries, household, personal, school)
- Item completion tracking
- Multi-list management
- Shared shopping lists

#### 8. **Messaging** (`MessagesPage.tsx`)
- Real-time chat with family members
- Direct messaging
- Group conversations
- Message status (sent, delivered, read)
- SMS integration support
- Message history

#### 9. **Recipes** (`RecipesPage.tsx`)
- Recipe creation with ingredients and steps
- Family recipe collection
- Meal memory sharing (stories about recipes)
- Favorite recipes
- Recipe visibility control (family-only or link-based)
- Meal planning integration
- Recipe origin stories and tradition notes

#### 10. **Journaling** (`JournalPage.tsx`)
- Private journal entries
- Rich text editing with TipTap
- Entry categorization
- Mood tracking (implied by entry types)
- Searchable journal history

#### 11. **Wishlists** (`WishlistsPage.tsx`)
- Create personal and family wishlists
- Wishlist item management
- Item descriptions and priorities
- Shared wishlist views
- Public profile integration

#### 12. **Family Guidelines** (`FamilyValuesPage.tsx`)
- Define family values and mantras
- Create family guidelines/rules
- Share guidelines with family members
- Guideline enforcement tracking

#### 13. **Settings & Customization** (`SettingsPage.tsx`)
- User profile settings
- Theme preferences (light/dark mode)
- Notification preferences
- Privacy settings
- Account management
- Family settings

#### 14. **Profile Management**
- User profile editing
- Avatar customization
- Role-specific profile views
- Member profiles accessible to family

---

## Current iOS Implementation Status

### What's Already Built

#### 1. **React Native Bridge**
- `FamilyControlsNativeModule.swift` - Main communication bridge between React Native and native iOS
- Event emitter system for real-time notifications

#### 2. **Family Controls Framework Integration**
- `AuthorizationShield.swift` - Role-based authorization and family member verification
- Support for admin, parent, guardian, and child roles
- Authorization token generation and expiration handling

#### 3. **Screen Time Management**
- `ScreenTimeManager.swift` - Screen time tracking and limits
- Daily time limits with configurable schedules
- Time period restrictions (start/end times)
- Category-specific limits
- Override approval workflows
- Screen time status reporting with history

#### 4. **Device Control**
- `DeviceControlManager.swift` - Low-level device control
- App blocking by bundle ID
- Device locking capabilities
- Content restrictions
- Device status monitoring

#### 5. **Real-time Polling**
- `PollingManager.swift` - Background status polling
- Configurable polling intervals
- Backoff strategy for failed polls
- Multiple user monitoring
- Event-based notifications

#### 6. **Event Emission System**
- `FamilyControlsEventEmitter.swift` - Native event broadcasting
- Authorization events (granted, revoked, expired)
- Screen time warnings
- Device lock events
- App blocking notifications
- Polling status updates

### Current Event Types Supported
```
AUTHORIZATION_GRANTED
AUTHORIZATION_REVOKED
AUTHORIZATION_EXPIRED
SCREEN_TIME_WARNING
SCHEDULE_ACTIVATED
DEVICE_LOCKED
APP_BLOCKED
POLLING_ERROR
POLLING_RECOVERED
MODULE_ERROR
```

### Current Capabilities Summary
✅ Native bridge setup
✅ Authorization framework
✅ Screen time management
✅ Device controls (locking, app blocking)
✅ Real-time event emission
✅ Polling system
❌ UI screens and navigation
❌ Data synchronization
❌ User authentication flow
❌ Family management UI
❌ Dashboard UI
❌ Feature screens (calendar, tasks, budget, etc.)

---

## Web App Page Structure

```
Dashboard         → Home/overview with quick stats
Calendar          → Family event scheduling
Tasks             → Task management and assignment
Gigs              → Child-focused task/reward system
Gigs Settings     → Configure gig system
Messages          → Family messaging
Shopping          → Shopping list management
Budget            → Finance and budgeting
Family            → Member management and profiles
Journal           → Private journaling
Settings          → App configuration
Profile           → User profile management
Login             → Authentication entry point
Join              → Family join workflows
Onboarding        → First-time setup
Resources         → External resources/help
Recipes           → Recipe collection and meal planning
Wishlists         → Personal and family wishlists
Family Values     → Family guidelines and values
Users             → User management (admin view)
```

---

## Data Models (Key Types)

### Core Entities

#### User
```typescript
{
  id: string
  fullName: string
  email: string
  role: 'admin' | 'parent' | 'child' | 'guardian'
  status: 'active' | 'inactive' | 'pending'
  avatar?: string
  familyId: string
  signupDate: string
  lastLogin: string | null
  phoneNumber?: string
  smsEnabled?: boolean
}
```

#### Family
```typescript
{
  FamilyID: number
  FamilyName: string
  FamilyMantra?: string
  FamilyValues: string[]
  Members: FamilyMember[]
  CreatedAt: string
  Settings: FamilySettings
}
```

#### Task
```typescript
{
  TaskID: number
  FamilyID: number
  Title: string
  Description?: string
  DueDate?: string
  AssignedToUserID?: string
  CreatedByUserID: string
  TaskStatusID: number
  RewardType?: 'screentime' | 'points' | 'currency'
  RewardValue?: number
  Category: 'chores' | 'homework' | 'shopping' | 'activities'
  Recurring?: 'daily' | 'weekly' | 'monthly'
  Attachments?: Attachment[]
}
```

#### CalendarEvent
```typescript
{
  EventID: number
  Title: string
  StartTime: string
  EndTime?: string
  Description?: string
  Location?: string
  FamilyID: number
  CreatedByUserID: string
  AssignedToUserID?: string
  RepeatType?: 'none' | 'daily' | 'weekly' | 'monthly'
  RecurrencePattern?: string
  IsPrivate?: boolean
  Reminder?: boolean
}
```

#### Budget
```typescript
{
  BudgetID: number
  FamilyID: number
  Name: string
  Amount: number
  SpentAmount: number
  Period: 'weekly' | 'monthly' | 'yearly'
  StartDate: string
  EndDate?: string
  Categories: BudgetCategory[]
}
```

#### Message & Chat
```typescript
Chat: {
  id: string
  type: 'direct' | 'group'
  participants: string[]
  familyId: string
  lastMessage?: Message
  createdAt: string
}

Message: {
  id: string
  content: string
  senderId: string
  chatId: string
  timestamp: string
  status: 'sent' | 'delivered' | 'read'
  type: 'text' | 'image' | 'file'
}
```

#### Recipe
```typescript
{
  RecipeID: number
  FamilyID: number
  Title: string
  Description?: string
  OriginStory?: string
  Servings?: number
  PrepMinutes?: number
  CookMinutes?: number
  CreatedByUserID: string
  Ingredients: RecipeIngredient[]
  Steps: RecipeStep[]
  Memories?: RecipeMemory[]
  Favorites?: RecipeFavorite[]
  Visibility: 'FAMILY' | 'LINK'
}
```

#### ShoppingList
```typescript
{
  ShoppingListID: number
  FamilyID: number
  Name: string
  CreatedByUserID: string
  CreatedAt: string
  ShoppingItems: ShoppingItem[]
}
```

#### Journal Entry
```typescript
{
  JournalID: number
  UserID: string
  FamilyID: number
  Title: string
  Content: string (rich text)
  CreatedAt: string
  UpdatedAt: string
  IsPrivate: boolean
}
```

---

## API Endpoints Structure

### Categories
- **Authentication** (`auth.ts`)
- **Dashboard** (`dashboard.ts`)
- **Calendar** (`calendar.ts`)
- **Tasks/Gigs** (`gigs.ts`)
- **Budget** (`budget.ts`)
- **Shopping** (`shopping.ts`)
- **Recipes** (`meals.ts`)
- **Messaging** (`messages.ts`)
- **Family** (`family.ts`)
- **Journals** (`journal.ts`)
- **Member Profiles** (`memberProfiles.ts`)
- **Invitations** (`invitations.ts`)
- **Integrations** (`integrations.ts`) - Plaid for banking
- **AI Assistant** (`assistant.ts`)
- **Guidelines** (`guidelines.ts`)
- **Feedback** (`feedback.ts`)

---

## Recommended iOS Implementation Roadmap

### Phase 1: Foundation (Weeks 1-2)
- [ ] Set up React Native navigation structure (Tab + Stack navigators)
- [ ] Implement authentication screens (Login, SignUp, ForgotPassword)
- [ ] Create main layout components (TabNavigator, HeaderBar)
- [ ] Implement error handling and loading states
- [ ] Set up state management (Zustand or Redux)

### Phase 2: Core Pages (Weeks 3-5)
- [ ] Dashboard screen with widgets
- [ ] Family management screen
- [ ] Family member profiles
- [ ] Settings screen
- [ ] Profile screen

### Phase 3: Primary Features (Weeks 6-9)
- [ ] Calendar screen with event management
- [ ] Tasks screen
- [ ] Messages screen
- [ ] Shopping lists
- [ ] Budget/Finance overview

### Phase 4: Secondary Features (Weeks 10-12)
- [ ] Journal screen
- [ ] Recipes/Meal planning
- [ ] Wishlists
- [ ] Family guidelines/values
- [ ] Onboarding flow

### Phase 5: Native Integration (Weeks 13-14)
- [ ] Screen time controls UI
- [ ] Device control interface
- [ ] Notifications setup
- [ ] Push notification system
- [ ] Testing and refinement

### Phase 6: Polish & Testing (Weeks 15+)
- [ ] Dark mode support
- [ ] Accessibility improvements
- [ ] Performance optimization
- [ ] User testing
- [ ] App Store submission prep

---

## Key Design Patterns from Web App

### 1. **Responsive Widget System**
- Grid-based layouts that adapt to screen size
- Card-based component design
- Consistent spacing and padding

### 2. **Color Scheme**
- Primary color system (used for main actions)
- Secondary color (supporting actions)
- Accent color (highlights)
- Neutral colors (backgrounds, text)
- Warning/Error colors
- Success colors
- Implemented with Tailwind classes

### 3. **Icon System**
- Uses Lucide React icons
- Consistent icon sizing and styling
- Icon + text combinations for clarity

### 4. **Navigation Patterns**
- Tab-based navigation for primary sections
- Stack navigation for detail views
- Modal dialogs for confirmations and forms
- Breadcrumb navigation where needed

### 5. **Form Patterns**
- Form validation with clear error messages
- Loading states during submission
- Success/error toast notifications
- Modal forms for adding/editing

### 6. **Dark Mode Support**
- All components have dark mode variants
- Uses `dark:` Tailwind prefix pattern
- Persistent user preference

---

## Integration Points to Consider

### 1. **Backend API**
- Base URL configuration
- Authentication token management
- Error handling and retry logic
- Request/response interceptors

### 2. **Real-time Updates**
- Socket.IO integration for messaging
- Server-sent events for notifications
- Polling fallback for unsupported devices

### 3. **Local Storage**
- User preferences and settings
- Cached data for offline support
- Authentication tokens

### 4. **Push Notifications**
- iOS APNs setup
- Notification payload handling
- Deep linking from notifications

### 5. **Native Module Integration**
- Family Controls authorization flow
- Screen time status updates
- Device control permissions
- Event listening and handling

---

## Design System Alignment

### Typography
- Heading sizes: 3xl, 2xl, xl, lg
- Body text: base, sm
- Monospace for technical content

### Spacing Scale
- Consistent 4px-based grid
- Padding: 2, 3, 4, 6, 8 (units of 4px)
- Gaps: 4, 6, 8 (units of 4px)

### Shadows
- `shadow-card`: Light elevation for cards
- `shadow-card-hover`: Elevated state

### Border Radius
- `rounded-xl`: 12px for main elements
- `rounded-lg`: 8px for smaller elements

### Interactive States
- Hover: Elevation increase, shadow expansion
- Active: Slight scale reduction
- Disabled: Opacity reduction, cursor not-allowed

---

## Next Steps

1. **Review Web App UI** - Take screenshots of each page to establish design targets
2. **Set Up React Native Project** - Initialize with TypeScript, navigation, and theming
3. **Create Base Components** - Button, Card, Input, Modal, etc.
4. **Implement Auth Flow** - Login, signup, password reset
5. **Build Navigation Structure** - Tab and stack navigators matching web layout
6. **Implement Dashboard** - First fully functional screen as reference
7. **Iterate on Remaining Features** - Following the roadmap

---

## Notes

- The web app uses a monorepo structure with shared types
- Real-time features (messaging, notifications) use Socket.IO
- The native iOS modules are already built but need UI wrappers
- Mobile will require thoughtful adaptation of desktop-oriented features
- Consider mobile-first design patterns (simplified workflows, touch-optimized)

