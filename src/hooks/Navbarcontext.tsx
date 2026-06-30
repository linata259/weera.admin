import { createContext, useContext, useState, useCallback, ReactNode } from 'react';

export interface NavbarBreadcrumb {
  parent: string;   // e.g. "Settings"
  current: string;  // e.g. "General Settings"
}

interface NavbarContextValue {
  breadcrumb: NavbarBreadcrumb | null;
  setBreadcrumb: (b: NavbarBreadcrumb | null) => void;
}

const NavbarContext = createContext<NavbarContextValue>({
  breadcrumb: null,
  setBreadcrumb: () => {},
});

export function NavbarProvider({ children }: { children: ReactNode }) {
  const [breadcrumb, setBreadcrumbState] = useState<NavbarBreadcrumb | null>(null);
  const setBreadcrumb = useCallback((b: NavbarBreadcrumb | null) => setBreadcrumbState(b), []);
  return (
    <NavbarContext.Provider value={{ breadcrumb, setBreadcrumb }}>
      {children}
    </NavbarContext.Provider>
  );
}

export function useNavbar() {
  return useContext(NavbarContext);
}