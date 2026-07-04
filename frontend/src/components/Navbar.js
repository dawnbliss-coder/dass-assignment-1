import React from 'react';
import { NavLink, Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { LogOut, Home, Calendar, Users, User, Settings } from 'lucide-react';
import './Navbar.css';

const ROLE_LABELS = {
  participant: 'Participant',
  organizer: 'Organizer',
  admin: 'Admin',
};

const linkClass = ({ isActive }) => `nav-link${isActive ? ' active' : ''}`;

const Navbar = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  if (!user) {
    return null; // Don't show navbar on login/register pages
  }

  const initials = (user.firstName?.[0] || user.organizerName?.[0] || user.email?.[0] || '?').toUpperCase();

  const getNavLinks = () => {
    if (user.role === 'participant') {
      return (
        <>
          <NavLink to="/dashboard" className={linkClass}>
            <Home size={18} /> Dashboard
          </NavLink>
          <NavLink to="/events" className={linkClass}>
            <Calendar size={18} /> Browse Events
          </NavLink>
          <NavLink to="/clubs" className={linkClass}>
            <Users size={18} /> Clubs/Organizers
          </NavLink>
          <NavLink to="/profile" className={linkClass}>
            <User size={18} /> Profile
          </NavLink>
        </>
      );
    } else if (user.role === 'organizer') {
      return (
        <>
          <NavLink to="/organizer/dashboard" className={linkClass}>
            <Home size={18} /> Dashboard
          </NavLink>
          <NavLink to="/organizer/create-event" className={linkClass}>
            <Calendar size={18} /> Create Event
          </NavLink>
          <NavLink to="/organizer/profile" className={linkClass}>
            <User size={18} /> Profile
          </NavLink>
        </>
      );
    } else if (user.role === 'admin') {
      return (
        <>
          <NavLink to="/admin/dashboard" className={linkClass}>
            <Home size={18} /> Dashboard
          </NavLink>
          <NavLink to="/admin/organizers" className={linkClass}>
            <Users size={18} /> Manage Clubs/Organizers
          </NavLink>
          <NavLink to="/admin/reset-requests" className={linkClass}>
            <Settings size={18} /> Password Reset Requests
          </NavLink>
        </>
      );
    }
    return null;
  };

  return (
    <nav className="navbar">
      <div className="navbar-container">
        <Link to="/" className="navbar-brand">
          Felicity
        </Link>
        <div className="navbar-links">
          {getNavLinks()}
        </div>
        <div className="navbar-user">
          <span className="navbar-avatar" title={user.email}>{initials}</span>
          <span className="navbar-role-badge">{ROLE_LABELS[user.role] || user.role}</span>
          <button onClick={handleLogout} className="nav-link logout-btn" title="Logout">
            <LogOut size={18} />
          </button>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
