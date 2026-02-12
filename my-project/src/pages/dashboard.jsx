import React, { useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';

const Dashboard = () => {
    const navigate = useNavigate();
    const [message, setMessage] = useState('');
    const [messages, setMessages] = useState([
        { role: 'assistant', content: 'Hello! I am your AI assistant. How can I help you today?' }
    ]);
    const [loading, setLoading] = useState(false);
    const messagesEndRef = useRef(null);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    useEffect(() => {
        scrollToBottom();
    }, [messages]);

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
        if (!message.trim()) return;

        const userMessage = { role: 'user', content: message };
        setMessages((prev) => [...prev, userMessage]);
        setMessage('');
        setLoading(true);

        const token = localStorage.getItem('access_token');

        try {
            const res = await fetch('http://127.0.0.1:8000/ai_response', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ message: userMessage.content })
            });

            if (res.ok) {
                const data = await res.json();
                const aiResponse = { role: 'assistant', content: data.response || JSON.stringify(data) };
                setMessages((prev) => [...prev, aiResponse]);
            } else {
                setMessages((prev) => [...prev, { role: 'assistant', content: 'Sorry, I encountered an error. Please try again.' }]);
            }
        } catch (error) {
            console.error('Error:', error);
            setMessages((prev) => [...prev, { role: 'assistant', content: 'Network error. Please check your connection.' }]);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="flex flex-col h-screen bg-gray-50 overflow-hidden">
            {/* Navigation Header */}
            <nav className="bg-white border-b border-gray-200 z-10 shrink-0">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex justify-between h-16 items-center">
                        <div className="flex items-center gap-2">
                            <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center">
                                <span className="text-white font-bold text-lg">A</span>
                            </div>
                            <h1 className="text-xl font-bold text-gray-900">AI Chat</h1>
                        </div>
                        <button
                            onClick={handleLogout}
                            className="text-sm font-medium text-gray-600 hover:text-red-600 transition-colors px-3 py-2 rounded-md hover:bg-red-50"
                        >
                            Logout
                        </button>
                    </div>
                </div>
            </nav>

            {/* Main Chat Area */}
            <main className="flex-1 overflow-y-auto p-4 sm:p-6">
                <div className="max-w-4xl mx-auto space-y-6">
                    {messages.map((msg, index) => (
                        <div
                            key={index}
                            className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                        >
                            <div
                                className={`max-w-[80%] px-4 py-3 rounded-2xl shadow-sm ${msg.role === 'user'
                                        ? 'bg-indigo-600 text-white rounded-tr-none'
                                        : 'bg-white text-gray-800 border border-gray-100 rounded-tl-none'
                                    }`}
                            >
                                <p className="text-sm leading-relaxed whitespace-pre-wrap">{msg.content}</p>
                            </div>
                        </div>
                    ))}

                    {loading && (
                        <div className="flex justify-start">
                            <div className="bg-white border border-gray-100 px-4 py-3 rounded-2xl rounded-tl-none shadow-sm flex items-center gap-1">
                                <div className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce [animation-delay:-0.3s]"></div>
                                <div className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce [animation-delay:-0.15s]"></div>
                                <div className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce"></div>
                            </div>
                        </div>
                    )}
                    <div ref={messagesEndRef} />
                </div>
            </main>

            {/* Input Bar Area */}
            <div className="bg-white border-t border-gray-200 p-4 sm:p-6 shrink-0">
                <div className="max-w-4xl mx-auto">
                    <form
                        onSubmit={handleSendMessage}
                        className="relative flex items-center"
                    >
                        <input
                            type="text"
                            value={message}
                            onChange={(e) => setMessage(e.target.value)}
                            placeholder="Type your message..."
                            disabled={loading}
                            className="w-full bg-gray-50 border border-gray-200 rounded-2xl pl-4 pr-24 py-4 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all disabled:opacity-50"
                        />
                        <button
                            type="submit"
                            disabled={loading || !message.trim()}
                            className="absolute right-2 px-6 py-2 bg-indigo-600 text-white rounded-xl font-medium hover:bg-indigo-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-all shadow-md"
                        >
                            {loading ? '...' : 'Send'}
                        </button>
                    </form>
                    <p className="text-center text-[10px] text-gray-400 mt-3 uppercase tracking-widest font-semibold">
                        Powered by AI Assistant
                    </p>
                </div>
            </div>
        </div>
    );
};

export default Dashboard;
