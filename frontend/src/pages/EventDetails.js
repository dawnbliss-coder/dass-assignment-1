import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import { Calendar, MapPin, DollarSign, Users, Tag, AlertCircle } from 'lucide-react';
import EventForum from '../components/EventForum';
import './EventDetails.css';

const EventDetails = () => {
  const { id } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [event, setEvent] = useState(null);
  const [loading, setLoading] = useState(true);
  const [formResponses, setFormResponses] = useState({});
  const [merchandiseSelection, setMerchandiseSelection] = useState({});
  const [paymentProof, setPaymentProof] = useState(null);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [isRegistered, setIsRegistered] = useState(false);

  useEffect(() => {
    fetchEventDetails();
    if (user?.role === 'participant') checkRegistration();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const fetchEventDetails = async () => {
    try {
      const response = await api.get(`/events/${id}`);
      setEvent(response.data);
      if (response.data.formFields) {
        const initialResponses = {};
        response.data.formFields.forEach(field => { initialResponses[field.label] = ''; });
        setFormResponses(initialResponses);
      }
    } catch (error) {
      setError('Event not found');
    } finally {
      setLoading(false);
    }
  };

  const checkRegistration = async () => {
    try {
      const res = await api.get('/registrations/my');
      const allRegs = [
        ...(res.data.upcoming || []),
        ...(res.data.pending || []),
        ...(res.data.history?.normal || []),
        ...(res.data.history?.merchandise || []),
        ...(res.data.history?.completed || []),
      ];
      setIsRegistered(allRegs.some(r => r.event?._id === id || r.event === id));
    } catch (e) {}
  };

  const handleFormChange = (label, value) => {
    setFormResponses(prev => ({ ...prev, [label]: value }));
  };

  const handleFileFieldChange = (label, file) => {
    if (!file) return;
    const reader = new FileReader();
    reader.onloadend = () => {
      setFormResponses(prev => ({ ...prev, [label]: reader.result }));
    };
    reader.readAsDataURL(file);
  };

  const handleMerchandiseChange = (itemName, variant, quantity) => {
    setMerchandiseSelection(prev => ({
      ...prev,
      [itemName]: { variant, quantity: parseInt(quantity) || 0 }
    }));
  };

  const handlePaymentProofChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => setPaymentProof(reader.result);
      reader.readAsDataURL(file);
    }
  };

  const handleRegister = async () => {
    console.log('🔴 handleRegister called');  // ADD THIS
    console.log('🔴 paymentProof:', !!paymentProof);
    console.log('🔴 event fee:', event.registrationFee);
    setError('');
    setSuccess('');

    if (event.eventType === 'Normal') {
      const requiredFields = event.formFields?.filter(f => f.required) || [];
      for (const field of requiredFields) {
        if (!formResponses[field.label]) {
          setError(`Please fill in: ${field.label}`);
          return;
        }
      }
    }

    if (event.eventType === 'Merchandise') {
      const hasItems = Object.values(merchandiseSelection).some(item => item.quantity > 0);
      if (!hasItems) { setError('Please select at least one item'); return; }
      if (!paymentProof) { setError('Please upload payment proof'); return; }
    }

    // Require payment proof for any paid event (Normal or Hackathon with fee > 0)
    const isPaidNonMerchandise = event.eventType !== 'Merchandise' && event.registrationFee > 0;
    if (isPaidNonMerchandise && !paymentProof) {
      setError('Please upload payment proof to complete registration');
      return;
    }

    if (event.eventType === 'Hackathon') {
      // Carry payment proof to team flow (TeamDashboard also supports uploading it directly)
      navigate(`/team/${id}`, { state: { paymentProof } });
      return;
    }

    try {
      const registrationData = {
        eventId: id,
        formResponses: Object.entries(formResponses).map(([label, value]) => ({ label, value })),
        merchandiseSelection: Object.entries(merchandiseSelection)
          .filter(([, data]) => data.quantity > 0)
          .map(([itemId, data]) => ({ itemId, variant: data.variant, quantity: data.quantity })),
        paymentProofImage: paymentProof
      };
      await api.post('/registrations', registrationData);

      const isPaid = event.registrationFee > 0 || event.eventType === 'Merchandise';
      if (isPaid) {
        setSuccess('Registration submitted! Awaiting payment approval from organizer.');
      } else {
        setSuccess('Registration successful! Check your dashboard for ticket details.');
      }
      setIsRegistered(true);
      setTimeout(() => navigate('/dashboard'), 2500);
    } catch (error) {
      setError(error.response?.data?.message || 'Registration failed');
    }
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric', month: 'long', day: 'numeric',
      hour: '2-digit', minute: '2-digit'
    });
  };

  const isRegistrationOpen = () => {
    if (!event) return false;
    return new Date() < new Date(event.registrationDeadline);
  };

  if (loading) return <div className="page-container"><div className="loading">Loading...</div></div>;
  if (!event) return <div className="page-container"><div className="error-message">Event not found</div></div>;

  const canRegister = isRegistrationOpen() && user?.role === 'participant' && !isRegistered;
  const isOrganizer = user?.role === 'organizer';
  const isPaidEvent = event.registrationFee > 0;

  return (
    <div className="page-container">
      <div className="event-details-container">
        <div className="event-header-section">
          <div className="event-title-section">
            <h1>{event.name}</h1>
            <span className={`event-type-badge ${event.eventType?.toLowerCase()}`}>
              {event.eventType}
            </span>
          </div>
          {event.organizer && (
            <p className="organizer-name">
              Organized by: {event.organizer.organizerName || event.organizer.firstName}
            </p>
          )}
        </div>

        <div className="event-info-grid">
          <div className="event-main-content">
            <div className="info-section">
              <h2>Description</h2>
              <p>{event.description}</p>
            </div>

            <div className="info-section">
              <h2>Event Details</h2>
              <div className="details-list">
                <div className="detail-row"><Calendar size={20} /><div><strong>Start:</strong> {formatDate(event.startDate)}</div></div>
                <div className="detail-row"><Calendar size={20} /><div><strong>End:</strong> {formatDate(event.endDate)}</div></div>
                {event.location && <div className="detail-row"><MapPin size={20} /><div><strong>Location:</strong> {event.location}</div></div>}
                <div className="detail-row"><Tag size={20} /><div><strong>Eligibility:</strong> {event.eligibility || 'All'}</div></div>
                {isPaidEvent && (
                  <div className="detail-row"><DollarSign size={20} /><div><strong>Fee:</strong> Rs.{event.registrationFee}</div></div>
                )}
                {event.registrationLimit > 0 && (
                  <div className="detail-row"><Users size={20} /><div><strong>Limit:</strong> {event.registrationLimit} participants</div></div>
                )}
                {event.eventType === 'Hackathon' && (
                  <div className="detail-row"><Users size={20} /><div><strong>Team Size:</strong> {event.minTeamSize || 2}–{event.teamSize || 4} members</div></div>
                )}
                <div className="detail-row"><AlertCircle size={20} /><div><strong>Registration Deadline:</strong> {formatDate(event.registrationDeadline)}</div></div>
              </div>
            </div>

            {isPaidEvent && (
              <div className="info-section" style={{ background: '#fff8e1', border: '1px solid #ffe082', borderRadius: '8px', padding: '12px 16px' }}>
                <p style={{ margin: 0, color: '#e65100', fontWeight: 500 }}>
                  This is a paid event (Rs.{event.registrationFee}). Upload payment proof during registration. Your registration will be confirmed after the organizer approves your payment.
                </p>
              </div>
            )}

            {event.tags?.length > 0 && (
              <div className="info-section">
                <h2>Tags</h2>
                <div className="tags-container">
                  {event.tags.map((tag, idx) => <span key={idx} className="tag">{tag}</span>)}
                </div>
              </div>
            )}
          </div>

          <div className="event-registration-section">
            {isRegistered ? (
              <div className="registered-banner">
                You are registered for this event.
                <Link to="/dashboard" className="btn-secondary" style={{ marginTop: '10px', display: 'block', textAlign: 'center' }}>
                  View Ticket
                </Link>
                {event.eventType === 'Hackathon' && (
                  <Link to={`/team/${id}`} className="btn-primary" style={{ marginTop: '8px', display: 'block', textAlign: 'center' }}>
                    <Users size={16} /> Manage Team
                  </Link>
                )}
              </div>
            ) : !canRegister ? (
              <div className="registration-blocked">
                <AlertCircle size={24} />
                <p>
                  {!isRegistrationOpen() && 'Registration deadline has passed'}
                  {user?.role !== 'participant' && user?.role !== undefined && 'Only participants can register'}
                  {!user && 'Login to register'}
                </p>
              </div>
            ) : (
              <div className="registration-form">
                <h2>
                  {event.eventType === 'Hackathon' ? 'Register as a Team' : 'Register for Event'}
                </h2>

                {error && <div className="error-message">{error}</div>}
                {success && <div className="success-message">{success}</div>}

                {/* Normal event custom form fields */}
                {event.eventType === 'Normal' && event.formFields?.length > 0 && (
                  <div className="form-section">
                    <h3>Registration Form</h3>
                    {event.formFields.map((field, idx) => (
                      <div key={idx} className="form-field">
                        <label>
                          {field.label}
                          {field.required && <span className="required">*</span>}
                        </label>
                        {field.fieldType === 'text' && (
                          <input type="text" value={formResponses[field.label] || ''}
                            onChange={(e) => handleFormChange(field.label, e.target.value)}
                            required={field.required} />
                        )}
                        {field.fieldType === 'dropdown' && (
                          <select value={formResponses[field.label] || ''}
                            onChange={(e) => handleFormChange(field.label, e.target.value)}>
                            <option value="">Select...</option>
                            {field.options?.map((opt, oi) => (
                              <option key={oi} value={opt}>{opt}</option>
                            ))}
                          </select>
                        )}
                        {field.fieldType === 'checkbox' && (
                          <input type="checkbox"
                            checked={formResponses[field.label] === 'true'}
                            onChange={(e) => handleFormChange(field.label, e.target.checked.toString())} />
                        )}
                        {field.fieldType === 'file' && (
                          <div>
                            <input type="file"
                              onChange={(e) => handleFileFieldChange(field.label, e.target.files[0])}
                              required={field.required} />
                            {formResponses[field.label] && (
                              <span style={{ fontSize: '0.82rem', color: '#4caf50', display: 'block', marginTop: '4px' }}>
                                File uploaded
                              </span>
                            )}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}

                {/* Merchandise items */}
                {event.eventType === 'Merchandise' && event.merchandiseItems?.length > 0 && (
                  <div className="form-section">
                    <h3>Select Items</h3>
                    {event.merchandiseItems.map((item, idx) => (
                      <div key={idx} className="merchandise-item">
                        <h4>{item.name} — Rs.{item.price}</h4>
                        <p>Stock: {item.stock}</p>
                        {item.variants?.length > 0 && (
                          <select value={merchandiseSelection[item.name]?.variant || ''}
                            onChange={(e) => handleMerchandiseChange(item.name, e.target.value, merchandiseSelection[item.name]?.quantity || 0)}>
                            <option value="">Select variant</option>
                            {item.variants.map((v, vi) => <option key={vi} value={v}>{v}</option>)}
                          </select>
                        )}
                        <input type="number" min="0" max={item.stock} placeholder="Qty"
                          value={merchandiseSelection[item.name]?.quantity || 0}
                          onChange={(e) => handleMerchandiseChange(item.name, merchandiseSelection[item.name]?.variant || '', e.target.value)} />
                      </div>
                    ))}
                  </div>
                )}

                {/* Payment proof — Merchandise always, plus any paid Normal/Hackathon event */}
                {(event.eventType === 'Merchandise' || isPaidEvent) && (
                  <div className="form-section">
                    <div className="form-field">
                      <label>
                        Payment Proof <span className="required">*</span>
                        <small style={{ display: 'block', color: '#888', fontWeight: 'normal' }}>
                          Upload screenshot of payment of Rs.{event.registrationFee}
                        </small>
                      </label>
                      <input type="file" accept="image/*" onChange={handlePaymentProofChange} />
                      {paymentProof && (
                        <img src={paymentProof} alt="Payment proof preview" className="payment-proof-preview" />
                      )}
                    </div>
                  </div>
                )}

                {event.eventType === 'Hackathon' && (
                  <p className="hackathon-note">
                    Hackathon registration is team-based. You will create or join a team on the next page.
                  </p>
                )}

                <button onClick={handleRegister} className="btn-primary btn-register">
                  {event.eventType === 'Merchandise' ? 'Purchase' :
                   event.eventType === 'Hackathon' ? 'Continue to Team Setup' :
                   isPaidEvent ? 'Submit Registration' :
                   'Register Now'}
                </button>
              </div>
            )}
          </div>
        </div>

        {(isRegistered || isOrganizer) && event.status !== 'Draft' && (
          <EventForum eventId={id} isOrganizer={isOrganizer} />
        )}
      </div>
    </div>
  );
};

export default EventDetails;