import { 
  createUserWithEmailAndPassword, 
  signInWithEmailAndPassword,
  signOut,
  sendEmailVerification,
  sendPasswordResetEmail,
  updateProfile,
  onAuthStateChanged
} from 'firebase/auth';
import { setDoc, doc, getDoc, updateDoc } from 'firebase/firestore';
import { auth, db } from '../config/firebase';

/**
 * Sign up a new user with email and password
 * @param {string} email - User email
 * @param {string} password - User password
 * @param {object} userData - Additional user data (name, shopName, gstin)
 * @returns {object} Firebase user credential
 */
export const signup = async (email, password, userData) => {
  try {
    // Create user with Firebase Authentication
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    const firebaseUser = userCredential.user;

    // Update user profile with display name
    if (userData.name) {
      await updateProfile(firebaseUser, {
        displayName: userData.name,
      });
    }

    // Store user data in Firestore
    await setDoc(doc(db, 'users', firebaseUser.uid), {
      uid: firebaseUser.uid,
      name: userData.name || '',
      email: firebaseUser.email,
      shopName: userData.shopName || '',
      gstin: userData.gstin || '',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      emailVerified: firebaseUser.emailVerified,
      lastLogin: new Date().toISOString(),
    });

    // Send email verification asynchronously (non-blocking)
    // This doesn't block the signup flow anymore
    sendEmailVerification(firebaseUser).catch((err) => {
      console.warn('Email verification failed:', err);
    });

    return userCredential;
  } catch (error) {
    throw error;
  }
};

/**
 * Sign in user with email and password
 * @param {string} email - User email
 * @param {string} password - User password
 * @returns {object} Firebase user credential
 */
export const login = async (email, password) => {
  try {
    const userCredential = await signInWithEmailAndPassword(auth, email, password);
    const firebaseUser = userCredential.user;

    // Update last login time in Firestore asynchronously (non-blocking)
    // This doesn't delay the login response
    updateDoc(doc(db, 'users', firebaseUser.uid), {
      lastLogin: new Date().toISOString(),
    }).catch((err) => {
      console.warn('Failed to update lastLogin:', err);
    });

    return userCredential;
  } catch (error) {
    throw error;
  }
};

/**
 * Sign out the current user
 * @returns {Promise} Promise that resolves when user is signed out
 */
export const logout = async () => {
  try {
    await signOut(auth);
  } catch (error) {
    throw error;
  }
};

/**
 * Send password reset email
 * @param {string} email - User email
 * @returns {Promise} Promise that resolves when email is sent
 */
export const sendPasswordReset = async (email) => {
  try {
    await sendPasswordResetEmail(auth, email);
  } catch (error) {
    throw error;
  }
};

/**
 * Send email verification to user
 * @returns {Promise} Promise that resolves when email is sent
 */
export const sendVerificationEmail = async () => {
  try {
    const user = auth.currentUser;
    if (user) {
      await sendEmailVerification(user);
    }
  } catch (error) {
    throw error;
  }
};

/**
 * Get current user data with real-time updates
 * @returns {Promise} Promise that resolves with current user data
 */
export const getCurrentUserData = async () => {
  try {
    const user = auth.currentUser;
    if (!user) return null;

    const userDoc = await getDoc(doc(db, 'users', user.uid));
    if (userDoc.exists()) {
      return {
        id: user.uid,
        uid: user.uid,
        email: user.email,
        emailVerified: user.emailVerified,
        ...userDoc.data(),
      };
    }
    return null;
  } catch (error) {
    throw error;
  }
};

/**
 * Listen to real-time auth state changes
 * @param {function} callback - Callback function to execute on auth state change
 * @returns {function} Unsubscribe function
 */
export const listenToAuthStateChange = (callback) => {
  return onAuthStateChanged(auth, async (firebaseUser) => {
    if (firebaseUser) {
      try {
        const userData = await getCurrentUserData();
        callback({
          user: userData,
          isAuthenticated: true,
          loading: false,
        });
      } catch (error) {
        console.error('Error fetching user data:', error);
        callback({
          user: null,
          isAuthenticated: false,
          loading: false,
          error: error.message,
        });
      }
    } else {
      callback({
        user: null,
        isAuthenticated: false,
        loading: false,
      });
    }
  });
};

/**
 * Update user profile information
 * @param {object} updates - Object containing fields to update
 * @returns {Promise} Promise that resolves when update is complete
 */
export const updateUserProfile = async (updates) => {
  try {
    const user = auth.currentUser;
    if (!user) throw new Error('No user logged in');

    // Update Firestore document
    await updateDoc(doc(db, 'users', user.uid), {
      ...updates,
      updatedAt: new Date().toISOString(),
    });

    // Update display name if provided
    if (updates.name) {
      await updateProfile(user, {
        displayName: updates.name,
      });
    }
  } catch (error) {
    throw error;
  }
};

/**
 * Check if email is already registered
 * @param {string} email - Email to check
 * @returns {boolean} True if email exists, false otherwise
 */
export const checkEmailExists = async (email) => {
  // Placeholder - implement as needed
  // In production, you might want to use Firebase Cloud Functions for this
  // For now, Firebase will handle duplicate email during signup
  return false;
};
