/**
 * Profile pictures now live in Supabase Storage, and their public URL is
 * saved in users.profile_picture_url so every user can see them.
 *
 * Earlier versions kept the picture only in this browser's localStorage,
 * which meant nobody else could see it. These helpers are kept so existing
 * imports keep working, but they no longer read or write browser storage
 * (and they clear any old browser-only copy).
 */

const legacyKey = (userId) => `userProfilePicture_${userId}`;

const clearLegacyPicture = (userId) => {
  if (!userId) return;
  try {
    localStorage.removeItem(legacyKey(userId));
    sessionStorage.removeItem(legacyKey(userId));
  } catch {
    // storage unavailable (private mode etc.) - nothing to clear
  }
};

/** No browser-only pictures any more: always defer to the database. */
export const getProfilePicture = () => null;

/** Kept for compatibility; just removes any old browser-only copy. */
export const saveProfilePicture = (userId) => clearLegacyPicture(userId);

/** Returns the profile unchanged: profile_picture_url comes from the database. */
export const enhanceProfileWithPicture = (profile) => profile;

export const initProfilePictureSystem = () => {};

/**
 * Kept so Profile.jsx keeps working. The picture comes from the profile row,
 * so this always yields null; calling the setter clears the old local copy.
 */
export const useProfilePicture = (userId) => {
  const update = () => clearLegacyPicture(userId);
  return [null, update];
};
