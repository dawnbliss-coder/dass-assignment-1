import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import api from '../services/api';
import { Calendar, Users, DollarSign, Download, QrCode, Star, Search, Filter } from 'lucide-react';
import EventForum from '../components/EventForum';
import './EventManagement.css';

const EventManagement = () => {
  const { id } = useParams();
  const [event, setEvent] = useState(null);
  const [participants, setParticipants] = useState([]);
  const [filteredParticipants, setFilteredParticipants] = useState([]);
  const [stats, setStats] = useState(null);
  const [formResponses, setFormResponses] = useState([]);
  const [teams, setTeams] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  const [editMode, setEditMode] = useState(false);
  const [editData, setEditData] = useState({});
  const [statusChanging, setStatusChanging] = useState(false);
  const [actionError, setActionError] = useState('');
  const [actionSuccess, setActionSuccess] = useState('');

  useEffect(() => {
    fetchEventData();
    fetchParticipants();
    fetchStats();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  useEffect(() => {
    let result = [...participants];
    if (searchTerm) {
      const s = searchTerm.toLowerCase();
      result = result.filter(r =>
        r.user?.firstName?.toLowerCase().includes(s) ||
        r.user?.lastName?.toLowerCase().includes(s) ||
        r.user?.email?.toLowerCase().includes(s) ||
        r.ticketId?.toLowerCase().includes(s)
      );
    }
    if (statusFilter !== 'all') {
      result = result.filter(r => r.status === statusFilter);
    }
    setFilteredParticipants(result);
  }, [searchTerm, statusFilter, participants]);

  const fetchEventData = async () => {
    try {
      const response = await api.get(`/events/${id}`);
      setEvent(response.data);
      setEditData({
        description: response.data.description,
        registrationDeadline: response.data.registrationDeadline?.split('T')[0],
        registrationLimit: response.data.registrationLimit,
      });
    } catch (error) {
      console.error('Error fetching event:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchParticipants = async () => {
    try {
      const response = await api.get(`/registrations/event/${id}`);
      setParticipants(response.data);
      setFilteredParticipants(response.data);
    } catch (error) {
      console.error('Error fetching participants:', error);
    }
  };

  const fetchStats = async () => {
    try {
      const response = await api.get(`/registrations/event/${id}/stats`);
      setStats(response.data);
    } catch (error) {
      console.error('Error fetching stats:', error);
    }
  };

  const fetchFormResponses = async () => {
    if (formResponses.length > 0) return;
    try {
      const res = await api.get(`/events/${id}/form-responses`);
      setFormResponses(res.data);
    } catch (err) {
      setActionError(err.response?.data?.message || 'Failed to load form responses');
    }
  };

  const fetchTeams = async () => {
    if (teams.length > 0) return;
    try {
      const res = await api.get(`/teams/event/${id}`);
      setTeams(res.data);
    } catch (err) {
      console.error('Error fetching teams:', err);
    }
  };

  const handleTabChange = (tab) => {
    setActiveTab(tab);
    setActionError('');
    setActionSuccess('');
    if (tab === 'responses') fetchFormResponses();
    if (tab === 'teams') fetchTeams();
  };

  const handleExportCSV = async () => {
    try {
      const response = await api.get(`/registrations/event/${id}/export`, { responseType: 'blob' });
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `${event.name}_participants.csv`);
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (error) {
      setActionError('Export failed');
    }
  };

  const handleVerifyPayment = async (registrationId, status) => {
    try {
      await api.put(`/registrations/${registrationId}/verify-payment`, { status });
      setActionSuccess(`Payment ${status === 'Registered' ? 'approved' : 'rejected'} successfully`);
      fetchParticipants();
      fetchStats();
    } catch (error) {
      setActionError(error.response?.data?.message || 'Failed to verify payment');
    }
  };

  const handleScanTicket = async (ticketId) => {
    try {
      const response = await api.post('/registrations/attendance/scan', { ticketId, eventId: id });
      setActionSuccess(response.data.message);
      fetchParticipants();
    } catch (error) {
      setActionError(error.response?.data?.message || 'Failed to scan ticket');
    }
  };

  const handleSaveEdits = async () => {
    setActionError('');
    try {
      await api.put(`/events/${id}`, editData);
      setActionSuccess('Event updated successfully');
      setEditMode(false);
      fetchEventData();
    } catch (err) {
      setActionError(err.response?.data?.message || 'Update failed');
    }
  };

  const handleStatusChange = async (newStatus) => {
    if (!window.confirm(`Change event status to "${newStatus}"?`)) return;
    setStatusChanging(true);
    setActionError('');
    try {
      await api.put(`/events/${id}/status`, { newStatus });
      setActionSuccess(`Status changed to ${newStatus}`);
      fetchEventData();
    } catch (err) {
      setActionError(err.response?.data?.message || 'Status change failed');
    } finally {
      setStatusChanging(false);
    }
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric', month: 'short', day: 'numeric',
      hour: '2-digit', minute: '2-digit'
    });
  };

  if (loading) return <div className="page-container"><div className="loading">Loading...</div></div>;
  if (!event) return <div className="page-container"><div className="error-message">Event not found</div></div>;

  const pendingPayments = participants.filter(p => p.status === 'Pending Approval');
  const attendedRegistrations = participants.filter(p => p.status === 'Attended');
  const approvedRegistrations = participants.filter(p => p.status === 'Registered');

  const isDraft = event.status === 'Draft';
  const isPublished = event.status === 'Published';
  const canEdit = isDraft || isPublished;

  const statusTransitions = {
    'Draft': ['Published'],
    'Published': ['Ongoing', 'Closed'],
    'Ongoing': ['Completed', 'Closed'],
    'Closed': ['Completed'],
    'Completed': []
  };
  const nextStatuses = statusTransitions[event.status] || [];

  // Show payments tab for Merchandise OR any event with a fee > 0
  const showPaymentsTab = event.eventType === 'Merchandise' || event.registrationFee > 0;

  return (
    <div className="page-container">
      <div className="event-management-container">
        {actionError && <div className="error-message" style={{ marginBottom: '16px' }}>{actionError}</div>}
        {actionSuccess && <div className="success-message" style={{ marginBottom: '16px' }}>{actionSuccess}</div>}

        <div className="event-header">
          <h1>{event.name}</h1>
          <div style={{ display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap' }}>
            <span className={`status-badge status-${event.status.toLowerCase()}`}>{event.status}</span>
            {nextStatuses.map(s => (
              <button key={s} className="btn-secondary" onClick={() => handleStatusChange(s)} disabled={statusChanging}>
                {s}
              </button>
            ))}
          </div>
        </div>

        <div className="management-tabs">
          {['overview', 'participants', 'responses', 'payments', 'attendance', 'teams', 'forum', 'feedback'].map(tab => {
            if (tab === 'payments' && !showPaymentsTab) return null;
            if (tab === 'responses' && event.eventType !== 'Normal') return null;
            if (tab === 'teams' && event.eventType !== 'Hackathon') return null;
            return (
              <button
                key={tab}
                className={activeTab === tab ? 'tab active' : 'tab'}
                onClick={() => handleTabChange(tab)}
              >
                {tab === 'payments' ? `Payments (${pendingPayments.length})` :
                 tab === 'attendance' ? `Attendance (${attendedRegistrations.length})` :
                 tab.charAt(0).toUpperCase() + tab.slice(1)}
              </button>
            );
          })}
        </div>

        {/* OVERVIEW */}
        {activeTab === 'overview' && (
          <div className="overview-section">
            <div className="stats-grid">
              <div className="stat-card"><Users size={24} /><div><h3>{stats?.totalRegistrations || 0}</h3><p>Registrations</p></div></div>
              <div className="stat-card"><DollarSign size={24} /><div><h3>Rs.{stats?.revenue || 0}</h3><p>Revenue</p></div></div>
              <div className="stat-card"><Calendar size={24} /><div><h3>{attendedRegistrations.length}</h3><p>Attended</p></div></div>
              {pendingPayments.length > 0 && (
                <div className="stat-card" style={{ borderLeft: '4px solid #ff9800' }}>
                  <DollarSign size={24} />
                  <div><h3>{pendingPayments.length}</h3><p>Pending Payments</p></div>
                </div>
              )}
            </div>

            <div className="event-details-card">
              <div className="details-card-header">
                <h2>Event Details</h2>
                {canEdit && !editMode && (
                  <button className="btn-secondary" onClick={() => setEditMode(true)}>Edit</button>
                )}
                {editMode && (
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <button className="btn-primary" onClick={handleSaveEdits}>Save</button>
                    <button className="btn-secondary" onClick={() => setEditMode(false)}>Cancel</button>
                  </div>
                )}
              </div>

              {!editMode ? (
                <div className="details-list">
                  <div className="detail-row"><strong>Type:</strong> {event.eventType}</div>
                  <div className="detail-row"><strong>Status:</strong> {event.status}</div>
                  <div className="detail-row"><strong>Start:</strong> {formatDate(event.startDate)}</div>
                  <div className="detail-row"><strong>End:</strong> {formatDate(event.endDate)}</div>
                  <div className="detail-row"><strong>Deadline:</strong> {formatDate(event.registrationDeadline)}</div>
                  {event.location && <div className="detail-row"><strong>Location:</strong> {event.location}</div>}
                  <div className="detail-row"><strong>Fee:</strong> Rs.{event.registrationFee || 0}</div>
                  <div className="detail-row"><strong>Limit:</strong> {event.registrationLimit || 'Unlimited'}</div>
                  <div className="detail-row"><strong>Description:</strong> {event.description}</div>
                  {event.formLocked && (
                    <div className="detail-row" style={{ color: '#e65100' }}>
                      Form is locked (registrations received)
                    </div>
                  )}
                </div>
              ) : (
                <div className="edit-form">
                  <div className="form-field">
                    <label>Description</label>
                    <textarea rows={4} value={editData.description || ''}
                      onChange={(e) => setEditData(prev => ({ ...prev, description: e.target.value }))} />
                  </div>
                  {(isDraft || isPublished) && (
                    <div className="form-field">
                      <label>Registration Deadline {isPublished && <span style={{ color: '#888', fontSize: '0.8rem' }}>(can only extend)</span>}</label>
                      <input type="date" value={editData.registrationDeadline || ''}
                        onChange={(e) => setEditData(prev => ({ ...prev, registrationDeadline: e.target.value }))} />
                    </div>
                  )}
                  {(isDraft || isPublished) && (
                    <div className="form-field">
                      <label>Registration Limit {isPublished && <span style={{ color: '#888', fontSize: '0.8rem' }}>(can only increase)</span>}</label>
                      <input type="number" value={editData.registrationLimit || ''}
                        onChange={(e) => setEditData(prev => ({ ...prev, registrationLimit: parseInt(e.target.value) }))} />
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        )}

        {/* PARTICIPANTS */}
        {activeTab === 'participants' && (
          <div className="participants-section">
            <div className="section-header">
              <h2>Participants ({filteredParticipants.length})</h2>
              <button onClick={handleExportCSV} className="btn-secondary">
                <Download size={18} /> Export CSV
              </button>
            </div>
            <div className="participant-filters">
              <div className="search-box">
                <Search size={16} />
                <input type="text" placeholder="Search by name, email, or ticket ID..."
                  value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
              </div>
              <div className="filter-box">
                <Filter size={16} />
                <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
                  <option value="all">All Status</option>
                  <option value="Registered">Registered</option>
                  <option value="Attended">Attended</option>
                  <option value="Cancelled">Cancelled</option>
                  <option value="Pending Approval">Pending Approval</option>
                </select>
              </div>
            </div>
            <div className="participants-table">
              <table>
                <thead>
                  <tr>
                    <th>Name</th><th>Email</th><th>Registered</th><th>Ticket ID</th><th>Status</th><th>Attendance</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredParticipants.map((reg) => (
                    <tr key={reg._id}>
                      <td>{reg.user?.firstName} {reg.user?.lastName}</td>
                      <td>{reg.user?.email}</td>
                      <td>{formatDate(reg.createdAt)}</td>
                      <td style={{ fontFamily: 'monospace' }}>{reg.ticketId}</td>
                      <td><span className={`status-badge status-${reg.status.toLowerCase().replace(' ', '-')}`}>{reg.status}</span></td>
                      <td>{reg.attendanceTime ? formatDate(reg.attendanceTime) : '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {filteredParticipants.length === 0 && <div className="empty-state"><p>No participants match your search</p></div>}
            </div>
          </div>
        )}

        {/* FORM RESPONSES */}
        {activeTab === 'responses' && (
          <div className="participants-section">
            <h2>Form Responses ({formResponses.length})</h2>
            {formResponses.length === 0 ? (
              <div className="empty-state"><p>No responses yet</p></div>
            ) : (
              <div className="participants-table">
                <table>
                  <thead>
                    <tr>
                      <th>Name</th><th>Email</th><th>Ticket ID</th><th>Registered</th>
                      {formResponses[0]?.responses?.map(r => <th key={r.label}>{r.label}</th>)}
                    </tr>
                  </thead>
                  <tbody>
                    {formResponses.map((row, idx) => (
                      <tr key={idx}>
                        <td>{row.participantName}</td>
                        <td>{row.participantEmail}</td>
                        <td style={{ fontFamily: 'monospace' }}>{row.ticketId}</td>
                        <td>{formatDate(row.registeredAt)}</td>
                        {row.responses?.map((r, ri) => {
                          const v = r?.value;
                          if (!v) return <td key={ri}>—</td>;
                          if (typeof v === 'string' && v.startsWith('data:')) {
                            return (
                              <td key={ri}>
                                <a href={v} download={`upload-${r.label || ri}`}>Download file</a>
                              </td>
                            );
                          }
                          if (typeof v === 'object') {
                            return <td key={ri}>{JSON.stringify(v)}</td>;
                          }
                          return <td key={ri}>{String(v)}</td>;
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* PAYMENT APPROVALS — shown for Merchandise AND any paid event */}
        {activeTab === 'payments' && (
          <div className="payments-section">
            <h2>Payment Approvals</h2>
            {pendingPayments.length === 0 ? (
              <div className="empty-state"><p>No pending payments</p></div>
            ) : (
              <div className="payments-list">
                {pendingPayments.map((reg) => (
                  <div key={reg._id} className="payment-card">
                    <div className="payment-info">
                      <h3>{reg.user?.firstName} {reg.user?.lastName}</h3>
                      <p>{reg.user?.email}</p>
                      <p style={{ fontFamily: 'monospace' }}>Ticket: {reg.ticketId}</p>
                      {reg.paymentProofImage && (
                        <img src={reg.paymentProofImage} alt="Payment proof" className="payment-proof" />
                      )}
                    </div>
                    <div className="payment-actions">
                      <button onClick={() => handleVerifyPayment(reg._id, 'Registered')} className="btn-approve">
                        Approve
                      </button>
                      <button onClick={() => handleVerifyPayment(reg._id, 'Rejected')} className="btn-reject">
                        Reject
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ATTENDANCE */}
        {activeTab === 'attendance' && (
          <div className="attendance-section">
            <h2>Attendance Tracking</h2>
            <div className="attendance-stats">
              <div className="stat-item"><span>Registered:</span> {approvedRegistrations.length + attendedRegistrations.length}</div>
              <div className="stat-item"><span>Attended:</span> {attendedRegistrations.length}</div>
              <div className="stat-item"><span>Not yet:</span> {approvedRegistrations.length}</div>
            </div>
            <div className="scan-section">
              <h3>Scan Ticket</h3>
              <TicketScanner onScan={handleScanTicket} />
            </div>
            <div className="attendance-list">
              <h3>All Participants</h3>
              <table>
                <thead>
                  <tr><th>Name</th><th>Email</th><th>Ticket ID</th><th>Status</th><th>Attendance Time</th></tr>
                </thead>
                <tbody>
                  {participants.filter(r => ['Registered', 'Attended'].includes(r.status)).map((reg) => (
                    <tr key={reg._id}>
                      <td>{reg.user?.firstName} {reg.user?.lastName}</td>
                      <td>{reg.user?.email}</td>
                      <td style={{ fontFamily: 'monospace' }}>{reg.ticketId}</td>
                      <td><span className={`status-badge status-${reg.status.toLowerCase()}`}>{reg.status}</span></td>
                      <td>{reg.attendanceTime ? formatDate(reg.attendanceTime) : '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* TEAMS */}
        {activeTab === 'teams' && (
          <div className="participants-section">
            <h2>Teams ({teams.length})</h2>
            {teams.length === 0 ? (
              <div className="empty-state"><p>No teams formed yet</p></div>
            ) : (
              teams.map(team => (
                <div key={team._id} className="payment-card">
                  <div className="payment-info">
                    <h3>{team.name}</h3>
                    <p>Leader: {team.leader?.firstName} {team.leader?.lastName} ({team.leader?.email})</p>
                    <p>Size: {team.members.filter(m => m.status === 'Accepted').length + 1} / {team.maxSize}</p>
                    <span className={`status-badge status-${team.status.toLowerCase()}`}>{team.status}</span>
                  </div>
                  <div style={{ flex: 1 }}>
                    <strong>Members:</strong>
                    {team.members.filter(m => m.status === 'Accepted').map(m => (
                      <div key={m.user?._id} style={{ fontSize: '0.85rem', color: '#555' }}>
                        {m.user?.firstName} {m.user?.lastName} — {m.user?.email}
                      </div>
                    ))}
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {/* FORUM */}
        {activeTab === 'forum' && (
          <EventForum eventId={id} isOrganizer={true} />
        )}

        {/* FEEDBACK */}
        {activeTab === 'feedback' && (
          <div className="feedback-section">
            <h2>Event Feedback</h2>
            <p>View and manage feedback for this event.</p>
            <button onClick={() => window.location.href = `/organizer/feedback/${id}`} className="btn-primary">
              <Star size={18} /> Open Full Feedback Dashboard
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

const TicketScanner = ({ onScan }) => {
  const [ticketId, setTicketId] = useState('');
  const handleSubmit = (e) => {
    e.preventDefault();
    if (ticketId.trim()) { onScan(ticketId.trim()); setTicketId(''); }
  };
  return (
    <form onSubmit={handleSubmit} className="scanner-form">
      <input type="text" placeholder="Enter Ticket ID (e.g. TIC-AB12CD34)"
        value={ticketId} onChange={(e) => setTicketId(e.target.value.toUpperCase())}
        className="scanner-input" style={{ fontFamily: 'monospace', letterSpacing: '1px' }} />
      <button type="submit" className="btn-primary"><QrCode size={18} /> Mark Attended</button>
    </form>
  );
};

export default EventManagement;