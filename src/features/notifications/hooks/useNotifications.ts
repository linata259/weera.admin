import { useState, useEffect, useCallback } from 'react';
import {
  fetchNotifications,
  markAsRead,
  markAllAsRead,
} from '../services/notificationService';
import type { AdminNotification } from '../types';
import { readDashboardCache, writeDashboardCache } from '../../../utils/dashboardCache';

const POLL_INTERVAL_MS = 60_000; // refresh every 60 seconds
const CACHE_KEY = 'notifications';

export function useNotifications() {
  const cached = readDashboardCache<AdminNotification[]>(CACHE_KEY);
  const [notifications, setNotifications] = useState<AdminNotification[]>(cached ?? []);
  const [loading, setLoading] = useState(cached === null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const data = await fetchNotifications();
      setNotifications(data);
      setError(null);
      writeDashboardCache(CACHE_KEY, data);
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
