import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { FaHandshake, FaUserCircle, FaSignOutAlt, FaInbox, FaExchangeAlt, FaUsers, FaFlag } from 'react-icons/fa';
import supabase from '../helper/supabaseClient';
import { PUBLIC_USER_FIELDS } from '../helper/userFields';
import { enhanceProfileWithPicture } from '../helper/profileHelper';

const Header = () => {
  const [user, setUser] = useState(null);
  const [userProfile, setUserProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [unreadCount, setUnreadCount] = useState(0);
  const [pendingSwapsCount, setPendingSwapsCount] = useState(0);
  const [isSiteAdmin, setIsSiteAdmin] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  // Effect to clear notifications when on specific pages
  useEffect(() => {
    // Clear inbox notifications when on inbox page
    if (location.pathname === '/inbox' && unreadCount > 0) {
      setUnreadCount(0);
    }
    
    // Clear swap notifications when on swap-requests page
    if (location.pathname === '/swap-requests' && pendingSwapsCount > 0) {
      setPendingSwapsCount(0);
    }
  }, [location.pathname, unreadCount, pendingSwapsCount]);

  useEffect(() => {
    const loadUserData = async (sessionUser) => {
      setUser(sessionUser || null);
      setLoading(false);
      if (!sessionUser) {
        setUserProfile(null);
        setIsSiteAdmin(false);
        return;
      }

      // Fetch user profile
      const { data } = await supabase
        .from('users')
        .select(PUBLIC_USER_FIELDS)
        .eq('id', sessionUser.id)
        .single();

      if (data) {
        setUserProfile(enhanceProfileWithPicture(data));
      }

      fetchUnreadCount(sessionUser.id);
      fetchPendingSwapsCount(sessionUser.id);
      supabase.rpc('is_site_admin').then(({ data: admin }) => setIsSiteAdmin(Boolean(admin)));
    };

    // This fires on page load (INITIAL_SESSION) and on every login/logout.
    // Never await Supabase calls inside this callback: it runs while the auth
    // lock is held, so awaiting another request deadlocks and the header
    // stays on its loading placeholder forever. Defer the work instead.
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        setTimeout(() => loadUserData(session?.user), 0);
      }
    );

    // Show a newly uploaded profile picture immediately (sent by Profile.jsx)
    const handlePictureUpdated = (e) => {
      const { url } = e.detail || {};
      if (url) setUserProfile(prev => ({ ...(prev || {}), profile_picture_url: url }));
    };
    window.addEventListener('profile-picture-updated', handlePictureUpdated);

    return () => {
      subscription.unsubscribe();
      window.removeEventListener('profile-picture-updated', handlePictureUpdated);
    };
  }, []);
  
  // Function to fetch unread message count
  const fetchUnreadCount = async (userId) => {
    try {
      const { count, error } = await supabase
        .from('messages')
        .select('*', { count: 'exact' })
        .eq('recipient_id', userId)
        .eq('is_read', false);
        
      if (error) throw error;
      setUnreadCount(count || 0);
      
     
      subscribeToMessages(userId);
    } catch (err) {
      console.error('Error fetching unread count:', err);
    }
  };
  
  // Function to fetch pending swaps count
  const fetchPendingSwapsCount = async (userId) => {
    try {
      const { count, error } = await supabase
        .from('task_swaps')
        .select('*', { count: 'exact' })
        .eq('recipient_id', userId)
        .eq('status', 'pending');
        
      if (error) throw error;
      setPendingSwapsCount(count || 0);
      
      // Subscribe to swap updates
      subscribeToSwaps(userId);
    } catch (err) {
      console.error('Error fetching pending swaps count:', err);
    }
  };
  
  // Subscribe to new messages
  const subscribeToMessages = (userId) => {
    const channel = supabase
      .channel('unread-messages')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'messages',
          filter: `recipient_id=eq.${userId}`,
        },
        (payload) => {
          if (payload.eventType === 'INSERT') {
            // Increment the unread count for new messages
            setUnreadCount((prev) => prev + 1);
          } else if (payload.eventType === 'UPDATE' && payload.new.is_read && !payload.old.is_read) {
            // Decrement the unread count when a message is marked as read
            setUnreadCount((prev) => Math.max(0, prev - 1));
          }
        }
      )
      .subscribe();

    return channel;
  };
  
  // Subscribe to swap updates
  const subscribeToSwaps = (userId) => {
    const channel = supabase
      .channel('pending-swaps')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'task_swaps',
          filter: `recipient_id=eq.${userId}`,
        },
        (payload) => {
          if (payload.eventType === 'INSERT' && payload.new.status === 'pending') {
            // Increment the pending count for new swap requests
            setPendingSwapsCount((prev) => prev + 1);
          } else if (payload.eventType === 'UPDATE') {
            // If status changed from pending to something else, decrement
            if (payload.old.status === 'pending' && payload.new.status !== 'pending') {
              setPendingSwapsCount((prev) => Math.max(0, prev - 1));
            }
            // If status changed to pending from something else, increment
            else if (payload.old.status !== 'pending' && payload.new.status === 'pending') {
              setPendingSwapsCount((prev) => prev + 1);
            }
          } else if (payload.eventType === 'DELETE' && payload.old.status === 'pending') {
            // Decrement if a pending swap is deleted
            setPendingSwapsCount((prev) => Math.max(0, prev - 1));
          }
        }
      )
      .subscribe();

    return channel;
  };

  const handleLogout = async () => {
    try {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
      
      // Redirect to homepage after successful logout
      navigate('/');
    } catch (error) {
      console.error('Error logging out:', error.message);
    }
  };

  // If we're on the reset password page, return an empty header
  if (location.pathname === '/reset-password') {
    return (
      <header className="bg-white shadow-sm py-4">
        <div className="container mx-auto px-4">
          <Link to="/" className="flex items-center gap-2">
            <div className="w-10 h-10 bg-orange-500 rounded-md flex items-center justify-center">
              <FaHandshake className="text-white text-2xl" />
            </div>
            <span className="text-xl font-bold text-gray-800">Give a Hand</span>
          </Link>
        </div>
      </header>
    );
  }

  // Return the regular header for all other pages
  return (
    <header className="bg-white shadow-md">
      <div className="container mx-auto px-4 py-3">
        <div className="flex flex-wrap justify-between items-center gap-y-3">
          <Link to="/" className="flex items-center gap-2">
            <div className="w-10 h-10 bg-orange-500 rounded-md flex items-center justify-center">
              <FaHandshake className="text-white text-2xl" />
            </div>
            <span className="text-xl font-bold text-dark">Give a Hand</span>
          </Link>

          <nav className="order-3 w-full lg:order-none lg:w-auto flex flex-wrap items-center gap-x-6 gap-y-2">
            <Link to="/" className="font-medium hover:text-orange-500 transition-colors">
              Home
            </Link>
            <Link to="/tasks" className="font-medium hover:text-orange-500 transition-colors">
              Find Tasks
            </Link>
            <Link to="/post-task" className="font-medium hover:text-orange-500 transition-colors">
              Post a Task
            </Link>
            <Link to="/communities" className="font-medium hover:text-orange-500 transition-colors">
              Communities
            </Link>
            <Link to="/users/search" className="font-medium hover:text-orange-500 transition-colors">
              Find Users
            </Link>
            <Link to="/leaderboard" className="font-medium hover:text-orange-500 transition-colors">
              Leaderboard
            </Link>
            <Link to="/how-it-works" className="font-medium hover:text-orange-500 transition-colors">
              How It Works
            </Link>
            <Link to="/about-us" className="font-medium hover:text-orange-500 transition-colors">
              About Us
            </Link>
          </nav>

          <div className="flex items-center space-x-4">
            {loading ? (
              <div className="w-8 h-8 rounded-full bg-gray-200 animate-pulse"></div>
            ) : user ? (
              <div className="flex items-center space-x-4">
                <Link to="/users/search" className="md:hidden">
                  <FaUsers className="w-6 h-6 text-gray-600 hover:text-orange-500" />
                </Link>
                <Link to="/inbox" className="relative">
                  <FaInbox className="w-6 h-6 text-gray-600 hover:text-orange-500" />
                  {unreadCount > 0 && (
                    <div className="absolute -top-2 -right-2 bg-orange-500 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs">
                      {unreadCount > 9 ? '9+' : unreadCount}
                    </div>
                  )}
                </Link>
                {isSiteAdmin && (
                  <Link to="/admin/reports" title="Reports (admin)">
                    <FaFlag className="w-5 h-5 text-gray-600 hover:text-red-500" />
                  </Link>
                )}
                <Link to="/swap-requests" className="relative">
                  <FaExchangeAlt className="w-6 h-6 text-gray-600 hover:text-orange-500" />
                  {pendingSwapsCount > 0 && (
                    <div className="absolute -top-2 -right-2 bg-blue-500 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs">
                      {pendingSwapsCount > 9 ? '9+' : pendingSwapsCount}
                    </div>
                  )}
                </Link>
                <Link to="/profile">
                  {userProfile?.profile_picture_url ? (
                    <img 
                      src={userProfile.profile_picture_url} 
                      alt="Profile" 
                      className="w-10 h-10 rounded-full object-cover border-2 border-orange-500"
                      onError={(e) => {
                        console.log("Failed to load profile image in header");
                        e.target.style.display = 'none';
                        e.target.nextElementSibling.style.display = 'block';
                      }}
                    />
                  ) : null}
                  <FaUserCircle 
                    className={`w-10 h-10 text-gray-600 hover:text-orange-500 ${userProfile?.profile_picture_url ? 'hidden' : ''}`}
                  />
                </Link>
                <button
                  onClick={handleLogout}
                  className="font-medium hover:text-orange-500 transition-colors flex items-center gap-2"
                >
                  <FaSignOutAlt />
                  Logout
                </button>
              </div>
            ) : (
              <div className="flex items-center space-x-4">
                <Link to="/login" className="font-medium hover:text-orange-500 transition-colors">
                  Log In
                </Link>
                <Link
                  to="/signup"
                  className="bg-orange-500 text-white px-4 py-2 rounded-md font-medium hover:bg-opacity-90 transition-all"
                >
                  Sign Up
                </Link>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header; 