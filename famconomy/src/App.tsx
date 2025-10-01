import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { MainLayout } from './components/layout/MainLayout';
import { DashboardPage } from './pages/DashboardPage';
import { CalendarPage } from './pages/CalendarPage';
import { TasksPage } from './pages/TasksPage';
import { GigsPage } from './pages/GigsPage';
import { GigsSettingsPage } from './pages/GigsSettingsPage';
import { MessagesPage } from './pages/MessagesPage';
import { ShoppingPage } from './pages/ShoppingPage';
import { BudgetPage } from './pages/BudgetPage';
import { FamilyPage } from './pages/FamilyPage';
import { JournalPage } from './pages/JournalPage';
import { SettingsPage } from './pages/SettingsPage';
import { ProfilePage } from './pages/ProfilePage';
import { LoginPage } from './pages/LoginPage';
import { JoinPage } from './pages/JoinPage';
import { OnboardingPage } from './pages/OnboardingPage';
import { AuthProvider } from './hooks/useAuth';
import { NotificationsProvider } from './hooks/useNotifications';
import { ThemeProvider } from './contexts/ThemeContext';
import { AppContent } from './components/AppContent';

function App() {
  return (
    <AuthProvider>
      <NotificationsProvider>
        <ThemeProvider>
          <AppContent />
        </ThemeProvider>
      </NotificationsProvider>
    </AuthProvider>
  );
}

export default App;
