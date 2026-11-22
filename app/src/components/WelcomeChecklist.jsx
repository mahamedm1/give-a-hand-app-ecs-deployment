import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { FaCheckCircle, FaRegCircle, FaTimes } from 'react-icons/fa';
import supabase from '../helper/supabaseClient';

const dismissKey = (userId) => `welcomeChecklistDismissed_${userId}`;

/**
 * Getting-started steps for new users, shown on the home page until every
 * step is done or the user hides it.
 */
function WelcomeChecklist() {
  const [steps, setSteps] = useState(null);
  const [userId, setUserId] = useState(null);
  const [hidden, setHidden] = useState(false);

  useEffect(() => {
    const load = async () => {
      const { data: authData } = await supabase.auth.getUser();
      const me = authData?.user;
      if (!me) return;
      setUserId(me.id);
      try {
        if (localStorage.getItem(dismissKey(me.id))) {
          setHidden(true);
          return;
        }
      } catch {
        // storage unavailable - just show the checklist
      }

      const [{ data: profile }, { count: communityCount }, { count: taskCount }] = await Promise.all([
        supabase.from('users').select('skills, profile_picture_url').eq('id', me.id).maybeSingle(),
        supabase.from('community_members').select('user_id', { count: 'exact', head: true }).eq('user_id', me.id),
        supabase.from('tasks').select('id', { count: 'exact', head: true }).eq('user_id', me.id),
      ]);

      setSteps([
        { done: Boolean(profile?.skills?.length), label: 'Add the skills you can help with', to: '/profile' },
        { done: Boolean(profile?.profile_picture_url), label: 'Add a profile picture so people recognise you', to: '/profile' },
        { done: (communityCount || 0) > 0, label: 'Join a community (your halls, course or area)', to: '/communities' },
        { done: (taskCount || 0) > 0, label: 'Post your first task', to: '/post-task' },
      ]);
    };
    load();
  }, []);

  if (hidden || !steps || steps.every(s => s.done)) return null;

  const doneCount = steps.filter(s => s.done).length;

  const dismiss = () => {
    setHidden(true);
    try {
      localStorage.setItem(dismissKey(userId), '1');
    } catch {
      // ignore
    }
  };

  return (
    <section className="container mx-auto px-4 pt-8">
      <div className="bg-white border border-orange-200 rounded-lg shadow-sm p-6 relative">
        <button onClick={dismiss} className="absolute top-4 right-4 text-gray-400 hover:text-gray-600" title="Hide">
          <FaTimes />
        </button>
        <h2 className="text-xl font-semibold">Get started with Give a Hand</h2>
        <p className="text-sm text-gray-500 mb-4">{doneCount} of {steps.length} done</p>
        <ul className="space-y-2">
          {steps.map(step => (
            <li key={step.label} className="flex items-center gap-3">
              {step.done ? <FaCheckCircle className="text-green-500" /> : <FaRegCircle className="text-gray-300" />}
              {step.done ? (
                <span className="text-gray-400 line-through">{step.label}</span>
              ) : (
                <Link to={step.to} className="text-gray-800 hover:text-orange-600 hover:underline">{step.label}</Link>
              )}
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}

export default WelcomeChecklist;
