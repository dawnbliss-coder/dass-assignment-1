import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import { Mail, Tag } from 'lucide-react';
import './Clubs.css';

const ClubsListing = () => {
  const { user } = useAuth();
  const [organizers, setOrganizers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [followedClubs, setFollowedClubs] = useState([]);

  useEffect(() => {
    fetchOrganizers();
    // First check user context, then fall back to localStorage
    const storedUser = JSON.parse(localStorage.getItem('user') || '{}');
    const userFollowed = (user?.followedOrganizers || storedUser.followedOrganizers || []).map(id => id.toString());
    setFollowedClubs(userFollowed);
  }, [user]);

  const fetchOrganizers = async () => {
    try {
      const response = await api.get('/registrations/organizers');
      setOrganizers(response.data);
    } catch (error) {
      console.error('Error fetching organizers:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleFollowToggle = async (clubId) => {
    try {
      const response = await api.post(`/registrations/follow/${clubId}`);
      setFollowedClubs(response.data.followedOrganizers.map(id => id.toString()));
      
      // Also update the user context so it persists across pages
      const storedUser = JSON.parse(localStorage.getItem('user') || '{}');
      const updatedUser = { 
        ...storedUser, 
        followedOrganizers: response.data.followedOrganizers 
      };
      localStorage.setItem('user', JSON.stringify(updatedUser));
    } catch (error) {
      console.error('Error toggling follow:', error);
    }
  };

  if (loading) {
    return <div className="page-container"><div className="loading">Loading...</div></div>;
  }

  return (
    <div className="page-container">
      <div className="clubs-header">
        <h1>Clubs & Organizers</h1>
        <p>Discover and follow your favorite clubs</p>
      </div>

      <div className="clubs-grid">
        {organizers.map((organizer) => (
          <div key={organizer._id} className="club-card">
            <div className="club-header">
              <h3>{organizer.organizerName || organizer.firstName}</h3>
              {organizer.category && (
                <span className="club-category">
                  <Tag size={14} />
                  {organizer.category}
                </span>
              )}
            </div>
            {organizer.description && (
              <p className="club-description">{organizer.description}</p>
            )}
            {organizer.email && (
              <div className="club-contact">
                <Mail size={16} />
                <span>{organizer.email}</span>
              </div>
            )}
            <div className="club-actions">
              <button
                onClick={() => handleFollowToggle(organizer._id)}
                className={`btn-follow ${followedClubs.includes(organizer._id.toString()) ? 'following' : ''}`}
              >
                {followedClubs.includes(organizer._id.toString()) ? 'Following' : 'Follow'}
              </button>
              <Link to={`/clubs/${organizer._id}`} className="btn-view">
                View Details
              </Link>
            </div>
          </div>
        ))}
      </div>

      {organizers.length === 0 && (
        <div className="empty-state">
          <p>No organizers found</p>
        </div>
      )}
    </div>
  );
};

export default ClubsListing;
