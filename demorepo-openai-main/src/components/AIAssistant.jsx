import React, { useState, useRef, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { getUserBills } from '../services/firebaseDataService';

const BUSINESSES = [
  { id: 'apex_retailers', name: 'Apex Retailers', gstin: '29ABCDE1234F2Z5', state: 'Karnataka', type: 'Retail & Distribution' },
  { id: 'nexgen_solutions', name: 'NexGen Software Solutions', gstin: '27XYZAB5678C1Z0', state: 'Maharashtra', type: 'IT Services & Consulting' },
  { id: 'phoenix_logistics', name: 'Phoenix Logistics', gstin: '07AAACP1234A1Z9', state: 'Delhi', type: 'Transport & Warehouse' }
];

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

  const GROQ_API_KEY = process.env.REACT_APP_GROQ_API_KEY || '';

  // Load business invoices context
  useEffect(() => {
    if (!user?.uid) return;
    const businessId = localStorage.getItem('activeBusinessId') || 'apex_retailers';
    const biz = BUSINESSES.find(b => b.id === businessId) || BUSINESSES[0];
    setActiveBusiness(biz);

    getUserBills(user.uid)
      .then(allBills => {
        const filtered = allBills.filter(b => {
          if (!b.businessId) return businessId === 'apex_retailers';
          return b.businessId === businessId;
        });
        setBills(filtered);
      })
      .catch(e => console.error(e));
  }, [user?.uid]);

  // Welcome message localized
  useEffect(() => {
    const getWelcomeMessage = () => {
      const lang = i18n.language;
      if (lang === 'hi') {
        return `नमस्ते! मैं आपका AI GST अनुपालन सहायक हूं। मैं ${activeBusiness?.name || 'Apex Retailers'} के लिए लेखा परीक्षा करने और करों की गणना करने के लिए तैयार हूं। आज आप क्या जांचना चाहते हैं?`;
      } else if (lang === 'ta') {
        return `வணக்கம்! நான் உங்கள் AI GST இணக்க உதவியாளர். ${activeBusiness?.name || 'Apex Retailers'} க்கான வரி கணக்கீடுகள் மற்றும் தணிக்கைகளை செய்ய நான் தயாராக உள்ளேன். இன்று நான் உங்களுக்கு எவ்வாறு உதவ முடியும்?`;
      }
      return `Hello! I'm your AI GST Accountant powered by Groq. I have loaded context for "${activeBusiness?.name || 'Apex Retailers'}" and audited your ${bills.length} invoices. How may I assist you with GSTR return prep, ITC matching, or tax forecasting today?`;
    };

    setMessages([
      {
        id: 1,
        type: 'bot',
        text: getWelcomeMessage(),
      },
    ]);
  }, [i18n.language, activeBusiness, bills.length]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const callGroqAPI = async (userMessage) => {
    try {
      const updateStreamingMessage = (id, text) => {
        setMessages((prev) => prev.map((msg) => (msg.id === id ? { ...msg, text } : msg)));
      };

      const systemPrompt = `You are "GST Buddy AI Accountant", an elite corporate tax auditor and CPA for the Indian business "${activeBusiness?.name || 'Apex Retailers'}" (GSTIN: ${activeBusiness?.gstin || '29ABCDE1234F2Z5'}, State: ${activeBusiness?.state || 'Karnataka'}).
You have loaded the following invoices as active context:
${bills.length === 0 ? '- No invoices uploaded yet.' : bills.map((b, i) => `- Inv #${b.invoiceNumber} from ${b.supplierName} | Date: ${b.invoiceDate} | Taxable: ₹${b.amount} | GST: ₹${b.taxAmount} | Total: ₹${b.totalAmount} | Category: ${b.expenseType} | Status: ${b.filed ? 'Filed' : 'Pending'}`).join('\n')}

Rules for responding:
1. Speak with absolute precision, referencing specific invoice numbers, dates, and amounts.
2. Structure your response under clear headers:
   - **Answer**: The direct response to the user's query.
   - **Reasoning / Evidence**: Reference specific GST acts, CGST/SGST rules, or invoice line items.
   - **Action Item**: Actionable next step for the shopkeeper/CFO.
3. Be professional, direct, and explainable. No black box responses.
4. Keep responses detailed but concise enough to scan quickly.`;

      const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${GROQ_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userMessage },
          ],
          model: 'llama-3.3-70b-versatile',
          temperature: 0.2,
          max_tokens: 1024,
          stream: true,
        }),
      });

      if (!response.ok) {
        throw new Error(`API Error: ${response.status}`);
      }

      const reader = response.body.getReader();
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
                updateStreamingMessage(tempMessageId, fullResponse);
              }
            } catch (e) { }
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
      await callGroqAPI(queryText);
    } catch (error) {
      const errorMessage = {
        id: Date.now() + 1,
        type: 'bot',
        text: "I apologize, but I'm having trouble connecting to the AI Accountant service right now. Please try again. Action item: verify network connection and Groq API key configuration.",
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
          <button className="chip-interactive" onClick={(e) => handleSendMessage(e, 'Verify Input Tax Credit balance')} style={{ fontSize: '0.75rem' }}>💰 Check ITC Balance</button>
          <button className="chip-interactive" onClick={(e) => handleSendMessage(e, 'Analyze current expense leakage')} style={{ fontSize: '0.75rem' }}>🔍 Find Expense Leakage</button>
          <button className="chip-interactive" onClick={(e) => handleSendMessage(e, 'Suggest tax optimization strategies')} style={{ fontSize: '0.75rem' }}>💡 Optimize Taxes</button>
          <button className="chip-interactive" onClick={(e) => handleSendMessage(e, 'Check invoice math discrepancies')} style={{ fontSize: '0.75rem' }}>⚠️ Audit Invoices</button>
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
