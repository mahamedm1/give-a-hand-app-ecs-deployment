import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import supabase from '../helper/supabaseClient';
import { REPORT_REASONS } from '../helper/reportReasons';

const REASON_LABELS = { ...REPORT_REASONS, contact: 'Contact form message' };

/**
 * Inbox for site admins: reports about users and contact-form messages.
 * Who is a site admin is set in the database (site_admins table), and the
 * database only returns reports to them.
 */
function AdminReports() {
  const [isAdmin, setIsAdmin] = useState(null);
  const [reports, setReports] = useState([]);
  const [names, setNames] = useState({});
  const [showResolved, setShowResolved] = useState(false);
  const [error, setError] = useState(null);

  const load = useCallback(async () => {
    try {
      setError(null);
      const { data: admin } = await supabase.rpc('is_site_admin');
      setIsAdmin(Boolean(admin));
      if (!admin) return;

      let query = supabase
        .from('user_reports')
        .select('id, reporter_id, reported_user_id, task_id, reason, details, status, created_at, resolved_at, tasks(title)')
        .order('created_at', { ascending: false });
      if (!showResolved) query = query.eq('status', 'open');
      const { data, error: listError } = await query;
      if (listError) throw listError;
      setReports(data || []);

      const ids = [...new Set((data || []).flatMap(r => [r.reporter_id, r.reported_user_id]).filter(Boolean))];
      if (ids.length) {
        const { data: users } = await supabase.from('users').select('id, display_name').in('id', ids);
        setNames(Object.fromEntries((users || []).map(u => [u.id, u.display_name || 'User'])));
      }
    } catch (err) {
      console.error('Error loading reports:', err);
      setError(err.message || 'Could not load reports.');
    }
  }, [showResolved]);

  useEffect(() => {
    load();
  }, [load]);

  const setStatus = async (id, status) => {
    const { error: updateError } = await supabase
      .from('user_reports')
      .update({ status, resolved_at: status === 'resolved' ? new Date().toISOString() : null })
      .eq('id', id);
    if (updateError) {
      setError(updateError.message);
      return;
    }
    load();
  };

  const person = (id) => (id ? <Link to={`/users/${id}`} className="text-orange-600 hover:underline">{names[id] || 'User'}</Link> : <em>deleted user</em>);

  if (isAdmin === null) {
    return <div className="text-center py-20 text-gray-500">Loading...</div>;
  }

  if (!isAdmin) {
    return (
      <div className="max-w-xl mx-auto my-16 bg-white rounded-lg shadow-md p-6 text-center">
        <h1 className="text-xl font-semibold">Admins only</h1>
        <p className="text-gray-600 mt-2">This page is for site administrators.</p>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-4xl mx-auto">
        <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
          <h1 className="text-2xl font-bold">Reports and messages</h1>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={showResolved} onChange={e => setShowResolved(e.target.checked)} />
            Show resolved
          </label>
        </div>
        {error && <div className="bg-red-50 text-red-700 p-3 rounded-md mb-4">{error}</div>}

        {reports.length === 0 ? (
          <p className="bg-white rounded-lg shadow-md p-8 text-center text-gray-500">Nothing to review. 🎉</p>
        ) : (
          <div className="space-y-4">
            {reports.map(r => (
              <div key={r.id} className={`bg-white rounded-lg shadow-md p-5 border-l-4 ${r.status === 'open' ? 'border-red-500' : 'border-gray-300'}`}>
                <div className="flex flex-wrap justify-between gap-2">
                  <p className="font-semibold">{REASON_LABELS[r.reason] || r.reason}</p>
                  <p className="text-sm text-gray-500">{new Date(r.created_at).toLocaleString()}</p>
                </div>
                <p className="text-sm text-gray-700 mt-2">
                  From {person(r.reporter_id)}
                  {r.reason !== 'contact' && <> about {person(r.reported_user_id)}</>}
                  {r.task_id && <> on task <Link to={`/tasks/${r.task_id}`} className="text-orange-600 hover:underline">{r.tasks?.title || 'task'}</Link></>}
                </p>
                {r.details && <p className="mt-3 whitespace-pre-line bg-gray-50 p-3 rounded">{r.details}</p>}
                <div className="mt-3 flex justify-end">
                  {r.status === 'open' ? (
                    <button onClick={() => setStatus(r.id, 'resolved')} className="bg-green-600 text-white px-3 py-1 rounded-md hover:bg-green-700 text-sm">
                      Mark resolved
                    </button>
                  ) : (
                    <button onClick={() => setStatus(r.id, 'open')} className="text-sm text-gray-600 hover:text-gray-800">
                      Reopen
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default AdminReports;
