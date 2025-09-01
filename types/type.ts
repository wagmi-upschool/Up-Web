export interface ProjectTypes {
  id: number;
  name: string;
  description?: string;
  startDate?: string;
  endDate?: string;
}

export enum Status {
  ToDo = "To Do",
  WorkInProgress = "Work In Progress",
  UnderReview = "Under Review",
  Completed = "Completed",
}

export enum Priority {
  Urgent = "Urgent",
  High = "High",
  Medium = "Medium",
  Low = "Low",
  Backlog = "Backlog",
}

export interface User {
  userId?: number;
  username: string;
  email: string;
  profilePictureUrl?: string;
  cognitoId?: string;
  teamId?: number;
}

export interface Attachment {
  id: number;
  fileURL: string;
  fileName: string;
  taskId: number;
  uploadedById: number;
}

export interface TasksTypes {
  id: number;
  title: string;
  description?: string;
  status?: Status;
  priority?: Priority;
  tags?: string;
  startDate?: string;
  dueDate?: string;
  points?: number;
  projectId: number;
  authorUserId?: number;
  assignedUserId?: number;

  author?: User;
  assignee?: User;
  comments?: Comment[];
  attachments?: Attachment[];
}

export interface SearchResults {
  tasks?: TasksTypes[];
  projects?: ProjectTypes[];
  users?: User[];
}

export interface Team {
  teamId: number;
  teamName: string;
  productOwnerUserId?: number;
  projectManagerUserId?: number;
}

export type TaskTypeItems = "task" | "milestone" | "project";

export interface ChatMessage {
  id: string;
  identifier?: string; // Unique message identifier from backend
  conversationId?: string; // Conversation ID for backend API calls
  text?: string;
  content?: string; // Lambda'dan gelen field
  sender: 'user' | 'ai';
  role?: string; // assistant, user, human, journal
  time?: string;
  createdAt?: string;
  assistantId?: string;
  type?: string; // typing, widget, etc.
  likeStatus?: boolean | number; // Like status from backend
  isGptSuitable?: boolean; // Whether message supports like/dislike actions
}

export interface Chat {
  id: string;
  title: string;
  description?: string;
  icon?: string; // Can be emoji or image URL
  isActive?: boolean;
  hasNewMessage?: boolean;
  newMessageCount?: number;
  createdAt?: string;
  updatedAt?: string;
  type?: string;
  assistantId?: string;
  isArchived?: boolean;
  userId?: string;
  assistantGroupId?: string;
  lastMessage?: string;
  iconUrl?: string;
  accountabilityDetail?: any;
  // Merged assistant data
  assistantName?: string;
  assistantDescription?: string;
  assistantPrompt?: string;
  assistantTemplate?: string;
  // Merged group data
  groupName?: string;
  groupDescription?: string;
  // Flashcard support methods (like in Flutter model)
  isFlashcardType?: boolean;
  isRegularChat?: boolean;
}
