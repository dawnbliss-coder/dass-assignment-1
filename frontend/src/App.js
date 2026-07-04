import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import PrivateRoute from './components/PrivateRoute';
import Navbar from './components/Navbar';

// Auth Pages
import Login from './pages/Login';
import Register from './pages/Register';

// Participant Pages
import ParticipantDashboard from './pages/ParticipantDashboard';
import BrowseEvents from './pages/BrowseEvents';
import EventDetails from './pages/EventDetails';
import Profile from './pages/Profile';
import ClubsListing from './pages/ClubsListing';
import OrganizerDetail from './pages/OrganizerDetail';
import TicketView from './pages/TicketView';
import FeedbackForm from './pages/FeedbackForm';
import TeamDashboard from './pages/TeamDashboard';      // NEW: Hackathon teams
import JoinTeam from './pages/JoinTeam';                // NEW: Join via invite code

// Organizer Pages
import OrganizerDashboard from './pages/OrganizerDashboard';
import CreateEvent from './pages/CreateEvent';
import EventManagement from './pages/EventManagement';
import OrganizerProfile from './pages/OrganizerProfile';
import PasswordResetRequest from './pages/PasswordResetRequest';
import FeedbackDashboard from './pages/FeedbackDashboard';

// Admin Pages
import AdminDashboard from './pages/AdminDashboard';
import ManageOrganizers from './pages/ManageOrganizers';
import PasswordResetRequests from './pages/PasswordResetRequests';

function App() {
  return (
    <AuthProvider>
      <Router>
        <div className="App">
          <Navbar />
          <Routes>
            {/* Public Routes */}
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />

            {/* Participant Routes */}
            <Route path="/dashboard" element={
              <PrivateRoute allowedRoles={['participant']}><ParticipantDashboard /></PrivateRoute>
            } />
            <Route path="/events" element={
              <PrivateRoute allowedRoles={['participant']}><BrowseEvents /></PrivateRoute>
            } />
            <Route path="/events/:id" element={
              <PrivateRoute allowedRoles={['participant']}><EventDetails /></PrivateRoute>
            } />
            <Route path="/profile" element={
              <PrivateRoute allowedRoles={['participant']}><Profile /></PrivateRoute>
            } />
            <Route path="/clubs" element={
              <PrivateRoute allowedRoles={['participant']}><ClubsListing /></PrivateRoute>
            } />
            <Route path="/clubs/:id" element={
              <PrivateRoute allowedRoles={['participant']}><OrganizerDetail /></PrivateRoute>
            } />
            <Route path="/ticket/:id" element={
              <PrivateRoute allowedRoles={['participant']}><TicketView /></PrivateRoute>
            } />
            <Route path="/feedback/:eventId" element={
              <PrivateRoute allowedRoles={['participant']}><FeedbackForm /></PrivateRoute>
            } />
            {/* NEW: Hackathon team pages */}
            <Route path="/team/:eventId" element={
              <PrivateRoute allowedRoles={['participant']}><TeamDashboard /></PrivateRoute>
            } />
            <Route path="/join-team" element={
              <PrivateRoute allowedRoles={['participant']}><JoinTeam /></PrivateRoute>
            } />

            {/* Organizer Routes */}
            <Route path="/organizer/dashboard" element={
              <PrivateRoute allowedRoles={['organizer']}><OrganizerDashboard /></PrivateRoute>
            } />
            <Route path="/organizer/create-event" element={
              <PrivateRoute allowedRoles={['organizer']}><CreateEvent /></PrivateRoute>
            } />
            <Route path="/organizer/events/:id" element={
              <PrivateRoute allowedRoles={['organizer']}><EventManagement /></PrivateRoute>
            } />
            <Route path="/organizer/profile" element={
              <PrivateRoute allowedRoles={['organizer']}><OrganizerProfile /></PrivateRoute>
            } />
            <Route path="/organizer/reset-password" element={
              <PrivateRoute allowedRoles={['organizer']}><PasswordResetRequest /></PrivateRoute>
            } />
            <Route path="/organizer/feedback/:eventId" element={
              <PrivateRoute allowedRoles={['organizer']}><FeedbackDashboard /></PrivateRoute>
            } />
            <Route path="/feedback-dashboard" element={
              <PrivateRoute allowedRoles={['organizer']}><FeedbackDashboard /></PrivateRoute>
            } />

            {/* Admin Routes */}
            <Route path="/admin/dashboard" element={
              <PrivateRoute allowedRoles={['admin']}><AdminDashboard /></PrivateRoute>
            } />
            <Route path="/admin/organizers" element={
              <PrivateRoute allowedRoles={['admin']}><ManageOrganizers /></PrivateRoute>
            } />
            <Route path="/admin/reset-requests" element={
              <PrivateRoute allowedRoles={['admin']}><PasswordResetRequests /></PrivateRoute>
            } />

            <Route path="/" element={<Navigate to="/login" replace />} />
          </Routes>
        </div>
      </Router>
    </AuthProvider>
  );
}

export default App;