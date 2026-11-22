import React, { useState, useEffect } from 'react';
import supabase from '../helper/supabaseClient';
import { FaExchangeAlt, FaTimes } from 'react-icons/fa';

const SwapModal = ({ isOpen, onClose, recipientTask, recipientId }) => {
  const [userTasks, setUserTasks] = useState([]);
  const [selectedTaskId, setSelectedTaskId] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [currentUser, setCurrentUser] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (isOpen) {
      loadUserTasks();
    }
  }, [isOpen]);

  const loadUserTasks = async () => {
    try {
      setLoading(true);
      
      // Get current user
      const { data: authData } = await supabase.auth.getUser();
      if (!authData.user) {
        setError('You must be logged in to offer a swap');
        setLoading(false);
        return;
      }
      
      setCurrentUser(authData.user);
      
      // Fetch user's open tasks
      const { data, error } = await supabase
        .from('tasks')
        .select('*')
        .eq('user_id', authData.user.id)
        .eq('status', 'open')
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      
      setUserTasks(data);
      
      // Set the first task as selected by default if available
      if (data.length > 0) {
        setSelectedTaskId(data[0].id);
      }
    } catch (err) {
      console.error('Error loading user tasks:', err);
      setError('Failed to load your tasks');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!selectedTaskId) {
      setError('Please select a task to offer');
      return;
    }
    
    try {
      setSubmitting(true);
      
      // Create the swap offer
      const { error } = await supabase
        .from('task_swaps')
        .insert({
          sender_id: currentUser.id,
          recipient_id: recipientId,
          sender_task_id: selectedTaskId,
          recipient_task_id: recipientTask.id,
          status: 'pending'
        });
      
      if (error) throw error;

      // The recipient sees the offer straight away via the swap icon in the
      // header (live badge) and on their Swap Requests page.
      alert('Swap offer sent!');
      onClose();
    } catch (err) {
      console.error('Error creating swap offer:', err);
      setError('Failed to create swap offer');
    } finally {
      setSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-bold text-gray-800">Offer Task Swap</h2>
            <button 
              onClick={onClose}
              className="text-gray-500 hover:text-gray-700"
            >
              <FaTimes />
            </button>
          </div>
          
          {error && (
            <div className="mb-4 p-3 bg-red-100 text-red-700 rounded-md">
              {error}
            </div>
          )}
          
          <div className="mb-6">
            <h3 className="text-lg font-medium text-gray-700 mb-2">Task You Want</h3>
            <div className="bg-gray-50 p-4 rounded-md">
              <h4 className="font-medium">{recipientTask.title}</h4>
              <p className="text-sm text-gray-600 mt-1">{recipientTask.description}</p>
              <div className="mt-2 flex flex-wrap gap-2">
                <span className="inline-block bg-gray-200 rounded-full px-3 py-1 text-xs font-semibold text-gray-700">
                  {recipientTask.category}
                </span>
                <span className="inline-block bg-gray-200 rounded-full px-3 py-1 text-xs font-semibold text-gray-700">
                  {recipientTask.estimated_duration}
                </span>
              </div>
            </div>
          </div>
          
          <form onSubmit={handleSubmit}>
            <div className="mb-6">
              <label htmlFor="task" className="block text-lg font-medium text-gray-700 mb-2">
                Select Your Task to Offer
              </label>
              
              {loading ? (
                <div className="flex justify-center py-4">
                  <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-orange-500"></div>
                </div>
              ) : userTasks.length === 0 ? (
                <div className="text-center py-4 bg-gray-50 rounded-md">
                  <p className="text-gray-500">You don't have any open tasks to offer.</p>
                </div>
              ) : (
                <select
                  id="task"
                  value={selectedTaskId}
                  onChange={(e) => setSelectedTaskId(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500"
                  required
                >
                  {userTasks.map(task => (
                    <option key={task.id} value={task.id}>
                      {task.title}
                    </option>
                  ))}
                </select>
              )}
              
              {selectedTaskId && userTasks.length > 0 && (
                <div className="mt-4 bg-gray-50 p-4 rounded-md">
                  {userTasks.find(t => t.id === selectedTaskId) && (
                    <>
                      <h4 className="font-medium">{userTasks.find(t => t.id === selectedTaskId).title}</h4>
                      <p className="text-sm text-gray-600 mt-1">{userTasks.find(t => t.id === selectedTaskId).description}</p>
                      <div className="mt-2 flex flex-wrap gap-2">
                        <span className="inline-block bg-gray-200 rounded-full px-3 py-1 text-xs font-semibold text-gray-700">
                          {userTasks.find(t => t.id === selectedTaskId).category}
                        </span>
                        <span className="inline-block bg-gray-200 rounded-full px-3 py-1 text-xs font-semibold text-gray-700">
                          {userTasks.find(t => t.id === selectedTaskId).estimated_duration}
                        </span>
                      </div>
                    </>
                  )}
                </div>
              )}
            </div>
            
            <div className="flex justify-end gap-3">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={submitting || loading || userTasks.length === 0}
                className="px-4 py-2 bg-orange-500 text-white rounded-md hover:bg-orange-600 flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <FaExchangeAlt />
                {submitting ? 'Offering...' : 'Offer Swap'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default SwapModal; 

