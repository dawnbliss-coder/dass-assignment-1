import React, { useState, useEffect } from 'react';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import { Eye, EyeOff } from 'lucide-react';
import './Profile.css';

const Profile = () => {
  const { user, updateUser } = useAuth();
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    contactNumber: '',
    collegeName: '',
    interests: [],
    followedOrganizers: []
  });
  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });
  const [showPasswords, setShowPasswords] = useState({
    current: false, new: false, confirm: false
  });
  const [organizers, setOrganizers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [activeSection, setActiveSection] = useState('profile');

  const INTEREST_OPTIONS = [
    'Technology', 'Music', 'Art', 'Sports', 'Gaming', 'Photography',
    'Robotics', 'AI/ML', 'Web Dev', 'Cybersecurity', 'Dance', 'Drama',
    'Literature', 'Finance', 'Entrepreneurship', 'Design'
  ];

  useEffect(() => {
    fetchProfile();
    fetchOrganizers();
  }, []);

  const fetchProfile = async () => {
    try {
      const res = await api.get('/users/profile');
      const data = res.data;
      setFormData({
        firstName: data.firstName || '',
        lastName: data.lastName || '',
        contactNumber: data.contactNumber || '',
        collegeName: data.collegeName || '',
        interests: data.interests || [],
        followedOrganizers: (data.followedOrganizers || []).map(o =>
          typeof o === 'object' ? o._id : o
        )
      });
    } catch (err) {
      setError('Failed to load profile');
    } finally {
      setLoading(false);
    }
  };

  const fetchOrganizers = async () => {
    try {
      const res = await api.get('/registrations/organizers');
      setOrganizers(res.data);
    } catch (err) {
      console.error('Failed to fetch organizers:', err);
    }
  };

  const handleChange = (e) => {
    setFormData(prev => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleInterestToggle = (interest) => {
    setFormData(prev => ({
      ...prev,
      interests: prev.interests.includes(interest)
        ? prev.interests.filter(i => i !== interest)
        : [...prev.interests, interest]
    }));
  };

  const handleFollowToggle = (orgId) => {
    setFormData(prev => ({
      ...prev,
      followedOrganizers: prev.followedOrganizers.includes(orgId)
        ? prev.followedOrganizers.filter(id => id !== orgId)
        : [...prev.followedOrganizers, orgId]
    }));
  };

  const handleSaveProfile = async () => {
    setSaving(true);
    setError('');
    setSuccess('');
    try {
      await api.put('/users/profile', {
        firstName: formData.firstName,
        lastName: formData.lastName,
        contactNumber: formData.contactNumber,
        collegeName: formData.collegeName,
        interests: formData.interests
      });

      // Sync followed organizers
      const currentFollowed = (await api.get('/users/profile')).data.followedOrganizers?.map(
        o => (typeof o === 'object' ? o._id : o).toString()
      ) || [];
      const wantFollowed = formData.followedOrganizers;

      for (const orgId of wantFollowed) {
        if (!currentFollowed.includes(orgId)) {
          await api.post(`/registrations/follow/${orgId}`);
        }
      }
      for (const orgId of currentFollowed) {
        if (!wantFollowed.includes(orgId)) {
          await api.post(`/registrations/follow/${orgId}`);
        }
      }

      updateUser({ ...user, firstName: formData.firstName, lastName: formData.lastName });
      setSuccess('Profile updated successfully!');
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to update profile');
    } finally {
      setSaving(false);
    }
  };

  const handleChangePassword = async () => {
    setError('');
    setSuccess('');
    if (!passwordData.currentPassword || !passwordData.newPassword) {
      setError('Please fill in all password fields');
      return;
    }
    if (passwordData.newPassword !== passwordData.confirmPassword) {
      setError('New passwords do not match');
      return;
    }
    if (passwordData.newPassword.length < 6) {
      setError('New password must be at least 6 characters');
      return;
    }

    setSaving(true);
    try {
      // Backend: updateUserProfile accepts password field
      await api.put('/users/profile', { password: passwordData.newPassword });
      setSuccess('Password updated successfully!');
      setPasswordData({ currentPassword: '', newPassword: '', confirmPassword: '' });
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to update password');
    } finally {
      setSaving(false);
    }
  };

  const toggleShowPassword = (field) => {
    setShowPasswords(prev => ({ ...prev, [field]: !prev[field] }));
  };

  if (loading) return <div className="page-container"><div className="loading">Loading...</div></div>;

  return (
    <div className="page-container">
      <div className="profile-container">
        <div className="profile-header">
          <h1>My Profile</h1>
          <p>Manage your personal information and preferences</p>
        </div>

        {error && <div className="error-message">{error}</div>}
        {success && <div className="success-message">{success}</div>}

        <div className="profile-tabs">
          <button className={activeSection === 'profile' ? 'tab active' : 'tab'} onClick={() => setActiveSection('profile')}>Personal Info</button>
          <button className={activeSection === 'preferences' ? 'tab active' : 'tab'} onClick={() => setActiveSection('preferences')}>Interests & Clubs</button>
          <button className={activeSection === 'security' ? 'tab active' : 'tab'} onClick={() => setActiveSection('security')}>Security</button>
        </div>

        {/* ── PERSONAL INFO ── */}
        {activeSection === 'profile' && (
          <div className="profile-section-card">
            <h2>Personal Information</h2>
            <div className="form-grid">
              <div className="form-field">
                <label>First Name</label>
                <input type="text" name="firstName" value={formData.firstName}
                  onChange={handleChange} placeholder="First name" />
              </div>
              <div className="form-field">
                <label>Last Name</label>
                <input type="text" name="lastName" value={formData.lastName}
                  onChange={handleChange} placeholder="Last name" />
              </div>
              <div className="form-field">
                <label>Contact Number</label>
                <input type="tel" name="contactNumber" value={formData.contactNumber}
                  onChange={handleChange} placeholder="Phone number" />
              </div>
              <div className="form-field">
                <label>College / Organization</label>
                <input type="text" name="collegeName" value={formData.collegeName}
                  onChange={handleChange} placeholder="Your college or organization" />
              </div>
            </div>

            {/* Non-editable fields */}
            <div className="readonly-fields">
              <h3>Non-Editable Fields</h3>
              <div className="readonly-row">
                <span>Email</span>
                <strong>{user?.email}</strong>
              </div>
              <div className="readonly-row">
                <span>Participant Type</span>
                <strong>{user?.participantType || '—'}</strong>
              </div>
            </div>

            <button className="btn-primary save-btn" onClick={handleSaveProfile} disabled={saving}>
              {saving ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        )}

        {/* ── INTERESTS & CLUBS ── */}
        {activeSection === 'preferences' && (
          <div className="profile-section-card">
            <div className="preferences-section">
              <h2>Areas of Interest</h2>
              <p className="pref-hint">Select topics you're interested in to get better event recommendations.</p>
              <div className="interests-grid">
                {INTEREST_OPTIONS.map(interest => (
                  <button
                    key={interest}
                    className={`interest-chip ${formData.interests.includes(interest) ? 'selected' : ''}`}
                    onClick={() => handleInterestToggle(interest)}
                  >
                    {interest}
                  </button>
                ))}
              </div>
            </div>

            <div className="preferences-section">
              <h2>Followed Clubs</h2>
              <p className="pref-hint">Follow clubs to see their events first in Browse Events.</p>
              <div className="clubs-list">
                {organizers.map(org => (
                  <div key={org._id} className="club-row">
                    <div>
                      <strong>{org.organizerName || org.firstName}</strong>
                      <span className="club-category">{org.category}</span>
                    </div>
                    <button
                      className={formData.followedOrganizers.includes(org._id) ? 'btn-following' : 'btn-follow'}
                      onClick={() => handleFollowToggle(org._id)}
                    >
                      {formData.followedOrganizers.includes(org._id) ? 'Following ✓' : 'Follow'}
                    </button>
                  </div>
                ))}
              </div>
            </div>

            <button className="btn-primary save-btn" onClick={handleSaveProfile} disabled={saving}>
              {saving ? 'Saving...' : 'Save Preferences'}
            </button>
          </div>
        )}

        {/* ── SECURITY ── */}
        {activeSection === 'security' && (
          <div className="profile-section-card">
            <h2>Change Password</h2>
            <div className="form-field">
              <label>Current Password</label>
              <div className="password-input-wrapper">
                <input
                  type={showPasswords.current ? 'text' : 'password'}
                  value={passwordData.currentPassword}
                  onChange={(e) => setPasswordData(prev => ({ ...prev, currentPassword: e.target.value }))}
                  placeholder="Current password"
                />
                <button className="password-toggle" onClick={() => toggleShowPassword('current')}>
                  {showPasswords.current ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>
            <div className="form-field">
              <label>New Password</label>
              <div className="password-input-wrapper">
                <input
                  type={showPasswords.new ? 'text' : 'password'}
                  value={passwordData.newPassword}
                  onChange={(e) => setPasswordData(prev => ({ ...prev, newPassword: e.target.value }))}
                  placeholder="New password (min 6 characters)"
                />
                <button className="password-toggle" onClick={() => toggleShowPassword('new')}>
                  {showPasswords.new ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>
            <div className="form-field">
              <label>Confirm New Password</label>
              <div className="password-input-wrapper">
                <input
                  type={showPasswords.confirm ? 'text' : 'password'}
                  value={passwordData.confirmPassword}
                  onChange={(e) => setPasswordData(prev => ({ ...prev, confirmPassword: e.target.value }))}
                  placeholder="Confirm new password"
                />
                <button className="password-toggle" onClick={() => toggleShowPassword('confirm')}>
                  {showPasswords.confirm ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>
            <button className="btn-primary save-btn" onClick={handleChangePassword} disabled={saving}>
              {saving ? 'Updating...' : 'Update Password'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default Profile;