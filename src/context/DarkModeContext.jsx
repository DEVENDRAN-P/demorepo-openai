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
            // Dark mode colors
            document.documentElement.style.setProperty('--bg-primary', '#1a1a1a');
            document.documentElement.style.setProperty('--bg-secondary', '#2d2d2d');
            document.documentElement.style.setProperty('--bg-tertiary', '#3a3a3a');
            document.documentElement.style.setProperty('--text-primary', '#ffffff');
            document.documentElement.style.setProperty('--text-secondary', '#e0e0e0');
            document.documentElement.style.setProperty('--text-tertiary', '#b0b0b0');
            document.documentElement.style.setProperty('--border-color', '#404040');
            document.documentElement.style.setProperty('--navbar-bg', '#1a1a1a');
            document.documentElement.style.setProperty('--card-bg', '#2d2d2d');
            document.body.style.backgroundColor = '#1a1a1a';
            document.body.style.color = '#ffffff';
            document.documentElement.classList.add('dark-mode');
            document.documentElement.classList.remove('light-mode');
        } else {
            // Light mode colors
            document.documentElement.style.setProperty('--bg-primary', '#ffffff');
            document.documentElement.style.setProperty('--bg-secondary', '#f9fafb');
            document.documentElement.style.setProperty('--bg-tertiary', '#f3f4f6');
            document.documentElement.style.setProperty('--text-primary', '#000000');
            document.documentElement.style.setProperty('--text-secondary', '#6b7280');
            document.documentElement.style.setProperty('--text-tertiary', '#9ca3af');
            document.documentElement.style.setProperty('--border-color', '#e5e7eb');
            document.documentElement.style.setProperty('--navbar-bg', '#ffffff');
            document.documentElement.style.setProperty('--card-bg', '#ffffff');
            document.body.style.backgroundColor = '#ffffff';
            document.body.style.color = '#000000';
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
