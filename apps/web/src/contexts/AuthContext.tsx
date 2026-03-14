import { createContext, useContext, useState, type ReactNode } from "react";

interface User {
  id: string;
  email: string;
  displayName: string;
  role: "viewer" | "editor" | "admin";
}

interface AuthContextValue {
  user: User | null;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);

  const login = async (_email: string, _password: string) => {
    // TODO: call /api/auth/login
    throw new Error("Not implemented");
  };

  const logout = () => {
    setUser(null);
    // TODO: call /api/auth/logout
  };

  return (
    <AuthContext.Provider value={{ user, isAuthenticated: !!user, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
