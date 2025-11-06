# Chatbot Integration Summary

## What's Been Implemented

I've successfully integrated a comprehensive chatbot system into your React frontend that can read page contents and assist users through your n8n API. Here's what has been added:

### 🔧 Core Components

1. **ChatbotService** (`/src/services/chatbotService.ts`)
   - Handles communication with your n8n webhook
   - Extracts page content automatically
   - Includes user context and conversation history

2. **Chatbot Hook** (`/src/hooks/useChatbot.ts`)
   - Manages chat state and messages
   - Handles loading states and errors
   - Provides clean API for components

3. **Chatbot UI** (`/src/components/Chatbot.tsx`)
   - Beautiful floating chat interface
   - Minimizable and responsive design
   - Message history with timestamps
   - Error handling and loading states

4. **Context Provider** (`/src/context/ChatbotContext.tsx`)
   - Makes chatbot available throughout your app
   - Provides trigger functions for programmatic access

5. **Helper Components** (`/src/components/ChatbotTriggerButton.tsx`)
   - Pre-built help buttons for common scenarios
   - Easy to add to any component

### 🎯 Key Features

- **Context-Aware**: Reads current page content and includes it in API requests
- **User Authentication Integration**: Only shows for logged-in users
- **Role-Based Context**: Includes user role and information
- **Conversation Memory**: Maintains chat history during the session
- **Error Handling**: Graceful error handling with user-friendly messages
- **Responsive Design**: Works on all screen sizes
- **Keyboard Shortcuts**: Enter to send messages
- **Theme Integration**: Supports your dark/light theme

### 🔌 API Integration

The chatbot sends structured requests to your n8n webhook:
```json
{
  "message": "User's question",
  "context": {
    "pageUrl": "current page URL",
    "pageTitle": "page title",
    "pageContent": "extracted content",
    "userRole": "doctor|admin|user",
    "userName": "user@example.com"
  },
  "conversation_history": [...],
  "timestamp": "ISO timestamp"
}
```

### 🌟 Example Integration

I've added a help button to your PatientForm as an example:
```tsx
<CardHeader>
  <div className="flex items-center justify-between">
    <CardTitle>Create New Patient</CardTitle>
    <ChatbotHelpButtons.Forms />
  </div>
</CardHeader>
```

## 🚀 How to Use

### For Users
1. The chatbot appears as a floating blue button in the bottom-right corner
2. Click it to open the chat interface
3. Type questions and press Enter to send
4. The bot can see and understand the current page content

### For Developers

#### Add Help Buttons to Components
```tsx
import { ChatbotHelpButtons } from '@/components/ChatbotTriggerButton'

// In your JSX:
<ChatbotHelpButtons.CurrentPage />
<ChatbotHelpButtons.Forms />
<ChatbotHelpButtons.Navigation />
```

#### Programmatic Access
```tsx
import { useChatbotTrigger } from '@/context/ChatbotContext'

const { openChat, askQuestion } = useChatbotTrigger()

// Open chat with specific question
askQuestion("How do I add a new patient?")

// Just open the chat
openChat()
```

## 🔧 Configuration

### Environment Variables
```bash
# In your .env file:
VITE_N8N_WEBHOOK_URL="https://n8n.nuttynarwhal.com/webhook-test/64f46eaa-c284-4eea-a6e1-50030248ce18"
```

### N8N Workflow Requirements
Your n8n workflow should:
1. Accept POST requests with the structure shown above
2. Return JSON response: `{ "message": "response text", "success": true }`
3. Handle errors gracefully

## 📁 Files Added/Modified

### New Files:
- `/src/services/chatbotService.ts` - API communication
- `/src/hooks/useChatbot.ts` - React hook for state management
- `/src/components/Chatbot.tsx` - Main UI component
- `/src/context/ChatbotContext.tsx` - React context provider
- `/src/components/ChatbotTriggerButton.tsx` - Helper trigger components
- `/src/stores/chatbotStore.ts` - Global settings store
- `/src/components/chatbot/README.md` - Detailed documentation

### Modified Files:
- `/src/App.tsx` - Added ChatbotProvider and Chatbot component
- `/src/components/forms/PatientForm.tsx` - Added example help button
- `/.env` - Added n8n webhook URL

## 🎨 Customization

### Styling
Modify colors, positioning, and sizes in `Chatbot.tsx`:
```tsx
className="fixed bottom-6 right-6 w-96 h-[600px]"
```

### Content Extraction
Customize what content is extracted in `chatbotService.ts`:
```tsx
const contentElements = document.querySelectorAll('main, .my-content-area')
```

### Welcome Message
Change the initial message in `useChatbot.ts`:
```tsx
const welcomeMessage = {
  content: "Your custom welcome message..."
}
```

## 🔍 Testing

1. **Start the dev server**: `npm run dev`
2. **Login to your app** (chatbot only shows for authenticated users)
3. **Look for the blue chat button** in the bottom-right corner
4. **Click it and try asking**: "What can I do on this page?"
5. **Test the help button** on the Patient Form

## 🛟 Troubleshooting

### Chatbot Not Appearing
- Check that you're logged in
- Verify `VITE_N8N_WEBHOOK_URL` is set correctly
- Check browser console for errors

### API Errors
- Ensure your n8n workflow is running
- Test the webhook URL directly
- Check that the workflow accepts the expected JSON structure

## 🚀 Next Steps

1. **Test with your n8n workflow** - Make sure it can handle the request structure
2. **Add more help buttons** throughout your app using the examples provided
3. **Customize the appearance** to match your brand
4. **Train your AI** to understand your specific medical reporting workflow

The chatbot is now fully integrated and ready to help your users navigate and understand your medical reporting application!