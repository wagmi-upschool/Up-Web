# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is **Up Web** - a web-based PoC chat application designed for enterprise demonstrations. It features a clean two-column interface (chat listing sidebar + main conversation area) that integrates with existing mobile APIs to showcase chat capabilities to enterprise customers.

**Key Technologies:**
- Frontend: Next.js 14, React, TypeScript, Tailwind CSS
- State Management: Redux Toolkit with RTK Query
- Authentication: AWS Amplify with Cognito
- Real-time: WebSocket integration for chat streaming
- Deployment: AWS Amplify with automated builds

## Essential Commands

### Development
```bash
npm run dev        # Start development server on port 3000
npm run build      # Build for production  
npm run start      # Start production server
npm run lint       # Run ESLint checks
```

### Working Directory Structure
- **Project Root**: `/Users/yusuf/Software/Projects/Web-Development/Up-Web/` (Next.js app root)
- **Additional FE Directory**: `/Users/yusuf/Software/Projects/Web-Development/up-fe/` (secondary workspace)

All development work is done directly in the project root.

## Architecture Overview

### API Integration Strategy
The application uses a **dual API approach**:

1. **Remote Backend APIs**: 
   - Base URL: `process.env.NEXT_PUBLIC_BASE_URL` 
   - Used for core business logic, user management, projects, tasks
   - Authentication via AWS Amplify tokens

2. **Local Proxy APIs** (`/api/*` routes):
   - Handle chat functionality as middleware to mobile backend APIs
   - Remote URL: `process.env.REMOTE_URL` (backend API)  
   - Stream URL: `process.env.STREAM_URL` (real-time chat)
   - Authentication via Amplify tokens + special headers

### State Management
- **Redux Store** (`/state/`): Centralized state with RTK Query
- **API Layer** (`/state/api.ts`): Defines all API endpoints and caching
- **Two Base Query Configs**:
  - `baseQuery`: For remote backend APIs
  - `localApiQuery`: For local proxy APIs with enhanced auth headers

### Key API Endpoints
```typescript
// Chat Management  
GET /api/chats                           # List user chats
GET /api/chats/[chatId]/messages         # Get chat messages
POST /api/chats/[chatId]/send            # Send message
POST /api/chats/[chatId]/save            # Save messages
POST /api/chats/[chatId]/conversation-save # Save conversation (Flutter-style)

// Core Business
GET /projects                            # User projects
GET /tasks                              # Project tasks  
POST /projects                          # Create project
POST /tasks                             # Create task
```

### Authentication Flow
1. AWS Cognito authentication via Amplify
2. Access token attached to all API requests
3. Special headers for chat APIs:
   - `Authorization`: Bearer token
   - `x-id-token`: ID token for chat backend
   - `x-user-id`: User identifier

### Component Architecture
- **Page Components**: `/app/*/page.tsx` (Next.js 14 app router)
- **Reusable Components**: `/components/*/index.tsx` 
- **Component Organization**: Each component in its own directory with index.tsx
- **Global Components**: `/components/global/*` (auth, loaders, wrappers)

### Chat System Specifics
- **Message Rendering**: `MessageRenderer.tsx` handles text, JSON, and markdown
- **Real-time**: Streaming responses via Server-Sent Events or WebSocket
- **Message Flow**: User input → Local API → Remote backend → Real-time response
- **State Updates**: RTK Query handles automatic cache invalidation

## Environment Configuration

### Required Environment Variables
```bash
# AWS Amplify Authentication
NEXT_PUBLIC_COGNITO_USER_POOL_ID=us-east-1_akkBktCUt
NEXT_PUBLIC_COGNITO_USER_CLIENT_ID=a5ulkgpppnij4cmhtohg0krrs

# API Endpoints
NEXT_PUBLIC_BASE_URL=<remote_backend_api>    # Core business APIs
REMOTE_URL=<mobile_backend_api>              # Chat backend APIs  
STREAM_URL=<streaming_endpoint>              # Real-time chat streaming

# Development
NEXT_PUBLIC_BASE_URL=http://localhost:3000   # For local API testing
```

### AWS Amplify Configuration
- Config file: `/client/src/amplifyconfiguration.json`
- Cognito setup with email-based authentication
- S3 integration for file uploads (configured in next.config.mjs)

## Development Patterns

### API Endpoint Creation
When creating new API routes in `/app/api/*`:
1. Follow existing auth header pattern from `/api/chats/[chatId]/send/route.ts`
2. Use consistent error handling and logging format
3. Proxy to `REMOTE_URL` when integrating with mobile backend
4. Include proper TypeScript interfaces in `/types/type.ts`

### Component Development
1. Create components in `/components/[feature-name]/index.tsx`
2. Use existing design system from PRD.md (Poppins font, specific color palette)
3. Follow existing responsive patterns (sidebar + main content layout)
4. Integrate with Redux state using RTK Query hooks

### Chat Feature Implementation
- Messages must support both text and structured JSON responses
- Use `MessageRenderer.tsx` for consistent message display
- Implement real-time updates via WebSocket or SSE
- Cache management handled automatically by RTK Query
- Always include conversation save functionality for persistence

### Authentication Integration
- Use `fetchAuthSession()` and `getCurrentUser()` from `aws-amplify/auth`
- Include fallback auth headers for development
- Session management handled by Amplify automatically
- Middleware in `middleware.ts` handles route protection

## Deployment

### AWS Amplify Deployment
- Build configuration: `amplify.yml` in project root
- Builds from project root directory
- Environment variables set in Amplify console
- Artifacts: `.next` output with caching optimization

### Build Process
```bash
npm ci                           # Clean install dependencies
echo "VARS..." >> .env.local     # Environment variable injection  
npm run build                    # Next.js production build
```

## Important File Locations

### Configuration
- `/amplify.yml` - AWS Amplify build configuration
- `/next.config.mjs` - Next.js configuration with S3 image domains
- `/middleware.ts` - Route protection middleware
- `/src/amplifyconfiguration.json` - AWS Amplify/Cognito configuration

### Core Application
- `/state/api.ts` - Main API configuration and endpoints
- `/components/messages/MessageRenderer.tsx` - Chat message rendering
- `/app/api/chats/[chatId]/` - Chat API proxy endpoints
- `/types/type.ts` - TypeScript interface definitions

### Design System
- Design specifications and color palette defined in `/PRD.md` sections 4.4-4.7
- Use Poppins font for body text, Righteous for titles
- Primary blue: `#0057FF`, with specific gray and white variants
- Component styling follows enterprise-professional standards

## Chat System Integration

When working with chat features, always use the `conversation-save` endpoint to persist assistant responses:

```typescript
// Example conversation save request
POST /api/chats/[chatId]/conversation-save
{
  assistantId: "assistant-uuid",
  assistantGroupId: "group-id", 
  type: "conversation",
  userId: "user-id",
  localDateTime: "2025-01-21T10:30:00Z",
  title: "Conversation Title",
  messages: [
    { id: "msg_1", message: "User query", role: "user", ... },
    { id: "msg_2", message: "Assistant response", role: "assistant", ... }
  ],
  conversationId: "existing-id-or-null"
}
```

This ensures all conversations are properly saved to the backend and available across sessions.


search logs inside '/Users/yusuf/Software/Projects/Web-Development/Up-Web/dev.log' 