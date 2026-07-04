import React, { useState, useEffect } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import api from '../services/api';
import { X, Download } from 'lucide-react';
import './TicketModal.css';

const TicketModal = ({ registrationId, onClose }) => {
  const [ticket, setTicket] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchTicket();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [registrationId]);

  const fetchTicket = async () => {
    try {
      const res = await api.get(`/registrations/ticket/${registrationId}/qr`);
      setTicket(res.data);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load ticket');
    } finally {
      setLoading(false);
    }
  };

  // Allow closing by clicking backdrop
  const handleBackdropClick = (e) => {
    if (e.target === e.currentTarget) onClose();
  };

  const handleDownload = () => {
    const svg = document.getElementById('ticket-qr-svg');
    if (!svg) return;
    const svgData = new XMLSerializer().serializeToString(svg);
    const canvas = document.createElement('canvas');
    canvas.width = 300;
    canvas.height = 300;
    const ctx = canvas.getContext('2d');
    const img = new Image();
    img.onload = () => {
      ctx.drawImage(img, 0, 0);
      const a = document.createElement('a');
      a.download = `ticket-${ticket.ticketId}.png`;
      a.href = canvas.toDataURL('image/png');
      a.click();
    };
    img.src = 'data:image/svg+xml;base64,' + btoa(svgData);
  };

  return (
    <div className="modal-backdrop" onClick={handleBackdropClick}>
      <div className="ticket-modal">
        <button className="modal-close-btn" onClick={onClose}>
          <X size={20} />
        </button>

        {loading && <div className="modal-loading">Loading ticket...</div>}
        {error && <div className="modal-error">{error}</div>}

        {ticket && (
          <div className="ticket-content">
            <div className="ticket-header">
              <h2>🎟 Your Ticket</h2>
              <span className={`ticket-status status-${ticket.status?.toLowerCase()}`}>
                {ticket.status}
              </span>
            </div>

            <div className="ticket-event-name">{ticket.event?.name}</div>

            <div className="ticket-qr-section">
              <QRCodeSVG
                id="ticket-qr-svg"
                value={JSON.stringify({
                  ticketId: ticket.ticketId,
                  event: ticket.event?.name,
                  participant: ticket.user?.name
                })}
                size={220}
                level="H"
                includeMargin={true}
              />
            </div>

            <div className="ticket-details">
              <div className="ticket-detail-row">
                <span className="ticket-label">Ticket ID</span>
                <span className="ticket-value ticket-id-text">{ticket.ticketId}</span>
              </div>
              <div className="ticket-detail-row">
                <span className="ticket-label">Participant</span>
                <span className="ticket-value">{ticket.user?.name}</span>
              </div>
              <div className="ticket-detail-row">
                <span className="ticket-label">Email</span>
                <span className="ticket-value">{ticket.user?.email}</span>
              </div>
            </div>

            <button className="btn-secondary download-btn" onClick={handleDownload}>
              <Download size={16} /> Download QR
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default TicketModal;