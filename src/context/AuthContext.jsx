import React, { createContext, useEffect, useState } from 'react';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import { auth, db } from '../config/firebase';
import { doc, getDoc } from 'firebase/firestore';

// Create the Auth Context
export const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  useEffect(() => {
    // Set a timeout to prevent infinite loading
    const loadingTimeout = setTimeout(() => {
      setLoading(false);
    }, 8000); // 8 second timeout

    // Real-time listener for authentication state
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      try {
        clearTimeout(loadingTimeout); // Clear timeout once auth state is determined

        if (firebaseUser) {
          console.log("🔐 User authenticated:", firebaseUser.uid, firebaseUser.email);

          // STRATEGY: Use cached user data immediately, then fetch fresh data in background

          // Step 1: Check localStorage cache FIRST (instant load)
          const cachedUser = localStorage.getItem('user');
          if (cachedUser) {
            try {
              const userData = JSON.parse(cachedUser);
              console.log("✅ Using cached user data");
              setUser(userData);
              setIsAuthenticated(true);
              setLoading(false); // Show UI immediately with cached data

              // Step 2: Fetch fresh data from Firestore in BACKGROUND (non-blocking)
              getDoc(doc(db, 'users', firebaseUser.uid))
                .then((userDoc) => {
                  if (userDoc.exists()) {
                    console.log("✅ Fresh Firestore data fetched");
                    const freshData = {
                      id: firebaseUser.uid,
                      uid: firebaseUser.uid,
                      email: firebaseUser.email,
                      emailVerified: firebaseUser.emailVerified,
                      ...userDoc.data(),
                    };
                    setUser(freshData);
                    localStorage.setItem('user', JSON.stringify(freshData));
                  } else {
                    console.warn("⚠️  No Firestore document found for user");
                  }
                })
                .catch((err) => {
                  console.error("❌ Error fetching Firestore data:", err.message);
                  // Fail silently - keep using cached data
                });
              return;
            } catch (e) {
              console.warn("⚠️  Invalid cache, proceeding to fetch fresh data");
              // Invalid cache, proceed to fetch
            }
          }

          // Step 3: No cache - create minimal user from Firebase Auth (DON'T wait for Firestore)
          const minimalUser = {
            id: firebaseUser.uid,
            uid: firebaseUser.uid,
            email: firebaseUser.email,
            displayName: firebaseUser.displayName || '',
            emailVerified: firebaseUser.emailVerified,
            createdAt: new Date().toISOString(),
          };

          // Show minimal data IMMEDIATELY
          console.log("📋 Using minimal user data from Firebase Auth");
          setUser(minimalUser);
          setIsAuthenticated(true);
          setLoading(false);
          localStorage.setItem('user', JSON.stringify(minimalUser));
          localStorage.setItem('userToken', firebaseUser.uid);

          // BACKGROUND: Fetch complete profile from Firestore (non-blocking)
          getDoc(doc(db, 'users', firebaseUser.uid))
            .then((userDoc) => {
              if (userDoc.exists()) {
                console.log("✅ Complete Firestore profile fetched");
                const userData = {
                  id: firebaseUser.uid,
                  uid: firebaseUser.uid,
                  email: firebaseUser.email,
                  emailVerified: firebaseUser.emailVerified,
                  ...userDoc.data(),
                };
                setUser(userData);
                localStorage.setItem('user', JSON.stringify(userData));
              } else {
                console.warn("⚠️  Firestore document not found, creating new one");
                // Document doesn't exist, create it with minimal data
                const newUserData = {
                  uid: firebaseUser.uid,
                  email: firebaseUser.email,
                  displayName: firebaseUser.displayName || '',
                  createdAt: new Date().toISOString(),
                };
                setUser(newUserData);
                localStorage.setItem('user', JSON.stringify(newUserData));
              }
            })
            .catch((err) => {
              console.error("❌ Error fetching Firestore profile:", err.message);
              // Fail silently - keep using minimal data
            });
        } else {
          // User is logged out
          console.log("🚪 User logged out");
          setUser(null);
          setIsAuthenticated(false);
          localStorage.removeItem('user');
          localStorage.removeItem('userToken');
          setLoading(false);
        }
      } catch (err) {
        setError(err.message);
        // Still set loading to false even on error
        setLoading(false);
      }
    });

    // Cleanup subscription and timeout
    return () => {
      unsubscribe();
      clearTimeout(loadingTimeout);
    };
  }, []);

  const logout = async () => {
    try {
      await signOut(auth);
      setUser(null);
      setIsAuthenticated(false);
      localStorage.removeItem('user');
      localStorage.removeItem('userToken');
      setError(null);
    } catch (err) {
      setError(err.message);
    }
  };

  const clearError = () => {
    setError(null);
  };

  const value = {
    user,
    loading,
    error,
    isAuthenticated,
    logout,
    clearError,
    setUser, // Exposed for manual updates if needed
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
