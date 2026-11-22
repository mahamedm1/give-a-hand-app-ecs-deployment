import React, { useState, useEffect } from 'react';
import supabase from '../helper/supabaseClient';
import SwapStatusBadge from './SwapStatusBadge';
import ChatModal from './ChatModal';
import { FaExchangeAlt, FaUser, FaCheck, FaTimes, FaCommentAlt, FaChevronDown, FaChevronUp, FaCalendarAlt, FaTag } from 'react-icons/fa';

const SwapRequests = ({ currentUserId }) => {
  const [swaps, setSwaps] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState('received'); // 'received', 'sent', or 'completion'
  const [newSwaps, setNewSwaps] = useState([]);
  const [viewedSwaps, setViewedSwaps] = useState([]);
  const [expandedSwap, setExpandedSwap] = useState(null);
  const [showChatModal, setShowChatModal] = useState(false);
  const [chatRecipient, setChatRecipient] = useState(null);

  // Load swap requests
  const loadSwapRequests = async () => {

    if (!currentUserId) {
  console.warn("No currentUserId available yet. Skipping fetch.");
  return;
}

    try {
      setLoading(true);
      setError(null);

      console.log("Fetching swap requests for user:", currentUserId);
      
      // First, check if the task_swaps table exists
      const { error: tableError } = await supabase
        .from('task_swaps')
        .select('id')
        .limit(1);
        
      if (tableError) {
        console.error("Table error:", tableError);
        setError(`Failed to access task_swaps table: ${tableError.message}`);
        setLoading(false);
        return;
      }
      
      // Get user profiles first
      const { data: userProfiles, error: userError } = await supabase
        .from('users')
        .select('id, display_name, profile_picture_url');
        
      if (userError) {
        console.error("User profiles error:", userError);
        setError(`Failed to load user profiles: ${userError.message}`);
        setLoading(false);
        return;
      }
      
      // Create a map of user profiles
      const userMap = {};
      userProfiles?.forEach(user => {
        userMap[user.id] = user;
      });
      
      // Get tasks 
      const { data: tasks, error: tasksError } = await supabase
        .from('tasks')
        .select('id, title, description, category, estimated_duration');
        
      if (tasksError) {
        console.error("Tasks error:", tasksError);
        setError(`Failed to load tasks: ${tasksError.message}`);
        setLoading(false);
        return;
      }
      
      // Create a map of tasks
      const taskMap = {};
      tasks?.forEach(task => {
        taskMap[task.id] = task;
      });

      // Determine which swaps to fetch based on active tab
      let query = supabase
        .from('task_swaps')
        .select('*')
        .order('created_at', { ascending: false });

      if (activeTab === 'received') {
        query = query.eq('recipient_id', currentUserId)
                     .not('status', 'in', '(rejected,cancelled)'); // Hide declined and withdrawn offers
      } else {
        query = query.eq('sender_id', currentUserId);
      }

      const { data, error } = await query;

      if (error) {
        console.error("Swap requests error:", error);
        throw error;
      }
      
      // Fill swap data with user and task information
      const enrichedSwaps = data?.map(swap => {
        return {
          ...swap,
          sender: userMap[swap.sender_id] || { id: swap.sender_id, display_name: 'Unknown User' },
          recipient: userMap[swap.recipient_id] || { id: swap.recipient_id, display_name: 'Unknown User' },
          sender_task: taskMap[swap.sender_task_id] || { id: swap.sender_task_id, title: 'Unknown Task' },
          recipient_task: taskMap[swap.recipient_task_id] || { id: swap.recipient_task_id, title: 'Unknown Task' }
        };
      }) || [];

      console.log("Loaded swap requests:", enrichedSwaps);
      setSwaps(enrichedSwaps);
      
      // Find new pending swap requests that haven't been viewed
      if (activeTab === 'received') {
        const pendingSwaps = enrichedSwaps.filter(swap => 
          swap.status === 'pending' && !viewedSwaps.includes(swap.id)
        );
        setNewSwaps(pendingSwaps.map(swap => swap.id));
      }
    } catch (err) {
      console.error('Error loading swap requests:', err);
      setError('Failed to load swap requests: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  // Handle status change
  const handleStatusChange = async (swapId, newStatus) => {
    try {
      const { error } = await supabase
        .from('task_swaps')
        .update({ status: newStatus })
        .eq('id', swapId);
      
      if (error) throw error;

      // The database handles the knock-on effects (see supabase/swap_rules.sql):
      // accepting assigns both tasks and declines competing offers; cancelling
      // an accepted swap reopens both tasks.
      setNewSwaps(prev => prev.filter(id => id !== swapId));
      if (!viewedSwaps.includes(swapId)) {
        setViewedSwaps(prev => [...prev, swapId]);
      }

      // Reload so declined/cancelled offers and task statuses are up to date
      loadSwapRequests();
    } catch (err) {
      console.error('Error updating swap status:', err);
      alert(err.message || 'Could not update this swap. Please try again.');
    }
  };

  // Handle chat with user
  const handleChat = (user) => {
    setChatRecipient(user);
    setShowChatModal(true);
  };

  // Toggle expanded swap view
  const toggleExpandSwap = (swapId) => {
    // Mark as viewed when expanded
    if (!viewedSwaps.includes(swapId)) {
      setViewedSwaps(prev => [...prev, swapId]);
      setNewSwaps(prev => prev.filter(id => id !== swapId));
    }
    
    if (expandedSwap === swapId) {
      setExpandedSwap(null);
    } else {
      setExpandedSwap(swapId);
    }
  };

  // Set up real-time subscription
  useEffect(() => {
    loadSwapRequests();
    
    // Subscribe to changes in task_swaps table
    const channel = supabase
      .channel('task_swaps_changes')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'task_swaps',
          filter: activeTab === 'received' ? `recipient_id=eq.${currentUserId}` : `sender_id=eq.${currentUserId}`
        },
        async (payload) => {
          if (payload.new) {
            
            try {
              // Get sender data
              const { data: senderData } = await supabase
                .from('users')
                .select('id, display_name, profile_picture_url')
                .eq('id', payload.new.sender_id)
                .single();
                
              // Get recipient data
              const { data: recipientData } = await supabase
                .from('users')
                .select('id, display_name, profile_picture_url')
                .eq('id', payload.new.recipient_id)
                .single();
                
              // Get sender task data
              const { data: senderTaskData } = await supabase
                .from('tasks')
                .select('id, title, description, category, estimated_duration')
                .eq('id', payload.new.sender_task_id)
                .single();
                
              // Get recipient task data
              const { data: recipientTaskData } = await supabase
                .from('tasks')
                .select('id, title, description, category, estimated_duration')
                .eq('id', payload.new.recipient_task_id)
                .single();
                
              // Enrich the swap data
              const enrichedSwap = {
                ...payload.new,
                sender: senderData || { id: payload.new.sender_id, display_name: 'Unknown User' },
                recipient: recipientData || { id: payload.new.recipient_id, display_name: 'Unknown User' },
                sender_task: senderTaskData || { id: payload.new.sender_task_id, title: 'Unknown Task' },
                recipient_task: recipientTaskData || { id: payload.new.recipient_task_id, title: 'Unknown Task' }
              };
              
              // Only adds to the list if it's not rejected (for received tab)
              if (!(activeTab === 'received' && payload.new.status === 'rejected')) {
                // Add the new enriched swap to the list
                setSwaps(prev => [enrichedSwap, ...prev]);
              
                if (payload.new.status === 'pending' && activeTab === 'received') {
                  setNewSwaps(prev => [...prev, payload.new.id]);
                }
              }
            } catch (err) {
              console.error('Error enriching real-time swap data:', err);
            }
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'task_swaps',
          filter: activeTab === 'received' ? `recipient_id=eq.${currentUserId}` : `sender_id=eq.${currentUserId}`
        },
        (payload) => {
          // If status was changed to rejected, remove from list for recipients
          if (payload.new.status === 'rejected' && activeTab === 'received') {
            setSwaps(prev => prev.filter(swap => swap.id !== payload.new.id));
          } else {
            setSwaps(prev => 
              prev.map(swap => swap.id === payload.new.id ? { ...swap, ...payload.new, status: payload.new.status } : swap)
            );
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [currentUserId, activeTab]);

  // Reset viewedSwaps when changing tabs
  useEffect(() => {
    setViewedSwaps([]);
    setNewSwaps([]);
  }, [activeTab]);

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleString();
  };

  return (
    <div className="bg-white rounded-lg shadow-md overflow-hidden">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-400 to-blue-600 px-6 py-4">
        <h1 className="text-2xl font-bold text-white flex items-center">
          <FaExchangeAlt className="mr-2" />
          Task Swap Requests
        </h1>
      </div>
      
      {/* Tabs */}
      <div className="border-b border-gray-200">
        <nav className="flex">
          <button
            onClick={() => setActiveTab('received')}
            className={`px-6 py-3 text-sm font-medium flex items-center ${
              activeTab === 'received'
                ? 'border-b-2 border-blue-500 text-blue-600'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            Received
            {activeTab !== 'received' && newSwaps.length > 0 && (
              <span className="ml-2 bg-blue-500 text-white text-xs px-2 py-0.5 rounded-full">
                {newSwaps.length}
              </span>
            )}
          </button>
          <button
            onClick={() => setActiveTab('sent')}
            className={`px-6 py-3 text-sm font-medium ${
              activeTab === 'sent'
                ? 'border-b-2 border-blue-500 text-blue-600'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            Sent
          </button>
        </nav>
      </div>

      {error && (
        <div className="p-6 text-center text-red-500">
          <p>{error}</p>
        </div>
      )}

      {loading ? (
        <div className="p-6 text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500 mx-auto"></div>
        </div>
      ) : swaps.length === 0 ? (
        <div className="p-6 text-center text-gray-500">
          <p>No swap requests found.</p>
        </div>
      ) : (
        <div className="divide-y divide-gray-200">
          {swaps.map((swap) => {
            const isReceived = swap.recipient_id === currentUserId;
            const otherUser = isReceived ? swap.sender : swap.recipient;
            const offeredTask = isReceived ? swap.sender_task : swap.recipient_task;
            const requestedTask = isReceived ? swap.recipient_task : swap.sender_task;
            const isPending = swap.status === 'pending';
            const isNew = newSwaps.includes(swap.id);
            const isExpanded = expandedSwap === swap.id;
            
            return (
              <div 
                key={swap.id} 
                className={`hover:bg-gray-50 transition-all duration-300 ${
                  isPending && isReceived && isNew ? 'bg-blue-50 border-l-4 border-blue-500' : ''
                }`}
                onClick={() => {
                  // Mark as viewed when clicking anywhere on the swap
                  if (!viewedSwaps.includes(swap.id)) {
                    setViewedSwaps(prev => [...prev, swap.id]);
                    setNewSwaps(prev => prev.filter(id => id !== swap.id));
                  }
                }}
              >
                {/* Main swap row */}
                <div className="p-4">
                  <div className="flex items-start">
                    <div className="flex-shrink-0 mr-4 relative">
                      {otherUser?.profile_picture_url ? (
                        <img
                          src={otherUser.profile_picture_url}
                          alt={otherUser.display_name}
                          className="w-10 h-10 rounded-full object-cover"
                        />
                      ) : (
                        <FaUser className="w-10 h-10 text-gray-400" />
                      )}
                      {isPending && isReceived && isNew && (
                        <span className="absolute -top-1 -right-1 bg-blue-500 rounded-full w-3 h-3"></span>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex justify-between items-start">
                        <div>
                          <p className={`font-medium ${isPending && isReceived && isNew ? 'text-blue-700 font-bold' : 'text-gray-800'}`}>
                            {otherUser?.display_name || 'Unknown User'}
                          </p>
                          <p className={`text-sm ${isPending && isReceived && isNew ? 'text-gray-800 font-medium' : 'text-gray-500'}`}>
                            {isReceived ? 'Wants to swap their task:' : 'You offered to swap your task:'}
                          </p>
                          <p className="font-medium text-gray-800">
                            "{offeredTask.title}"
                          </p>
                        </div>
                        <div className="flex space-x-2">
                          <button
                            onClick={(e) => {
                              e.stopPropagation(); 
                              handleChat(otherUser);
                            }}
                            className="text-blue-500 hover:text-blue-600 bg-blue-100 p-1 rounded-full"
                            title="Chat with user"
                          >
                            <FaCommentAlt />
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation(); 
                              toggleExpandSwap(swap.id);
                            }}
                            className="text-gray-500 hover:text-gray-600 bg-gray-100 p-1 rounded-full"
                            title={isExpanded ? "Hide details" : "Show details"}
                          >
                            {isExpanded ? <FaChevronUp /> : <FaChevronDown />}
                          </button>
                        </div>
                      </div>
                      <div className="flex items-center justify-between mt-2">
                        <p className="text-xs text-gray-400">
                          {formatDate(swap.created_at)}
                        </p>
                        <SwapStatusBadge status={swap.status} />
                      </div>
                    </div>
                  </div>
                </div>
                
                {/* Expanded Task Details */}
                {isExpanded && (
                  <div className="px-4 pb-4 pt-0">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-gray-50 p-4 rounded-lg">
                      {/* Offered Task (What they're offering) */}
                      <div className="bg-white p-4 rounded-lg shadow">
                        <h3 className="font-bold text-gray-800 mb-2 flex items-center">
                          <FaExchangeAlt className="mr-2 text-blue-500" />
                          {isReceived ? "Their Task" : "Your Task"}
                        </h3>
                        <div className="mb-3">
                          <h4 className="font-semibold text-gray-700">{offeredTask.title}</h4>
                          <p className="text-sm text-gray-600 mt-1">{offeredTask.description}</p>
                        </div>
                        <div className="flex flex-wrap gap-2 mb-3">
                          <span className="inline-flex items-center text-xs bg-gray-100 px-2 py-1 rounded">
                            <FaTag className="mr-1 text-gray-500" />
                            {offeredTask.category}
                          </span>
                          <span className="inline-flex items-center text-xs bg-gray-100 px-2 py-1 rounded">
                            <FaCalendarAlt className="mr-1 text-gray-500" />
                            {offeredTask.estimated_duration || 'Not specified'}
                          </span>
                        </div>
                      </div>
                      
                      {/* Requested Task (What they want) */}
                      <div className="bg-white p-4 rounded-lg shadow">
                        <h3 className="font-bold text-gray-800 mb-2 flex items-center">
                          <FaExchangeAlt className="mr-2 text-orange-500" />
                          {isReceived ? "Your Task" : "Their Task"}
                        </h3>
                        <div className="mb-3">
                          <h4 className="font-semibold text-gray-700">{requestedTask.title}</h4>
                          <p className="text-sm text-gray-600 mt-1">{requestedTask.description}</p>
                        </div>
                        <div className="flex flex-wrap gap-2 mb-3">
                          <span className="inline-flex items-center text-xs bg-gray-100 px-2 py-1 rounded">
                            <FaTag className="mr-1 text-gray-500" />
                            {requestedTask.category}
                          </span>
                          <span className="inline-flex items-center text-xs bg-gray-100 px-2 py-1 rounded">
                            <FaCalendarAlt className="mr-1 text-gray-500" />
                            {requestedTask.estimated_duration || 'Not specified'}
                          </span>
                        </div>
                      </div>
                    </div>
                    
                    {/* Accept/Reject buttons for pending received requests */}
                    {isPending && isReceived && (
                      <div className="flex justify-end mt-4 space-x-3">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleStatusChange(swap.id, 'rejected');
                          }}
                          className="px-4 py-2 bg-red-100 text-red-700 rounded-md hover:bg-red-200 transition-colors flex items-center"
                        >
                          <FaTimes className="mr-2" />
                          Reject
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleStatusChange(swap.id, 'accepted');
                          }}
                          className="px-4 py-2 bg-green-100 text-green-700 rounded-md hover:bg-green-200 transition-colors flex items-center"
                        >
                          <FaCheck className="mr-2" />
                          Accept
                        </button>
                      </div>
                    )}

                    {/* Sender can withdraw an offer that hasn't been answered yet */}
                    {isPending && !isReceived && (
                      <div className="flex justify-end mt-4">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            if (window.confirm('Withdraw this swap offer?')) {
                              handleStatusChange(swap.id, 'cancelled');
                            }
                          }}
                          className="px-4 py-2 bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200 transition-colors flex items-center"
                        >
                          <FaTimes className="mr-2" />
                          Withdraw offer
                        </button>
                      </div>
                    )}

                    {/* Either person can call off an accepted swap; both tasks reopen */}
                    {swap.status === 'accepted' && (
                      <div className="flex justify-end mt-4">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            if (window.confirm('Cancel this swap? Both tasks will be reopened for other people.')) {
                              handleStatusChange(swap.id, 'cancelled');
                            }
                          }}
                          className="px-4 py-2 bg-red-100 text-red-700 rounded-md hover:bg-red-200 transition-colors flex items-center"
                        >
                          <FaTimes className="mr-2" />
                          Cancel swap
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
      
      {/* Chat Modal */}
      {showChatModal && chatRecipient && (
        <ChatModal
          isOpen={showChatModal}
          onClose={() => setShowChatModal(false)}
          recipientId={chatRecipient.id}
          recipientName={chatRecipient.display_name}
        />
      )}
    </div>
  );
};

export default SwapRequests; 