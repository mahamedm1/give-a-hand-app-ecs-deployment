import { Link } from 'react-router-dom';
import { FaUsers } from 'react-icons/fa';

/** Shows which community a task belongs to (renders nothing for public tasks). */
function CommunityBadge({ community }) {
  if (!community?.id) return null;
  return (
    <Link
      to={`/communities/${community.id}`}
      title="Only members of this community can see this task"
      className="inline-flex items-center gap-1 bg-orange-50 text-orange-700 border border-orange-200 rounded-full px-3 py-1 text-sm font-medium hover:bg-orange-100"
    >
      <FaUsers /> {community.name}
    </Link>
  );
}

export default CommunityBadge;
