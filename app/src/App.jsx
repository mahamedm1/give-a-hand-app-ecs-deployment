import React, { useEffect } from 'react'
import { BrowserRouter as Router, Routes, Route, useLocation } from 'react-router-dom'
import Header from './components/Header'
import Footer from './components/Footer'
import Home from './pages/Home'
import Tasks from './pages/Tasks'
import TaskDetail from './pages/TaskDetail';
import Communities from './pages/Communities';
import CommunityDetail from './pages/CommunityDetail';
import EditTask from './pages/EditTask';
import Privacy from './pages/Privacy';
import Terms from './pages/Terms';
import Faq from './pages/Faq';
import Contact from './pages/Contact';
import AdminReports from './pages/AdminReports';
import NotFound from './pages/NotFound';
import HowItWorks from './pages/HowItWorks'
import AboutUs from './pages/AboutUs'
import Login from './pages/Login'
import SignUp from './pages/SignUp'
import SignUpSuccess from './pages/SignUpSuccess'
import Profile from './pages/Profile'
import UserProfile from './pages/UserProfile'
import UserSearch from './pages/UserSearch'
import ForgotPassword from './pages/ForgotPassword'
import ResetPassword from './pages/ResetPassword'
import PostTask from './pages/PostTask'
import Inbox from './pages/Inbox'
import SwapRequests from './pages/SwapRequests'
import LeaderboardPage from './pages/LeaderboardPage'
import { initProfilePictureSystem } from './helper/profileHelper'

// Component to conditionally render header based on route
const AppWrapper = () => {
  const location = useLocation();
  const hideHeaderOnRoutes = ['/signup-success'];
  const shouldShowHeader = !hideHeaderOnRoutes.includes(location.pathname);

  return (
    <div className="flex flex-col min-h-screen">
      {shouldShowHeader && <Header />}
      <main className="flex-grow">
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/tasks" element={<Tasks />} />
          <Route path="/tasks/:taskId" element={<TaskDetail />} />
          <Route path="/how-it-works" element={<HowItWorks />} />
          <Route path="/about-us" element={<AboutUs />} />
          <Route path="/login" element={<Login />} />
          <Route path="/signup" element={<SignUp />} />
          <Route path="/signup-success" element={<SignUpSuccess />} />
          <Route path="/profile" element={<Profile />} />
          <Route path="/users/search" element={<UserSearch />} />
          <Route path="/users/:userId" element={<UserProfile />} />
          <Route path="/forgot-password" element={<ForgotPassword />} />
          <Route path="/reset-password" element={<ResetPassword />} />
          <Route path="/post-task" element={<PostTask />} />
          <Route path="/inbox" element={<Inbox />} />
          <Route path="/swap-requests" element={<SwapRequests />} />
          <Route path="/leaderboard" element={<LeaderboardPage />} />
          <Route path="/communities" element={<Communities />} />
          <Route path="/communities/:communityId" element={<CommunityDetail />} />
          <Route path="/tasks/:taskId/edit" element={<EditTask />} />
          <Route path="/privacy" element={<Privacy />} />
          <Route path="/terms" element={<Terms />} />
          <Route path="/faq" element={<Faq />} />
          <Route path="/contact" element={<Contact />} />
          <Route path="/admin/reports" element={<AdminReports />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </main>
      <Footer />
    </div>
  );
};

const App = () => {
  // Initialize the profile picture system on app startup
  useEffect(() => {
    // Initialize profile picture system
    initProfilePictureSystem();
  }, []);

  return (
    <Router>
      <AppWrapper />
    </Router>
  )
}

export default App