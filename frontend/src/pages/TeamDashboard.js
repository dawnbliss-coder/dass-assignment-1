import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import { Users, Copy, Check, UserPlus, UserMinus, ExternalLink } from 'lucide-react';
import './TeamDashboard.css';

const TeamDashboard = () => {
  const { eventId } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [event, setEvent] = useState(null);
  const [team, setTeam] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [copied, setCopied] = useState(false);

  // Create team form
  const [createMode, setCreateMode] = useState(false);
  const [teamName, setTeamName] = useState('');
  const [maxSize, setMaxSize] = useState(4);
  const [paymentProof, setPaymentProof] = useState(location.state?.paymentProof || null);

  useEffect(() => {
    fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [eventId]);

  useEffect(() => {
    // If EventDetails navigated with payment proof later, pick it up.
    if (location.state?.paymentProof) setPaymentProof(location.state.paymentProof);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.state?.paymentProof]);

  const fetchData = async () => {
    try {
      const eventRes = await api.get(`/events/${eventId}`);
      setEvent(eventRes.data);
      try {
        const teamRes = await api.get(`/teams/my/${eventId}`);
        setTeam(teamRes.data);
      } catch (e) {
        // 404 means user doesn't have a team yet — that's fine
        if (e.response?.status !== 404) throw e;
      }
    } catch (err) {
      setError('Failed to load event data');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateTeam = async () => {
    if (!teamName.trim()) { setError('Team name is required'); return; }
    const isPaidHackathon = Number(event?.registrationFee) > 0;
    if (isPaidHackathon && !paymentProof) { setError('Please upload payment proof for this paid hackathon'); return; }
    setError('');
    try {
      const res = await api.post('/teams', { eventId, teamName, maxSize, paymentProofImage: paymentProof });
      setTeam(res.data);
      setCreateMode(false);
      setSuccess('Team created! Share your invite code with members.');
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to create team');
    }
  };

  const handlePaymentProofChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onloadend = () => setPaymentProof(reader.result);
    reader.readAsDataURL(file);
  };

  const handleMemberAction = async (memberId, action) => {
    setError('');
    try {
      const res = await api.put(`/teams/${team._id}/members/${memberId}`, { action });
      setTeam(res.data);
      if (res.data.status === 'Complete') {
        const isPaidHackathon = Number(event?.registrationFee) > 0;
        setSuccess(
          isPaidHackathon
            ? 'Team is complete! Registration is submitted and pending payment approval from the organizer.'
            : 'Team is complete! Tickets have been sent to all members via email.'
        );
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Action failed');
    }
  };

  const handleRemoveMember = async (memberId) => {
    if (!window.confirm('Remove this member from the team?')) return;
    try {
      const res = await api.delete(`/teams/${team._id}/members/${memberId}`);
      setTeam(res.data.team);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to remove member');
    }
  };

  const copyInviteCode = () => {
    navigator.clipboard.writeText(team.inviteCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const copyInviteLink = () => {
    const link = `${window.location.origin}/join-team?code=${team.inviteCode}`;
    navigator.clipboard.writeText(link);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const isLeader = team?.leader?._id === user?._id || team?.leader === user?._id;
  const acceptedCount = team ? team.members.filter(m => m.status === 'Accepted').length + 1 : 0;

  if (loading) return <div className="page-container"><div className="loading">Loading...</div></div>;

  return (
    <div className="page-container">
      <div className="team-dashboard">
        <div className="team-page-header">
          <h1>Team Registration</h1>
          <p className="event-subtitle">for <strong>{event?.name}</strong></p>
        </div>

        {error && <div className="error-message">{error}</div>}
        {success && <div className="success-message">{success}</div>}

        {/* No team yet */}
        {!team && !createMode && (
          <div className="no-team-card">
            <Users size={48} className="no-team-icon" />
            <h2>No Team Yet</h2>
            <p>Create a new team or join one using an invite code from your teammates.</p>
            <div className="no-team-actions">
              <button className="btn-primary" onClick={() => setCreateMode(true)}>
                <UserPlus size={18} /> Create a Team
              </button>
              <button className="btn-secondary" onClick={() => navigate('/join-team')}>
                Join with Invite Code
              </button>
            </div>
          </div>
        )}

        {/* Create team form */}
        {createMode && (
          <div className="create-team-card">
            <h2>Create New Team</h2>
            <div className="form-field">
              <label>Team Name *</label>
              <input
                type="text"
                value={teamName}
                onChange={(e) => setTeamName(e.target.value)}
                placeholder="Enter your team name"
                maxLength={50}
              />
            </div>
            {Number(event?.registrationFee) > 0 && (
              <div className="form-field">
                <label>
                  Payment Proof <span className="required">*</span>
                </label>
                <input type="file" accept="image/*" onChange={handlePaymentProofChange} />
                {paymentProof && (
                  <div style={{ marginTop: '8px' }}>
                    <img
                      src={paymentProof}
                      alt="Payment proof preview"
                      style={{ maxWidth: '240px', borderRadius: '8px', border: '1px solid #ddd' }}
                    />
                  </div>
                )}
                <small>Upload screenshot of payment of Rs.{event?.registrationFee}</small>
              </div>
            )}
            <div className="form-field">
              <label>Team Size (max members including you)</label>
              <input
                type="number"
                value={maxSize}
                onChange={(e) => setMaxSize(parseInt(e.target.value))}
                min={event?.minTeamSize || 2}
                max={event?.teamSize || 10}
              />
              <small>Event allows {event?.minTeamSize || 2}–{event?.teamSize || 10} members</small>
            </div>
            <div className="form-actions">
              <button className="btn-primary" onClick={handleCreateTeam}>Create Team</button>
              <button className="btn-secondary" onClick={() => setCreateMode(false)}>Cancel</button>
            </div>
          </div>
        )}

        {/* Team exists */}
        {team && (
          <div className="team-card">
            {/* Header */}
            <div className="team-header">
              <div>
                <h2>{team.name}</h2>
                <p className="team-meta">
                  {acceptedCount} / {team.maxSize} members &nbsp;•&nbsp;
                  <span className={`team-status-badge ${team.status.toLowerCase()}`}>
                    {team.status}
                  </span>
                </p>
              </div>
            </div>

            {/* Invite code section (shown only while forming) */}
            {team.status === 'Forming' && isLeader && (
              <div className="invite-section">
                <h3>Invite Code</h3>
                <div className="invite-code-box">
                  <span className="invite-code">{team.inviteCode}</span>
                  <button className="copy-btn" onClick={copyInviteCode} title="Copy code">
                    {copied ? <Check size={18} color="#4CAF50" /> : <Copy size={18} />}
                  </button>
                </div>
                <button className="link-btn" onClick={copyInviteLink}>
                  <ExternalLink size={14} /> Copy invite link
                </button>
              </div>
            )}

            {/* Show invite code to non-leader members too */}
            {team.status === 'Forming' && !isLeader && (
              <div className="invite-section">
                <p className="invite-note">
                  Share invite code <strong>{team.inviteCode}</strong> with teammates.
                  Waiting for the leader to accept your request.
                </p>
              </div>
            )}

            {/* Progress bar */}
            <div className="team-progress">
              <div className="progress-bar">
                <div
                  className="progress-fill"
                  style={{ width: `${(acceptedCount / team.maxSize) * 100}%` }}
                />
              </div>
              <span>{acceptedCount}/{team.maxSize} spots filled</span>
            </div>

            {/* Members list */}
            <div className="members-section">
              <h3>Members</h3>
              <div className="members-list">
                {/* Leader row */}
                <div className="member-row leader">
                  <div className="member-info">
                    <span className="member-avatar">
                      {team.leader?.firstName?.[0]}{team.leader?.lastName?.[0]}
                    </span>
                    <div>
                      <span className="member-name">
                        {team.leader?.firstName} {team.leader?.lastName}
                      </span>
                      <span className="member-email">{team.leader?.email}</span>
                    </div>
                  </div>
                  <span className="member-role-badge leader-badge">Leader</span>
                </div>

                {/* Other members */}
                {team.members.map((member) => (
                  <div key={member.user?._id} className={`member-row ${member.status.toLowerCase()}`}>
                    <div className="member-info">
                      <span className="member-avatar">
                        {member.user?.firstName?.[0]}{member.user?.lastName?.[0]}
                      </span>
                      <div>
                        <span className="member-name">
                          {member.user?.firstName} {member.user?.lastName}
                        </span>
                        <span className="member-email">{member.user?.email}</span>
                      </div>
                    </div>
                    <div className="member-actions">
                      <span className={`status-badge ${member.status.toLowerCase()}`}>
                        {member.status}
                      </span>
                      {isLeader && member.status === 'Pending' && team.status === 'Forming' && (
                        <>
                          <button
                            className="btn-approve-sm"
                            onClick={() => handleMemberAction(member.user._id, 'Accept')}
                          >✓ Accept</button>
                          <button
                            className="btn-reject-sm"
                            onClick={() => handleMemberAction(member.user._id, 'Decline')}
                          >✗ Decline</button>
                        </>
                      )}
                      {isLeader && member.status === 'Accepted' && team.status === 'Forming' && (
                        <button
                          className="btn-remove-sm"
                          onClick={() => handleRemoveMember(member.user._id)}
                        >
                          <UserMinus size={14} />
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Complete message */}
            {team.status === 'Complete' && (
              <div className="team-complete-banner">
                {Number(event?.registrationFee) > 0
                  ? 'Team is complete! Registration is pending payment approval from the organizer.'
                  : 'Team is complete! All members have received their tickets via email.'}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default TeamDashboard;