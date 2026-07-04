import React, { useState, useEffect } from 'react';
import api from '../services/api';
import { Check, X, Mail } from 'lucide-react';
import './PasswordResetRequests.css';

const PasswordResetRequests = () => {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [actionComment, setActionComment] = useState('');
  const [newPassword, setNewPassword] = useState(null);

  useEffect(() => {
    fetchRequests();
  }, []);

  const fetchRequests = async () => {
    try {
      const response = await api.get('/admin/reset-requests');
      setRequests(response.data);
    } catch (error) {
      console.error('Error fetching requests:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAction = async (userId, action) => {
    if (!actionComment.trim() && action === 'Approve') {
      alert('Please provide a comment');
      return;
    }

    try {
      const response = await api.put(`/admin/handle-reset/${userId}`, {
        action,
        comment: actionComment
      });

      if (action === 'Approve' && response.data.newPassword) {
        setNewPassword({
          email: requests.find(r => r._id === userId)?.email,
          password: response.data.newPassword
        });
      }

      setActionComment('');
      setSelectedRequest(null);
      fetchRequests();
    } catch (error) {
      alert(error.response?.data?.message || 'Failed to process request');
    }
  };

  if (loading) {
    return <div className="page-container"><div className="loading">Loading...</div></div>;
  }

  return (
    <div className="page-container">
      <div className="reset-requests-container">
        <h1>Password Reset Requests</h1>

        {newPassword && (
          <div className="credentials-box">
            <h3>New Password Generated</h3>
            <p><strong>Email:</strong> {newPassword.email}</p>
            <p><strong>New Password:</strong> {newPassword.password}</p>
            <p className="warning">Please share this password with the organizer.</p>
            <button onClick={() => setNewPassword(null)} className="btn-secondary">
              Close
            </button>
          </div>
        )}

        {requests.length === 0 ? (
          <div className="empty-state">
            <p>No pending password reset requests</p>
          </div>
        ) : (
          <div className="requests-list">
            {requests.map((request) => (
              <div key={request._id} className="request-card">
                <div className="request-header">
                  <div>
                    <h3>{request.firstName} {request.lastName}</h3>
                    <p className="request-email">
                      <Mail size={16} />
                      {request.email}
                    </p>
                  </div>
                  <span className="status-badge pending">Pending</span>
                </div>

                {request.resetHistory && request.resetHistory.length > 0 && (
                  <div className="request-history">
                    <h4>Request History</h4>
                    {request.resetHistory.map((entry, idx) => (
                      <div key={idx} className="history-item">
                        <div className="history-date">
                          {new Date(entry.date).toLocaleDateString()}
                        </div>
                        <div className="history-action">
                          <strong>{entry.action}:</strong> {entry.adminComment || 'No comment'}
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {selectedRequest === request._id ? (
                  <div className="action-form">
                    <textarea
                      placeholder="Enter your comment/reason..."
                      value={actionComment}
                      onChange={(e) => setActionComment(e.target.value)}
                      rows="3"
                    />
                    <div className="action-buttons">
                      <button
                        onClick={() => handleAction(request._id, 'Approve')}
                        className="btn-approve"
                      >
                        <Check size={18} /> Approve
                      </button>
                      <button
                        onClick={() => handleAction(request._id, 'Reject')}
                        className="btn-reject"
                      >
                        <X size={18} /> Reject
                      </button>
                      <button
                        onClick={() => {
                          setSelectedRequest(null);
                          setActionComment('');
                        }}
                        className="btn-secondary"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="request-actions">
                    <button
                      onClick={() => setSelectedRequest(request._id)}
                      className="btn-primary"
                    >
                      Handle Request
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default PasswordResetRequests;
