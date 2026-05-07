import React from 'react';
import AdminLayout from '../../layouts/AdminLayout';

const Dashboard: React.FC = () => {
  return (
    <AdminLayout>
      <div style={{ padding: 24 }}>
        <div style={{
          padding: 24,
          borderRadius: 6
        }}>
          <h2 style={{ margin: 0, fontSize: 28, color: '#92400e' }}>Dashboard</h2>
          <p style={{ marginTop: 8, color: '#92400e' }}>Here are some charts and stats.</p>
        </div>
      </div>
    </AdminLayout>
  );
};

export default Dashboard;
