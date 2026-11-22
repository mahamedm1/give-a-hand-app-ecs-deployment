import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import {
  FaUserCircle, FaStar, FaBookmark, FaRegBookmark, FaCommentAlt,
  FaExchangeAlt, FaCalendarAlt, FaClock, FaMapMarkerAlt, FaArrowLeft, FaFlag,
} from 'react-icons/fa';
import supabase from '../helper/supabaseClient';
import CommunityBadge from '../components/CommunityBadge';
import { formatDuration } from '../helper/formatDuration';
import { TASK_STATUS, STATUS_LABELS } from '../helper/taskStatus';
import ChatModal from '../components/ChatModal';
import SwapModal from '../components/SwapModal';
import TaskCompletionButton from '../components/TaskCompletionButton';
import ReportModal from '../components/ReportModal';

const STATUS_STYLES = {
  open: 'bg-green-100 text-green-800',
  assigned: 'bg-blue-100 text-blue-800',
  completion_requested: 'bg-yellow-100 text-yellow-800',
  completed: 'bg-gray-200 text-gray-700',
};

function TaskDetail() {
  const { taskId } = useParams();
  const [task, setTask] = useState(null);
  const [currentUser, setCurrentUser] = useState(null);
  const [isBookmarked, setIsBookmarked] = useState(false);
  const [swapPartnerId, setSwapPartnerId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [chatOpen, setChatOpen] = useState(false);
  const [swapOpen, setSwapOpen] = useState(false);
  const [reportOpen, setReportOpen] = useState(false);

  const loadTask = async () => {
    try {
      setLoading(true);
      const { data: authData } = await supabase.auth.getUser();
      const me = authData?.user || null;
      setCurrentUser(me);

      const { data, error } = await supabase
        .from('tasks')
        .select('*, users(id, display_name, city, profile_picture_url, average_rating, reviews_count), communities(id, name)')
        .eq('id', taskId)
        .maybeSingle();
      if (error) throw error;
      if (!data) {
        setNotFound(true);
        return;
      }
      setTask(data);

      if (me) {
        // Saved?
        const { data: saved } = await supabase
          .from('saved_tasks')
          .select('id')
          .eq('user_id', me.id)
          .eq('task_id', taskId)
          .limit(1);
        setIsBookmarked(Boolean(saved?.length));

        // Who is doing this task? (the other person in the accepted swap)
        const { data: swaps } = await supabase
          .from('task_swaps')
          .select('sender_id, recipient_id, sender_task_id, recipient_task_id')
          .in('status', ['accepted', 'completed'])
          .or(`sender_task_id.eq.${taskId},recipient_task_id.eq.${taskId}`)
          .limit(1);
        const swap = swaps?.[0];
        if (swap) {
          setSwapPartnerId(swap.sender_id === data.user_id ? swap.recipient_id : swap.sender_id);
        }
      }
    } catch (err) {
      console.error('Error loading task:', err);
      setNotFound(true);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadTask();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [taskId]);

  const toggleBookmark = async () => {
    if (!currentUser) return;
    try {
      if (isBookmarked) {
        const { error } = await supabase
          .from('saved_tasks')
          .delete()
          .eq('user_id', currentUser.id)
          .eq('task_id', taskId);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('saved_tasks')
          .insert({ user_id: currentUser.id, task_id: taskId });
        if (error) throw error;
      }
      setIsBookmarked(!isBookmarked);
    } catch (err) {
      console.error('Error saving task:', err);
      alert('Could not update saved tasks. Please try again.');
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-96">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-orange-500"></div>
      </div>
    );
  }

  if (notFound || !task) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-3xl mx-auto bg-white rounded-lg shadow-md p-6 text-center">
          <h2 className="text-xl font-semibold text-red-500">Task not found</h2>
          <p className="mt-2 text-gray-600">This task doesn't exist or has been removed.</p>
          <Link to="/tasks" className="mt-4 inline-block text-orange-500 hover:text-orange-600">
            Browse tasks
          </Link>
        </div>
      </div>
    );
  }

  const poster = task.users;
  const isOwner = currentUser?.id === task.user_id;
  const isHelper = currentUser?.id && currentUser.id === swapPartnerId;
  const status = task.status || TASK_STATUS.OPEN;

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-3xl mx-auto">
        <Link to="/tasks" className="inline-flex items-center gap-2 text-gray-600 hover:text-orange-500 mb-4">
          <FaArrowLeft /> Back to tasks
        </Link>

        <div className="bg-white rounded-lg shadow-md overflow-hidden">
          {/* Title & status */}
          <div className="p-6 border-b border-gray-100">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <h1 className="text-2xl font-bold text-gray-800">{task.title}</h1>
              <span className={`px-3 py-1 rounded-full text-sm font-medium ${STATUS_STYLES[status] || STATUS_STYLES.open}`}>
                {STATUS_LABELS[status] || status}
              </span>
            </div>
            <div className="flex flex-wrap gap-2 mt-3">
              <span className="inline-block bg-gray-100 rounded-full px-3 py-1 text-sm font-semibold text-gray-700">
                {task.category}
              </span>
              <CommunityBadge community={task.communities} />
            </div>
          </div>

          {/* Description */}
          <div className="p-6">
            <h2 className="text-sm font-semibold uppercase text-gray-500 mb-2">Description</h2>
            <p className="text-gray-700 whitespace-pre-line">{task.description}</p>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-6 text-sm">
              <div className="flex items-center gap-2 text-gray-700">
                <FaCalendarAlt className="text-orange-500" />
                <span>Needed by {task.completion_date ? new Date(task.completion_date).toLocaleDateString() : 'any time'}</span>
              </div>
              <div className="flex items-center gap-2 text-gray-700">
                <FaClock className="text-orange-500" />
                <span>{formatDuration(task.estimated_duration, 'Duration flexible')}</span>
              </div>
              <div className="flex items-center gap-2 text-gray-700">
                <FaMapMarkerAlt className="text-orange-500" />
                <span>{poster?.city || 'Location not specified'}</span>
              </div>
            </div>
            <p className="mt-4 text-xs text-gray-500">Posted {new Date(task.created_at).toLocaleDateString()}</p>
          </div>

          {/* Poster */}
          <div className="p-6 bg-gray-50 border-t border-gray-100 flex flex-wrap items-center gap-4">
            <Link to={`/users/${task.user_id}`} className="flex items-center gap-3 group">
              {poster?.profile_picture_url ? (
                <img src={poster.profile_picture_url} alt={poster.display_name || 'User'} className="w-12 h-12 rounded-full object-cover" />
              ) : (
                <FaUserCircle className="w-12 h-12 text-gray-400" />
              )}
              <div>
                <p className="font-medium text-gray-800 group-hover:text-orange-500 group-hover:underline">
                  {poster?.display_name || 'Anonymous'}
                </p>
                {poster?.reviews_count > 0 ? (
                  <p className="text-sm text-gray-500 flex items-center gap-1">
                    <FaStar className="text-yellow-400" />
                    {Number(poster.average_rating).toFixed(1)} ({poster.reviews_count} reviews)
                  </p>
                ) : (
                  <p className="text-sm text-gray-500">No reviews yet</p>
                )}
              </div>
            </Link>

            {/* Actions */}
            <div className="ml-auto flex flex-wrap gap-2">
              {!currentUser && (
                <Link to="/login" className="bg-orange-500 text-white px-4 py-2 rounded-md hover:bg-orange-600">
                  Log in to help with this task
                </Link>
              )}

              {currentUser && !isOwner && (
                <>
                  <button
                    onClick={() => setChatOpen(true)}
                    className="bg-orange-500 text-white px-4 py-2 rounded-md hover:bg-orange-600 flex items-center gap-2"
                  >
                    <FaCommentAlt /> Message
                  </button>
                  {status === TASK_STATUS.OPEN && (
                    <button
                      onClick={() => setSwapOpen(true)}
                      className="bg-blue-500 text-white px-4 py-2 rounded-md hover:bg-blue-600 flex items-center gap-2"
                    >
                      <FaExchangeAlt /> Offer swap
                    </button>
                  )}
                  <button
                    onClick={toggleBookmark}
                    className="border border-orange-500 text-orange-500 px-4 py-2 rounded-md hover:bg-orange-50 flex items-center gap-2"
                  >
                    {isBookmarked ? <FaBookmark /> : <FaRegBookmark />}
                    {isBookmarked ? 'Saved' : 'Save'}
                  </button>
                </>
              )}

              {isHelper && status === TASK_STATUS.ASSIGNED && (
                <TaskCompletionButton
                  taskId={task.id}
                  taskOwnerId={task.user_id}
                  currentUserId={currentUser.id}
                  onRequested={loadTask}
                />
              )}

              {isOwner && status === TASK_STATUS.OPEN && (
                <Link
                  to={`/tasks/${task.id}/edit`}
                  className="border border-orange-500 text-orange-500 px-4 py-2 rounded-md hover:bg-orange-50"
                >
                  Edit task
                </Link>
              )}
              {isOwner && (
                <span className="text-sm text-gray-600 self-center">
                  This is your task.{' '}
                  <Link to="/profile" className="text-orange-500 hover:underline">Manage it on your profile</Link>
                </span>
              )}
              {currentUser && !isOwner && (
                <button
                  onClick={() => setReportOpen(true)}
                  className="text-sm text-gray-500 hover:text-red-600 self-center flex items-center gap-1"
                >
                  <FaFlag /> Report
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {chatOpen && (
        <ChatModal
          isOpen={chatOpen}
          onClose={() => setChatOpen(false)}
          recipientId={task.user_id}
          recipientName={poster?.display_name || 'User'}
        />
      )}
      <ReportModal
        isOpen={reportOpen}
        onClose={() => setReportOpen(false)}
        currentUserId={currentUser?.id}
        reportedUserId={task.user_id}
        reportedName={poster?.display_name}
        taskId={task.id}
      />
      {swapOpen && (
        <SwapModal
          isOpen={swapOpen}
          onClose={() => setSwapOpen(false)}
          recipientTask={task}
          recipientId={task.user_id}
        />
      )}
    </div>
  );
}

export default TaskDetail;
