import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import { KeyRound, AlertCircle, CheckCircle } from 'lucide-react';
import './PasswordResetRequest.css';

const PasswordResetRequest = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [reason, setReason] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!reason.trim()) {
      setError('Please provide a reason for your password reset request');
      return;
    }

    if (reason.trim().length < 10) {
      setError('Please provide a more detailed reason (at least 10 characters)');
      return;
    }

    setLoading(true);
    try {
      await api.post('/users/request-reset', {
        email: user.email, // Use logged in user's email
        reason: reason.trim()
      });
      setSuccess(true);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to submit request. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="page-container">
        <div className="reset-request-container">
          <div className="success-card">
            <CheckCircle size={48} className="success-icon" />
            <h2>Request Submitted</h2>
            <p>Your password reset request has been sent to the admin.</p>
            <p className="info-text">
              The admin will review your request and get back to you with a new password.
              Please check your email or contact the admin directly for updates.
            </p>
            <button 
              onClick={() => navigate('/organizer/profile')}
              className="btn-primary"
            >
              Back to Profile
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="page-container">
      <div className="reset-request-container">
        <div className="reset-request-card">
          <div className="card-header">
            <KeyRound size={32} />
            <h1>Password Reset Request</h1>
          </div>

          <p className="description">
            Forgot your password? Submit a request to the admin and they will 
            generate a new password for you.
          </p>

          <form onSubmit={handleSubmit} className="reset-request-form">
            {error && (
              <div className="error-message">
                <AlertCircle size={18} />
                {error}
              </div>
            )}

            <div className="form-field">
              <label htmlFor="reason">
                Reason for Password Reset <span className="required">*</span>
              </label>
              <textarea
                id="reason"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="Please explain why you need to reset your password..."
                rows="4"
                maxLength="500"
              />
              <div className="char-count">{reason.length}/500</div>
            </div>

            <div className="info-box">
              <AlertCircle size={16} />
              <span>
                Your request will be reviewed by the admin. Once approved, 
                you will receive a new password to use for logging in.
              </span>
            </div>

            <div className="form-actions">
              <button
                type="button"
                onClick={() => navigate('/organizer/profile')}
                className="btn-secondary"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading}
                className="btn-primary"
              >
                {loading ? 'Submitting...' : 'Submit Request'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default PasswordResetRequest;

