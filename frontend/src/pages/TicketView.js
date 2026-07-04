import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import api from '../services/api';

import { Calendar, Download, ArrowLeft } from 'lucide-react';
import './EventDetails.css';

const TicketView = () => {
  const { id } = useParams();
  
  const [ticket, setTicket] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchTicket();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const fetchTicket = async () => {
    try {
      const response = await api.get(`/registrations/ticket/${id}/qr`);
      setTicket(response.data);
    } catch (error) {
      console.error('Error fetching ticket:', error);
      setError(error.response?.data?.message || 'Failed to load ticket');
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const downloadTicket = () => {
    const ticketContent = `
FELICITY EVENT TICKET
=====================
Ticket ID: ${ticket.ticketId}
Event: ${ticket.event.name}
Participant: ${ticket.user.name}
Email: ${ticket.user.email}
Status: ${ticket.status}
=====================
    `;
    
    const blob = new Blob([ticketContent], { type: 'text/plain' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `ticket-${ticket.ticketId}.txt`;
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);
    document.body.removeChild(a);
  };

  if (loading) {
    return <div className="page-container"><div className="loading">Loading ticket...</div></div>;
  }

  if (error) {
    return (
      <div className="page-container">
        <div className="error-message">{error}</div>
        <Link to="/dashboard" className="btn-primary">Back to Dashboard</Link>
      </div>
    );
  }

  return (
    <div className="page-container">
      <div className="ticket-container">
        <Link to="/dashboard" className="back-link">
          <ArrowLeft size={20} /> Back to Dashboard
        </Link>

        <div className="ticket-card">
          <div className="ticket-header">
            <h1>🎫 Entry Ticket</h1>
            <span className={`status-badge status-${ticket.status.toLowerCase().replace(' ', '-')}`}>
              {ticket.status}
            </span>
          </div>

          <div className="ticket-details">
            <div className="event-info">
              <h2>{ticket.event.name}</h2>
              <div className="detail-row">
                <Calendar size={18} />
                <span>{formatDate(ticket.event.startDate)}</span>
              </div>
            </div>

            <div className="participant-info">
              <h3>Participant Details</h3>
              <p><strong>Name:</strong> {ticket.user.name}</p>
              <p><strong>Email:</strong> {ticket.user.email}</p>
            </div>

            <div className="ticket-id-section">
              <p className="ticket-id-label">Ticket ID</p>
              <p className="ticket-id">{ticket.ticketId}</p>
            </div>

            {ticket.qrCode && ticket.status === 'Registered' && (
              <div className="qr-section">
                <p className="qr-label">Scan for Entry</p>
                <img src={ticket.qrCode} alt="Entry QR Code" className="qr-code" />
                <p className="qr-instruction">Present this QR code at the event entrance</p>
              </div>
            )}
          </div>

          <div className="ticket-actions">
            <button onClick={downloadTicket} className="btn-secondary">
              <Download size={18} /> Download Ticket
            </button>
          </div>
        </div>

        <div className="ticket-footer">
          <p>This is an electronic ticket. Please present it at the event venue.</p>
          <p>For any issues, contact the event organizer.</p>
        </div>
      </div>
    </div>
  );
};

export default TicketView;

