import { showToast } from './ui.js';

// Live voice emotion detection using Web Audio API.
// Heuristic: loud + choppy -> anger; soft + smooth -> sadness; else neutral.
// Upgrade point: plug in a TF.js SER model later.

document.addEventListener('DOMContentLoaded', () => {
  const micBtn = document.getElementById('emotionMicBtn');
  const label = document.getElementById('liveEmotionLabel');
  const logs = document.getElementById('emotionLogs');

  if (!micBtn) return;

  let audioCtx, analyser, source, mediaStream;
  let running = false;

  function log(line) {
    if (!logs) return;
    const div = document.createElement('div');
    div.textContent = `[${new Date().toLocaleTimeString()}] ${line}`;
    logs.appendChild(div);
  }

  async function start() {
    try {
      mediaStream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
      audioCtx = new (window.AudioContext || window.webkitAudioContext)();
      source = audioCtx.createMediaStreamSource(mediaStream);
      analyser = audioCtx.createAnalyser();
      analyser.fftSize = 2048;
      source.connect(analyser);

      running = true;
      showToast('Listening...', 'info');
      log('Mic started');

      const dataArray = new Float32Array(analyser.fftSize);
      const detectLoop = () => {
        if (!running) return;
        analyser.getFloatTimeDomainData(dataArray);

        // RMS energy
        let sumSquares = 0;
        for (let i = 0; i < dataArray.length; i++) {
          sumSquares += dataArray[i] * dataArray[i];
        }
        const rms = Math.sqrt(sumSquares / dataArray.length);

        // Zero-crossing rate like approximation
        let zc = 0;
        for (let i = 1; i < dataArray.length; i++) {
          if ((dataArray[i - 1] >= 0 && dataArray[i] < 0) || (dataArray[i - 1] < 0 && dataArray[i] >= 0)) {
            zc++;
          }
        }
        const zcr = zc / dataArray.length;

        let emotion = 'neutral';
        if (rms > 0.08 && zcr > 0.08) emotion = 'anger';
        else if (rms < 0.03 && zcr < 0.05) emotion = 'sadness';

        if (label) label.textContent = `Emotion: ${emotion}`;
        requestAnimationFrame(detectLoop);
      };
      detectLoop();
    } catch (err) {
      console.error(err);
      showToast('Mic error or blocked', 'error');
      log('Mic error: ' + err.message);
    }
  }

  function stop() {
    running = false;
    if (mediaStream) mediaStream.getTracks().forEach((t) => t.stop());
    if (audioCtx) audioCtx.close();
    showToast('Stopped', 'info');
    log('Mic stopped');
  }

  let active = false;
  micBtn.addEventListener('click', async () => {
    if (!active) {
      active = true;
      micBtn.textContent = 'Stop';
      await start();
    } else {
      active = false;
      micBtn.textContent = 'Mic';
      stop();
    }
  });
});
