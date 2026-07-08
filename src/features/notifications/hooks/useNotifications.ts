import { useState, useEffect, useCallback } from 'react';
import {
  fetchNotifications,
  markAsRead,
  markAllAsRead,
} from '../services/notificationService';
import type { AdminNotification } from '../types';

const POLL_INTERVAL_MS = 60_000; // refresh every 60 seconds

export function useNotifications() {
  const [notifications, setNotifications] = useState<AdminNotification[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const data = await fetchNotifications();
      setNotifications(data);
      setError(null);
    } catch (e) {
      setError('Failed to load notifications');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
    const timer = setInterval(load, POLL_INTERVAL_MS);
    return () => clearInterval(timer);
  }, [load]);

  const handleMarkAsRead = useCallback((id: string) => {
    markAsRead(id);
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, isRead: true } : n)),
    );
  }, []);

  const handleMarkAllAsRead = useCallback(() => {
    const ids = notifications.map((n) => n.id);
    markAllAsRead(ids);
    setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
  }, [notifications]);

  const unreadCount = notifications.filter((n) => !n.isRead).length;

  return {
    notifications,
    loading,
    error,
    unreadCount,
    refresh: load,
    markAsRead: handleMarkAsRead,
    markAllAsRead: handleMarkAllAsRead,
  };
}
