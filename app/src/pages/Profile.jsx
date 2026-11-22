import { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import supabase from '../helper/supabaseClient';
import { formatDuration } from '../helper/formatDuration';
import { PUBLIC_USER_FIELDS } from '../helper/userFields';
import { FaUserCircle, FaCamera, FaBookmark, FaFlag, FaCheck, FaChartBar, FaTrash } from 'react-icons/fa';
import TaskCard from '../components/TaskCard';
import TaskCompletionButton from '../components/TaskCompletionButton';
import CompletionRequests from '../components/CompletionRequests';
import TaskCompletionChart from '../components/TaskCompletionChart';
import Leaderboard from '../components/Leaderboard';
import ChatModal from '../components/ChatModal';
import AccountSettings from '../components/AccountSettings';
import { useProfilePicture } from '../helper/profileHelper';

function Profile() {
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('account');
  const [savedTasks, setSavedTasks] = useState([]);
  const [activeTasks, setActiveTasks] = useState([]);
  const [completedTasksCount, setCompletedTasksCount] = useState(0);
  const [completedTasks, setCompletedTasks] = useState([]);
  const [profilePic, updateProfilePic] = useProfilePicture(user?.id);
  const [deleteConfirmId, setDeleteConfirmId] = useState(null);
  const fileInputRef = useRef(null);
  const navigate = useNavigate();
  const [chatOpen, setChatOpen] = useState(false);
  const [chatRecipient, setChatRecipient] = useState(null);

  useEffect(() => {
    async function loadProfile() {
      const { data, error } = await supabase.auth.getUser();
      if (error || !data?.user) {
        console.error("Auth error or no user found:", error);
        setLoading(false);
        return;
      }

      const user = data.user;
      setUser(user);

      try {
        const { data: profileData } = await supabase
          .from('users')
          .select(PUBLIC_USER_FIELDS)
          .eq('id', user.id)
          .single();

        if (profileData) {
          // Use the profile picture from our hook if available
          if (profilePic) {
            profileData.profile_picture_url = profilePic;
          }
          
          setProfile(profileData);
        }

        const { data: savedData, error: savedError } = await supabase
          .from('saved_tasks')
          .select(`
            task:tasks (
              id,
              title,
              description,
              category,
              created_at,
              estimated_duration,
              user_id,
              users (
                display_name
              )
            )
          `)
  .eq('user_id', user.id)
  .order('created_at', { ascending: false });

        if (savedError) throw savedError;

        setSavedTasks(savedData.map(item => item.task));

        // Get tasks that the user has posted themselves
        const { data: postedTasksData, error: postedTasksError } = await supabase
          .from('tasks')
          .select(`
            *,
            users (
              display_name
            )
          `)
          .eq('user_id', user.id)
          .eq('status', 'open')
          .order('created_at', { ascending: false });

        if (postedTasksError) throw postedTasksError;
          
        // Get active tasks where user is the recipient through a swap
        const { data: swapTasksData, error: swapTasksError } = await supabase
          .from('task_swaps')
          .select(`
            sender_task_id,
            recipient_task_id,
            sender_task:tasks!sender_task_id (
              *,
              users (
                display_name
              )
            ),
            recipient_task:tasks!recipient_task_id (
              *,
              users (
                display_name
              )
            )
          `)
          .or(`recipient_id.eq.${user.id},sender_id.eq.${user.id}`)
          .eq('status', 'accepted');

        if (swapTasksError) throw swapTasksError;

        // Get tasks that have been marked as completed through completion requests
        const { data: userCompletedTasksData, error: userCompletedTasksError } = await supabase
          .from('task_completion_requests')
          .select('task_id')
          .eq('requester_id', user.id)
          .eq('status', 'accepted');

        if (userCompletedTasksError) throw userCompletedTasksError;

        // Create a set of completed task IDs
        const completedTaskIds = new Set(userCompletedTasksData?.map(item => item.task_id) || []);

        // Get completed tasks count
        const { data: completedTasksCountData, error: completedTasksCountError } = await supabase
          .from('task_completion_requests')
          .select('task_id')
          .eq('requester_id', user.id)
          .eq('status', 'accepted');

        if (completedTasksCountError) throw completedTasksCountError;
        setCompletedTasksCount(completedTasksCountData?.length || 0);

        // Create a set of swapped task IDs to filter out from posted tasks
        const swappedTaskIds = new Set();
        swapTasksData?.forEach(swap => {
          swappedTaskIds.add(swap.sender_task_id);
          swappedTaskIds.add(swap.recipient_task_id);
        });

        // Get tasks where user is either the recipient or sender, excluding tasks that are completed
        const swappedTasks = swapTasksData?.reduce((acc, swap) => {
          const senderTask = swap.sender_task;
          const recipientTask = swap.recipient_task;
        
          // Only include tasks that are not completed
          if (senderTask.user_id !== user.id && 
              !completedTaskIds.has(senderTask.id) && 
              senderTask.status !== 'completed') {
            acc.push(senderTask);
          } else if (recipientTask.user_id !== user.id && 
                     !completedTaskIds.has(recipientTask.id) && 
                     recipientTask.status !== 'completed') {
            acc.push(recipientTask);
          }
        
          return acc;
        }, []) || [];
        
        // Filter out any tasks that might have been marked as completed
        // Also filter out tasks that are part of active swaps
        const filteredPostedTasks = (postedTasksData || []).filter(task => 
          task.status !== 'completed' && !swappedTaskIds.has(task.id)
        );

        // Combine user's own posted tasks with swapped tasks
        const allActiveTasks = [...filteredPostedTasks, ...swappedTasks];
        setActiveTasks(allActiveTasks);

        // Get completed tasks
        const { data: completedTasksData, error: completedTasksError } = await supabase
          .from('task_completion_requests')
          .select(`
            task_id,
            task_owner_id,
            tasks (
              id,
              title,
              description,
              category,
              created_at,
              estimated_duration,
              user_id,
              users (
                id,
                display_name
              )
            )
          `)
          .eq('requester_id', user.id)
          .eq('status', 'accepted')
          .order('created_at', { ascending: false });

        if (completedTasksError) throw completedTasksError;
        
        // Process completed tasks to ensure they have the correct user_id
        const processedCompletedTasks = completedTasksData?.map(item => ({
          ...item.tasks,
          task_owner_id: item.task_owner_id
        })) || [];
        
        setCompletedTasks(processedCompletedTasks);
        setCompletedTasksCount(completedTasksData?.length || 0);

      } catch (err) {
        console.error('Error loading profile or saved tasks:', err);
      } finally {
        setLoading(false);
      }
    }

    loadProfile();
  }, []);

  // Pending completion requests are loaded and shown by <CompletionRequests />

  const handleProfilePictureUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) {
      return;
    }

    // Show a loading indicator or message
    setLoading(true);
    
    try {
      // Validate file type and size
      if (!file.type.match('image.*')) {
        alert('Please select an image file');
        setLoading(false);
        return;
      }
      
      if (file.size > 5 * 1024 * 1024) {
        alert('File size should be less than 5MB');
        setLoading(false);
        return;
      }

      // Upload to Supabase Storage (public "avatars" bucket), into a folder
      // named after the user so only they can change it.
      const ext = (file.name.split('.').pop() || 'jpg').toLowerCase();
      const filePath = `${user.id}/avatar-${Date.now()}.${ext}`;

      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(filePath, file, { cacheControl: '3600', upsert: true, contentType: file.type });
      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage.from('avatars').getPublicUrl(filePath);
      const publicUrl = urlData.publicUrl;

      // Save the link on the user's row so every other user sees it too
      const { error: updateError } = await supabase
        .from('users')
        .update({ profile_picture_url: publicUrl })
        .eq('id', user.id);
      if (updateError) throw updateError;

      // Drop the old browser-only copy so it can't override the shared one
      updateProfilePic(null);

      setProfile(prevProfile => ({ ...prevProfile, profile_picture_url: publicUrl }));
      // Tell the header to show the new picture straight away
      window.dispatchEvent(new CustomEvent('profile-picture-updated', { detail: { url: publicUrl } }));
      alert('Profile picture updated successfully!');
    } catch (error) {
      console.error('Profile picture upload failed:', error);
      alert(`Failed to update profile picture: ${error.message || 'Unknown error'}`);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    try {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
      navigate('/');
    } catch (error) {
      console.error('Error logging out:', error.message);
    }
  };

  const deleteTask = async (taskId) => {
    if (!user) return;
    
    try {
      const { error } = await supabase
        .from('tasks')
        .delete()
        .eq('id', taskId)
        .eq('user_id', user.id); // Ensure the user owns the task
      
      if (error) throw error;
      
      // Update local state by removing the deleted task
      setActiveTasks(currentTasks => currentTasks.filter(task => task.id !== taskId));
      setSavedTasks(currentTasks => currentTasks.filter(task => task.id !== taskId));
      setDeleteConfirmId(null);
      
      alert('Task deleted successfully');
    } catch (err) {
      console.error('Error deleting task:', err);
      alert('Failed to delete task. Please try again.');
    }
  };

  // Fix for the useProfilePicture hook - update it when user changes
  useEffect(() => {
    if (user?.id && profilePic) {
      // Ensure the profile picture is updated in the profile state
      setProfile(prevProfile => {
        // Only update if the profile exists and the picture is different
        if (prevProfile && prevProfile.profile_picture_url !== profilePic) {
          return {
            ...prevProfile,
            profile_picture_url: profilePic
          };
        }
        return prevProfile;
      });
    }
  }, [user?.id, profilePic]);

  const toggleBookmark = async (taskId) => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('saved_tasks')
        .select('*')
        .eq('user_id', user.id)
        .eq('task_id', taskId)
        .single();

      if (error && error.code !== 'PGRST116') {
        console.error('Error checking bookmark:', error);
        return;
      }

      if (data) {
        await supabase
          .from('saved_tasks')
          .delete()
          .eq('id', data.id);
          
        // Remove the task from savedTasks state
        setSavedTasks(currentTasks => currentTasks.filter(task => task.id !== taskId));
      }
    } catch (err) {
      console.error('Error toggling bookmark:', err);
    }
  };

  const openChat = (userId, displayName) => {
    if (!user || userId === user.id) return;
    setChatRecipient({ id: userId, name: displayName || 'User' });
    setChatOpen(true);
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-96">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-orange-500"></div>
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
                {profile?.profile_picture_url || profilePic ? (
                  <img
                    src={profilePic || profile?.profile_picture_url}
                    alt="Profile"
                    className="w-24 h-24 rounded-full object-cover border-4 border-white"
                    onError={(e) => {
                      console.log("Image load error, fallback to icon");
                      e.target.style.display = 'none';
                      // Fallback to icon if image fails to load
                      const iconElement = e.target.parentNode.querySelector('.fallback-icon');
                      if (iconElement) iconElement.style.display = 'block';
                    }}
                  />
                ) : null}
                <FaUserCircle 
                  className={`w-24 h-24 text-white ${profile?.profile_picture_url || profilePic ? 'hidden fallback-icon' : ''}`} 
                />
                <button
                  onClick={() => fileInputRef.current.click()}
                  className="absolute bottom-0 right-0 bg-white rounded-full p-2 shadow-md hover:bg-gray-100"
                  aria-label="Change profile picture"
                >
                  <FaCamera className="text-gray-700" />
                </button>
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleProfilePictureUpload}
                  className="hidden"
                  accept="image/jpeg, image/png, image/gif, image/webp"
                  onClick={(e) => e.target.value = null}
                />
              </div>

              <div className="text-white">
                <h1 className="text-2xl font-bold">{profile?.display_name || user?.email}</h1>
                <p className="opacity-80">{user?.email}</p>
              </div>
            </div>
          </div>

          {/* Main Layout */}
          <div className="flex flex-col md:flex-row">
            {/* Sidebar */}
            <div className="w-full md:w-64 border-r border-gray-200">
              <div className="p-4 border-b border-gray-200">
                <h2 className="font-medium text-gray-800">Settings</h2>
              </div>
              <nav className="p-2">
                <button onClick={() => setActiveTab('account')} className={`w-full text-left px-4 py-2 rounded flex items-center ${activeTab === 'account' ? 'bg-orange-100 text-orange-600' : 'hover:bg-gray-100'}`}>
                  <FaUserCircle className="mr-2" /> Account
                </button>
                <button onClick={() => setActiveTab('saved')} className={`w-full text-left px-4 py-2 rounded flex items-center ${activeTab === 'saved' ? 'bg-orange-100 text-orange-600' : 'hover:bg-gray-100'}`}>
                  <FaBookmark className="mr-2" /> Saved Tasks
                </button>
                <button onClick={() => setActiveTab('active')} className={`w-full text-left px-4 py-2 rounded flex items-center ${activeTab === 'active' ? 'bg-orange-100 text-orange-600' : 'hover:bg-gray-100'}`}>
                  <FaFlag className="mr-2" /> Active Tasks
                </button>
                <button onClick={() => setActiveTab('completed')} className={`w-full text-left px-4 py-2 rounded flex items-center ${activeTab === 'completed' ? 'bg-orange-100 text-orange-600' : 'hover:bg-gray-100'}`}>
                  <FaCheck className="mr-2" /> Completed Tasks
                </button>
                <button onClick={() => setActiveTab('stats')} className={`w-full text-left px-4 py-2 rounded flex items-center ${activeTab === 'stats' ? 'bg-orange-100 text-orange-600' : 'hover:bg-gray-100'}`}>
                  <FaChartBar className="mr-2" /> Statistics
                </button>
              </nav>
            </div>

            {/* Content Area */}
            <div className="flex-1 p-6">
              {activeTab === 'account' && (
                <AccountSettings
                  user={user}
                  profile={profile}
                  completedTasksCount={completedTasksCount}
                  onProfileUpdated={updates => setProfile(prev => ({ ...prev, ...updates }))}
                  onLogout={handleLogout}
                />
              )}

              {activeTab === 'active' && (
                <div className="space-y-6">
                  {/* Tasks You've Posted Section */}
                  <div>
                    <h2 className="text-xl font-semibold mb-4">Tasks You've Posted</h2>
                    {activeTasks.filter(task => task.user_id === user.id).length === 0 ? (
                      <div className="text-center py-4 text-gray-500">
                        <p>You haven't posted any active tasks.</p>
                        <Link to="/post-task" className="mt-2 inline-block text-orange-500 hover:text-orange-600 font-medium">
                          Post a Task
                        </Link>
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {activeTasks
                          .filter(task => task.user_id === user.id)
                          .map((task) => (
                            <div key={task.id} className="border rounded-lg p-4">
                              <div className="flex justify-between">
                                <h3 className="font-medium"><Link to={`/tasks/${task.id}`} className="hover:text-orange-500 hover:underline">{task.title}</Link></h3>
                                <button
                                  onClick={() => setDeleteConfirmId(task.id)}
                                  className="text-red-500 hover:text-red-600"
                                  title="Delete task"
                                >
                                  <FaTrash />
                                </button>
                              </div>
                              <p className="text-gray-600 mt-2">{task.description}</p>
                              <div className="mt-2 flex items-center gap-2 text-sm text-gray-500">
                                <span>Category: {task.category}</span>
                                <span>•</span>
                                <span>Duration: {task.estimated_duration || 'Not specified'}</span>
                              </div>
                              {deleteConfirmId === task.id && (
                                <div className="mt-4 bg-red-50 p-3 rounded-md border border-red-200">
                                  <p className="text-red-700 mb-2">Are you sure you want to delete this task?</p>
                                  <div className="flex justify-end space-x-2">
                                    <button
                                      onClick={() => setDeleteConfirmId(null)}
                                      className="px-3 py-1 bg-gray-200 rounded text-gray-700 hover:bg-gray-300"
                                    >
                                      Cancel
                                    </button>
                                    <button
                                      onClick={() => deleteTask(task.id)}
                                      className="px-3 py-1 bg-red-600 rounded text-white hover:bg-red-700"
                                    >
                                      Delete
                                    </button>
                                  </div>
                                </div>
                              )}
                            </div>
                          ))}
                      </div>
                    )}
                  </div>

                  {/* Tasks You're Working On Section */}
                  <div>
                    <h2 className="text-xl font-semibold mb-4">Tasks You're Working On</h2>
                    {activeTasks.filter(task => task.user_id !== user.id).length === 0 ? (
                      <p className="text-gray-500">No tasks in progress</p>
                    ) : (
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {activeTasks
                          .filter(task => task.user_id !== user.id)
                          .map((task) => (
                            <div key={task.id} className="border rounded-lg p-4">
                              <h3 className="font-medium"><Link to={`/tasks/${task.id}`} className="hover:text-orange-500 hover:underline">{task.title}</Link></h3>
                              <p className="text-gray-600 mt-2">{task.description}</p>
                              <p className="text-sm text-gray-500 mt-2">
                                Posted by: <Link to={`/users/${task.user_id}`} className="text-orange-500 hover:text-orange-600 hover:underline">{task.users?.display_name || 'Anonymous'}</Link>
                              </p>
                              <TaskCompletionButton
                                taskId={task.id}
                                taskOwnerId={task.user_id}
                                currentUserId={user.id}
                              />
                            </div>
                          ))}
                      </div>
                    )}
                  </div>

                  {/* Completion Requests Section */}
                  <div className="mt-8">
                    <CompletionRequests userId={user.id} />
                  </div>
                </div>
              )}

              {activeTab === 'saved' && (
                <div>
                  <h2 className="text-xl font-semibold mb-4">Saved Tasks</h2>
                  {savedTasks.length === 0 ? (
                    <div className="text-center py-8 text-gray-500">
                      <p>You haven't saved any tasks yet.</p>
                      <Link to="/tasks" className="mt-2 inline-block text-orange-500 hover:text-orange-600 font-medium">
                        Browse Tasks
                      </Link>
                    </div>
                  ) : (
                    <div className="grid gap-4">
                      {savedTasks.map(task => (
                        <TaskCard 
                          key={task.id} 
                          task={{...task, isBookmarked: true}} 
                          toggleBookmark={toggleBookmark}
                          currentUser={user}
                          openChat={openChat}
                        />
                      ))}
                    </div>
                  )}
                </div>
              )}

              {activeTab === 'completed' && (
                <div>
                  <h2 className="text-xl font-semibold mb-4">Completed Tasks</h2>
                  {completedTasks.length === 0 ? (
                    <div className="text-center py-8 text-gray-500">
                      <p>You haven't completed any tasks yet.</p>
                    </div>
                  ) : (
                    <div className="grid gap-4">
                      {completedTasks.map(task => (
                        <div key={task.id} className="border rounded-lg p-4 bg-gray-50">
                          <div className="flex justify-between items-start">
                            <div>
                              <h3 className="font-medium text-lg"><Link to={`/tasks/${task.id}`} className="hover:text-orange-500 hover:underline">{task.title}</Link></h3>
                              <p className="text-gray-600 mt-1">{task.description}</p>
                              <div className="mt-2 flex items-center gap-2 text-sm text-gray-500">
                                <span>Category: {task.category}</span>
                                <span>•</span>
                                <span>Duration: {formatDuration(task.estimated_duration, 'Not specified')}</span>
                                <span>•</span>
                                <span>Posted by: {
                                  <Link 
                                    to={`/users/${task.task_owner_id || task.user_id}`} 
                                    className="text-orange-500 hover:text-orange-600 hover:underline"
                                  >
                                    {task.users?.display_name || 'Anonymous'}
                                  </Link>
                                }
                                </span>
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              <span className="px-2 py-1 bg-green-100 text-green-800 rounded-full text-sm">
                                Completed
                              </span>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {activeTab === 'stats' && (
                <div className="space-y-6">
                  <h2 className="text-xl font-semibold mb-4">Task Statistics</h2>
                  <div className="grid grid-cols-1 gap-6">
                    <TaskCompletionChart userId={user?.id} />
                    <Leaderboard />
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
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

export default Profile;