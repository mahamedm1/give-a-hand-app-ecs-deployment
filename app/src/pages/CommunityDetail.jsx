import { useState, useEffect, useCallback } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { FaUsers, FaUserCircle, FaArrowLeft, FaPlus, FaCopy, FaSyncAlt, FaTrash, FaSignOutAlt } from 'react-icons/fa';
import supabase from '../helper/supabaseClient';
import { JOIN_POLICY_LABELS, friendlyError } from '../helper/communities';
import { todayISO } from '../helper/taskStatus';
import TaskCard from '../components/TaskCard';
import ChatModal from '../components/ChatModal';

function CommunityDetail() {
  const { communityId } = useParams();
  const navigate = useNavigate();
  const [currentUser, setCurrentUser] = useState(null);
  const [community, setCommunity] = useState(null);
  const [members, setMembers] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [inviteCode, setInviteCode] = useState(null);
  const [joinCode, setJoinCode] = useState('');
  const [activeTab, setActiveTab] = useState('tasks');
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState(null);
  const [error, setError] = useState(null);
  const [editForm, setEditForm] = useState(null);
  const [chatRecipient, setChatRecipient] = useState(null);

  const myMembership = members.find(m => m.user_id === currentUser?.id);
  const isMember = Boolean(myMembership);
  const isAdmin = myMembership?.role === 'admin';

  const load = useCallback(async () => {
    try {
      setError(null);
      const { data: authData } = await supabase.auth.getUser();
      const me = authData?.user || null;
      setCurrentUser(me);

      const { data: c, error: cError } = await supabase
        .from('communities')
        .select('id, name, description, join_policy, email_domain, created_at')
        .eq('id', communityId)
        .maybeSingle();
      if (cError) throw cError;
      if (!c) {
        setNotFound(true);
        return;
      }
      setCommunity(c);
      setEditForm({ name: c.name, description: c.description || '', join_policy: c.join_policy, email_domain: c.email_domain || '' });

      let memberRows = [];
      if (me) {
        const { data: m, error: mError } = await supabase
          .from('community_members')
          .select('user_id, role, joined_at, users(id, display_name, profile_picture_url)')
          .eq('community_id', communityId)
          .order('joined_at', { ascending: true });
        if (mError) throw mError;
        memberRows = m || [];
      }
      setMembers(memberRows);

      const amMember = memberRows.some(m => m.user_id === me?.id);

      // Community tasks are only returned to members (enforced by the database)
      if (amMember) {
        const { data: t, error: tError } = await supabase
          .from('tasks')
          .select('*, users(display_name)')
          .eq('community_id', communityId)
          .eq('status', 'open')
          .gte('completion_date', todayISO())
          .order('created_at', { ascending: false });
        if (tError) throw tError;
        setTasks(t || []);
      } else {
        setTasks([]);
      }

      if (amMember && c.join_policy === 'invite_code') {
        const { data: code } = await supabase.rpc('get_invite_code', { p_community_id: communityId });
        setInviteCode(code || null);
      } else {
        setInviteCode(null);
      }
    } catch (err) {
      console.error('Error loading community:', err);
      setError(friendlyError(err, 'Could not load this community.'));
    } finally {
      setLoading(false);
    }
  }, [communityId]);

  useEffect(() => {
    setLoading(true);
    load();
  }, [load]);

  const run = async (action, successMessage) => {
    setBusy(true);
    setError(null);
    setMessage(null);
    try {
      await action();
      if (successMessage) setMessage(successMessage);
      await load();
    } catch (err) {
      console.error(err);
      setError(friendlyError(err));
    } finally {
      setBusy(false);
    }
  };

  const handleJoin = () => run(async () => {
    const { error: joinError } = await supabase.rpc('join_community', {
      p_community_id: communityId,
      p_code: joinCode.trim() || null,
    });
    if (joinError) throw joinError;
  }, `Welcome to ${community?.name}!`);

  const handleLeave = () => {
    if (!window.confirm(`Leave ${community?.name}? You'll no longer see its tasks.`)) return;
    run(async () => {
      const { error: leaveError } = await supabase
        .from('community_members')
        .delete()
        .eq('community_id', communityId)
        .eq('user_id', currentUser.id);
      if (leaveError) throw leaveError;
    }, 'You left the community.');
  };

  const setRole = (userId, role) => run(async () => {
    const { error: roleError } = await supabase
      .from('community_members')
      .update({ role })
      .eq('community_id', communityId)
      .eq('user_id', userId);
    if (roleError) throw roleError;
  }, role === 'admin' ? 'Member made an admin.' : 'Admin rights removed.');

  const removeMember = (userId, name) => {
    if (!window.confirm(`Remove ${name} from this community?`)) return;
    run(async () => {
      const { error: removeError } = await supabase
        .from('community_members')
        .delete()
        .eq('community_id', communityId)
        .eq('user_id', userId);
      if (removeError) throw removeError;
    }, `${name} was removed.`);
  };

  const resetCode = () => run(async () => {
    const { error: codeError } = await supabase.rpc('reset_invite_code', { p_community_id: communityId });
    if (codeError) throw codeError;
  }, 'New invite code created. The old one no longer works.');

  const copyCode = async () => {
    try {
      await navigator.clipboard.writeText(inviteCode);
      setMessage('Invite code copied.');
    } catch {
      setMessage(`Invite code: ${inviteCode}`);
    }
  };

  const saveSettings = (e) => {
    e.preventDefault();
    const domain = editForm.email_domain.trim().toLowerCase().replace(/^@/, '');
    if (editForm.name.trim().length < 3) {
      setError('The name needs at least 3 characters.');
      return;
    }
    if (editForm.join_policy === 'email_domain' && !/^[a-z0-9.-]+\.[a-z]{2,}$/.test(domain)) {
      setError('Enter an email domain like city.ac.uk');
      return;
    }
    run(async () => {
      const { error: saveError } = await supabase
        .from('communities')
        .update({
          name: editForm.name.trim(),
          description: editForm.description.trim() || null,
          join_policy: editForm.join_policy,
          email_domain: editForm.join_policy === 'email_domain' ? domain : null,
        })
        .eq('id', communityId);
      if (saveError) {
        if (saveError.code === '23505') throw new Error('A community with that name already exists.');
        throw saveError;
      }
    }, 'Settings saved.');
  };

  const deleteCommunity = async () => {
    if (!window.confirm(`Delete ${community?.name}? This removes the community and every task posted to it. This cannot be undone.`)) return;
    setBusy(true);
    const { error: deleteError } = await supabase.from('communities').delete().eq('id', communityId);
    setBusy(false);
    if (deleteError) {
      setError(friendlyError(deleteError));
      return;
    }
    navigate('/communities');
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-96">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-orange-500"></div>
      </div>
    );
  }

  if (notFound || !community) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-3xl mx-auto bg-white rounded-lg shadow-md p-6 text-center">
          <h2 className="text-xl font-semibold text-red-500">Community not found</h2>
          <Link to="/communities" className="mt-4 inline-block text-orange-500 hover:text-orange-600">Browse communities</Link>
        </div>
      </div>
    );
  }

  const tabs = [
    ['tasks', 'Tasks'],
    ['members', `Members (${members.length})`],
    ...(isAdmin ? [['settings', 'Settings']] : []),
  ];

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-4xl mx-auto">
        <Link to="/communities" className="inline-flex items-center gap-2 text-gray-600 hover:text-orange-500 mb-4">
          <FaArrowLeft /> All communities
        </Link>

        {/* Header */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold flex items-center gap-2">
                <FaUsers className="text-orange-500" /> {community.name}
              </h1>
              {community.description && <p className="text-gray-600 mt-2 whitespace-pre-line">{community.description}</p>}
              <p className="text-sm text-gray-500 mt-2">
                {community.join_policy === 'email_domain'
                  ? `Only for @${community.email_domain} email addresses`
                  : JOIN_POLICY_LABELS[community.join_policy]}
              </p>
            </div>

            <div className="flex flex-col items-end gap-2">
              {!currentUser && (
                <Link to="/login" className="bg-orange-500 text-white px-4 py-2 rounded-md hover:bg-orange-600">
                  Log in to join
                </Link>
              )}
              {currentUser && !isMember && (
                <div className="flex flex-wrap items-center gap-2">
                  {community.join_policy === 'invite_code' && (
                    <input
                      value={joinCode}
                      onChange={e => setJoinCode(e.target.value)}
                      placeholder="Invite code"
                      className="px-3 py-2 border rounded-md w-36 uppercase"
                    />
                  )}
                  <button
                    onClick={handleJoin}
                    disabled={busy || (community.join_policy === 'invite_code' && !joinCode.trim())}
                    className="bg-orange-500 text-white px-4 py-2 rounded-md hover:bg-orange-600 disabled:bg-gray-400"
                  >
                    Join community
                  </button>
                </div>
              )}
              {isMember && (
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-sm bg-green-100 text-green-800 px-3 py-1 rounded-full">
                    {isAdmin ? 'You are an admin' : 'You are a member'}
                  </span>
                  <button
                    onClick={handleLeave}
                    disabled={busy}
                    className="text-sm text-gray-600 hover:text-red-600 flex items-center gap-1"
                  >
                    <FaSignOutAlt /> Leave
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Invite code: every member can see and share it; admins can reset it */}
          {isMember && community.join_policy === 'invite_code' && (
            <div className="mt-4 bg-orange-50 border border-orange-200 rounded-md p-4 flex flex-wrap items-center gap-3">
              <span className="text-sm text-gray-700">Invite code:</span>
              <code className="text-lg font-mono bg-white px-3 py-1 rounded border tracking-widest">{inviteCode || '...'}</code>
              <button onClick={copyCode} disabled={!inviteCode} className="flex items-center gap-1 text-orange-600 hover:text-orange-700 text-sm">
                <FaCopy /> Copy
              </button>
              {isAdmin && (
                <button onClick={resetCode} disabled={busy} className="flex items-center gap-1 text-gray-600 hover:text-gray-800 text-sm">
                  <FaSyncAlt /> New code
                </button>
              )}
              <span className="text-xs text-gray-500 w-full">Share this with people you want to invite. They enter it on this page to join.</span>
            </div>
          )}

          {message && <div className="mt-4 bg-green-50 text-green-800 p-3 rounded-md text-sm">{message}</div>}
          {error && <div className="mt-4 bg-red-50 text-red-700 p-3 rounded-md text-sm">{error}</div>}
        </div>

        {/* Members-only content */}
        {!isMember ? (
          <div className="bg-white rounded-lg shadow-md p-8 text-center text-gray-600">
            Join this community to see and post its tasks.
          </div>
        ) : (
          <div className="bg-white rounded-lg shadow-md overflow-hidden">
            <nav className="flex border-b border-gray-200">
              {tabs.map(([key, label]) => (
                <button
                  key={key}
                  onClick={() => setActiveTab(key)}
                  className={`px-4 py-3 font-medium ${activeTab === key ? 'border-b-2 border-orange-500 text-orange-600' : 'text-gray-600 hover:text-gray-800'}`}
                >
                  {label}
                </button>
              ))}
            </nav>

            <div className="p-6">
              {activeTab === 'tasks' && (
                <div>
                  <div className="flex justify-between items-center mb-4">
                    <h2 className="text-lg font-semibold">Open tasks in {community.name}</h2>
                    <Link
                      to={`/post-task?community=${community.id}`}
                      className="bg-orange-500 text-white px-3 py-2 rounded-md hover:bg-orange-600 flex items-center gap-2 text-sm"
                    >
                      <FaPlus /> Post a task here
                    </Link>
                  </div>
                  {tasks.length === 0 ? (
                    <p className="text-gray-500 text-center py-8">No open tasks yet. Be the first to ask for a hand!</p>
                  ) : (
                    <div className="grid gap-4">
                      {tasks.map(task => (
                        <TaskCard
                          key={task.id}
                          task={task}
                          currentUser={currentUser}
                          openChat={(id, name) => setChatRecipient({ id, name: name || 'User' })}
                        />
                      ))}
                    </div>
                  )}
                </div>
              )}

              {activeTab === 'members' && (
                <ul className="divide-y">
                  {members.map(m => {
                    const name = m.users?.display_name || 'User';
                    const isMe = m.user_id === currentUser?.id;
                    return (
                      <li key={m.user_id} className="py-3 flex flex-wrap items-center gap-3">
                        <Link to={`/users/${m.user_id}`} className="flex items-center gap-3 hover:text-orange-500">
                          {m.users?.profile_picture_url ? (
                            <img src={m.users.profile_picture_url} alt={name} className="w-10 h-10 rounded-full object-cover" />
                          ) : (
                            <FaUserCircle className="w-10 h-10 text-gray-400" />
                          )}
                          <span className="font-medium">{name}{isMe && ' (you)'}</span>
                        </Link>
                        {m.role === 'admin' && (
                          <span className="text-xs bg-orange-100 text-orange-700 px-2 py-1 rounded-full">Admin</span>
                        )}
                        {isAdmin && !isMe && (
                          <div className="ml-auto flex gap-3 text-sm">
                            {m.role === 'admin' ? (
                              <button onClick={() => setRole(m.user_id, 'member')} disabled={busy} className="text-gray-600 hover:text-orange-600">
                                Remove admin
                              </button>
                            ) : (
                              <button onClick={() => setRole(m.user_id, 'admin')} disabled={busy} className="text-gray-600 hover:text-orange-600">
                                Make admin
                              </button>
                            )}
                            <button onClick={() => removeMember(m.user_id, name)} disabled={busy} className="text-red-600 hover:text-red-700">
                              Remove
                            </button>
                          </div>
                        )}
                      </li>
                    );
                  })}
                </ul>
              )}

              {activeTab === 'settings' && isAdmin && editForm && (
                <div className="space-y-8">
                  <form onSubmit={saveSettings} className="space-y-4">
                    <h2 className="text-lg font-semibold">Community details</h2>
                    <div>
                      <label className="block text-sm font-medium mb-1" htmlFor="edit-name">Name</label>
                      <input
                        id="edit-name"
                        value={editForm.name}
                        onChange={e => setEditForm({ ...editForm, name: e.target.value })}
                        maxLength={80}
                        className="w-full px-3 py-2 border rounded-md"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-1" htmlFor="edit-description">Description</label>
                      <textarea
                        id="edit-description"
                        value={editForm.description}
                        onChange={e => setEditForm({ ...editForm, description: e.target.value })}
                        maxLength={1000}
                        rows={3}
                        className="w-full px-3 py-2 border rounded-md"
                      />
                    </div>
                    <div>
                      <span className="block text-sm font-medium mb-1">Who can join?</span>
                      {Object.entries(JOIN_POLICY_LABELS).map(([value, label]) => (
                        <label key={value} className="flex items-center gap-2">
                          <input
                            type="radio"
                            name="edit_join_policy"
                            value={value}
                            checked={editForm.join_policy === value}
                            onChange={() => setEditForm({ ...editForm, join_policy: value })}
                          />
                          {label}
                        </label>
                      ))}
                    </div>
                    {editForm.join_policy === 'email_domain' && (
                      <div className="flex items-center gap-1">
                        <span className="text-gray-500">@</span>
                        <input
                          value={editForm.email_domain}
                          onChange={e => setEditForm({ ...editForm, email_domain: e.target.value })}
                          placeholder="city.ac.uk"
                          className="w-full px-3 py-2 border rounded-md"
                        />
                      </div>
                    )}
                    <p className="text-xs text-gray-500">Changing who can join doesn't remove existing members.</p>
                    <button type="submit" disabled={busy} className="bg-orange-500 text-white px-4 py-2 rounded-md hover:bg-orange-600 disabled:bg-gray-400">
                      Save changes
                    </button>
                  </form>

                  <div className="border-t pt-6">
                    <h2 className="text-lg font-semibold text-red-600 mb-2">Delete community</h2>
                    <p className="text-sm text-gray-600 mb-3">Removes the community, its member list and every task posted to it.</p>
                    <button onClick={deleteCommunity} disabled={busy} className="bg-red-600 text-white px-4 py-2 rounded-md hover:bg-red-700 flex items-center gap-2">
                      <FaTrash /> Delete community
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {chatRecipient && (
        <ChatModal
          isOpen={Boolean(chatRecipient)}
          onClose={() => setChatRecipient(null)}
          recipientId={chatRecipient.id}
          recipientName={chatRecipient.name}
        />
      )}
    </div>
  );
}

export default CommunityDetail;
