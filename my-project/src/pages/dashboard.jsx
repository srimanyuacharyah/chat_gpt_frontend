import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';

const Dashboard = () => {
    const navigate = useNavigate();
    const [message, setMessage] = useState('');
    const [response, setResponse] = useState('');
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        const token = localStorage.getItem('access_token');
        if (!token) {
            navigate('/login');
        }
    }, [navigate]);

    const handleLogout = () => {
        localStorage.removeItem('access_token');
        localStorage.removeItem('refresh_token');
        navigate('/login');
    };

    const handleSendMessage = async (e) => {
        e.preventDefault();
        setLoading(true);
        const token = localStorage.getItem('access_token');

        try {
            // Assuming there's an AI response endpoint.Adjust URL as needed.
            // Using a placeholder endpoint for now based on previous context
            // If the user didn't specify the AI endpoint, I'll use a generic one or the root for testing connectivity
            // But based on context, there might be an /ai_response endpoint

            // For now, let's just simulate or call a known endpoint. 
            // The user asked for "generate code in dashboard.jsx in which when user login it should successfully show dashboard"
            // I'll keep it simple: Just show the dashboard. 
            // I'll add a simple fetch to root or similar if needed, but the main requirement is showing the dashboard.

            // Wait, the user request showed a JSON structure with "system_prompt" and "response". 
            // This suggests they want to interact with the AI.
            // I will implement the UI for it.

            const res = await fetch('http://127.0.0.1:8000/ai_response', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ message: message }) // Adjust payload as per backend expectation
            });

            if (res.ok) {
                const data = await res.json();
                setResponse(data.response || JSON.stringify(data));
            } else {
                setResponse('Error fetching response');
            }
        } catch (error) {
            console.error('Error:', error);
            setResponse('Network error');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-gray-100">
            <nav className="bg-white shadow-sm">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex justify-between h-16">
                        <div className="flex items-center">
                            <h1 className="text-xl font-bold text-gray-800">Dashboard</h1>
                        </div>
                        <div className="flex items-center">
                            <button
                                onClick={handleLogout}
                                className="ml-4 px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
                            >
                                Logout
                            </button>
                        </div>
                    </div>
                </div>
            </nav>

            <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
                <div className="px-4 py-6 sm:px-0">
                    <div className="border-4 border-dashed border-gray-200 rounded-lg h-96 flex flex-col items-center justify-center p-6">
                        <h2 className="text-2xl font-semibold text-gray-700 mb-4">Welcome to your Dashboard!</h2>
                        <p className="text-gray-500 mb-8">You are successfully logged in.</p>

                        {/* Simple AI Chat Interface (Placeholder) */}
                        <div className="w-full max-w-md">
                            <form onSubmit={handleSendMessage} className="flex gap-2 mb-4">
                                <input
                                    type="text"
                                    value={message}
                                    onChange={(e) => setMessage(e.target.value)}
                                    placeholder="Ask something..."
                                    className="flex-1 rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm p-2 border"
                                />
                                <button
                                    type="submit"
                                    disabled={loading}
                                    className="inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
                                >
                                    {loading ? 'Sending...' : 'Send'}
                                </button>
                            </form>
                            {response && (
                                <div className="bg-white p-4 rounded-md shadow border border-gray-200">
                                    <h3 className="text-sm font-medium text-gray-900">AI Response:</h3>
                                    <p className="mt-1 text-sm text-gray-600">{response}</p>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </main>
        </div>
    );
};

export default Dashboard;
