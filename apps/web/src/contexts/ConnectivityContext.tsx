import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import { songsApi } from "@/lib/api-client";
import {
  getOfflineSongEditCount,
  getOfflineSongEditQueue,
  isOfflineRequestError,
  removeOfflineSongEdit,
} from "@/lib/offline-cache";

type ConnectivityContextValue = {
  isOnline: boolean;
  syncingOfflineEdits: boolean;
  pendingOfflineEditCount: number;
  refreshPendingOfflineEditCount: () => void;
};

const ConnectivityContext = createContext<ConnectivityContextValue | undefined>(undefined);

export function ConnectivityProvider({ children }: { children: React.ReactNode }) {
  const { activeOrg } = useAuth();
  const [isOnline, setIsOnline] = useState(() => (typeof navigator === "undefined" ? true : navigator.onLine));
  const [syncingOfflineEdits, setSyncingOfflineEdits] = useState(false);
  const [pendingOfflineEditCount, setPendingOfflineEditCount] = useState(() => getOfflineSongEditCount());

  const refreshPendingOfflineEditCount = useCallback(() => {
    setPendingOfflineEditCount(getOfflineSongEditCount());
  }, []);

  const flushOfflineEdits = useCallback(async () => {
    if (!isOnline || !activeOrg?.id || syncingOfflineEdits) {
      return;
    }

    const queuedItems = getOfflineSongEditQueue().filter((item) => item.organizationId === activeOrg.id);
    if (queuedItems.length === 0) {
      refreshPendingOfflineEditCount();
      return;
    }

    setSyncingOfflineEdits(true);
    let syncedCount = 0;

    for (const item of queuedItems) {
      try {
        await songsApi.update(item.songId, {
          ...item.songData,
          lastKnownUpdatedAt: item.lastKnownUpdatedAt ?? undefined,
        });
        removeOfflineSongEdit(item.id);
        syncedCount += 1;
      } catch (error) {
        if (isOfflineRequestError(error)) {
          break;
        }
      }
    }

    refreshPendingOfflineEditCount();
    setSyncingOfflineEdits(false);

    if (syncedCount > 0) {
      toast.success(`Synced ${syncedCount} offline edit${syncedCount === 1 ? "" : "s"}`);
    }
  }, [activeOrg?.id, isOnline, refreshPendingOfflineEditCount, syncingOfflineEdits]);

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);
    window.addEventListener("storage", refreshPendingOfflineEditCount);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
      window.removeEventListener("storage", refreshPendingOfflineEditCount);
    };
  }, [refreshPendingOfflineEditCount]);

  useEffect(() => {
    refreshPendingOfflineEditCount();
  }, [refreshPendingOfflineEditCount, activeOrg?.id]);

  useEffect(() => {
    void flushOfflineEdits();
  }, [flushOfflineEdits]);

  const value = useMemo(
    () => ({
      isOnline,
      syncingOfflineEdits,
      pendingOfflineEditCount,
      refreshPendingOfflineEditCount,
    }),
    [isOnline, pendingOfflineEditCount, refreshPendingOfflineEditCount, syncingOfflineEdits],
  );

  return <ConnectivityContext.Provider value={value}>{children}</ConnectivityContext.Provider>;
}

export function useConnectivity() {
  const context = useContext(ConnectivityContext);
  if (!context) {
    throw new Error("useConnectivity must be used within a ConnectivityProvider");
  }

  return context;
}
