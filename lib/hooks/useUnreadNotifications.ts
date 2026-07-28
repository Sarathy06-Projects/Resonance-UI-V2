"use client";

import { useEffect, useState } from "react";
import useSWR from "swr";
import { getUnreadCount, notificationsStreamUrl } from "@/lib/api/notifications";
import { useAuthStore } from "@/store/useAuthStore";

// Polls once on mount via SWR, then stays live over the backend's SSE
// channel (see realtime/sse.ts on the backend) so the nav bell's unread
// badge updates without a manual refresh.
export function useUnreadNotifications() {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const { data, mutate } = useSWR(isAuthenticated ? "unread-count" : null, () => getUnreadCount());
  const [liveCount, setLiveCount] = useState<number | null>(null);

  useEffect(() => {
    if (!isAuthenticated) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- resetting local cache on sign-out, not syncing external state
      setLiveCount(null);
      return;
    }

    const source = new EventSource(notificationsStreamUrl(), { withCredentials: true });
    source.addEventListener("unread-count", (event) => {
      const payload = JSON.parse((event as MessageEvent).data) as { count: number };
      setLiveCount(payload.count);
    });
    source.addEventListener("notification", () => {
      void mutate();
    });
    source.onerror = () => {
      // EventSource auto-reconnects; nothing to do here beyond letting SWR's
      // polling-on-mount value stand until the stream recovers.
    };

    return () => source.close();
  }, [isAuthenticated, mutate]);

  return liveCount ?? data?.count ?? 0;
}
