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

// Quiz System Types
export enum QuizQuestionState {
  Initial = "initial",
  Viewed = "viewed", 
  Done = "done",
  Skipped = "skipped",
}

export interface QuizOption {
  id: string;
  text: string;
  value: string;
}

export interface QuizQuestion {
  id: string;
  questionId: string;
  title: string;
  description?: string;
  options: QuizOption[];
  correctOptionId?: string; // For results calculation
  sequenceNumber: number;
  state: QuizQuestionState;
  userAnswer?: string; // Selected option ID
  timeSpentSeconds?: number;
}

export interface QuizSession {
  id: string;
  sessionId: string;
  conversationId: string;
  assistantId: string;
  assistantGroupId?: string;
  questions: QuizQuestion[];
  title: string;
  description?: string;
  totalQuestions: number;
  currentQuestionIndex: number;
  completedQuestions: string[]; // Question IDs
  timeLimit?: number; // in minutes
  createdAt: string;
  updatedAt: string;
  phase: 'introduction' | 'question' | 'results';
}

export interface QuizResults {
  sessionId: string;
  score: number; // percentage
  correctAnswers: number;
  incorrectAnswers: number;
  totalQuestions: number;
  completedAt: string;
  answers: Record<string, string>; // questionId -> selectedOptionId
  timeSpent: number; // total time in seconds
  error?: string; // Backend error indicator
  message?: string; // Error message
  isLocalCalculation?: boolean; // Flag indicating local score calculation
}

export interface QuizSessionResponse {
  statusCode: number;
  statusMessage: string;
  session: QuizSession;
}

export interface CreateQuizSessionResponse {
  statusCode: number;
  statusMessage: string;
  sessionId: string;
  conversationId: string;
  totalQuestions: number;
  questions: QuizQuestion[];
  assistantId?: string;
  agentType?: string;
}

export interface QuizAnswerRequest {
  sessionId: string;
  questionId: string;
  selectedOptionId: string;
  userAnswer?: string; // For fill-in-blanks
  timeSpentSeconds?: number;
}

export interface QuizSessionRequest {
  assistantId: string;
  assistantGroupId?: string;
  type: string;
  title: string;
}

// For existing conversation quiz data
export interface ExistingQuizData {
  conversationId: string;
  assistantId: string;
  title: string;
  questions: any[]; // Questions from conversation response
  totalQuestions?: number;
}

// Quiz Completion Check Response
export interface QuizCompletionResponse {
  statusCode: number;
  statusMessage: string;
  userId: string;
  assistantId: string;
  isCompleted: boolean;
  hasConversation: boolean;
  lastConversationId: string | null;
  lastUpdatedAt: string | null;
}
