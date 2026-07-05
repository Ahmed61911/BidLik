import { createFileRoute } from "@tanstack/react-router";
import { useMesNotifications, acheteurStore } from "@/lib/supabaseAcheteurStore";
import { formatDateTime } from "@/lib/format";
import { Bell, Trophy, AlertTriangle, Wallet, Info, Clock } from "lucide-react";
import type { NotifType } from "@/types/acheteur";

export const Route = createFileRoute("/acheteur/notifications")({
  component: NotificationsPage,
});

const ICON: Record<NotifType, React.ReactNode> = {
  outbid: <AlertTriangle className="h-4 w-4 text-destructive" />,
  won: <Trophy className="h-4 w-4 text-emerald-600" />,
  lost: <Info className="h-4 w-4 text-muted-foreground" />,
  ending_soon: <Clock className="h-4 w-4 text-amber-600" />,
  caution: <Wallet className="h-4 w-4 text-primary" />,
  system: <Bell className="h-4 w-4 text-muted-foreground" />,
};

function NotificationsPage() {
  const notifs = useMesNotifications();
  const unread = notifs.filter((n) => !n.read).length;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          {unread > 0 ? `${unread} notification${unread > 1 ? "s" : ""} non lue${unread > 1 ? "s" : ""}` : "Tout est à jour"}
        </p>
        {unread > 0 && (
          <button
            onClick={() => acheteurStore.markAllRead()}
            className="rounded-md border border-border bg-card px-3 py-1.5 text-xs font-semibold text-foreground hover:bg-secondary"
          >
            Tout marquer comme lu
          </button>
        )}
      </div>

      {notifs.length === 0 ? (
        <div className="rounded-2xl border border-border bg-card p-8 text-center text-sm text-muted-foreground">
          Aucune notification pour le moment.
        </div>
      ) : (
        <ul className="overflow-hidden rounded-2xl border border-border bg-card divide-y divide-border">
          {notifs.map((n) => (
            <li
              key={n.id}
              onClick={() => !n.read && acheteurStore.markRead(n.id)}
              className={[
                "flex cursor-pointer gap-3 p-4 transition-colors hover:bg-secondary/50",
                !n.read ? "bg-accent/5" : "",
              ].join(" ")}
            >
              <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-secondary">
                {ICON[n.type]}
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-start justify-between gap-2">
                  <p className="font-semibold text-foreground">{n.titre}</p>
                  {!n.read && <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-accent" />}
                </div>
                <p className="mt-0.5 text-sm text-muted-foreground">{n.message}</p>
                <p className="mt-1 text-xs text-muted-foreground">{formatDateTime(n.createdAt)}</p>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
