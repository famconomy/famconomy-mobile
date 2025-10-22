import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { Header } from './Header';
import { motion, AnimatePresence } from 'framer-motion';
import { LinZFloatingChat } from '../LinZFloatingChat';
import { AppShellControlsProvider } from '../../hooks/useAppShellControls';
import { useLinZChat } from '../../hooks/useLinZChat';
import { useTheme } from '../../contexts/ThemeContext';

export const MainLayout: React.FC = () => {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [isMobile, setIsMobile] = useState(window.innerWidth < 1024);
  const location = useLocation();
  const { registerActionHandler } = useLinZChat();
  const { isDarkMode, toggleTheme, setTheme } = useTheme();

  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 1024);
      if (window.innerWidth >= 1024) {
        setIsMobileMenuOpen(false);
      }
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Close mobile menu on route change
  useEffect(() => {
    if (isMobile) {
      setIsMobileMenuOpen(false);
    }
  }, [location, isMobile]);

  const toggleMobileMenu = useCallback(() => {
    setIsMobileMenuOpen(prev => !prev);
  }, []);

  const ensureSidebarExpanded = useCallback(() => {
    setIsSidebarCollapsed(false);
    if (isMobile) {
      setIsMobileMenuOpen(true);
    }
  }, [isMobile]);

  const controlsValue = useMemo(
    () => ({
      ensureSidebarExpanded,
      setSidebarCollapsed: setIsSidebarCollapsed,
      openMobileMenu: () => setIsMobileMenuOpen(true),
      closeMobileMenu: () => setIsMobileMenuOpen(false),
      toggleMobileMenu,
      isSidebarCollapsed,
      isMobileMenuOpen,
      isMobile,
    }),
    [ensureSidebarExpanded, isSidebarCollapsed, isMobileMenuOpen, isMobile, toggleMobileMenu]
  );

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const handler = (event: Event) => {
      const detail = (event as CustomEvent<{ delay?: number }>).detail ?? {};
      const run = () => ensureSidebarExpanded();
      if (detail.delay && detail.delay > 0) {
        window.setTimeout(run, detail.delay);
      } else {
        run();
      }
    };

    window.addEventListener('app-shell:openSidebar', handler as EventListener);
    return () => {
      window.removeEventListener('app-shell:openSidebar', handler as EventListener);
    };
  }, [ensureSidebarExpanded]);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const handler = (event: Event) => {
      const detail = (event as CustomEvent<{ delay?: number }>).detail ?? {};
      const run = () => {
        setIsSidebarCollapsed(true);
        setIsMobileMenuOpen(false);
      };
      if (detail.delay && detail.delay > 0) {
        window.setTimeout(run, detail.delay);
      } else {
        run();
      }
    };

    window.addEventListener('app-shell:closeSidebar', handler as EventListener);
    return () => {
      window.removeEventListener('app-shell:closeSidebar', handler as EventListener);
    };
  }, []);

  useEffect(() => {
    const unregisterCallbacks: Array<() => void> = [];

    const register = (action: string, handler: (payload?: Record<string, unknown>) => void) => {
      const unregister = registerActionHandler(action, handler);
      unregisterCallbacks.push(unregister);
    };

    const resolveMode = (value: unknown): 'light' | 'dark' | null => {
      if (typeof value === 'string') {
        const normalized = value.trim().toLowerCase();
        if (['dark', 'dark-mode', 'night', 'dim', 'moon'].includes(normalized)) {
          return 'dark';
        }
        if (['light', 'light-mode', 'day', 'bright', 'sun'].includes(normalized)) {
          return 'light';
        }
      }
      if (typeof value === 'boolean') {
        return value ? 'dark' : 'light';
      }
      return null;
    };

    const handleSetTheme = (payload?: Record<string, unknown>) => {
      const mode = resolveMode(payload?.mode ?? payload?.theme ?? payload?.value ?? payload?.target ?? payload);
      if (!mode) {
        return;
      }
      if (mode === 'dark' && !isDarkMode) {
        setTheme('dark');
      } else if (mode === 'light' && isDarkMode) {
        setTheme('light');
      }
    };

    const handleToggleTheme = (payload?: Record<string, unknown>) => {
      const requestedMode = resolveMode(payload?.mode ?? payload?.theme ?? payload?.value);
      if (requestedMode) {
        handleSetTheme({ mode: requestedMode });
        return;
      }
      toggleTheme();
    };

    register('toggle-theme', handleToggleTheme);
    register('theme-toggle', handleToggleTheme);
    register('theme:toggle', handleToggleTheme);
    register('set-theme', handleSetTheme);
    register('theme-set', handleSetTheme);
    register('theme:set', handleSetTheme);
    register('change-theme', handleSetTheme);
    register('theme-change', handleSetTheme);

    return () => {
      unregisterCallbacks.forEach(unregister => unregister());
    };
  }, [isDarkMode, registerActionHandler, setTheme, toggleTheme]);

  return (
    <AppShellControlsProvider value={controlsValue}>
      <div className="flex h-screen bg-gradient-to-br from-neutral-50 via-neutral-100 to-neutral-200 dark:from-neutral-900 dark:via-neutral-800 dark:to-neutral-900 text-neutral-900 dark:text-white">
      {/* Sidebar - hidden on mobile unless toggled */}
      <AnimatePresence>
        {(!isMobile || isMobileMenuOpen) && (
          <motion.div
            initial={{ x: -320 }}
            animate={{ x: 0 }}
            exit={{ x: -320 }}
            transition={{ type: 'spring', stiffness: 300, damping: 30 }}
            className={`${
              isMobile ? 'fixed inset-y-0 left-0 z-40 w-64' : 'block'
            }`}
          >
            <Sidebar
              collapsed={isSidebarCollapsed}
              onCollapsedChange={setIsSidebarCollapsed}
              onNavigate={() => isMobile && setIsMobileMenuOpen(false)}
            />
          </motion.div>
        )}
      </AnimatePresence>
      
      {/* Mobile sidebar overlay */}
      <AnimatePresence>
        {isMobile && isMobileMenuOpen && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 bg-neutral-900/50 backdrop-blur-sm z-30"
            onClick={toggleMobileMenu}
          />
        )}
      </AnimatePresence>
      
      {/* Main content */}
      <div className="flex flex-col flex-1 overflow-hidden">
        <Header 
          onMenuToggle={toggleMobileMenu} 
          isMobileMenuOpen={isMobileMenuOpen} 
        />
        
        <main className="flex-1 overflow-y-auto p-4 md:p-6">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
          >
            <Outlet />
          </motion.div>
        </main>
      </div>
      <LinZFloatingChat />
    </div>
    </AppShellControlsProvider>
  );
};
