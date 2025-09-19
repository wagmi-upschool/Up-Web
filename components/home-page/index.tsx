"use client";

import { getCurrentUser, signOut, fetchAuthSession } from "aws-amplify/auth";
import { useEffect, useState, useRef, useMemo, useCallback } from "react";
import { useRouter } from "next/navigation";
import LottieSpinner from "../global/loader/lottie-spinner";
import {
  Send,
  ThumbsUp,
  ThumbsDown,
  Copy,
  MoreHorizontal,
  LogOut,
  BarChart3,
  ClipboardList,
  Trophy,
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

// Helper function to format date for journal (DD.MM.YYYY)
const formatJournalDate = (date?: Date | string): string => {
  const d = date ? new Date(date) : new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");

  return `${day}.${month}.${year}`;
};

// Helper function to check if a chat is reflection journal type
const isReflectionJournalChat = (chat: any): boolean => {
  // Primary check: type field
  if (chat.type === "reflectionJournal") {
    return true;
  }

  // Fallback check: assistant group ID for reflection journals
  // Based on console logs, reflection journal chats use assistantGroupId: f2b835b2-139a-4ea4-a9a0-930d6baded6a
  if (chat.assistantGroupId === "f2b835b2-139a-4ea4-a9a0-930d6baded6a") {
    return true;
  }

  // Additional fallback: check title patterns for journal chats
  const journalPatterns = ["Günlüğü", "Notlarım", "Journal", "Günlük"];
  if (
    chat.title &&
    journalPatterns.some((pattern) => chat.title.includes(pattern))
  ) {
    return true;
  }

  return false;
};

function HomePage({}: Props) {
  const router = useRouter();
  const [loadingUser, setLoadingUser] = useState(true);
  const [currentMessage, setCurrentMessage] = useState("");
  const [activeChat, setActiveChat] = useState<string | null>(null);
  const [isTransitioningChat, setIsTransitioningChat] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const [isJournalMode, setIsJournalMode] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const [optimisticMessages, setOptimisticMessages] = useState<ChatMessage[]>(
    []
  );
  const [widgetsSavedForChats, setWidgetsSavedForChats] = useState<Set<string>>(
    new Set()
  );
  const [messageLikes, setMessageLikes] = useState<{
    [messageId: string]: "like" | "dislike" | null;
  }>({});
  const [isAiResponding, setIsAiResponding] = useState(false);
  const [isMessageInserting, setIsMessageInserting] = useState(false);
  const [showMixpanelOption, setShowMixpanelOption] = useState(false);
  const [mixpanelDashboardUrl, setMixpanelDashboardUrl] = useState<
    string | null
  >(null);
  const [showQuizAccess, setShowQuizAccess] = useState(false);
  const [quizData, setQuizData] = useState<{
    testId: string;
    groupName: string;
  } | null>(null);
  const [isQuizCompleted, setIsQuizCompleted] = useState(false);
  const [isCheckingQuizCompletion, setIsCheckingQuizCompletion] = useState(false);
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
  const [sendChatMessage, { isLoading: isSendingMessage }] =
    useSendChatMessageMutation();
  const [saveConversation, { isLoading: isSavingConversation }] =
    useSaveConversationMutation();

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

  // Check Quiz access for current user
  const checkQuizAccess = async () => {
    try {
      const user = await getCurrentUser();
      const userEmail = user?.signInDetails?.loginId;

      if (!userEmail) {
        console.warn("No user email found");
        return;
      }

      // Get user's custom attributes
      const { fetchUserAttributes } = await import('aws-amplify/auth');
      const userAttributes = await fetchUserAttributes();

      // Extract groupName from custom attributes
      let userGroupName = userAttributes['custom:groupName'] || null;

      console.log("User attributes:", { userEmail, userGroupName });

      // Get access token for API auth
      const session = await fetchAuthSession();
      const { accessToken } = session.tokens ?? {};

      if (!accessToken) {
        console.warn("No access token found");
        return;
      }

      // Check quiz access via API
      const queryParams = new URLSearchParams({
        email: userEmail,
      });

      if (userGroupName) {
        queryParams.append("groupName", userGroupName);
      }

      const response = await fetch(
        `/api/quiz/access?${queryParams.toString()}`,
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
            "Content-Type": "application/json",
          },
        }
      );

      if (response.ok) {
        const data = await response.json();

        if (data.hasAccess) {
          console.log("✅ User has quiz access:", data);
          setShowQuizAccess(true);
          setQuizData({
            testId: data.testId,
            groupName: data.groupName,
          });

          // Check quiz completion after confirming access
          // await checkQuizCompletion(data.testId); // Disabled for now
        } else {
          console.log("❌ User does not have quiz access");
          setShowQuizAccess(false);
        }
      } else {
        console.error("Failed to check quiz access:", response.status);
      }
    } catch (error) {
      console.error("Error checking quiz access:", error);
    }
  };

  // Check if user has completed the quiz
  const checkQuizCompletion = async (assistantId: string) => {
    if (!assistantId) {
      console.warn("No assistantId provided for quiz completion check");
      return;
    }

    setIsCheckingQuizCompletion(true);

    try {
      const session = await fetchAuthSession();
      const { accessToken, idToken } = session.tokens ?? {};
      const user = await getCurrentUser();

      if (!accessToken || !user.userId) {
        console.warn("No access token or user ID found");
        return;
      }

      const headers: Record<string, string> = {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
        'x-user-id': user.userId,
      };

      if (idToken) {
        headers['x-id-token'] = idToken.toString();
      }

      const response = await fetch(
        `/api/quiz/completion?assistantId=${assistantId}`,
        {
          headers,
        }
      );

      if (response.ok) {
        const data = await response.json();
        console.log("📊 Quiz completion status:", data);

        setIsQuizCompleted(data.isCompleted);

        if (data.isCompleted) {
          console.log("🎉 User has completed the quiz - hiding quiz buttons");
        } else {
          console.log("📝 User has not completed the quiz - showing quiz buttons");
        }
      } else {
        console.error("Failed to check quiz completion:", response.status);
        // On error, assume not completed (show quiz buttons)
        setIsQuizCompleted(false);
      }
    } catch (error) {
      console.error("Error checking quiz completion:", error);
      // On error, assume not completed (show quiz buttons)
      setIsQuizCompleted(false);
    } finally {
      setIsCheckingQuizCompletion(false);
    }
  };

  // Check Mixpanel configuration for current user
  const checkMixpanelConfiguration = async () => {
    try {
      const user = await getCurrentUser();
      const userEmail = user?.signInDetails?.loginId;

      if (!userEmail) {
        console.log("No user email found, skipping Mixpanel check");
        return;
      }

      const session = await fetchAuthSession();
      const { accessToken } = session.tokens ?? {};

      if (accessToken) {
        const response = await fetch(
          `/api/mixpanel/config?email=${encodeURIComponent(userEmail)}`,
          {
            headers: {
              Authorization: `Bearer ${accessToken}`,
              "Content-Type": "application/json",
            },
          }
        );

        if (response.ok) {
          const config = await response.json();
          console.log("Mixpanel config response:", config);

          if (config.enabled && config.dashboardUrl) {
            setShowMixpanelOption(true);
            setMixpanelDashboardUrl(config.dashboardUrl);
            console.log("✅ Mixpanel dashboard access granted for:", userEmail);
          } else {
            console.log("❌ No Mixpanel dashboard access for:", userEmail);
          }
        } else {
          console.log("Mixpanel config request failed:", response.status);
        }
      }
    } catch (error) {
      console.log("Mixpanel configuration check failed:", error);
      // Silently fail - this is not critical functionality
    }
  };

  const handleCompanyReport = () => {
    if (mixpanelDashboardUrl) {
      // Open Mixpanel dashboard in new tab
      window.open(mixpanelDashboardUrl, "_blank", "noopener,noreferrer");
      setShowDropdown(false);
    } else {
      toast.error("Dashboard URL bulunamadı");
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
      role:
        isReflectionJournalChat(currentActiveChat) && isJournalMode
          ? "journal"
          : "user",
      createdAt: timestamp,
      assistantId: currentActiveChat.assistantId || "",
    };

    // Journal mode - ONLY user message, NO AI response
    if (isReflectionJournalChat(currentActiveChat) && isJournalMode) {
      setCurrentMessage("");
      setIsMessageInserting(true);

      // Add ONLY user message to optimistic messages
      setOptimisticMessages((prev) => [...prev, userMessage]);

      try {
        console.log(
          "📝 Journal mode: Saving user message only, no AI response"
        );

        const user = await getCurrentUser();

        // ONLY save user message via conversation save (NO AI response)
        const saveResult = await saveConversation({
          chatId: activeChat,
          messages: [userMessage],
          assistantId: currentActiveChat.assistantId || "",
          assistantGroupId: currentActiveChat.assistantGroupId,
          type: "journal",
          userId: user.userId,
          localDateTime: timestamp,
          title: currentActiveChat.title,
          lastMessage:
            messageText.substring(0, 100) +
            (messageText.length > 100 ? "..." : ""),
          conversationId: activeChat,
        });

        setTimeout(scrollToBottom, 100);
        console.log("✅ Journal entry saved successfully", saveResult);
        setIsMessageInserting(false);
      } catch (error) {
        console.error("❌ Error saving journal entry:", error);
        toast.error("Günlük kaydı başarısız oldu");

        // Remove optimistic user message on error
        setOptimisticMessages((prev) =>
          prev.filter((msg) => msg.id !== userMessageId)
        );
        setIsMessageInserting(false);
      }
      return; // Early return
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
      assistantId: currentActiveChat.assistantId || "",
      type: "typing",
    };

    setOptimisticMessages([userMessage, typingMessage]);
    setCurrentMessage(""); // Clear input immediately
    setIsAiResponding(true);
    setIsMessageInserting(true);

    try {
      console.log(
        "[NORMAL MODE] 🚀 Sending message (both message request + conversation save):",
        {
          chatId: activeChat,
          message: messageText,
          assistantId: currentActiveChat.assistantId || "",
        }
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

      // Normal mode: BOTH message request AND conversation save
      // Step 1: Send message request (using RTK Query)
      console.log(
        "[NORMAL MODE] 📤 Step 1: Sending message request via RTK Query..."
      );
      const messageResult = await sendChatMessage({
        chatId: activeChat,
        message: messageText,
        assistantId: currentActiveChat.assistantId || "",
      });

      if ("error" in messageResult) {
        console.error(
          "[NORMAL MODE] ❌ Message request failed:",
          messageResult.error
        );
        throw new Error("Message request failed");
      }

      console.log(
        "[NORMAL MODE] ✅ Step 1 completed: Message request sent successfully"
      );

      // Step 2: Start streaming response
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
            assistantId: currentActiveChat.assistantId || "",
          }),
        });
      } else {
        // Regular chats use local API
        response = await fetch(`/api/chats/${activeChat}/send`, {
          method: "POST",
          headers,
          body: JSON.stringify({
            message: messageText,
            assistantId: currentActiveChat.assistantId || "",
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
          assistantId: currentActiveChat.assistantId || "",
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

        // Step 3: Save the conversation using conversation-save endpoint (completing normal mode)
        try {
          console.log(
            "[NORMAL MODE] 💾 Step 3: Saving conversation via conversation-save endpoint..."
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
            assistantId: currentActiveChat.assistantId || "",
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
            assistantId: currentActiveChat.assistantId || "",
            type: "default",
          };

          // Only send NEW messages since existing ones don't have content from API
          const messagesToSave: ChatMessage[] = [newUserMessage, newAiMessage];

          // Use conversation-save endpoint (completing normal mode: message request + conversation save)
          const saveResult = await saveConversation({
            chatId: activeChat,
            assistantId: currentActiveChat.assistantId || "",
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
              "[NORMAL MODE] ✅ Step 3 completed: Conversation saved successfully"
            );
            console.log(
              "[NORMAL MODE] 🎉 Normal mode complete: Both message request AND conversation save finished"
            );

            // RTK Query will automatically refetch and merge with optimistic messages
            console.log(
              "[NORMAL MODE] 🔄 RTK Query will refetch and seamlessly replace optimistic messages"
            );
            setIsMessageInserting(false);
          } else {
            console.error(
              "[NORMAL MODE] ❌ Step 3 failed: Failed to save conversation:",
              saveResult.error
            );
            setIsMessageInserting(false);
          }
        } catch (saveError) {
          console.error(
            "[NORMAL MODE] ❌ Step 3 error: Error saving conversation:",
            saveError
          );
          setIsMessageInserting(false);
        }
      }
    } catch (error) {
      console.error("[NORMAL MODE] ❌ Normal mode failed:", error);
      // Remove optimistic messages on error
      setOptimisticMessages([]);
      // Restore the message to input
      setCurrentMessage(messageText);
      setIsAiResponding(false);
      setIsMessageInserting(false);
      toast.error("Mesaj gönderilemedi");
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
      const baseDateTime = new Date();
      const timestamp = formatMobileDateTime(baseDateTime);

      const widgetsToSave: ChatMessage[] = [];

      if (newJournalMode) {
        // Switching TO journal mode - add opening ayrac and date with unique timestamps
        const ayracId = crypto.randomUUID();
        const openAyracWidget = {
          id: ayracId,
          identifier: ayracId,
          content: JSON.stringify({
            widgetType: "Ayrac",
            isOpen: true,
          }),
          role: "user" as const,
          type: "widget" as const,
          createdAt: timestamp,
          sender: "user" as const,
          assistantId: currentChat.assistantId || "",
        };

        const currentDate = formatJournalDate();
        const dateId = crypto.randomUUID();
        const dateTimestamp = formatMobileDateTime(
          new Date(baseDateTime.getTime() + 1)
        );

        const dateWidget = {
          id: dateId,
          identifier: dateId,
          content: JSON.stringify({
            widgetType: "JournalDate",
            date: currentDate,
          }),
          role: "user" as const,
          type: "widget" as const,
          createdAt: dateTimestamp,
          sender: "user" as const,
          assistantId: currentChat.assistantId || "",
        };

        widgetsToSave.push(openAyracWidget, dateWidget);
        setOptimisticMessages((prev) => [...prev, openAyracWidget, dateWidget]);
      } else {
        // Switching OUT of journal mode - add closing ayrac
        const ayracId = crypto.randomUUID();
        const closeAyracWidget = {
          id: ayracId,
          identifier: ayracId,
          content: JSON.stringify({
            widgetType: "Ayrac",
            isOpen: false,
          }),
          role: "user" as const,
          type: "widget" as const,
          createdAt: timestamp,
          sender: "user" as const,
          assistantId: currentChat.assistantId || "",
        };

        widgetsToSave.push(closeAyracWidget);
        setOptimisticMessages((prev) => [...prev, closeAyracWidget]);
      }

      // Save widgets to backend immediately
      if (widgetsToSave.length > 0) {
        console.log(
          "🔧 BUTTON TOGGLE - Saving widgets:",
          widgetsToSave.map((w) => ({
            id: w.id,
            type: w.type,
            createdAt: w.createdAt,
            content: w.content?.substring(0, 50),
          }))
        );

        try {
          const user = await getCurrentUser();
          const saveResult = await saveConversation({
            chatId: activeChat,
            messages: widgetsToSave,
            assistantId: currentChat.assistantId || "",
            assistantGroupId: currentChat.assistantGroupId || "",
            type: "journal",
            userId: user.userId,
            localDateTime: timestamp,
            title: currentChat.title,
            lastMessage: newJournalMode
              ? "Günlük başlatıldı"
              : "Günlük sonlandırıldı",
            conversationId: activeChat,
          });

          console.log("🔧 BUTTON TOGGLE - Widget save result:", saveResult);
          toast.success(
            newJournalMode
              ? "Günlük modu başlatıldı!"
              : "Günlük modu sonlandırıldı!"
          );
        } catch (saveError) {
          console.error("🔧 BUTTON TOGGLE - Error saving widgets:", saveError);
          toast.error("Widget'lar kaydedilemedi");
        }
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
        // Check configurations after user is loaded
        await checkMixpanelConfiguration();
        await checkQuizAccess();
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

  // Clear optimistic messages and add automatic widgets when switching chats
  useEffect(() => {
    if (activeChat) {
      let currentActiveChat = chats.find((chat) => chat.id === activeChat);

      // If chat not found in main chats array, check if we can create a synthetic one from message data
      if (
        !currentActiveChat &&
        messagesData?.messages &&
        messagesData.messages.length > 0
      ) {
        const firstMessage = messagesData.messages[0];
        // Create synthetic chat object from message data
        currentActiveChat = {
          id: activeChat,
          title: "YGA Zirvesi Notlarım", // From conversation-save logs
          assistantGroupId:
            (firstMessage as any).assistantGroupId ||
            "f2b835b2-139a-4ea4-a9a0-930d6baded6a",
          type: "reflectionJournal", // Infer from assistantGroupId and title
          assistantId: firstMessage.assistantId,
        };
        console.log(
          "🔧 Created synthetic chat object from message data:",
          currentActiveChat
        );
      }

      // Debug: Check if currentActiveChat has type field
      console.log(`🔧 WIDGET DEBUG - Current active chat:`, {
        chatId: activeChat,
        title: currentActiveChat?.title,
        type: currentActiveChat?.type,
        isReflectionJournal: isReflectionJournalChat(currentActiveChat),
        chatObject: currentActiveChat,
        chatsArrayLength: chats.length,
        chatFound: !!currentActiveChat,
        isSynthetic: !chats.find((chat) => chat.id === activeChat),
      });

      // Only for reflection journal chats
      if (currentActiveChat && isReflectionJournalChat(currentActiveChat)) {
        setOptimisticMessages([]);

        // Check if widgets already exist in messages to avoid duplicates
        const existingMessages = messagesData?.messages || [];
        const hasAyracWidget = existingMessages.some(
          (msg) =>
            (msg.type === "widget" &&
              msg.content?.includes('"widgetType":"Ayrac"')) ||
            msg.content?.includes('"widgetType": "Ayrac"')
        );
        const hasJournalDateWidget = existingMessages.some(
          (msg) =>
            (msg.type === "widget" &&
              msg.content?.includes('"widgetType":"JournalDate"')) ||
            msg.content?.includes('"widgetType": "JournalDate"')
        );

        console.log(`🔧 Widget check - Chat: ${activeChat}`);
        console.log(`🔧 Existing messages count: ${existingMessages.length}`);
        console.log(`🔧 Has Ayrac widget: ${hasAyracWidget}`);
        console.log(`🔧 Has JournalDate widget: ${hasJournalDateWidget}`);
        console.log(
          `🔧 Widget type messages:`,
          existingMessages.filter((m) => m.type === "widget")
        );

        // Also check if widgets are already in optimistic messages to prevent duplicates
        const hasOptimisticAyrac = optimisticMessages.some((msg) =>
          msg.content?.includes('"widgetType":"Ayrac"')
        );
        const hasOptimisticJournalDate = optimisticMessages.some((msg) =>
          msg.content?.includes('"widgetType":"JournalDate"')
        );

        // Only add widgets if they don't already exist in both existing and optimistic messages
        const needsAyrac = !hasAyracWidget && !hasOptimisticAyrac;
        const needsJournalDate =
          !hasJournalDateWidget && !hasOptimisticJournalDate;

        // Also check if we've already saved widgets for this chat to prevent duplicate saves
        const alreadySavedForChat = widgetsSavedForChats.has(activeChat);

        if ((needsAyrac || needsJournalDate) && !alreadySavedForChat) {
          console.log(
            `🔧 Missing widgets: Ayrac=${needsAyrac}, JournalDate=${needsJournalDate}`
          );
          console.log(
            `🔧 Chat: ${activeChat}, Existing messages count: ${existingMessages.length}`
          );
          console.log(`🔧 Already saved for chat: ${alreadySavedForChat}`);

          const baseDateTime = new Date();
          const currentDateOnly = formatJournalDate();
          const widgetsToAdd: ChatMessage[] = [];

          // Add Ayrac widget if missing
          if (needsAyrac) {
            const ayracId = crypto.randomUUID();
            const ayracDateTime = formatMobileDateTime(baseDateTime);
            const openAyracWidget = {
              id: ayracId,
              identifier: ayracId,
              content: JSON.stringify({
                widgetType: "Ayrac",
                isOpen: true,
              }),
              role: "user" as const,
              type: "widget" as const,
              sender: "user" as const,
              createdAt: ayracDateTime,
              assistantId: currentActiveChat.assistantId || "",
            };
            widgetsToAdd.push(openAyracWidget);
          }

          // Add JournalDate widget if missing with 1ms offset
          if (needsJournalDate) {
            const dateId = crypto.randomUUID();
            const journalDateTime = formatMobileDateTime(
              new Date(baseDateTime.getTime() + 1)
            );
            const dateWidget = {
              id: dateId,
              identifier: dateId,
              content: JSON.stringify({
                widgetType: "JournalDate",
                date: currentDateOnly,
              }),
              role: "user" as const,
              type: "widget" as const,
              sender: "user" as const,
              createdAt: journalDateTime,
              assistantId: currentActiveChat.assistantId || "",
            };
            widgetsToAdd.push(dateWidget);
          }

          // Add missing widgets to optimistic messages
          if (widgetsToAdd.length > 0) {
            setOptimisticMessages(widgetsToAdd);

            // Auto-save the missing widgets
            const autoSaveWidgets = async () => {
              try {
                const user = await getCurrentUser();

                console.log(
                  "💾 Attempting to save widgets:",
                  widgetsToAdd.map((w) => ({ id: w.id, type: w.type }))
                );
                console.log(
                  "💾 Existing messages count:",
                  existingMessages.length
                );
                console.log(
                  "💾 Existing widget IDs:",
                  existingMessages
                    .filter((m) => m.type === "widget")
                    .map((m) => m.id)
                );

                // Combine existing messages with new widgets for complete save
                const allMessages = [...existingMessages, ...widgetsToAdd];
                console.log("💾 Total messages to save:", allMessages.length);
                console.log(
                  "💾 All widget IDs in payload:",
                  allMessages
                    .filter((m) => m.type === "widget")
                    .map((m) => m.id)
                );

                const saveResult = await saveConversation({
                  chatId: activeChat,
                  messages: allMessages,
                  assistantId: currentActiveChat.assistantId || "",
                  assistantGroupId: currentActiveChat.assistantGroupId || "",
                  type: "journal",
                  userId: user.userId,
                  localDateTime: formatMobileDateTime(baseDateTime),
                  title: currentActiveChat.title,
                  lastMessage: "Günlük widget'ları eklendi",
                  conversationId: activeChat,
                });

                // Mark this chat as having widgets saved to prevent duplicates
                setWidgetsSavedForChats((prev) =>
                  new Set(prev).add(activeChat)
                );

                console.log(
                  "✅ Auto-saved missing widgets successfully",
                  saveResult
                );
              } catch (error) {
                console.error("❌ Error auto-saving widgets:", error);
                // Don't remove widgets from optimistic messages even if save failed
                // They should remain visible to user
                console.warn(
                  "⚠️ Widget save failed, keeping widgets visible in UI"
                );
              }
            };

            // Save widgets automatically after a short delay
            setTimeout(autoSaveWidgets, 500);
          } else {
            console.log("✅ All widgets already exist, skipping creation");
          }
        }
      } else {
        setOptimisticMessages([]);
        setIsJournalMode(false);
      }
    } else {
      setOptimisticMessages([]);
      setIsJournalMode(false);
    }
  }, [activeChat, chats, messagesData]);

  // Determine journal mode based on ayrac widgets in messages
  useEffect(() => {
    if (activeChat && messages.length > 0 && !isLoadingMessages) {
      const currentChat = chats.find((chat) => chat.id === activeChat);

      // Only for reflection journal chats
      if (currentChat && isReflectionJournalChat(currentChat)) {
        let hasOpenAyrac = false;
        let lastAyracState = null;

        // Check all messages for ayrac widgets to determine the current state
        messages.forEach((msg) => {
          try {
            if (
              msg.content &&
              (msg.type === "widget" || msg.type === "ayrac-widget")
            ) {
              const data = JSON.parse(msg.content);
              if (data.widgetType === "Ayrac") {
                lastAyracState = data.isOpen;
                hasOpenAyrac = data.isOpen === true;
              }
            }
          } catch (e) {
            // Ignore parsing errors
          }
        });

        // Also check optimistic messages
        optimisticMessages.forEach((msg) => {
          try {
            if (msg.content && msg.type === "widget") {
              const data = JSON.parse(msg.content);
              if (data.widgetType === "Ayrac") {
                lastAyracState = data.isOpen;
                hasOpenAyrac = data.isOpen === true;
              }
            }
          } catch (e) {
            // Ignore parsing errors
          }
        });

        console.log("🔧 JOURNAL MODE - Ayrac state check:", {
          hasOpenAyrac,
          lastAyracState,
          currentJournalMode: isJournalMode,
          messagesCount: messages.length,
          optimisticCount: optimisticMessages.length,
        });

        // Set journal mode based on ayrac state
        if (lastAyracState !== null) {
          setIsJournalMode(hasOpenAyrac);
        } else if (messages.length === 0) {
          // No messages at all, default to false
          setIsJournalMode(false);
        }
      } else {
        // Not a reflection journal chat
        setIsJournalMode(false);
      }
    }
  }, [
    activeChat,
    messages,
    optimisticMessages,
    isLoadingMessages,
    chats,
    isJournalMode,
  ]);

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
                src={"/up_face.svg"}
                alt={
                  isJournalMode ||
                  (activeChat &&
                    chats.find((c) => c.id === activeChat) &&
                    isReflectionJournalChat(
                      chats.find((c) => c.id === activeChat)!
                    ))
                    ? "Journal Mode"
                    : "UP Face"
                }
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
            <div className="flex items-center gap-3">
              <h1 className="text-xl font-normal text-black font-righteous">
                Sohbetlerim
              </h1>
              {/* {(isMessageInserting || isSendingMessage || isSavingConversation) && (
                <div className="flex items-center gap-2 px-2 py-1 bg-orange-100 rounded-full">
                  <div className="w-3 h-3 border-2 border-orange-500 border-t-transparent rounded-full animate-spin"></div>
                  <span className="text-xs font-medium text-orange-700">Kaydediliyor</span>
                </div>
              )} */}
            </div>
          </div>

          {/* Quiz Access Button */}
          {showQuizAccess && quizData && (
            <div className="mb-4">
              <button
                onClick={() => router.push(`/quiz/${quizData.testId}`)}
                className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-gradient-to-r from-primary to-blue-600 text-white rounded-xl font-poppins font-medium hover:from-blue-600 hover:to-primary transition-all duration-300 shadow-md hover:shadow-lg transform hover:-translate-y-0.5"
              >
                <ClipboardList className="w-5 h-5" />
                <span className="text-sm">
                  Değerlendirme Testi seni bekliyor!
                </span>
              </button>
            </div>
          )}


          {/* Mock Results Button */}
          {/* <div className="mb-4">
            <button
              onClick={() => router.push("/quiz/results/mock")}
              className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-gradient-to-r from-purple-500 to-purple-600 text-white rounded-xl font-poppins font-medium hover:from-purple-600 hover:to-purple-700 transition-all duration-300 shadow-md hover:shadow-lg transform hover:-translate-y-0.5"
            >
              <Trophy className="w-5 h-5" />
              <span className="text-sm">Mock Sonuç Sayfası</span>
            </button>
          </div> */}
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
                const excludedTypes = ["accountability", "boolean-tester"];

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

                // Filter out chats whose IDs start with 'up' or 'Up'
                if (
                  chat.id &&
                  (chat.id.startsWith("up") || chat.id.startsWith("Up"))
                ) {
                  return false;
                }

                return true;
              })
              .map((chat) => {
                const isActive = activeChat === chat.id;

                return (
                  <div
                    key={`chat-${chat.id}-${isActive ? "active" : "inactive"}`}
                    onClick={() => {
                      // Check if this is a quiz conversation
                      if ((chat as any).isQuiz) {
                        // Redirect to quiz page with the assistant ID and conversation ID
                        router.push(
                          `/quiz/${chat.assistantId}?title=${encodeURIComponent(chat.title)}&conversationId=${chat.id}&assistantGroupId=${chat.assistantGroupId || ""}`
                        );
                        return;
                      }

                      // Regular chat behavior - prevent switching if message operations are in progress
                      if (
                        activeChat !== chat.id &&
                        !isMessageInserting &&
                        !isSendingMessage &&
                        !isSavingConversation
                      ) {
                        setIsTransitioningChat(true);
                        setActiveChat(chat.id);
                        // Defer clearing optimistic messages to avoid blocking UI
                        setTimeout(() => {
                          setOptimisticMessages([]);
                          setIsTransitioningChat(false);
                        }, 100);
                      }
                      // Note: Silent blocking - user cannot switch during message operations
                    }}
                    className={`p-4 rounded-lg transition-all duration-200 ease-in-out ${
                      (isMessageInserting ||
                        isSendingMessage ||
                        isSavingConversation) &&
                      !isActive
                        ? "cursor-not-allowed"
                        : "cursor-pointer"
                    } ${
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
                {/* Quiz Access Button */}
                {/* {showQuizAccess && quizData && (
                  <button
                    onClick={() => router.push(`/quiz/${quizData.testId}`)}
                    className="flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-primary to-blue-600 text-white rounded-xl font-poppins font-semibold hover:from-blue-600 hover:to-primary transition-all duration-300 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 whitespace-nowrap"
                  >
                    <ClipboardList className="w-5 h-5" />
                    <span className="text-sm">
                      Değerlendirme Testi seni bekliyor!
                    </span>
                  </button>
                )} */}

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
                        {showMixpanelOption && (
                          <button
                            onClick={handleCompanyReport}
                            className="flex items-center gap-2 w-full px-4 py-2 text-sm text-text-body-black hover:bg-icon-slate-white transition-colors"
                          >
                            <BarChart3 className="w-4 h-4" />
                            Şirket Raporu
                          </button>
                        )}
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
          <div className="flex-1 overflow-y-auto p-6 transition-opacity duration-300 ease-in-out relative">
            {!activeChat ? (
              <div className="flex items-center justify-center h-full text-center">
                <div className="flex items-center gap-8">
                  <div>
                    <h3 className="text-lg font-medium text-text-black mb-2">
                      Bir sohbet seçin
                    </h3>
                    <p className="text-text-description-gray">
                      Mesajları görüntülemek için sol taraftan bir sohbet seçin
                    </p>
                  </div>

                  {/* Quiz Access Button */}
                  {showQuizAccess && quizData && quizData.testId && (
                    <div className="ml-8">
                      <button
                        onClick={() => router.push(`/quiz/${quizData.testId}`)}
                        className="flex flex-col items-center justify-center gap-2 px-6 py-4 bg-gradient-to-r from-primary to-blue-600 text-white rounded-xl hover:from-blue-600 hover:to-blue-700 transition-all duration-200 shadow-lg hover:shadow-xl"
                      >
                        <ClipboardList className="w-6 h-6" />
                        <span className="text-sm font-medium whitespace-nowrap">
                          Değerlendirme Testi
                          <br />
                          seni bekliyor!
                        </span>
                      </button>
                    </div>
                  )}

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
                  // console.log(`[MESSAGE DEBUG] Index ${index}:`, {
                  //   role: message.role,
                  //   content: message.content?.substring(0, 100),
                  //   sender: message.sender,
                  //   type: message.type,
                  // });

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
                    console.log(`🎯 Rendering widget - Index ${index}:`, {
                      isAyracWidget,
                      isJournalDateWidget,
                      messageType: message.type,
                      content: message.content?.substring(0, 100),
                    });
                    // Render Ayrac/JournalDate widget as normal message (scrollable, not fixed)
                    return (
                      <div
                        key={messageKey}
                        className="animate-in fade-in slide-in-from-bottom-2 duration-300 py-2 w-full flex justify-center"
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
                        <div className=" w-10 h-10 flex items-center justify-center flex-shrink-0 mt-1">
                          <Image
                            src={"/up_face.svg"}
                            alt={
                              isJournalMode ||
                              (activeChat &&
                                chats.find((c) => c.id === activeChat) &&
                                isReflectionJournalChat(
                                  chats.find((c) => c.id === activeChat)!
                                ))
                                ? "Journal Mode"
                                : "UP Face"
                            }
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
                  disabled={isSendingMessage || isMessageInserting}
                  data-property-1="Desktop"
                  className="w-[189px] h-[38px] bg-white rounded-2xl rounded-br-none backdrop-blur-[4px] inline-flex flex-row items-center gap-2 px-3 py-2 hover:bg-white/70 transition-all duration-200 disabled:opacity-50"
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
                  disabled={isSendingMessage || isMessageInserting}
                  data-property-1="Desktop"
                  className="w-[189px] h-[38px] bg-white rounded-2xl rounded-br-none backdrop-blur-[4px] inline-flex flex-row items-center gap-2 px-3 py-2 hover:bg-white/70 transition-all duration-200 disabled:opacity-50"
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
                    Maddelendir
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
                  disabled={isSendingMessage || isMessageInserting}
                  data-property-1="Desktop"
                  className="w-[189px] h-[38px] bg-white rounded-2xl rounded-br-none backdrop-blur-[4px] inline-flex flex-row items-center gap-2 px-3 py-2 hover:bg-white/70 transition-all duration-200 disabled:opacity-50"
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
                    Biraz Motivasyon
                  </div>
                </button>

                <button
                  onClick={handleToggleUp}
                  disabled={isSendingMessage || isMessageInserting}
                  data-property-1="Desktop"
                  className="w-[189px] h-[38px] bg-white rounded-2xl rounded-br-none backdrop-blur-[4px] inline-flex flex-row items-center gap-2 px-3 py-2 hover:bg-white/70 transition-all duration-200 disabled:opacity-50"
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
                          disabled={
                            isSendingMessage ||
                            !activeChat ||
                            isMessageInserting
                          }
                          className="flex-1 bg-transparent text-sm font-medium font-poppins leading-tight text-neutral-800 placeholder:text-neutral-400 border-none outline-none disabled:opacity-50"
                        />
                      </div>

                      <button
                        onClick={handleSendMessage}
                        disabled={
                          isSendingMessage ||
                          !activeChat ||
                          !currentMessage.trim() ||
                          isMessageInserting
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
          ) : activeChat ? (
            /* Regular Input - Journal Style Size */
            <div className="px-8 pb-6">
              <div className="max-w-4xl mx-auto">
                <div className="w-full p-4 bg-white/60 shadow-[0px_-5px_8px_0px_rgba(162,174,255,0.25)] outline outline-1 outline-offset-[-1px] outline-white/30 backdrop-blur-[6.30px] inline-flex justify-start items-center gap-4 rounded-2xl">
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
                          placeholder="Buraya yazabilirsin"
                          value={currentMessage}
                          onChange={(e) => setCurrentMessage(e.target.value)}
                          onKeyDown={handleKeyPress}
                          disabled={
                            isSendingMessage ||
                            !activeChat ||
                            isMessageInserting
                          }
                          className="flex-1 bg-transparent text-sm font-medium font-poppins leading-tight text-neutral-800 placeholder:text-neutral-400 border-none outline-none disabled:opacity-50"
                        />
                      </div>

                      <button
                        onClick={handleSendMessage}
                        disabled={
                          isSendingMessage ||
                          !activeChat ||
                          !currentMessage.trim() ||
                          isMessageInserting
                        }
                        className="w-4 h-4 relative overflow-hidden flex-shrink-0 disabled:opacity-50 hover:opacity-70 transition-opacity flex items-center justify-center"
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
          ) : null}
        </div>
      </div>
    </div>
  );
}
export default HomePage;
