import React, { useEffect, useState } from 'react';
import { View, StyleSheet, Text, ActivityIndicator } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { NavigationContainer } from '@react-navigation/native';
import { createDrawerNavigator } from '@react-navigation/drawer';
import { Sidebar } from './components/Sidebar';
import { Header } from './components/Header';
import { LinZChat } from './components/LinZChat';
import { useAuth } from './hooks/useAuth';

// Import navigation types
import './types/navigation';

// Import screens
import LoginScreen from './app/screens/Login';
import { ParentDashboard } from './app/screens/ParentDashboard';
import { ChildDevice } from './app/screens/ChildDevice';
import DashboardScreen from './screens/main/DashboardScreen';
import CalendarScreen from './screens/main/CalendarScreen';
import TasksScreen from './screens/main/TasksScreen';
import GigsScreen from './screens/main/GigsScreen';
import MessagesScreen from './screens/main/MessagesScreen';
import RecipesScreen from './screens/main/RecipesScreen';
import ShoppingScreen from './screens/main/ShoppingScreen';
import WishlistsScreen from './screens/main/WishlistsScreen';
import BudgetScreen from './screens/main/BudgetScreen';
import FamilyScreen from './screens/main/FamilyScreen';
import ValuesScreen from './screens/main/ValuesScreen';
import JournalScreen from './screens/main/JournalScreen';
import ResourcesScreen from './screens/main/ResourcesScreen';
import SettingsScreen from './screens/main/SettingsScreen';

// Import detail screens
import GigDetailsScreen from './screens/details/GigDetailsScreen';
import RecipeDetailsScreen from './screens/details/RecipeDetailsScreen';

const Drawer = createDrawerNavigator();

const App: React.FC = () => {
  const { user, isLoading, logout } = useAuth();
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);

  // Debug logging
  console.log('=== APP RENDER ===');
  console.log('User:', user ? {
    id: user.id,
    email: user.email,
    role: user.role,
    fullName: user.full_name
  } : null);
  console.log('IsLoading:', isLoading);
  console.log('==================');

  if (isLoading) {
    console.log('Loading - checking auth status...');
    return (
      <GestureHandlerRootView style={{ flex: 1 }}>
        <SafeAreaProvider>
          <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#f9fafb' }}>
            <Text style={{ fontSize: 24, fontWeight: 'bold', color: '#3b82f6', marginBottom: 20 }}>FamConomy</Text>
            <ActivityIndicator size="large" color="#3b82f6" />
          </View>
        </SafeAreaProvider>
      </GestureHandlerRootView>
    );
  }

  if (!user) {
    console.log('No user - showing LoginScreen');
    return (
      <GestureHandlerRootView style={{ flex: 1 }}>
        <SafeAreaProvider>
          <LoginScreen />
        </SafeAreaProvider>
      </GestureHandlerRootView>
    );
  }

  console.log('User authenticated - showing DrawerNavigator');

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <NavigationContainer>
          <Drawer.Navigator
            drawerContent={(props) => (
              <Sidebar
                onClose={() => props.navigation.closeDrawer()}
                user={user}
                onLogout={logout}
              />
            )}
            screenOptions={{
              header: (props) => (
                <Header
                  onMenuToggle={() => props.navigation.toggleDrawer()}
                  user={user}
                />
              ),
              drawerType: 'front',
              swipeEnabled: true,
            }}
          >
            <Drawer.Screen
              name="Dashboard"
              component={DashboardScreen}
              options={{ title: 'Dashboard' }}
            />
            <Drawer.Screen
              name="Calendar"
              component={CalendarScreen}
              options={{ title: 'Calendar' }}
            />
            <Drawer.Screen
              name="Tasks"
              component={TasksScreen}
              options={{ title: 'Tasks' }}
            />
            <Drawer.Screen
              name="Gigs"
              component={GigsScreen}
              options={{ title: 'Gigs' }}
            />
            <Drawer.Screen
              name="Messages"
              component={MessagesScreen}
              options={{ title: 'Messages' }}
            />
            <Drawer.Screen
              name="Recipes"
              component={RecipesScreen}
              options={{ title: 'Recipes' }}
            />
            <Drawer.Screen
              name="Shopping"
              component={ShoppingScreen}
              options={{ title: 'Shopping' }}
            />
            <Drawer.Screen
              name="Wishlists"
              component={WishlistsScreen}
              options={{ title: 'Wishlists' }}
            />
            <Drawer.Screen
              name="Finance"
              component={BudgetScreen}
              options={{ title: 'Finance' }}
            />
            <Drawer.Screen
              name="Family"
              component={FamilyScreen}
              options={{ title: 'Family' }}
            />
            <Drawer.Screen
              name="Values"
              component={ValuesScreen}
              options={{ title: 'Values' }}
            />
            <Drawer.Screen
              name="Journal"
              component={JournalScreen}
              options={{ title: 'Journal' }}
            />
            <Drawer.Screen
              name="Resources"
              component={ResourcesScreen}
              options={{ title: 'Resources' }}
            />
            <Drawer.Screen
              name="Settings"
              component={SettingsScreen}
              options={{ title: 'Settings' }}
            />
            <Drawer.Screen
              name="GigDetails"
              component={GigDetailsScreen}
              options={{ 
                title: 'Gig Details',
                drawerItemStyle: { display: 'none' } // Hide from drawer menu
              }}
            />
            <Drawer.Screen
              name="RecipeDetails"
              component={RecipeDetailsScreen}
              options={{ 
                title: 'Recipe Details',
                drawerItemStyle: { display: 'none' } // Hide from drawer menu
              }}
            />
          </Drawer.Navigator>

          {/* LinZ Chat Floating Button */}
          <LinZChat />
        </NavigationContainer>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
};

export default App;
