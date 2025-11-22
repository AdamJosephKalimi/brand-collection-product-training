import { auth } from '../firebase/config';

/**
 * Get the authentication token for the current user
 * @returns {Promise<string>} The ID token
 * @throws {Error} If user is not authenticated
 */
export const getAuthToken = async () => {
  const user = auth.currentUser;
  if (!user) {
    throw new Error('User not authenticated');
  }
  return await user.getIdToken();
};
