import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import supabase from '../helper/supabaseClient';
import { FaTrophy, FaMedal, FaAward, FaStar, FaTasks, FaCrown } from 'react-icons/fa';

const Leaderboard = () => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [timeRange, setTimeRange] = useState('all-time'); // 'all-time', 'monthly', 'weekly'

  useEffect(() => {
    fetchLeaderboardData();
  }, [timeRange]);

  const fetchLeaderboardData = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Define date range based on selected timeRange
      let startDate = null;
      if (timeRange === 'monthly') {
        const date = new Date();
        date.setMonth(date.getMonth() - 1);
        startDate = date.toISOString();
      } else if (timeRange === 'weekly') {
        const date = new Date();
        date.setDate(date.getDate() - 7);
        startDate = date.toISOString();
      }
      
      // Get completed tasks counts, grouped by user
      let query = supabase
        .from('task_completion_requests')
        .select(`
          requester_id,
          count
        `)
        .eq('status', 'accepted')
        .select('requester_id');
      
      // Add date filter if a specific time range is selected
      if (startDate) {
        query = query.gte('created_at', startDate);
      }
      
      const { data: completionData, error: completionError } = await query;
      
      if (completionError) throw completionError;
      
      // Count tasks completed by each user
      const userCounts = {};
      completionData.forEach(item => {
        userCounts[item.requester_id] = (userCounts[item.requester_id] || 0) + 1;
      });
      
      // Get user profiles for those in the counts
      const userIds = Object.keys(userCounts);
      
      if (userIds.length === 0) {
        setUsers([]);
        setLoading(false);
        return;
      }
      
      const { data: userData, error: userError } = await supabase
        .from('users')
        .select('id, display_name, profile_picture_url')
        .in('id', userIds);
      
      if (userError) throw userError;
      
      // Combine the data
      const leaderboardData = userData.map(user => ({
        id: user.id,
        display_name: user.display_name || 'Anonymous User',
        profile_picture_url: user.profile_picture_url,
        task_count: userCounts[user.id] || 0
      }))
      .sort((a, b) => b.task_count - a.task_count) // Sort by task count
      .slice(0, 10); // Only take top 10
      
      setUsers(leaderboardData);
    } catch (err) {
      console.error('Error fetching leaderboard data:', err);
      setError('Failed to load leaderboard data');
    } finally {
      setLoading(false);
    }
  };

  // Get the appropriate icon based on rank
  const getRankIcon = (index) => {
    switch (index) {
      case 0:
        return <FaTrophy className="text-yellow-500" />;
      case 1:
        return <FaMedal className="text-gray-400" />;
      case 2:
        return <FaAward className="text-amber-700" />;
      default:
        return <FaStar className="text-gray-300" />;
    }
  };

  // Format the time range for display
  const getTimeRangeLabel = () => {
    switch (timeRange) {
      case 'weekly':
        return 'This Week';
      case 'monthly':
        return 'This Month';
      default:
        return 'All Time';
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-md overflow-hidden">
      <div className="bg-gradient-to-r from-purple-400 to-purple-600 px-6 py-4">
        <h2 className="text-xl font-bold text-white flex items-center">
          <FaCrown className="mr-2" /> Task Champions Leaderboard
        </h2>
      </div>
      
      <div className="p-4">
        {/* Time Range Selector */}
        <div className="flex flex-wrap gap-2 mb-4">
          <button
            onClick={() => setTimeRange('all-time')}
            className={`px-3 py-1.5 text-sm rounded-md ${
              timeRange === 'all-time'
                ? 'bg-purple-100 text-purple-700'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            All Time
          </button>
          <button
            onClick={() => setTimeRange('monthly')}
            className={`px-3 py-1.5 text-sm rounded-md ${
              timeRange === 'monthly'
                ? 'bg-purple-100 text-purple-700'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            This Month
          </button>
          <button
            onClick={() => setTimeRange('weekly')}
            className={`px-3 py-1.5 text-sm rounded-md ${
              timeRange === 'weekly'
                ? 'bg-purple-100 text-purple-700'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            This Week
          </button>
        </div>
        
        {error && (
          <div className="p-4 text-center text-red-500">
            <p>{error}</p>
          </div>
        )}
        
        {loading ? (
          <div className="p-6 text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-purple-500 mx-auto"></div>
          </div>
        ) : users.length === 0 ? (
          <div className="p-6 text-center text-gray-500">
            <p>No task completions found for {getTimeRangeLabel().toLowerCase()}.</p>
          </div>
        ) : (
          <div className="overflow-hidden">
            {/* Top 3 Users - Featured Section */}
            {users.length >= 3 && (
              <div className="flex flex-col md:flex-row justify-center items-center gap-4 mb-6 p-4">
                {/* Second Place */}
                {users[1] && (
                  <div className="flex flex-col items-center order-2 md:order-1">
                    <div className="relative">
                      {users[1].profile_picture_url ? (
                        <img
                          src={users[1].profile_picture_url}
                          alt={users[1].display_name}
                          className="w-16 h-16 rounded-full object-cover border-2 border-gray-300"
                        />
                      ) : (
                        <div className="w-16 h-16 rounded-full bg-gray-200 flex items-center justify-center">
                          <FaAward className="text-3xl text-gray-400" />
                        </div>
                      )}
                      <div className="absolute -bottom-2 -right-2 bg-gray-400 text-white rounded-full w-7 h-7 flex items-center justify-center text-sm font-bold">
                        2
                      </div>
                    </div>
                    <Link to={`/users/${users[1].id}`} className="mt-2 font-medium text-gray-800 text-sm hover:text-purple-600">
                      {users[1].display_name}
                    </Link>
                    <div className="text-xs flex items-center text-gray-500">
                      <FaTasks className="mr-1" />
                      {users[1].task_count} tasks
                    </div>
                  </div>
                )}
                
                {/* First Place - Champion */}
                {users[0] && (
                  <div className="flex flex-col items-center order-1 md:order-2 transform scale-110">
                    <div className="relative">
                      {users[0].profile_picture_url ? (
                        <img
                          src={users[0].profile_picture_url}
                          alt={users[0].display_name}
                          className="w-20 h-20 rounded-full object-cover border-4 border-yellow-400"
                        />
                      ) : (
                        <div className="w-20 h-20 rounded-full bg-yellow-100 flex items-center justify-center">
                          <FaCrown className="text-4xl text-yellow-500" />
                        </div>
                      )}
                      <div className="absolute -bottom-2 -right-2 bg-yellow-500 text-white rounded-full w-8 h-8 flex items-center justify-center text-lg font-bold shadow-md">
                        1
                      </div>
                    </div>
                    <Link to={`/users/${users[0].id}`} className="mt-2 font-bold text-gray-800 hover:text-purple-600">
                      {users[0].display_name}
                    </Link>
                    <div className="text-sm flex items-center text-gray-700 font-medium">
                      <FaTasks className="mr-1" />
                      {users[0].task_count} tasks
                    </div>
                  </div>
                )}
                
                {/* Third Place */}
                {users[2] && (
                  <div className="flex flex-col items-center order-3">
                    <div className="relative">
                      {users[2].profile_picture_url ? (
                        <img
                          src={users[2].profile_picture_url}
                          alt={users[2].display_name}
                          className="w-16 h-16 rounded-full object-cover border-2 border-amber-600"
                        />
                      ) : (
                        <div className="w-16 h-16 rounded-full bg-amber-100 flex items-center justify-center">
                          <FaAward className="text-3xl text-amber-700" />
                        </div>
                      )}
                      <div className="absolute -bottom-2 -right-2 bg-amber-700 text-white rounded-full w-7 h-7 flex items-center justify-center text-sm font-bold">
                        3
                      </div>
                    </div>
                    <Link to={`/users/${users[2].id}`} className="mt-2 font-medium text-gray-800 text-sm hover:text-purple-600">
                      {users[2].display_name}
                    </Link>
                    <div className="text-xs flex items-center text-gray-500">
                      <FaTasks className="mr-1" />
                      {users[2].task_count} tasks
                    </div>
                  </div>
                )}
              </div>
            )}
            
            {/* Rank List */}
            <div className="mt-4">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Rank
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      User
                    </th>
                    <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Tasks Completed
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {users.map((user, index) => (
                    <tr key={user.id} className={index < 3 ? 'bg-purple-50' : ''}>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <span className="flex-shrink-0 h-6 w-6 flex items-center justify-center">
                            {getRankIcon(index)}
                          </span>
                          <span className="ml-2 text-sm font-medium text-gray-900">{index + 1}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <div className="flex-shrink-0 h-10 w-10">
                            {user.profile_picture_url ? (
                              <img className="h-10 w-10 rounded-full object-cover" src={user.profile_picture_url} alt="" />
                            ) : (
                              <div className="h-10 w-10 rounded-full bg-gray-200 flex items-center justify-center">
                                <span className="text-gray-500">👤</span>
                              </div>
                            )}
                          </div>
                          <div className="ml-4">
                            <Link to={`/users/${user.id}`} className="text-sm font-medium text-gray-900 hover:text-purple-600">
                              {user.display_name}
                            </Link>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <span className="bg-purple-100 text-purple-800 px-2.5 py-0.5 rounded-full">
                          {user.task_count} tasks
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Leaderboard; 