import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';

const DarkModeContext = createContext();

export function DarkModeProvider({ children }) {
    const [isDarkMode, setIsDarkMode] = useState(() => {
        const storedTheme = localStorage.getItem('theme');
        if (storedTheme !== null) {
            return storedTheme === 'dark';
        }
        const storedDarkMode = localStorage.getItem('darkMode');
        if (storedDarkMode !== null) {
            return storedDarkMode === 'true';
        }
        // Default on fresh visit is LIGHT theme
        return false;
    });

    const applyDarkMode = useCallback((isDark) => {
        if (isDark) {
            // Dark mode design tokens
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
            
            // Toggle both Tailwind .dark and legacy .dark-mode
            document.documentElement.classList.add('dark', 'dark-mode');
            document.documentElement.classList.remove('light-mode');
        } else {
            // Light mode design tokens
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
            document.documentElement.classList.remove('dark', 'dark-mode');
        }
        localStorage.setItem('theme', isDark ? 'dark' : 'light');
        localStorage.setItem('darkMode', isDark);
    }, []);

    useEffect(() => {
        applyDarkMode(isDarkMode);
    }, [isDarkMode, applyDarkMode]);

    const toggleDarkMode = useCallback(() => {
        setIsDarkMode(prev => !prev);
    }, []);

    const resetTheme = useCallback(() => {
        setIsDarkMode(false);
        applyDarkMode(false);
        localStorage.removeItem('theme');
        localStorage.removeItem('darkMode');
    }, [applyDarkMode]);

    return (
        <DarkModeContext.Provider value={{ isDarkMode, toggleDarkMode, applyDarkMode, resetTheme }}>
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

