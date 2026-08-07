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
            // Dark mode colors - align with the GST Buddy AI design-system tokens
            // (App.css :root.dark-mode). These are applied inline because inline
            // styles take precedence over stylesheet variables.
            document.documentElement.style.setProperty('--bg-primary', '#0B1120');
            document.documentElement.style.setProperty('--bg-secondary', '#111827');
            document.documentElement.style.setProperty('--bg-tertiary', '#172033');
            document.documentElement.style.setProperty('--text-primary', '#F8FAFC');
            document.documentElement.style.setProperty('--text-secondary', '#94A3B8');
            document.documentElement.style.setProperty('--text-tertiary', '#64748B');
            document.documentElement.style.setProperty('--border-color', '#263247');
            document.documentElement.style.setProperty('--border-strong', '#334155');
            document.documentElement.style.setProperty('--navbar-bg', '#0B1120');
            document.documentElement.style.setProperty('--card-bg', '#111827');
            document.documentElement.style.setProperty('--card-border', '#263247');
            document.body.style.backgroundColor = '#0B1120';
            document.body.style.color = '#F8FAFC';
            document.documentElement.classList.add('dark-mode');
            document.documentElement.classList.remove('light-mode');
        } else {
            // Light mode colors - align with the GST Buddy AI design-system
            // tokens (App.css :root.light-mode) for consistent light <-> dark
            // transitions.
            document.documentElement.style.setProperty('--bg-primary', '#F8FAFC');
            document.documentElement.style.setProperty('--bg-secondary', '#FFFFFF');
            document.documentElement.style.setProperty('--bg-tertiary', '#F1F5F9');
            document.documentElement.style.setProperty('--text-primary', '#0F172A');
            document.documentElement.style.setProperty('--text-secondary', '#64748B');
            document.documentElement.style.setProperty('--text-tertiary', '#94A3B8');
            document.documentElement.style.setProperty('--border-color', '#E2E8F0');
            document.documentElement.style.setProperty('--border-strong', '#CBD5E1');
            document.documentElement.style.setProperty('--navbar-bg', '#FFFFFF');
            document.documentElement.style.setProperty('--card-bg', '#FFFFFF');
            document.documentElement.style.setProperty('--card-border', '#E2E8F0');
            document.body.style.backgroundColor = '#F8FAFC';
            document.body.style.color = '#0F172A';
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
