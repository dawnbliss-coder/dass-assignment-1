import React, { useState, useEffect } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import api from '../services/api';
import { Star, Download, Filter, TrendingUp, MessageCircle } from 'lucide-react';
import './FeedbackDashboard.css';

const FeedbackDashboard = () => {
  const { eventId: paramEventId } = useParams();
  const [searchParams] = useSearchParams();
  const eventId = paramEventId || searchParams.get('eventId');
  const [event, setEvent] = useState(null);
  const [stats, setStats] = useState(null);
  const [feedbacks, setFeedbacks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all'); // all, 5, 4, 3, 2, 1

  useEffect(() => {
    fetchFeedbackData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [eventId]);

  const fetchFeedbackData = async () => {
    try {
      const response = await api.get(`/feedback/stats/${eventId}`);
      setStats(response.data);
      setFeedbacks(response.data.allFeedback || []);
      // Also fetch event details
      const eventResponse = await api.get(`/events/${eventId}`);
      setEvent(eventResponse.data);
    } catch (error) {
      console.error('Error fetching feedback:', error);
    } finally {
      setLoading(false);
    }
  };

  const getFilteredFeedbacks = () => {
    if (filter === 'all') return feedbacks;
    return feedbacks.filter(f => f.rating === parseInt(filter));
  };

  const handleExportCSV = () => {
    const headers = ['Rating', 'Comment', 'Date'];
    const rows = feedbacks.map(f => [
      f.rating,
      `"${f.comment.replace(/"/g, '""')}"`,
      new Date(f.createdAt).toLocaleDateString()
    ]);
    
    const csvContent = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `${event?.name || 'event'}_feedback.csv`);
    document.body.appendChild(link);
    link.click();
    link.remove();
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getRatingDistribution = () => {
    const distribution = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
    feedbacks.forEach(f => {
      distribution[f.rating] = (distribution[f.rating] || 0) + 1;
    });
    return distribution;
  };

  if (loading) {
    return <div className="page-container"><div className="loading">Loading...</div></div>;
  }

  const distribution = getRatingDistribution();
  const filteredFeedbacks = getFilteredFeedbacks();

  return (
    <div className="page-container">
      <div className="feedback-dashboard-container">
        <div className="dashboard-header">
          <div>
            <h1>Feedback Dashboard</h1>
            <h2>{event?.name}</h2>
          </div>
          <button onClick={handleExportCSV} className="btn-secondary">
            <Download size={18} /> Export CSV
          </button>
        </div>

        {/* Stats Overview */}
        <div className="stats-grid">
          <div className="stat-card">
            <div className="stat-icon">
              <MessageCircle size={24} />
            </div>
            <div className="stat-content">
              <h3>{stats?.totalFeedback || 0}</h3>
              <p>Total Feedback</p>
            </div>
          </div>
          
          <div className="stat-card">
            <div className="stat-icon rating-icon">
              <Star size={24} />
            </div>
            <div className="stat-content">
              <h3>{stats?.averageRating || '0.0'}</h3>
              <p>Average Rating</p>
            </div>
          </div>

          <div className="stat-card">
            <div className="stat-icon">
              <TrendingUp size={24} />
            </div>
            <div className="stat-content">
              <h3>{feedbacks.filter(f => f.rating >= 4).length}</h3>
              <p>Positive (4-5 stars)</p>
            </div>
          </div>
        </div>

        {/* Rating Distribution */}
        <div className="distribution-section">
          <h3>Rating Distribution</h3>
          <div className="distribution-bars">
            {[5, 4, 3, 2, 1].map(rating => {
              const count = distribution[rating];
              const percentage = feedbacks.length > 0 ? (count / feedbacks.length) * 100 : 0;
              return (
                <div key={rating} className="distribution-row">
                  <div className="rating-label">
                    <Star size={14} fill="#fbbf24" />
                    <span>{rating}</span>
                  </div>
                  <div className="bar-container">
                    <div 
                      className="bar-fill" 
                      style={{ width: `${percentage}%` }}
                    />
                  </div>
                  <div className="count-label">{count}</div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Feedback List */}
        <div className="feedback-list-section">
          <div className="section-header">
            <h3>All Feedback</h3>
            <div className="filter-controls">
              <Filter size={16} />
              <select 
                value={filter} 
                onChange={(e) => setFilter(e.target.value)}
              >
                <option value="all">All Ratings</option>
                <option value="5">5 Stars</option>
                <option value="4">4 Stars</option>
                <option value="3">3 Stars</option>
                <option value="2">2 Stars</option>
                <option value="1">1 Star</option>
              </select>
            </div>
          </div>

          {filteredFeedbacks.length === 0 ? (
            <div className="empty-state">
              <MessageCircle size={48} />
              <p>No feedback available</p>
            </div>
          ) : (
            <div className="feedback-list">
              {filteredFeedbacks.map((feedback) => (
                <div key={feedback._id} className="feedback-card">
                  <div className="feedback-header">
                    <div className="rating-stars">
                      {[1, 2, 3, 4, 5].map(star => (
                        <Star 
                          key={star} 
                          size={16} 
                          fill={star <= feedback.rating ? '#fbbf24' : 'none'}
                          className={star <= feedback.rating ? 'filled' : ''}
                        />
                      ))}
                    </div>
                    <span className="feedback-date">
                      {formatDate(feedback.createdAt)}
                    </span>
                  </div>
                  <p className="feedback-comment">{feedback.comment}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default FeedbackDashboard;

