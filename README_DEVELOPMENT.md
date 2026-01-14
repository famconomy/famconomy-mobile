# FamConomy Mobile - iOS App Development

## Project Overview

This is a React Native TypeScript mobile application for iOS that provides feature parity with the FamConomy web app. The app helps modern families manage finances, tasks, calendars, messaging, shopping, and more.

## Project Structure

```
mobile/src/
├── api/
│   ├── client.ts              # Axios API client with auth interceptors
│   └── index.ts               # API exports
├── components/
│   ├── ui/
│   │   ├── Button.tsx         # Reusable button component
│   │   ├── Card.tsx           # Card container component
│   │   ├── Input.tsx          # Text input with label and error
│   │   ├── Alert.tsx          # Alert/notification component
│   │   ├── Text.tsx           # Typography component
│   │   ├── LoadingSpinner.tsx # Loading state component
│   │   └── index.ts           # UI component exports
│   ├── layout/
│   │   ├── Header.tsx         # Header with navigation
│   │   └── index.ts           # Layout exports
│   └── index.ts               # All component exports
├── navigation/
│   └── RootNavigator.tsx      # Navigation structure (tabs + stack)
├── screens/
│   ├── SplashScreen.tsx       # Initial loading screen
│   ├── auth/
│   │   ├── LoginScreen.tsx    # Email/password login
│   │   ├── SignUpScreen.tsx   # Account creation
│   │   └── ForgotPasswordScreen.tsx
│   ├── main/
│   │   ├── DashboardScreen.tsx # Home overview
│   │   ├── CalendarScreen.tsx  # Event management
│   │   ├── TasksScreen.tsx     # Task/chores management
│   │   ├── MessagesScreen.tsx  # Family messaging
│   │   ├── ShoppingScreen.tsx  # Shopping lists
│   │   ├── BudgetScreen.tsx    # Finance tracking
│   │   ├── FamilyScreen.tsx    # Family members
│   │   └── MoreScreen.tsx      # Additional features
│   └── details/
│       ├── EventDetailsScreen.tsx
│       ├── TaskDetailsScreen.tsx
│       ├── RecipeDetailsScreen.tsx
│       ├── MemberProfileScreen.tsx
│       └── ChatDetailScreen.tsx
├── store/
│   ├── authStore.ts           # Authentication state (Zustand)
│   ├── appStore.ts            # App preferences (Zustand)
│   └── index.ts               # Store exports
├── theme/
│   └── index.ts               # Colors, spacing, typography, shadows
├── types/
│   └── index.ts               # TypeScript type definitions
├── App.tsx                    # Main app component
└── index.ts                   # Entry point

```

## Key Features Implemented

### 1. **State Management**
- **Zustand stores** for lightweight, efficient state management
- **Persistent storage** using AsyncStorage for auth and preferences
- Automatic serialization/deserialization

**Stores:**
- `useAuthStore` - User authentication, login/signup, token management
- `useAppStore` - Family data, theme preference, notifications

### 2. **Navigation**
- **Tab Navigator** (React Navigation) for main app screens
  - Dashboard (Home)
  - Calendar
  - Tasks
  - Messages
  - More
  
- **Stack Navigator** for detail/modal screens
  - Event Details
  - Task Details
  - Recipe Details
  - Member Profile
  - Chat Details

- **Auth Navigator** for unauthenticated users
  - Login
  - SignUp
  - ForgotPassword

### 3. **Theme System**
- **Light and Dark modes** with full theme support
- **Color palette** matching web app design
  - Primary, Secondary, Success, Warning, Error colors
  - Neutral grayscale colors
  - Accent and highlight colors

- **Design tokens**
  - Spacing scale (4px base)
  - Border radius system
  - Font sizes and weights
  - Shadow definitions for elevation
  - Line heights

### 4. **UI Components**
All components support theme switching and dark mode:

- **Button** - Multiple variants (primary, secondary, outline, danger) and sizes
- **Card** - Container with shadow and elevation support
- **Input** - Text input with labels, error messages, and validation
- **Text** - Typography component with variants (h1-h4, body, caption, label)
- **Alert** - Notification component (success, error, warning, info)
- **LoadingSpinner** - Loading indicator with message
- **Header** - Navigation header with actions

### 5. **API Client**
- **Axios-based** HTTP client
- **Request interceptors** for auth token injection
- **Response interceptors** for error handling (401 redirects to login)
- **Configurable base URL** via environment variables

### 6. **Authentication Flow**
- Login with email/password
- Account creation/signup
- Password reset workflow
- Auth token persistence
- Automatic logout on 401 responses

### 7. **Type Safety**
Complete TypeScript definitions for:
- User and Family models
- Tasks, Events, Messages
- Shopping lists, Budgets, Recipes
- API responses and payloads
- Navigation parameters

## Getting Started

### Prerequisites
- Node.js (v18+)
- React Native environment set up
- iOS development tools (Xcode)
- CocoaPods

### Installation

1. **Install dependencies:**
```bash
cd mobile
npm install
# or
yarn install
```

2. **Install pods for iOS:**
```bash
npm run pod-install
```

3. **Create environment file:**
```bash
# Create .env file in mobile/ directory
REACT_APP_API_BASE_URL=http://localhost:3000/api
```

4. **Run on iOS:**
```bash
npm run ios
# or
react-native run-ios
```

## Development Workflow

### Adding a New Feature Screen

1. **Create screen component:**
```typescript
// src/screens/main/MyNewScreen.tsx
import React from 'react';
import { View, ScrollView } from 'react-native';
import { useAppStore } from '../../store/appStore';
import { Text, Card, Button } from '../../components';
import { spacing, lightTheme, darkTheme } from '../../theme';

const MyNewScreen: React.FC = () => {
  const { theme } = useAppStore();
  const isDark = theme === 'dark';
  const themeColors = isDark ? darkTheme : lightTheme;

  return (
    <ScrollView style={{ backgroundColor: themeColors.background }}>
      {/* Component content */}
    </ScrollView>
  );
};

export default MyNewScreen;
```

2. **Add to navigation:**
```typescript
// src/navigation/RootNavigator.tsx
<Tab.Screen name="MyNew" component={MyNewScreen} />
```

3. **Export from components:**
```typescript
// src/components/index.ts
export { MyNewComponent } from './MyNewComponent';
```

### Adding a New API Call

1. **Create API module:**
```typescript
// src/api/myFeature.ts
import { apiClient } from './client';
import type { MyData } from '../types';

export const fetchMyData = async (id: string): Promise<MyData> => {
  const response = await apiClient.get<MyData>(`/my-feature/${id}`);
  return response.data;
};
```

2. **Use in component:**
```typescript
import { fetchMyData } from '../../api/myFeature';

const [data, setData] = useState<MyData | null>(null);
useEffect(() => {
  fetchMyData(id).then(setData);
}, [id]);
```

## Theming

### Using the Theme System

All components accept an `isDark` prop:

```typescript
<Card isDark={isDark}>
  <Text variant="h2" isDark={isDark} color="primary">
    My Card
  </Text>
</Card>
```

Or access theme colors directly:

```typescript
const theme = isDark ? darkTheme : lightTheme;
const backgroundColor = theme.background;
const textColor = theme.text;
```

### Color Palette

- **Primary**: Blue (#0ea5e9)
- **Secondary**: Purple (#a855f7)
- **Success**: Green (#22c55e)
- **Warning**: Amber (#f59e0b)
- **Error**: Red (#ef4444)
- **Neutral**: Gray scale

## Storage & Persistence

The app uses **AsyncStorage** to persist:
- User authentication data (user, token, isAuthenticated)
- Theme preference (light/dark)
- Notification settings

Data is automatically saved and loaded from the stores.

## Type Definitions

Complete TypeScript interfaces for all data models:

```typescript
// User
interface User {
  id: string;
  fullName: string;
  email: string;
  role: 'admin' | 'parent' | 'guardian' | 'child';
  status: 'active' | 'inactive' | 'pending';
  // ... more fields
}

// Family
interface Family {
  familyId: number;
  familyName: string;
  familyMantra?: string;
  familyValues: string[];
  members: FamilyMember[];
  // ... more fields
}

// Task
interface Task {
  taskId: number;
  title: string;
  status: 'pending' | 'in_progress' | 'completed';
  rewardType?: 'screentime' | 'points' | 'currency';
  // ... more fields
}

// ... and many more in src/types/index.ts
```

## Next Steps

### Phase 1: Complete Core Features
- [ ] Implement full Dashboard with real data
- [ ] Build Calendar with event management
- [ ] Complete Tasks screen with CRUD operations
- [ ] Implement Messaging with Socket.IO
- [ ] Build Shopping list management

### Phase 2: Advanced Features
- [ ] Recipe/meal planning screens
- [ ] Journal entries
- [ ] Wishlists
- [ ] Family guidelines

### Phase 3: Native Integration
- [ ] Connect Family Controls authorization
- [ ] Screen time management UI
- [ ] Device control interface
- [ ] Push notifications
- [ ] Background syncing

### Phase 4: Polish
- [ ] Comprehensive error handling
- [ ] Loading states and skeletons
- [ ] Animations and transitions
- [ ] Accessibility (a11y)
- [ ] Performance optimization

## API Integration Checklist

- [ ] Authentication endpoints
- [ ] Dashboard data fetching
- [ ] Calendar event CRUD
- [ ] Task management API
- [ ] Message endpoints
- [ ] Shopping list API
- [ ] Budget/Finance API
- [ ] Family member endpoints
- [ ] Recipe endpoints
- [ ] User profile endpoints

## Testing Strategy

```typescript
// src/__tests__/components/Button.test.tsx
import { render, screen } from '@testing-library/react-native';
import { Button } from '../../components/ui/Button';

describe('Button', () => {
  it('should render with title', () => {
    render(<Button title="Test" onPress={() => {}} />);
    expect(screen.getByText('Test')).toBeTruthy();
  });
});
```

## Troubleshooting

### Common Issues

**Issue**: Blank screen on app start
- **Solution**: Check that `setInitialized(true)` is called in SplashScreen

**Issue**: Theme not updating
- **Solution**: Ensure component reads `isDark` from `useAppStore()` and re-renders on change

**Issue**: API calls failing
- **Solution**: Check `REACT_APP_API_BASE_URL` environment variable

## Resources

- [React Native Documentation](https://reactnative.dev)
- [React Navigation](https://reactnavigation.org)
- [Zustand](https://github.com/pmndrs/zustand)
- [TypeScript Handbook](https://www.typescriptlang.org/docs/)

## Contributing

1. Create a feature branch
2. Implement feature with TypeScript
3. Add components to exports
4. Test on iOS simulator
5. Submit pull request

## Notes

- All components are fully typed with TypeScript
- Theme system supports dark/light modes throughout
- API client includes auth token injection
- Stores are persistent with AsyncStorage
- Navigation structure mirrors web app layout
- All screens have placeholder content ready for API integration
