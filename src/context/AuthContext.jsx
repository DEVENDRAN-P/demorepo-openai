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
      console.warn('Auth loading timeout - setting loading to false');
      setLoading(false);
    }, 10000); // 10 second timeout

    // Real-time listener for authentication state
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      try {
        clearTimeout(loadingTimeout); // Clear timeout once auth state is determined
        
        if (firebaseUser) {
          console.log('🔍 Firebase user detected:', firebaseUser.email);
          
          // Try to use cached user data from localStorage first
          const cachedUser = localStorage.getItem('user');
          if (cachedUser) {
            const userData = JSON.parse(cachedUser);
            setUser(userData);
            setIsAuthenticated(true);
            setLoading(false);
            console.log('✅ Using cached user data');
            
            // Update from Firestore in background (non-blocking)
            getDoc(doc(db, 'users', firebaseUser.uid)).then((userDoc) => {
              if (userDoc.exists()) {
                const freshData = {
                  id: firebaseUser.uid,
                  uid: firebaseUser.uid,
                  email: firebaseUser.email,
                  emailVerified: firebaseUser.emailVerified,
                  ...userDoc.data(),
                };
                setUser(freshData);
                localStorage.setItem('user', JSON.stringify(freshData));
                console.log('✅ Updated from Firestore');
              }
            }).catch((err) => console.warn('Background sync failed:', err));
          } else {
            // No cache, fetch from Firestore
            console.log('🔍 Fetching user from Firestore...');
            const userDoc = await getDoc(doc(db, 'users', firebaseUser.uid));
            
            if (userDoc.exists()) {
              console.log('✅ Found user in Firestore');
              const userData = {
                id: firebaseUser.uid,
                uid: firebaseUser.uid,
                email: firebaseUser.email,
                emailVerified: firebaseUser.emailVerified,
                ...userDoc.data(),
              };
              setUser(userData);
              setIsAuthenticated(true);
              localStorage.setItem('user', JSON.stringify(userData));
              localStorage.setItem('userToken', firebaseUser.uid);
            } else {
              // Document doesn't exist yet - create minimal user data from Firebase Auth
              console.warn('⚠️ User document not in Firestore, using auth data');
              const userData = {
                id: firebaseUser.uid,
                uid: firebaseUser.uid,
                email: firebaseUser.email,
                displayName: firebaseUser.displayName || '',
                emailVerified: firebaseUser.emailVerified,
                createdAt: new Date().toISOString(),
              };
              setUser(userData);
              setIsAuthenticated(true);
              localStorage.setItem('user', JSON.stringify(userData));
              localStorage.setItem('userToken', firebaseUser.uid);
              console.log('✅ User authenticated from Firebase Auth');
            }
            setLoading(false);
          }
        } else {
          // User is logged out
          console.log('👋 User logged out');
          setUser(null);
          setIsAuthenticated(false);
          localStorage.removeItem('user');
          localStorage.removeItem('userToken');
          setLoading(false);
        }
      } catch (err) {
        console.error('❌ Error in auth state change:', err);
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
      setLoading(true);
      await signOut(auth);
      setUser(null);
      setIsAuthenticated(false);
      localStorage.removeItem('user');
      localStorage.removeItem('userToken');
      setError(null);
    } catch (err) {
      console.error('Logout error:', err);
      setError(err.message);
    } finally {
      setLoading(false);
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
