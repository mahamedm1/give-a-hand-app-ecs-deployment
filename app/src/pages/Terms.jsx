import { Link } from 'react-router-dom';
import InfoPage from '../components/InfoPage';

// A plain-English starting draft. Have it reviewed before launching to the public.
function Terms() {
  return (
    <InfoPage title="Terms of Service" updated="22 November 2026">
      <p>
        By creating an account on Give a Hand you agree to these terms. Please read them, along with our{' '}
        <Link to="/privacy">Privacy Policy</Link>.
      </p>

      <h2>What Give a Hand is</h2>
      <p>
        Give a Hand helps people exchange help with everyday tasks without money. We provide the platform
        only: we don't employ, vet or supervise users, and we aren't a party to any arrangement between users.
      </p>

      <h2>Your account</h2>
      <ul>
        <li>You must be 18 or over, or have permission from a parent or guardian.</li>
        <li>Give accurate details and keep your password secret. You're responsible for activity on your account.</li>
        <li>One account per person.</li>
      </ul>

      <h2>No money</h2>
      <p>
        Exchanges on Give a Hand are swaps of time and skills. Don't ask for, offer or accept payment, deposits
        or gifts in return for tasks.
      </p>

      <h2>Acceptable use</h2>
      <p>You must not:</p>
      <ul>
        <li>harass, threaten, discriminate against or abuse anyone;</li>
        <li>post anything illegal, misleading, sexual, hateful or dangerous;</li>
        <li>offer tasks that need a licence or qualification you don't have (for example gas or electrical work);</li>
        <li>offer childcare or care of vulnerable people, or any task involving them;</li>
        <li>spam, scam, impersonate others, or misuse other users' information.</li>
      </ul>

      <h2>Safety</h2>
      <ul>
        <li>Use your judgement. Read profiles and reviews, and message first.</li>
        <li>For in-person tasks, meet somewhere public or shared first and tell someone where you'll be.</li>
        <li>You take part in tasks at your own risk. Never do something you aren't comfortable or competent doing.</li>
        <li>Use the <strong>Report</strong> and <strong>Block</strong> buttons on any profile if something is wrong.</li>
      </ul>

      <h2>Communities</h2>
      <p>
        Community admins set who can join and can remove members and posts. Admins must apply these terms
        fairly. We may remove communities that break them.
      </p>

      <h2>Your content</h2>
      <p>
        You keep ownership of what you post, and give us permission to show it on the platform. We may remove
        content or suspend accounts that break these terms.
      </p>

      <h2>Liability</h2>
      <p>
        The platform is provided "as is". To the extent the law allows, we aren't responsible for the conduct
        of users, the quality of tasks, or loss or damage arising from arrangements between users. Nothing in
        these terms limits liability that can't be limited by law.
      </p>

      <h2>Ending your account</h2>
      <p>
        You can delete your account at any time from your profile page. We may suspend or close accounts that
        break these terms.
      </p>

      <h2>Changes</h2>
      <p>We may update these terms. If the changes are significant we'll tell you in the app.</p>

      <p>These terms are governed by the law of England and Wales.</p>
    </InfoPage>
  );
}

export default Terms;
