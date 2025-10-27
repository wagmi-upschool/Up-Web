"use client";

import React, { useState, useEffect, useCallback, useRef } from "react";
import Image from "next/image";
import MessageRenderer from "@/components/messages/MessageRenderer";
import { useGetChatMessagesQuery, useSendChatMessageMutation, api } from "@/state/api";
import { clientLog, clientError } from "@/lib/logging-utils";
import { useDispatch } from "react-redux";

interface ReflectionJournalProps {
  chatId?: string;
}

const ReflectionJournal: React.FC<ReflectionJournalProps> = ({ chatId }) => {
  const dispatch = useDispatch();
  const [messages, setMessages] = useState<any[]>([]);
  const [inputValue, setInputValue] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const prevChatIdRef = useRef<string | undefined>(chatId);

  // Fetch messages if chatId is provided
  const {
    data: messagesData,
    isLoading: messagesLoading,
    isFetching,
  } = useGetChatMessagesQuery(
    { chatId: chatId || "", limit: "50" },
    { skip: !chatId }
  );

  const [sendMessage] = useSendChatMessageMutation();

  // Clear messages immediately on mount if no chatId
  useEffect(() => {
    if (!chatId) {
      clientLog("🧹 Journal mounted without chatId - clearing all messages and cache");
      setMessages([]);
      // Invalidate all message cache to ensure no stale data
      dispatch(api.util.invalidateTags(['Messages']));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Run only on mount

  // Handle chatId changes and clear messages when transitioning
  useEffect(() => {
    const prevChatId = prevChatIdRef.current;

    // chatId changed (including undefined -> chatId or chatId -> undefined)
    if (prevChatId !== chatId) {
      clientLog("🔄 ChatId transition detected", {
        from: prevChatId,
        to: chatId,
      });

      // Clear messages immediately when chatId changes or becomes undefined
      setMessages([]);

      if (!chatId) {
        clientLog("🧹 Clearing journal messages - no chatId provided");
        // Invalidate cache when transitioning to no-chat state
        dispatch(api.util.invalidateTags(['Messages']));
      } else {
        clientLog("📝 Journal chatId changed to:", chatId);
        // Invalidate previous chat's cache to ensure fresh data
        if (prevChatId) {
          dispatch(api.util.invalidateTags([{ type: 'Messages', id: prevChatId }]));
        }
      }

      prevChatIdRef.current = chatId;
    }
  }, [chatId, dispatch]);

  // Only update messages from query data when we have both chatId and data
  useEffect(() => {
    if (chatId && messagesData?.messages) {
      clientLog("📥 Updating messages from query data:", {
        chatId,
        messageCount: messagesData.messages.length,
      });
      setMessages(messagesData.messages);
    } else if (!chatId) {
      // Extra safety: ensure messages are empty when no chatId
      setMessages([]);
    }
  }, [chatId, messagesData]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      clientLog("🧹 Journal component unmounting - cleanup");
      setMessages([]);
    };
  }, []);

  const handleSendMessage = async () => {
    if (!inputValue.trim() || !chatId) return;

    setIsLoading(true);
    try {
      // Send message using the chat API
      const result = await sendMessage({
        chatId,
        message: inputValue,
        assistantId: "", // Journal chats might not need assistantId
      });

      if ("data" in result) {
        setInputValue("");
        clientLog("✅ Journal message sent successfully");
      } else {
        clientError("❌ Failed to send journal message:", result.error);
      }
    } catch (error) {
      clientError("❌ Error sending journal message:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const handleInsertMessage = useCallback((messageText: string) => {
    setInputValue(messageText);
    inputRef.current?.focus();
  }, []);

  return (
    <div className="flex h-screen relative">
      {/* Journal Background */}
      <div 
        className="absolute inset-0 w-full h-full"
        style={{
          backgroundImage: "url('/journal/journal-bg.png')",
          backgroundSize: "cover",
          backgroundPosition: "center",
          backgroundRepeat: "no-repeat",
        }}
      />
      
      {/* Content Overlay */}
      <div className="relative z-10 flex flex-col w-full">
        {/* Header with decorative elements */}
        <div className="flex justify-center pt-8 pb-4">
          <Image
            src="/journal/ayrac_open.svg"
            alt="Journal Header Decoration"
            width={235}
            height={33}
            className="opacity-80"
          />
        </div>

        {/* Messages Area */}
        <div className="flex-1 px-8 py-4 overflow-y-auto">
          <div className="max-w-4xl mx-auto space-y-6">
            {messages.length === 0 ? (
              <div className="text-center py-12">
                <div className="mb-4">
                  <Image
                    src="/journal/up_no_look.svg"
                    alt="Journal Avatar"
                    width={44}
                    height={44}
                    className="mx-auto opacity-80"
                  />
                </div>
                <p className="text-text-body-black/60 font-poppins text-sm">
                  Günlüğünüzü yazmaya başlayın...
                </p>
              </div>
            ) : (
              messages.map((message) => (
                <div
                  key={message.id}
                  className={`flex ${
                    message.role === "user" ? "justify-end" : "justify-start"
                  }`}
                >
                  <div
                    className={`max-w-2xl ${
                      message.role === "user"
                        ? "bg-primary text-white rounded-tl-3xl rounded-bl-3xl rounded-br-3xl px-6 py-4"
                        : "bg-white/60 backdrop-blur-sm rounded-tr-3xl rounded-bl-3xl rounded-br-3xl p-4 border border-white/30"
                    }`}
                  >
                    <MessageRenderer
                      content={message.content}
                      sender={message.role === "user" ? "user" : "ai"}
                      onInsertMessage={handleInsertMessage}
                    />
                  </div>
                </div>
              ))
            )}
            
            {isLoading && (
              <div className="flex justify-start">
                <div className="bg-white/60 backdrop-blur-sm rounded-tr-3xl rounded-bl-3xl rounded-br-3xl p-4 border border-white/30">
                  <div className="flex items-center gap-2">
                    <div className="flex space-x-1">
                      <div className="h-2 w-2 animate-bounce rounded-full bg-gray-400 [animation-delay:-0.3s]"></div>
                      <div className="h-2 w-2 animate-bounce rounded-full bg-gray-400 [animation-delay:-0.15s]"></div>
                      <div className="h-2 w-2 animate-bounce rounded-full bg-gray-400"></div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Footer with decorative elements */}
        <div className="flex justify-center pt-4 pb-2">
          <Image
            src="/journal/ayrac_close.svg"
            alt="Journal Footer Decoration"
            width={235}
            height={33}
            className="opacity-80"
          />
        </div>

        {/* Input Area - Journal Style */}
        <div className="px-8 pb-6 bg-white">
          <div className="max-w-4xl mx-auto">
            <div 
              data-property-1="journel" 
              className="w-full p-4 bg-white shadow-[0px_-5px_8px_0px_rgba(239,193,179,0.30)] outline outline-1 outline-offset-[-1px] outline-white/30 backdrop-blur-[6.30px] inline-flex justify-start items-center gap-4 rounded-2xl"
            >
              <div data-property-1="günlük" className="w-11 h-11 relative flex-shrink-0">
                <div className="w-11 h-11 left-0 top-0 absolute bg-blue-500 rounded-full border border-white/30 backdrop-blur-sm" />
                <div className="w-5 h-px left-[1.46px] top-[10.38px] absolute origin-top-left rotate-12">
                  <div className="w-1.5 h-[2.45px] left-0 top-0 absolute bg-white" />
                  <div className="w-1.5 h-[2.45px] left-[15.06px] top-[3.20px] absolute bg-white" />
                </div>
              </div>
              
              <div 
                data-l-icon="false" 
                data-property-1="Default" 
                data-r-icon="true" 
                className="flex-1 h-11 bg-white rounded-lg outline outline-1 outline-offset-[-1px] outline-neutral-200 inline-flex flex-col justify-center items-start gap-1 overflow-hidden"
              >
                <div className="self-stretch flex-1 px-4 py-2 bg-white rounded-[999px] shadow-[0px_2px_9px_0px_rgba(0,0,0,0.08)] inline-flex justify-between items-center overflow-hidden">
                  <div className="flex-1 flex justify-start items-center gap-2">
                    <input
                      type="text"
                      ref={inputRef}
                      value={inputValue}
                      onChange={(e) => setInputValue(e.target.value)}
                      onKeyDown={handleKeyDown}
                      placeholder="Buraya yazabilirsin"
                      disabled={isLoading}
                      className="flex-1 bg-transparent text-sm font-medium font-poppins leading-tight text-neutral-800 placeholder:text-neutral-400 border-none outline-none"
                    />
                  </div>
                  
                  <button
                    onClick={handleSendMessage}
                    disabled={!inputValue.trim() || isLoading}
                    className="w-4 h-4 relative overflow-hidden flex-shrink-0 disabled:opacity-50"
                  >
                    <div className="w-3 h-3.5 left-[1.72px] top-[1px] absolute bg-neutral-800" />
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ReflectionJournal;
