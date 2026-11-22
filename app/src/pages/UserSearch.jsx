import { useState, useEffect } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import supabase from '../helper/supabaseClient';
import { FaUserCircle, FaStar } from 'react-icons/fa';
import UserSearchBar from '../components/UserSearchBar';

function UserSearch() {
  const [searchParams] = useSearchParams();
  const query = searchParams.get('q') || '';
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const [currentUserId, setCurrentUserId] = useState(null);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setCurrentUserId(data?.user?.id || null));
  }, []);

  useEffect(() => {
    async function searchUsers() {
      try {
        setLoading(true);
        setError(null);

        // With no search term, list everyone; otherwise search by
        // display name, first name, last name, or city
        let request = supabase
          .from('users')
          .select('id, display_name, first_name, last_name, profile_picture_url, average_rating, reviews_count, city, skills')
          .order('display_name', { ascending: true })
          .limit(100);

        const term = query.trim().replace(/[,()%]/g, ' ');
        if (term) {
          // Email isn't searchable: it's private (see supabase/privacy.sql)
          request = request.or(`display_name.ilike.%${term}%,first_name.ilike.%${term}%,last_name.ilike.%${term}%,city.ilike.%${term}%`);
        }

        const { data, error: searchError } = await request;

        if (searchError) throw searchError;
        setUsers(data || []);
      } catch (err) {
        console.error('Error searching users:', err);
        setError('Failed to search users. Please try again.');
      } finally {
        setLoading(false);
      }
    }
    
    searchUsers();
  }, [query]);

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-2xl font-bold mb-6">Find Users</h1>
        
        <UserSearchBar className="mb-8" />
        
        {!loading && !error && (
          <h2 className="text-lg font-medium mb-4">
            {query
              ? (users.length === 0 ? 'No users found' : `Results for "${query}" (${users.length} users)`)
              : `All users (${users.length})`}
          </h2>
        )}
        
        {loading ? (
          <div className="flex justify-center py-8">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-orange-500"></div>
          </div>
        ) : error ? (
          <div className="bg-red-50 p-4 rounded-lg text-red-800">
            {error}
          </div>
        ) : (
          <div className="grid gap-4 grid-cols-1 md:grid-cols-2">
            {users.map(user => (
              <Link 
                key={user.id} 
                to={`/users/${user.id}`}
                className="border rounded-lg p-4 bg-white hover:shadow-md transition flex items-center gap-4"
              >
                <div className="flex-shrink-0">
                  {user.profile_picture_url ? (
                    <img 
                      src={user.profile_picture_url} 
                      alt={user.display_name || 'User'} 
                      className="w-16 h-16 rounded-full object-cover"
                    />
                  ) : (
                    <div className="w-16 h-16 rounded-full bg-gray-200 flex items-center justify-center">
                      <FaUserCircle className="text-gray-400 text-4xl" />
                    </div>
                  )}
                </div>
                <div>
                  <h3 className="font-medium text-lg">
                    {user.display_name || `${user.first_name || ''} ${user.last_name || ''}`.trim() || 'User'}
                    {user.id === currentUserId && <span className="ml-2 text-xs text-gray-500">(you)</span>}
                  </h3>
                  {user.city && <p className="text-gray-600">{user.city}</p>}
                  {user.reviews_count > 0 && (
                    <div className="flex items-center mt-1 text-sm">
                      <FaStar className="text-yellow-400 mr-1" />
                      <span>{user.average_rating.toFixed(1)}</span>
                      <span className="text-gray-500 ml-1">({user.reviews_count} reviews)</span>
                    </div>
                  )}
                </div>
              </Link>
            ))}
          </div>
        )}
        
      </div>
    </div>
  );
}

export default UserSearch; 