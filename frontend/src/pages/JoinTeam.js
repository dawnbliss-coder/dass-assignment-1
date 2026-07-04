import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import api from '../services/api';
import { Users, ArrowRight } from 'lucide-react';
import './TeamDashboard.css';

const JoinTeam = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [inviteCode, setInviteCode] = useState(searchParams.get('code') || '');
  const [preview, setPreview] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // If code is in URL, auto-preview
  useEffect(() => {
    if (searchParams.get('code')) {
      handlePreview(searchParams.get('code'));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handlePreview = async (code) => {
    const codeToCheck = code || inviteCode;
    if (!codeToCheck.trim()) { setError('Enter an invite code'); return; }
    setError('');
    setPreview(null);
    setLoading(true);
    try {
      const res = await api.get(`/teams/invite/${codeToCheck.trim().toUpperCase()}`);
      setPreview(res.data);
    } catch (err) {
      setError(err.response?.data?.message || 'Invalid invite code');
    } finally {
      setLoading(false);
    }
  };

  const handleJoin = async () => {
    setError('');
    setLoading(true);
    try {
      await api.post('/teams/join', { inviteCode: inviteCode.trim().toUpperCase() });
      setSuccess('Join request sent! The team leader will accept you shortly.');
      setTimeout(() => navigate('/dashboard'), 2500);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to join team');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="page-container">
      <div className="team-dashboard">
        <div className="team-page-header">
          <h1>Join a Team</h1>
          <p>Enter the invite code shared by your team leader</p>
        </div>

        {error && <div className="error-message">{error}</div>}
        {success && <div className="success-message">{success}</div>}

        <div className="create-team-card">
          <div className="join-input-row">
            <input
              type="text"
              value={inviteCode}
              onChange={(e) => {
                setInviteCode(e.target.value.toUpperCase());
                setPreview(null);
              }}
              placeholder="Enter invite code (e.g. A1B2C3D4)"
              maxLength={8}
              style={{
                fontFamily: 'Courier New, monospace',
                letterSpacing: '3px',
                fontSize: '1.2rem',
                textAlign: 'center'
              }}
            />
            <button
              className="btn-secondary"
              onClick={() => handlePreview()}
              disabled={loading || !inviteCode.trim()}
            >
              {loading ? 'Checking...' : 'Preview'}
            </button>
          </div>

          {preview && (
            <div className="team-preview-card">
              <div className="preview-row">
                <Users size={32} className="preview-icon" />
                <div>
                  <h3>{preview.teamName}</h3>
                  <p className="preview-event">{preview.eventName}</p>
                </div>
              </div>
              <div className="preview-details">
                <div className="preview-detail">
                  <span>Leader</span>
                  <strong>{preview.leaderName}</strong>
                </div>
                <div className="preview-detail">
                  <span>Members</span>
                  <strong>{preview.currentSize} / {preview.maxSize}</strong>
                </div>
                <div className="preview-detail">
                  <span>Status</span>
                  <span className={`team-status-badge ${preview.status.toLowerCase()}`}>
                    {preview.status}
                  </span>
                </div>
              </div>

              {preview.status === 'Forming' && preview.currentSize < preview.maxSize ? (
                <button
                  className="btn-primary join-btn"
                  onClick={handleJoin}
                  disabled={loading}
                >
                  {loading ? 'Joining...' : <>Request to Join <ArrowRight size={18} /></>}
                </button>
              ) : (
                <div className="error-message" style={{ marginTop: '12px' }}>
                  {preview.status !== 'Forming'
                    ? 'This team is no longer accepting members.'
                    : 'This team is already full.'}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default JoinTeam;