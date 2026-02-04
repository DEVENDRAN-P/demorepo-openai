import React, { useState, useRef, useEffect } from 'react';
import { useTranslation } from 'react-i18next';

function AIAssistant({ user }) {
  const { t, i18n } = useTranslation();
  const [messages, setMessages] = useState([
    {
      id: 1,
      type: 'bot',
      text:
        i18n.language === 'en'
          ? "Hello! I'm your AI GST Compliance Assistant powered by Groq. I can help you understand GST regulations, filing procedures, tax calculations, and compliance requirements. How may I assist you today?"
          : i18n.language === 'hi'
            ? 'नमस्ते! मैं आपका AI GST अनुपालन सहायक हूं। मैं आपको GST नियम, फाइलिंग प्रक्रिया, कर गणना और अनुपालन आवश्यकताओं को समझने में मदद कर सकता हूं। आज मैं आपकी कैसे मदद कर सकता हूं?'
            : "வணக்கம்! நான் உங்கள் AI GST இணக்க உதவியாளர். GST விதிமுறைகள், தாக்கல் செயல்முறைகள், வரி கணக்கீடுகள் மற்றும் இணக்க தேவைகளைப் புரிந்துகொள்ள நான் உங்களுக்கு உதவ முடியும். இன்று நான் உங்களுக்கு எவ்வாறு உதவ முடியும்?",
    },
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const callGroqAPI = async (userMessage) => {
    try {
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

      // Create a temporary message for the bot response
      const tempMessageId = Date.now() + 1;
      setMessages((prev) => [
        ...prev,
        {
          id: tempMessageId,
          type: 'bot',
          text: '',
        },
      ]);

      // Call backend API instead of Groq directly
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: {
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
          temperature: 0.7,
          max_tokens: 1024,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `API Error: ${response.status}`);
      }

      const data = await response.json();
      const botResponse = data.content || '';

      // Update the message with the bot's response
      setMessages((prev) =>
        prev.map((msg) =>
          msg.id === tempMessageId ? { ...msg, text: botResponse } : msg
        )
      );

      return botResponse;
    } catch (error) {
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
            {loading ? 'Typing...' : 'Online • Powered by Groq AI'}
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
              disabled={loading}
            />
            <button
              type="submit"
              className="chat-send-btn"
              disabled={loading || !input.trim()}
            >
              {loading ? (
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
          Powered by Groq AI (Llama 3.3 70B) • Press Enter to send
        </p>
      </div>
    </div>
  );
}

export default AIAssistant;
