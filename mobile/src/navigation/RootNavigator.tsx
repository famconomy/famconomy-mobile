import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import type { RootStackParamList, AuthStackParamList, MainStackParamList, TabParamList } from '../types';
import { useAuthStore } from '../store/authStore';
import { useAppStore } from '../store/appStore';

// Import screens (we'll create these next)
// Auth screens
import LoginScreen from '../screens/auth/LoginScreen';
import SignUpScreen from '../screens/auth/SignUpScreen';
import ForgotPasswordScreen from '../screens/auth/ForgotPasswordScreen';
import SplashScreen from '../screens/SplashScreen';

// Main screens
import DashboardScreen from '../screens/main/DashboardScreen';
import CalendarScreen from '../screens/main/CalendarScreen';
import TasksScreen from '../screens/main/TasksScreen';
import MessagesScreen from '../screens/main/MessagesScreen';
import ShoppingScreen from '../screens/main/ShoppingScreen';
import BudgetScreen from '../screens/main/BudgetScreen';
import FamilyScreen from '../screens/main/FamilyScreen';
import MoreScreen from '../screens/main/MoreScreen';
import SettingsScreen from '../screens/main/SettingsScreen';
import ProfileScreen from '../screens/main/ProfileScreen';

// Detail screens
import EventDetailsScreen from '../screens/details/EventDetailsScreen';
import TaskDetailsScreen from '../screens/details/TaskDetailsScreen';
import RecipeDetailsScreen from '../screens/details/RecipeDetailsScreen';
import MemberProfileScreen from '../screens/details/MemberProfileScreen';
import ChatDetailScreen from '../screens/details/ChatDetailScreen';

const RootStack = createNativeStackNavigator<RootStackParamList>();
const AuthStack = createNativeStackNavigator<AuthStackParamList>();
const MainStack = createNativeStackNavigator<MainStackParamList>();
const Tab = createBottomTabNavigator<TabParamList>();

// Auth Navigator
const AuthNavigator: React.FC = () => {
  return (
    <AuthStack.Navigator
      screenOptions={{
        headerShown: false,
        animationEnabled: true,
      }}
    >
      <AuthStack.Screen name="Login" component={LoginScreen} />
      <AuthStack.Screen name="SignUp" component={SignUpScreen} />
      <AuthStack.Screen name="ForgotPassword" component={ForgotPasswordScreen} />
    </AuthStack.Navigator>
  );
};

// Tab Navigator (Bottom Tabs)
const TabNavigator: React.FC = () => {
  const { theme } = useAppStore();
  const isDark = theme === 'dark';

  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: isDark ? '#0ea5e9' : '#0284c7',
        tabBarInactiveTintColor: isDark ? '#6b7280' : '#9ca3af',
        tabBarStyle: {
          backgroundColor: isDark ? '#1f2937' : '#ffffff',
          borderTopColor: isDark ? '#374151' : '#e5e7eb',
        },
      }}
    >
      <Tab.Screen
        name="Dashboard"
        component={DashboardScreen}
        options={{
          title: 'Home',
        }}
      />
      <Tab.Screen
        name="Calendar"
        component={CalendarScreen}
        options={{
          title: 'Calendar',
        }}
      />
      <Tab.Screen
        name="Tasks"
        component={TasksScreen}
        options={{
          title: 'Tasks',
        }}
      />
      <Tab.Screen
        name="Messages"
        component={MessagesScreen}
        options={{
          title: 'Messages',
        }}
      />
      <Tab.Screen
        name="More"
        component={MoreScreen}
        options={{
          title: 'More',
        }}
      />
    </Tab.Navigator>
  );
};

// Main Navigator (Stack with Tabs)
const MainNavigator: React.FC = () => {
  return (
    <MainStack.Navigator
      screenOptions={{
        headerShown: false,
      }}
    >
      <MainStack.Screen name="HomeTabs" component={TabNavigator} />
      <MainStack.Screen
        name="EventDetails"
        component={EventDetailsScreen}
        options={{
          animationEnabled: true,
          cardStyle: { backgroundColor: 'transparent' },
        }}
      />
      <MainStack.Screen
        name="TaskDetails"
        component={TaskDetailsScreen}
        options={{
          animationEnabled: true,
        }}
      />
      <MainStack.Screen
        name="RecipeDetails"
        component={RecipeDetailsScreen}
        options={{
          animationEnabled: true,
        }}
      />
      <MainStack.Screen
        name="MemberProfile"
        component={MemberProfileScreen}
        options={{
          animationEnabled: true,
        }}
      />
      <MainStack.Screen
        name="Profile"
        component={ProfileScreen}
        options={{ animationEnabled: true }}
      />
      <MainStack.Screen
        name="Settings"
        component={SettingsScreen}
        options={{ animationEnabled: true }}
      />
      <MainStack.Screen
        name="ChatDetail"
        component={ChatDetailScreen}
        options={{
          animationEnabled: true,
        }}
      />
    </MainStack.Navigator>
  );
};

// Root Navigator
export const RootNavigator: React.FC = () => {
  const { isAuthenticated, isLoading } = useAuthStore();
  const { isInitialized } = useAppStore();

  if (!isInitialized) {
    return <SplashScreen />;
  }

  return (
    <NavigationContainer>
      <RootStack.Navigator
        screenOptions={{
          headerShown: false,
        }}
      >
        {isAuthenticated ? (
          <RootStack.Screen name="Main" component={MainNavigator} />
        ) : (
          <RootStack.Screen name="Auth" component={AuthNavigator} />
        )}
      </RootStack.Navigator>
    </NavigationContainer>
  );
};
