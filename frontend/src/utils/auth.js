import { auth } from '../firebase/config';

/**
 * Get the authentication token for the current user
 * @param {boolean} forceRefresh - Force token refresh (default: false)
 * @returns {Promise<string>} The ID token
 * @throws {Error} If user is not authenticated
 */
export const getAuthToken = async (forceRefresh = false) => {
  const user = auth.currentUser;
  if (!user) {
    throw new Error('User not authenticated');
  }
  // getIdToken() automatically refreshes if expired
  // Pass true to force refresh even if not expired
  return await user.getIdToken(forceRefresh);
};
