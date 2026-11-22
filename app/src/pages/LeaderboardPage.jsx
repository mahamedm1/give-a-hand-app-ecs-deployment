import React from 'react';
import Leaderboard from '../components/Leaderboard';

const LeaderboardPage = () => {
  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-5xl mx-auto">
        <h1 className="text-3xl font-bold text-gray-800 mb-6">Task Champions</h1>
        <p className="text-gray-600 mb-8">
          Check out our top task completers! The more tasks you complete, the higher you'll climb on our leaderboard.
        </p>
        <Leaderboard />
      </div>
    </div>
  );
};

export default LeaderboardPage; 