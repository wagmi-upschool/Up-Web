"use client";

import { getCurrentUser, fetchUserAttributes } from "aws-amplify/auth";
import { useEffect, useState } from "react";
import { Spinner } from "../global/loader/spinner";
import { Search, Send, Plus, Mic, Paperclip, ThumbsUp, ThumbsDown, Copy, Volume2, MoreHorizontal } from "lucide-react";
import Image from "next/image";

type Props = {};

interface Message {
  id: string;
  text: string;
  sender: 'user' | 'ai';
  time: string;
}

interface Chat {
  id: string;
  title: string;
  description: string;
  icon: string;
  isActive: boolean;
  hasNewMessage?: boolean;
  newMessageCount?: number;
}

function HomePage({}: Props) {
  const [userInfo, setUserInfo] = useState<any>(null);
  const [userAttributes, setUserAttributes] = useState<any>(null);
  const [loadingUser, setLoadingUser] = useState(true);
  const [currentMessage, setCurrentMessage] = useState("");
  
  const [chats] = useState<Chat[]>([
    {
      id: "1",
      title: "UP'tan mesajlar",
      description: "3 yeni mesaj",
      icon: "💬",
      isActive: false,
      hasNewMessage: true,
      newMessageCount: 3
    },
    {
      id: "2", 
      title: "Mükemmel e-posta yazın",
      description: "Bir e-posta için gereken tüm unsurları içer...",
      icon: "✏️",
      isActive: true
    },
    {
      id: "3",
      title: "Daha fazla odaklanın", 
      description: "Photoshop öğrenirken yaratıcılığınızı keşfe...",
      icon: "🎯",
      isActive: false
    },
    {
      id: "4",
      title: "UP'a hoşgeldin",
      description: "Her gün kitap okumak, zihinsel keşiflerinizi ...",
      icon: "👋",
      isActive: false
    }
  ]);

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

  if (loadingUser) return <Spinner />;

  return (
    <div className="flex h-screen bg-gray-100">
      {/* Ultra Left Navigation Bar */}
      <div className="w-20 h-screen px-2 pb-4 bg-white shadow-[0px_12px_16px_-4px_rgba(67,85,147,0.08)] shadow-[0px_4px_6px_-2px_rgba(67,85,147,0.03)] border-r border-neutral-200 inline-flex flex-col justify-between items-center overflow-hidden">
        {/* Logo Section */}
        <div className="h-14 flex flex-col justify-center items-center">
          <Image
            src="/up.svg"
            alt="UP Logo"
            width={50}
            height={32}
            className="object-contain"
          />
        </div>

        {/* Navigation Icons */}
        <div className="flex flex-col justify-start items-center gap-8">
          {/* First Nav Item */}
          <div className="flex flex-col justify-start items-center gap-2">
            <div className="w-9 h-9 relative overflow-hidden">
              <div className="w-2 h-2 left-[10.48px] top-0 absolute bg-neutral-400" />
              <div className="w-[5.13px] h-[5.13px] left-[1.84px] top-[27.71px] absolute bg-neutral-400" />
              <div className="w-[5.13px] h-[5.14px] left-[29.02px] top-[26.11px] absolute bg-neutral-400" />
              <div className="w-5 h-3.5 left-[11.23px] top-[7.38px] absolute bg-neutral-400" />
              <div className="w-3.5 h-5 left-[2.52px] top-[8.74px] absolute bg-neutral-400" />
              <div className="w-4 h-5 left-[10.57px] top-[16.77px] absolute bg-neutral-400" />
              <div className="w-1.5 h-1.5 left-[13.70px] top-[17.21px] absolute bg-neutral-400" />
            </div>
            <div className="opacity-0 flex flex-col justify-start items-center gap-0.5">
              <div className="w-1.5 h-1.5 bg-blue-600 rounded-full" />
            </div>
          </div>

          {/* Active UP Character - Chat */}
          <div className="flex flex-col justify-end items-center gap-2">
            <div className="w-16 h-16 flex items-center justify-center">
              <Image
                src="/up_face.svg"
                alt="UP Face"
                width={64}
                height={64}
                className="object-contain"
              />
            </div>
            <div className="flex flex-col justify-start items-center gap-0.5">
              <div className="w-1.5 h-1.5 bg-blue-600 rounded-full" />
            </div>
          </div>

          {/* Third Nav Item */}
          <div className="flex flex-col justify-start items-center gap-2">
            <div className="w-9 h-9 relative overflow-hidden">
              <div className="w-1.5 h-1.5 left-[7.47px] top-[21.19px] absolute bg-neutral-400" />
              <div className="w-1.5 h-1.5 left-[3.73px] top-[17.51px] absolute bg-neutral-400" />
              <div className="w-1.5 h-1.5 left-[11.21px] top-[24.87px] absolute bg-neutral-400" />
              <div className="w-1.5 h-1.5 left-[14.95px] top-[28.55px] absolute bg-neutral-400" />
              <div className="w-6 h-4 left-[13.84px] top-[2.79px] absolute bg-neutral-400" />
              <div className="w-8 h-7 left-0 top-[2.25px] absolute bg-neutral-400" />
            </div>
            <div className="opacity-0 flex flex-col justify-start items-center gap-0.5">
              <div className="w-1.5 h-1.5 bg-blue-600 rounded-full" />
            </div>
          </div>
        </div>

        {/* Bottom UP Logo */}
        <div className="h-6 p-1.5 inline-flex justify-center items-center">
          <Image
            src="/up.svg"
            alt="UP"
            width={32}
            height={20}
            className="object-contain"
          />
        </div>
      </div>

      {/* Chat Sidebar */}
      <div className="w-80 bg-white border-r border-gray-200 flex flex-col">
        {/* Sidebar Header */}
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-center justify-between mb-4">
            <h1 className="text-xl font-normal text-gray-800 font-righteous">Upper Sohbetler</h1>
            <div className="flex items-center gap-2">
              <button className="w-8 h-8 bg-blue-600 rounded flex items-center justify-center">
                <Plus className="w-4 h-4 text-white" />
              </button>
            </div>
          </div>
          
          {/* Search Bar */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Ara"
              className="w-full bg-white border border-gray-200 rounded-lg pl-10 pr-4 py-2 text-sm font-poppins font-medium focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <Mic className="absolute right-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
          </div>
        </div>

        {/* Chat List */}
        <div className="flex-1 overflow-y-auto p-4">
          <div className="space-y-4">
            {chats.map((chat) => (
              <div
                key={chat.id}
                className={`p-4 rounded-lg cursor-pointer transition-colors ${
                  chat.isActive 
                    ? 'bg-white shadow-md border-b-4 border-blue-600' 
                    : 'bg-white shadow-sm hover:shadow-md'
                } ${chat.hasNewMessage ? 'shadow-lg' : ''}`}
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center">
                    <span className="text-lg">{chat.icon}</span>
                  </div>
                  <div className="flex-1">
                    <h3 className="font-poppins font-semibold text-sm text-gray-900">{chat.title}</h3>
                    <p className="font-poppins text-xs font-medium text-gray-600 mt-1">{chat.description}</p>
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
      <div className="flex-1 flex flex-col bg-gradient-to-br from-blue-100 to-blue-300">
        {/* Chat Header */}
        <div className="bg-white p-4 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-normal text-gray-800 font-righteous">Mükemmel e-postayı yazın yazın yazın...</h2>
            <div className="flex items-center gap-2">
              <button className="p-2 hover:bg-gray-100 rounded">
                <Search className="w-5 h-5 text-gray-500" />
              </button>
              <button className="p-2 hover:bg-gray-100 rounded">
                <MoreHorizontal className="w-5 h-5 text-gray-500" />
              </button>
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
                  <div className="bg-white rounded-lg p-4 shadow-sm">
                    <p className="font-poppins text-gray-800 text-sm font-medium leading-relaxed">{message.text}</p>
                    <div className="flex items-center justify-between mt-3">
                      <div className="flex items-center gap-2">
                        <button className="p-1 hover:bg-gray-100 rounded">
                          <ThumbsUp className="w-4 h-4 text-gray-400" />
                        </button>
                        <button className="p-1 hover:bg-gray-100 rounded">
                          <ThumbsDown className="w-4 h-4 text-gray-400" />
                        </button>
                        <button className="p-1 hover:bg-gray-100 rounded">
                          <Copy className="w-4 h-4 text-gray-400" />
                        </button>
                        <button className="p-1 hover:bg-gray-100 rounded">
                          <Volume2 className="w-4 h-4 text-gray-400" />
                        </button>
                        <button className="p-1 hover:bg-gray-100 rounded">
                          <Paperclip className="w-4 h-4 text-gray-400" />
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
          <div className="bg-white rounded-lg border border-gray-200 p-4">
            <div className="flex items-center gap-3">
              <input
                type="text"
                placeholder="Buraya yazabilirsin"
                value={currentMessage}
                onChange={(e) => setCurrentMessage(e.target.value)}
                className="flex-1 bg-transparent font-poppins text-sm font-medium text-gray-800 placeholder-gray-500 focus:outline-none"
              />
              <button className="p-2 text-blue-600 hover:bg-blue-50 rounded">
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
