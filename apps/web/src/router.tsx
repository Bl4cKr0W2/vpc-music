import { createBrowserRouter } from "react-router-dom";
import { AppShell } from "./components/layout/AppShell";
import { RouteErrorPage } from "./components/shared/RouteErrorPage";
import { ProtectedRoute } from "./components/shared/ProtectedRoute";

// ── Pages ────────────────────────────────────────
import { LandingPage } from "./pages/LandingPage";
import { DashboardPage } from "./pages/DashboardPage";
import { SongListPage } from "./pages/songs/SongListPage";
import { SongViewPage } from "./pages/songs/SongViewPage";
import { SongEditPage } from "./pages/songs/SongEditPage";
import { SetlistsPage } from "./pages/setlists/SetlistsPage";
import { SetlistViewPage } from "./pages/setlists/SetlistViewPage";
import { LoginPage } from "./pages/auth/LoginPage";
import { ForgotPasswordPage } from "./pages/auth/ForgotPasswordPage";
import { ResetPasswordPage } from "./pages/auth/ResetPasswordPage";
import { SettingsPage } from "./pages/settings/SettingsPage";
import { NotFoundPage } from "./pages/NotFoundPage";

export const router = createBrowserRouter([
  // ── Public routes (no AppShell) ──────────────
  { path: "/", element: <LandingPage />, errorElement: <RouteErrorPage /> },
  { path: "/login", element: <LoginPage /> },
  { path: "/forgot-password", element: <ForgotPasswordPage /> },
  { path: "/reset-password", element: <ResetPasswordPage /> },

  // ── Authenticated routes (inside AppShell) ───
  {
    element: (
      <ProtectedRoute>
        <AppShell />
      </ProtectedRoute>
    ),
    errorElement: <RouteErrorPage />,
    children: [
      { path: "/dashboard", element: <DashboardPage /> },
      { path: "/songs", element: <SongListPage /> },
      { path: "/songs/new", element: <SongEditPage /> },
      { path: "/songs/:id", element: <SongViewPage /> },
      { path: "/songs/:id/edit", element: <SongEditPage /> },
      { path: "/setlists", element: <SetlistsPage /> },
      { path: "/setlists/new", element: <SetlistsPage /> },
      { path: "/setlists/:id", element: <SetlistViewPage /> },
      { path: "/settings", element: <SettingsPage /> },
      { path: "*", element: <NotFoundPage /> },
    ],
  },
]);
