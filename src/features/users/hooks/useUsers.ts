import { useState, useEffect } from 'react';
import { fetchUsers } from '@features/users/api/userServices';

export const useUsers = () => {
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    fetchUsers()
      .then((data) => {
        if (mounted) setUsers(data || []);
      })
      .catch(() => {
        if (mounted) setUsers([]);
      })
      .finally(() => {
        if (mounted) setLoading(false);
      });

    return () => {
      mounted = false;
    };
  }, []);

  return { users, loading };
};
