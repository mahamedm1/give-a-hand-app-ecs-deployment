import React, { useState } from 'react';
import { requestTaskCompletion } from '../helper/taskStatus';

function TaskCompletionButton({ taskId, taskOwnerId, currentUserId, onRequested }) {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleCompletionRequest = async () => {
    setIsLoading(true);
    setError(null);

    try {
      await requestTaskCompletion({ taskId, taskOwnerId, currentUserId });
      alert('Completion request sent. The task owner will be asked to confirm.');
      onRequested?.();
    } catch (err) {
      setError(err.message);
      console.error('Error sending completion request:', err);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div>
      <button
        onClick={handleCompletionRequest}
        disabled={isLoading}
        className={`px-4 py-2 rounded-md text-white ${
          isLoading
            ? 'bg-gray-400 cursor-not-allowed'
            : 'bg-green-600 hover:bg-green-700'
        }`}
      >
        {isLoading ? 'Sending Request...' : 'Mark as Completed'}
      </button>
      {error && (
        <p className="mt-2 text-red-600 text-sm">{error}</p>
      )}
    </div>
  );
}

export default TaskCompletionButton;
