import React, { useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';

const Dashboard = () => {
    const navigate = useNavigate();
    const [message, setMessage] = useState('');
    const [isSidebarOpen, setIsSidebarOpen] = useState(true);
    const [loading, setLoading] = useState(false);
    const [isEmailModalOpen, setIsEmailModalOpen] = useState(false);
    const [emailData, setEmailData] = useState({ receiver: '', subject: 'GenAI Pro Conversation Share' });
    const [actionLoading, setActionLoading] = useState(false);
    const messagesEndRef = useRef(null);

    // User-specific identity for scoping history
    const userId = localStorage.getItem('user_identity') || 'guest';
    const storageKey = `ai_chats_v2_${userId}`;

    const [chats, setChats] = useState([]);
    const [activeChatId, setActiveChatId] = useState(() => {
        const savedActiveId = localStorage.getItem(`active_chat_id_${userId}`);
        return savedActiveId || '';
    });

    const activeChat = chats.find(chat => chat.id === activeChatId) || chats[0] || { messages: [] };

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    // Load chats from backend on mount
    useEffect(() => {
        const fetchChats = async () => {
            const token = localStorage.getItem('access_token');
            if (!token) return;
            try {
                const res = await fetch('http://127.0.0.1:8000/chats/', {
                    headers: { 'Authorization': `Bearer ${token}` }
                });
                if (res.ok) {
                    const data = await res.json();
                    if (data.length > 0) {
                        setChats(data.map(c => ({ id: c.id, title: c.chat_name, messages: [], updated_at: c.updated_at })));
                        if (!activeChatId) setActiveChatId(data[0].id);
                    } else {
                        // Create a default chat if none exist
                        const defaultChat = { id: Date.now().toString(), title: 'Welcome Chat', messages: [{ role: 'assistant', content: `Hello! I'm your premium AI assistant. How can I help you today?` }] };
                        setChats([defaultChat]);
                        setActiveChatId(defaultChat.id);
                    }
                }
            } catch (err) {
                console.error("Failed to fetch chats:", err);
            }
        };
        fetchChats();
    }, []);

    // Scroll to bottom whenever messages or loading state changes
    useEffect(() => {
        scrollToBottom();
    }, [activeChat.messages, loading]);

    // Load active chat details if messages are empty
    useEffect(() => {
        if (!activeChatId) return;
        const currentChat = chats.find(c => c.id === activeChatId);
        if (currentChat && currentChat.messages.length === 0) {
            const fetchChatDetails = async () => {
                const token = localStorage.getItem('access_token');
                try {
                    const res = await fetch(`http://127.0.0.1:8000/chats/${activeChatId}`, {
                        headers: { 'Authorization': `Bearer ${token}` }
                    });
                    if (res.ok) {
                        const data = await res.json();
                        setChats(prev => prev.map(c => c.id === activeChatId ? { ...c, messages: data.messages } : c));
                    }
                } catch (err) {
                    console.error("Failed to fetch chat details:", err);
                }
            };
            fetchChatDetails();
        }
    }, [activeChatId]);

    // Save active chat to backend whenever messages change
    useEffect(() => {
        if (!activeChatId) return;
        const currentChat = chats.find(c => c.id === activeChatId);
        if (currentChat && currentChat.messages.length > 0) {
            const saveChat = async () => {
                const token = localStorage.getItem('access_token');
                try {
                    await fetch('http://127.0.0.1:8000/chats/', {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                            'Authorization': `Bearer ${token}`
                        },
                        body: JSON.stringify({
                            id: isNaN(activeChatId) ? null : activeChatId, // New chats have timestamp IDs, backend needs integer or null
                            chat_name: currentChat.title,
                            messages: currentChat.messages
                        })
                    });
                } catch (err) {
                    console.error("Failed to save chat:", err);
                }
            };
            // Debounce or at least throttle in a real app
            saveChat();
        }
    }, [chats.find(c => c.id === activeChatId)?.messages]);

    useEffect(() => {
        localStorage.setItem(`active_chat_id_${userId}`, activeChatId);
    }, [activeChatId, userId]);

    useEffect(() => {
        const token = localStorage.getItem('access_token');
        if (!token) {
            navigate('/login');
        }
    }, [navigate]);

    const handleLogout = () => {
        localStorage.removeItem('access_token');
        localStorage.removeItem('refresh_token');
        // We keep user_identity for history scoping if they log back in, 
        // but typically you'd clear common session info.
        navigate('/login');
    };

    const handleNewChat = () => {
        const newChat = {
            id: Date.now().toString(),
            title: 'New Conversation',
            messages: [{ role: 'assistant', content: 'Ready for a new topic. What\'s on your mind?' }]
        };
        setChats([newChat, ...chats]);
        setActiveChatId(newChat.id);
    };

    const handleDeleteChat = async (e, id) => {
        e.stopPropagation();
        const token = localStorage.getItem('access_token');
        try {
            await fetch(`http://127.0.0.1:8000/chats/${id}`, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${token}` }
            });
        } catch (err) {
            console.error("Failed to delete chat:", err);
        }

        const updatedChats = chats.filter(chat => chat.id !== id);
        if (updatedChats.length === 0) {
            const defaultChat = { id: Date.now().toString(), title: 'New Chat', messages: [{ role: 'assistant', content: 'Hello!' }] };
            setChats([defaultChat]);
            setActiveChatId(defaultChat.id);
        } else {
            setChats(updatedChats);
            if (activeChatId === id) {
                setActiveChatId(updatedChats[0].id);
            }
        }
    };

    const handleExportPDF = async () => {
        setActionLoading(true);
        try {
            const res = await fetch('http://127.0.0.1:8000/generate-pdf', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    title: activeChat.title,
                    messages: activeChat.messages
                })
            });
            if (res.ok) {
                const blob = await res.blob();
                const url = window.URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `${activeChat.title.replace(/\s/g, '_')}.pdf`;
                document.body.appendChild(a);
                a.click();
                a.remove();
                // Resource cleanup
                setTimeout(() => window.URL.revokeObjectURL(url), 100);
            }
        } catch (error) {
            console.error('PDF Export Error:', error);
            alert('Failed to export PDF');
        } finally {
            setActionLoading(false);
        }
    };

    const handleSendEmail = async (e) => {
        e.preventDefault();
        setActionLoading(true);
        const chatContent = activeChat.messages.map(m => `${m.role.toUpperCase()}: ${m.content}`).join('\n\n');
        try {
            const res = await fetch('http://127.0.0.1:8000/send-email', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    receiver_email: emailData.receiver,
                    subject: emailData.subject,
                    content: `Conversation: ${activeChat.title}\n\n${chatContent}`
                })
            });
            if (res.ok) {
                alert('Email sent successfully!');
                setIsEmailModalOpen(false);
            } else {
                alert('Failed to send email.');
            }
        } catch (error) {
            console.error('Email Error:', error);
        } finally {
            setActionLoading(false);
        }
    };

    const handleGenerateImage = async () => {
        if (!message.trim()) {
            alert("Please enter a prompt first for visual generation.");
            return;
        }
        setLoading(true);
        const currentPrompt = message;

        // Add user visual request to chat
        setChats(prevChats => prevChats.map(chat =>
            chat.id === activeChatId ? { ...chat, messages: [...chat.messages, { role: 'user', content: `[Visual Request] ${currentPrompt}` }] } : chat
        ));
        setMessage('');

        try {
            const res = await fetch(`http://127.0.0.1:8000/generate-image?prompt=${encodeURIComponent(currentPrompt)}`, {
                method: 'POST'
            });
            if (res.ok) {
                const blob = await res.blob();
                const url = window.URL.createObjectURL(blob);
                // In a real app, you'd upload this to S3 and save the URL. 
                // Here we'll show it as a special AI message.
                const aiMessage = { role: 'assistant', content: `Generated your AI image!`, image: url };
                setChats(prevChats => prevChats.map(chat =>
                    chat.id === activeChatId ? { ...chat, messages: [...chat.messages, aiMessage] } : chat
                ));
            }
        } catch (error) {
            console.error('Image Gen Error:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleSendMessage = async (e) => {
        e.preventDefault();
        if (!message.trim() || loading) return;

        const userMessage = { role: 'user', content: message };
        const currentMessageText = message;
        setMessage('');
        setLoading(true);

        setChats(prevChats => prevChats.map(chat => {
            if (chat.id === activeChatId) {
                const updatedMessages = [...chat.messages, userMessage];
                const hasUserMessages = chat.messages.some(m => m.role === 'user');
                const newTitle = !hasUserMessages ? currentMessageText.slice(0, 25) + (currentMessageText.length > 25 ? '...' : '') : chat.title;
                return { ...chat, messages: updatedMessages, title: newTitle };
            }
            return chat;
        }));

        const token = localStorage.getItem('access_token');

        try {
            const res = await fetch('http://127.0.0.1:8000/ai_response', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ message: currentMessageText })
            });

            if (res.ok) {
                const data = await res.json();
                const aiResponse = { role: 'assistant', content: data.response || JSON.stringify(data) };
                setChats(prevChats => prevChats.map(chat =>
                    chat.id === activeChatId ? { ...chat, messages: [...chat.messages, aiResponse] } : chat
                ));
            } else {
                throw new Error('API Error');
            }
        } catch (error) {
            console.error('Error:', error);
            setChats(prevChats => prevChats.map(chat =>
                chat.id === activeChatId ? { ...chat, messages: [...chat.messages, { role: 'assistant', content: 'I encountered an issue. Please try again soon.' }] } : chat
            ));
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="flex h-screen bg-[#0f172a] text-slate-100 overflow-hidden font-sans relative">
            {/* Email Share Modal */}
            {isEmailModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                    <div className="absolute inset-0 bg-slate-950/60 backdrop-blur-sm" onClick={() => setIsEmailModalOpen(false)} />
                    <div className="relative w-full max-w-md bg-slate-900/90 border border-slate-700/50 rounded-2xl shadow-2xl p-6 backdrop-blur-xl animate-in zoom-in-95 duration-200">
                        <div className="flex justify-between items-center mb-6">
                            <h3 className="text-xl font-bold text-white">Share via Email</h3>
                            <button onClick={() => setIsEmailModalOpen(false)} className="text-slate-400 hover:text-white transition-colors">
                                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M6 18L18 6M6 6l12 12" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>
                            </button>
                        </div>
                        <form onSubmit={handleSendEmail} className="space-y-4">
                            <div>
                                <label className="block text-xs font-bold text-slate-500 uppercase mb-1.5 ml-1">Recipient Email</label>
                                <input
                                    type="email"
                                    required
                                    className="w-full bg-slate-800/50 border border-slate-700/50 rounded-xl px-4 py-3 focus:outline-none focus:border-indigo-500 transition-colors"
                                    placeholder="friend@example.com"
                                    value={emailData.receiver}
                                    onChange={e => setEmailData({ ...emailData, receiver: e.target.value })}
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-slate-500 uppercase mb-1.5 ml-1">Subject</label>
                                <input
                                    type="text"
                                    required
                                    className="w-full bg-slate-800/50 border border-slate-700/50 rounded-xl px-4 py-3 focus:outline-none focus:border-indigo-500 transition-colors"
                                    value={emailData.subject}
                                    onChange={e => setEmailData({ ...emailData, subject: e.target.value })}
                                />
                            </div>
                            <button
                                type="submit"
                                disabled={actionLoading}
                                className="w-full bg-gradient-to-r from-indigo-500 to-violet-600 hover:from-indigo-600 hover:to-violet-700 text-white font-bold py-3.5 rounded-xl shadow-lg shadow-indigo-500/20 active:scale-95 transition-all flex items-center justify-center gap-2"
                            >
                                {actionLoading ? <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : 'Send Transcript'}
                            </button>
                        </form>
                    </div>
                </div>
            )}

            {/* Sidebar - Premium Dark Glass Design */}
            <aside className={`${isSidebarOpen ? 'w-72' : 'w-0'} bg-[#1e293b]/50 backdrop-blur-xl border-r border-slate-700/50 flex flex-col transition-all duration-500 ease-in-out overflow-hidden z-20 shadow-2xl`}>
                <div className="p-4 flex flex-col h-full">
                    {/* App Logo/Brand */}
                    <div className="flex items-center gap-3 px-2 mb-8 mt-2">
                        <div className="w-10 h-10 bg-gradient-to-br from-indigo-500 to-violet-600 rounded-xl flex items-center justify-center shadow-lg shadow-indigo-500/20">
                            <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z" />
                            </svg>
                        </div>
                        <span className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-white to-slate-400">GenAI Pro</span>
                    </div>

                    <button
                        onClick={handleNewChat}
                        className="group flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-indigo-600/10 border border-indigo-500/30 hover:bg-indigo-600 hover:border-indigo-500 transition-all duration-300 text-sm font-semibold mb-6 shadow-sm shadow-indigo-500/10"
                    >
                        <span className="text-xl group-hover:scale-125 transition-transform duration-300">+</span>
                        New Conversation
                    </button>

                    <div className="flex-1 overflow-y-auto space-y-1 mb-4 pr-1 scrollbar-thin scrollbar-thumb-slate-700/50">
                        <p className="text-[10px] font-bold tracking-[0.1em] text-slate-500 px-3 uppercase mb-3">Recent Chats</p>
                        {chats.map(chat => (
                            <div
                                key={chat.id}
                                onClick={() => setActiveChatId(chat.id)}
                                className={`group relative flex items-center gap-3 px-3 py-3 rounded-xl cursor-pointer transition-all duration-200 border ${activeChatId === chat.id
                                    ? 'bg-slate-700/50 border-indigo-500/50 shadow-inner'
                                    : 'bg-transparent border-transparent hover:bg-slate-700/30'
                                    }`}
                            >
                                <div className={`w-8 h-8 rounded-lg flex items-center justify-center transition-colors ${activeChatId === chat.id ? 'bg-indigo-500/20 text-indigo-400' : 'bg-slate-800 text-slate-500 group-hover:text-slate-300'}`}>
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" /></svg>
                                </div>
                                <span className={`flex-1 truncate text-[13px] font-medium transition-colors ${activeChatId === chat.id ? 'text-white' : 'text-slate-400 group-hover:text-slate-200'}`}>{chat.title}</span>

                                <button
                                    onClick={(e) => handleDeleteChat(e, chat.id)}
                                    className="opacity-0 group-hover:opacity-100 p-1.5 rounded-lg hover:bg-red-500/10 hover:text-red-400 transition-all duration-200"
                                >
                                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-4v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                                </button>
                            </div>
                        ))}
                    </div>

                    {/* Sidebar Footer - User Profile Scoped */}
                    <div className="border-t border-slate-700/50 pt-4 space-y-1">
                        <div className="flex items-center gap-3 px-3 py-3 rounded-xl bg-slate-800/30 border border-slate-700/30">
                            <div className="w-8 h-8 bg-gradient-to-tr from-slate-600 to-slate-400 rounded-lg flex items-center justify-center font-bold text-xs shadow-md shadow-black/20 uppercase">
                                {userId.charAt(0)}
                            </div>
                            <div className="flex-1 min-w-0">
                                <p className="text-[12px] font-bold truncate text-white">{userId}</p>
                                <p className="text-[10px] text-indigo-400/80 font-medium">Pro Account</p>
                            </div>
                        </div>
                        <button
                            onClick={handleLogout}
                            className="w-full flex items-center gap-3 px-3 py-3 rounded-xl hover:bg-red-500/10 text-slate-400 hover:text-red-400 transition-all duration-200 text-sm font-medium"
                        >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" /></svg>
                            Log out session
                        </button>
                    </div>
                </div>
            </aside>

            {/* Main Chat Content */}
            <main className="flex-1 flex flex-col relative bg-[#0f172a] shadow-inner">
                {/* Visual Background Decoration */}
                <div className="absolute top-0 left-0 w-full h-96 bg-gradient-to-b from-indigo-500/5 to-transparent pointer-events-none opacity-50" />

                {/* Header for Mobile/Title */}
                <header className="flex h-16 border-b border-slate-800/50 items-center px-6 justify-between shrink-0 z-10 bg-[#0f172a]/80 backdrop-blur-md">
                    <div className="flex items-center gap-4">
                        <button
                            onClick={() => setIsSidebarOpen(!isSidebarOpen)}
                            className="p-2 hover:bg-slate-800/80 rounded-lg transition-colors text-slate-400 hover:text-white"
                        >
                            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h16" /></svg>
                        </button>
                        <h2 className="text-sm font-semibold text-slate-300 truncate max-w-[200px] md:max-w-md">{activeChat.title}</h2>
                    </div>
                    {/* Advanced Features Toolbar */}
                    <div className="flex items-center gap-2 md:gap-4">
                        <button
                            onClick={handleGenerateImage}
                            disabled={loading || !message.trim()}
                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 hover:text-emerald-300 transition-all text-xs border border-emerald-500/20 disabled:opacity-30 disabled:grayscale"
                            title="Describe something in the chat box first"
                        >
                            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>
                            Generate Image
                        </button>
                        <button
                            onClick={handleExportPDF}
                            disabled={actionLoading}
                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800/50 hover:bg-slate-700 text-slate-300 hover:text-white transition-all text-xs border border-slate-700/50 hover:border-indigo-500/50"
                        >
                            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>
                            Export PDF
                        </button>
                        <button
                            onClick={() => setIsEmailModalOpen(true)}
                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-400 hover:text-indigo-300 transition-all text-xs border border-indigo-500/20"
                        >
                            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>
                            Email
                        </button>
                    </div>
                </header>

                {/* Messages Container */}
                <div className="flex-1 overflow-y-auto scroll-smooth py-6 scrollbar-thin scrollbar-thumb-slate-800 pr-1">
                    <div className="max-w-3xl mx-auto space-y-2">
                        {activeChat.messages.map((msg, index) => (
                            <div
                                key={index}
                                className={`w-full group animate-in fade-in slide-in-from-bottom-2 duration-500 fill-mode-both ${msg.role === 'assistant' ? 'py-6 px-4 hover:bg-slate-800/20' : 'py-6 px-4'}`}
                            >
                                <div className="max-w-3xl mx-auto flex gap-5 md:gap-7 items-start">
                                    {/* Avatar */}
                                    <div className={`w-9 h-9 shrink-0 rounded-xl flex items-center justify-center font-black text-[10px] shadow-lg ${msg.role === 'assistant'
                                        ? 'bg-gradient-to-br from-emerald-400 to-teal-500 text-white shadow-emerald-500/20'
                                        : 'bg-gradient-to-br from-indigo-500 to-violet-600 text-white shadow-indigo-500/20'
                                        }`}>
                                        {msg.role === 'assistant' ? 'AI' : 'YOU'}
                                    </div>

                                    {/* Message Content with Premium Bubble Styling */}
                                    <div className="flex-1 space-y-2 mt-1 min-w-0">
                                        <div className={`relative px-5 py-4 rounded-2xl ${msg.role === 'assistant'
                                            ? 'bg-slate-800/40 border border-slate-700/50 text-slate-200'
                                            : 'bg-gradient-to-br from-indigo-600/10 to-violet-600/10 border border-indigo-500/20 text-white'
                                            }`}>
                                            <p className="text-[15px] leading-relaxed whitespace-pre-wrap selection:bg-indigo-500/30">{msg.content}</p>
                                            {msg.image && (
                                                <div className="mt-4 rounded-xl overflow-hidden border border-slate-700 shadow-2xl animate-in zoom-in-95 duration-500">
                                                    <img src={msg.image} alt="AI Generation" className="w-full h-auto object-cover" />
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        ))}

                        {loading && (
                            <div className="py-6 px-4 bg-slate-800/10 animate-pulse">
                                <div className="max-w-3xl mx-auto flex gap-7 items-start">
                                    <div className="w-9 h-9 shrink-0 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center font-black text-[10px] text-white">AI</div>
                                    <div className="flex-1 pt-4 flex gap-1.5 items-center">
                                        <div className="w-2 h-2 bg-indigo-500 rounded-full animate-bounce [animation-delay:-0.3s]"></div>
                                        <div className="w-2 h-2 bg-indigo-500 rounded-full animate-bounce [animation-delay:-0.15s]"></div>
                                        <div className="w-2 h-2 bg-indigo-500 rounded-full animate-bounce"></div>
                                    </div>
                                </div>
                            </div>
                        )}
                        <div ref={messagesEndRef} className="h-4" />
                    </div>
                </div>

                {/* Glassmorphism Input Console */}
                <div className="w-full bg-gradient-to-t from-[#0f172a] via-[#0f172a]/95 to-transparent pt-4 pb-10 px-4">
                    <div className="max-w-3xl mx-auto relative group">
                        <div className="absolute -inset-1 bg-gradient-to-r from-indigo-500/20 to-violet-500/20 rounded-2xl blur-md opacity-0 group-focus-within:opacity-100 transition-opacity duration-500" />
                        <form
                            onSubmit={handleSendMessage}
                            className="relative flex items-center bg-[#1e293b]/70 backdrop-blur-xl border border-slate-700/50 rounded-2xl shadow-2xl p-2 transition-all duration-300 border-indigo-500/10 focus-within:border-indigo-500/50"
                        >
                            {/* Visual Gen Button */}
                            <button
                                type="button"
                                onClick={handleGenerateImage}
                                title="Generate Visual"
                                className="mr-1 p-2.5 rounded-xl hover:bg-slate-700/80 text-slate-400 hover:text-indigo-400 transition-all active:scale-95"
                            >
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>
                            </button>
                            <textarea
                                rows="1"
                                value={message}
                                onChange={(e) => setMessage(e.target.value)}
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter' && !e.shiftKey) {
                                        e.preventDefault();
                                        handleSendMessage(e);
                                    }
                                }}
                                placeholder="Message GenAI Pro or Describe a visual..."
                                disabled={loading}
                                className="flex-1 bg-transparent border-none rounded-xl py-3 px-4 focus:outline-none focus:ring-0 resize-none text-[15px] placeholder-slate-500 text-slate-100 min-h-[50px] max-h-[200px]"
                            />
                            <button
                                type="submit"
                                disabled={loading || !message.trim()}
                                className="ml-2 w-11 h-11 flex items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 text-white shadow-lg shadow-indigo-600/30 hover:scale-105 active:scale-95 transition-all duration-200 disabled:opacity-20 disabled:grayscale disabled:scale-100 cursor-pointer"
                            >
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M13 5l7 7-7 7M5 5l7 7-7 7" /></svg>
                            </button>
                        </form>
                        <div className="flex justify-between items-center mt-3 px-2">
                            <span className="text-[10px] font-bold text-slate-600 uppercase tracking-tighter italic">Enterprise Grade Privacy Scoped To: {userId}</span>
                            <span className="text-[10px] font-medium text-slate-500 underline decoration-slate-600 hover:text-slate-400 cursor-help">Integrated: PDF • Email • Visuals</span>
                        </div>
                    </div>
                </div>
            </main>
        </div>
    );
};

export default Dashboard;
