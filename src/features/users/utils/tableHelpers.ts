export const sortData = <T>(data: T[], key: keyof T, direction: 'asc' | 'desc') => {
  return [...data].sort((a, b) => {
    if (a[key] < b[key]) return direction === 'asc' ? -1 : 1;
    if (a[key] > b[key]) return direction === 'asc' ? 1 : -1;
    return 0;
  });
};

// src/api/userApi.ts
export const fetchUsers = async () => {
  // Replace with your actual PHP backend endpoint
  const response = await fetch('/api/users');
  return response.json();
};