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
  api,
} from "@/state/api";
import { useDispatch } from "react-redux";
import { ChatMessage } from "@/types/type";
import MessageRenderer from "@/components/messages/MessageRenderer";
import toast from "react-hot-toast";
import { v4 as uuidv4 } from "uuid";

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

// Helper function to check if a chat is reflection journal type
const isReflectionJournalChat = (chat: any): boolean => {
  return chat.type === "reflectionJournal";
};

function HomePage({}: Props) {
  const [loadingUser, setLoadingUser] = useState(true);
  const [currentMessage, setCurrentMessage] = useState("");
  const [activeChat, setActiveChat] = useState<string | null>(null);
  const [isTransitioningChat, setIsTransitioningChat] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const [isJournalMode, setIsJournalMode] = useState(true);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const [optimisticMessages, setOptimisticMessages] = useState<ChatMessage[]>(
    []
  );
  const [messageLikes, setMessageLikes] = useState<{
    [messageId: string]: "like" | "dislike" | null;
  }>({});
  const [isAiResponding, setIsAiResponding] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const dispatch = useDispatch();

  // Auto scroll to bottom function
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  const {
    data: chatsData = [],
    isLoading: isLoadingChats,
    error: chatsError,
  } = useGetChatsQuery();

  // Deduplicate chats by id and title
  const chats = useMemo(() => {
    const deduplicatedChats = chatsData.filter((chat, index, arr) => {
      // Keep first occurrence of each unique chat
      const firstIndex = arr.findIndex(
        (c) =>
          c.id === chat.id ||
          (c.title === chat.title && c.assistantId === chat.assistantId)
      );

      return firstIndex === index;
    });

    return deduplicatedChats;
  }, [chatsData]);
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

  // Smart message merging: replace optimistic messages with real ones when identifiers match
  const messages = useMemo(() => {
    const rawRealMessages = messagesData?.messages || [];

    // if (process.env.NODE_ENV === 'development') {
    //   console.log('[DEBUG] Raw messages from API:', rawRealMessages.map(m => ({
    //     id: m.id,
    //     identifier: m.identifier,
    //     role: m.role,
    //     content: m.content?.substring(0, 50)
    //   })));
    // }

    // Deduplicate real messages by identifier/id
    const realMessages = rawRealMessages.filter((msg, index, arr) => {
      const firstIndex = arr.findIndex(
        (m) =>
          (m.identifier && msg.identifier && m.identifier === msg.identifier) ||
          (m.id && msg.id && m.id === msg.id)
      );
      return firstIndex === index;
    });

    // Create a Set of real message identifiers for quick lookup
    const realMessageIdentifiers = new Set(
      realMessages.map((msg) => msg.identifier || msg.id).filter(Boolean)
    );

    // if (process.env.NODE_ENV === "development") {
    //   console.log(
    //     "[DEBUG] Deduplicated real messages:",
    //     realMessages.map((m) => ({
    //       id: m.id,
    //       identifier: m.identifier,
    //       role: m.role,
    //       content: m.content?.substring(0, 50),
    //     }))
    //   );

    //   console.log(
    //     "[DEBUG] Real message identifiers:",
    //     Array.from(realMessageIdentifiers)
    //   );
    // }

    // Filter optimistic messages: keep only those not yet saved to backend
    const pendingOptimisticMessages = optimisticMessages.filter((opt) => {
      const optIdentifier = opt.identifier || opt.id;
      const isAlreadySaved = realMessageIdentifiers.has(optIdentifier);

      // if (isAlreadySaved && process.env.NODE_ENV === "development") {
      //   console.log("[DEBUG] Optimistic message replaced by real message:", {
      //     identifier: optIdentifier,
      //     role: opt.role,
      //     content: opt.content?.substring(0, 30),
      //   });
      // }

      return !isAlreadySaved;
    });

    // Combine real messages with pending optimistic messages
    const finalMessages = [...realMessages, ...pendingOptimisticMessages];

    // Sort by creation time to maintain proper order
    finalMessages.sort((a, b) => {
      const timeA = new Date(a.createdAt || 0).getTime();
      const timeB = new Date(b.createdAt || 0).getTime();
      return timeA - timeB;
    });

    if (process.env.NODE_ENV === "development") {
      // console.log(
      //   "[DEBUG] Pending optimistic messages:",
      //   pendingOptimisticMessages.map((m) => ({
      //     id: m.id,
      //     identifier: m.identifier,
      //     role: m.role,
      //     content: m.content?.substring(0, 30),
      //   }))
      // );
      // console.log(
      //   "[DEBUG] Final merged messages:",
      //   finalMessages.map((m) => ({
      //     id: m.id,
      //     identifier: m.identifier,
      //     role: m.role,
      //     isOptimistic: pendingOptimisticMessages.includes(m),
      //     content: m.content?.substring(0, 30),
      //   }))
      // );
    }

    return finalMessages;
  }, [messagesData?.messages, optimisticMessages]);

  // Clear optimistic messages when switching chats
  useEffect(() => {
    setOptimisticMessages([]);
  }, [activeChat]);

  // Auto scroll when messages change
  useEffect(() => {
    scrollToBottom();
  }, [messages, optimisticMessages, isAiResponding]);

  // Load existing like statuses from backend messages
  useEffect(() => {
    if (messages.length > 0) {
      const newMessageLikes: {
        [messageId: string]: "like" | "dislike" | null;
      } = {};
      messages.forEach((message) => {
        const messageId = message.identifier || message.id;
        if (message.likeStatus === true || message.likeStatus === 1) {
          newMessageLikes[messageId] = "like";
        } else if (message.likeStatus === false || message.likeStatus === 0) {
          newMessageLikes[messageId] = "dislike";
        }
      });
      setMessageLikes((prev) => ({ ...prev, ...newMessageLikes }));
    }
  }, [messages]);

  const handleSignOut = async () => {
    try {
      console.log("🚪 Starting logout process...");

      // 1. Clear all RTK Query cache
      dispatch(api.util.resetApiState());
      console.log("✅ RTK Query cache cleared");

      // 2. Clear local component state
      setActiveChat(null);
      setCurrentMessage("");
      setOptimisticMessages([]);
      setMessageLikes({});
      setIsAiResponding(false);
      setIsJournalMode(true);
      setIsTransitioningChat(false);
      console.log("✅ Local state cleared");

      // 3. Sign out from Amplify
      await signOut();
      console.log("✅ Amplify signout completed");

      setShowDropdown(false);

      // 4. Optional: Clear any browser storage
      try {
        localStorage.clear();
        sessionStorage.clear();
        console.log("✅ Browser storage cleared");
      } catch (storageError) {
        console.warn("⚠️ Could not clear storage:", storageError);
      }

      console.log("🎉 Logout completed successfully");
    } catch (error) {
      console.error("❌ Error during logout:", error);
      toast.error("Çıkış yapılırken bir hata oluştu");
    }
  };

  const handleSendMessageWithText = async (messageText: string) => {
    // Set the message and then call the existing handleSendMessage logic
    setCurrentMessage(messageText);
    // Use a small delay to ensure state is updated before calling handleSendMessage
    setTimeout(() => {
      handleSendMessage();
    }, 50);
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

    // Generate UUIDs for messages
    const userMessageId = uuidv4();
    const aiMessageId = uuidv4();

    // Add optimistic user message immediately
    const userMessage: ChatMessage = {
      id: userMessageId,
      identifier: userMessageId,
      text: messageText,
      content: messageText,
      sender: "user",
      role: "user", // Always use 'user' role for journal messages
      createdAt: timestamp,
      assistantId: currentActiveChat.assistantId,
    };

    // Journal mode - use reflection stream endpoint
    if (isReflectionJournalChat(currentActiveChat) && isJournalMode) {
      setCurrentMessage("");
      setIsAiResponding(true);

      // Add optimistic user message immediately
      setOptimisticMessages((prev) => [...prev, userMessage]);

      try {
        console.log("🌊 Streaming journal reflection...");

        const user = await getCurrentUser();
        console.log("[JOURNAL STREAM] 🔍 Debug info:", {
          userId: user.userId,
          activeChat,
          assistantId: currentActiveChat.assistantId,
        });

        // Use local API endpoint for reflection stream
        const reflectionStreamUrl = `/api/chats/${activeChat}/reflection`;
        console.log("[JOURNAL STREAM] 🌐 Stream URL:", reflectionStreamUrl);

        const session = await fetchAuthSession();
        const { accessToken, idToken } = session.tokens ?? {};

        const response = await fetch(reflectionStreamUrl, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${accessToken}`,
            "x-id-token": idToken?.toString() || "",
            "x-user-id": user.userId,
          },
          body: JSON.stringify({
            query: messageText,
            assistantId: currentActiveChat.assistantId,
          }),
        });

        if (!response.ok) {
          console.error("[JOURNAL STREAM] ❌ HTTP Error:", {
            status: response.status,
            statusText: response.statusText,
            url: reflectionStreamUrl,
          });
          throw new Error(
            `HTTP error! status: ${response.status} - ${response.statusText}`
          );
        }

        if (!response.body) {
          throw new Error("No response body for streaming");
        }

        // Add optimistic AI message immediately
        let aiMessage: ChatMessage = {
          id: aiMessageId,
          identifier: aiMessageId,
          text: "",
          content: "",
          sender: "ai",
          role: "assistant",
          createdAt: timestamp,
          assistantId: currentActiveChat.assistantId,
          type: "reflection",
        };

        setOptimisticMessages([userMessage, aiMessage]);

        // Stream processing
        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let buffer = "";

        console.log("[JOURNAL STREAM] 🌊 Starting stream processing...");

        try {
          while (true) {
            const { done, value } = await reader.read();

            if (done) break;

            const chunk = decoder.decode(value, { stream: true });

            // Process chunk and accumulate in buffer
            buffer += chunk.replace("[DONE-UP]", "");
            const isDone = chunk.includes("[DONE-UP]");

            console.log(
              "[JOURNAL STREAM] 📝 Chunk processed, buffer length:",
              buffer.length
            );

            // Update AI message with accumulated buffer content
            aiMessage = {
              ...aiMessage,
              text: buffer,
              content: buffer,
            };

            // Real-time UI update
            setOptimisticMessages([userMessage, aiMessage]);

            if (isDone) {
              console.log("[JOURNAL STREAM] ✅ Stream completed");
              break;
            }
          }
        } catch (streamError) {
          console.error("[JOURNAL STREAM] ❌ Streaming error:", streamError);
          throw streamError;
        }

        // Save conversation after successful streaming
        const aiResponseContent = buffer;

        console.log(
          "[JOURNAL STREAM] 💾 Saving conversation after streaming...",
          {
            aiResponseLength: aiResponseContent.length,
            userMessage: messageText.substring(0, 50),
          }
        );

        // Save journal conversation using conversation save
        const saveResult = await saveConversation({
          chatId: activeChat,
          messages: [userMessage, aiMessage],
          assistantId: currentActiveChat.assistantId,
          assistantGroupId: currentActiveChat.assistantGroupId,
          type: "journal",
          userId: user.userId,
          localDateTime: timestamp,
          title: currentActiveChat.title,
          lastMessage:
            aiResponseContent.substring(0, 100) +
            (aiResponseContent.length > 100 ? "..." : ""),
          conversationId: activeChat,
        });

        setTimeout(scrollToBottom, 100);
        console.log("✅ Journal message saved successfully", saveResult);

        // Keep the optimistic message visible for a bit longer to ensure user sees it
        setTimeout(() => {
          console.log(
            "🔄 Journal save complete, message should persist via deduplication"
          );
        }, 2000);
      } catch (error) {
        console.error("❌ Error in journal stream:", error);
        toast.error("Günlük yansıtması başarısız oldu");

        // Remove optimistic messages on error
        setOptimisticMessages((prev) =>
          prev.filter(
            (msg) => msg.id !== userMessageId && msg.id !== aiMessageId
          )
        );
      } finally {
        setIsAiResponding(false);
      }
      return; // Early return - no AI response
    }

    // Add typing indicator for AI response (normal mode only)
    const typingMessage: ChatMessage = {
      id: aiMessageId,
      identifier: aiMessageId,
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
      let response;

      if (isReflectionJournalChat(currentActiveChat)) {
        // Reflection journal uses local API endpoint
        response = await fetch(`/api/chats/${activeChat}/reflection`, {
          method: "POST",
          headers: {
            ...headers,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            query: messageText,
            assistantId: currentActiveChat.assistantId,
          }),
        });
      } else {
        // Regular chats use local API
        response = await fetch(`/api/chats/${activeChat}/send`, {
          method: "POST",
          headers,
          body: JSON.stringify({
            message: messageText,
            assistantId: currentActiveChat.assistantId,
          }),
        });
      }

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      // Handle streaming response
      const reader = response.body?.getReader();
      const decoder = new TextDecoder();
      let aiResponseContent = "";

      if (reader) {
        let aiMessage: ChatMessage = {
          id: aiMessageId,
          identifier: aiMessageId,
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

          // Prepare ONLY the new messages (user + AI response) with same UUIDs
          const newUserMessage: ChatMessage = {
            id: userMessageId,
            identifier: userMessageId,
            text: messageText,
            content: messageText,
            role: "user",
            sender: "user",
            createdAt: timestamp,
            assistantId: currentActiveChat.assistantId,
            type: "default",
          };

          const newAiMessage: ChatMessage = {
            id: aiMessageId,
            identifier: aiMessageId,
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

          console.log(
            "[MESSAGE STREAM TEST] 💾 Sending messages to save with IDs:",
            messagesToSave.map((m) => ({
              id: m.id,
              identifier: m.identifier,
              role: m.role,
              content: m.content?.substring(0, 50),
            }))
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
              // Send both id and identifier to backend
              id: msg.id,
              identifier: msg.identifier,
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

            // RTK Query will automatically refetch and merge with optimistic messages
            console.log(
              "[MESSAGE STREAM TEST] 🔄 RTK Query will refetch and seamlessly replace optimistic messages"
            );

            // Optimistic messages will be replaced by real messages when they arrive
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

  const handleToggleUp = async () => {
    if (!activeChat) return;

    // Only work in reflection journal chats
    const currentChat = chats.find((chat) => chat.id === activeChat);
    if (!currentChat || !isReflectionJournalChat(currentChat)) return;

    try {
      const newJournalMode = !isJournalMode;
      const timestamp = new Date().toISOString();

      if (newJournalMode) {
        // Switching TO journal mode - add opening ayrac and date
        const openAyracWidget = {
          id: `ayrac-open-${Date.now()}`,
          identifier: `ayrac-open-${Date.now()}`,
          content: JSON.stringify({
            widgetType: "Ayrac",
            isOpen: true,
          }),
          role: "user" as const,
          type: "widget" as const,
          createdAt: timestamp,
          sender: "user" as const,
        };

        const currentDate = new Date().toLocaleDateString("tr-TR", {
          day: "2-digit",
          month: "2-digit",
          year: "numeric",
        });

        const dateWidget = {
          id: `date-${Date.now()}`,
          identifier: `date-${Date.now()}`,
          content: JSON.stringify({
            widgetType: "JournalDate",
            date: currentDate,
          }),
          role: "user" as const,
          type: "widget" as const,
          createdAt: timestamp,
          sender: "user" as const,
        };

        setOptimisticMessages((prev) => [...prev, openAyracWidget, dateWidget]);
      } else {
        // Switching OUT of journal mode - add closing ayrac
        const closeAyracWidget = {
          id: `ayrac-close-${Date.now()}`,
          identifier: `ayrac-close-${Date.now()}`,
          content: JSON.stringify({
            widgetType: "Ayrac",
            isOpen: false,
          }),
          role: "user" as const,
          type: "widget" as const,
          createdAt: timestamp,
          sender: "user" as const,
        };

        setOptimisticMessages((prev) => [...prev, closeAyracWidget]);
      }

      // Toggle the journal mode
      setIsJournalMode(newJournalMode);

      // Scroll to bottom to show new widgets
      setTimeout(scrollToBottom, 100);
    } catch (error) {
      console.error("Error toggling UP mode:", error);
      toast.error("Bir hata oluştu");
    }
  };

  const handleLikeDislike = useCallback(
    async (messageId: string, type: "like" | "dislike", messageObj?: any) => {
      try {
        console.log("Rating messageId:", messageId, "type:", type);
        console.log("Message object received:", messageObj);

        // Use identifier or id for backend API call
        const backendMessageId = messageObj?.identifier || messageObj?.id;
        console.log("Backend messageId:", backendMessageId);

        // Skip rating if no valid backend ID
        if (!backendMessageId) {
          console.log("No backend messageId available:", backendMessageId);
          toast.error("Mesaj ID'si bulunamadı");
          return;
        }

        // Use the conversationId from the message object, or fall back to activeChat
        const conversationId = messageObj?.conversationId || activeChat;
        console.log("Using conversationId:", conversationId);

        if (!conversationId) {
          console.error("No conversationId available");
          return;
        }

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
            `${process.env.NEXT_PUBLIC_BASE_URL}/api/messages/${backendMessageId}/rate`,
            {
              method: "POST",
              headers: {
                Authorization: `Bearer ${accessToken}`,
                "x-id-token": idToken.toString(),
                "x-user-id": user.userId,
                "Content-Type": "application/json",
              },
              body: JSON.stringify({
                conversationId: conversationId,
                rating:
                  newStatus === "like"
                    ? true
                    : newStatus === "dislike"
                      ? false
                      : null,
                isRemoveAction: newStatus === null,
              }),
            }
          );

          if (!response.ok) {
            const errorData = await response.text();
            console.error("Rating API error:", errorData);
            // Revert on error
            setMessageLikes((prev) => ({
              ...prev,
              [messageId]: currentStatus,
            }));
            toast.error("Rating kaydedilemedi");
          } else {
            if (newStatus === "like") {
              toast.success("Beğenildi", { icon: "👍" });
            } else if (newStatus === "dislike") {
              toast.success("Beğenilmedi", { icon: "👎" });
            } else {
              toast.success("Rating kaldırıldı");
            }
          }
        }
      } catch (error) {
        console.error("Error rating message:", error);
        toast.error("Rating kaydedilemedi");
      }
    },
    [messageLikes, activeChat]
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
    setIsJournalMode(true); // Default to journal mode
  }, [activeChat]);

  // Check for closed ayrac widget and disable journal mode when messages are loaded
  useEffect(() => {
    if (activeChat && messages.length > 0 && !isLoadingMessages) {
      const hasClosedAyrac = messages.some((msg) => {
        try {
          if (msg.content && msg.type === "ayrac-widget") {
            const data = JSON.parse(msg.content);
            return data.isOpen === false;
          }
        } catch (e) {
          // Ignore parsing errors
        }
        return false;
      });

      // Disable journal mode if there's a closed ayrac
      if (hasClosedAyrac) {
        setIsJournalMode(false);
      }
    }
  }, [activeChat, messages, isLoadingMessages]);

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
                // Filter out specific chat types and assistant types (keep non-journal filtering)
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
              .map((chat) => {
                const isActive = activeChat === chat.id;

                return (
                  <div
                    key={`chat-${chat.id}-${isActive ? "active" : "inactive"}`}
                    onClick={() => {
                      if (activeChat !== chat.id) {
                        setIsTransitioningChat(true);
                        setActiveChat(chat.id);
                        // Defer clearing optimistic messages to avoid blocking UI
                        setTimeout(() => {
                          setOptimisticMessages([]);
                          setIsTransitioningChat(false);
                        }, 100);
                      }
                    }}
                    className={`p-4 rounded-lg cursor-pointer transition-all duration-200 ease-in-out ${
                      isActive
                        ? "bg-message-box-bg shadow-md border-b-4 border-primary transform"
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
                );
              })}
          </div>
        </div>
      </div>

      {/* Main Chat Area */}
      <div
        className="flex-1 flex flex-col relative"
        style={{
          backgroundImage:
            activeChat &&
            chats.find((chat) => chat.id === activeChat) &&
            isReflectionJournalChat(
              chats.find((chat) => chat.id === activeChat)!
            )
              ? "url(/journal/journal-bg.png)"
              : "url(/bg.png)",
          backgroundSize: "cover",
          backgroundPosition: "center",
          backgroundRepeat: "no-repeat",
        }}
      >
        <div className="absolute inset-0 bg-white opacity-50"></div>
        <div className="relative z-10 flex flex-col h-full">
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
                          Çıkış Yap
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Messages Area */}
          <div className="flex-1 overflow-y-auto p-6 transition-opacity duration-300 ease-in-out">
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
            ) : isLoadingMessages || isTransitioningChat ? (
              <div className="flex items-center justify-center h-full">
                <div className="text-center">
                  <LottieSpinner size={120} />
                  <p className="text-text-description-gray text-sm mt-3">
                    {isTransitioningChat
                      ? "Sohbet değiştiriliyor..."
                      : "Mesajlar yükleniyor..."}
                  </p>
                </div>
              </div>
            ) : messages.length === 0 ? (
              <div className="flex items-center justify-center h-full text-center">
                <div>
                  {activeChat &&
                  chats.find((chat) => chat.id === activeChat) &&
                  isReflectionJournalChat(
                    chats.find((chat) => chat.id === activeChat)!
                  ) ? (
                    /* Journal Empty State */
                    <>
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
                    </>
                  ) : (
                    /* Regular Empty State */
                    <>
                      <h3 className="text-lg font-medium text-text-black mb-2">
                        Henüz mesaj yok
                      </h3>
                      <p className="text-text-description-gray">
                        Bu sohbette henüz mesaj bulunmuyor
                      </p>
                    </>
                  )}
                </div>
              </div>
            ) : (
              <div className="space-y-4 max-w-4xl mx-auto">
                {messages.map((message, index) => {
                  // Console log for debugging
                  console.log(`[MESSAGE DEBUG] Index ${index}:`, {
                    role: message.role,
                    content: message.content?.substring(0, 100),
                    sender: message.sender,
                    type: message.type,
                  });

                  const isUser =
                    message.sender === "user" ||
                    message.role === "user" ||
                    message.role === "journal";
                  // Generate unique key using multiple identifiers
                  const messageKey =
                    message.id ||
                    message.identifier ||
                    `${message.role}-${index}-${message.content?.substring(0, 50) || "no-content"}-${message.createdAt}`;

                  // if (process.env.NODE_ENV === "development") {
                  //   console.log(`[DEBUG] Message ${index} key:`, messageKey, {
                  //     id: message.id,
                  //     identifier: message.identifier,
                  //     role: message.role,
                  //     content: message.content?.substring(0, 30),
                  //   });
                  // }

                  // Check if this is an Ayrac or JournalDate widget that should be rendered centered
                  const isAyracWidget =
                    message.type === "widget" &&
                    (message.content?.includes('"widgetType":"Ayrac"') ||
                      message.content?.includes('"widgetType": "Ayrac"'));

                  const isJournalDateWidget =
                    message.type === "widget" &&
                    (message.content?.includes('"widgetType":"JournalDate"') ||
                      message.content?.includes('"widgetType": "JournalDate"'));

                  if (isAyracWidget || isJournalDateWidget) {
                    // Render Ayrac/JournalDate widget centered without bubble - use viewport width to break out completely
                    return (
                      <div
                        key={messageKey}
                        className="animate-in fade-in slide-in-from-bottom-2 duration-300 py-4 relative"
                        style={{
                          width: "100vw",
                          marginLeft: "calc(-50vw + 50%)",
                          marginRight: "calc(-50vw + 50%)",
                        }}
                      >
                        <div className="flex justify-center w-full">
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
                            role={message.role}
                          />
                        </div>
                      </div>
                    );
                  }

                  return (
                    <div
                      key={messageKey}
                      className={`animate-in fade-in slide-in-from-bottom-2 duration-300 ${
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
                          className={`${
                            // Check if this is a journal chat and message type to apply different styling
                            (() => {
                              // Message styling based on role only
                              if (message.role === "user") {
                                // User messages: blue background, white text
                                return "p-4 bg-blue-600 rounded-tl-3xl rounded-tr-3xl rounded-bl-3xl shadow-[0px_4px_4px_0px_rgba(0,0,0,0.25)] !text-white";
                              } else if (message.role === "journal") {
                                // Journal messages: yellowish background, black text
                                return "p-4 bg-[#FFF1E6] rounded-tl-3xl rounded-tr-3xl rounded-bl-3xl shadow-[0px_4px_4px_0px_rgba(0,0,0,0.25)] !text-black border border-[#FED7AA]";
                              } else if (message.role === "assistant") {
                                // Assistant messages: whitish background, black text
                                return "p-4 bg-white/55 border border-white/31 backdrop-blur rounded-tr-3xl rounded-bl-3xl rounded-br-3xl !text-black";
                              } else {
                                // Default fallback
                                return "p-4 bg-white/55 border border-white/31 backdrop-blur rounded-tr-3xl rounded-bl-3xl rounded-br-3xl text-slate-900";
                              }
                            })()
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
                            role={message.role}
                          />
                        </div>

                        {/* Action buttons - Only for AI messages but not widgets */}
                        {!isUser && message.type !== "widget" && (
                          <div className="flex items-center gap-2 mt-2 ml-2">
                            <button
                              onClick={() => {
                                handleLikeDislike(
                                  message.identifier || message.id,
                                  "like",
                                  message
                                );
                              }}
                              className="p-1.5 hover:bg-icon-slate-white rounded-full transition-colors"
                            >
                              {messageLikes[
                                message.identifier || message.id
                              ] === "like" ? (
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
                              onClick={() => {
                                handleLikeDislike(
                                  message.identifier || message.id,
                                  "dislike",
                                  message
                                );
                              }}
                              className="p-1.5 hover:bg-icon-slate-white rounded-full transition-colors"
                            >
                              {messageLikes[
                                message.identifier || message.id
                              ] === "dislike" ? (
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

          {/* Journal Action Buttons - Floating on the right */}
          {activeChat &&
            chats.find((chat) => chat.id === activeChat) &&
            isReflectionJournalChat(
              chats.find((chat) => chat.id === activeChat)!
            ) &&
            !isJournalMode && (
              <div className="fixed right-8 bottom-32 flex flex-col gap-3 z-10">
                <button
                  onClick={async () => {
                    if (isSendingMessage || !activeChat) return;
                    const message = "Konuları özetle";
                    setCurrentMessage(message);
                    // Send message immediately
                    await handleSendMessageWithText(message);
                  }}
                  disabled={isSendingMessage}
                  data-property-1="Desktop"
                  className="px-3 py-2 bg-white/60 rounded-tl-2xl rounded-tr-2xl rounded-bl-2xl outline outline-1 outline-offset-[-1px] outline-violet-700 backdrop-blur-sm inline-flex justify-start items-center gap-2 hover:bg-white/70 transition-all duration-200 disabled:opacity-50"
                >
                  <div className="w-5 h-5 relative overflow-hidden flex items-center justify-center">
                    <span className="text-amber-500 text-sm">✨</span>
                  </div>
                  <div className="justify-start text-zinc-800 text-base font-medium font-poppins leading-snug">
                    Konuları Özetle
                  </div>
                </button>

                <button
                  onClick={async () => {
                    if (isSendingMessage || !activeChat) return;
                    const message = "Yazılanları maddelendir";
                    setCurrentMessage(message);
                    // Send message immediately
                    await handleSendMessageWithText(message);
                  }}
                  disabled={isSendingMessage}
                  data-property-1="Desktop"
                  className="px-3 py-2 bg-white/60 rounded-tl-2xl rounded-tr-2xl rounded-bl-2xl outline outline-1 outline-offset-[-1px] outline-violet-700 backdrop-blur-sm inline-flex justify-start items-center gap-2 hover:bg-white/70 transition-all duration-200 disabled:opacity-50"
                >
                  <div className="w-5 h-5 relative overflow-hidden flex items-center justify-center">
                    <span className="text-amber-500 text-sm">✨</span>
                  </div>
                  <div className="justify-start text-zinc-800 text-base font-medium font-poppins leading-snug">
                    Yazılanları Maddelendir
                  </div>
                </button>

                <button
                  onClick={async () => {
                    if (isSendingMessage || !activeChat) return;
                    const message = "Biraz motivasyon";
                    setCurrentMessage(message);
                    // Send message immediately
                    await handleSendMessageWithText(message);
                  }}
                  disabled={isSendingMessage}
                  data-property-1="Desktop"
                  className="px-3 py-2 bg-white/60 rounded-tl-2xl rounded-tr-2xl rounded-bl-2xl outline outline-1 outline-offset-[-1px] outline-violet-700 backdrop-blur-sm inline-flex justify-start items-center gap-2 hover:bg-white/70 transition-all duration-200 disabled:opacity-50"
                >
                  <div className="w-5 h-5 relative overflow-hidden flex items-center justify-center">
                    <span className="text-amber-500 text-sm">✨</span>
                  </div>
                  <div className="justify-start text-zinc-800 text-base font-medium font-poppins leading-snug">
                    Biraz Motivasyon
                  </div>
                </button>

                <button
                  onClick={handleToggleUp}
                  disabled={isSendingMessage}
                  data-property-1="Desktop"
                  className="px-3 py-2 bg-white/60 rounded-tl-2xl rounded-tr-2xl rounded-bl-2xl outline outline-1 outline-offset-[-1px] outline-violet-700 backdrop-blur-sm inline-flex justify-start items-center gap-2 hover:bg-white/70 transition-all duration-200 disabled:opacity-50"
                >
                  <div className="w-5 h-5 relative overflow-hidden flex items-center justify-center">
                    <Image
                      src="/images/star.svg"
                      alt="Star"
                      width={16}
                      height={16}
                      className="object-contain"
                    />
                  </div>
                  <div className="justify-start text-zinc-800 text-base font-medium font-poppins leading-snug">
                    Çekilebilirsin UP
                  </div>
                </button>
              </div>
            )}

          {/* Message Input */}
          {activeChat &&
          chats.find((chat) => chat.id === activeChat) &&
          isReflectionJournalChat(
            chats.find((chat) => chat.id === activeChat)!
          ) ? (
            /* Journal Style Input */
            <div className="px-8 pb-6">
              <div className="max-w-4xl mx-auto">
                <div
                  data-property-1="journel"
                  className="w-full p-4 bg-white/60 shadow-[0px_-5px_8px_0px_rgba(239,193,179,0.30)] outline outline-1 outline-offset-[-1px] outline-white/30 backdrop-blur-[6.30px] inline-flex justify-start items-center gap-4 rounded-2xl"
                >
                  <div
                    data-property-1="günlük"
                    className="w-11 h-11 relative flex-shrink-0 cursor-pointer hover:opacity-70 transition-opacity"
                    onClick={handleToggleUp}
                  >
                    <Image
                      src={
                        isJournalMode
                          ? "/journal/up_no_look.svg"
                          : "/up_face.svg"
                      }
                      alt={isJournalMode ? "Journal Mode" : "UP Face"}
                      width={44}
                      height={44}
                      className="object-contain"
                    />
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
                          value={currentMessage}
                          onChange={(e) => setCurrentMessage(e.target.value)}
                          onKeyDown={handleKeyPress}
                          placeholder="Buraya yazabilirsin"
                          disabled={isSendingMessage || !activeChat}
                          className="flex-1 bg-transparent text-sm font-medium font-poppins leading-tight text-neutral-800 placeholder:text-neutral-400 border-none outline-none disabled:opacity-50"
                        />
                      </div>

                      <button
                        onClick={handleSendMessage}
                        disabled={
                          isSendingMessage ||
                          !activeChat ||
                          !currentMessage.trim()
                        }
                        className="w-4 h-4 relative overflow-hidden flex-shrink-0 disabled:opacity-50 hover:opacity-70 transition-opacity flex items-center justify-center"
                      >
                        {isSendingMessage ? (
                          <div className="w-3 h-3 border border-neutral-800 border-t-transparent rounded-full animate-spin" />
                        ) : (
                          <Image
                            src="/journal/tuy.svg"
                            alt="Send"
                            width={16}
                            height={16}
                            className="object-contain"
                          />
                        )}
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            /* Regular Input */
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
          )}
        </div>
      </div>
    </div>
  );
}
export default HomePage;
