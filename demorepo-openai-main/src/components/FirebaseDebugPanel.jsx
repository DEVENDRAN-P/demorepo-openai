import React, { useEffect, useState } from "react";
import { useAuth } from "../hooks/useAuth";
import {
    debugFirebaseConnection,
    debugEmailDataIsolation,
    debugListAllUsers,
    debugRealtimeListener
} from "../services/firebaseDebug";
import {
    getEmailData,
    refreshEmailData,
    getUserMetadata,
} from "../services/userDatabaseService";

/**
 * Firebase Connection Debug Component
 * Shows real-time Firebase status and helps diagnose connection issues
 * Add to your Dashboard or create a debug route: /debug
 */
export function FirebaseDebugPanel() {
    const { user, loading } = useAuth();
    const [connectionStatus, setConnectionStatus] = useState("checking");
    const [emailData, setEmailData] = useState({});
    const [metadata, setMetadata] = useState(null);
    const [logs, setLogs] = useState([]);

    const addLog = (message, type = "info") => {
        const timestamp = new Date().toLocaleTimeString();
        setLogs((prev) => [...prev, { timestamp, message, type }]);
    };

    useEffect(() => {
        if (!user?.email) {
            setConnectionStatus("no-user");
            return;
        }

        addLog(`Testing connection for: ${user.email}`);

        const testConnection = async () => {
            try {
                // Test email data
                const data = await refreshEmailData("bills");
                setEmailData(data || {});
                addLog(`✅ Email data loaded: ${Object.keys(data || {}).length} items`, "success");

                // Get metadata
                const meta = await getUserMetadata();
                setMetadata(meta);
                addLog(`✅ Metadata retrieved`, "success");

                setConnectionStatus("connected");
                addLog("✅ Connection successful", "success");
            } catch (error) {
                addLog(`❌ Error: ${error.message}`, "error");
                setConnectionStatus("error");
            }
        };

        testConnection();
    }, [user?.email]);

    if (loading) {
        return <div className="p-4 text-yellow-600">Loading...</div>;
    }

    if (!user) {
        return (
            <div className="p-4 bg-red-50 border border-red-200 rounded">
                <p className="text-red-600">❌ Please log in to test Firebase connection</p>
            </div>
        );
    }

    return (
        <div className="p-6 bg-gray-50 rounded-lg border border-gray-200 font-mono text-sm">
            <h2 className="text-lg font-bold mb-4">🔥 Firebase Debug Panel</h2>

            {/* Connection Status */}
            <div className="mb-4">
                <label className="font-bold">Connection Status:</label>
                <div className="mt-2 p-3 rounded bg-white border border-gray-300">
                    {connectionStatus === "checking" && (
                        <span className="text-blue-600">🔄 Checking...</span>
                    )}
                    {connectionStatus === "connected" && (
                        <span className="text-green-600">✅ Connected</span>
                    )}
                    {connectionStatus === "error" && (
                        <span className="text-red-600">❌ Error</span>
                    )}
                    {connectionStatus === "no-user" && (
                        <span className="text-yellow-600">⚠️  No user logged in</span>
                    )}
                </div>
            </div>

            {/* User Info */}
            <div className="mb-4">
                <label className="font-bold">User Email:</label>
                <div className="mt-2 p-3 rounded bg-white border border-gray-300">
                    {user.email}
                </div>
            </div>

            {/* Metadata */}
            {metadata && (
                <div className="mb-4">
                    <label className="font-bold">User Metadata:</label>
                    <div className="mt-2 p-3 rounded bg-white border border-gray-300 whitespace-pre-wrap break-words">
                        <pre>{JSON.stringify(metadata, null, 2)}</pre>
                    </div>
                </div>
            )}

            {/* Email Data */}
            <div className="mb-4">
                <label className="font-bold">Email Data (Bills Collection):</label>
                <div className="mt-2 p-3 rounded bg-white border border-gray-300">
                    {Object.keys(emailData).length === 0 ? (
                        <span className="text-gray-500">No data yet</span>
                    ) : (
                        <pre className="whitespace-pre-wrap break-words">
                            {JSON.stringify(emailData, null, 2)}
                        </pre>
                    )}
                </div>
            </div>

            {/* Debug Buttons */}
            <div className="mb-4">
                <label className="font-bold block mb-2">Debug Actions:</label>
                <div className="flex gap-2 flex-wrap">
                    <button
                        onClick={() => {
                            addLog("Running full connection test...", "info");
                            debugFirebaseConnection();
                            addLog("Check browser console for full debug output", "info");
                        }}
                        className="px-3 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
                    >
                        Full Test
                    </button>
                    <button
                        onClick={() => {
                            addLog("Checking email isolation...", "info");
                            debugEmailDataIsolation();
                        }}
                        className="px-3 py-2 bg-green-500 text-white rounded hover:bg-green-600"
                    >
                        Email Isolation
                    </button>
                    <button
                        onClick={() => {
                            addLog("Listing all users...", "info");
                            debugListAllUsers();
                        }}
                        className="px-3 py-2 bg-purple-500 text-white rounded hover:bg-purple-600"
                    >
                        List All Users
                    </button>
                    <button
                        onClick={() => {
                            addLog("Setting up real-time listener...", "info");
                            debugRealtimeListener("bills");
                        }}
                        className="px-3 py-2 bg-orange-500 text-white rounded hover:bg-orange-600"
                    >
                        Real-time Test
                    </button>
                    <button
                        onClick={() => {
                            setLogs([]);
                            addLog("Logs cleared", "info");
                        }}
                        className="px-3 py-2 bg-gray-500 text-white rounded hover:bg-gray-600"
                    >
                        Clear Logs
                    </button>
                </div>
            </div>

            {/* Logs */}
            <div className="mb-4">
                <label className="font-bold">Logs:</label>
                <div className="mt-2 p-3 rounded bg-white border border-gray-300 max-h-64 overflow-y-auto">
                    {logs.length === 0 ? (
                        <span className="text-gray-500">No logs yet</span>
                    ) : (
                        <div>
                            {logs.map((log, idx) => (
                                <div
                                    key={idx}
                                    className={`py-1 ${log.type === "error"
                                            ? "text-red-600"
                                            : log.type === "success"
                                                ? "text-green-600"
                                                : "text-gray-600"
                                        }`}
                                >
                                    <span className="font-bold">[{log.timestamp}]</span> {log.message}
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>

            {/* Instructions */}
            <div className="p-3 bg-blue-50 border border-blue-200 rounded text-sm">
                <p className="font-bold mb-2">💡 How to Debug:</p>
                <ol className="list-decimal list-inside space-y-1">
                    <li>Click "Full Test" to run all connection tests</li>
                    <li>Check browser console (F12) for detailed output</li>
                    <li>Click "Email Isolation" to verify data is separated per email</li>
                    <li>Use "Real-time Test" to verify real-time updates work</li>
                    <li>Check logs above for any errors</li>
                </ol>
            </div>
        </div>
    );
}

export default FirebaseDebugPanel;
