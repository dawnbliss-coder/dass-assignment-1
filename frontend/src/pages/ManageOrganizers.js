import React, { useState, useEffect } from 'react';
import api from '../services/api';
import { Plus, Trash2 } from 'lucide-react';
import './ManageOrganizers.css';

const ManageOrganizers = () => {
  const [organizers, setOrganizers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [formData, setFormData] = useState({
    organizerName: '',
    email: '',
    category: '',
    description: '',
    contactNumber: ''
  });
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [createdCredentials, setCreatedCredentials] = useState(null);

  useEffect(() => {
    fetchOrganizers();
  }, []);

  const fetchOrganizers = async () => {
    try {
      const response = await api.get('/admin/users');
      const organizerList = response.data.filter(u => u.role === 'organizer');
      setOrganizers(organizerList);
    } catch (error) {
      console.error('Error fetching organizers:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setCreatedCredentials(null);

    try {
      const response = await api.post('/admin/organizers', formData);
      setCreatedCredentials({
        email: response.data.email,
        password: response.data.tempPassword
      });
      setSuccess('Organizer created successfully!');
      setFormData({
        organizerName: '',
        email: '',
        category: '',
        description: '',
        contactNumber: ''
      });
      setShowCreateForm(false);
      fetchOrganizers();
    } catch (error) {
      setError(error.response?.data?.message || 'Failed to create organizer');
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this organizer? This action cannot be undone.')) {
      return;
    }

    try {
      await api.delete(`/admin/organizers/${id}`);
      setSuccess('Organizer deleted successfully');
      fetchOrganizers();
    } catch (error) {
      setError(error.response?.data?.message || 'Failed to delete organizer');
    }
  };

  if (loading) {
    return <div className="page-container"><div className="loading">Loading...</div></div>;
  }

  return (
    <div className="page-container">
      <div className="manage-organizers-container">
        <div className="page-header">
          <h1>Manage Clubs/Organizers</h1>
          <button onClick={() => setShowCreateForm(!showCreateForm)} className="btn-primary">
            <Plus size={18} /> Create New Organizer
          </button>
        </div>

        {error && <div className="error-message">{error}</div>}
        {success && <div className="success-message">{success}</div>}

        {createdCredentials && (
          <div className="credentials-box">
            <h3>New Organizer Credentials</h3>
            <p><strong>Email:</strong> {createdCredentials.email}</p>
            <p><strong>Password:</strong> {createdCredentials.password}</p>
            <p className="warning">Please share these credentials with the organizer. They can log in immediately.</p>
            <button onClick={() => setCreatedCredentials(null)} className="btn-secondary">
              Close
            </button>
          </div>
        )}

        {showCreateForm && (
          <div className="create-form-card">
            <h2>Create New Organizer</h2>
            <form onSubmit={handleCreate}>
              <div className="form-group">
                <label>Organizer Name *</label>
                <input
                  type="text"
                  name="organizerName"
                  value={formData.organizerName}
                  onChange={handleChange}
                  required
                />
              </div>
              <div className="form-group">
                <label>Email *</label>
                <input
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  required
                />
              </div>
              <div className="form-group">
                <label>Category</label>
                <input
                  type="text"
                  name="category"
                  value={formData.category}
                  onChange={handleChange}
                  placeholder="e.g., Technical Club, Cultural Club"
                />
              </div>
              <div className="form-group">
                <label>Description</label>
                <textarea
                  name="description"
                  value={formData.description}
                  onChange={handleChange}
                  rows="3"
                />
              </div>
              <div className="form-group">
                <label>Contact Number</label>
                <input
                  type="tel"
                  name="contactNumber"
                  value={formData.contactNumber}
                  onChange={handleChange}
                />
              </div>
              <div className="form-actions">
                <button type="submit" className="btn-primary">Create</button>
                <button type="button" onClick={() => setShowCreateForm(false)} className="btn-secondary">
                  Cancel
                </button>
              </div>
            </form>
          </div>
        )}

        <div className="organizers-list">
          <h2>All Organizers ({organizers.length})</h2>
          {organizers.length === 0 ? (
            <div className="empty-state">
              <p>No organizers found</p>
            </div>
          ) : (
            <div className="organizers-table">
              <table>
                <thead>
                  <tr>
                    <th>Name</th>
                    <th>Email</th>
                    <th>Category</th>
                    <th>Description</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {organizers.map((organizer) => (
                    <tr key={organizer._id}>
                      <td>{organizer.firstName || organizer.organizerName}</td>
                      <td>{organizer.email}</td>
                      <td>{organizer.category || '-'}</td>
                      <td>{organizer.description ? organizer.description.substring(0, 50) + '...' : '-'}</td>
                      <td>
                        <button
                          onClick={() => handleDelete(organizer._id)}
                          className="btn-delete"
                          title="Delete Organizer"
                        >
                          <Trash2 size={18} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ManageOrganizers;
