import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import supabase from '../helper/supabaseClient';
import { todayISO } from '../helper/taskStatus';
import WelcomeChecklist from '../components/WelcomeChecklist';
import { formatDuration } from '../helper/formatDuration';
import { FaStar, FaExchangeAlt, FaUsers, FaCheck } from 'react-icons/fa';

const Home = () => {
  const [featuredTasks, setFeaturedTasks] = useState([]);
  const [stats, setStats] = useState({
    totalTasks: 0,
    completedTasks: 0,
    totalUsers: 0
  });

  useEffect(() => {
    // Fetch featured tasks
    const fetchFeaturedTasks = async () => {
      try {
        const { data, error } = await supabase
          .from('tasks')
          .select(`
            id,
            title,
            description,
            category,
            estimated_duration,
            created_at,
            users (
              id,
              display_name,
              profile_picture_url
            )
          `)
          .eq('status', 'open')
          .gte('completion_date', todayISO()) // hide tasks past their needed-by date
          .order('created_at', { ascending: false })
          .limit(3);

        if (error) throw error;
        setFeaturedTasks(data || []);
      } catch (err) {
        console.error('Error fetching featured tasks:', err);
      }
    };

    // Fetch stats
    const fetchStats = async () => {
      try {
        // Try RPC call to get task swaps count (bypasses RLS)
        const { data: swapData, error: swapError } = await supabase
          .rpc('get_total_task_swaps');
          
        if (swapError) {
          console.error('RPC not available, trying direct count:', swapError);
          // Fall back to direct query
          const { data: fallbackData, error: fallbackError } = await supabase
            .from('task_swaps')
            .select('id');
            
          if (fallbackError) {
            console.error('Swap count error:', fallbackError);
            // Show 0 rather than a made-up number
            setStats(prev => ({ ...prev, totalTasks: 0 }));
          } else {
            setStats(prev => ({
              ...prev,
              totalTasks: fallbackData?.length || 0
            }));
          }
        } else {
          // RPC call succeeded
          setStats(prev => ({
            ...prev, 
            totalTasks: swapData?.count || 0
          }));
        }

        // Get completed tasks
        const { count: completedTasks, error: completedError } = await supabase
          .from('tasks')
          .select('*', { count: 'exact', head: true })
          .eq('status', 'completed');
          
        if (!completedError) {
          setStats(prev => ({
            ...prev,
            completedTasks: completedTasks || 0
          }));
        }

        // Get total users
        const { count: totalUsers, error: usersError } = await supabase
          .from('users')
          .select('id', { count: 'exact', head: true });
          
        if (!usersError) {
          setStats(prev => ({
            ...prev,
            totalUsers: totalUsers || 0
          }));
        }
      } catch (err) {
        console.error('Error fetching stats:', err);
      }
    };

    fetchFeaturedTasks();
    fetchStats();
  }, []);

  return (
    <div className="min-h-screen">
      <WelcomeChecklist />
      {/* Hero Section */}
      <section className="bg-gradient-to-br from-secondary to-white py-20">
        <div className="container flex flex-col md:flex-row items-center">
          <div className="md:w-1/2 mb-10 md:mb-0">
            <h1 className="text-4xl md:text-5xl font-bold mb-6">
              <span className="text-primary">Trade Tasks,</span>
              <br />
              <span className="text-dark">Not Money</span>
            </h1>
            <p className="text-lg mb-8 text-gray-600 max-w-xl">
              Exchange your talents with others across your community.
              Need gardening help? Offer cooking lessons. Give a Hand connects
              people who want to trade services instead of cash.
            </p>
            <div className="flex flex-col sm:flex-row gap-4">
              <Link to="/tasks" className="btn-primary text-center">
                Find Tasks
              </Link>
              <Link to="/post-task" className="btn-outline text-center">
                Post a Task
              </Link>
            </div>
          </div>
          <div className="md:w-1/2 relative flex justify-center">
            <div className="w-full max-w-md bg-white rounded-lg shadow-xl overflow-hidden">
              <div className="p-1 bg-primary"></div>
              <div className="p-6">
                <h3 className="text-xl font-bold text-gray-800 mb-3">Exchange Skills, Build Community</h3>
                <p className="text-gray-600 mb-4">
                  Our platform helps you connect with others in your community to exchange 
                  skills and services without money changing hands.
                </p>
                <div className="flex flex-wrap gap-2 mb-4">
                  <span className="bg-primary bg-opacity-10 text-primary px-2 py-1 rounded text-sm">Technology</span>
                  <span className="bg-primary bg-opacity-10 text-primary px-2 py-1 rounded text-sm">Gardening</span>
                  <span className="bg-primary bg-opacity-10 text-primary px-2 py-1 rounded text-sm">Education</span>
                  <span className="bg-primary bg-opacity-10 text-primary px-2 py-1 rounded text-sm">Home Repairs</span>
                </div>
                <Link to="/tasks" className="text-primary font-medium hover:text-primary-dark">
                  Discover available tasks →
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="py-10 bg-primary bg-opacity-5">
        <div className="container">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-center">
            <div className="p-6">
              <div className="flex justify-center mb-4">
                <FaExchangeAlt className="text-5xl text-primary" />
              </div>
              <div className="text-4xl font-bold text-gray-800 mb-2">{stats.totalTasks}</div>
              <p className="text-gray-600">Task Swaps</p>
            </div>
            <div className="p-6">
              <div className="flex justify-center mb-4">
                <FaUsers className="text-5xl text-primary" />
              </div>
              <div className="text-4xl font-bold text-gray-800 mb-2">{stats.totalUsers}</div>
              <p className="text-gray-600">Active Members</p>
            </div>
            <div className="p-6">
              <div className="flex justify-center mb-4">
                <FaCheck className="text-5xl text-primary" />
              </div>
              <div className="text-4xl font-bold text-gray-800 mb-2">{stats.completedTasks}</div>
              <p className="text-gray-600">Tasks Completed</p>
            </div>
          </div>
        </div>
      </section>

      {/* How It Works Section */}
      <section className="py-20">
        <div className="container">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold mb-4">How It Works</h2>
            <p className="text-gray-600 max-w-2xl mx-auto">
              Give a Hand makes it easy to exchange tasks with others in your community.
              Here's how you can get started.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="bg-white p-6 rounded-lg shadow-md text-center">
              <div className="w-16 h-16 bg-primary bg-opacity-10 rounded-full flex items-center justify-center mx-auto mb-6">
                <span className="text-primary text-2xl font-bold">1</span>
              </div>
              <h3 className="text-xl font-bold mb-3">Create Your Profile</h3>
              <p className="text-gray-600">
                Sign up and list the skills you can offer to others in your community.
              </p>
            </div>

            <div className="bg-white p-6 rounded-lg shadow-md text-center">
              <div className="w-16 h-16 bg-primary bg-opacity-10 rounded-full flex items-center justify-center mx-auto mb-6">
                <span className="text-primary text-2xl font-bold">2</span>
              </div>
              <h3 className="text-xl font-bold mb-3">Find or Post Tasks</h3>
              <p className="text-gray-600">
                Browse available tasks or post your own request for help from others.
              </p>
            </div>

            <div className="bg-white p-6 rounded-lg shadow-md text-center">
              <div className="w-16 h-16 bg-primary bg-opacity-10 rounded-full flex items-center justify-center mx-auto mb-6">
                <span className="text-primary text-2xl font-bold">3</span>
              </div>
              <h3 className="text-xl font-bold mb-3">Exchange Skills</h3>
              <p className="text-gray-600">
                Help others with their tasks, and get help with yours in return - no money involved.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Featured Tasks Section */}
      <section className="py-20 bg-gray-50">
        <div className="container">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold mb-4">Featured Tasks</h2>
            <p className="text-gray-600 max-w-2xl mx-auto">
              Check out some of the latest tasks that community members are looking for help with.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {featuredTasks.length > 0 ? (
              featuredTasks.map((task) => (
                <div key={task.id} className="bg-white rounded-lg shadow-md overflow-hidden">
                  <div className="p-6">
                    <h3 className="font-bold text-xl mb-2"><Link to={`/tasks/${task.id}`} className="hover:text-orange-500">{task.title}</Link></h3>
                    <p className="text-gray-600 mb-4 line-clamp-3">{task.description}</p>
                    <div className="flex items-center text-sm text-gray-500 mb-4">
                      <span className="bg-primary bg-opacity-10 text-primary px-2 py-1 rounded">{task.category}</span>
                      <span className="ml-auto">{formatDuration(task.estimated_duration)}</span>
                    </div>
                    <div className="flex items-center">
                      <div className="flex-shrink-0 mr-3">
                        {task.users?.profile_picture_url ? (
                          <img 
                            src={task.users.profile_picture_url} 
                            alt={task.users.display_name} 
                            className="w-10 h-10 rounded-full object-cover"
                          />
                        ) : (
                          <div className="w-10 h-10 rounded-full bg-gray-300 flex items-center justify-center text-gray-600">
                            {task.users?.display_name?.charAt(0) || '?'}
                          </div>
                        )}
                      </div>
                      <div>
                        {task.users?.id ? (
                          <Link to={`/users/${task.users.id}`} className="text-sm font-medium hover:text-orange-500 hover:underline">
                            {task.users.display_name || 'Anonymous'}
                          </Link>
                        ) : (
                          <p className="text-sm font-medium">{task.users?.display_name || 'Anonymous'}</p>
                        )}
                        <p className="text-xs text-gray-500">{new Date(task.created_at).toLocaleDateString()}</p>
                      </div>
                      <Link to={`/tasks/${task.id}`} className="ml-auto text-primary hover:text-primary-dark">
                        View Details
                      </Link>
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <div className="col-span-3 text-center py-8">
                <p className="text-gray-500">Loading featured tasks...</p>
              </div>
            )}
          </div>
          <div className="text-center mt-10">
            <Link to="/tasks" className="btn-primary">
              Browse All Tasks
            </Link>
          </div>
        </div>
      </section>

      {/* Popular Categories Section */}
      <section className="py-20">
        <div className="container">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold mb-4">Popular Categories</h2>
            <p className="text-gray-600 max-w-2xl mx-auto">
              Browse some of the most popular skill categories that people are exchanging on Give a Hand.
            </p>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            <div className="bg-white p-6 rounded-lg shadow-sm hover:shadow-md transition-all text-center cursor-pointer">
              <div className="w-16 h-16 mx-auto mb-4 flex items-center justify-center">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 10l-2 1m0 0l-2-1m2 1v2.5M20 7l-2 1m2-1l-2-1m2 1v2.5M14 4l-2-1-2 1M4 7l2-1M4 7l2 1M4 7v2.5M12 21l-2-1m2 1l2-1m-2 1v-2.5M6 18l-2-1v-2.5M18 18l2-1v-2.5" />
                </svg>
              </div>
              <h3 className="font-bold mb-2">Home Repairs</h3>
              <p className="text-gray-600 text-sm">Plumbing, electrical, general fixes</p>
            </div>

            <div className="bg-white p-6 rounded-lg shadow-sm hover:shadow-md transition-all text-center cursor-pointer">
              <div className="w-16 h-16 mx-auto mb-4 flex items-center justify-center">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 10a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1h-4a1 1 0 01-1-1v-4z" />
                </svg>
              </div>
              <h3 className="font-bold mb-2">Gardening</h3>
              <p className="text-gray-600 text-sm">Planting, lawn care, pruning</p>
            </div>

            <div className="bg-white p-6 rounded-lg shadow-sm hover:shadow-md transition-all text-center cursor-pointer">
              <div className="w-16 h-16 mx-auto mb-4 flex items-center justify-center">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                </svg>
              </div>
              <h3 className="font-bold mb-2">Education</h3>
              <p className="text-gray-600 text-sm">Tutoring, language learning, skills</p>
            </div>

            <div className="bg-white p-6 rounded-lg shadow-sm hover:shadow-md transition-all text-center cursor-pointer">
              <div className="w-16 h-16 mx-auto mb-4 flex items-center justify-center">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
              </div>
              <h3 className="font-bold mb-2">Technology</h3>
              <p className="text-gray-600 text-sm">Computer help, software, websites</p>
            </div>
          </div>
        </div>
      </section>

     
      <section className="py-20 bg-gray-50">
        <div className="container">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold mb-4">Why People Love Our Platform</h2>
            <p className="text-gray-600 max-w-2xl mx-auto">
              Our platform offers unique benefits for everyone in the community.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="bg-white p-8 rounded-lg shadow-md">
              <div className="w-16 h-16 bg-primary bg-opacity-10 rounded-full flex items-center justify-center text-primary mb-6">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <h3 className="text-xl font-bold mb-3">Save Money</h3>
              <p className="text-gray-600">
                Exchange services without spending cash. Get things done by trading your skills 
                instead of using your wallet.
              </p>
            </div>
            
            <div className="bg-white p-8 rounded-lg shadow-md">
              <div className="w-16 h-16 bg-primary bg-opacity-10 rounded-full flex items-center justify-center text-primary mb-6">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
              </div>
              <h3 className="text-xl font-bold mb-3">Build Community</h3>
              <p className="text-gray-600">
                Meet neighbors and form connections while helping each other.
                Create a stronger local community through meaningful exchanges.
              </p>
            </div>
            
            <div className="bg-white p-8 rounded-lg shadow-md">
              <div className="w-16 h-16 bg-primary bg-opacity-10 rounded-full flex items-center justify-center text-primary mb-6">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
              </div>
              <h3 className="text-xl font-bold mb-3">Develop Skills</h3>
              <p className="text-gray-600">
                Practice and improve your skills by helping others. Learn new abilities 
                by connecting with skilled people in your community.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 bg-primary bg-opacity-10">
        <div className="container text-center">
          <h2 className="text-3xl font-bold mb-6">Ready to Join Our Community?</h2>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto mb-8">
            Start exchanging tasks with others in your community today.
            Join Give a Hand and be part of a growing network of people helping each other.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link to="/signup" className="btn-primary">
              Sign Up Now
            </Link>
            <Link to="/tasks" className="btn-outline">
              Browse Tasks
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
};

export default Home; 