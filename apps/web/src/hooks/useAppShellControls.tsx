import { createContext, useContext } from 'react';

type AppShellControls = {
  ensureSidebarExpanded: () => void;
  setSidebarCollapsed: (collapsed: boolean) => void;
  openMobileMenu: () => void;
  closeMobileMenu: () => void;
  toggleMobileMenu: () => void;
  isSidebarCollapsed: boolean;
  isMobileMenuOpen: boolean;
  isMobile: boolean;
};

const AppShellControlsContext = createContext<AppShellControls | null>(null);

export const AppShellControlsProvider = AppShellControlsContext.Provider;

export const useAppShellControls = () => useContext(AppShellControlsContext);
