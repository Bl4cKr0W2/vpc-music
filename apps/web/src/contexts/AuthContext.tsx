import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  type ReactNode,
} from "react";
import { authApi, setActiveOrganizationId } from "@/lib/api-client";

export interface OrgMembership {
  id: string;
  name: string;
  role: "admin" | "musician" | "observer";
}

export interface User {
  id: string;
  email: string;
  displayName: string;
  role: "owner" | "member";
  organizations?: OrgMembership[];
}

interface AuthContextValue {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  /** The active org (first/only org, or selected org) */
  activeOrg: OrgMembership | null;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, displayName?: string) => Promise<void>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
  setUser: (user: User) => void;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Derive active org: auto-select first/only org
  const activeOrg: OrgMembership | null = user?.organizations?.[0] ?? null;

  // Keep api-client in sync with active org
  useEffect(() => {
    setActiveOrganizationId(activeOrg?.id ?? null);
  }, [activeOrg?.id]);

  // On mount, try to restore session from cookie
  const refreshUser = useCallback(async () => {
    try {
      const { user: me } = await authApi.me();
      setUser(me);
    } catch {
      setUser(null);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    refreshUser();
  }, [refreshUser]);

  const login = useCallback(async (email: string, password: string) => {
    const { user: loggedIn } = await authApi.login(email, password);
    setUser(loggedIn);
  }, []);

  const register = useCallback(
    async (email: string, password: string, displayName?: string) => {
      const { user: created } = await authApi.register({ email, password, displayName });
      setUser(created);
    },
    []
  );

  const logout = useCallback(async () => {
    await authApi.logout();
    setUser(null);
  }, []);

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated: !!user,
        isLoading,
        activeOrg,
        login,
        register,
        logout,
        refreshUser,
        setUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
