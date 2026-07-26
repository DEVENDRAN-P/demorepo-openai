# AI GST & Compliance Buddy

A complete React.js web application for automated GST filing using AI - Built for OpenAI x NxtWave BUILDATHON.

## 🚀 Features

### ✅ Implemented Features

1. **Smart Bill Upload & AI Extraction**

   - Upload bills (PDF, JPG, PNG, WEBP)
   - AI automatically extracts invoice details using Groq AI
   - Edit and verify extracted data
   - Auto-categorizes expenses

2. **Auto GST Form Generation**

   - GSTR-1 (Outward Supplies) - Auto-filled from uploaded bills
   - GSTR-3B (Summary Return) - Calculated automatically
   - Download as PDF or export JSON
   - Real-time calculations

3. **AI Chat Assistant**

   - Powered by Groq AI (Llama 3.3 70B)
   - Real-time streaming responses
   - GST compliance expertise
   - Multi-language support (English, Hindi, Tamil)
   - Explains tax rules in simple language

4. **Analytics & Reports**

   - Monthly GST trends
   - Category-wise expense breakdown
   - Tax credit calculations
   - Visual charts and graphs

5. **Smart Reminders**

   - Filing deadline notifications
   - Context-aware reminders based on your data
   - Pending bill alerts

6. **Multi-language Support**
   - English, Hindi, Tamil
   - Dynamic language switching
   - Localized content

## 📋 Installation

```bash
# Install dependencies
npm install

# Start development server
npm start

# Build for production
npm run build
```

## 🔑 API Setup

### Groq AI API (Required)

## 🤖 AI Features Setup

1. Get your free API key: https://console.groq.com/keys
2. Create `.env.local` file in project root:
   ```
   REACT_APP_GROQ_API_KEY=your_groq_api_key_here
   ```
3. Restart the development server

## 🎯 How It Works

### 1. Upload Bills

- Click "Upload Bill" from dashboard
- Select PDF or image file (up to 10MB)
- AI automatically extracts:
  - Supplier name & GSTIN
  - Invoice number & date
  - Amounts & tax details
  - Expense category

### 2. Verify & Confirm

- Review AI-extracted data
- Edit any field if needed
- System auto-calculates totals
- Save to your records

### 3. Generate GST Forms

- Go to "GST Forms"
- View auto-filled GSTR-1 & GSTR-3B
- Download or export data
- Ready for filing!

### 4. Get AI Help

- Click "AI Assistant"
- Ask questions in any language
- Get instant GST guidance
- Explanations in simple terms

## 💡 Key Features Explained

### AI Bill Extraction

- Uses Groq AI (Llama 3.3 70B) for intelligent extraction
- Handles various invoice formats
- Smart defaults for missing data
- Editable before saving

### Real-time Calculations

- Auto-calculates GST amounts
- Updates totals instantly
- Supports all GST rates (5%, 12%, 18%, 28%)

### Data-Driven Insights

- All stats use your actual uploaded data
- Empty states guide you to upload bills
- Visual analytics for better understanding

## 🎨 Tech Stack

- **Frontend**: React.js 18, React Router
- **Styling**: Custom CSS (Professional design system)
- **Charts**: Recharts
- **i18n**: react-i18next
- **AI**: Groq API (Llama 3.3 70B Versatile)
- **OCR**: Tesseract.js (future enhancement)
- **Storage**: localStorage (demo mode)

## 📱 Future Enhancements

- [ ] Mobile app (React Native)
- [ ] WhatsApp bot integration
- [ ] Voice input for queries
- [ ] Email notifications
- [ ] Real OCR with Tesseract.js
- [ ] Backend API integration
- [ ] Multi-user support
- [ ] Cloud storage

## 🔐 Demo Credentials

```
Email: demo@shop.com
Password: password123
```

## 📊 Sample Queries for AI Assistant

**English:**

- "What is the GST rate for electronics?"
- "How do I claim input tax credit?"
- "When is GSTR-3B due?"

**Hindi:**

- "GST दर क्या है?"
- "इनपुट टैक्स क्रेडिट कैसे क्लेम करें?"

**Tamil:**

- "GST விகிதம் என்ன?"
- "GSTR-1 எப்போது தாக்கல் செய்ய வேண்டும்?"

## 🏆 Competition Features

✅ **Theme Alignment**: AI in Business
✅ **Problem Solving**: Simplifies GST for small businesses
✅ **Innovation**: AI-powered invoice extraction
✅ **User Experience**: Clean, professional UI
✅ **Practicality**: Real-world applicable
✅ **Technical Excellence**: Modern tech stack
✅ **Scalability**: Ready for production

## 📄 License

MIT License - Built for OpenAI x NxtWave BUILDATHON

---

**Made with ❤️ by a Senior Developer**
