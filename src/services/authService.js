import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  sendEmailVerification,
  sendPasswordResetEmail,
  updateProfile,
  onAuthStateChanged,
  signInWithPopup,
  signInWithPhoneNumber,
} from "firebase/auth";
import { setDoc, doc, getDoc, updateDoc } from "firebase/firestore";
import { auth, db, googleProvider } from "../config/firebase";
import { perf } from "./perfService";

/**
 * Suppress Cross-Origin-Opener-Policy console warnings and popup cancellations
 * These warnings occur when Firebase checks window.closed on cross-origin popups
 * Popup-closed-by-user errors are handled gracefully in components
 * The warnings don't affect functionality, just create console noise
 */
if (typeof window !== "undefined") {
  const originalError = console.error;
  const originalWarn = console.warn;

  // Suppress COOP, policy warnings, and popup cancellation errors
  console.error = function (...args) {
    const message = args.join(" ");
    if (
      message.includes("Cross-Origin-Opener-Policy") ||
      message.includes("window.closed") ||
      message.includes("Cross-Origin-Embedder-Policy") ||
      message.includes("popup-closed-by-user")
    ) {
      return; // Silently suppress
    }
    originalError.apply(console, args);
  };

  console.warn = function (...args) {
    const message = args.join(" ");
    if (
      message.includes("Cross-Origin-Opener-Policy") ||
      message.includes("window.closed") ||
      message.includes("Cross-Origin-Embedder-Policy") ||
      message.includes("popup-closed-by-user")
    ) {
      return; // Silently suppress
    }
    originalWarn.apply(console, args);
  };
}

/**
 * Sign up a new user with email and password - OPTIMIZED for speed
 * @param {string} email - User email
 * @param {string} password - User password
 * @param {object} userData - Additional user data (name, shopName, gstin)
 * @returns {object} Firebase user credential
 */
export const signup = async (email, password, userData) => {
  try {
    // Step 1: Create user with Firebase Authentication (REQUIRED - BLOCKING)
    perf.start("FIREBASE_CREATEUSER");
    const userCredential = await createUserWithEmailAndPassword(
      auth,
      email,
      password,
    );
    perf.end("FIREBASE_CREATEUSER");
    const firebaseUser = userCredential.user;

    // Step 2: Run all other operations in PARALLEL (NON-BLOCKING)
    // These don't block the return, allowing faster signup response
    Promise.all([
      // Update display name
      userData.name
        ? updateProfile(firebaseUser, { displayName: userData.name })
        : Promise.resolve(),

      // Store user data in Firestore (background operation)
      setDoc(doc(db, "users", firebaseUser.uid), {
        uid: firebaseUser.uid,
        name: userData.name || "",
        email: firebaseUser.email,
        shopName: userData.shopName || "",
        gstin: userData.gstin || "",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        emailVerified: firebaseUser.emailVerified,
        lastLogin: new Date().toISOString(),
      }).catch((firestoreErr) => {
        // Silently fail - user can still login
      }),

      // Send email verification (background operation)
      sendEmailVerification(firebaseUser).catch(() => {
        // Silently fail
      }),
    ]).catch(() => {
      // Silently catch any parallel operation errors
    });

    return userCredential;
  } catch (error) {
    throw error;
  }
};

/**
 * Sign in user with email and password - OPTIMIZED for speed
 * @param {string} email - User email
 * @param {string} password - User password
 * @returns {object} Firebase user credential
 */
export const login = async (email, password) => {
  try {
    // Step 1: Firebase Authentication (REQUIRED - BLOCKING)
    perf.start("FIREBASE_SIGNIN");
    const userCredential = await signInWithEmailAndPassword(
      auth,
      email,
      password,
    );
    perf.end("FIREBASE_SIGNIN");
    const firebaseUser = userCredential.user;

    // Step 2: Update lastLogin in background (NON-BLOCKING)
    // This doesn't delay the login response
    updateDoc(doc(db, "users", firebaseUser.uid), {
      lastLogin: new Date().toISOString(),
    }).catch(() => {
      // Silently fail - doesn't affect login
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
    // Configure action code settings for password reset
    const origin = typeof window !== "undefined" ? window.location.origin : "";
    const actionCodeSettings = {
      url: `${origin}/login`,
      handleCodeInApp: true,
    };

    await sendPasswordResetEmail(auth, email, actionCodeSettings);
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

    const userDoc = await getDoc(doc(db, "users", user.uid));
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
        console.error("Error fetching user data:", error);
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
    if (!user) throw new Error("No user logged in");

    // Update Firestore document
    await updateDoc(doc(db, "users", user.uid), {
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

/**
 * Sign in with Google OAuth - OPTIMIZED for speed
 * @returns {object} Firebase user credential
 */
export const loginWithGoogle = async () => {
  try {
    perf.start("GOOGLE_AUTH");
    console.log("🔐 Initiating Google Sign-In...");
    console.log("📍 Auth Domain:", process.env.REACT_APP_FIREBASE_AUTH_DOMAIN);
    console.log("📍 Project ID:", process.env.REACT_APP_FIREBASE_PROJECT_ID);

    const result = await signInWithPopup(auth, googleProvider);
    perf.end("GOOGLE_AUTH");
    console.log("✅ Google Sign-In successful", result.user.email);

    const firebaseUser = result.user;

    // Check if user already exists in Firestore
    const userDocRef = doc(db, "users", firebaseUser.uid);
    const userDocSnapshot = await getDoc(userDocRef);

    // If user is new, create their profile
    if (!userDocSnapshot.exists()) {
      console.log("📝 Creating new user profile in Firestore...");
      await setDoc(userDocRef, {
        uid: firebaseUser.uid,
        name: firebaseUser.displayName || "",
        email: firebaseUser.email,
        photoURL: firebaseUser.photoURL || "",
        shopName: "",
        gstin: "",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        emailVerified: firebaseUser.emailVerified,
        lastLogin: new Date().toISOString(),
        authProvider: "google",
      })
        .then(() => {
          console.log("✅ User profile created successfully");
        })
        .catch((err) => {
          console.error("❌ Error creating user profile:", err);
        });
    } else {
      // Update last login for existing user
      console.log("🔄 Updating existing user last login...");
      await updateDoc(userDocRef, {
        lastLogin: new Date().toISOString(),
      })
        .then(() => {
          console.log("✅ Last login updated successfully");
        })
        .catch((err) => {
          console.error("❌ Error updating last login:", err);
        });
    }

    return result;
  } catch (error) {
    // Don't log popup-closed-by-user errors - they're handled gracefully
    if (error.code !== "auth/popup-closed-by-user") {
      console.error("❌ Google Sign-In Error:", {
        code: error.code,
        message: error.message,
        customData: error.customData,
      });

      // Additional debugging info
      if (error.message && error.message.includes("unauthorized_client")) {
        console.error(
          "⚠️ DOMAIN AUTHORIZATION ISSUE: Domain may not be authorized in Firebase console",
        );
        console.error(
          "📍 Current URL:",
          typeof window !== "undefined" ? window.location.href : "N/A",
        );
      }
    }

    throw error;
  }
};

/**
 * Sign up with Google OAuth - OPTIMIZED for speed
 * @param {object} userData - Additional user data (shopName, gstin)
 * @returns {object} Firebase user credential
 */
export const signupWithGoogle = async (userData = {}) => {
  try {
    perf.start("GOOGLE_SIGNUP");
    console.log("🔐 Initiating Google Sign-Up...");
    console.log("📍 Auth Domain:", process.env.REACT_APP_FIREBASE_AUTH_DOMAIN);
    console.log("📍 Project ID:", process.env.REACT_APP_FIREBASE_PROJECT_ID);

    const result = await signInWithPopup(auth, googleProvider);
    perf.end("GOOGLE_SIGNUP");
    console.log("✅ Google Sign-Up successful", result.user.email);

    const firebaseUser = result.user;

    // Create user profile in Firestore
    console.log("📝 Creating new user profile in Firestore for sign-up...");
    await setDoc(doc(db, "users", firebaseUser.uid), {
      uid: firebaseUser.uid,
      name: firebaseUser.displayName || "",
      email: firebaseUser.email,
      photoURL: firebaseUser.photoURL || "",
      gstin: userData.gstin || "",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      emailVerified: firebaseUser.emailVerified,
      lastLogin: new Date().toISOString(),
      authProvider: "google",
    })
      .then(() => {
        console.log("✅ User profile created successfully");
      })
      .catch((err) => {
        console.error("❌ Error creating user profile:", err);
      });

    return result;
  } catch (error) {
    // Don't log popup-closed-by-user errors - they're handled gracefully
    if (error.code !== "auth/popup-closed-by-user") {
      console.error("❌ Google Sign-Up Error:", {
        code: error.code,
        message: error.message,
        customData: error.customData,
      });

      // Additional debugging info
      if (error.message && error.message.includes("unauthorized_client")) {
        console.error(
          "⚠️ DOMAIN AUTHORIZATION ISSUE: Domain may not be authorized in Firebase console",
        );
        console.error(
          "📍 Current URL:",
          typeof window !== "undefined" ? window.location.href : "N/A",
        );
      }
    }

    throw error;
  }
};

/**
 * Send OTP to phone number
 * @param {string} phoneNumber - Phone number with country code (e.g., +91 9876543210)
 * @param {object} recaptchaVerifier - RecaptchaVerifier instance
 * @returns {object} Confirmation result with verificationId
 */
export const sendPhoneOTP = async (phoneNumber, recaptchaVerifier) => {
  try {
    perf.start("PHONE_OTP_SEND");

    const appVerifier = recaptchaVerifier;
    const confirmationResult = await signInWithPhoneNumber(
      auth,
      phoneNumber,
      appVerifier,
    );

    perf.end("PHONE_OTP_SEND");

    // Return confirmation result to be used for verifying OTP
    return confirmationResult;
  } catch (error) {
    throw error;
  }
};

/**
 * Verify OTP and sign in user
 * @param {object} confirmationResult - Result from sendPhoneOTP
 * @param {string} otp - OTP code entered by user
 * @param {object} userData - Additional user data (name, shopName, gstin)
 * @returns {object} Firebase user credential
 */
export const verifyPhoneOTP = async (
  confirmationResult,
  otp,
  userData = {},
) => {
  try {
    perf.start("PHONE_OTP_VERIFY");

    const result = await confirmationResult.confirm(otp);

    perf.end("PHONE_OTP_VERIFY");

    const firebaseUser = result.user;

    // Check if user already exists in Firestore
    const userDocRef = doc(db, "users", firebaseUser.uid);
    const userDocSnapshot = await getDoc(userDocRef);

    // If user is new, create their profile
    if (!userDocSnapshot.exists()) {
      setDoc(userDocRef, {
        uid: firebaseUser.uid,
        name: userData.name || "",
        email: firebaseUser.email || "",
        phoneNumber: firebaseUser.phoneNumber || "",
        shopName: userData.shopName || "",
        gstin: userData.gstin || "",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        emailVerified: firebaseUser.emailVerified,
        phoneVerified: true,
        lastLogin: new Date().toISOString(),
        authProvider: "phone",
      }).catch((err) => {
        console.error("Error creating user profile:", err);
      });
    } else {
      // Update last login for existing user
      updateDoc(userDocRef, {
        lastLogin: new Date().toISOString(),
        phoneVerified: true,
      }).catch((err) => {
        console.error("Error updating user profile:", err);
      });
    }

    return result;
  } catch (error) {
    if (error.code === "auth/invalid-verification-code") {
      throw new Error("Invalid OTP. Please check and try again.");
    }
    throw error;
  }
};

/**
 * Sign in with phone number (existing user)
 * @param {string} phoneNumber - Phone number with country code
 * @param {object} recaptchaVerifier - RecaptchaVerifier instance
 * @returns {object} Confirmation result
 */
export const loginWithPhone = async (phoneNumber, recaptchaVerifier) => {
  try {
    perf.start("PHONE_LOGIN");

    const confirmationResult = await signInWithPhoneNumber(
      auth,
      phoneNumber,
      recaptchaVerifier,
    );

    perf.end("PHONE_LOGIN");

    return confirmationResult;
  } catch (error) {
    throw error;
  }
};

/**
 * Complete phone login with OTP
 * @param {object} confirmationResult - Result from loginWithPhone
 * @param {string} otp - OTP code
 * @returns {object} Firebase user credential
 */
export const completePhoneLogin = async (confirmationResult, otp) => {
  try {
    perf.start("PHONE_LOGIN_VERIFY");

    const result = await confirmationResult.confirm(otp);

    perf.end("PHONE_LOGIN_VERIFY");

    const firebaseUser = result.user;

    // Update last login
    updateDoc(doc(db, "users", firebaseUser.uid), {
      lastLogin: new Date().toISOString(),
    }).catch((err) => {
      console.error("Error updating last login:", err);
    });

    return result;
  } catch (error) {
    if (error.code === "auth/invalid-verification-code") {
      throw new Error("Invalid OTP. Please check and try again.");
    }
    throw error;
  }
};
