import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import {
  LayoutDashboard,
  Calendar,
  CheckSquare,
  MessageCircle,
  ShoppingCart,
  Gift,
  PiggyBank,
  Users,
  Heart,
  Star,
  Settings,
  LogOut,
  Briefcase,
  BookOpen,
  ChefHat,
} from 'lucide-react-native';

interface SidebarProps {
  onClose?: () => void;
  user?: any;
  onLogout?: () => void;
}

interface NavItem {
  id: string;
  name: string;
  route: string;
  Icon: any;
  color: string;
}

export const Sidebar: React.FC<SidebarProps> = ({ onClose, user, onLogout }) => {
  const navigation = useNavigation();

  // Debug logging
  console.log('Sidebar rendering with user:', user ? {
    email: user.email,
    fullName: user.full_name,
    role: user.role
  } : 'no user');

  const navItems: NavItem[] = [
    { id: 'dashboard', name: 'Dashboard', route: 'Dashboard', Icon: LayoutDashboard, color: '#6366f1' },
    { id: 'calendar', name: 'Calendar', route: 'Calendar', Icon: Calendar, color: '#8b5cf6' },
    { id: 'tasks', name: 'Tasks', route: 'Tasks', Icon: CheckSquare, color: '#ec4899' },
    { id: 'gigs', name: 'Gigs', route: 'Gigs', Icon: Briefcase, color: '#6366f1' },
    { id: 'messages', name: 'Messages', route: 'Messages', Icon: MessageCircle, color: '#8b5cf6' },
    { id: 'recipes', name: 'Recipes', route: 'Recipes', Icon: ChefHat, color: '#ec4899' },
    { id: 'shopping', name: 'Shopping', route: 'Shopping', Icon: ShoppingCart, color: '#14b8a6' },
    { id: 'wishlists', name: 'Wishlists', route: 'Wishlists', Icon: Gift, color: '#6366f1' },
    { id: 'finance', name: 'Finance', route: 'Finance', Icon: PiggyBank, color: '#8b5cf6' },
    { id: 'family', name: 'Family', route: 'Family', Icon: Users, color: '#ec4899' },
    { id: 'values', name: 'Values', route: 'Values', Icon: Star, color: '#6366f1' },
    { id: 'journal', name: 'Journal', route: 'Journal', Icon: Heart, color: '#8b5cf6' },
    { id: 'resources', name: 'Resources', route: 'Resources', Icon: BookOpen, color: '#ec4899' },
    { id: 'settings', name: 'Settings', route: 'Settings', Icon: Settings, color: '#6b7280' },
  ];

  const handleNavigation = (route: string) => {
    navigation.navigate(route as never);
    onClose?.();
  };

  const handleLogout = async () => {
    try {
      await onLogout?.();
      onClose?.();
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  return (
    <SafeAreaView edges={['top', 'left', 'right']} style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.logo}>FamConomy</Text>
        {user && (
          <View style={styles.userInfo}>
            <Text style={styles.userName}>{user.full_name || user.email}</Text>
            <Text style={styles.userRole}>{user.role}</Text>
          </View>
        )}
      </View>

      {/* Navigation Items */}
      <ScrollView style={styles.navList} showsVerticalScrollIndicator={false}>
        {navItems.map((item) => {
          const IconComponent = item.Icon;
          return (
            <TouchableOpacity
              key={item.id}
              style={styles.navItem}
              onPress={() => handleNavigation(item.route)}
            >
              <View style={styles.navIcon}>
                <IconComponent size={20} color={item.color} />
              </View>
              <Text style={styles.navText}>{item.name}</Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      {/* Footer - Logout */}
      <View style={styles.footer}>
        <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
          <LogOut size={20} color="#ef4444" />
          <Text style={styles.logoutText}>Logout</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#ffffff',
  paddingHorizontal: 12,
  },
  header: {
  paddingTop: 16,
  paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  logo: {
    fontSize: 24,
    fontWeight: 'bold',
  color: '#4f7288',
    marginBottom: 16,
  },
  userInfo: {
    marginTop: 8,
  },
  userName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1f2937',
  },
  userRole: {
    fontSize: 14,
    color: '#6b7280',
    marginTop: 4,
    textTransform: 'capitalize',
  },
  navList: {
    flex: 1,
  paddingVertical: 12,
  },
  navItem: {
    flexDirection: 'row',
    alignItems: 'center',
  paddingVertical: 14,
  paddingHorizontal: 12,
  marginHorizontal: 4,
    marginVertical: 2,
    borderRadius: 12,
  },
  navIcon: {
    marginRight: 12,
  },
  navText: {
    fontSize: 16,
    color: '#374151',
    fontWeight: '500',
  },
  footer: {
  paddingVertical: 16,
  paddingHorizontal: 8,
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 12,
  },
  logoutText: {
    fontSize: 16,
    color: '#ef4444',
    marginLeft: 12,
    fontWeight: '500',
  },
});
