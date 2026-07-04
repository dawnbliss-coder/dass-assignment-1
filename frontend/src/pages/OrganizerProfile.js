import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';
import './Profile.css';

const OrganizerProfile = () => {
  const { user, updateUser } = useAuth();
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    firstName: '',
    category: '',
    description: '',
    contactEmail: '',
    contactNumber: '',
    discordWebhook: ''
  });
  const [loading, setLoading] = useState(false);
  const [profileLoading, setProfileLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // ── FIX: fetch the full profile from the API on mount.
  // The auth context `user` object comes from the login response which does NOT
  // include discordWebhook (or other organizer-specific fields). If we populate
  // the form from `user` directly, the webhook field starts empty and the next
  // save overwrites the real stored value with an empty string.
  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const res = await api.get('/users/profile');
        const profile = res.data;
        setFormData({
          firstName:      profile.firstName || profile.organizerName || '',
          category:       profile.category      || '',
          description:    profile.description   || '',
          contactEmail:   profile.contactEmail  || profile.email || '',
          contactNumber:  profile.contactNumber || '',
          discordWebhook: profile.discordWebhook || ''   // ← now populated from DB
        });
      } catch (err) {
        setError('Failed to load profile');
      } finally {
        setProfileLoading(false);
      }
    };
    fetchProfile();
  }, []); // run once on mount — don't depend on `user` to avoid overwriting

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setLoading(true);

    try {
      await api.put('/users/profile', {
        ...formData,
        organizerName: formData.firstName  // keep both fields in sync on backend
      });

      // Update auth context with fields it knows about (no discordWebhook needed there)
      updateUser({ ...user, ...formData });

      setSuccess('Profile updated successfully!');
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to update profile');
    } finally {
      setLoading(false);
    }
  };

  if (profileLoading) {
    return (
      <div className="page-container">
        <div className="profile-container">
          <p>Loading profile...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="page-container">
      <div className="profile-container">
        <h1>Organizer Profile</h1>

        {error   && <div className="error-message">{error}</div>}
        {success && <div className="success-message">{success}</div>}

        <form onSubmit={handleSubmit} className="profile-form">
          <div className="form-section">
            <h2>Organization Information</h2>

            <div className="form-group">
              <label>Organizer Name *</label>
              <input
                type="text"
                name="firstName"
                value={formData.firstName}
                onChange={handleChange}
                required
              />
            </div>

            <div className="form-group">
              <label>Email Address</label>
              <input
                type="email"
                value={user?.email || ''}
                disabled
                className="disabled-input"
              />
              <small>Login email cannot be changed</small>
            </div>

            <div className="form-group">
              <label>Category</label>
              <input
                type="text"
                name="category"
                value={formData.category}
                onChange={handleChange}
                placeholder="e.g., Technical Club, Cultural Club"
              />
            </div>

            <div className="form-group">
              <label>Description</label>
              <textarea
                name="description"
                value={formData.description}
                onChange={handleChange}
                rows="4"
                placeholder="Describe your organization..."
              />
            </div>

            <div className="form-group">
              <label>Contact Email</label>
              <input
                type="email"
                name="contactEmail"
                value={formData.contactEmail}
                onChange={handleChange}
              />
            </div>

            <div className="form-group">
              <label>Contact Number</label>
              <input
                type="tel"
                name="contactNumber"
                value={formData.contactNumber}
                onChange={handleChange}
              />
            </div>

            <div className="form-group">
              <label>Discord Webhook URL</label>
              <input
                type="url"
                name="discordWebhook"
                value={formData.discordWebhook}
                onChange={handleChange}
                placeholder="https://discord.com/api/webhooks/..."
              />
              <small>Auto-post new events to your Discord channel</small>
            </div>
          </div>

          <button type="submit" disabled={loading} className="btn-primary">
            {loading ? 'Updating...' : 'Update Profile'}
          </button>

          <div className="security-section">
            <h2>Security</h2>
            <p>Need to change your password? Request a password reset from the Admin.</p>
            <button
              type="button"
              onClick={() => navigate('/organizer/reset-password')}
              className="btn-secondary"
            >
              Request Password Reset
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default OrganizerProfile;