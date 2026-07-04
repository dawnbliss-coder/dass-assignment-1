import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import api from '../services/api';
import { Calendar, Mail, Tag } from 'lucide-react';
import './Clubs.css';

const OrganizerDetail = () => {
  const { id } = useParams();
  const [organizerData, setOrganizerData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchOrganizerDetails();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const fetchOrganizerDetails = async () => {
    try {
      const response = await api.get(`/registrations/organizers/${id}`);
      setOrganizerData(response.data);
    } catch (error) {
      console.error('Error fetching organizer:', error);
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

  const isUpcoming = (dateString) => {
    return new Date(dateString) > new Date();
  };

  if (loading) {
    return <div className="page-container"><div className="loading">Loading...</div></div>;
  }

  if (!organizerData) {
    return <div className="page-container"><div className="error-message">Organizer not found</div></div>;
  }

  const { organizer, events } = organizerData;
  const upcomingEvents = events.filter(e => isUpcoming(e.startDate));
  const pastEvents = events.filter(e => !isUpcoming(e.startDate));

  return (
    <div className="page-container">
      <div className="organizer-detail-container">
        <div className="organizer-info-card">
          <h1>{organizer.organizerName || organizer.firstName}</h1>
          {organizer.category && (
            <div className="organizer-category">
              <Tag size={18} />
              <span>{organizer.category}</span>
            </div>
          )}
          {organizer.description && (
            <p className="organizer-description">{organizer.description}</p>
          )}
          {organizer.contactEmail && (
            <div className="organizer-contact">
              <Mail size={18} />
              <span>{organizer.contactEmail}</span>
            </div>
          )}
        </div>

        <div className="events-section">
          <h2>Upcoming Events ({upcomingEvents.length})</h2>
          {upcomingEvents.length === 0 ? (
            <div className="empty-state">
              <p>No upcoming events</p>
            </div>
          ) : (
            <div className="events-grid">
              {upcomingEvents.map((event) => (
                <Link key={event._id} to={`/events/${event._id}`} className="event-card-link">
                  <div className="event-card">
                    <h3>{event.name}</h3>
                    <div className="event-details">
                      <div className="detail-item">
                        <Calendar size={16} />
                        <span>{formatDate(event.startDate)}</span>
                      </div>
                      <span className={`event-type ${event.eventType.toLowerCase()}`}>
                        {event.eventType}
                      </span>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>

        <div className="events-section">
          <h2>Past Events ({pastEvents.length})</h2>
          {pastEvents.length === 0 ? (
            <div className="empty-state">
              <p>No past events</p>
            </div>
          ) : (
            <div className="events-grid">
              {pastEvents.map((event) => (
                <Link key={event._id} to={`/events/${event._id}`} className="event-card-link">
                  <div className="event-card">
                    <h3>{event.name}</h3>
                    <div className="event-details">
                      <div className="detail-item">
                        <Calendar size={16} />
                        <span>{formatDate(event.startDate)}</span>
                      </div>
                      <span className={`event-type ${event.eventType.toLowerCase()}`}>
                        {event.eventType}
                      </span>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default OrganizerDetail;
