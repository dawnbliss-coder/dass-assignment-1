import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';
import { Plus, Trash2, GripVertical } from 'lucide-react';
import './CreateEvent.css';

const CreateEvent = () => {
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const [formData, setFormData] = useState({
    name: '',
    description: '',
    eventType: 'Normal',
    eligibility: 'All',
    registrationDeadline: '',
    startDate: '',
    endDate: '',
    registrationLimit: '',
    registrationFee: 0,
    tags: '',
    location: '',
    teamSize: 4,
    minTeamSize: 2,
    merchandiseItems: [],
    purchaseLimit: 1,
    formFields: [],
  });

  const [newMerchandiseItem, setNewMerchandiseItem] = useState({
    name: '', variants: '', price: '', stock: ''
  });

  const [newFormField, setNewFormField] = useState({
    label: '', fieldType: 'text', options: '', required: false
  });

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const addMerchandiseItem = () => {
    if (!newMerchandiseItem.name || !newMerchandiseItem.price || !newMerchandiseItem.stock) {
      setError('Fill in item name, price, and stock');
      return;
    }
    setFormData(prev => ({
      ...prev,
      merchandiseItems: [
        ...prev.merchandiseItems,
        {
          name: newMerchandiseItem.name,
          variants: newMerchandiseItem.variants.split(',').map(v => v.trim()).filter(Boolean),
          price: parseFloat(newMerchandiseItem.price),
          stock: parseInt(newMerchandiseItem.stock)
        }
      ]
    }));
    setNewMerchandiseItem({ name: '', variants: '', price: '', stock: '' });
    setError('');
  };

  const removeMerchandiseItem = (idx) => {
    setFormData(prev => ({
      ...prev,
      merchandiseItems: prev.merchandiseItems.filter((_, i) => i !== idx)
    }));
  };

  const addFormField = () => {
    if (!newFormField.label) { setError('Field label is required'); return; }
    setFormData(prev => ({
      ...prev,
      formFields: [
        ...prev.formFields,
        {
          label: newFormField.label,
          fieldType: newFormField.fieldType,
          options: newFormField.options.split(',').map(o => o.trim()).filter(Boolean),
          required: newFormField.required,
          order: prev.formFields.length
        }
      ]
    }));
    setNewFormField({ label: '', fieldType: 'text', options: '', required: false });
    setError('');
  };

  const removeFormField = (idx) => {
    setFormData(prev => ({
      ...prev,
      formFields: prev.formFields.filter((_, i) => i !== idx)
    }));
  };

  // Post to Discord directly from the browser to avoid Render IP rate limiting
  const postToDiscord = async (event) => {
    try {
      const profileRes = await api.get('/users/profile');
      const webhookUrl = profileRes.data.discordWebhook;
      if (!webhookUrl) return;

      await fetch(webhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          embeds: [{
            title: `New Event: ${event.name}`,
            description: event.description?.substring(0, 200) || '',
            color: 5793266,
            fields: [
              { name: 'Type',     value: event.eventType || 'N/A',                                       inline: true },
              { name: 'Start',    value: new Date(event.startDate).toDateString(),                       inline: true },
              { name: 'Location', value: event.location || 'TBA',                                       inline: true },
              { name: 'Fee',      value: event.registrationFee ? `Rs.${event.registrationFee}` : 'Free', inline: true },
            ],
            footer: { text: 'Felicity Event Management' }
          }]
        })
      });
    } catch (e) {
      // Don't block event creation if Discord fails
      console.error('Discord webhook error:', e.message);
    }
  };

  const handleSaveDraft = async () => {
    await submitEvent('Draft');
  };

  const handlePublish = async () => {
    await submitEvent('Published');
  };

  const submitEvent = async (status) => {
    setError('');
    if (!formData.name || !formData.description || !formData.registrationDeadline ||
        !formData.startDate || !formData.endDate) {
      setError('Please fill in all required fields (name, description, dates)');
      return;
    }

    if (formData.eventType === 'Merchandise' && formData.merchandiseItems.length === 0) {
      setError('Please add at least one merchandise item');
      return;
    }

    setSaving(true);
    try {
      const payload = {
        ...formData,
        tags: formData.tags.split(',').map(t => t.trim()).filter(Boolean),
        registrationLimit: parseInt(formData.registrationLimit) || 0,
        registrationFee: parseFloat(formData.registrationFee) || 0,
      };

      const res = await api.post('/events', payload);

      if (status === 'Published') {
        await api.put(`/events/${res.data._id}/status`, { newStatus: 'Published' });
      }

      // Post to Discord from browser (avoids Render shared IP rate limit)
      await postToDiscord(res.data);

      navigate(`/organizer/events/${res.data._id}`);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to create event');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="page-container">
      <div className="create-event-container">
        <div className="create-event-header">
          <h1>Create New Event</h1>
          <p>Events are saved as Draft first. You can publish when ready.</p>
        </div>

        {error && <div className="error-message">{error}</div>}

        <div className="step-indicator">
          {['Basic Info', 'Details', formData.eventType === 'Normal' ? 'Registration Form' : formData.eventType === 'Merchandise' ? 'Merchandise' : 'Team Settings'].map((label, idx) => (
            <div key={idx} className={`step ${step === idx + 1 ? 'active' : step > idx + 1 ? 'done' : ''}`}>
              <span className="step-number">{idx + 1}</span>
              <span className="step-label">{label}</span>
            </div>
          ))}
        </div>

        {/* STEP 1: Basic info */}
        {step === 1 && (
          <div className="form-card">
            <h2>Basic Information</h2>
            <div className="form-field">
              <label>Event Name *</label>
              <input type="text" name="name" value={formData.name} onChange={handleChange} placeholder="e.g. AI Hackathon 2026" />
            </div>
            <div className="form-field">
              <label>Event Type *</label>
              <select name="eventType" value={formData.eventType} onChange={handleChange}>
                <option value="Normal">Normal (Individual)</option>
                <option value="Merchandise">Merchandise</option>
                <option value="Hackathon">Hackathon (Team)</option>
              </select>
            </div>
            <div className="form-field">
              <label>Description *</label>
              <textarea name="description" rows={5} value={formData.description} onChange={handleChange} placeholder="Describe your event..." />
            </div>
            <div className="form-field">
              <label>Eligibility</label>
              <select name="eligibility" value={formData.eligibility} onChange={handleChange}>
                <option value="All">All</option>
                <option value="IIIT Only">IIIT Only</option>
                <option value="Non-IIIT Only">Non-IIIT Only</option>
              </select>
            </div>
            <div className="form-field">
              <label>Location</label>
              <input type="text" name="location" value={formData.location} onChange={handleChange} placeholder="Venue or online" />
            </div>
            <div className="form-field">
              <label>Tags (comma-separated)</label>
              <input type="text" name="tags" value={formData.tags} onChange={handleChange} placeholder="e.g. AI, Machine Learning, Hackathon" />
            </div>
            <div className="form-grid">
              <div className="form-field">
                <label>Registration Deadline *</label>
                <input type="date" name="registrationDeadline" value={formData.registrationDeadline} onChange={handleChange} />
              </div>
              <div className="form-field">
                <label>Registration Fee (Rs.)</label>
                <input type="number" name="registrationFee" value={formData.registrationFee} onChange={handleChange} min="0" />
              </div>
              <div className="form-field">
                <label>Start Date *</label>
                <input type="date" name="startDate" value={formData.startDate} onChange={handleChange} />
              </div>
              <div className="form-field">
                <label>End Date *</label>
                <input type="date" name="endDate" value={formData.endDate} onChange={handleChange} />
              </div>
              <div className="form-field">
                <label>Registration Limit (0 = unlimited)</label>
                <input type="number" name="registrationLimit" value={formData.registrationLimit} onChange={handleChange} min="0" />
              </div>
            </div>
            <div className="step-actions">
              <button className="btn-primary" onClick={() => { setError(''); setStep(2); }}>Next</button>
            </div>
          </div>
        )}

        {/* STEP 2: Type-specific fields */}
        {step === 2 && (
          <div className="form-card">
            {formData.eventType === 'Hackathon' && (
              <>
                <h2>Team Settings</h2>
                <div className="form-grid">
                  <div className="form-field">
                    <label>Min Team Size</label>
                    <input type="number" name="minTeamSize" value={formData.minTeamSize}
                      onChange={handleChange} min="2" max="10" />
                  </div>
                  <div className="form-field">
                    <label>Max Team Size</label>
                    <input type="number" name="teamSize" value={formData.teamSize}
                      onChange={handleChange} min="2" max="20" />
                  </div>
                </div>
                <p style={{ color: '#888', fontSize: '0.87rem' }}>
                  Participants will create teams and invite others. A team must be full before registration completes.
                </p>
              </>
            )}

            {formData.eventType === 'Merchandise' && (
              <>
                <h2>Merchandise Items</h2>
                {formData.merchandiseItems.map((item, idx) => (
                  <div key={idx} className="merchandise-item-card">
                    <div>
                      <strong>{item.name}</strong> — Rs.{item.price} | Stock: {item.stock}
                      {item.variants?.length > 0 && <span style={{ color: '#888' }}> | Variants: {item.variants.join(', ')}</span>}
                    </div>
                    <button className="btn-remove" onClick={() => removeMerchandiseItem(idx)}><Trash2 size={16} /></button>
                  </div>
                ))}
                <div className="add-item-form">
                  <h3>Add Item</h3>
                  <div className="form-grid">
                    <div className="form-field">
                      <label>Item Name *</label>
                      <input type="text" value={newMerchandiseItem.name}
                        onChange={(e) => setNewMerchandiseItem(p => ({ ...p, name: e.target.value }))}
                        placeholder="e.g. T-Shirt" />
                    </div>
                    <div className="form-field">
                      <label>Variants (comma-sep)</label>
                      <input type="text" value={newMerchandiseItem.variants}
                        onChange={(e) => setNewMerchandiseItem(p => ({ ...p, variants: e.target.value }))}
                        placeholder="S, M, L, XL" />
                    </div>
                    <div className="form-field">
                      <label>Price (Rs.) *</label>
                      <input type="number" value={newMerchandiseItem.price}
                        onChange={(e) => setNewMerchandiseItem(p => ({ ...p, price: e.target.value }))} />
                    </div>
                    <div className="form-field">
                      <label>Stock *</label>
                      <input type="number" value={newMerchandiseItem.stock}
                        onChange={(e) => setNewMerchandiseItem(p => ({ ...p, stock: e.target.value }))} />
                    </div>
                  </div>
                  <button className="btn-secondary" onClick={addMerchandiseItem}><Plus size={16} /> Add Item</button>
                </div>
                <div className="form-field">
                  <label>Purchase Limit per Participant</label>
                  <input type="number" name="purchaseLimit" value={formData.purchaseLimit}
                    onChange={handleChange} min="1" />
                </div>
              </>
            )}

            {formData.eventType === 'Normal' && (
              <div style={{ textAlign: 'center', padding: '40px 0', color: '#888' }}>
                <p>Normal event selected. Next step: build your custom registration form.</p>
              </div>
            )}

            <div className="step-actions">
              <button className="btn-secondary" onClick={() => setStep(1)}>Back</button>
              <button className="btn-primary" onClick={() => { setError(''); setStep(3); }}>Next</button>
            </div>
          </div>
        )}

        {/* STEP 3: Form builder or review */}
        {step === 3 && (
          <div className="form-card">
            {formData.eventType === 'Normal' && (
              <>
                <h2>Registration Form Builder</h2>
                <p style={{ color: '#888', fontSize: '0.87rem' }}>
                  Build custom fields for participants to fill out when registering. The form will be locked after the first registration.
                </p>

                {formData.formFields.map((field, idx) => (
                  <div key={idx} className="form-field-preview">
                    <GripVertical size={16} style={{ color: '#ccc' }} />
                    <div className="field-info">
                      <strong>{field.label}</strong>
                      <span>{field.fieldType}{field.required ? ' • Required' : ''}</span>
                      {field.options?.length > 0 && <span>Options: {field.options.join(', ')}</span>}
                    </div>
                    <button className="btn-remove" onClick={() => removeFormField(idx)}><Trash2 size={16} /></button>
                  </div>
                ))}

                <div className="add-field-form">
                  <h3>Add Field</h3>
                  <div className="form-grid">
                    <div className="form-field">
                      <label>Field Label *</label>
                      <input type="text" value={newFormField.label}
                        onChange={(e) => setNewFormField(p => ({ ...p, label: e.target.value }))}
                        placeholder="e.g. GitHub Profile URL" />
                    </div>
                    <div className="form-field">
                      <label>Field Type</label>
                      <select value={newFormField.fieldType}
                        onChange={(e) => setNewFormField(p => ({ ...p, fieldType: e.target.value }))}>
                        <option value="text">Text</option>
                        <option value="dropdown">Dropdown</option>
                        <option value="checkbox">Checkbox</option>
                        <option value="file">File Upload</option>
                      </select>
                    </div>
                    {newFormField.fieldType === 'dropdown' && (
                      <div className="form-field" style={{ gridColumn: '1 / -1' }}>
                        <label>Options (comma-separated)</label>
                        <input type="text" value={newFormField.options}
                          onChange={(e) => setNewFormField(p => ({ ...p, options: e.target.value }))}
                          placeholder="Option 1, Option 2, Option 3" />
                      </div>
                    )}
                  </div>
                  <label className="checkbox-label">
                    <input type="checkbox" checked={newFormField.required}
                      onChange={(e) => setNewFormField(p => ({ ...p, required: e.target.checked }))} />
                    Mark as Required
                  </label>
                  <button className="btn-secondary" onClick={addFormField} style={{ marginTop: '8px' }}>
                    <Plus size={16} /> Add Field
                  </button>
                </div>
              </>
            )}

            {formData.eventType !== 'Normal' && (
              <div style={{ padding: '20px 0' }}>
                <h2>Review and Create</h2>
                <p><strong>Name:</strong> {formData.name}</p>
                <p><strong>Type:</strong> {formData.eventType}</p>
                <p><strong>Start:</strong> {formData.startDate}</p>
                {formData.eventType === 'Hackathon' && (
                  <p><strong>Team Size:</strong> {formData.minTeamSize}–{formData.teamSize}</p>
                )}
                {formData.eventType === 'Merchandise' && (
                  <p><strong>Items:</strong> {formData.merchandiseItems.length}</p>
                )}
              </div>
            )}

            <div className="step-actions">
              <button className="btn-secondary" onClick={() => setStep(2)}>Back</button>
              <button className="btn-secondary" onClick={handleSaveDraft} disabled={saving}>
                {saving ? 'Saving...' : 'Save as Draft'}
              </button>
              <button className="btn-primary" onClick={handlePublish} disabled={saving}>
                {saving ? 'Publishing...' : 'Publish Event'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default CreateEvent;