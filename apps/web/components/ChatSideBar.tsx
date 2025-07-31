/* eslint-disable @typescript-eslint/no-explicit-any */
'use client';

import React, { useState, useRef, useEffect } from 'react';
import { MessageCircle, X, Send } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';

export interface ChatMessage {
    id: string;
    userId: string;
    userName: string;
    userAvatar?: string;
    message: string;
    timestamp: Date;
    isCurrentUser: boolean;
}

interface ChatSideBarProps {
    isOpen: boolean;
    onClose: () => void;
    messages: ChatMessage[];
    currentUserId: string;
    currentUserName: string;
    onSendMessage?: (message: string) => void;
}

const ChatSideBar: React.FC<ChatSideBarProps> = ({ isOpen, onClose, messages, onSendMessage }) => {
    const [newMessage, setNewMessage] = useState('');
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const textareaRef = useRef<HTMLTextAreaElement>(null);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    useEffect(() => {
        scrollToBottom();
    }, [messages]);

    if (!isOpen) return null;

    const handleSendMessage = () => {
        if (newMessage.trim() && onSendMessage) {
            onSendMessage(newMessage.trim());
            setNewMessage('');
        }
    };

    const formatTime = (date: Date) => {
        return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    };

    const getInitials = (name: string) => {
        return name
            .split(' ')
            .map((word) => word[0])
            .join('')
            .toUpperCase()
            .slice(0, 2);
    };

    return (
        <div className="fixed inset-0 z-50 flex">
            {/* Sidebar */}
            <div className="fixed right-0 top-0 h-full w-96 bg-gray-900 text-white shadow-xl flex flex-col">
                {/* Header */}
                <div className="flex items-center justify-between p-4 border-b border-gray-800">
                    <div className="flex items-center gap-2">
                        <MessageCircle className="w-5 h-5" />
                        <h2 className="text-lg font-semibold">Chat</h2>
                    </div>
                    <Button variant="ghost" size="icon" onClick={onClose} className="h-8 w-8 hover:bg-gray-800">
                        <X className="w-4 h-4" />
                    </Button>
                </div>

                {/* Messages */}
                <div className="flex-1 overflow-y-auto p-4 space-y-4">
                    {messages.length > 0 ? (
                        messages.map((message) => (
                            <div
                                key={message.id}
                                className={`flex gap-3 ${message.isCurrentUser ? 'flex-row-reverse' : 'flex-row'}`}
                            >
                                <Avatar className="w-8 h-8 flex-shrink-0">
                                    <AvatarImage src={message.userAvatar} alt={message.userName} />
                                    <AvatarFallback className="text-xs bg-gray-700 text-white">
                                        {getInitials(message.userName)}
                                    </AvatarFallback>
                                </Avatar>

                                <div
                                    className={`flex flex-col max-w-[70%] ${message.isCurrentUser ? 'items-end' : 'items-start'}`}
                                >
                                    <div
                                        className={`flex items-center gap-2 mb-1 ${message.isCurrentUser ? 'flex-row-reverse' : 'flex-row'}`}
                                    >
                                        <span className="text-xs text-gray-400">{message.userName}</span>
                                        <span className="text-xs text-gray-500">{formatTime(message.timestamp)}</span>
                                    </div>

                                    <div
                                        className={`px-3 py-2 rounded-lg ${
                                            message.isCurrentUser ? 'bg-blue-600 text-white' : 'bg-gray-800 text-white'
                                        }`}
                                    >
                                        <p className="text-sm break-words">{message.message}</p>
                                    </div>
                                </div>
                            </div>
                        ))
                    ) : (
                        <div className="flex flex-col items-center justify-center py-12 text-center">
                            <MessageCircle className="w-12 h-12 text-gray-400 mb-4" />
                            <p className="text-gray-400 text-sm">No messages yet</p>
                            <p className="text-gray-500 text-xs mt-1">Start the conversation!</p>
                        </div>
                    )}
                    <div ref={messagesEndRef} />
                </div>

                {/* Message Input */}
                <div className="p-4 border-t border-gray-800 mb-16">
                    <div className="flex gap-2">
                        <div className="flex-1 relative">
                            <textarea
                                ref={textareaRef}
                                value={newMessage}
                                onChange={(e) => setNewMessage(e.target.value)}
                                onKeyDown={(e) => {
                                    // Stop propagation for all keys when textarea is focused
                                    e.stopPropagation();
                                    if (e.key === 'Enter' && !e.shiftKey) {
                                        e.preventDefault();
                                        handleSendMessage();
                                    }
                                }}
                                onKeyPress={(e) => {
                                    // Stop propagation for all keys when textarea is focused
                                    e.stopPropagation();
                                }}
                                onKeyUp={(e) => {
                                    // Stop propagation for all keys when textarea is focused
                                    e.stopPropagation();
                                }}
                                onFocus={() => {
                                    // Add global event listener to prevent Phaser from capturing keys
                                    const preventPhaserKeys = (e: KeyboardEvent) => {
                                        e.stopPropagation();
                                    };
                                    document.addEventListener('keydown', preventPhaserKeys, true);
                                    document.addEventListener('keypress', preventPhaserKeys, true);
                                    document.addEventListener('keyup', preventPhaserKeys, true);
                                    
                                    // Store the listener for cleanup
                                    (textareaRef.current as any)._phaserKeyListener = preventPhaserKeys;
                                }}
                                onBlur={() => {
                                    // Remove global event listener when textarea loses focus
                                    const listener = (textareaRef.current as any)._phaserKeyListener;
                                    if (listener) {
                                        document.removeEventListener('keydown', listener, true);
                                        document.removeEventListener('keypress', listener, true);
                                        document.removeEventListener('keyup', listener, true);
                                        (textareaRef.current as any)._phaserKeyListener = null;
                                    }
                                }}
                                placeholder="Type a message..."
                                className="w-full px-3 py-2 text-sm bg-gray-800 rounded-md border border-gray-700 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                                rows={1}
                                style={{ minHeight: '40px', maxHeight: '120px' }}
                            />
                        </div>
                        <Button
                            onClick={handleSendMessage}
                            disabled={!newMessage.trim()}
                            className="px-3 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-700 disabled:text-gray-500"
                            size="icon"
                        >
                            <Send className="w-4 h-4" />
                        </Button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ChatSideBar;
