import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../services/api';
import { Search, TrendingUp, Calendar } from 'lucide-react';
import './Events.css';

const BrowseEvents = () => {
  const [events, setEvents] = useState([]);
  const [trendingEvents, setTrendingEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchKeyword, setSearchKeyword] = useState('');
  const [filters, setFilters] = useState({
    eventType: '',
    eligibility: '',
    dateRange: '',
    followedOnly: false
  });

  useEffect(() => {
    fetchEvents();
    fetchTrending();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters, searchKeyword]);

  const fetchEvents = async () => {
    try {
      const params = new URLSearchParams();
      // FIX: was sending 'keyword' but backend eventController.getEvents reads 'search' param
      if (searchKeyword) params.append('search', searchKeyword);
      if (filters.eventType) params.append('eventType', filters.eventType);
      if (filters.eligibility) params.append('eligibility', filters.eligibility);
      if (filters.dateRange) params.append('startDate', filters.dateRange);
      if (filters.followedOnly) params.append('followedOnly', 'true');

      const response = await api.get(`/events?${params.toString()}`);
      setEvents(response.data);
    } catch (error) {
      console.error('Error fetching events:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchTrending = async () => {
    try {
      const response = await api.get('/events/trending');
      setTrendingEvents(response.data);
    } catch (error) {
      console.error('Error fetching trending:', error);
    }
  };

  const handleFilterChange = (key, value) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  };

  if (loading) {
    return <div className="page-container"><div className="loading">Loading...</div></div>;
  }

  return (
    <div className="page-container">
      <div className="events-header">
        <h1>Browse Events</h1>
        <p>Discover and register for exciting events</p>
      </div>

      {/* Trending Section */}
      {trendingEvents.length > 0 && (
        <div className="trending-section">
          <h2>
            <TrendingUp size={20} /> Trending Events (Last 24h)
          </h2>
          <div className="events-grid">
            {trendingEvents.map((event) => (
              <EventCard key={event._id} event={event} />
            ))}
          </div>
        </div>
      )}

      {/* Search and Filters */}
      <div className="search-filters">
        <div className="search-box">
          <Search size={20} />
          <input
            type="text"
            placeholder="Search by event or organizer name (partial & fuzzy)..."
            value={searchKeyword}
            onChange={(e) => setSearchKeyword(e.target.value)}
          />
        </div>
        <div className="filters">
          {/* FIX: added Hackathon option — was missing from dropdown */}
          <select
            value={filters.eventType}
            onChange={(e) => handleFilterChange('eventType', e.target.value)}
          >
            <option value="">All Event Types</option>
            <option value="Normal">Normal</option>
            <option value="Merchandise">Merchandise</option>
            <option value="Hackathon">Hackathon</option>
          </select>
          <select
            value={filters.eligibility}
            onChange={(e) => handleFilterChange('eligibility', e.target.value)}
          >
            <option value="">All Eligibility</option>
            <option value="IIIT Only">IIIT Only</option>
            <option value="All">All</option>
          </select>
          <input
            type="date"
            value={filters.dateRange}
            onChange={(e) => handleFilterChange('dateRange', e.target.value)}
            title="Show events from this date"
          />
          <label className="checkbox-label">
            <input
              type="checkbox"
              checked={filters.followedOnly}
              onChange={(e) => handleFilterChange('followedOnly', e.target.checked)}
            />
            Followed Clubs Only
          </label>
        </div>
      </div>

      {/* Events List */}
      <div className="events-section">
        <h2>All Events ({events.length})</h2>
        {events.length === 0 ? (
          <div className="empty-state">
            <p>No events found matching your criteria</p>
          </div>
        ) : (
          <div className="events-grid">
            {events.map((event) => (
              <EventCard key={event._id} event={event} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

const EventCard = ({ event }) => {
  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  return (
    <Link to={`/events/${event._id}`} className="event-card-link">
      <div className="event-card">
        <div className="event-header">
          <h3>{event.name}</h3>
          <span className={`event-type ${event.eventType.toLowerCase()}`}>
            {event.eventType}
          </span>
        </div>
        <p className="event-description">
          {event.description?.length > 100
            ? event.description.substring(0, 100) + '...'
            : event.description}
        </p>
        <div className="event-details">
          <div className="detail-item">
            <Calendar size={16} />
            <span>{formatDate(event.startDate)}</span>
          </div>
          {event.organizer && (
            <div className="detail-item">
              <span>By: {event.organizer.organizerName || event.organizer.firstName}</span>
            </div>
          )}
          {event.registrationFee > 0 && (
            <div className="detail-item">
              <span>Fee: ₹{event.registrationFee}</span>
            </div>
          )}
        </div>
        {event.tags && event.tags.length > 0 && (
          <div className="event-tags">
            {event.tags.slice(0, 3).map((tag, idx) => (
              <span key={idx} className="tag">{tag}</span>
            ))}
          </div>
        )}
      </div>
    </Link>
  );
};

export default BrowseEvents;