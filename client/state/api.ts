import {
  ProjectTypes,
  SearchResults,
  TasksTypes,
  Team,
  User,
  Chat,
  ChatMessage,
} from "@/types/type";
import { createApi, fetchBaseQuery } from "@reduxjs/toolkit/query/react";
import { fetchAuthSession, getCurrentUser } from "aws-amplify/auth";

const baseQuery = fetchBaseQuery({
  baseUrl: process.env.NEXT_PUBLIC_BASE_URL,
  prepareHeaders: async (headers) => {
    const session = await fetchAuthSession();
    const { accessToken } = session.tokens ?? {};

    if (accessToken) {
      headers.set("Authorization", `Bearer ${accessToken}`);
    }

    return headers;
  },
});

const localApiQuery = fetchBaseQuery({
  baseUrl: "http://localhost:3000/",
  prepareHeaders: async (headers) => {
    try {
      const session = await fetchAuthSession();
      const { accessToken, idToken } = session.tokens ?? {};
      const user = await getCurrentUser();

      if (accessToken && idToken) {
        headers.set("Authorization", `Bearer ${accessToken}`);
        headers.set("x-id-token", idToken.toString());
        headers.set("x-user-id", user.userId);
      } else {
        // Development fallback
        headers.set("Authorization", "Bearer test");
        headers.set("x-user-id", "test123");
      }
    } catch (error) {
      // Development fallback
      headers.set("Authorization", "Bearer test");
      headers.set("x-user-id", "test123");
    }

    return headers;
  },
});

export const api = createApi({
  baseQuery: localApiQuery,
  reducerPath: "api",
  tagTypes: ["Projects", "Tasks", "Users", "Teams", "Chats", "Messages"],
  endpoints: (build) => ({
    getAuthUser: build.query({
      queryFn: async (_, _queryApi, _extraoptions, fetchWihBQ) => {
        try {
          const user = await getCurrentUser();
          const session = await fetchAuthSession();

          if (!session) throw new Error("No session found");

          const { userSub } = session;

          const userDetailsResponse = await fetchWihBQ(`users/${userSub}`);
          const userDetails = userDetailsResponse.data as User;

          return { data: { user, userSub, userDetails } };
        } catch (error: any) {
          return { error: error.message || "could not fetch user data" };
        }
      },
    }),
    getProjects: build.query<ProjectTypes[], void>({
      query: () => "projects",
      providesTags: ["Projects"],
    }),
    createProject: build.mutation<ProjectTypes, Partial<ProjectTypes>>({
      query: (project) => ({
        url: "projects",
        method: "POST",
        body: project,
      }),
      invalidatesTags: ["Projects"],
    }),
    getTasks: build.query<TasksTypes[], { projectId: number }>({
      query: ({ projectId }) => `tasks?projectId=${projectId}`,
      providesTags: (result) =>
        result
          ? result.map(({ id }) => ({ type: "Tasks" as const, id }))
          : [{ type: "Tasks" as const }],
    }),
    getTasksByUser: build.query<TasksTypes[], number>({
      query: (userId) => `tasks/user/${userId}`,
      providesTags: (result, error, userId) =>
        result
          ? result.map(({ id }) => ({ type: "Tasks", id }))
          : [{ type: "Tasks", id: userId }],
    }),
    createTasks: build.mutation<TasksTypes, Partial<TasksTypes>>({
      query: (task) => ({
        url: "tasks",
        method: "POST",
        body: task,
      }),
      invalidatesTags: ["Tasks"],
    }),
    updateTasks: build.mutation<TasksTypes, { taskId: number; status: string }>(
      {
        query: ({ taskId, status }) => ({
          url: `tasks/${taskId}/status`,
          method: "PATCH",
          body: { status },
        }),
        invalidatesTags: (result, error, { taskId }) => [
          { type: "Tasks", id: taskId },
        ],
      },
    ),
    getTeams: build.query<Team[], void>({
      query: () => "teams",
      providesTags: ["Teams"],
    }),
    getUsers: build.query<User[], void>({
      query: () => "users",
      providesTags: ["Users"],
    }),
    search: build.query<SearchResults, string>({
      query: (query) => `search?query=${query}`,
    }),
    getChats: build.query<Chat[], void>({
      query: () => "api/chats",
      providesTags: ["Chats"],
    }),
    getChatMessages: build.query<{ messages: ChatMessage[] }, { chatId: string; limit?: string }>({
      query: ({ chatId, limit = "20" }) => `api/chats/${chatId}/messages?limit=${limit}`,
      providesTags: (result, error, { chatId }) => [
        { type: 'Messages', id: chatId },
        'Messages'
      ],
    }),
    deleteChat: build.mutation<void, string>({
      query: (chatId) => ({
        url: `api/chats/${chatId}`,
        method: "DELETE",
      }),
      invalidatesTags: ["Chats"],
    }),
    sendChatMessage: build.mutation<any, { chatId: string; message: string; assistantId: string }>({
      query: ({ chatId, message, assistantId }) => ({
        url: `api/chats/${chatId}/send`,
        method: "POST",
        body: { message, assistantId },
      }),
      invalidatesTags: (result, error, { chatId }) => [
        "Chats",
        { type: 'Messages', id: chatId },
        'Messages'
      ],
    }),
    saveChatMessages: build.mutation<any, { 
      chatId: string; 
      messages: ChatMessage[]; 
      assistantId: string; 
      assistantGroupId?: string; 
    }>({
      query: ({ chatId, messages, assistantId, assistantGroupId }) => ({
        url: `api/chats/${chatId}/save`,
        method: "POST",
        body: { messages, assistantId, assistantGroupId },
      }),
      invalidatesTags: ["Chats"],
    }),
  }),
});

export const {
  useGetProjectsQuery,
  useCreateProjectMutation,
  useGetTasksQuery,
  useCreateTasksMutation,
  useUpdateTasksMutation,
  useSearchQuery,
  useGetUsersQuery,
  useGetTeamsQuery,
  useGetTasksByUserQuery,
  useGetAuthUserQuery,
  useGetChatsQuery,
  useGetChatMessagesQuery,
  useDeleteChatMutation,
  useSendChatMessageMutation,
  useSaveChatMessagesMutation,
} = api;
