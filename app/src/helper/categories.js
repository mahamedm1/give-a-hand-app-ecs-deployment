// One list used for task categories AND the skills people list on their
// profile, so "Suggested for you" can match one against the other.
export const CATEGORIES = [
  'Cleaning',
  'Cooking',
  'Errands',
  'Gardening',
  'Home Repair',
  'Moving',
  'Pet Care',
  'Technology',
  'Tutoring',
  'Other',
];

// Skills to pick from (everything except the catch-all)
export const SKILLS = CATEGORIES.filter(c => c !== 'Other');
