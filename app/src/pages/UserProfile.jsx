import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import supabase from '../helper/supabaseClient';
import { PUBLIC_USER_FIELDS } from '../helper/userFields';
import { FaUserCircle, FaCommentAlt, FaStar, FaRegStar, FaBan, FaFlag } from 'react-icons/fa';
import TaskCard from '../components/TaskCard';
import ReviewsList from '../components/ReviewsList';
import ReviewForm from '../components/ReviewForm';
import ChatModal from '../components/ChatModal';
import ReportModal from '../components/ReportModal';

function UserProfile() {
  const { userId } = useParams();
  const [userProfile, setUserProfile] = useState(null);
  const [userTasks, setUserTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [currentUser, setCurrentUser] = useState(null);
  const [chatOpen, setChatOpen] = useState(false);
  const [chatRecipient, setChatRecipient] = useState(null);
  const [completedTasksCount, setCompletedTasksCount] = useState(0);
  const [tasksPostedCount, setTasksPostedCount] = useState(0);
  const [showReviewForm, setShowReviewForm] = useState(false);
  const [activeTab, setActiveTab] = useState('tasks');
  const [canReview, setCanReview] = useState(false);
  const [reviewRefreshTrigger, setReviewRefreshTrigger] = useState(0);
  const [isBlocked, setIsBlocked] = useState(false);
  const [blockBusy, setBlockBusy] = useState(false);
  const [reportOpen, setReportOpen] = useState(false);

  // Have I blocked this person?
  useEffect(() => {
    const checkBlock = async () => {
      const { data: authData } = await supabase.auth.getUser();
      if (!authData?.user || authData.user.id === userId) return;
      const { data } = await supabase
        .from('user_blocks')
        .select('blocked_id')
        .eq('blocker_id', authData.user.id)
        .eq('blocked_id', userId);
      setIsBlocked(Boolean(data?.length));
    };
    checkBlock();
  }, [userId]);

  const toggleBlock = async () => {
    if (!currentUser) return;
    if (!isBlocked && !window.confirm("Block this person? They won't be able to message you or send you swap offers.")) return;
    setBlockBusy(true);
    const { error: blockError } = isBlocked
      ? await supabase.from('user_blocks').delete().eq('blocker_id', currentUser.id).eq('blocked_id', userId)
      : await supabase.from('user_blocks').insert({ blocker_id: currentUser.id, blocked_id: userId });
    setBlockBusy(false);
    if (blockError) {
      alert(blockError.message || 'Could not update block.');
      return;
    }
    setIsBlocked(!isBlocked);
  };

  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true);
        
        // Get current user
        const { data: authData } = await supabase.auth.getUser();
        setCurrentUser(authData.user);
        
        // Get user profile
        const { data: profileData, error: profileError } = await supabase
          .from('users')
          .select(PUBLIC_USER_FIELDS)
          .eq('id', userId)
          .maybeSingle();

        if (profileError) throw profileError;
        setUserProfile(profileData);
        if (!profileData) return; // genuinely no such user

        // Everything below is extra detail: if any of it fails, still show
        // the profile (and the Send Message button) instead of "User not found".
        // First, get all tasks that are in active swaps to exclude them
        const { data: activeSwaps, error: swapsError } = await supabase
          .from('task_swaps')
          .select('sender_task_id, recipient_task_id')
          .eq('status', 'accepted');

        if (swapsError) console.error('Error loading swaps for profile:', swapsError);
        
        // Create an array of task IDs that are in active swaps
        const swappedTaskIds = [];
        activeSwaps?.forEach(swap => {
          swappedTaskIds.push(swap.sender_task_id);
          swappedTaskIds.push(swap.recipient_task_id);
        });
        
        // Get user's tasks, excluding those in active swaps
        let query = supabase
          .from('tasks')
          .select('*, users(display_name), communities(id, name)')
          .eq('user_id', userId)
          .eq('status', 'open')
          .order('created_at', { ascending: false });
        
        // If there are swapped tasks, exclude them
        if (swappedTaskIds.length > 0) {
          query = query.not('id', 'in', `(${swappedTaskIds.join(',')})`);
        }
        
        const { data: tasksData, error: tasksError } = await query;
          
        if (tasksError) console.error('Error loading user tasks:', tasksError);
        setUserTasks(tasksData || []);
        
        // Count every task this user has posted (any status)
        
        const { count: postedCount } = await supabase
        
          .from('tasks')
        
          .select('id', { count: 'exact', head: true })
        
          .eq('user_id', userId);
        
        setTasksPostedCount(postedCount || 0);

        
        // Fetch completed tasks count
        const { data: completedTasksData, error: completedTasksError } = await supabase
          .from('task_completion_requests')
          .select('task_id')
          .eq('requester_id', userId)
          .eq('status', 'accepted');

        if (completedTasksError) console.error('Error loading completed tasks:', completedTasksError);
        setCompletedTasksCount(completedTasksData?.length || 0);

        // Check if the current user has interacted with this user
        if (authData.user) {
          const { data: interactionData, error: interactionError } = await supabase
            .from('task_swaps')
            .select('id')
            .or(`and(sender_id.eq.${authData.user.id},recipient_id.eq.${userId}),and(sender_id.eq.${userId},recipient_id.eq.${authData.user.id})`)
            .eq('status', 'accepted')
            .limit(1);
            
          if (!interactionError && interactionData.length > 0) {
            setCanReview(true);
          }
          
          // Also check task completion requests
          const { data: completionData, error: completionError } = await supabase
            .from('task_completion_requests')
            .select('id')
            .or(`and(requester_id.eq.${authData.user.id},task_owner_id.eq.${userId}),and(requester_id.eq.${userId},task_owner_id.eq.${authData.user.id})`)
            .eq('status', 'accepted')
            .limit(1);
            
          if (!completionError && completionData.length > 0) {
            setCanReview(true);
          }
        }
        
      } catch (err) {
        console.error('Error loading user profile:', err);
        setError('Failed to load user profile');
      } finally {
        setLoading(false);
      }
    };
    
    if (userId) {
      loadData();
    }
  }, [userId]);

  const openChat = (userId, displayName) => {
    if (!currentUser || userId === currentUser.id) return;
    setChatRecipient({ id: userId, name: displayName || 'User' });
    setChatOpen(true);
  };
  
  const handleReviewSubmitted = async () => {
    try {
      // Reload all user data for the viewed profile
      const loadData = async () => {
        try {
          // Get user profile with updated data
          const { data: profileData, error: profileError } = await supabase
            .from('users')
            .select(PUBLIC_USER_FIELDS)
            .eq('id', userId)
            .single();
            
          if (profileError) throw profileError;
          setUserProfile(profileData);
          
          // Fetch completed tasks count
          const { data: completedTasksData, error: completedTasksError } = await supabase
            .from('task_completion_requests')
            .select('task_id')
            .eq('requester_id', userId)
            .eq('status', 'accepted');
    
          if (completedTasksError) throw completedTasksError;
          setCompletedTasksCount(completedTasksData?.length || 0);
          
        } catch (err) {
          console.error('Error refreshing profile after review:', err);
        }
      };
      
      await loadData();
      
      // Increment the refresh trigger to force the ReviewsList to reload
      setReviewRefreshTrigger(prev => prev + 1);
      
      // Hide the review form
      setShowReviewForm(false);
    } catch (err) {
      console.error('Error after review submission:', err);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-96">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-orange-500"></div>
      </div>
    );
  }

  if (error || !userProfile) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-5xl mx-auto">
          <div className="bg-white rounded-lg shadow-md p-6 text-center">
            <h2 className="text-xl font-semibold text-red-500">User not found</h2>
            <p className="mt-2 text-gray-600">The user you're looking for doesn't exist or has been removed.</p>
            <Link to="/users/search" className="mt-4 inline-block text-orange-500 hover:text-orange-600">
              Back to Find Users
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-5xl mx-auto">
        <div className="bg-white rounded-lg shadow-md overflow-hidden">
          {/* Profile Header */}
          <div className="bg-gradient-to-r from-orange-400 to-orange-600 px-6 py-8">
            <div className="flex flex-col md:flex-row items-start md:items-center gap-6">
              <div className="relative">
                {userProfile?.profile_picture_url ? (
                  <img
                    src={userProfile.profile_picture_url}
                    alt="Profile"
                    className="w-24 h-24 rounded-full object-cover border-4 border-white"
                  />
                ) : (
                  <FaUserCircle className="w-24 h-24 text-white" />
                )}
              </div>

              <div className="text-white">
                <div className="flex items-center gap-3">
                  <h1 className="text-2xl font-bold">{userProfile?.display_name || 'Anonymous'}</h1>
                  {userProfile?.average_rating > 0 && (
                    <div className="flex items-center bg-white/20 px-2 py-1 rounded-full">
                      <FaStar className="text-yellow-300 mr-1" />
                      <span>{userProfile.average_rating.toFixed(1)}</span>
                    </div>
                  )}
                </div>
                <p className="opacity-80">{userProfile?.city || 'Location not specified'}</p>
                {userProfile?.created_at && (
                  <p className="opacity-70 text-sm">
                    Member since {new Date(userProfile.created_at).toLocaleDateString(undefined, { month: 'long', year: 'numeric' })}
                  </p>
                )}
                {userProfile?.skills?.length > 0 && (
                  <div className="flex flex-wrap gap-2 mt-3">
                    <span className="text-sm opacity-80 self-center">Can help with:</span>
                    {userProfile.skills.map(skill => (
                      <span key={skill} className="bg-white/20 px-2 py-1 rounded-full text-sm">{skill}</span>
                    ))}
                  </div>
                )}

                <div className="flex flex-wrap gap-2 mt-4">
                  {isBlocked && (
                    <span className="bg-white/20 px-3 py-2 rounded-md text-sm">You've blocked this person</span>
                  )}
                  {currentUser && currentUser.id !== userId && !isBlocked && (
                    <button
                      onClick={() => openChat(userId, userProfile?.display_name)}
                      className="bg-white text-orange-500 px-4 py-2 rounded-md hover:bg-gray-100 flex items-center gap-2"
                    >
                      <FaCommentAlt />
                      <span>Send Message</span>
                    </button>
                  )}

                  {!currentUser && (
                    <Link
                      to="/login"
                      className="bg-white text-orange-500 px-4 py-2 rounded-md hover:bg-gray-100 flex items-center gap-2"
                    >
                      <FaCommentAlt />
                      <span>Log in to message</span>
                    </Link>
                  )}
                  
                  {canReview && currentUser && currentUser.id !== userId && (
                    <button
                      onClick={() => setShowReviewForm(prev => !prev)}
                      className="bg-white/20 hover:bg-white/30 text-white px-4 py-2 rounded-md flex items-center gap-2"
                    >
                      <FaStar />
                      <span>{showReviewForm ? 'Cancel Review' : 'Leave Review'}</span>
                    </button>
                  )}

                  {currentUser && currentUser.id !== userId && (
                    <>
                      <button
                        onClick={toggleBlock}
                        disabled={blockBusy}
                        className="bg-white/10 hover:bg-white/20 text-white px-3 py-2 rounded-md flex items-center gap-2 text-sm"
                        title={isBlocked ? 'Let this person contact you again' : "Stop this person messaging you or sending you swap offers"}
                      >
                        <FaBan /> {isBlocked ? 'Unblock' : 'Block'}
                      </button>
                      <button
                        onClick={() => setReportOpen(true)}
                        className="bg-white/10 hover:bg-white/20 text-white px-3 py-2 rounded-md flex items-center gap-2 text-sm"
                      >
                        <FaFlag /> Report
                      </button>
                    </>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* User Stats */}
          <div className="bg-gray-50 p-4 border-b border-gray-200">
            <div className="flex flex-wrap gap-4 justify-center">
              <div className="text-center">
                <p className="text-2xl font-bold text-orange-500">{tasksPostedCount}</p>
                <p className="text-sm text-gray-600">Tasks Posted</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold text-orange-500">{completedTasksCount}</p>
                <p className="text-sm text-gray-600">Tasks Completed</p>
              </div>
              {userProfile?.average_rating > 0 && (
                <div className="text-center">
                  <div className="flex justify-center text-yellow-400">
                    {[...Array(5)].map((_, i) => (
                      <span key={i}>
                        {i < Math.round(userProfile.average_rating) ? 
                          <FaStar /> : <FaRegStar />
                        }
                      </span>
                    ))}
                  </div>
                  <p className="text-sm text-gray-600 mt-1">{userProfile.average_rating.toFixed(1)} Rating</p>
                </div>
              )}
            </div>
          </div>
          
          {/* Review Form */}
          {showReviewForm && currentUser && (
            <div className="p-6 bg-gray-50 border-b border-gray-200">
              <ReviewForm 
                targetUserId={userId} 
                currentUser={currentUser} 
                onReviewSubmitted={handleReviewSubmitted} 
              />
            </div>
          )}

          {/* Content Tabs */}
          <div className="border-b border-gray-200">
            <nav className="flex">
              <button
                onClick={() => setActiveTab('tasks')}
                className={`px-4 py-3 font-medium ${
                  activeTab === 'tasks'
                    ? 'border-b-2 border-orange-500 text-orange-600'
                    : 'text-gray-600 hover:text-gray-800'
                }`}
              >
                Tasks
              </button>
              <button
                onClick={() => setActiveTab('reviews')}
                className={`px-4 py-3 font-medium ${
                  activeTab === 'reviews'
                    ? 'border-b-2 border-orange-500 text-orange-600'
                    : 'text-gray-600 hover:text-gray-800'
                }`}
              >
                Reviews
              </button>
            </nav>
          </div>

          {/* Tab Content */}
          <div className="p-6">
            {activeTab === 'tasks' && (
              <div>
                <h2 className="text-xl font-semibold mb-4">Active Tasks</h2>
                {userTasks.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    <p>No active tasks posted by this user.</p>
                  </div>
                ) : (
                  <div className="grid gap-4">
                    {userTasks.map(task => (
                      <TaskCard 
                        key={task.id} 
                        task={task} 
                        currentUser={currentUser}
                        openChat={openChat}
                      />
                    ))}
                  </div>
                )}
              </div>
            )}

            {activeTab === 'reviews' && (
              <ReviewsList userId={userId} refreshTrigger={reviewRefreshTrigger} />
            )}
          </div>
        </div>
      </div>
      
      <ReportModal
        isOpen={reportOpen}
        onClose={() => setReportOpen(false)}
        currentUserId={currentUser?.id}
        reportedUserId={userId}
        reportedName={userProfile?.display_name}
      />

      {/* Chat Modal */}
      {chatOpen && chatRecipient && (
        <ChatModal
          isOpen={chatOpen}
          onClose={() => setChatOpen(false)}
          recipientId={chatRecipient.id}
          recipientName={chatRecipient.name}
        />
      )}
    </div>
  );
}

export default UserProfile; 