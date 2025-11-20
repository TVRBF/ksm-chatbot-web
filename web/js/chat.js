import { apiFetch } from './api.js';
import { showToast } from './ui.js';

document.addEventListener('DOMContentLoaded', () => {
  const sendBtn = document.getElementById('sendBtn');
  const input = document.getElementById('messageInput');
  const box = document.getElementById('chatBox');
  const emotionToggle = document.getElementById('emotionToggle');
  const emotionLabel = document.getElementById('emotionLabel');

  function addMessage(role, text) {
    const wrap = document.createElement('div');
    wrap.className =
      'max-w-xl px-4 py-2 rounded ' +
      (role === 'user'
        ? 'bg-teal-600/30 border border-teal-500/40 ml-auto'
        : 'bg-slate-700 border border-slate-600');
    wrap.textContent = text;
    box.appendChild(wrap);
    box.scrollTop = box.scrollHeight;
  }

  function speak(text) {
    if (!('speechSynthesis' in window)) return;
    const u = new SpeechSynthesisUtterance(text);
    u.lang = 'en-US';
    speechSynthesis.speak(u);
  }

  async function detectTextEmotion(text) {
    try {
      const result = await apiFetch('/emotion/text', {
        method: 'POST',
        body: JSON.stringify({ text }),
      });
      return result;
    } catch {
      return { label: 'neutral' };
    }
  }

  async function loadHistory() {
    try {
      const data = await apiFetch('/chat/history', { method: 'GET' });
      (data.history || []).forEach((h) => {
        addMessage('user', h.message);
        addMessage('assistant', h.reply);
      });
    } catch (err) {
      console.warn('No history or not logged in yet.', err.message);
    }
  }

  async function sendToBackendChat(text) {
    const res = await apiFetch('/chat/send', {
      method: 'POST',
      body: JSON.stringify({ message: text }),
    });
    return res.reply || 'No reply';
  }

  // Load history on chat page
  if (box) loadHistory();

  if (sendBtn && input && box) {
    sendBtn.addEventListener('click', async () => {
      const msg = input.value.trim();
      if (!msg) return;

      addMessage('user', msg);
      input.value = '';

      if (emotionToggle?.checked && emotionLabel) {
        const emo = await detectTextEmotion(msg);
        emotionLabel.textContent = `Emotion: ${emo.label}`;
      }

      try {
        const reply = await sendToBackendChat(msg);
        addMessage('assistant', reply);
        speak(reply);
      } catch (err) {
        showToast(err.message || 'Chat error', 'error');
      }
    });
  }
});
