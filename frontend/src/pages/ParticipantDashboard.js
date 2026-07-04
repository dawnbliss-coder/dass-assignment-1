import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';
import { Star, Users } from 'lucide-react';
import TicketModal from '../components/TicketModal';
import './Dashboard.css';

const ParticipantDashboard = () => {
  const { user } = useAuth();
  const [dashboard, setDashboard] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('upcoming');
  const [historyTab, setHistoryTab] = useState('normal');
  const [selectedTicket, setSelectedTicket] = useState(null);

  useEffect(() => {
    fetchDashboard();
  }, []);

  const fetchDashboard = async () => {
    try {
      const response = await api.get('/registrations/my');
      setDashboard(response.data);
    } catch (error) {
      console.error('Error fetching dashboard:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric', month: 'short', day: 'numeric',
      hour: '2-digit', minute: '2-digit'
    });
  };

  const isEventCompleted = (eventEndDate) => new Date(eventEndDate) < new Date();

  if (loading) {
    return <div className="page-container"><div className="loading">Loading...</div></div>;
  }

  return (
    <div className="page-container">
      {selectedTicket && (
        <TicketModal
          registrationId={selectedTicket}
          onClose={() => setSelectedTicket(null)}
        />
      )}

      <div className="dashboard-header">
        <h1>Welcome, {user?.firstName}!</h1>
        <p>Manage your events and track your participation</p>
      </div>

      <div className="dashboard-tabs">
        <button
          className={activeTab === 'upcoming' ? 'tab active' : 'tab'}
          onClick={() => setActiveTab('upcoming')}
        >
          Upcoming Events ({dashboard?.upcoming?.length || 0})
        </button>
        <button
          className={activeTab === 'pending' ? 'tab active' : 'tab'}
          onClick={() => setActiveTab('pending')}
        >
          Pending Approval ({dashboard?.pending?.length || 0})
        </button>
        <button
          className={activeTab === 'history' ? 'tab active' : 'tab'}
          onClick={() => setActiveTab('history')}
        >
          Participation History
        </button>
      </div>

      {/* ── UPCOMING ── */}
      {activeTab === 'upcoming' && (
        <div className="events-section">
          <h2>Upcoming Events</h2>
          {dashboard?.upcoming?.length === 0 ? (
            <div className="empty-state">
              <p>No upcoming events registered</p>
              <Link to="/events" className="btn-primary">Browse Events</Link>
            </div>
          ) : (
            <div className="participants-table">
              <table>
                <thead>
                  <tr>
                    <th>Event Name</th>
                    <th>Type</th>
                    <th>Organizer</th>
                    <th>Start Date</th>
                    <th>Status</th>
                    <th>Ticket ID</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {dashboard.upcoming.map((reg) => (
                    <tr key={reg._id}>
                      <td><Link to={`/events/${reg.event._id}`}>{reg.event.name}</Link></td>
                      <td>
                        <span className={`event-type ${reg.event.eventType?.toLowerCase()}`}>
                          {reg.event.eventType}
                        </span>
                      </td>
                      <td>{reg.event.organizer?.organizerName || reg.event.organizer?.firstName || '—'}</td>
                      <td>{formatDate(reg.event.startDate)}</td>
                      <td><span className="status-badge registered">Registered</span></td>
                      <td>
                        <button
                          className="ticket-id-btn"
                          onClick={() => setSelectedTicket(reg._id)}
                          title="Click to view QR ticket"
                        >
                          🎟 {reg.ticketId}
                        </button>
                      </td>
                      <td>
                        {reg.event.eventType === 'Hackathon' && (
                          <Link to={`/team/${reg.event._id}`} className="btn-secondary btn-sm">
                            <Users size={14} /> Team
                          </Link>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ── PENDING APPROVAL ── */}
      {activeTab === 'pending' && (
        <div className="events-section">
          <h2>Pending Approval</h2>
          {dashboard?.pending?.length === 0 ? (
            <div className="empty-state"><p>No pending registrations</p></div>
          ) : (
            <div className="participants-table">
              <table>
                <thead>
                  <tr>
                    <th>Event Name</th>
                    <th>Type</th>
                    <th>Organizer</th>
                    <th>Order ID</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {dashboard.pending.map((reg) => (
                    <tr key={reg._id}>
                      <td><Link to={`/events/${reg.event._id}`}>{reg.event.name}</Link></td>
                      <td>
                        <span className={`event-type ${reg.event.eventType?.toLowerCase()}`}>
                          {reg.event.eventType}
                        </span>
                      </td>
                      <td>{reg.event.organizer?.organizerName || reg.event.organizer?.firstName || '—'}</td>
                      <td>{reg.ticketId}</td>
                      <td><span className="status-badge pending">Pending Approval</span></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ── HISTORY ── */}
      {activeTab === 'history' && (
        <div className="history-section">
          <div className="history-tabs">
            {['normal', 'merchandise', 'completed', 'cancelled'].map(tab => (
              <button
                key={tab}
                className={historyTab === tab ? 'sub-tab active' : 'sub-tab'}
                onClick={() => setHistoryTab(tab)}
              >
                {tab.charAt(0).toUpperCase() + tab.slice(1)} ({dashboard?.history?.[tab]?.length || 0})
              </button>
            ))}
          </div>

          <div className="history-content">
            {renderHistoryList(dashboard?.history?.[historyTab])}
          </div>
        </div>
      )}
    </div>
  );

  function renderHistoryList(events) {
    if (!events || events.length === 0) {
      return <div className="empty-state"><p>No events in this category</p></div>;
    }

    return (
      <div className="participants-table">
        <table>
          <thead>
            <tr>
              <th>Event Name</th>
              <th>Type</th>
              <th>Organizer</th>
              <th>Registered On</th>
              <th>Status</th>
              <th>Ticket ID</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {events.map((reg) => (
              <tr key={reg._id}>
                <td><Link to={`/events/${reg.event._id}`}>{reg.event.name}</Link></td>
                <td>
                  <span className={`event-type ${reg.event.eventType?.toLowerCase()}`}>
                    {reg.event.eventType}
                  </span>
                </td>
                <td>{reg.event.organizer?.organizerName || reg.event.organizer?.firstName || '—'}</td>
                <td>{formatDate(reg.createdAt)}</td>
                <td>
                  <span className={`status-badge ${reg.status?.toLowerCase().replace(' ', '-')}`}>
                    {reg.status}
                  </span>
                </td>
                <td>
                  {reg.status !== 'Cancelled' && reg.status !== 'Rejected' ? (
                    <button
                      className="ticket-id-btn"
                      onClick={() => setSelectedTicket(reg._id)}
                      title="Click to view QR ticket"
                    >
                      🎟 {reg.ticketId}
                    </button>
                  ) : (
                    <span className="text-muted">{reg.ticketId}</span>
                  )}
                </td>
                <td>
                  {/* FIX: was `reg.status === 'Registered'` only
                      Attended participants never saw the feedback button.
                      Now both Registered and Attended can leave feedback once event ends. */}
                  {(reg.status === 'Registered' || reg.status === 'Attended') &&
                   reg.event?.endDate &&
                   isEventCompleted(reg.event.endDate) && (
                    <Link to={`/feedback/${reg.event._id}`} className="btn-primary btn-sm">
                      <Star size={14} /> Feedback
                    </Link>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  }
};

export default ParticipantDashboard;