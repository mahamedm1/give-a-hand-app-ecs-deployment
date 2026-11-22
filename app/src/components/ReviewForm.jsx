import { useState } from 'react';
import { FaStar } from 'react-icons/fa';
import supabase from '../helper/supabaseClient';

function ReviewForm({ targetUserId, taskId, onReviewSubmitted, currentUser }) {
  const [rating, setRating] = useState(0);
  const [hover, setHover] = useState(0);
  const [comment, setComment] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);

  const handleSubmitReview = async (e) => {
    e.preventDefault();
    
    if (!currentUser) {
      setError('You must be logged in to leave a review');
      return;
    }
    
    if (rating === 0) {
      setError('Please select a rating');
      return;
    }
    
    try {
      setLoading(true);
      setError(null);
      
      const { data, error: submitError } = await supabase
        .from('user_reviews')
        .insert({
          reviewer_id: currentUser.id,
          reviewed_user_id: targetUserId,
          rating,
          comment: comment.trim() || null,
          task_id: taskId || null
        })
        .select();
        
      if (submitError) {
        // Check if it's a duplicate review error
        if (submitError.code === '23505') {
          setError('You have already reviewed this user for this task');
        } else {
          throw submitError;
        }
      } else {
        setSuccess(true);
        setRating(0);
        setComment('');
        if (onReviewSubmitted) {
          onReviewSubmitted(data[0]);
        }
      }
    } catch (err) {
      console.error('Error submitting review:', err);
      setError('Failed to submit review. Please try again later.');
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="bg-green-50 p-4 rounded-lg border border-green-200 text-green-800">
        <p className="font-medium">Thank you for your review!</p>
        <p className="text-sm mt-1">Your feedback helps the community.</p>
        <button 
          onClick={() => setSuccess(false)} 
          className="mt-2 text-sm text-green-700 hover:text-green-900"
        >
          Write another review
        </button>
      </div>
    );
  }

  return (
    <div className="bg-white p-4 rounded-lg shadow">
      <h3 className="text-lg font-medium mb-3">Leave a Review</h3>
      
      {error && (
        <div className="bg-red-50 p-3 rounded mb-3 text-red-800 text-sm">
          {error}
        </div>
      )}
      
      <form onSubmit={handleSubmitReview}>
        <div className="mb-4">
          <p className="mb-2 text-gray-700">Rating</p>
          <div className="flex">
            {[...Array(5)].map((_, index) => {
              const starValue = index + 1;
              return (
                <button
                  type="button"
                  key={starValue}
                  className={`text-2xl ${
                    starValue <= (hover || rating) ? 'text-yellow-400' : 'text-gray-300'
                  }`}
                  onClick={() => setRating(starValue)}
                  onMouseEnter={() => setHover(starValue)}
                  onMouseLeave={() => setHover(0)}
                >
                  <FaStar />
                </button>
              );
            })}
          </div>
        </div>
        
        <div className="mb-4">
          <label htmlFor="comment" className="block mb-2 text-gray-700">
            Comment (optional)
          </label>
          <textarea
            id="comment"
            rows="3"
            className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-300"
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            placeholder="Share your experience working with this user..."
          ></textarea>
        </div>
        
        <button
          type="submit"
          disabled={loading}
          className={`px-4 py-2 rounded-md bg-orange-500 text-white ${
            loading ? 'opacity-70 cursor-not-allowed' : 'hover:bg-orange-600'
          }`}
        >
          {loading ? 'Submitting...' : 'Submit Review'}
        </button>
      </form>
    </div>
  );
}

export default ReviewForm; 

