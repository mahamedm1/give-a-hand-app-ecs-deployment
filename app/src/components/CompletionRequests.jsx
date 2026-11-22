import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import supabase from '../helper/supabaseClient';
import { TASK_STATUS } from '../helper/taskStatus';
import ReviewForm from './ReviewForm';

function CompletionRequests({ userId }) {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showReviewForm, setShowReviewForm] = useState(false);
  const [reviewTarget, setReviewTarget] = useState(null);
  const [reviewTaskId, setReviewTaskId] = useState(null);
  const [processingRequestId, setProcessingRequestId] = useState(null);
  const [processing, setProcessing] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    fetchCompletionRequests();
  }, [userId]);

  const fetchCompletionRequests = async () => {
    try {
      setLoading(true);
      // Grabbing all the data in one go to avoid multiple DB calls
      const { data, error } = await supabase
        .from('task_completion_requests')
        .select(`
          id,
          task_id,
          requester_id,
          status,
          created_at,
          tasks (
            title,
            description,
            status
          ),
          requester:requester_id (
            id,
            first_name,
            last_name,
            display_name
          )
        `)
        .eq('task_owner_id', userId)
        .eq('status', 'pending')
        .order('created_at', { ascending: false });

      if (error) throw error;
      
      setRequests(data || []);
    } catch (err) {
      setError(err.message);
      console.error('Error fetching completion requests:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleRequestResponse = async (requestId, taskId, requesterId, response) => {
    // Prevent double-clicking or handling multiple requests at once
    // Had issues with users accepting multiple requests simultaneously
    if (processing) {
      return;
    }
    
    try {
      setProcessing(true);
      setProcessingRequestId(requestId);
      
      // First update the request status
      const { error: requestError } = await supabase
        .from('task_completion_requests')
        .update({ status: response })
        .eq('id', requestId);

      if (requestError) throw requestError;

      if (response === 'accepted') {
        // Mark the task as completed in the database
        const { error: taskError } = await supabase
          .from('tasks')
          .update({ status: 'completed' })
          .eq('id', taskId);

        if (taskError) throw taskError;

        // Find the accepted swap this task belongs to. Once BOTH tasks in the
        // swap are completed, the swap itself is completed.
        const { data: swaps, error: swapError } = await supabase
          .from('task_swaps')
          .select('id, sender_task_id, recipient_task_id')
          .eq('status', 'accepted')
          .or(`sender_task_id.eq.${taskId},recipient_task_id.eq.${taskId}`)
          .limit(1);
        if (swapError) throw swapError;

        const swap = swaps?.[0];
        if (swap) {
          const { data: swapTasks, error: swapTasksError } = await supabase
            .from('tasks')
            .select('id, status')
            .in('id', [swap.sender_task_id, swap.recipient_task_id]);
          if (swapTasksError) throw swapTasksError;

          const bothDone = swapTasks?.length === 2 && swapTasks.every(t => t.status === TASK_STATUS.COMPLETED);
          if (bothDone) {
            const { error: updateError } = await supabase
              .from('task_swaps')
              .update({ status: 'completed', updated_at: new Date().toISOString() })
              .eq('id', swap.id);
            if (updateError) throw updateError;
          }
        }
        
        
        setRequests(prevRequests => 
          prevRequests.filter(req => req.id !== requestId)
        );
        
        // Show the review form after accepting 
        setReviewTarget(requesterId);
        setReviewTaskId(taskId);
        setShowReviewForm(true);
      } else {
        // Rejected: the task goes back to "in progress" so it can be finished
        const { error: revertError } = await supabase
          .from('tasks')
          .update({ status: TASK_STATUS.ASSIGNED, completed_by: null, completion_requested_at: null })
          .eq('id', taskId);
        if (revertError) throw revertError;

        // Remove the rejected request from the list
        setRequests(prevRequests =>
          prevRequests.filter(req => req.id !== requestId)
        );
      }
    } catch (err) {
      setError(err.message);
      console.error('Error handling completion request:', err);
    } finally {
      setProcessingRequestId(null);
      setProcessing(false);
    }
  };
  
  // Called when a review is submitted successfully
  const handleReviewSubmitted = () => {
    setShowReviewForm(false);
    setReviewTarget(null);
    setReviewTaskId(null);
    // Check if there are still requests to handle
    if (requests.length > 0) {
      // There are still more requests to process
    } else {
      // Refresh just to be sure we're up to date
      fetchCompletionRequests();
    }
  };
  
  // Let users skip leaving a review if they want
  const handleSkipReview = () => {
    setShowReviewForm(false);
    setReviewTarget(null);
    setReviewTaskId(null);
    // Check if there are still requests to handle
    if (requests.length > 0) {
      // There are still more requests to process
    } else {
      // Refresh 
      fetchCompletionRequests();
    }
  };
  
  // Navigate to the user's profile when clicking their name
  const viewUserProfile = (userId) => {
    navigate(`/users/${userId}`);
  };

  // Show loading state while fetching
  if (loading) return <div>Loading completion requests...</div>;
  if (error) return <div className="text-red-600">Error: {error}</div>;
  
  // Show the review form after accepting a completion request
  if (showReviewForm && reviewTarget) {
    return (
      <div className="space-y-4">
        <h2 className="text-xl font-semibold">Leave a Review</h2>
        <div className="bg-orange-50 p-4 rounded-lg border border-orange-200 mb-4">
          <p className="font-medium text-orange-800">
            Task completed successfully!
          </p>
          <p className="text-orange-700 mt-1">
            Consider leaving a review for the person who completed this task.
          </p>
          {requests.length > 0 && (
            <p className="text-orange-700 mt-3 font-medium">
              Note: You have {requests.length} more completion {requests.length === 1 ? 'request' : 'requests'} waiting.
            </p>
          )}
        </div>
        
        <ReviewForm 
          targetUserId={reviewTarget} 
          taskId={reviewTaskId}
          currentUser={{ id: userId }}
          onReviewSubmitted={handleReviewSubmitted} 
        />
        
        <div className="mt-4 flex justify-end gap-4">
          <button 
            onClick={handleSkipReview}
            className="text-gray-500 hover:text-gray-700"
          >
            Skip review
          </button>
          {requests.length > 0 && (
            <button 
              onClick={() => setShowReviewForm(false)} 
              className="px-4 py-2 bg-orange-500 text-white rounded-md hover:bg-orange-600"
            >
              Return to requests
            </button>
          )}
        </div>
      </div>
    );
  }

  // Lt of requests
  return (
    <div className="space-y-4">
      <h2 className="text-xl font-semibold">Completion Requests</h2>
      {processing && (
        <div className="bg-blue-50 p-3 rounded-lg border border-blue-200 mb-4">
          <p className="text-blue-700">Processing request, please wait...</p>
        </div>
      )}
      {requests.length === 0 ? (
        <p>No pending completion requests</p>
      ) : (
        <div className="space-y-4">
          {requests.map((request) => (
            <div key={request.id} className="p-4 border rounded-lg shadow-sm">
              <div className="flex justify-between items-start">
                <div>
                  <h3 className="font-medium">{request.tasks.title}</h3>
                  <p className="text-gray-600">{request.tasks.description}</p>
                  <p className="text-sm text-gray-500">
                    Requested by: 
                    <button 
                      onClick={() => viewUserProfile(request.requester.id)}
                      className="ml-1 text-orange-500 hover:text-orange-700 hover:underline"
                      disabled={processing}
                    >
                      {request.requester.display_name || `${request.requester.first_name} ${request.requester.last_name}`}
                    </button>
                  </p>
                  <p className="text-sm text-gray-500">
                    Requested on: {new Date(request.created_at).toLocaleDateString()}
                  </p>
                </div>
                <div className="flex space-x-2">
                  <button
                    onClick={() => handleRequestResponse(request.id, request.task_id, request.requester_id, 'accepted')}
                    className={`px-3 py-1 text-white rounded ${
                      processing ? 
                        (processingRequestId === request.id ? 'bg-green-400' : 'bg-gray-400 cursor-not-allowed') : 
                        'bg-green-600 hover:bg-green-700'
                    }`}
                    disabled={processing}
                  >
                    {processingRequestId === request.id && processing ? 'Processing...' : 'Accept'}
                  </button>
                  <button
                    onClick={() => handleRequestResponse(request.id, request.task_id, request.requester_id, 'rejected')}
                    className={`px-3 py-1 text-white rounded ${
                      processing ? 
                        (processingRequestId === request.id ? 'bg-red-400' : 'bg-gray-400 cursor-not-allowed') : 
                        'bg-red-600 hover:bg-red-700'
                    }`}
                    disabled={processing}
                  >
                    {processingRequestId === request.id && processing ? 'Processing...' : 'Reject'}
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default CompletionRequests; 

