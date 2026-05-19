
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import AdminLayout from './layouts/AdminLayout';
import Jobs from './features/jobs/pages/jobs';

export default function App() {
  return (
    <BrowserRouter>
      <AdminLayout>
        <Routes>
          <Route path="/" element={<Navigate to="/dashboard" replace />} />
          <Route path="/dashboard" element={<div>Dashboard Page</div>} />
          <Route path="/users" element={<div>User Management</div>} />
          <Route path="/jobs" element={<Jobs />} />
        </Routes>
      </AdminLayout>
    </BrowserRouter>
  );
}