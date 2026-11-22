import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import supabase from '../helper/supabaseClient';
import SwapRequestsComponent from '../components/SwapRequests';
import { FaExchangeAlt, FaArrowLeft } from 'react-icons/fa';

const SwapRequests = () => {
  const [currentUser, setCurrentUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const loadUser = async () => {
      try {
        setLoading(true);
        const { data, error } = await supabase.auth.getUser();
        
        if (error) throw error;
        
        if (!data.user) {
          setError('You must be logged in to view swap requests');
          setLoading(false);
          return;
        }
        
        setCurrentUser(data.user);
      } catch (err) {
        console.error('Error loading user:', err);
        setError('Failed to load user information');
      } finally {
        setLoading(false);
      }
    };
    
    loadUser();
  }, []);

  // Accepting / rejecting swaps is handled inside components/SwapRequests.jsx

  if (loading) {
    return (
      <div className="min-h-screen py-10">
        <div className="container mx-auto px-4">
          <div className="flex justify-center items-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen py-10">
        <div className="container mx-auto px-4">
          <div className="bg-red-100 p-4 rounded-md text-red-700 mb-6">
            {error}
          </div>
          <Link to="/tasks" className="text-blue-500 hover:text-blue-600 flex items-center">
            <FaArrowLeft className="mr-2" />
            Back to Tasks
          </Link>
        </div>
      </div>
    );
  }

  if (!currentUser) {
    return (
      <div className="min-h-screen py-10">
        <div className="container mx-auto px-4">
          <div className="bg-yellow-100 p-4 rounded-md text-yellow-700 mb-6">
            You must be logged in to view swap requests.
          </div>
          <Link to="/login" className="text-blue-500 hover:text-blue-600">
            Go to Login
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen py-10">
      <div className="container mx-auto px-4">
        <div className="mb-6">
          <Link to="/tasks" className="text-blue-500 hover:text-blue-600 flex items-center mb-4">
            <FaArrowLeft className="mr-2" />
            Back to Tasks
          </Link>
        </div>
        
        <div className="max-w-4xl mx-auto">
          <SwapRequestsComponent currentUserId={currentUser.id} />
        </div>
      </div>
    </div>
  );
};

export default SwapRequests; 