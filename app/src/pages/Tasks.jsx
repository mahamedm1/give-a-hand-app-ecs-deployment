import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import supabase from '../helper/supabaseClient';
import CommunityBadge from '../components/CommunityBadge';
import { todayISO } from '../helper/taskStatus';
import { fetchMyCommunities } from '../helper/communities';
import { formatDuration } from '../helper/formatDuration';
import { FaBookmark, FaRegBookmark, FaCommentAlt, FaExchangeAlt, FaTrash, FaSearch, FaFilter, FaSortAmountDown, FaSortAmountUp, FaMapMarkerAlt, FaClock } from 'react-icons/fa';
import ChatModal from '../components/ChatModal';
import SwapModal from '../components/SwapModal';

const Tasks = () => {
  const [tasks, setTasks] = useState([]);
  const [filteredTasks, setFilteredTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [currentUser, setCurrentUser] = useState(null);
  const [chatOpen, setChatOpen] = useState(false);
  const [chatRecipient, setChatRecipient] = useState(null);
  const [swapModalOpen, setSwapModalOpen] = useState(false);
  const [selectedTask, setSelectedTask] = useState(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState(null);
  
  // Search and Filter States
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [cityFilter, setCityFilter] = useState('');
  // 'all' = public + my communities, 'public', or a community id
  const [visibilityFilter, setVisibilityFilter] = useState('all');
  const [myCommunities, setMyCommunities] = useState([]);
  const [mySkills, setMySkills] = useState([]);
  const [sortBy, setSortBy] = useState('created_at');
  const [sortOrder, setSortOrder] = useState('desc');
  const [showFilters, setShowFilters] = useState(false);
  const [categories, setCategories] = useState([]);
  const [cities, setCities] = useState([]);

  useEffect(() => {
    const loadUserAndTasks = async () => {
      const { data: authData } = await supabase.auth.getUser();
      setCurrentUser(authData.user);
      fetchMyCommunities(authData.user?.id).then(setMyCommunities).catch(err => console.error('Error loading communities:', err));
      if (authData.user) {
        supabase.from('users').select('skills').eq('id', authData.user.id).maybeSingle()
          .then(({ data }) => setMySkills(data?.skills || []));
      }
      fetchTasks(authData.user?.id);
    };

    loadUserAndTasks();

    // Live updates: whenever any task is added, changed or removed, reload
    // the list (so poster names, swap filtering and bookmarks stay correct)
    const subscription = supabase
      .channel('public:tasks')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'tasks' }, async () => {
        const { data: authData } = await supabase.auth.getUser();
        fetchTasks(authData?.user?.id);
      })
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  // Apply filters when tasks, searchTerm, or filters change
  useEffect(() => {
    applyFilters();
  }, [tasks, searchTerm, categoryFilter, cityFilter, visibilityFilter, sortBy, sortOrder]);

  // Open tasks matching your skills (not your own), for "Suggested for you"
  const suggestedTasks = currentUser
    ? tasks.filter(t => t.user_id !== currentUser.id && mySkills.includes(t.category)).slice(0, 4)
    : [];

  const fetchTasks = async (userId) => {
    try {
      setLoading(true);
      
      // First, get all tasks that are in active swaps
      const { data: activeSwaps, error: swapsError } = await supabase
        .from('task_swaps')
        .select('sender_task_id, recipient_task_id')
        .eq('status', 'accepted');
      
      // Not fatal: without it we just can't hide already-swapped tasks
      if (swapsError) console.error('Error loading active swaps:', swapsError);

      // Create array of task IDs that are in active swaps
      const swappedTaskIds = [];
      activeSwaps?.forEach(swap => {
        swappedTaskIds.push(swap.sender_task_id);
        swappedTaskIds.push(swap.recipient_task_id);
      });
      
      // Now get all open tasks that are NOT in active swaps
      let query = supabase
        .from('tasks')
        .select('*, users(display_name, city), communities(id, name)')
        .eq('status', 'open')
        .gte('completion_date', todayISO()) // hide tasks past their needed-by date
        .order('created_at', { ascending: false });
      
      // If there are swapped tasks, exclude them
      if (swappedTaskIds.length > 0) {
        query = query.not('id', 'in', `(${swappedTaskIds.join(',')})`);
      }
      
      const { data, error } = await query;

      if (error) throw error;

      // Extract unique categories for the filter dropdown
      const uniqueCategories = [...new Set(data.map(task => task.category))].filter(Boolean);
      setCategories(uniqueCategories);

      // Extract unique cities for the filter dropdown
      const uniqueCities = [...new Set(data.map(task => task.users?.city || task.city).filter(Boolean))];
      setCities(uniqueCities);

      // Only logged-in users have saved tasks
      const bookmarksRes = userId
        ? await supabase.from('saved_tasks').select('task_id').eq('user_id', userId)
        : { data: [] };

      const bookmarkedIds = bookmarksRes?.data?.map(b => b.task_id) || [];

      const tasksWithBookmarks = data.map(task => ({
        ...task,
        isBookmarked: bookmarkedIds.includes(task.id)
      }));

      setTasks(tasksWithBookmarks);
      setFilteredTasks(tasksWithBookmarks);
    } catch (err) {
      console.error('Error fetching tasks:', err);
      setError('Failed to load tasks');
    } finally {
      setLoading(false);
    }
  };

  // Function to apply filters and sorting
  const applyFilters = () => {
    let result = [...tasks];
    
    // Apply search filter
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      result = result.filter(task => 
        task.title.toLowerCase().includes(term) || 
        task.description.toLowerCase().includes(term) ||
        (task.users?.display_name || '').toLowerCase().includes(term)
      );
    }
    
    // Apply visibility filter (the database already hides communities you're not in)
    if (visibilityFilter === 'public') {
      result = result.filter(task => !task.community_id);
    } else if (visibilityFilter !== 'all') {
      result = result.filter(task => task.community_id === visibilityFilter);
    }

    // Apply category filter
    if (categoryFilter) {
      result = result.filter(task => task.category === categoryFilter);
    }
    
    // Apply city filter
    if (cityFilter) {
      result = result.filter(task => 
        (task.users?.city === cityFilter) || (task.city === cityFilter)
      );
    }
    
    // Apply sorting
    result.sort((a, b) => {
      let aValue = a[sortBy];
      let bValue = b[sortBy];
      
      // Handle special cases for sorting
      if (sortBy === 'created_at') {
        aValue = new Date(aValue).getTime();
        bValue = new Date(bValue).getTime();
      } else if (sortBy === 'estimated_duration') {
        aValue = parseFloat(aValue) || 0;
        bValue = parseFloat(bValue) || 0;
      }
      
      if (sortOrder === 'asc') {
        return aValue > bValue ? 1 : -1;
      } else {
        return aValue < bValue ? 1 : -1;
      }
    });
    
    setFilteredTasks(result);
  };

  // Reset all filters
  const resetFilters = () => {
    setSearchTerm('');
    setCategoryFilter('');
    setCityFilter('');
    setVisibilityFilter('all');
    setSortBy('created_at');
    setSortOrder('desc');
  };

  const toggleBookmark = async (taskId) => {
    if (!currentUser) return;

    const { data, error } = await supabase
      .from('saved_tasks')
      .select('*')
      .eq('user_id', currentUser.id)
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
    } else {
      await supabase
        .from('saved_tasks')
        .insert({
          user_id: currentUser.id,
          task_id: taskId
        });
    }

    fetchTasks(currentUser.id);
  };

  const deleteTask = async (taskId) => {
    if (!currentUser) return;
    
    try {
      const { error } = await supabase
        .from('tasks')
        .delete()
        .eq('id', taskId)
        .eq('user_id', currentUser.id); // Ensure the user owns the task
      
      if (error) throw error;
      
      // Update local state by removing the deleted task
      setTasks(currentTasks => currentTasks.filter(task => task.id !== taskId));
      setFilteredTasks(currentFilteredTasks => currentFilteredTasks.filter(task => task.id !== taskId));
      setDeleteConfirmId(null);
    } catch (err) {
      console.error('Error deleting task:', err);
      setError('Failed to delete task. Please try again.');
    }
  };

  const openChat = (userId, displayName) => {
    if (!currentUser || userId === currentUser.id) return;
    setChatRecipient({ id: userId, name: displayName || 'User' });
    setChatOpen(true);
  };
  
  const openSwapModal = (task) => {
    if (!currentUser || task.user_id === currentUser.id) return;
    setSelectedTask(task);
    setSwapModalOpen(true);
  };

  const TaskCard = ({ task, currentUser, toggleBookmark, openChat, openSwapModal }) => {
    const isOwner = currentUser && task.user_id === currentUser.id;
    const taskCity = task.users?.city || task.city;

    return (
      <div className="bg-white rounded-lg shadow-md overflow-hidden hover:shadow-lg transition-shadow border border-gray-100">
        <div className="p-6">
          <div className="flex justify-between items-start">
            <h3 className="text-xl font-bold text-gray-800 hover:text-orange-500 transition-colors"><Link to={`/tasks/${task.id}`}>{task.title}</Link></h3>
            <div className="flex space-x-2">
              {isOwner ? (
                <button
                  onClick={() => setDeleteConfirmId(task.id)}
                  className="text-red-500 hover:text-red-600"
                  title="Delete task"
                >
                  <FaTrash />
                </button>
              ) : (
                <button
                  onClick={() => toggleBookmark(task.id)}
                  className="text-orange-500 hover:text-orange-600"
                  title={task.isBookmarked ? "Remove from saved tasks" : "Save task"}
                >
                  {task.isBookmarked ? <FaBookmark /> : <FaRegBookmark />}
                </button>
              )}
            </div>
          </div>

          <div className="mt-2">
            <span className="inline-block bg-gray-100 rounded-full px-3 py-1 text-sm font-semibold text-gray-700 mr-2">
              {task.category}
            </span>
            <CommunityBadge community={task.communities} />
            {task.estimated_duration && (
              <span className="inline-block bg-blue-100 rounded-full px-3 py-1 text-sm font-semibold text-blue-700">
                <FaClock className="inline mr-1" /> {formatDuration(task.estimated_duration)}
              </span>
            )}
            {taskCity && (
              <span className="inline-block bg-green-100 rounded-full px-3 py-1 text-sm font-semibold text-green-700">
                <FaMapMarkerAlt className="inline mr-1" /> {taskCity}
              </span>
            )}
          </div>

          <p className="mt-3 text-gray-600 line-clamp-3">{task.description}</p>

          <div className="mt-4 flex justify-between items-center text-sm text-gray-500">
            <div>
              <p className="flex items-center">
                Posted by: <Link to={`/users/${task.user_id}`} className="text-orange-500 hover:text-orange-600 hover:underline ml-1">{task.users?.display_name || 'Anonymous'}</Link>
              </p>
              <p className="flex items-center mt-1">
                <FaClock className="mr-1" /> Posted {new Date(task.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
              </p>
            </div>

            <div className="flex items-center">
              {currentUser && !isOwner && (
                <button
                  onClick={() => openSwapModal(task)}
                  className="bg-blue-500 text-white p-2 rounded-full hover:bg-blue-600 mr-2 transition-colors"
                  title="Offer to swap tasks"
                >
                  <FaExchangeAlt />
                </button>
              )}
              {!isOwner && (
                <button
                  onClick={() => openChat(task.user_id, task.users?.display_name)}
                  className="bg-orange-500 text-white p-2 rounded-full hover:bg-orange-600 transition-colors"
                  title={`Message ${task.users?.display_name || 'User'}`}
                >
                  <FaCommentAlt />
                </button>
              )}
            </div>
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
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gray-50 py-10">
      <div className="container mx-auto px-4">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-800 mb-4">Available Tasks</h1>
          
          {/* Search Bar */}
          <div className="bg-white rounded-lg shadow-md p-4 mb-6">
            <div className="flex flex-wrap gap-4">
              <div className="flex-1 relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <FaSearch className="text-gray-400" />
                </div>
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Search tasks by title, description, or user..."
                  className="w-full pl-10 pr-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                />
              </div>

              {currentUser && myCommunities.length > 0 && (
                <select
                  value={visibilityFilter}
                  onChange={(e) => setVisibilityFilter(e.target.value)}
                  aria-label="Which tasks to show"
                  className="px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                >
                  <option value="all">All tasks I can see</option>
                  <option value="public">Public tasks only</option>
                  {myCommunities.map(c => (
                    <option key={c.id} value={c.id}>{c.name} only</option>
                  ))}
                </select>
              )}

              <button
                onClick={() => setShowFilters(!showFilters)}
                className="flex items-center gap-2 bg-gray-100 px-4 py-2 rounded-lg hover:bg-gray-200"
              >
                <FaFilter /> {showFilters ? 'Hide Filters' : 'Show Filters'}
              </button>
              
              <button 
                onClick={resetFilters} 
                className="flex items-center gap-2 text-orange-500 hover:text-orange-600 px-4 py-2"
              >
                Reset
              </button>
            </div>
            
            {/* Expanded Filters */}
            {showFilters && (
              <div className="mt-4 p-4 bg-gray-50 rounded-lg grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {/* Category Filter */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
                  <select
                    value={categoryFilter}
                    onChange={(e) => setCategoryFilter(e.target.value)}
                    className="w-full p-2 border rounded-lg"
                  >
                    <option value="">All Categories</option>
                    {categories.map((category) => (
                      <option key={category} value={category}>{category}</option>
                    ))}
                  </select>
                </div>
                
                {/* City Filter */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">City</label>
                  <select
                    value={cityFilter}
                    onChange={(e) => setCityFilter(e.target.value)}
                    className="w-full p-2 border rounded-lg"
                  >
                    <option value="">All Cities</option>
                    {cities.map((city) => (
                      <option key={city} value={city}>{city}</option>
                    ))}
                  </select>
                </div>
                
                {/* Sort By */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Sort By</label>
                  <select
                    value={sortBy}
                    onChange={(e) => setSortBy(e.target.value)}
                    className="w-full p-2 border rounded-lg"
                  >
                    <option value="created_at">Date Posted</option>
                    <option value="title">Title</option>
                    <option value="estimated_duration">Duration</option>
                  </select>
                </div>
                
                {/* Sort Order */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Sort Order</label>
                  <div className="flex gap-3">
                    <button
                      onClick={() => setSortOrder('desc')}
                      className={`flex-1 flex justify-center items-center gap-2 p-2 border rounded-lg ${sortOrder === 'desc' ? 'bg-orange-100 border-orange-500 text-orange-700' : 'bg-white'}`}
                    >
                      <FaSortAmountDown /> Descending
                    </button>
                    <button
                      onClick={() => setSortOrder('asc')}
                      className={`flex-1 flex justify-center items-center gap-2 p-2 border rounded-lg ${sortOrder === 'asc' ? 'bg-orange-100 border-orange-500 text-orange-700' : 'bg-white'}`}
                    >
                      <FaSortAmountUp /> Ascending
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Suggested for you: open tasks matching the skills on your profile */}
        {!loading && suggestedTasks.length > 0 && (
          <section className="mb-8">
            <h2 className="text-xl font-semibold text-gray-800 mb-1">Suggested for you</h2>
            <p className="text-sm text-gray-500 mb-3">
              Based on your skills: {mySkills.join(', ')}. <Link to="/profile" className="text-orange-500 hover:underline">Change</Link>
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {suggestedTasks.map(task => (
                <Link
                  key={task.id}
                  to={`/tasks/${task.id}`}
                  className="bg-white border-2 border-orange-100 rounded-lg p-4 hover:border-orange-300 hover:shadow-md transition"
                >
                  <span className="text-xs font-semibold text-orange-600">{task.category}</span>
                  <h3 className="font-semibold text-gray-800 mt-1 line-clamp-2">{task.title}</h3>
                  <p className="text-sm text-gray-500 mt-1 line-clamp-2">{task.description}</p>
                  <p className="text-xs text-gray-400 mt-2">by {task.users?.display_name || 'Anonymous'}</p>
                </Link>
              ))}
            </div>
          </section>
        )}
        {!loading && currentUser && mySkills.length === 0 && (
          <p className="mb-6 text-sm text-gray-600 bg-orange-50 border border-orange-100 rounded-md p-3">
            Tip: <Link to="/profile" className="text-orange-600 hover:underline">add your skills</Link> to see tasks suggested for you.
          </p>
        )}

        {/* Task Count */}
        <div className="mb-4 flex justify-between items-center">
          <p className="text-gray-600">
            {loading ? 'Loading tasks...' : filteredTasks.length === 0 ? 
              'No matching tasks found.' : 
              `Showing ${filteredTasks.length} ${filteredTasks.length === 1 ? 'task' : 'tasks'}`
            }
          </p>
          
          <Link 
            to="/post-task" 
            className="bg-orange-500 hover:bg-orange-600 text-white px-4 py-2 rounded-lg transition-colors"
          >
            Post a New Task
          </Link>
        </div>
        
        {/* Task Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {loading ? (
            Array.from({ length: 6 }).map((_, index) => (
              <div key={index} className="bg-white rounded-lg shadow-md overflow-hidden animate-pulse">
                <div className="p-6">
                  <div className="h-6 bg-gray-200 rounded w-3/4 mb-4"></div>
                  <div className="h-4 bg-gray-200 rounded w-1/4 mb-4"></div>
                  <div className="h-4 bg-gray-200 rounded mb-2"></div>
                  <div className="h-4 bg-gray-200 rounded mb-2"></div>
                  <div className="h-4 bg-gray-200 rounded w-5/6 mb-4"></div>
                  <div className="flex justify-between">
                    <div className="h-4 bg-gray-200 rounded w-1/3"></div>
                    <div className="h-8 bg-gray-200 rounded-full w-8"></div>
                  </div>
                </div>
              </div>
            ))
          ) : error ? (
            <div className="col-span-full p-8 text-center">
              <p className="text-red-500 font-medium">{error}</p>
              <button 
                onClick={() => fetchTasks(currentUser?.id)} 
                className="mt-4 bg-orange-500 text-white px-4 py-2 rounded-lg hover:bg-orange-600"
              >
                Retry
              </button>
            </div>
          ) : filteredTasks.length === 0 ? (
            <div className="col-span-full p-8 bg-white rounded-lg shadow-md text-center">
              <p className="text-gray-500 mb-4">
                {searchTerm || categoryFilter || cityFilter || visibilityFilter !== 'all'
                  ? 'No tasks found matching your criteria.'
                  : 'There are no open tasks right now. Post one and offer to swap help with someone!'}
              </p>
              {searchTerm || categoryFilter || cityFilter || visibilityFilter !== 'all' ? (
                <button 
                  onClick={resetFilters} 
                  className="text-orange-500 hover:text-orange-600 underline"
                >
                  Clear filters and try again
                </button>
              ) : (
                <Link to="/post-task" className="text-orange-500 hover:text-orange-600 underline">
                  Be the first to post a task!
                </Link>
              )}
            </div>
          ) : (
            filteredTasks.map(task => (
              <TaskCard 
                key={task.id} 
                task={task} 
                currentUser={currentUser} 
                toggleBookmark={toggleBookmark} 
                openChat={openChat}
                openSwapModal={openSwapModal} 
              />
            ))
          )}
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
      
      {swapModalOpen && selectedTask && (
        <SwapModal
          isOpen={swapModalOpen}
          onClose={() => setSwapModalOpen(false)}
          recipientTask={selectedTask}
          recipientId={selectedTask.user_id}
        />
      )}
    </div>
  );
};

export default Tasks;
