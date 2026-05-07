import React from 'react';
import AdminLayout from '../../../layouts/AdminLayout';

const Users: React.FC = () => (
  <AdminLayout>
    <div style={{ padding: 24 }}>
      <h2 style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <span style={{ fontSize: 20 }}>🔐</span>
        Users
      </h2>
      <div style={{ marginTop: 12, padding: 16, background: '#F8FAFC', borderRadius: 8 }}>
        <p style={{ margin: 0, color: '#475569' }}>Users list will go here.</p>
      </div>
    </div>
  </AdminLayout>
);

export default Users;
