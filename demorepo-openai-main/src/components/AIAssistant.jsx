import React, { useState, useRef, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { getUserBills } from '../services/firebaseDataService';
import { aiChatStream, aiChat } from '../services/aiService';

function AIAssistant({ user }) {
  const { i18n } = useTranslation();
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [streaming, setStreaming] = useState(false);
  const messagesEndRef = useRef(null);

  // Business Context State
  const [bills, setBills] = useState([]);
  const [activeBusiness, setActiveBusiness] = useState(null);

  // Load business invoices context
  useEffect(() => {
    if (!user?.uid) return;
    const businessId = localStorage.getItem('activeBusinessId') || null;
    // Read business profile from localStorage (set by real business selector in Sidebar)
    let biz = null;
    try {
      const raw = localStorage.getItem('activeBusinessProfile');
      if (raw) biz = JSON.parse(raw);
    } catch (e) {}
    setActiveBusiness(biz);

    getUserBills(user.uid)
      .then(allBills => {
        const filtered = allBills.filter(b => {
          if (!businessId) return true;
          if (!b.businessId) return true;
          return b.businessId === businessId;
        });
        setBills(filtered);
      })
      .catch(e => console.error(e));
  }, [user?.uid]);

  // Welcome message localized — uses the REAL business context from the
  // authenticated user's profile; never hardcoded demo business names.
  useEffect(() => {
    const getWelcomeMessage = () => {
      const lang = i18n.language;
      const businessName = activeBusiness?.name || user?.shopName || user?.displayName || 'your business';
      if (lang === 'hi') {
        return `नमस्ते! मैं आपका AI GST अनुपालन सहायक हूं। मैं ${businessName} के लिए लेखा परीक्षा करने और करों की गणना करने के लिए तैयार हूं। आज आप क्या जांचना चाहते हैं?`;
      } else if (lang === 'ta') {
        return `வணக்கம்! நான் உங்கள் AI GST இணக்க உதவியாளர். ${businessName} க்கான வரி கணக்கீடுகள் மற்றும் தணிக்கைகளை செய்ய நான் தயாராக உள்ளேன். இன்று நான் உங்களுக்கு எவ்வாறு உதவ முடியும்?`;
      }
      return `Hello! I'm your AI GST Accountant powered by Google Gemini. I have loaded context for "${businessName}" and audited your ${bills.length} invoices. How may I assist you with GSTR return prep, ITC matching, or tax forecasting today?`;
    };

    setMessages([
      {
        id: 1,
        type: 'bot',
        text: getWelcomeMessage(),
      },
    ]);
  }, [i18n.language, activeBusiness, bills.length, user?.displayName, user?.shopName]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const callAI = async (userMessage) => {
    const invoiceSummary = bills.length === 0
      ? 'No invoices uploaded yet.'
      : bills.map((b, i) => `- Inv #${b.invoiceNumber} from ${b.supplierName} | Date: ${b.invoiceDate} | Taxable: ₹${b.amount} | GST: ₹${b.taxAmount} | Total: ₹${b.totalAmount} | Category: ${b.expenseType} | Status: ${b.filed ? 'Filed' : 'Pending'}`).join('\n');

    const conversation = messages
      .filter((m) => m.type === 'user' || (m.type === 'bot' && m.text))
      .map((m) => ({
        role: m.type === 'user' ? 'user' : 'assistant',
        content: m.text,
      }));

    const language = i18n.language === 'hi' ? 'hi' : i18n.language === 'ta' ? 'ta' : 'en';

    try {
      const updateStreamingMessage = (id, text) => {
        setMessages((prev) => prev.map((msg) => (msg.id === id ? { ...msg, text } : msg)));
      };

      const stream = await aiChatStream({
        messages: conversation,
        business: {
          name: activeBusiness?.name || user?.shopName || user?.displayName || 'My Business',
          gstin: activeBusiness?.gstin || user?.gstin || '',
          state: activeBusiness?.state || user?.state || '',
        },
        invoiceSummary,
        language,
      });

      const reader = stream.getReader();
      const decoder = new TextDecoder();
      let fullResponse = '';

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
        const chunk = decoder.decode(value, { stream: true });
        if (chunk) {
          fullResponse += chunk;
          updateStreamingMessage(tempMessageId, fullResponse);
        }
      }

      setStreaming(false);
      return fullResponse;
    } catch (streamErr) {
      setStreaming(false);
      // Fallback to non-streaming AI chat API if stream fails
      try {
        const result = await aiChat({
          messages: conversation,
          business: {
            name: activeBusiness?.name || user?.shopName || user?.displayName || 'My Business',
            gstin: activeBusiness?.gstin || user?.gstin || '',
            state: activeBusiness?.state || user?.state || '',
          },
          invoiceSummary,
          language,
        });
        const text = result.output || result.text || result.message || 'I have audited your invoices and context.';
        setMessages((prev) => [
          ...prev,
          {
            id: Date.now() + 1,
            type: 'bot',
            text,
          },
        ]);
        return text;
      } catch (fallbackErr) {
        throw fallbackErr;
      }
    }
  };

  const handleSendMessage = async (e, customText) => {
    if (e) e.preventDefault();
    const queryText = customText || input;
    if (!queryText.trim() || loading) return;

    const userMessage = {
      id: Date.now(),
      type: 'user',
      text: queryText,
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput('');
    setLoading(true);

    try {
      await callAI(queryText);
    } catch (error) {
      const errorMessage = {
        id: Date.now() + 1,
        type: 'bot',
        text: "I apologize, but I'm having trouble connecting to the AI Accountant service right now. Please try again. Action item: verify your network connection and sign-in session.",
      };
      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="chat-container glass-panel" style={{ borderRadius: 'var(--radius-xl)', overflow: 'hidden', height: '650px', display: 'flex', flexDirection: 'column' }}>
      
      {/* Header */}
      <div className="chat-header" style={{ padding: '1rem 1.5rem', background: 'var(--bg-secondary)', borderBottom: '1px solid var(--border-color)', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
        <div style={{ background: 'var(--theme-primary-light)', padding: '0.5rem', borderRadius: '50%', width: '40px', height: '40px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.25rem' }}>
          🤖
        </div>
        <div>
          <h3 className="font-bold" style={{ fontSize: '1.05rem', margin: 0 }}>AI Accountant Console</h3>
          <p style={{ fontSize: '0.75rem', color: 'var(--theme-secondary-light)', margin: 0 }}>
            {loading || streaming ? 'Typing explanation...' : `Audited ${bills.length} Invoices`}
          </p>
        </div>
      </div>

      {/* Messages */}
      <div className="chat-messages" style={{ flex: 1, padding: '1.5rem', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
        {messages.map((msg) => (
          <div key={msg.id} style={{ display: 'flex', gap: '0.75rem', alignSelf: msg.type === 'user' ? 'flex-end' : 'flex-start', maxWidth: '80%' }}>
            
            {msg.type !== 'user' && (
              <div style={{ background: 'var(--bg-secondary)', width: '32px', height: '32px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.9rem', border: '1px solid var(--border-color)', flexShrink: 0 }}>
                🤖
              </div>
            )}

            <div style={{
              background: msg.type === 'user' ? 'linear-gradient(135deg, var(--theme-primary) 0%, var(--theme-primary-light) 100%)' : 'var(--bg-secondary)',
              color: msg.type === 'user' ? 'white' : 'var(--text-primary)',
              padding: '0.75rem 1.25rem',
              borderRadius: 'var(--radius-lg)',
              border: msg.type === 'user' ? 'none' : '1px solid var(--border-color)',
              fontSize: '0.875rem',
              lineHeight: '1.5',
              whiteSpace: 'pre-wrap'
            }}>
              {msg.text || (
                <div className="typing-indicator" style={{ display: 'flex', gap: '4px', alignItems: 'center', height: '18px' }}>
                  <div className="typing-dot" style={{ width: '6px', height: '6px', borderRadius: '50%', background: 'var(--text-secondary)' }}></div>
                  <div className="typing-dot" style={{ width: '6px', height: '6px', borderRadius: '50%', background: 'var(--text-secondary)' }}></div>
                  <div className="typing-dot" style={{ width: '6px', height: '6px', borderRadius: '50%', background: 'var(--text-secondary)' }}></div>
                </div>
              )}
            </div>

            {msg.type === 'user' && (
              <div style={{ background: 'linear-gradient(135deg, var(--theme-secondary) 0%, var(--theme-secondary-light) 100%)', width: '32px', height: '32px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.9rem', color: 'white', flexShrink: 0 }}>
                👤
              </div>
            )}

          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>

      {/* Quick Actions & Input */}
      <div className="chat-input-container" style={{ padding: '1rem 1.5rem', background: 'var(--bg-secondary)', borderTop: '1px solid var(--border-color)' }}>
        
        {/* Preset commands */}
        <div style={{ display: 'flex', gap: '0.5rem', overflowX: 'auto', paddingBottom: '0.75rem', marginBottom: '0.5rem', whiteSpace: 'nowrap' }}>
          <button className="chip-interactive" onClick={(e) => handleSendMessage(e, 'Verify Input Tax Credit balance')} style={{ fontSize: '0.75rem', display: 'inline-flex', alignItems: 'center' }}>
            <svg width="12" height="12" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2" style={{ marginRight: '0.25rem' }}>
              <circle cx="12" cy="12" r="10"/>
              <path d="M12 6v12M9 9h6a2 2 0 0 1 2 2v2a2 2 0 0 1-2 2H9a2 2 0 0 1-2-2v-2a2 2 0 0 1 2-2z"/>
            </svg>
            <span>Check ITC Balance</span>
          </button>
          <button className="chip-interactive" onClick={(e) => handleSendMessage(e, 'Analyze current expense leakage')} style={{ fontSize: '0.75rem', display: 'inline-flex', alignItems: 'center' }}>
            <svg width="12" height="12" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2" style={{ marginRight: '0.25rem' }}>
              <circle cx="11" cy="11" r="8"/>
              <line x1="21" y1="21" x2="16.65" y2="16.65"/>
            </svg>
            <span>Find Expense Leakage</span>
          </button>
          <button className="chip-interactive" onClick={(e) => handleSendMessage(e, 'Suggest tax optimization strategies')} style={{ fontSize: '0.75rem', display: 'inline-flex', alignItems: 'center' }}>
            <svg width="12" height="12" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2" style={{ marginRight: '0.25rem' }}>
              <path d="M9 18h6M10 22h4M12 2a7 7 0 0 1 7 7c0 2-1 4-2 5v1a2 2 0 0 1-2 2h-6a2 2 0 0 1-2-2v-1c-1-1-2-3-2-5a7 7 0 0 1 7-7z"/>
            </svg>
            <span>Optimize Taxes</span>
          </button>
          <button className="chip-interactive" onClick={(e) => handleSendMessage(e, 'Check invoice math discrepancies')} style={{ fontSize: '0.75rem', display: 'inline-flex', alignItems: 'center' }}>
            <svg width="12" height="12" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2" style={{ marginRight: '0.25rem' }}>
              <path d="m10.29 3.86 8.47 14.71c.77 1.34-.19 3-1.73 3H3.64c-1.54 0-2.5-1.66-1.73-3L10.29 3.86Z"/>
              <line x1="12" x2="12" y1="9" y2="13"/>
              <line x1="12" x2="12.01" y1="17" y2="17"/>
            </svg>
            <span>Audit Invoices</span>
          </button>
        </div>

        <form onSubmit={handleSendMessage} style={{ display: 'flex', gap: '0.75rem' }}>
          <input 
            type="text"
            className="chat-input"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask AI Accountant: 'Reconcile returns', 'Check tax rates'..."
            disabled={loading || streaming}
            style={{ flex: 1, background: 'var(--bg-primary)', border: '1px solid var(--border-color)', color: 'var(--text-primary)', padding: '0.75rem 1rem', borderRadius: 'var(--radius-lg)', fontSize: '0.875rem', outline: 'none' }}
          />
          <button
            type="submit"
            className="btn btn-primary"
            disabled={loading || streaming || !input.trim()}
            style={{ padding: '0.75rem 1.5rem' }}
          >
            {loading || streaming ? 'Thinking...' : 'Send'}
          </button>
        </form>
      </div>

    </div>
  );
}

export default AIAssistant;
