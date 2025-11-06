# Chatbot Integration

This document describes the chatbot integration that has been added to your React frontend application.

## Overview

The chatbot is designed to help users navigate and understand your medical reporting application. It can read the current page content and provide contextual assistance through your n8n API backend.

## Features

- **Context-Aware**: Reads the current page content to provide relevant help
- **Persistent Chat**: Maintains conversation history during the session
- **User Context**: Includes user role and authentication information
- **Responsive UI**: Clean, modern chat interface that works on all screen sizes
- **Keyboard Shortcuts**: Send messages with Enter key
- **Error Handling**: Graceful error handling with user-friendly messages
- **Minimizable**: Chat can be minimized while keeping the conversation
- **Trigger Buttons**: Pre-built components for opening chat with specific questions

## Components

### 1. ChatbotService (`/src/services/chatbotService.ts`)
Handles communication with the n8n webhook API and page content extraction.

**Key Methods:**
- `sendMessage()`: Sends messages to the n8n API
- `extractPageContent()`: Extracts relevant content from the current page
- `generateContextualPrompt()`: Creates contextual prompts for the AI

### 2. useChatbot Hook (`/src/hooks/useChatbot.ts`)
React hook that manages chatbot state and provides methods for interaction.

**Returns:**
- `messages`: Array of chat messages
- `isLoading`: Loading state
- `isOpen`: Whether chat is open
- `sendMessage()`: Function to send messages
- `toggleChat()`: Toggle chat visibility
- `clearMessages()`: Clear conversation history

### 3. Chatbot Component (`/src/components/Chatbot.tsx`)
The main chat UI component with floating chat bubble and expandable chat window.

**Features:**
- Floating action button when closed
- Expandable chat window
- Message bubbles with timestamps
- Minimize/maximize functionality
- Clear conversation option

### 4. ChatbotProvider (`/src/context/ChatbotContext.tsx`)
React context provider that makes chatbot functionality available throughout the app.

### 5. ChatbotTriggerButton (`/src/components/ChatbotTriggerButton.tsx`)
Reusable components for triggering the chatbot with specific questions.

**Pre-built Helpers:**
- `ChatbotHelpButtons.Navigation`: Ask about navigation
- `ChatbotHelpButtons.CurrentPage`: Ask about current page
- `ChatbotHelpButtons.Forms`: Ask about form filling
- `ChatbotHelpButtons.Data`: Ask about data interpretation
- `ChatbotHelpButtons.Features`: Ask about available features

## Configuration

### Environment Variables
Add to your `.env` file:
```
VITE_N8N_WEBHOOK_URL="https://n8n.nuttynarwhal.com/webhook-test/64f46eaa-c284-4eea-a6e1-50030248ce18"
```

### Integration
The chatbot is automatically included in your app for authenticated users. It's integrated in `App.tsx` within the `ChatbotProvider`.

## Usage Examples

### Basic Usage
The chatbot appears as a floating button in the bottom-right corner for authenticated users. Users can click it to start a conversation.

### Adding Help Buttons to Components
```tsx
import { ChatbotHelpButtons } from '@/components/ChatbotTriggerButton'

// In your component JSX:
<div className="flex items-center">
  <h1>Patient Form</h1>
  <ChatbotHelpButtons.Forms />
</div>
```

### Custom Trigger Buttons
```tsx
import { ChatbotTriggerButton } from '@/components/ChatbotTriggerButton'

<ChatbotTriggerButton
  question="How do I add a new patient record?"
  variant="help"
  size="sm"
/>
```

### Programmatic Access
```tsx
import { useChatbotTrigger } from '@/context/ChatbotContext'

const MyComponent = () => {
  const { openChat, askQuestion } = useChatbotTrigger()
  
  const handleHelp = () => {
    askQuestion("I need help with this specific feature")
  }
  
  return <button onClick={handleHelp}>Get Help</button>
}
```

## API Integration

### Request Format
The chatbot sends requests to your n8n webhook with this structure:
```json
{
  "message": "User's message",
  "context": {
    "pageUrl": "https://yourapp.com/current-page",
    "pageTitle": "Current Page Title",
    "pageContent": "Extracted page content...",
    "userRole": "doctor",
    "userName": "user@example.com"
  },
  "conversation_history": [
    {
      "id": "msg_123",
      "content": "Previous message",
      "role": "user|assistant",
      "timestamp": "2024-01-01T12:00:00Z"
    }
  ],
  "timestamp": "2024-01-01T12:00:00Z"
}
```

### Expected Response
Your n8n workflow should return:
```json
{
  "message": "AI assistant response",
  "success": true
}
```

## Page Content Extraction

The chatbot automatically extracts content from the current page by:
1. Looking for main content areas (`main`, `[role="main"]`, `.content`, etc.)
2. Falling back to general body text content
3. Limiting content to 2000 characters to avoid API limits
4. Cleaning up whitespace and formatting

## Styling

The chatbot uses your existing design system with:
- Tailwind CSS classes
- Your theme provider (dark/light mode support)
- Consistent component styling with shadcn/ui components
- Responsive design that works on mobile and desktop

## Error Handling

The chatbot includes comprehensive error handling:
- Network timeouts (30 seconds)
- API errors with user-friendly messages
- Configuration errors (missing webhook URL)
- Graceful degradation when service is unavailable

## Security Considerations

- Only authenticated users can access the chatbot
- User context includes role-based information
- Page content is sanitized before sending to API
- Environment variables are properly scoped with `VITE_` prefix

## Customization

### Styling
Modify the component styles in `Chatbot.tsx` to match your brand:
```tsx
// Change colors, sizes, positioning, etc.
className="fixed bottom-6 right-6 w-96 h-[600px]"
```

### Content Extraction
Customize what content is extracted in `chatbotService.ts`:
```tsx
// Add specific selectors for your app's content areas
const contentElements = document.querySelectorAll('main, .my-content-area')
```

### Welcome Message
Modify the welcome message in `useChatbot.ts`:
```tsx
const welcomeMessage = {
  content: "Your custom welcome message here..."
}
```

## Troubleshooting

### Chatbot Not Appearing
1. Check that user is authenticated
2. Verify `VITE_N8N_WEBHOOK_URL` is set correctly
3. Check browser console for errors

### API Errors
1. Verify n8n webhook URL is accessible
2. Check network connectivity
3. Ensure n8n workflow is running
4. Check API response format

### Content Not Being Read
1. Verify page has proper semantic HTML structure
2. Check that content areas have appropriate selectors
3. Ensure page content is rendered when chatbot extracts it

## Future Enhancements

Potential improvements you could add:
- Voice input/output
- File attachment support
- Integration with your backend API for more context
- Conversation export/import
- Admin settings for chatbot behavior
- Analytics and usage tracking
- Multi-language support
- Custom quick actions/shortcuts