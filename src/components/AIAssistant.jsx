import React, { useState, useRef, useEffect } from 'react';
import { useTranslation } from 'react-i18next';

function AIAssistant({ user }) {
  const { t, i18n } = useTranslation();
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [streaming, setStreaming] = useState(false);
  const messagesEndRef = useRef(null);

  const GROQ_API_KEY = process.env.REACT_APP_GROQ_API_KEY || '';

  // Get welcome message based on current language
  const getWelcomeMessage = () => {
    const lang = i18n.language;
    if (lang === 'hi') {
      return 'नमस्ते! मैं आपका AI GST अनुपालन सहायक हूं। मैं आपको GST नियम, फाइलिंग प्रक्रिया, कर गणना और अनुपालन आवश्यकताओं को समझने में मदद कर सकता हूं। आज मैं आपकी कैसे मदद कर सकता हूं?';
    } else if (lang === 'ta') {
      return 'வணக்கம்! நான் உங்கள் AI GST இணக்க உதவியாளர். GST விதிமுறைகள், தாக்கல் செயல்முறைகள், வரி கணக்கீடுகள் மற்றும் இணக்க தேவைகளைப் புரிந்துகொள்ள நான் உங்களுக்கு உதவ முடியும். இன்று நான் உங்களுக்கு எவ்வாறு உதவ முடியும்?';
    } else if (lang === 'ml') {
      return 'നിങ്ങളെ സ്വാഗതം! ഞാൻ നിങ്ങളുടെ AI GST കംപ്ലയൻസ് അസിസ്റ്റൻറാണ്. ഞാൻ നിങ്ങളെ GST നിയമങ്ങൾ, ഫിലിംഗ് നടപടിക്രമങ്ങൾ, കരം കണക്കുകൂട്ടൽ, കംപ്ലയൻസ് ആവശ്യകതകൾ മനസിലാക്കാൻ സഹായിക്കാൻ കഴിയും. ഇന്ന് ഞാൻ നിങ്ങളെ എങ്ങനെ സഹായിക്കാം?';
    } else if (lang === 'kn') {
      return 'ನಮಸ್ಕಾರ! ನಾನು ನಿಮ್ಮ AI GST ಅನುಸರಣೆ ಸಹಾಯಕ. GST ನಿಯಮಗಳು, ಫೈಲಿಂಗ್ ಕಾರ್ಯವಿಧಿಗಳು, ತೆರಿಗೆ ಲೆಕ್ಕಾಚಾರಗಳು ಮತ್ತು ಅನುಸರಣೆ ಅವಶ್ಯಕತೆಗಳನ್ನು ಅರ್ಥಮಾಡಿಕೊಳ್ಳಲು ನಾನು ನಿಮಗೆ ಸಹಾಯ ಮಾಡಬಹುದು. ಇಂದು ನಾನು ನಿಮಗೆ ಹೇಗೆ ಸಹಾಯ ಮಾಡಬಹುದು?';
    }
    return "Hello! I'm your AI GST Compliance Assistant powered by Groq. I can help you understand GST regulations, filing procedures, tax calculations, and compliance requirements. How may I assist you today?";
  };

  // Initialize and update welcome message on language change
  useEffect(() => {
    setMessages([
      {
        id: 1,
        type: 'bot',
        text: getWelcomeMessage(),
      },
    ]);
  }, [i18n.language, getWelcomeMessage]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const callGroqAPI = async (userMessage) => {
    try {
      // Helper defined outside loops to satisfy no-loop-func
      const updateStreamingMessage = (id, text) => {
        setMessages((prev) => prev.map((msg) => (msg.id === id ? { ...msg, text } : msg)));
      };

      const systemPrompt = `You are an expert GST (Goods and Services Tax) compliance assistant for Indian businesses. 
      Provide accurate, clear, and practical information about:
      - GST rates and calculations
      - Filing procedures (GSTR-1, GSTR-3B, etc.)
      - Input Tax Credit (ITC)
      - GST registration requirements
      - Compliance deadlines
      - Penalties and interest
      - Invoice requirements
      - GST returns
      your name is ComplianceBot
      username is ${user?.name || ''}
       and have good knowledge about gst 
      Keep responses concise but informative. Use simple language that shopkeepers can understand.
      dont make up answers if you dont know the answer dont provide in markdown format as the end interface doesnt have mkd support`;

      const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${GROQ_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          messages: [
            {
              role: 'system',
              content: systemPrompt,
            },
            {
              role: 'user',
              content: userMessage,
            },
          ],
          model: 'llama-3.3-70b-versatile',
          temperature: 0.7,
          max_tokens: 1024,
          top_p: 0.9,
          stream: true,
        }),
      });

      if (!response.ok) {
        throw new Error(`API Error: ${response.status}`);
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let fullResponse = '';

      // Create a temporary message for streaming
      const tempMessageId = Date.now() + 1;
      setMessages((prev) => [
        ...prev,
        {
          id: tempMessageId,
          type: 'bot',
          text: '',
        },
      ]);
      setStreaming(true);

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value);
        const lines = chunk.split('\n');

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = line.slice(6);
            if (data === '[DONE]') continue;

            try {
              const parsed = JSON.parse(data);
              const content = parsed.choices[0]?.delta?.content || '';
              if (content) {
                fullResponse += content;
                // Update the streaming message without defining a function in the loop
                updateStreamingMessage(tempMessageId, fullResponse);
              }
            } catch (e) {
              // Skip invalid JSON
            }
          }
        }
      }

      setStreaming(false);
      return fullResponse;
    } catch (error) {
      setStreaming(false);
      throw error;
    }
  };

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!input.trim() || loading) return;

    const userMessage = {
      id: Date.now(),
      type: 'user',
      text: input,
    };

    setMessages((prev) => [...prev, userMessage]);
    const userInput = input;
    setInput('');
    setLoading(true);

    try {
      await callGroqAPI(userInput);
    } catch (error) {
      const errorMessage = {
        id: Date.now() + 1,
        type: 'bot',
        text: "I apologize, but I'm having trouble connecting to the AI service right now. Please try again in a moment. If the issue persists, check your internet connection.",
      };
      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="chat-container">
      <div className="chat-header">
        <div
          className="message-avatar"
          style={{ background: 'rgba(255,255,255,0.2)' }}
        >
          🤖
        </div>
        <div>
          <h3
            className="font-bold"
            style={{ fontSize: '1.125rem', marginBottom: '0.125rem' }}
          >
            {t('ai_assistant')}
          </h3>
          <p style={{ fontSize: '0.8125rem', opacity: 0.9 }}>
            {loading || streaming ? t('typing') : t('online_powered_groq')}
          </p>
        </div>
      </div>

      <div className="chat-messages">
        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`message ${msg.type === 'user' ? 'message-user' : 'message-bot'
              } animate-slide-up`}
          >
            <div
              className="message-avatar"
              style={{
                background:
                  msg.type === 'user'
                    ? 'linear-gradient(135deg, #6366f1 0%, #ec4899 100%)'
                    : '#e0e7ff',
              }}
            >
              {msg.type === 'user' ? '👤' : '🤖'}
            </div>
            <div className="message-content">
              {msg.text || (
                <div className="typing-indicator">
                  <div className="typing-dot"></div>
                  <div className="typing-dot"></div>
                  <div className="typing-dot"></div>
                </div>
              )}
            </div>
          </div>
        ))}

        <div ref={messagesEndRef} />
      </div>

      <div className="chat-input-container">
        <form onSubmit={handleSendMessage}>
          <div className="chat-input-wrapper">
            <textarea
              className="chat-input"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyPress={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleSendMessage(e);
                }
              }}
              placeholder={t('type_message') || 'Ask me anything about GST...'}
              rows="1"
              disabled={loading || streaming}
            />
            <button
              type="submit"
              className="chat-send-btn"
              disabled={loading || streaming || !input.trim()}
            >
              {loading || streaming ? (
                <>
                  <div
                    className="spinner"
                    style={{ width: '16px', height: '16px', borderWidth: '2px' }}
                  ></div>
                </>
              ) : (
                <>
                  <span>Send</span>
                  <span>📤</span>
                </>
              )}
            </button>
          </div>
        </form>
        <p
          style={{
            fontSize: '0.75rem',
            color: 'var(--gray)',
            marginTop: '0.75rem',
            textAlign: 'center',
          }}
        >
          {t('powered_by_groq_full')}
        </p>
      </div>
    </div>
  );
}

export default AIAssistant;
