import React, { useState, useEffect } from "react";
import { auth } from "./config/firebase";
import { createUserWithEmailAndPassword, signInWithEmailAndPassword, signOut, onAuthStateChanged } from "firebase/auth";
import "./App.css";

// Login/Signup Component
function LoginSignup({ onLoginSuccess }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isSignup, setIsSignup] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  // Signup function
  const handleSignup = async () => {
    if (!email || !password) {
      setError("Please fill in all fields");
      return;
    }
    try {
      setLoading(true);
      setError("");
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      console.log("✅ Signed up successfully:", userCredential.user.email);
      onLoginSuccess(userCredential.user);
      setEmail("");
      setPassword("");
    } catch (error) {
      setError(error.message);
      console.error("Signup error:", error);
    } finally {
      setLoading(false);
    }
  };

  // Login function
  const handleLogin = async () => {
    if (!email || !password) {
      setError("Please fill in all fields");
      return;
    }
    try {
      setLoading(true);
      setError("");
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      console.log("✅ Logged in successfully:", userCredential.user.email);
      onLoginSuccess(userCredential.user);
      setEmail("");
      setPassword("");
    } catch (error) {
      setError(error.message);
      console.error("Login error:", error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container">
      <h1 className="title">Welcome to GST Buddy</h1>
      <div className="card">
        <input
          type="email"
          className="input"
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          disabled={loading}
        />
        <input
          type="password"
          className="input"
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          disabled={loading}
        />
        {error && <p className="error-message">{error}</p>}
        {isSignup ? (
          <button className="btn" onClick={handleSignup} disabled={loading}>
            {loading ? "Creating account..." : "Sign Up"}
          </button>
        ) : (
          <button className="btn" onClick={handleLogin} disabled={loading}>
            {loading ? "Logging in..." : "Log In"}
          </button>
        )}
        <div className="toggle">
          {isSignup ? (
            <>
              Already have an account?{" "}
              <span className="link" onClick={() => { setIsSignup(false); setError(""); }}>
                Log In
              </span>
            </>
          ) : (
            <>
              New user?{" "}
              <span className="link" onClick={() => { setIsSignup(true); setError(""); }}>
                Sign Up
              </span>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

// Dashboard Component
function Dashboard({ user, onLogout }) {
  const [stats] = useState({
    bills: 12,
    forms: 5,
    pending: 3,
    completed: 14
  });

  return (
    <div className="dashboard-container">
      <header className="dashboard-header">
        <h1>GST Buddy Dashboard</h1>
        <div className="user-info">
          <span>Welcome, {user?.email}</span>
          <button className="logout-btn" onClick={onLogout}>Logout</button>
        </div>
      </header>

      <div className="dashboard-content">
        <div className="stats-grid">
          <div className="stat-card">
            <h3>Bills Uploaded</h3>
            <p className="stat-value">{stats.bills}</p>
          </div>
          <div className="stat-card">
            <h3>GST Forms</h3>
            <p className="stat-value">{stats.forms}</p>
          </div>
          <div className="stat-card">
            <h3>Pending</h3>
            <p className="stat-value">{stats.pending}</p>
          </div>
          <div className="stat-card">
            <h3>Completed</h3>
            <p className="stat-value">{stats.completed}</p>
          </div>
        </div>

        <div className="dashboard-section">
          <h2>Quick Actions</h2>
          <div className="action-buttons">
            <button className="action-btn">📁 Upload Bill</button>
            <button className="action-btn">📋 View Forms</button>
            <button className="action-btn">📊 View Reports</button>
            <button className="action-btn">⚙️ Settings</button>
          </div>
        </div>

        <div className="dashboard-section">
          <h2>Recent Activity</h2>
          <p className="activity-text">No recent activity</p>
        </div>
      </div>
    </div>
  );
}

// Main App Component
function App() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      console.log("Auth state changed:", currentUser?.email || "No user");
      setUser(currentUser);
      setLoading(false);
    });

    return unsubscribe;
  }, []);

  const handleLogout = async () => {
    try {
      await signOut(auth);
      setUser(null);
      console.log("✅ Logged out successfully");
    } catch (error) {
      console.error("Logout error:", error);
    }
  };

  if (loading) {
    return (
      <div className="loading-screen">
        <div className="spinner"></div>
        <p>Loading...</p>
      </div>
    );
  }

  return user ? <Dashboard user={user} onLogout={handleLogout} /> : <LoginSignup onLoginSuccess={setUser} />;
}

export default App;
