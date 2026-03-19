"use client";

import React, { useEffect, useState } from "react";
import { Bell } from "lucide-react";
import { Button } from "@/components/ui/button";
import { NotificationDetailModal } from "@/components/tutor/notification-detail-modal";

type Notif = {
  id: string;
  title: string;
  body: string;
  is_read: boolean;
  created_at: string;
  related_attempt_id: string | null;
};

function formatRelativeTime(iso: string): string {
  const now = Date.now();
  const then = new Date(iso).getTime();
  if (Number.isNaN(then)) return "";
  const diffMs = now - then;
  const diffSec = Math.floor(diffMs / 1000);
  if (diffSec < 60) return "hace un momento";
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return `hace ${diffMin} ${diffMin === 1 ? "minuto" : "minutos"}`;
  const diffH = Math.floor(diffMin / 60);
  if (diffH < 24) return `hace ${diffH} ${diffH === 1 ? "hora" : "horas"}`;
  const diffD = Math.floor(diffH / 24);
  if (diffD < 30) return `hace ${diffD} ${diffD === 1 ? "día" : "días"}`;
  const diffMo = Math.floor(diffD / 30);
  return `hace ${diffMo} ${diffMo === 1 ? "mes" : "meses"}`;
}

export default function NotificacionesPage() {
  const [notifications, setNotifications] = useState<Notif[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedNotifId, setSelectedNotifId] = useState<string | null>(null);
  const [markingAll, setMarkingAll] = useState(false);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        setLoading(true);
        setError(null);
        const res = await fetch("/api/tutor/notificaciones");
        const json = await res.json();
        if (!res.ok) throw new Error(json?.message || json?.error || `HTTP ${res.status}`);
        if (!cancelled) setNotifications(json as Notif[]);
      } catch (e: unknown) {
        if (!cancelled) setError(e instanceof Error ? e.message : "No se pudieron cargar las notificaciones.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, []);

  const hasUnread = notifications.some((n) => !n.is_read);

  async function handleMarkAllRead() {
    setMarkingAll(true);
    try {
      const res = await fetch("/api/tutor/notificaciones", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ markAllRead: true }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.message || json?.error || `HTTP ${res.status}`);
      setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "No se pudo marcar todo como leído.");
    } finally {
      setMarkingAll(false);
    }
  }

  async function handleNotifClick(notif: Notif) {
    if (!notif.related_attempt_id) return;
    if (!notif.is_read) {
      try {
        const res = await fetch("/api/tutor/notificaciones", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ ids: [notif.id] }),
        });
        if (res.ok) {
          setNotifications((prev) =>
            prev.map((n) => (n.id === notif.id ? { ...n, is_read: true } : n)),
          );
        }
      } catch {
        // non-blocking — open modal anyway
      }
    }
    setSelectedNotifId(notif.id);
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      <div className="mb-6 flex items-center justify-between gap-4">
        <h1 className="text-2xl font-bold text-foreground">Notificaciones</h1>
        {hasUnread && (
          <Button
            variant="outline"
            size="sm"
            onClick={handleMarkAllRead}
            disabled={markingAll}
          >
            {markingAll ? "Marcando…" : "Marcar todo como leído"}
          </Button>
        )}
      </div>

      {error && (
        <div className="mb-4 rounded-lg border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {error}
        </div>
      )}

      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-20 animate-pulse rounded-lg bg-muted" />
          ))}
        </div>
      ) : notifications.length === 0 ? (
        <div className="flex flex-col items-center gap-3 py-20 text-center">
          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-primary/10">
            <Bell className="h-7 w-7 text-primary" />
          </div>
          <p className="text-base text-muted-foreground">No tienes notificaciones.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {notifications.map((notif) => (
            <div
              key={notif.id}
              onClick={() => handleNotifClick(notif)}
              className={`flex cursor-pointer items-start gap-3 rounded-lg border p-4 transition-colors hover:bg-accent/50 ${
                !notif.is_read ? "bg-muted" : "bg-card"
              } ${notif.related_attempt_id ? "cursor-pointer" : "cursor-default"}`}
            >
              <div className="mt-1.5 flex w-2 shrink-0 justify-center">
                {!notif.is_read && (
                  <span className="block h-2 w-2 rounded-full bg-primary" />
                )}
              </div>
              <div className="min-w-0 flex-1">
                <p
                  className={`text-sm leading-snug ${
                    !notif.is_read ? "font-semibold text-foreground" : "font-normal text-foreground"
                  }`}
                >
                  {notif.title}
                </p>
                <p className="mt-0.5 text-sm text-muted-foreground">{notif.body}</p>
                <div className="mt-1.5 flex items-center gap-3">
                  <span className="text-xs text-muted-foreground">
                    {formatRelativeTime(notif.created_at)}
                  </span>
                  {notif.related_attempt_id && (
                    <span className="text-xs font-medium text-primary">Ver evaluación →</span>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <NotificationDetailModal
        notificationId={selectedNotifId}
        onClose={() => setSelectedNotifId(null)}
      />
    </div>
  );
}
