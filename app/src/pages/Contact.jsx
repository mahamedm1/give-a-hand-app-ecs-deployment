import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import supabase from '../helper/supabaseClient';
import InfoPage from '../components/InfoPage';

// Messages go into the same inbox as reports, so site admins see them in one place
function Contact() {
  const [currentUser, setCurrentUser] = useState(undefined);
  const [details, setDetails] = useState('');
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setCurrentUser(data?.user || null));
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!details.trim()) return;
    setSending(true);
    setError(null);
    const { error: insertError } = await supabase.from('user_reports').insert({
      reporter_id: currentUser.id,
      reason: 'contact',
      details: details.trim(),
    });
    setSending(false);
    if (insertError) {
      setError(insertError.message || 'Could not send your message. Please try again.');
      return;
    }
    setSent(true);
    setDetails('');
  };

  return (
    <InfoPage title="Contact us">
      <p>
        Questions, feedback, a data request, or a problem with the site? Send us a message and we'll get back
        to you by email. To report a specific person, use the <strong>Report</strong> button on their profile instead.
      </p>
      <p>Have a look at the <Link to="/faq">FAQ</Link> too.</p>

      {currentUser === undefined ? null : !currentUser ? (
        <p className="bg-orange-50 p-4 rounded-md">
          Please <Link to="/login">log in</Link> to send us a message, so we know who to reply to.
        </p>
      ) : sent ? (
        <p className="bg-green-50 text-green-800 p-4 rounded-md">Thanks, your message has been sent.</p>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-3">
          {error && <p className="bg-red-50 text-red-700 p-3 rounded-md">{error}</p>}
          <label htmlFor="contact-details" className="block font-medium">Your message</label>
          <textarea
            id="contact-details"
            value={details}
            onChange={e => setDetails(e.target.value)}
            maxLength={2000}
            rows={6}
            required
            className="w-full px-3 py-2 border rounded-md"
          />
          <button
            type="submit"
            disabled={sending || !details.trim()}
            className="bg-orange-500 text-white px-4 py-2 rounded-md hover:bg-orange-600 disabled:bg-gray-400"
          >
            {sending ? 'Sending...' : 'Send message'}
          </button>
        </form>
      )}
    </InfoPage>
  );
}

export default Contact;
