import { useState } from 'react';
import supabase from '../helper/supabaseClient';

import { REPORT_REASONS } from '../helper/reportReasons';

/** Report a user (and optionally the task it's about). Goes to the site admins. */
function ReportModal({ isOpen, onClose, currentUserId, reportedUserId, reportedName, taskId = null }) {
  const [reason, setReason] = useState('harassment');
  const [details, setDetails] = useState('');
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState(null);

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSending(true);
    setError(null);
    const { error: insertError } = await supabase.from('user_reports').insert({
      reporter_id: currentUserId,
      reported_user_id: reportedUserId,
      task_id: taskId,
      reason,
      details: details.trim() || null,
    });
    setSending(false);
    if (insertError) {
      setError(insertError.message || 'Could not send your report. Please try again.');
      return;
    }
    setSent(true);
  };

  const close = () => {
    setSent(false);
    setDetails('');
    setError(null);
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={close}>
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6" onClick={e => e.stopPropagation()}>
        {sent ? (
          <div className="text-center space-y-4">
            <h2 className="text-xl font-semibold">Thanks for telling us</h2>
            <p className="text-gray-600">
              Our team will look into it. If you don't want to hear from {reportedName || 'this person'} again,
              you can also block them from their profile.
            </p>
            <button onClick={close} className="bg-orange-500 text-white px-4 py-2 rounded-md hover:bg-orange-600">Close</button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <h2 className="text-xl font-semibold">Report {reportedName || 'this user'}</h2>
            <p className="text-sm text-gray-600">Reports are private. The person won't know who reported them.</p>
            {error && <p className="bg-red-50 text-red-700 p-3 rounded-md text-sm">{error}</p>}
            <div>
              <label htmlFor="report-reason" className="block text-sm font-medium mb-1">What happened?</label>
              <select id="report-reason" value={reason} onChange={e => setReason(e.target.value)} className="w-full px-3 py-2 border rounded-md">
                {Object.entries(REPORT_REASONS).map(([value, label]) => (
                  <option key={value} value={value}>{label}</option>
                ))}
              </select>
            </div>
            <div>
              <label htmlFor="report-details" className="block text-sm font-medium mb-1">Details <span className="text-gray-400">(optional)</span></label>
              <textarea
                id="report-details"
                value={details}
                onChange={e => setDetails(e.target.value)}
                maxLength={2000}
                rows={4}
                className="w-full px-3 py-2 border rounded-md"
              />
            </div>
            <p className="text-xs text-gray-500">If you're in danger, call 999.</p>
            <div className="flex justify-end gap-3">
              <button type="button" onClick={close} className="px-4 py-2 rounded-md border hover:bg-gray-50">Cancel</button>
              <button type="submit" disabled={sending} className="bg-red-600 text-white px-4 py-2 rounded-md hover:bg-red-700 disabled:bg-gray-400">
                {sending ? 'Sending...' : 'Send report'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}

export default ReportModal;
