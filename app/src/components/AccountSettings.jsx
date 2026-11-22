import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import supabase from '../helper/supabaseClient';
import SkillPicker from './SkillPicker';

/**
 * The "Account" tab on your own profile: edit your details and skills,
 * email settings, log out, and delete your account.
 */
function AccountSettings({ user, profile, completedTasksCount, onProfileUpdated, onLogout }) {
  const navigate = useNavigate();
  const [form, setForm] = useState(null);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState(null);
  const [error, setError] = useState(null);
  const [confirmDelete, setConfirmDelete] = useState('');
  const [deleting, setDeleting] = useState(false);

  // Email and phone aren't readable through normal queries (privacy), so
  // load your own private details through a dedicated database function
  useEffect(() => {
    if (!profile) return;
    const load = async () => {
      const { data } = await supabase.rpc('get_my_private_details');
      const mine = Array.isArray(data) ? data[0] : data;
      setForm({
        first_name: profile.first_name || '',
        last_name: profile.last_name || '',
        display_name: profile.display_name || '',
        city: profile.city || '',
        phone_number: mine?.phone_number || '',
        skills: profile.skills || [],
        email_notifications: mine?.email_notifications ?? true,
      });
    };
    load();
  }, [profile]);

  const set = (field) => (e) => setForm({ ...form, [field]: e.target.value });

  const handleSave = async (e) => {
    e.preventDefault();
    setMessage(null);
    setError(null);
    const required = ['first_name', 'last_name', 'display_name', 'city'];
    if (required.some(f => !form[f].trim())) {
      setError('Name, username and city are required.');
      return;
    }
    setSaving(true);
    const updates = {
      first_name: form.first_name.trim(),
      last_name: form.last_name.trim(),
      display_name: form.display_name.trim(),
      city: form.city.trim(),
      phone_number: form.phone_number.trim() || null,
      skills: form.skills,
      email_notifications: form.email_notifications,
    };
    const { error: saveError } = await supabase.from('users').update(updates).eq('id', user.id);
    setSaving(false);
    if (saveError) {
      setError(saveError.message || 'Could not save your changes.');
      return;
    }
    setMessage('Your profile has been updated.');
    onProfileUpdated?.(updates);
  };

  const handleDelete = async () => {
    setDeleting(true);
    setError(null);
    try {
      // Remove profile picture files first (Supabase only allows this via the Storage API)
      const { data: files } = await supabase.storage.from('avatars').list(user.id);
      if (files?.length) {
        await supabase.storage.from('avatars').remove(files.map(f => `${user.id}/${f.name}`));
      }
      const { error: deleteError } = await supabase.rpc('delete_my_account');
      if (deleteError) throw deleteError;
      await supabase.auth.signOut();
      navigate('/', { replace: true });
    } catch (err) {
      console.error('Error deleting account:', err);
      setError(err.message || 'Could not delete your account. Please try again.');
      setDeleting(false);
    }
  };

  if (!form) {
    return <p className="text-gray-500">Loading your details...</p>;
  }

  return (
    <div className="space-y-10">
      <section>
        <h2 className="text-xl font-semibold mb-4">Your details</h2>
        {message && <div className="bg-green-50 text-green-800 p-3 rounded-md mb-4 text-sm">{message}</div>}
        {error && <div className="bg-red-50 text-red-700 p-3 rounded-md mb-4 text-sm">{error}</div>}

        <form onSubmit={handleSave} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1" htmlFor="acc-first">First name</label>
              <input id="acc-first" value={form.first_name} onChange={set('first_name')} required className="w-full px-3 py-2 border rounded-md" />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1" htmlFor="acc-last">Last name</label>
              <input id="acc-last" value={form.last_name} onChange={set('last_name')} required className="w-full px-3 py-2 border rounded-md" />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1" htmlFor="acc-username">Username</label>
              <input id="acc-username" value={form.display_name} onChange={set('display_name')} required className="w-full px-3 py-2 border rounded-md" />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1" htmlFor="acc-city">City / Area</label>
              <input id="acc-city" value={form.city} onChange={set('city')} required className="w-full px-3 py-2 border rounded-md" />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1" htmlFor="acc-phone">
                Phone number <span className="text-gray-400">(optional, only you can see it)</span>
              </label>
              <input id="acc-phone" type="tel" value={form.phone_number} onChange={set('phone_number')} className="w-full px-3 py-2 border rounded-md" />
            </div>
            <div>
              <span className="block text-sm font-medium mb-1">Email</span>
              <p className="px-3 py-2 bg-gray-50 border rounded-md text-gray-600">{user?.email}</p>
            </div>
          </div>

          <div>
            <span className="block text-sm font-medium mb-1">I can help with</span>
            <p className="text-xs text-gray-500 mb-2">Shown on your public profile. We'll suggest matching tasks to you.</p>
            <SkillPicker value={form.skills} onChange={skills => setForm({ ...form, skills })} />
          </div>

          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={form.email_notifications}
              onChange={e => setForm({ ...form, email_notifications: e.target.checked })}
            />
            <span>Email me about new swap offers, accepted swaps and messages</span>
          </label>

          <button
            type="submit"
            disabled={saving}
            className="bg-orange-500 text-white px-4 py-2 rounded-md hover:bg-orange-600 disabled:bg-gray-400"
          >
            {saving ? 'Saving...' : 'Save changes'}
          </button>
        </form>
      </section>

      <section className="flex flex-wrap items-center justify-between gap-4 bg-gray-50 p-4 rounded-lg">
        <p className="text-gray-700">Tasks completed: <strong>{completedTasksCount}</strong></p>
        <button onClick={onLogout} className="bg-gray-700 hover:bg-gray-800 text-white px-4 py-2 rounded-md transition">
          Log out
        </button>
      </section>

      <section className="border border-red-200 rounded-lg p-4">
        <h2 className="text-lg font-semibold text-red-600 mb-2">Delete my account</h2>
        <p className="text-sm text-gray-600 mb-3">
          This permanently deletes your profile, tasks, messages, swaps, reviews, community memberships and
          profile picture. Any swap in progress is cancelled. This cannot be undone.
        </p>
        <label className="block text-sm mb-2" htmlFor="confirm-delete">
          Type <strong>DELETE</strong> to confirm:
        </label>
        <div className="flex flex-wrap gap-3">
          <input
            id="confirm-delete"
            value={confirmDelete}
            onChange={e => setConfirmDelete(e.target.value)}
            className="px-3 py-2 border rounded-md"
          />
          <button
            onClick={handleDelete}
            disabled={confirmDelete !== 'DELETE' || deleting}
            className="bg-red-600 text-white px-4 py-2 rounded-md hover:bg-red-700 disabled:bg-gray-400"
          >
            {deleting ? 'Deleting...' : 'Delete my account'}
          </button>
        </div>
      </section>
    </div>
  );
}

export default AccountSettings;
