import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../services/api';
import { Users, Settings, Calendar } from 'lucide-react';
import './AdminDashboard.css';

const AdminDashboard = () => {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    try {
      const [usersResponse, registrationsResponse] = await Promise.all([
        api.get('/admin/users'),
        api.get('/admin/registrations')
      ]);

      const organizers = usersResponse.data.filter(u => u.role === 'organizer');
      const participants = usersResponse.data.filter(u => u.role === 'participant');

      setStats({
        totalUsers: usersResponse.data.length,
        totalOrganizers: organizers.length,
        totalParticipants: participants.length,
        totalRegistrations: registrationsResponse.data.count || 0
      });
    } catch (error) {
      console.error('Error fetching stats:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div className="page-container"><div className="loading">Loading...</div></div>;
  }

  return (
    <div className="page-container">
      <div className="dashboard-header">
        <h1>Admin Dashboard</h1>
        <p>Manage the Felicity platform</p>
      </div>

      {stats && (
        <div className="stats-grid">
          <div className="stat-card">
            <Users size={24} />
            <div>
              <h3>{stats.totalUsers}</h3>
              <p>Total Users</p>
            </div>
          </div>
          <div className="stat-card">
            <Users size={24} />
            <div>
              <h3>{stats.totalOrganizers}</h3>
              <p>Organizers</p>
            </div>
          </div>
          <div className="stat-card">
            <Users size={24} />
            <div>
              <h3>{stats.totalParticipants}</h3>
              <p>Participants</p>
            </div>
          </div>
          <div className="stat-card">
            <Calendar size={24} />
            <div>
              <h3>{stats.totalRegistrations}</h3>
              <p>Total Registrations</p>
            </div>
          </div>
        </div>
      )}

      <div className="admin-actions">
        <Link to="/admin/organizers" className="action-card">
          <Users size={32} />
          <h2>Manage Clubs/Organizers</h2>
          <p>Create, view, and remove organizer accounts</p>
        </Link>
        <Link to="/admin/reset-requests" className="action-card">
          <Settings size={32} />
          <h2>Password Reset Requests</h2>
          <p>Handle organizer password reset requests</p>
        </Link>
      </div>
    </div>
  );
};

export default AdminDashboard;
