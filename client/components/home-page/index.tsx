"use client";

import { getCurrentUser, fetchUserAttributes, signOut } from "aws-amplify/auth";
import { useEffect, useState, useRef } from "react";
import { Spinner } from "../global/loader/spinner";
import { Search, Send, Plus, Mic, Paperclip, ThumbsUp, ThumbsDown, Copy, Volume2, MoreHorizontal, LogOut } from "lucide-react";
import Image from "next/image";
import { useGetChatsQuery, useGetChatMessagesQuery } from "@/state/api";
import { Chat, ChatMessage } from "@/types/type";

type Props = {};

interface Message {
  id: string;
  text: string;
  sender: 'user' | 'ai';
  time: string;
}

function HomePage({}: Props) {
  const [userInfo, setUserInfo] = useState<any>(null);
  const [userAttributes, setUserAttributes] = useState<any>(null);
  const [loadingUser, setLoadingUser] = useState(true);
  const [currentMessage, setCurrentMessage] = useState("");
  const [activeChat, setActiveChat] = useState<string | null>(null);
  const [showDropdown, setShowDropdown] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  
  const { data: chats = [], isLoading: isLoadingChats, error: chatsError } = useGetChatsQuery();
  
  console.log('Chats data:', chats);
  console.log('Chats loading:', isLoadingChats);
  console.log('Chats error:', chatsError);

  const [messages] = useState<Message[]>([
    {
      id: "1",
      text: "Bana özel koşullarını söyle, ben de mükemmel e-postayı yazmana yardım edeceğim! Bu arada, başarılı e-postalar için bazı iyi ipuçlarını burada bulabilirsiniz.",
      sender: 'ai',
      time: "Wed 8:21 AM"
    },
    {
      id: "2", 
      text: "Bana özel koşullarını söyle, ben de mükemmel e-postayı yazmana yardım edeceğim! Bu arada, başarılı e-postalar için bazı iyi ipuçlarını burada bulabilirsiniz.",
      sender: 'ai',
      time: "Wed 8:21 AM"
    }
  ]);

  const handleSignOut = async () => {
    try {
      await signOut();
      setShowDropdown(false);
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };

  useEffect(() => {
    const fetchUser = async () => {
      try {
        const user = await getCurrentUser();
        const attributes = await fetchUserAttributes();
        setUserInfo(user);
        setUserAttributes(attributes);
      } catch (error) {
        console.error("Error fetching user:", error);
      } finally {
        setLoadingUser(false);
      }
    };

    fetchUser();
  }, []);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowDropdown(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  if (loadingUser || isLoadingChats) return <Spinner />;

  return (
    <div className="flex h-screen bg-icon-slate-white">
      {/* Ultra Left Navigation Bar */}
      <div className="w-20 h-screen px-2 pb-4 bg-app-bar-bg shadow-lg border-r border-message-box-border inline-flex flex-col justify-between items-center overflow-hidden">
        {/* Logo Section */}
        <div className="h-14 flex flex-col justify-center items-center pt-4">
          <Image
            src="/up.svg"
            alt="UP Logo"
            width={50}
            height={32}
            className="object-contain"
          />
        </div>

        {/* Navigation Icons */}
        <div className="flex flex-col justify-center items-center">
          {/* UP Face with Dot */}
          <div className="flex flex-col items-center gap-2">
            <div className="w-16 h-16 flex items-center justify-center">
              <Image
                src="/up_face.svg"
                alt="UP Face"
                width={64}
                height={64}
                className="object-contain"
              />
            </div>
            <div className="flex items-center justify-center">
              <Image
                src="/dot.svg"
                alt="Active Dot"
                width={6}
                height={7}
                className="object-contain"
              />
            </div>
          </div>
        </div>

        {/* Empty Bottom Space */}
        <div className="h-6"></div>
      </div>

      {/* Chat Sidebar */}
      <div className="w-80 bg-app-bar-bg border-r border-message-box-border flex flex-col">
        {/* Sidebar Header */}
        <div className="p-6 border-b border-message-box-border">
          <div className="flex items-center justify-between mb-4">
            <h1 className="text-xl font-normal text-title-black font-righteous">Upper Sohbetler</h1>
            <div className="flex items-center gap-2">
              <button className="w-8 h-8 bg-primary rounded flex items-center justify-center">
                <Plus className="w-4 h-4 text-secondary-text" />
              </button>
            </div>
          </div>
          
          {/* Search Bar */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-passive-icon" />
            <input
              type="text"
              placeholder="Ara"
              className="w-full bg-message-box-bg border border-message-box-border rounded-lg pl-10 pr-4 py-2 text-sm font-poppins font-medium text-text-body-black placeholder-text-description-gray focus:outline-none focus:ring-2 focus:ring-primary"
            />
            <Mic className="absolute right-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-passive-icon" />
          </div>
        </div>

        {/* Chat List */}
        <div className="flex-1 overflow-y-auto p-4">
          {chats.length === 0 && !isLoadingChats && (
            <div className="text-center text-gray-500 mt-4">
              Henüz chat yok. Chats data: {JSON.stringify(chats)}
            </div>
          )}
          <div className="space-y-4">
            {chats.map((chat) => (
              <div
                key={chat.id}
                onClick={() => setActiveChat(chat.id)}
                className={`p-4 rounded-lg cursor-pointer transition-colors ${
                  activeChat === chat.id
                    ? 'bg-message-box-bg shadow-md border-b-4 border-primary' 
                    : 'bg-message-box-bg shadow-sm hover:shadow-md'
                } ${chat.hasNewMessage ? 'shadow-lg' : ''}`}
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-icon-slate-white rounded-lg flex items-center justify-center overflow-hidden">
                    {chat.icon && chat.icon.startsWith('http') ? (
                      <Image
                        src={chat.icon}
                        alt={chat.title}
                        width={40}
                        height={40}
                        className="object-cover rounded-lg"
                      />
                    ) : (
                      <span className="text-lg">{chat.icon || '💬'}</span>
                    )}
                  </div>
                  <div className="flex-1">
                    <h3 className="font-poppins font-semibold text-sm text-text-black">{chat.title}</h3>
                    <p className="font-poppins text-xs font-medium text-text-description-gray mt-1 line-clamp-2 overflow-hidden">{chat.description}</p>
                  </div>
                  {chat.hasNewMessage && (
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 bg-red-200 rounded"></div>
                      <MoreHorizontal className="w-4 h-4 text-orange-500" />
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col bg-gradient-to-br from-primary-faded to-blue-200">
        {/* Chat Header */}
        <div className="bg-app-bar-bg p-4 border-b border-message-box-border">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-normal text-title-black font-righteous">Mükemmel e-postayı yazın yazın yazın...</h2>
            <div className="flex items-center gap-2">
              <button className="p-2 hover:bg-icon-slate-white rounded">
                <Search className="w-5 h-5 text-passive-icon" />
              </button>
              <div className="relative" ref={dropdownRef}>
                <button 
                  className="p-2 hover:bg-icon-slate-white rounded"
                  onClick={() => setShowDropdown(!showDropdown)}
                >
                  <MoreHorizontal className="w-5 h-5 text-passive-icon" />
                </button>
                
                {showDropdown && (
                  <div className="absolute right-0 mt-2 w-48 bg-message-box-bg border border-message-box-border rounded-lg shadow-lg z-50">
                    <div className="py-1">
                      <button
                        onClick={handleSignOut}
                        className="flex items-center gap-2 w-full px-4 py-2 text-sm text-text-body-black hover:bg-icon-slate-white transition-colors"
                      >
                        <LogOut className="w-4 h-4" />
                        Sign Out
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Messages Area */}
        <div className="flex-1 overflow-y-auto p-6">
          <div className="space-y-4">
            {messages.map((message) => (
              <div key={message.id} className="flex items-start gap-3">
                <div className="w-10 h-10 flex items-center justify-center">
                  <Image
                    src="/up_face.svg"
                    alt="UP"
                    width={40}
                    height={40}
                    className="object-contain"
                  />
                </div>
                <div className="flex-1">
                  <div className="bg-message-box-bg rounded-lg p-4 shadow-sm">
                    <p className="font-poppins text-text-body-black text-sm font-medium leading-relaxed">{message.text}</p>
                    <div className="flex items-center justify-between mt-3">
                      <div className="flex items-center gap-2">
                        <button className="p-1 hover:bg-icon-slate-white rounded">
                          <ThumbsUp className="w-4 h-4 text-passive-icon" />
                        </button>
                        <button className="p-1 hover:bg-icon-slate-white rounded">
                          <ThumbsDown className="w-4 h-4 text-passive-icon" />
                        </button>
                        <button className="p-1 hover:bg-icon-slate-white rounded">
                          <Copy className="w-4 h-4 text-passive-icon" />
                        </button>
                        <button className="p-1 hover:bg-icon-slate-white rounded">
                          <Volume2 className="w-4 h-4 text-passive-icon" />
                        </button>
                        <button className="p-1 hover:bg-icon-slate-white rounded">
                          <Paperclip className="w-4 h-4 text-passive-icon" />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Message Input */}
        <div className="p-6">
          <div className="bg-message-box-bg rounded-lg border border-message-box-border p-4">
            <div className="flex items-center gap-3">
              <input
                type="text"
                placeholder="Buraya yazabilirsin"
                value={currentMessage}
                onChange={(e) => setCurrentMessage(e.target.value)}
                className="flex-1 bg-transparent font-poppins text-sm font-medium text-text-body-black placeholder-text-description-gray focus:outline-none"
              />
              <button className="p-2 text-primary hover:bg-primary-faded rounded">
                <Send className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
export default HomePage;
