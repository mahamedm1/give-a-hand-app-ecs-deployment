import { FaBookmark, FaRegBookmark, FaCommentAlt, FaExchangeAlt } from 'react-icons/fa';
import { useState } from 'react';
import { Link } from 'react-router-dom';
import SwapModal from './SwapModal';
import  supabase  from '../helper/supabaseClient';
import CommunityBadge from './CommunityBadge';
import { formatDuration } from '../helper/formatDuration';
import { TASK_STATUS, requestTaskCompletion } from '../helper/taskStatus';

const TaskCard = ({ task, toggleBookmark, currentUser, openChat, isActiveTask }) => {
  const [showSwapModal, setShowSwapModal] = useState(false);
  const formattedDate = new Date(task.created_at).toLocaleDateString();

  const handleSwapClick = () => {
    setShowSwapModal(true);
  };

  const handleTaskCompleted = async (taskId) => {
    try {
      const { data: authData } = await supabase.auth.getUser();
      if (task.status !== TASK_STATUS.ASSIGNED) {
        alert('Only tasks that are in progress can be marked as completed.');
        return;
      }
      await requestTaskCompletion({
        taskId,
        taskOwnerId: task.user_id,
        currentUserId: authData?.user?.id,
      });
      alert('Task completion request sent. Waiting for the task owner to confirm.');
    } catch (err) {
      console.error('Error completing task:', err);
      alert(err.message || 'Failed to send task completion request. Please try again.');
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-md overflow-hidden hover:shadow-lg transition-shadow">
      <div className="p-6">
        <div className="flex justify-between items-start">
          <h3 className="text-xl font-bold text-gray-800">
            <Link to={`/tasks/${task.id}`} className="hover:text-orange-500 hover:underline">
              {task.title}
            </Link>
          </h3>
          {toggleBookmark && (
            <button
              onClick={() => toggleBookmark(task.id)}
              className="text-orange-500 hover:text-orange-600"
            >
              {task.isBookmarked ? <FaBookmark /> : <FaRegBookmark />}
            </button>
          )}
        </div>

        <div className="mt-2">
          <span className="inline-block bg-gray-100 rounded-full px-3 py-1 text-sm font-semibold text-gray-700 mr-2">
            {task.category}
          </span>
            <CommunityBadge community={task.communities} />
        </div>

        <p className="mt-3 text-gray-600 line-clamp-3">{task.description}</p>

        <div className="mt-4 flex justify-between items-center text-sm text-gray-500">
          <div>
            <p>
              Posted by:{' '}
              {task.user_id ? (
                <Link 
                  to={`/users/${task.user_id}`}
                  className="text-orange-500 hover:text-orange-700 hover:underline"
                >
                  {task.users?.display_name || 'Anonymous'}
                </Link>
              ) : (
                task.users?.display_name || 'Anonymous'
              )}
            </p>
            <p>Posted on: {formattedDate}</p>
          </div>

          <div className="flex items-center">
            <p className="mr-3">Duration: {formatDuration(task.estimated_duration, 'Not specified')}</p>
            {!isActiveTask && currentUser && currentUser.id !== task.user_id && (
              <button
                onClick={handleSwapClick}
                className="bg-blue-500 text-white p-2 rounded-full hover:bg-blue-600 mr-2"
                title="Offer to swap tasks"
              >
                <FaExchangeAlt />
              </button>
            )}
            {openChat && (
              <button
                onClick={() => openChat(task.user_id, task.users?.display_name)}
                className="bg-orange-500 text-white p-2 rounded-full hover:bg-orange-600"
              >
                <FaCommentAlt />
              </button>
            )}
            {isActiveTask && currentUser && currentUser.id !== task.user_id && (
              <button
                onClick={() => handleTaskCompleted(task.id)}
                className="bg-green-500 text-white px-4 py-2 rounded hover:bg-green-600 ml-2"
                title="Mark task as completed"
              >
                Mark as Completed
              </button>
            )}
            {!isActiveTask && task.status === 'assigned' &&
            currentUser &&
            currentUser.id !== task.user_id && (
              <button
                onClick={() => handleTaskCompleted(task.id)}
                className="bg-green-500 text-white px-4 py-2 rounded hover:bg-green-600 ml-2"
                title="Mark task as completed"
              >
                Mark as Completed
              </button>
            )}
            {task.status === 'completion_requested' && (
              <span className="bg-yellow-100 text-yellow-800 px-3 py-1 rounded-full text-sm">
                Awaiting Confirmation
              </span>
            )}
            {task.status === 'completed' && (
              <span className="bg-green-100 text-green-800 px-3 py-1 rounded-full text-sm">
                Completed
              </span>
            )}
          </div>
        </div>
      </div>

      {showSwapModal && (
        <SwapModal
          isOpen={showSwapModal}
          onClose={() => setShowSwapModal(false)}
          recipientTask={task}
          recipientId={task.user_id}
        />
      )}
    </div>
  );
};

export default TaskCard;