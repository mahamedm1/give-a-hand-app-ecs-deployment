import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { FaUsers, FaPlus, FaLock, FaEnvelope, FaGlobe, FaSearch } from 'react-icons/fa';
import supabase from '../helper/supabaseClient';
import { fetchMyCommunities, JOIN_POLICY_LABELS, friendlyError } from '../helper/communities';

const POLICY_ICONS = {
  open: <FaGlobe className="text-green-600" />,
  email_domain: <FaEnvelope className="text-blue-600" />,
  invite_code: <FaLock className="text-gray-600" />,
};

const emptyForm = { name: '', description: '', join_policy: 'open', email_domain: '' };

function Communities() {
  const navigate = useNavigate();
  const [currentUser, setCurrentUser] = useState(null);
  const [myCommunities, setMyCommunities] = useState([]);
  const [allCommunities, setAllCommunities] = useState([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState(null);

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        const { data: authData } = await supabase.auth.getUser();
        const me = authData?.user || null;
        setCurrentUser(me);

        const { data, error: listError } = await supabase
          .from('communities')
          .select('id, name, description, join_policy, email_domain, created_at, community_members(count)')
          .order('name', { ascending: true });
        if (listError) throw listError;
        setAllCommunities(data || []);

        setMyCommunities(await fetchMyCommunities(me?.id));
      } catch (err) {
        console.error('Error loading communities:', err);
        setError(friendlyError(err, 'Could not load communities.'));
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const handleCreate = async (e) => {
    e.preventDefault();
    setCreateError(null);

    const name = form.name.trim();
    const domain = form.email_domain.trim().toLowerCase().replace(/^@/, '');
    if (name.length < 3) {
      setCreateError('Give your community a name of at least 3 characters.');
      return;
    }
    if (form.join_policy === 'email_domain' && !/^[a-z0-9.-]+\.[a-z]{2,}$/.test(domain)) {
      setCreateError('Enter an email domain like city.ac.uk');
      return;
    }

    try {
      setCreating(true);
      const { data, error: insertError } = await supabase
        .from('communities')
        .insert({
          name,
          description: form.description.trim() || null,
          join_policy: form.join_policy,
          email_domain: form.join_policy === 'email_domain' ? domain : null,
          created_by: currentUser.id,
        })
        .select('id')
        .single();
      if (insertError) {
        if (insertError.code === '23505') throw new Error('A community with that name already exists.');
        throw insertError;
      }
      navigate(`/communities/${data.id}`);
    } catch (err) {
      console.error('Error creating community:', err);
      setCreateError(friendlyError(err, 'Could not create the community.'));
    } finally {
      setCreating(false);
    }
  };

  const myIds = new Set(myCommunities.map(c => c.id));
  const term = search.trim().toLowerCase();
  const discover = allCommunities
    .filter(c => !myIds.has(c.id))
    .filter(c => !term || c.name.toLowerCase().includes(term) || (c.description || '').toLowerCase().includes(term));

  if (loading) {
    return (
      <div className="flex justify-center items-center h-96">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-orange-500"></div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-4xl mx-auto">
        <div className="flex flex-wrap items-center justify-between gap-4 mb-2">
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <FaUsers className="text-orange-500" /> Communities
          </h1>
          {currentUser ? (
            <button
              onClick={() => setShowCreate(s => !s)}
              className="bg-orange-500 text-white px-4 py-2 rounded-md hover:bg-orange-600 flex items-center gap-2"
            >
              <FaPlus /> {showCreate ? 'Close' : 'Create a community'}
            </button>
          ) : (
            <Link to="/login" className="text-orange-500 hover:underline">Log in to create or join a community</Link>
          )}
        </div>
        <p className="text-gray-600 mb-6">
          Communities are groups who help each other: your halls, your course, your street or a local group.
          Tasks posted to a community are only visible to its members.
        </p>

        {error && <div className="bg-red-50 text-red-700 p-4 rounded-md mb-6">{error}</div>}

        {/* Create form */}
        {showCreate && currentUser && (
          <form onSubmit={handleCreate} className="bg-white rounded-lg shadow-md p-6 mb-8 space-y-4">
            <h2 className="text-lg font-semibold">New community</h2>
            {createError && <div className="bg-red-50 text-red-700 p-3 rounded-md text-sm">{createError}</div>}
            <div>
              <label className="block text-sm font-medium mb-1" htmlFor="name">Name</label>
              <input
                id="name"
                value={form.name}
                onChange={e => setForm({ ...form, name: e.target.value })}
                maxLength={80}
                required
                placeholder="e.g. Northampton Square Halls"
                className="w-full px-3 py-2 border rounded-md"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1" htmlFor="description">Description <span className="text-gray-400">(optional)</span></label>
              <textarea
                id="description"
                value={form.description}
                onChange={e => setForm({ ...form, description: e.target.value })}
                maxLength={1000}
                rows={3}
                placeholder="Who is this community for?"
                className="w-full px-3 py-2 border rounded-md"
              />
            </div>
            <div>
              <span className="block text-sm font-medium mb-1">Who can join?</span>
              <div className="space-y-2">
                {Object.entries(JOIN_POLICY_LABELS).map(([value, label]) => (
                  <label key={value} className="flex items-center gap-2">
                    <input
                      type="radio"
                      name="join_policy"
                      value={value}
                      checked={form.join_policy === value}
                      onChange={() => setForm({ ...form, join_policy: value })}
                    />
                    {POLICY_ICONS[value]} <span>{label}</span>
                  </label>
                ))}
              </div>
            </div>
            {form.join_policy === 'email_domain' && (
              <div>
                <label className="block text-sm font-medium mb-1" htmlFor="email_domain">Email domain</label>
                <div className="flex items-center gap-1">
                  <span className="text-gray-500">@</span>
                  <input
                    id="email_domain"
                    value={form.email_domain}
                    onChange={e => setForm({ ...form, email_domain: e.target.value })}
                    placeholder="city.ac.uk"
                    className="w-full px-3 py-2 border rounded-md"
                  />
                </div>
                <p className="text-xs text-gray-500 mt-1">Only people whose account email ends with this can join.</p>
              </div>
            )}
            {form.join_policy === 'invite_code' && (
              <p className="text-sm text-gray-600">You'll get an invite code to share once the community is created.</p>
            )}
            <button
              type="submit"
              disabled={creating}
              className={`px-4 py-2 rounded-md text-white ${creating ? 'bg-gray-400' : 'bg-orange-500 hover:bg-orange-600'}`}
            >
              {creating ? 'Creating...' : 'Create community'}
            </button>
          </form>
        )}

        {/* My communities */}
        {currentUser && (
          <section className="mb-10">
            <h2 className="text-lg font-semibold mb-3">Your communities</h2>
            {myCommunities.length === 0 ? (
              <p className="text-gray-500">You haven't joined any communities yet. Find one below or create your own.</p>
            ) : (
              <div className="grid gap-4 grid-cols-1 md:grid-cols-2">
                {myCommunities.map(c => (
                  <Link key={c.id} to={`/communities/${c.id}`} className="bg-white border rounded-lg p-4 hover:shadow-md transition">
                    <div className="flex items-center justify-between">
                      <h3 className="font-medium text-lg">{c.name}</h3>
                      {c.role === 'admin' && (
                        <span className="text-xs bg-orange-100 text-orange-700 px-2 py-1 rounded-full">Admin</span>
                      )}
                    </div>
                    <p className="text-sm text-gray-500 flex items-center gap-2 mt-1">
                      {POLICY_ICONS[c.join_policy]} {JOIN_POLICY_LABELS[c.join_policy]}
                    </p>
                  </Link>
                ))}
              </div>
            )}
          </section>
        )}

        {/* Discover */}
        <section>
          <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
            <h2 className="text-lg font-semibold">Find a community</h2>
            <div className="relative">
              <FaSearch className="absolute left-3 top-3 text-gray-400" />
              <input
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Search communities"
                className="pl-9 pr-3 py-2 border rounded-md"
              />
            </div>
          </div>
          {discover.length === 0 ? (
            <p className="text-gray-500">
              {allCommunities.length === 0 ? 'No communities yet. Be the first to create one!' : 'No other communities match your search.'}
            </p>
          ) : (
            <div className="grid gap-4 grid-cols-1 md:grid-cols-2">
              {discover.map(c => (
                <Link key={c.id} to={`/communities/${c.id}`} className="bg-white border rounded-lg p-4 hover:shadow-md transition">
                  <h3 className="font-medium text-lg">{c.name}</h3>
                  {c.description && <p className="text-gray-600 text-sm mt-1 line-clamp-2">{c.description}</p>}
                  <div className="flex flex-wrap items-center gap-4 text-sm text-gray-500 mt-2">
                    <span className="flex items-center gap-2">
                      {POLICY_ICONS[c.join_policy]}
                      {c.join_policy === 'email_domain' ? `@${c.email_domain} only` : JOIN_POLICY_LABELS[c.join_policy]}
                    </span>
                    <span className="flex items-center gap-1">
                      <FaUsers /> {c.community_members?.[0]?.count ?? 0} members
                    </span>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}

export default Communities;
