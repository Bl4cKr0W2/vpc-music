import { createBrowserRouter } from "react-router-dom";
import { AppShell } from "./components/layout/AppShell";

// ── Pages (lazy-loaded) ──────────────────────────
import { HomePage } from "./pages/HomePage";
import { SongListPage } from "./pages/songs/SongListPage";
import { SongViewPage } from "./pages/songs/SongViewPage";
import { SetlistsPage } from "./pages/setlists/SetlistsPage";
import { LoginPage } from "./pages/auth/LoginPage";
import { SettingsPage } from "./pages/settings/SettingsPage";

export const router = createBrowserRouter([
  {
    path: "/",
    element: <AppShell />,
    children: [
      { index: true, element: <HomePage /> },
      { path: "songs", element: <SongListPage /> },
      { path: "songs/:id", element: <SongViewPage /> },
      { path: "setlists", element: <SetlistsPage /> },
      { path: "settings", element: <SettingsPage /> },
    ],
  },
  { path: "/login", element: <LoginPage /> },
]);
