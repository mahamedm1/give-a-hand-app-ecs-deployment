import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import supabase from '../helper/supabaseClient';
import { fetchMyCommunities } from '../helper/communities';
import { CATEGORIES } from '../helper/categories';

// Shared with profile skills so suggestions can match them
const categories = CATEGORIES;

function PostTask() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  
  const [formData, setFormData] = useState({
    title: '',
    category: '',
    description: '',
    completionDate: '',
    estimatedDuration: '',
    visibility: 'public'
  });
  const [myCommunities, setMyCommunities] = useState([]);
  const [searchParams] = useSearchParams();

  // Load the communities you can post to; "Post a task here" links preselect one
  useEffect(() => {
    const load = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        const mine = await fetchMyCommunities(user?.id);
        setMyCommunities(mine);
        const preselect = searchParams.get('community');
        if (preselect && mine.some(c => c.id === preselect)) {
          setFormData(prev => ({ ...prev, visibility: preselect }));
        }
      } catch (err) {
        console.error('Error loading your communities:', err);
      }
    };
    load();
  }, [searchParams]);
  
  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prevData => ({
      ...prevData,
      [name]: value
    }));
  };
  
  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    
    try {
      // Get current user
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        throw new Error("You must be logged in to post a task");
      }
      
      // Insert task into database
      const { error: insertError } = await supabase
        .from('tasks')
        .insert({
          title: formData.title,
          category: formData.category,
          description: formData.description,
          completion_date: formData.completionDate,
          estimated_duration: formData.estimatedDuration,
          user_id: user.id,
          status: 'open',
          // null = public; otherwise members-only (the database checks you're a member)
          community_id: formData.visibility === 'public' ? null : formData.visibility
        })
        .select();
      
      if (insertError) throw insertError;
      
      // Redirect to task details page or tasks list
      navigate(formData.visibility === 'public' ? '/tasks' : `/communities/${formData.visibility}`);
      
    } catch (err) {
      console.error('Error posting task:', err);
      setError(err.message || 'Failed to post task. Please try again.');
    } finally {
      setLoading(false);
    }
  };
  
  return (
    <div className="max-w-2xl mx-auto my-8 p-6 bg-white rounded-lg shadow-md">
      <h1 className="text-3xl font-bold text-center mb-6">Post a New Task</h1>
      
      {error && (
        <div className="mb-4 p-3 bg-red-100 text-red-700 border border-red-200 rounded">
          {error}
        </div>
      )}
      
      <form onSubmit={handleSubmit} className="space-y-6">
        <div>
          <label htmlFor="visibility" className="block text-sm font-medium text-gray-700 mb-1">
            Who can see this task?*
          </label>
          <select
            id="visibility"
            name="visibility"
            value={formData.visibility}
            onChange={handleChange}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500"
          >
            <option value="public">Everyone (public)</option>
            {myCommunities.map(c => (
              <option key={c.id} value={c.id}>Only members of {c.name}</option>
            ))}
          </select>
          <p className="text-xs text-gray-500 mt-1">
            {formData.visibility === 'public'
              ? 'Anyone using Give a Hand can see and offer to help.'
              : 'Only people in this community will see it.'}
            {myCommunities.length === 0 && (
              <> Join a <Link to="/communities" className="text-orange-500 hover:underline">community</Link> to post just for them.</>
            )}
          </p>
        </div>

        <div>
          <label htmlFor="title" className="block text-sm font-medium text-gray-700 mb-1">
            Task Title*
          </label>
          <input
            type="text"
            id="title"
            name="title"
            value={formData.title}
            onChange={handleChange}
            required
            placeholder="E.g., Help with garden cleanup"
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500"
          />
        </div>
        
        <div>
          <label htmlFor="category" className="block text-sm font-medium text-gray-700 mb-1">
            Category*
          </label>
          <select
            id="category"
            name="category"
            value={formData.category}
            onChange={handleChange}
            required
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500"
          >
            <option value="">Select a category</option>
            {categories.map(category => (
              <option key={category} value={category}>{category}</option>
            ))}
          </select>
        </div>
        
        <div>
          <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-1">
            Description*
          </label>
          <textarea
            id="description"
            name="description"
            value={formData.description}
            onChange={handleChange}
            required
            rows={5}
            placeholder="Describe the task in detail - what needs to be done, any specific requirements, etc."
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500"
          />
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label htmlFor="completionDate" className="block text-sm font-medium text-gray-700 mb-1">
              Desired Completion Date*
            </label>
            <input
              type="date"
              id="completionDate"
              name="completionDate"
              value={formData.completionDate}
              onChange={handleChange}
              required
              min={new Date().toISOString().split('T')[0]}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500"
            />
          </div>
          
          <div>
            <label htmlFor="estimatedDuration" className="block text-sm font-medium text-gray-700 mb-1">
              Estimated Duration
            </label>
            <select
              id="estimatedDuration"
              name="estimatedDuration"
              value={formData.estimatedDuration}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500"
            >
              <option value="">Select duration</option>
              <option value="Less than 1 hour">Less than 1 hour</option>
              <option value="1-2 hours">1-2 hours</option>
              <option value="2-4 hours">2-4 hours</option>
              <option value="Half a day">Half a day</option>
              <option value="Full day">Full day</option>
              <option value="2-3 days">2-3 days</option>
              <option value="3-7 days">3-7 days</option>
              <option value="1-2 weeks">1-2 weeks</option>
              <option value="2-4 weeks">2-4 weeks</option>
              <option value="More than a month">More than a month</option>
            </select>
          </div>
        </div>
        
        <button
          type="submit"
          disabled={loading}
          className={`w-full py-3 px-4 bg-orange-500 text-white font-medium rounded-md hover:bg-orange-600 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:ring-offset-2 ${loading ? 'opacity-70 cursor-not-allowed' : ''}`}
        >
          {loading ? 'Posting...' : 'Post Task'}
        </button>
      </form>
    </div>
  );
}

export default PostTask;