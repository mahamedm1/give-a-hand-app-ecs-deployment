import { useState, useEffect } from 'react';
import { FaStar, FaRegStar, FaUser } from 'react-icons/fa';
import { Link } from 'react-router-dom';
import supabase from '../helper/supabaseClient';

function ReviewsList({ userId, refreshTrigger = 0 }) {
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [averageRating, setAverageRating] = useState(0);
  const [reviewsCount, setReviewsCount] = useState(0);

  const fetchReviews = async () => {
    if (!userId) return;
    
    try {
      setLoading(true);
      
      // Fetch user's average rating and reviews count - force fresh data
      const { data: userData, error: userError } = await supabase
        .from('users')
        .select('average_rating, reviews_count')
        .eq('id', userId)
        .single();
        
      if (userError) throw userError;
      
      setAverageRating(userData.average_rating || 0);
      setReviewsCount(userData.reviews_count || 0);
      
      // Fetch all reviews for the user - force fresh data
      const { data: reviewsData, error: reviewsError } = await supabase
        .from('user_reviews')
        .select(`
          id,
          rating,
          comment,
          created_at,
          reviewer:reviewer_id (
            id,
            display_name,
            profile_picture_url
          ),
          task:task_id (
            title
          )
        `)
        .eq('reviewed_user_id', userId)
        .order('created_at', { ascending: false });
        
      if (reviewsError) throw reviewsError;
      
      setReviews(reviewsData || []);
    } catch (err) {
      console.error('Error fetching reviews:', err);
      setError('Failed to load reviews');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReviews();
    
  }, [userId, refreshTrigger]);

  // Helper function to format the date
  const formatDate = (dateStr) => {
    const options = { year: 'numeric', month: 'short', day: 'numeric' };
    return new Date(dateStr).toLocaleDateString(undefined, options);
  };
  
  // Helper function to render stars
  const renderStars = (rating) => {
    return (
      <div className="flex">
        {[...Array(5)].map((_, i) => (
          <span key={i} className="text-yellow-400">
            {i < Math.round(rating) ? <FaStar /> : <FaRegStar />}
          </span>
        ))}
      </div>
    );
  };

  if (loading) {
    return <div className="text-center py-4">Loading reviews...</div>;
  }

  if (error) {
    return <div className="text-red-600 py-4">{error}</div>;
  }

  return (
    <div>
      <div className="mb-6">
        <div className="flex items-center gap-2">
          <h2 className="text-xl font-semibold">Reviews</h2>
          {reviewsCount > 0 && (
            <span className="bg-gray-100 px-2 py-1 rounded-full text-sm font-medium">
              {reviewsCount}
            </span>
          )}
        </div>
        
        {reviewsCount > 0 && (
          <div className="mt-2 flex items-center">
            <div className="flex text-yellow-400 text-lg">
              {renderStars(averageRating)}
            </div>
            <span className="ml-2 font-medium">{averageRating.toFixed(1)}</span>
            <span className="ml-1 text-gray-500">({reviewsCount} reviews)</span>
          </div>
        )}
      </div>

      {reviews.length > 0 && (
        <div className="space-y-4">
          {reviews.map((review) => (
            <div key={review.id} className="border rounded-lg p-4 bg-white">
              <div className="flex justify-between">
                <div className="flex items-center">
                  {review.reviewer.profile_picture_url ? (
                    <img 
                      src={review.reviewer.profile_picture_url} 
                      alt={review.reviewer.display_name}
                      className="w-10 h-10 rounded-full object-cover mr-3"
                    />
                  ) : (
                    <div className="w-10 h-10 rounded-full bg-gray-200 flex items-center justify-center mr-3">
                      <FaUser className="text-gray-500" />
                    </div>
                  )}
                  <div>
                    <Link to={`/users/${review.reviewer.id}`} className="font-medium hover:text-orange-500 hover:underline">
                      {review.reviewer.display_name || 'Anonymous'}
                    </Link>
                    <p className="text-xs text-gray-500">{formatDate(review.created_at)}</p>
                  </div>
                </div>
                
                <div className="flex text-yellow-400">
                  {renderStars(review.rating)}
                </div>
              </div>
              
              {review.task && (
                <div className="mt-2 mb-1 text-sm">
                  <span className="text-gray-500">Task:</span> <span className="font-medium">{review.task.title}</span>
                </div>
              )}
              
              {review.comment && (
                <p className="mt-2 text-gray-700">{review.comment}</p>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default ReviewsList; 
 
