import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import i18n from '../i18n/config';

/**
 * Language Switching Diagnostic Component
 * This component helps test and debug language switching functionality
 * Import this in a page temporarily to test language switching
 */
function LanguageDiagnostic() {
    const { t } = useTranslation();
    const [testResults, setTestResults] = useState({});
    const [currentLang, setCurrentLang] = useState(i18n.language);
    const [allKeys, setAllKeys] = useState([]);

    useEffect(() => {
        // Get all translation keys
        const resources = i18n.options.resources;
        const enKeys = Object.keys(resources.en.translation);
        setAllKeys(enKeys.slice(0, 10)); // Show first 10 keys

        // Test language change
        const testLangChange = async () => {
            const results = {};

            for (const lang of ['en', 'ta', 'hi', 'ml', 'kn']) {
                try {
                    await i18n.changeLanguage(lang);

                    // Wait a moment for re-render
                    await new Promise(resolve => setTimeout(resolve, 100));

                    // Check if language changed
                    const changed = i18n.language === lang;
                    results[lang] = {
                        success: changed,
                        currentLang: i18n.language,
                        translation: t('login'),
                        timestamp: new Date().toISOString(),
                    };
                } catch (error) {
                    results[lang] = {
                        success: false,
                        error: error.message,
                    };
                }
            }

            setTestResults(results);
            setCurrentLang(i18n.language);
        };

        testLangChange();
    }, [t]);

    return (
        <div style={{
            position: 'fixed',
            bottom: '20px',
            right: '20px',
            background: '#1a1a1a',
            color: '#fff',
            padding: '20px',
            borderRadius: '8px',
            fontSize: '12px',
            maxWidth: '400px',
            maxHeight: '400px',
            overflow: 'auto',
            zIndex: 9999,
            border: '2px solid #4f46e5',
        }}>
            <h3 style={{ margin: '0 0 10px 0', color: '#4f46e5' }}>🔍 Language Diagnostic</h3>

            <p><strong>Current Language:</strong> {currentLang.toUpperCase()}</p>

            <p><strong>Stored Language:</strong> {localStorage.getItem('language')}</p>

            <h4 style={{ margin: '10px 0 5px 0' }}>Sample Translations:</h4>
            <ul style={{ margin: '0 0 10px 0', paddingLeft: '20px' }}>
                {allKeys.map(key => (
                    <li key={key} style={{ marginBottom: '3px', fontSize: '11px' }}>
                        {key}: <span style={{ color: '#4f46e5' }}>{t(key)}</span>
                    </li>
                ))}
            </ul>

            <h4 style={{ margin: '10px 0 5px 0' }}>Test Results:</h4>
            {Object.keys(testResults).length > 0 ? (
                <div style={{ background: '#2d2d2d', padding: '10px', borderRadius: '4px' }}>
                    {Object.entries(testResults).map(([lang, result]) => (
                        <div key={lang} style={{ marginBottom: '8px', fontSize: '11px' }}>
                            <span style={{ color: result.success ? '#10b981' : '#ef4444' }}>
                                {result.success ? '✓' : '✗'} {lang.toUpperCase()}
                            </span>
                            {result.success && (
                                <div style={{ marginLeft: '10px', color: '#9ca3af' }}>
                                    translation: '{result.translation}'
                                </div>
                            )}
                            {result.error && (
                                <div style={{ marginLeft: '10px', color: '#ef4444' }}>
                                    Error: {result.error}
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            ) : (
                <p style={{ color: '#6b7280' }}>Testing...</p>
            )}

            <button
                onClick={() => {
                    console.clear();
                    console.log('Language Config:', i18n.options);
                    console.log('Current Language:', i18n.language);
                    console.log('Resources:', i18n.options.resources);
                }}
                style={{
                    marginTop: '10px',
                    padding: '8px 12px',
                    background: '#4f46e5',
                    color: '#fff',
                    border: 'none',
                    borderRadius: '4px',
                    cursor: 'pointer',
                    fontSize: '11px',
                }}
            >
                Log to Console
            </button>
        </div>
    );
}

export default LanguageDiagnostic;
