"use client";

import { getCurrentUser, signOut, fetchAuthSession } from "aws-amplify/auth";
import { useEffect, useState, useRef, useMemo, useCallback } from "react";
import LottieSpinner from "../global/loader/lottie-spinner";
import {
  Send,
  ThumbsUp,
  ThumbsDown,
  Copy,
  MoreHorizontal,
  LogOut,
} from "lucide-react";
import Image from "next/image";
import {
  useGetChatsQuery,
  useGetChatMessagesQuery,
  useSendChatMessageMutation,
  useSaveConversationMutation,
} from "@/state/api";
import { ChatMessage } from "@/types/type";
import MessageRenderer from "@/components/messages/MessageRenderer";
import toast from "react-hot-toast";

type Props = {};

// Helper function to format date like mobile (local timezone)
const formatMobileDateTime = (date?: Date | string): string => {
  const d = date ? new Date(date) : new Date();
  // Use local time instead of UTC
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  const hours = String(d.getHours()).padStart(2, "0");
  const minutes = String(d.getMinutes()).padStart(2, "0");
  const seconds = String(d.getSeconds()).padStart(2, "0");
  const milliseconds = String(d.getMilliseconds()).padStart(3, "0");

  return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}.${milliseconds}`;
};

function HomePage({}: Props) {
  const [loadingUser, setLoadingUser] = useState(true);
  const [currentMessage, setCurrentMessage] = useState("");
  const [activeChat, setActiveChat] = useState<string | null>(null);
  const [showDropdown, setShowDropdown] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const [optimisticMessages, setOptimisticMessages] = useState<ChatMessage[]>(
    []
  );
  const [messageLikes, setMessageLikes] = useState<{
    [messageId: string]: "like" | "dislike" | null;
  }>({});
  const [isAiResponding, setIsAiResponding] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Auto scroll to bottom function
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  const {
    data: chats = [],
    isLoading: isLoadingChats,
    error: chatsError,
  } = useGetChatsQuery();
  const {
    data: messagesData,
    isLoading: isLoadingMessages,
    error: messagesError,
  } = useGetChatMessagesQuery(
    { chatId: activeChat!, limit: "50" },
    { skip: !activeChat }
  );
  const [sendMessage, { isLoading: isSendingMessage }] =
    useSendChatMessageMutation();
  const [saveConversation] = useSaveConversationMutation();

  // Use real messages combined with optimistic messages (memoized, with deduplication)
  const messages = useMemo(() => {
    const rawRealMessages = messagesData?.messages || [];

    // First, deduplicate real messages by content and identifier
    const realMessages = rawRealMessages.filter((msg, index, arr) => {
      // Keep first occurrence of each unique message
      return (
        arr.findIndex(
          (m) =>
            m.content === msg.content &&
            m.role === msg.role &&
            Math.abs(
              new Date(m.createdAt || 0).getTime() -
                new Date(msg.createdAt || 0).getTime()
            ) < 2000 // Within 2 seconds
        ) === index
      );
    });

    // If we have real messages with content, filter out temp optimistic messages
    if (realMessages.length > 0 && realMessages.some((msg) => msg.content)) {
      // Filter out temp optimistic messages that might be duplicated by real messages
      const filteredOptimistic = optimisticMessages.filter(
        (opt) =>
          !opt.id.startsWith("temp-") ||
          !realMessages.some(
            (real) =>
              real.content === opt.content &&
              real.role === opt.role &&
              Math.abs(
                new Date(real.createdAt || 0).getTime() -
                  new Date(opt.createdAt || 0).getTime()
              ) < 5000 // Within 5 seconds
          )
      );
      return [...realMessages, ...filteredOptimistic];
    }

    return [...realMessages, ...optimisticMessages];
  }, [messagesData?.messages, optimisticMessages]);

  // Auto scroll when messages change
  useEffect(() => {
    scrollToBottom();
  }, [messages, optimisticMessages, isAiResponding]);

  const handleSignOut = async () => {
    try {
      await signOut();
      setShowDropdown(false);
    } catch (error) {
      console.error("Error signing out:", error);
    }
  };

  const handleSendMessage = async () => {
    if (!currentMessage.trim() || !activeChat) return;

    const currentActiveChat = chats.find((chat) => chat.id === activeChat);
    if (!currentActiveChat?.assistantId) {
      console.error("No assistant ID found for current chat");
      return;
    }

    const messageText = currentMessage;
    const timestamp = formatMobileDateTime();

    // Add optimistic user message immediately
    const userMessage: ChatMessage = {
      id: `temp-user-${Date.now()}`,
      text: messageText,
      content: messageText,
      sender: "user",
      role: "user",
      createdAt: timestamp,
      assistantId: currentActiveChat.assistantId,
    };

    // Add typing indicator for AI response
    const typingMessageId = `temp-typing-${Date.now()}`;
    const typingMessage: ChatMessage = {
      id: typingMessageId,
      text: "...",
      content: "...",
      sender: "ai",
      role: "assistant",
      createdAt: timestamp,
      assistantId: currentActiveChat.assistantId,
      type: "typing",
    };

    setOptimisticMessages([userMessage, typingMessage]);
    setCurrentMessage(""); // Clear input immediately
    setIsAiResponding(true);

    try {
      console.log("[MESSAGE STREAM TEST] 🚀 Sending message with streaming:", {
        chatId: activeChat,
        message: messageText,
        assistantId: currentActiveChat.assistantId,
      });
      console.log(
        "[MESSAGE STREAM TEST] 📨 Optimistic messages set:",
        optimisticMessages.length
      );

      // Get proper auth headers
      const session = await fetchAuthSession();
      const { accessToken, idToken } = session.tokens ?? {};
      const user = await getCurrentUser();

      const headers: Record<string, string> = {
        "Content-Type": "application/json",
      };

      if (accessToken && idToken) {
        headers["Authorization"] = `Bearer ${accessToken}`;
        headers["x-id-token"] = idToken.toString();
        headers["x-user-id"] = user.userId;
      } else {
        // Development fallback
        headers["Authorization"] = "Bearer test";
        headers["x-user-id"] = "test123";
      }

      // Start streaming response
      const response = await fetch(`/api/chats/${activeChat}/send`, {
        method: "POST",
        headers,
        body: JSON.stringify({
          message: messageText,
          assistantId: currentActiveChat.assistantId,
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      // Handle streaming response
      const reader = response.body?.getReader();
      const decoder = new TextDecoder();
      let aiResponseContent = "";

      if (reader) {
        let aiMessage: ChatMessage = {
          id: `ai-response-${Date.now()}`,
          text: "",
          content: "",
          sender: "ai",
          role: "assistant",
          createdAt: formatMobileDateTime(),
          assistantId: currentActiveChat.assistantId,
        };

        // Process stream exactly like Flutter _processStream
        let buffer = "";

        try {
          while (true) {
            const { done, value } = await reader.read();

            if (done) break;

            const chunk = decoder.decode(value, { stream: true });

            // Check for errors like Flutter
            if (chunk.includes("error")) {
              try {
                const errorMap = JSON.parse(chunk);
                console.error(
                  "[MESSAGE STREAM TEST] ❌ Stream error:",
                  errorMap
                );
                throw new Error("Stream error received");
              } catch (e) {
                // Continue if not valid JSON
              }
            }

            // Process chunk like Flutter: remove [DONE-UP] and add to buffer
            buffer += chunk.replace("[DONE-UP]", "");
            const isDone = chunk.includes("[DONE-UP]");

            console.log(
              "[MESSAGE STREAM TEST] 📝 Chunk processed, buffer length:",
              buffer.length
            );

            // Update AI message with accumulated buffer content (like Flutter MessageReceivedEvent)
            aiMessage = {
              ...aiMessage,
              text: buffer,
              content: buffer,
            };

            // Real-time UI update like Flutter emit
            setOptimisticMessages([userMessage, aiMessage]);

            if (isDone) {
              console.log(
                "[MESSAGE STREAM TEST] ✅ Stream completed with [DONE-UP]"
              );
              break;
            }
          }
        } catch (error) {
          console.error(
            "[MESSAGE STREAM TEST] ❌ Stream processing error:",
            error
          );
          throw error;
        }

        // Use buffer as final response content
        aiResponseContent = buffer;

        console.log("Streaming completed, final response:", aiResponseContent);

        console.log(
          "[MESSAGE STREAM TEST] ✅ Streaming completed, final response length:",
          aiResponseContent.length
        );

        // Stop AI responding indicator now that we have the response
        setIsAiResponding(false);

        // Save the conversation using conversation-save endpoint (Flutter-style)
        try {
          console.log(
            "[MESSAGE STREAM TEST] 💾 Saving conversation via conversation-save endpoint..."
          );

          // Get current user for userId
          const user = await getCurrentUser();

          // Prepare ONLY the new messages (user + AI response) - existing messages don't have content
          const newUserMessage: ChatMessage = {
            id: `user-${Date.now()}`,
            text: messageText,
            content: messageText,
            role: "user",
            sender: "user",
            createdAt: timestamp,
            assistantId: currentActiveChat.assistantId,
            type: "default",
          };

          const newAiMessage: ChatMessage = {
            id: `ai-${Date.now()}`,
            text: aiResponseContent,
            content: aiResponseContent,
            role: "assistant",
            sender: "ai",
            createdAt: formatMobileDateTime(),
            assistantId: currentActiveChat.assistantId,
            type: "default",
          };

          // Only send NEW messages since existing ones don't have content from API
          const messagesToSave: ChatMessage[] = [newUserMessage, newAiMessage];

          console.log(
            "[MESSAGE STREAM TEST] 📝 Preparing conversation-save request:",
            {
              messagesCount: messagesToSave.length,
              assistantId: currentActiveChat.assistantId,
              conversationId: activeChat,
              userId: user.userId,
              lastFewMessages: messagesToSave.slice(-3).map((m) => ({
                id: m.id,
                text: m.text,
                content: m.content,
                message: (m as any).message,
                role: m.role,
              })),
            }
          );

          // Use conversation-save endpoint (Flutter-style)
          const saveResult = await saveConversation({
            chatId: activeChat,
            assistantId: currentActiveChat.assistantId,
            assistantGroupId: currentActiveChat.assistantGroupId || "",
            type: "conversation",
            userId: user.userId,
            localDateTime: formatMobileDateTime(),
            title: currentActiveChat.title || "Untitled Conversation",
            lastMessage:
              aiResponseContent.substring(0, 100) +
              (aiResponseContent.length > 100 ? "..." : ""),
            messages: messagesToSave.map((msg) => ({
              // Now we have only 2 messages with actual content
              id: msg.id,
              content: msg.text || msg.content || "", // Use content field directly
              role: msg.role,
              sender: msg.sender,
              createdAt: msg.createdAt
                ? formatMobileDateTime(msg.createdAt)
                : formatMobileDateTime(),
              assistantId: msg.assistantId,
              type: msg.type || "default",
            })),
            conversationId: activeChat, // Use existing chat ID as conversation ID
          });

          if ("data" in saveResult) {
            console.log(
              "[MESSAGE STREAM TEST] ✅ Conversation saved successfully via conversation-save endpoint"
            );
            console.log(
              "[MESSAGE STREAM TEST] 🔄 RTK Query cache automatically invalidated"
            );
            console.log(
              "[MESSAGE STREAM TEST] 📄 Save result:",
              saveResult.data
            );
          } else {
            console.error(
              "[MESSAGE STREAM TEST] ❌ Failed to save conversation:",
              saveResult.error
            );
          }
        } catch (saveError) {
          console.error(
            "[MESSAGE STREAM TEST] ❌ Error saving conversation:",
            saveError
          );
        }

        // Optimistic messages will be cleared automatically by useEffect when real messages load
        console.log(
          "[MESSAGE STREAM TEST] 💭 Optimistic messages will be cleared when real messages with content are detected"
        );
      }
    } catch (error) {
      console.error("[MESSAGE STREAM TEST] ❌ Failed to send message:", error);
      // Remove optimistic messages on error
      setOptimisticMessages([]);
      // Restore the message to input
      setCurrentMessage(messageText);
      setIsAiResponding(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const handleLikeDislike = useCallback(
    async (messageId: string, type: "like" | "dislike") => {
      try {
        // Optimistically update the UI
        const currentStatus = messageLikes[messageId];
        const newStatus = currentStatus === type ? null : type;
        setMessageLikes((prev) => ({ ...prev, [messageId]: newStatus }));

        // Call the API
        const session = await fetchAuthSession();
        const { accessToken, idToken } = session.tokens ?? {};
        const user = await getCurrentUser();

        if (accessToken && idToken && user.userId) {
          const response = await fetch(
            `${process.env.NEXT_PUBLIC_BASE_URL}/api/messages/${messageId}/rate`,
            {
              method: "POST",
              headers: {
                Authorization: `Bearer ${accessToken}`,
                "x-id-token": idToken.toString(),
                "x-user-id": user.userId,
                "Content-Type": "application/json",
              },
              body: JSON.stringify({
                rating:
                  newStatus === "like" ? 1 : newStatus === "dislike" ? -1 : 0,
              }),
            }
          );

          if (!response.ok) {
            // Revert on error
            setMessageLikes((prev) => ({
              ...prev,
              [messageId]: currentStatus,
            }));
            toast.error("Rating kaydedilemedi");
          } else {
            toast.success(
              newStatus === "like"
                ? "Beğenildi"
                : newStatus === "dislike"
                  ? "Beğenilmedi"
                  : "Rating kaldırıldı"
            );
          }
        }
      } catch (error) {
        console.error("Error rating message:", error);
        toast.error("Rating kaydedilemedi");
      }
    },
    [messageLikes]
  );

  useEffect(() => {
    console.log(
      "[MESSAGE STREAM TEST] 🔄 HomePage component mounted/remounted"
    );

    const fetchUser = async () => {
      try {
        await getCurrentUser();
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
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setShowDropdown(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  // Clear optimistic messages when switching chats
  useEffect(() => {
    setOptimisticMessages([]);
  }, [activeChat]);

  // Note: Optimistic messages are now handled via deduplication in useMemo above
  // No need for separate clearing logic that causes flickering

  if (loadingUser || isLoadingChats)
    return (
      <div className="min-h-screen flex items-center justify-center bg-icon-slate-white">
        <LottieSpinner size={180} />
      </div>
    );

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
            <h1 className="text-xl font-normal text-black font-righteous">
              Sohbetlerim
            </h1>
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
            {chats
              .filter((chat) => {
                // Filter out reflectionJournal type chats (check both chat.type and assistant type)
                if (chat.type === "reflectionJournal") return false;

                // Also check if the assistant itself is of reflectionJournal type
                // This requires checking the assistant data, but we can infer from assistantId or other properties
                const reflectionJournalAssistants = ["reflectionJournal"];
                if (
                  reflectionJournalAssistants.some(
                    (type) =>
                      chat.assistantId?.includes(type) ||
                      chat.title?.toLowerCase().includes("günlük") ||
                      chat.title?.toLowerCase().includes("journal") ||
                      chat.description?.toLowerCase().includes("günlük")
                  )
                )
                  return false;

                // Filter out specific chat types and assistant types
                const excludedTypes = [
                  "accountability",
                  "flashcard",
                  "boolean-tester",
                  "fill-in-blanks",
                ];
                if (excludedTypes.includes(chat.type || "")) return false;

                // Also check assistant type for the same excluded types
                if (
                  excludedTypes.some(
                    (type) =>
                      chat.assistantId?.includes(type) ||
                      chat.title?.toLowerCase().includes(type) ||
                      chat.description?.toLowerCase().includes(type)
                  )
                )
                  return false;

                return true;
              })
              .map((chat) => (
                <div
                  key={chat.id}
                  onClick={() => setActiveChat(chat.id)}
                  className={`p-4 rounded-lg cursor-pointer transition-colors ${
                    activeChat === chat.id
                      ? "bg-message-box-bg shadow-md border-b-4 border-primary"
                      : "bg-message-box-bg shadow-sm hover:shadow-md"
                  } ${chat.hasNewMessage ? "shadow-lg" : ""}`}
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-icon-slate-white rounded-lg flex items-center justify-center overflow-hidden">
                      {chat.icon && chat.icon.startsWith("http") ? (
                        <Image
                          src={chat.icon}
                          alt={chat.title}
                          width={40}
                          height={40}
                          className="object-cover rounded-lg"
                        />
                      ) : (
                        <span className="text-lg">{chat.icon || "💬"}</span>
                      )}
                    </div>
                    <div className="flex-1">
                      <h3 className="font-poppins font-semibold text-sm text-text-black">
                        {chat.title}
                      </h3>
                      <p className="font-poppins text-xs font-medium text-text-description-gray mt-1 line-clamp-2 overflow-hidden">
                        {chat.description}
                      </p>
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
      <div
        className="flex-1 flex flex-col"
        style={{
          backgroundImage: "url(/bg.svg)",
          backgroundSize: "cover",
          backgroundPosition: "center",
        }}
      >
        {/* Chat Header */}
        <div className="bg-app-bar-bg p-4 border-b border-message-box-border">
          <div className="flex items-center justify-between">
            <h2 className="text-neutral-900 text-base font-semibold font-poppins leading-snug">
              {activeChat
                ? chats.find((chat) => chat.id === activeChat)?.title ||
                  "Sohbet"
                : "Bir sohbet seçin"}
            </h2>
            <div className="flex items-center gap-2">
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
          {!activeChat ? (
            <div className="flex items-center justify-center h-full text-center">
              <div>
                <h3 className="text-lg font-medium text-text-black mb-2">
                  Bir sohbet seçin
                </h3>
                <p className="text-text-description-gray">
                  Mesajları görüntülemek için sol taraftan bir sohbet seçin
                </p>
              </div>
            </div>
          ) : isLoadingMessages ? (
            <div className="flex items-center justify-center h-full">
              <div className="text-center">
                <LottieSpinner size={120} />
                <p className="text-text-description-gray text-sm mt-3">
                  Mesajlar yükleniyor...
                </p>
              </div>
            </div>
          ) : messages.length === 0 ? (
            <div className="flex items-center justify-center h-full text-center">
              <div>
                <h3 className="text-lg font-medium text-text-black mb-2">
                  Henüz mesaj yok
                </h3>
                <p className="text-text-description-gray">
                  Bu sohbette henüz mesaj bulunmuyor
                </p>
              </div>
            </div>
          ) : (
            <div className="space-y-4 max-w-4xl mx-auto">
              {messages.map((message, index) => {
                const isUser =
                  message.sender === "user" || message.role === "user";
                return (
                  <div
                    key={message.id || `message-${index}`}
                    className={`${
                      isUser
                        ? "flex flex-col justify-center items-end pl-[300px] gap-2 w-full"
                        : "flex items-start gap-3"
                    }`}
                  >
                    {/* Avatar - Only show for AI messages */}
                    {!isUser && (
                      <div className="w-10 h-10 flex items-center justify-center flex-shrink-0 mt-1">
                        <Image
                          src="/up_face.svg"
                          alt="UP Face"
                          width={40}
                          height={40}
                          className="object-contain"
                        />
                      </div>
                    )}

                    {/* Message Content */}
                    <div
                      className={`${isUser ? "w-auto" : "flex-1 max-w-[80%]"}`}
                    >
                      <div
                        className={`p-4 ${
                          isUser
                            ? "bg-blue-600 rounded-tl-3xl rounded-tr-3xl rounded-bl-3xl shadow-[0px_4px_4px_0px_rgba(0,0,0,0.25)] text-white"
                            : "bg-white/55 border border-white/31 backdrop-blur rounded-tr-3xl rounded-bl-3xl rounded-br-3xl text-text-body-black"
                        }`}
                      >
                        <MessageRenderer
                          content={
                            message.content ||
                            message.text ||
                            (message as any).message ||
                            (message as any).body ||
                            "Mesaj içeriği yok"
                          }
                          sender={isUser ? "user" : "ai"}
                          messageType={message.type}
                        />
                      </div>

                      {/* Action buttons - Only for AI messages */}
                      {!isUser && (
                        <div className="flex items-center gap-2 mt-2 ml-2">
                          <button
                            onClick={() =>
                              handleLikeDislike(message.id, "like")
                            }
                            className="p-1.5 hover:bg-icon-slate-white rounded-full transition-colors"
                          >
                            {messageLikes[message.id] === "like" ? (
                              <Image
                                src="/liked.svg"
                                alt="Liked"
                                width={16}
                                height={16}
                                className="w-4 h-4"
                              />
                            ) : (
                              <ThumbsUp className="w-4 h-4 text-passive-icon" />
                            )}
                          </button>
                          <button
                            onClick={() =>
                              handleLikeDislike(message.id, "dislike")
                            }
                            className="p-1.5 hover:bg-icon-slate-white rounded-full transition-colors"
                          >
                            {messageLikes[message.id] === "dislike" ? (
                              <Image
                                src="/disliked.svg"
                                alt="Disliked"
                                width={16}
                                height={16}
                                className="w-4 h-4"
                              />
                            ) : (
                              <ThumbsDown className="w-4 h-4 text-passive-icon" />
                            )}
                          </button>
                          <button
                            onClick={() => {
                              const content =
                                message.content ||
                                message.text ||
                                (message as any).message ||
                                (message as any).body ||
                                "";
                              navigator.clipboard.writeText(content);
                              toast.success("Mesaj kopyalandı");
                            }}
                            className="p-1.5 hover:bg-icon-slate-white rounded-full transition-colors"
                          >
                            <Copy className="w-4 h-4 text-passive-icon" />
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
              <div ref={messagesEndRef} />
            </div>
          )}
        </div>

        {/* Message Input */}
        <div className="w-full bg-white/60 shadow-[0px_-5px_8px_0px_rgba(162,174,255,0.25)] outline outline-1 outline-offset-[-1px] outline-white/30 backdrop-blur-[6.30px] inline-flex flex-col justify-start items-start gap-2 p-4">
          <div className="self-stretch h-11 bg-white rounded-lg outline outline-1 outline-offset-[-1px] outline-neutral-200 flex flex-col justify-center items-start gap-1 overflow-hidden">
            <div className="self-stretch flex-1 px-4 py-2 bg-white rounded-[999px] shadow-[0px_2px_9px_0px_rgba(0,0,0,0.08)] inline-flex justify-between items-center overflow-hidden">
              <div className="flex justify-start items-center gap-2 flex-1">
                <input
                  type="text"
                  placeholder="Buraya yazabilirsin"
                  value={currentMessage}
                  onChange={(e) => setCurrentMessage(e.target.value)}
                  onKeyDown={handleKeyPress}
                  disabled={isSendingMessage || !activeChat}
                  className="flex-1 bg-transparent text-black text-sm font-medium font-poppins leading-tight focus:outline-none placeholder:text-neutral-400 disabled:opacity-50"
                />
              </div>
              <button
                onClick={handleSendMessage}
                disabled={
                  isSendingMessage || !activeChat || !currentMessage.trim()
                }
                className="w-4 h-4 relative overflow-hidden flex items-center justify-center disabled:opacity-50 hover:opacity-70 transition-opacity"
              >
                {isSendingMessage ? (
                  <div className="w-4 h-4 border border-neutral-500 border-t-transparent rounded-full animate-spin"></div>
                ) : (
                  <Send className="w-4 h-4 text-neutral-500" />
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
export default HomePage;
