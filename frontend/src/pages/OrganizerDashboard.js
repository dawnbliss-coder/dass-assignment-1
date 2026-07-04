import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../services/api';
import { Calendar, Users, DollarSign, Star } from 'lucide-react';
import './OrganizerDashboard.css';

const OrganizerDashboard = () => {
  const [events, setEvents] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      // Fetch organizer's events using the new endpoint
      const eventsResponse = await api.get('/events/my');
      const organizerEvents = eventsResponse.data;
      setEvents(organizerEvents);

      // Calculate stats
      const completedEvents = organizerEvents.filter(e => e.status === 'Completed' || e.status === 'Closed');
      let totalRevenue = 0;
      let totalRegistrations = 0;

      for (const event of completedEvents) {
        try {
          const statsResponse = await api.get(`/registrations/event/${event._id}/stats`);
          totalRevenue += statsResponse.data.revenue || 0;
          totalRegistrations += statsResponse.data.totalRegistrations || 0;
        } catch (error) {
          console.error(`Error fetching stats for event ${event._id}:`, error);
        }
      }

      setStats({
        totalEvents: organizerEvents.length,
        totalRegistrations,
        totalRevenue
      });
    } catch (error) {
      console.error('Error fetching dashboard:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const getStatusColor = (status) => {
    const colors = {
      Draft: '#999',
      Published: '#2196F3',
      Ongoing: '#4CAF50',
      Closed: '#FF9800',
      Completed: '#9C27B0'
    };
    return colors[status] || '#666';
  };

  if (loading) {
    return <div className="page-container"><div className="loading">Loading...</div></div>;
  }

  return (
    <div className="page-container">
      <div className="dashboard-header">
        <h1>Organizer Dashboard</h1>
        <p>Manage your events and track analytics</p>
      </div>

      {stats && (
        <div className="stats-grid">
          <div className="stat-card">
            <Users size={24} />
            <div>
              <h3>{stats.totalRegistrations}</h3>
              <p>Total Registrations</p>
            </div>
          </div>
          <div className="stat-card">
            <DollarSign size={24} />
            <div>
              <h3>₹{stats.totalRevenue}</h3>
              <p>Total Revenue</p>
            </div>
          </div>
          <div className="stat-card">
            <Calendar size={24} />
            <div>
              <h3>{stats.totalEvents}</h3>
              <p>Total Events</p>
            </div>
          </div>
        </div>
      )}

      <div className="events-section">
        <div className="section-header">
          <h2>My Events</h2>
          <Link to="/organizer/create-event" className="btn-primary">
            Create New Event
          </Link>
        </div>

        {events.length === 0 ? (
          <div className="empty-state">
            <p>No events created yet</p>
            <Link to="/organizer/create-event" className="btn-primary">
              Create Your First Event
            </Link>
          </div>
        ) : (
          <div className="events-carousel">
            {events.map((event) => (
              <Link key={event._id} to={`/organizer/events/${event._id}`} className="event-card-link">
                <div className="event-card">
                  <div className="event-header">
                    <h3>{event.name}</h3>
                    <span 
                      className="status-badge"
                      style={{ backgroundColor: getStatusColor(event.status) }}
                    >
                      {event.status}
                    </span>
                  </div>
                  <p className="event-description">{event.description.substring(0, 100)}...</p>
                  <div className="event-details">
                    <div className="detail-item">
                      <Calendar size={16} />
                      <span>{formatDate(event.startDate)}</span>
                    </div>
                    <div className="detail-item">
                      <span className={`event-type ${event.eventType.toLowerCase()}`}>
                        {event.eventType}
                      </span>
                    </div>
                  </div>
                  <div className="event-footer">
                    <span>View Details →</span>
                    {(event.status === 'Completed' || event.status === 'Closed') && (
                      <Link 
                        to={`/organizer/feedback/${event._id}`} 
                        className="feedback-link"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <Star size={14} /> View Feedback
                      </Link>
                    )}
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default OrganizerDashboard;
