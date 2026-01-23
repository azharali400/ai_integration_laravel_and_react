import React, { useState, useEffect, useRef } from 'react';
import { echo } from './echo'; // Ensure echo.js is created

function App() {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [status, setStatus] = useState('');
  const [isStreaming, setIsStreaming] = useState(false);
  const scrollRef = useRef(null);

  // Reverb Listener: Real-time status updates ke liye
  useEffect(() => {
    const channel = echo.channel('chat-room')
      .listen('ChatStatusEvent', (e) => {
        console.log("Reverb Signal:", e.status);
        setStatus(e.status);
      });

    return () => echo.leaveChannel('chat-room');
  }, []);

  // Auto Scroll: Jab naya message aaye toh niche jaye
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, status]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!input.trim() || isStreaming) return;

    const userMessage = { role: 'user', content: input };
    setMessages((prev) => [...prev, userMessage]);
    setInput('');
    setIsStreaming(true);

    try {
      const response = await fetch('http://127.0.0.1:8000/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
        body: JSON.stringify({ message: input }),
      });

      if (!response.ok) throw new Error('Network response was not ok');

      // Streaming Reader Setup
      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let aiContent = '';

      // AI ka khali message pehle hi add kar dein taake stream usme update ho
      setMessages((prev) => [...prev, { role: 'assistant', content: '' }]);

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value);
        const lines = chunk.split('\n');

        lines.forEach((line) => {
          if (line.startsWith('data: ')) {
            const dataText = line.substring(6).trim(); // "data: " ko hatao aur spaces saaf karo

            // AGAR [DONE] AAYE TOH STOP KARO (Yehi fix hai)
            if (dataText === '[DONE]') {
              console.log("Stream Finished");
              return; 
            }

            try {
              const data = JSON.parse(dataText);
              if (data.content) {
                aiContent += data.content;
                setMessages((prev) => {
                  const newMessages = [...prev];
                  newMessages[newMessages.length - 1].content = aiContent;
                  return newMessages;
                });
              }
            } catch (err) {
              console.error("JSON Parse Error", err, "Line was:", line);
            }
          }
        });
      }
    } catch (error) {
      console.error("Stream Error:", error);
      setStatus('Error connecting to AI');
    } finally {
      setIsStreaming(false);
      setStatus(''); // AI chup ho jaye toh status saaf
    }
  };

  return (
    <div style={styles.wrapper}>
      <div style={styles.container}>
        <header style={styles.header}>
          <span style={{fontSize: '20px', marginRight: '8px'}}></span> 
          My Personal AI
        </header>

        <div style={styles.chatBox} ref={scrollRef}>
          {messages.map((msg, i) => (
            <div key={i} style={msg.role === 'user' ? styles.userRow : styles.aiRow}>
              <div style={msg.role === 'user' ? styles.userBubble : styles.aiBubble}>
                {msg.content}
              </div>
            </div>
          ))}
          
          {status && (
            <div style={styles.aiRow}>
              <div style={styles.status}>
                <span className="typing-dot">●</span>
                <span className="typing-dot">●</span>
                <span className="typing-dot">●</span>
                {status}
              </div>
            </div>
          )}
        </div>

        <form onSubmit={handleSubmit} style={styles.inputArea}>
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask me anything..."
            style={styles.input}
            onFocus={(e) => e.target.style.borderColor = '#2563eb'}
            onBlur={(e) => e.target.style.borderColor = '#d1d5db'}
          />
          <button type="submit" style={styles.button} disabled={isStreaming}>
            {isStreaming ? '...' : 'Send'}
          </button>
        </form>
      </div>
    </div>
  );
}

// Simple Styles for Better Look
const styles = {
  // Poori screen ko cover karne ke liye aur content center karne ke liye
  wrapper: {
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    height: '100vh',
    width: '100vw',
    backgroundColor: '#e5e7eb', // Halka grey background
    margin: 0,
    padding: 0,
    overflow: 'hidden'
  },
  
  // Main Chat Box
  container: { 
    width: '95%',
    maxWidth: '800px', 
    fontFamily: '"Segoe UI", Roboto, Helvetica, Arial, sans-serif', 
    display: 'flex', 
    flexDirection: 'column', 
    height: '85vh', 
    backgroundColor: '#ffffff', 
    borderRadius: '16px', 
    boxShadow: '0 10px 25px rgba(0,0,0,0.1)', // Soft shadow
    overflow: 'hidden',
    position: 'relative'
  },

  // Top Bar
  header: { 
    padding: '15px 20px', 
    borderBottom: '1px solid #eee', 
    backgroundColor: '#ffffff', 
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontWeight: 'bold',
    color: '#1f2937'
  },

  // Messages Area
  chatBox: { 
    flex: 1, 
    overflowY: 'auto', 
    padding: '20px', 
    display: 'flex', 
    flexDirection: 'column', 
    gap: '12px',
    backgroundColor: '#f9fafb' 
  },

  // Message Rows
  userRow: { 
    alignSelf: 'flex-end', 
    maxWidth: '80%', 
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'flex-end'
  },
  aiRow: { 
    alignSelf: 'flex-start', 
    maxWidth: '80%',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'flex-start'
  },

  // Message Bubbles
  userBubble: { 
    padding: '12px 16px', 
    borderRadius: '18px 18px 2px 18px', 
    backgroundColor: '#2563eb', // Nice Blue
    color: '#ffffff',
    fontSize: '15px',
    lineHeight: '1.5',
    boxShadow: '0 2px 5px rgba(37, 99, 235, 0.2)'
  },
  aiBubble: { 
    padding: '12px 16px', 
    borderRadius: '18px 18px 18px 2px', 
    backgroundColor: '#ffffff', 
    color: '#374151',
    fontSize: '15px',
    lineHeight: '1.5',
    border: '1px solid #e5e7eb',
    boxShadow: '0 2px 5px rgba(0,0,0,0.02)'
  },

  // Status/Typing Indicator
  status: { 
    fontSize: '13px', 
    color: '#6b7280', 
    fontStyle: 'italic', 
    padding: '5px 10px',
    display: 'flex',
    alignItems: 'center',
    gap: '5px'
  },

  // Input Area Bottom
  inputArea: { 
    padding: '20px', 
    display: 'flex', 
    gap: '10px', 
    backgroundColor: '#ffffff', 
    borderTop: '1px solid #eee' 
  },
  input: { 
    flex: 1, 
    padding: '12px 20px', 
    borderRadius: '25px', 
    border: '1px solid #d1d5db', 
    outline: 'none',
    fontSize: '15px',
    transition: 'border-color 0.2s',
    backgroundColor: '#f3f4f6'
  },
  button: { 
    padding: '10px 20px', 
    borderRadius: '25px', 
    border: 'none', 
    backgroundColor: '#2563eb', 
    color: '#fff', 
    fontWeight: '600',
    cursor: 'pointer',
    transition: 'background-color 0.2s',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center'
  }
};

export default App;