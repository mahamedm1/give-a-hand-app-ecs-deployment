import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import supabase from '../helper/supabaseClient';
import { CATEGORIES } from '../helper/categories';
import { fetchMyCommunities } from '../helper/communities';
import { TASK_STATUS } from '../helper/taskStatus';

const inputClass = 'w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500';

function EditTask() {
  const { taskId } = useParams();
  const navigate = useNavigate();
  const [form, setForm] = useState(null);
  const [myCommunities, setMyCommunities] = useState([]);
  const [problem, setProblem] = useState(null);
  const [error, setError] = useState(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const load = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setProblem('Please log in to edit your tasks.');
        return;
      }
      const { data: task, error: taskError } = await supabase
        .from('tasks')
        .select('*')
        .eq('id', taskId)
        .maybeSingle();
      if (taskError || !task) {
        setProblem('Task not found.');
        return;
      }
      if (task.user_id !== user.id) {
        setProblem('You can only edit tasks you posted.');
        return;
      }
      if (task.status !== TASK_STATUS.OPEN) {
        setProblem('This task is already part of a swap, so it can no longer be edited. Cancel the swap first if you need to change it.');
        return;
      }
      setMyCommunities(await fetchMyCommunities(user.id).catch(() => []));
      setForm({
        title: task.title,
        category: task.category,
        description: task.description,
        completion_date: task.completion_date,
        estimated_duration: task.estimated_duration || '',
        visibility: task.community_id || 'public',
      });
    };
    load();
  }, [taskId]);

  const set = (field) => (e) => setForm({ ...form, [field]: e.target.value });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    const { error: saveError } = await supabase
      .from('tasks')
      .update({
        title: form.title.trim(),
        category: form.category,
        description: form.description.trim(),
        completion_date: form.completion_date,
        estimated_duration: form.estimated_duration.trim() || null,
        community_id: form.visibility === 'public' ? null : form.visibility,
        updated_at: new Date().toISOString(),
      })
      .eq('id', taskId);
    setSaving(false);
    if (saveError) {
      setError(saveError.message || 'Could not save your changes.');
      return;
    }
    navigate(`/tasks/${taskId}`);
  };

  if (problem) {
    return (
      <div className="max-w-2xl mx-auto my-8 p-6 bg-white rounded-lg shadow-md text-center">
        <p className="text-gray-700">{problem}</p>
        <Link to={`/tasks/${taskId}`} className="inline-block mt-4 text-orange-500 hover:underline">Back to the task</Link>
      </div>
    );
  }

  if (!form) {
    return (
      <div className="flex justify-center items-center h-96">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-orange-500"></div>
      </div>
    );
  }

  // Keep a task's existing community selectable even if you've since left it
  const visibilityOptions = [...myCommunities];
  if (form.visibility !== 'public' && !visibilityOptions.some(c => c.id === form.visibility)) {
    visibilityOptions.push({ id: form.visibility, name: 'its current community' });
  }

  return (
    <div className="max-w-2xl mx-auto my-8 p-6 bg-white rounded-lg shadow-md">
      <h1 className="text-3xl font-bold text-center mb-6">Edit Task</h1>
      {error && <div className="mb-4 p-3 bg-red-100 text-red-700 border border-red-200 rounded">{error}</div>}

      <form onSubmit={handleSubmit} className="space-y-6">
        <div>
          <label htmlFor="visibility" className="block text-sm font-medium text-gray-700 mb-1">Who can see this task?</label>
          <select id="visibility" value={form.visibility} onChange={set('visibility')} className={inputClass}>
            <option value="public">Everyone (public)</option>
            {visibilityOptions.map(c => (
              <option key={c.id} value={c.id}>Only members of {c.name}</option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor="title" className="block text-sm font-medium text-gray-700 mb-1">Task Title*</label>
          <input id="title" value={form.title} onChange={set('title')} required className={inputClass} />
        </div>
        <div>
          <label htmlFor="category" className="block text-sm font-medium text-gray-700 mb-1">Category*</label>
          <select id="category" value={form.category} onChange={set('category')} required className={inputClass}>
            {!CATEGORIES.includes(form.category) && <option value={form.category}>{form.category}</option>}
            {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>
        <div>
          <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-1">Description*</label>
          <textarea id="description" value={form.description} onChange={set('description')} required rows={5} className={inputClass} />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label htmlFor="completion_date" className="block text-sm font-medium text-gray-700 mb-1">Needed by*</label>
            <input id="completion_date" type="date" value={form.completion_date} onChange={set('completion_date')} required className={inputClass} />
          </div>
          <div>
            <label htmlFor="estimated_duration" className="block text-sm font-medium text-gray-700 mb-1">Estimated duration</label>
            <input id="estimated_duration" value={form.estimated_duration} onChange={set('estimated_duration')} placeholder="e.g. 2 hours" className={inputClass} />
          </div>
        </div>
        <div className="flex gap-3">
          <button type="submit" disabled={saving} className="bg-orange-500 text-white px-4 py-2 rounded-md hover:bg-orange-600 disabled:bg-gray-400">
            {saving ? 'Saving...' : 'Save changes'}
          </button>
          <Link to={`/tasks/${taskId}`} className="px-4 py-2 rounded-md border hover:bg-gray-50">Cancel</Link>
        </div>
      </form>
    </div>
  );
}

export default EditTask;
