import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';

const DarkModeContext = createContext();

export function DarkModeProvider({ children }) {
    const [isDarkMode, setIsDarkMode] = useState(() => {
        // Check if we have a stored preference and user has logged in before
        const storedPreference = localStorage.getItem('darkMode');
        if (storedPreference !== null) {
            return storedPreference === 'true';
        }
        return false;
    });

    const applyDarkMode = useCallback((isDark) => {
        if (isDark) {
            // Dark mode colors - premium deep slate/navy (Linear/Vercel-like)
            document.documentElement.style.setProperty('--bg-primary', '#0b0f19');
            document.documentElement.style.setProperty('--bg-secondary', '#151c2c');
            document.documentElement.style.setProperty('--bg-tertiary', '#1e293b');
            document.documentElement.style.setProperty('--text-primary', '#f8fafc');
            document.documentElement.style.setProperty('--text-secondary', '#94a3b8');
            document.documentElement.style.setProperty('--text-tertiary', '#64748b');
            document.documentElement.style.setProperty('--border-color', '#1e293b');
            document.documentElement.style.setProperty('--navbar-bg', '#0b0f19');
            document.documentElement.style.setProperty('--card-bg', '#151c2c');
            document.body.style.backgroundColor = '#0b0f19';
            document.body.style.color = '#f8fafc';
            document.documentElement.classList.add('dark-mode');
            document.documentElement.classList.remove('light-mode');
        } else {
            // Light mode colors - clean layout
            document.documentElement.style.setProperty('--bg-primary', '#ffffff');
            document.documentElement.style.setProperty('--bg-secondary', '#f8fafc');
            document.documentElement.style.setProperty('--bg-tertiary', '#f1f5f9');
            document.documentElement.style.setProperty('--text-primary', '#0f172a');
            document.documentElement.style.setProperty('--text-secondary', '#475569');
            document.documentElement.style.setProperty('--text-tertiary', '#94a3b8');
            document.documentElement.style.setProperty('--border-color', '#e2e8f0');
            document.documentElement.style.setProperty('--navbar-bg', '#ffffff');
            document.documentElement.style.setProperty('--card-bg', '#ffffff');
            document.body.style.backgroundColor = '#f8fafc';
            document.body.style.color = '#0f172a';
            document.documentElement.classList.add('light-mode');
            document.documentElement.classList.remove('dark-mode');
        }
        localStorage.setItem('darkMode', isDark);
    }, []);

    const resetTheme = useCallback(() => {
        setIsDarkMode(false);
        applyDarkMode(false);
        localStorage.removeItem('darkMode');
    }, [applyDarkMode]);

    const toggleDarkMode = useCallback(() => {
        setIsDarkMode(prev => !prev);
    }, []);

    // Check if user is logged in (has user in localStorage or auth state)
    const isAuthenticated = localStorage.getItem('user') !== null;

    useEffect(() => {
        // Always apply light mode if not authenticated
        if (!isAuthenticated) {
            applyDarkMode(false);
            setIsDarkMode(false);
        } else {
            applyDarkMode(isDarkMode);
        }
    }, [isAuthenticated, isDarkMode, applyDarkMode]);

    return (
        <DarkModeContext.Provider value={{ isDarkMode, toggleDarkMode, applyDarkMode, resetTheme, isAuthenticated }}>
            {children}
        </DarkModeContext.Provider>
    );
}

export function useDarkMode() {
    const context = useContext(DarkModeContext);
    if (!context) {
        throw new Error('useDarkMode must be used within DarkModeProvider');
    }
    return context;
}
