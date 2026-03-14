import { createBrowserRouter } from "react-router-dom";
import { AppShell } from "./components/layout/AppShell";
import { RouteErrorPage } from "./components/shared/RouteErrorPage";

// ── Pages ────────────────────────────────────────
import { HomePage } from "./pages/HomePage";
import { SongListPage } from "./pages/songs/SongListPage";
import { SongViewPage } from "./pages/songs/SongViewPage";
import { SetlistsPage } from "./pages/setlists/SetlistsPage";
import { LoginPage } from "./pages/auth/LoginPage";
import { SettingsPage } from "./pages/settings/SettingsPage";
import { NotFoundPage } from "./pages/NotFoundPage";

export const router = createBrowserRouter([
  {
    path: "/",
    element: <AppShell />,
    errorElement: <RouteErrorPage />,
    children: [
      { index: true, element: <HomePage /> },
      { path: "songs", element: <SongListPage /> },
      { path: "songs/:id", element: <SongViewPage /> },
      { path: "setlists", element: <SetlistsPage /> },
      { path: "settings", element: <SettingsPage /> },
      { path: "*", element: <NotFoundPage /> },
    ],
  },
  { path: "/login", element: <LoginPage /> },
]);
