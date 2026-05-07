import { api } from '@services/api';

export const fetchUsers = async () => {
  const res = await api.get('/users');
  return res.data;
};
