import React, { useState, useEffect } from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line
} from 'recharts';
import supabase from '../helper/supabaseClient';

function TaskCompletionChart({ userId }) {
  const [dailyData, setDailyData] = useState([]);
  const [statusData, setStatusData] = useState([]);
  const [trendsData, setTrendsData] = useState([]);
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth());
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [loading, setLoading] = useState(true);

  const months = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  const years = Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - i);
  
  // Colors for the pie chart
  const COLORS = ['#16a34a', '#f97316', '#dc2626'];

  useEffect(() => {
    async function fetchAnalyticsData() {
      if (!userId) return;
      
      try {
        setLoading(true);
        
        // Calculate the start and end dates for the selected month
        const startDate = new Date(selectedYear, selectedMonth, 1).toISOString();
        const endDate = new Date(selectedYear, selectedMonth + 1, 0).toISOString();

        // 1. Fetch daily completion data
        const { data: completionsData, error: completionsError } = await supabase
          .from('task_completion_requests')
          .select('created_at, status')
          .eq('requester_id', userId)
          .eq('status', 'accepted')
          .gte('created_at', startDate)
          .lte('created_at', endDate);

        if (completionsError) throw completionsError;

        // 2. Fetch all requests by status
        const { data: statusRequestsData, error: statusError } = await supabase
          .from('task_completion_requests')
          .select('status, created_at')
          .eq('requester_id', userId)
          .gte('created_at', startDate)
          .lte('created_at', endDate);

        if (statusError) throw statusError;

        // 3. Fetch monthly trends data (for the last 6 months)
        const sixMonthsAgo = new Date();
        sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 5);
        sixMonthsAgo.setDate(1);
        const sixMonthsAgoStr = sixMonthsAgo.toISOString();

        const { data: trendsRequestsData, error: trendsError } = await supabase
          .from('task_completion_requests')
          .select('status, created_at')
          .eq('requester_id', userId)
          .gte('created_at', sixMonthsAgoStr);

        if (trendsError) throw trendsError;
        
        // 4. Fetch task swap data for the same period
        const { data: swapRequestsData, error: swapError } = await supabase
          .from('task_swaps')
          .select('status, created_at, sender_id, recipient_id')
          .or(`sender_id.eq.${userId},recipient_id.eq.${userId}`)
          .gte('created_at', sixMonthsAgoStr);
        
        if (swapError) throw swapError;

        // Process daily completions data
        const dailyCounts = {};
        completionsData?.forEach(task => {
          const date = new Date(task.created_at).getDate();
          dailyCounts[date] = (dailyCounts[date] || 0) + 1;
        });

        // Format daily data
        const daysInMonth = new Date(selectedYear, selectedMonth + 1, 0).getDate();
        const formattedDailyData = [];
        
        for (let i = 1; i <= daysInMonth; i++) {
          formattedDailyData.push({
            day: i,
            count: dailyCounts[i] || 0
          });
        }

        // Process status data for pie chart
        const statusCounts = {
          accepted: 0,
          pending: 0,
          rejected: 0
        };

        statusRequestsData?.forEach(request => {
          if (statusCounts[request.status] !== undefined) {
            statusCounts[request.status]++;
          }
        });

        const formattedStatusData = [
          { name: 'Accepted', value: statusCounts.accepted },
          { name: 'Pending', value: statusCounts.pending },
          { name: 'Rejected', value: statusCounts.rejected }
        ];

        // Process trends data
        const monthlyData = {};
        
        trendsRequestsData?.forEach(request => {
          const date = new Date(request.created_at);
          const monthYear = `${date.getFullYear()}-${date.getMonth()}`;
          
          if (!monthlyData[monthYear]) {
            monthlyData[monthYear] = {
              month: `${months[date.getMonth()].substring(0, 3)} ${date.getFullYear().toString().substring(2)}`,
              accepted: 0,
              pending: 0,
              rejected: 0,
              total: 0,
              swaps_accepted: 0,
              swaps_pending: 0,
              swaps_rejected: 0,
              swaps_total: 0
            };
          }
          
          monthlyData[monthYear][request.status]++;
          monthlyData[monthYear].total++;
        });
        
        // Process swap requests data
        swapRequestsData?.forEach(swap => {
          const date = new Date(swap.created_at);
          const monthYear = `${date.getFullYear()}-${date.getMonth()}`;
          
          if (!monthlyData[monthYear]) {
            monthlyData[monthYear] = {
              month: `${months[date.getMonth()].substring(0, 3)} ${date.getFullYear().toString().substring(2)}`,
              accepted: 0,
              pending: 0,
              rejected: 0,
              total: 0,
              swaps_accepted: 0,
              swaps_rejected: 0,
              swaps_total: 0
            };
          }
          
          // Track accepted/rejected status
          if (swap.status === 'accepted' || swap.status === 'rejected') {
            monthlyData[monthYear][`swaps_${swap.status}`]++;
          }
          
          monthlyData[monthYear].swaps_total++;
        });

        // Sort the months chronologically
        const formattedTrendsData = Object.values(monthlyData).sort((a, b) => {
          const aDate = new Date(a.month);
          const bDate = new Date(b.month);
          return aDate - bDate;
        });

        // Update state with all the data
        setDailyData(formattedDailyData);
        setStatusData(formattedStatusData);
        setTrendsData(formattedTrendsData);
      } catch (err) {
        console.error('Error fetching analytics data:', err);
      } finally {
        setLoading(false);
      }
    }

    fetchAnalyticsData();
  }, [userId, selectedMonth, selectedYear]);

  if (loading) {
    return <div className="text-center py-8">Loading analytics data...</div>;
  }

  // Custom tooltip for the status pie chart
  const CustomTooltip = ({ active, payload }) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white p-2 border rounded shadow">
          <p className="font-medium">{payload[0].name}: {payload[0].value}</p>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="space-y-8">
      {/* Period Selector */}
      <div className="bg-white p-4 rounded-lg shadow">
        <h3 className="text-lg font-medium mb-3">Analytics Period</h3>
        <div className="flex flex-wrap gap-4">
          <select
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(Number(e.target.value))}
            className="px-3 py-2 border rounded"
          >
            {months.map((month, index) => (
              <option key={month} value={index}>
                {month}
              </option>
            ))}
          </select>
          <select
            value={selectedYear}
            onChange={(e) => setSelectedYear(Number(e.target.value))}
            className="px-3 py-2 border rounded"
          >
            {years.map(year => (
              <option key={year} value={year}>
                {year}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Daily Task Completions */}
      <div className="bg-white p-4 rounded-lg shadow">
        <h3 className="text-lg font-medium mb-4">
          Daily Task Completions - {months[selectedMonth]} {selectedYear}
        </h3>
        <div className="h-80">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={dailyData}
              margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
            >
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="day" />
              <YAxis allowDecimals={false} />
              <Tooltip formatter={(value) => [`${value} task(s)`, 'Completed']} />
              <Legend />
              <Bar 
                dataKey="count" 
                name="Tasks Completed" 
                fill="#f97316" 
                barSize={20} 
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
        {dailyData.every(item => item.count === 0) && (
          <p className="text-center mt-4 text-gray-500">
            No tasks completed in this period
          </p>
        )}
      </div>

      {/* Request Status Distribution */}
      <div className="bg-white p-4 rounded-lg shadow">
        <h3 className="text-lg font-medium mb-4">
          Task Completion Request Status - {months[selectedMonth]} {selectedYear}
        </h3>
        <div className="h-80">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={statusData}
                cx="50%"
                cy="50%"
                labelLine={false}
                outerRadius={80}
                fill="#8884d8"
                dataKey="value"
                label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
              >
                {statusData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip content={<CustomTooltip />} />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        </div>
        {statusData.every(item => item.value === 0) && (
          <p className="text-center mt-4 text-gray-500">
            No requests in this period
          </p>
        )}
      </div>

      {/* Monthly Activity Trends */}
      <div className="bg-white p-4 rounded-lg shadow">
        <h3 className="text-lg font-medium mb-4">
          Task Swap Activity (Last 6 Months)
        </h3>
        <div className="h-80">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart
              data={trendsData}
              margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
            >
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="month" />
              <YAxis allowDecimals={false} />
              <Tooltip />
              <Legend />
              <Line
                type="monotone"
                dataKey="swaps_total"
                name="Total Task Swaps"
                stroke="#8b5cf6" 
                activeDot={{ r: 8 }}
                strokeWidth={2}
              />
              <Line
                type="monotone"
                dataKey="swaps_accepted"
                name="Accepted Swaps"
                stroke="#06b6d4"
              />
              <Line
                type="monotone"
                dataKey="swaps_rejected"
                name="Rejected Swaps"
                stroke="#f43f5e"
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
        {trendsData.length === 0 && (
          <p className="text-center mt-4 text-gray-500">
            No swap activity data available
          </p>
        )}
      </div>

      {/* Summary Statistics */}
      <div className="bg-white p-4 rounded-lg shadow">
        <h3 className="text-lg font-medium mb-4">Task Completion Statistics</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="p-4 bg-green-50 rounded-lg border border-green-100">
            <p className="text-sm text-green-800">Accepted Requests</p>
            <p className="text-3xl font-bold text-green-600">
              {statusData[0]?.value || 0}
            </p>
          </div>
          <div className="p-4 bg-orange-50 rounded-lg border border-orange-100">
            <p className="text-sm text-orange-800">Pending Requests</p>
            <p className="text-3xl font-bold text-orange-600">
              {statusData[1]?.value || 0}
            </p>
          </div>
          <div className="p-4 bg-red-50 rounded-lg border border-red-100">
            <p className="text-sm text-red-800">Rejected Requests</p>
            <p className="text-3xl font-bold text-red-600">
              {statusData[2]?.value || 0}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default TaskCompletionChart; 