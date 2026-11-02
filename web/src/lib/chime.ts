// Aviso sonoro de pedido nuevo para la cocina (dos notas, sin archivos de audio).
export function playChime() {
  try {
    const AudioCtx = window.AudioContext ?? (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    const context = new AudioCtx();
    [880, 1318.5].forEach((frequency, index) => {
      const start = context.currentTime + index * 0.18;
      const oscillator = context.createOscillator();
      const gain = context.createGain();
      oscillator.type = 'sine';
      oscillator.frequency.value = frequency;
      gain.gain.setValueAtTime(0.0001, start);
      gain.gain.exponentialRampToValueAtTime(0.25, start + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, start + 0.35);
      oscillator.connect(gain).connect(context.destination);
      oscillator.start(start);
      oscillator.stop(start + 0.4);
    });
    window.setTimeout(() => context.close(), 1000);
  } catch {
    // sin audio disponible
  }
}
