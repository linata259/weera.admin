import { sortData } from '@features/users/utils/tableHelpers';
import { useState, useMemo } from 'react';


export const useUsers = (initialUsers: any[]) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [sortConfig, setSortConfig] = useState<{ key: string; dir: 'asc' | 'desc' }>({ key: 'id', dir: 'asc' });

  const filteredAndSortedUsers = useMemo(() => {
    let result = initialUsers.filter(user => 
      Object.values(user).some(val => String(val).toLowerCase().includes(searchTerm.toLowerCase()))
    );
    return sortData(result, sortConfig.key as any, sortConfig.dir);
  }, [initialUsers, searchTerm, sortConfig]);
  

  const requestSort = (key: string) => {
    let direction: 'asc' | 'desc' = 'asc';
    if (sortConfig.key === key && sortConfig.dir === 'asc') direction = 'desc';
    setSortConfig({ key, dir: direction });
  };

  return { searchTerm, setSearchTerm, filteredAndSortedUsers, requestSort, sortConfig };
};