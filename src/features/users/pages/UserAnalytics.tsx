import React from 'react';

const UserAnalytics: React.FC = () => {
  return (
    <div>
      <h2>User Analytics</h2>

      <div
        style={{
          marginTop: 20,
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
          gap: 20,
        }}
      >
        <div
          style={{
            background: '#fff',
            padding: 20,
            borderRadius: 12,
            border: '1px solid #E2E8F0',
          }}
        >
          <h4>Total Users</h4>
          <h1>1,240</h1>
        </div>

        <div
          style={{
            background: '#fff',
            padding: 20,
            borderRadius: 12,
            border: '1px solid #E2E8F0',
          }}
        >
          <h4>Clients</h4>
          <h1>840</h1>
        </div>

        <div
          style={{
            background: '#fff',
            padding: 20,
            borderRadius: 12,
            border: '1px solid #E2E8F0',
          }}
        >
          <h4>Bidders</h4>
          <h1>400</h1>
        </div>
      </div>
    </div>
  );
};

export default UserAnalytics;