import { Link } from 'react-router-dom';
import InfoPage from '../components/InfoPage';

// A plain-English starting draft. Have it reviewed (e.g. by your university's
// data protection office) before launching to the public.
function Privacy() {
  return (
    <InfoPage title="Privacy Policy" updated="22 November 2026">
      <p>
        Give a Hand is a community platform for swapping help instead of money. This page explains what
        personal information we collect, why, who can see it, and the choices you have. We follow the UK
        General Data Protection Regulation (UK GDPR) and the Data Protection Act 2018.
      </p>

      <h2>What we collect</h2>
      <ul>
        <li><strong>Account details:</strong> your name, username, email address, password (stored only in scrambled, hashed form) and your city or area.</li>
        <li><strong>Optional details:</strong> phone number, profile picture and the skills you choose to list.</li>
        <li><strong>What you post:</strong> tasks, swap offers, messages, reviews, community memberships, and any reports you make.</li>
        <li><strong>Technical data:</strong> the login session stored in your browser so you stay signed in.</li>
      </ul>

      <h2>Why we use it (and our lawful basis)</h2>
      <ul>
        <li>To run your account and the service you asked for: posting tasks, swapping, messaging, communities (<em>contract</em>).</li>
        <li>To keep the community safe: handling reports, blocking, preventing abuse (<em>legitimate interests</em>).</li>
        <li>To email you about swap offers and messages; you can switch this off on your profile (<em>legitimate interests</em>).</li>
      </ul>

      <h2>Who can see your information</h2>
      <ul>
        <li><strong>Everyone:</strong> your display name, first and last name, city, profile picture, skills, rating and reviews, and public tasks.</li>
        <li><strong>Community members only:</strong> tasks you post to a community.</li>
        <li><strong>The people you message:</strong> your messages.</li>
        <li><strong>Only you:</strong> your email address and phone number. Other users cannot see them.</li>
        <li><strong>Site administrators:</strong> reports, to deal with safety issues.</li>
      </ul>
      <p>We never sell your data and there is no advertising.</p>

      <h2>Service providers</h2>
      <p>
        Your data is stored with <strong>Supabase</strong> (database, logins and file storage), and emails are
        sent through <strong>Brevo</strong>. They process data on our behalf and may store it outside the UK
        under approved safeguards.
      </p>

      <h2>How long we keep it</h2>
      <p>
        We keep your information while your account is open. When you delete your account, your profile,
        tasks, messages, swaps, reviews, community memberships and profile picture are permanently deleted.
      </p>

      <h2>Your rights</h2>
      <ul>
        <li>See and correct your details: on your <Link to="/profile">profile page</Link>.</li>
        <li>Delete your account and data: on your profile page, under "Delete my account".</li>
        <li>Stop notification emails: on your profile page.</li>
        <li>Ask for a copy of your data, or object to how we use it: through the <Link to="/contact">contact page</Link>.</li>
      </ul>
      <p>
        If you're unhappy with how we handle your data, you can complain to the Information Commissioner's
        Office (ICO) at <a href="https://ico.org.uk" target="_blank" rel="noreferrer">ico.org.uk</a>.
      </p>
    </InfoPage>
  );
}

export default Privacy;
