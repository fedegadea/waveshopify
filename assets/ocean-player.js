/* ── WAVES Ocean Sound Player ── */
class OceanPlayer {
  constructor() {
    this.ctx = null;
    this.nodes = [];
    this.playing = false;
  }

  _noise(ctx) {
    const size = ctx.sampleRate * 3;
    const buf  = ctx.createBuffer(2, size, ctx.sampleRate);
    for (let ch = 0; ch < 2; ch++) {
      const d = buf.getChannelData(ch);
      let last = 0;
      for (let i = 0; i < size; i++) {
        const white = Math.random() * 2 - 1;
        last = (last + 0.08 * white) / 1.08; // pink-ish
        d[i] = last * 3.5;
      }
    }
    const src = ctx.createBufferSource();
    src.buffer = buf;
    src.loop = true;
    return src;
  }

  play() {
    if (this.playing) return;
    this.ctx = new (window.AudioContext || window.webkitAudioContext)();
    const ctx = this.ctx;

    // Noise source
    const noise = this._noise(ctx);

    // Low-pass: quita el hiss, deja graves suaves
    const lp = ctx.createBiquadFilter();
    lp.type = 'lowpass';
    lp.frequency.value = 520;
    lp.Q.value = 0.6;

    // High-pass: saca rumble muy bajo
    const hp = ctx.createBiquadFilter();
    hp.type = 'highpass';
    hp.frequency.value = 60;

    // Master gain
    const master = ctx.createGain();
    master.gain.value = 0;
    master.gain.linearRampToValueAtTime(0.55, ctx.currentTime + 2.5); // fade in

    // LFO para simular olas (sube y baja el volumen)
    const lfo = ctx.createOscillator();
    lfo.type = 'sine';
    lfo.frequency.value = 0.09; // ~1 ola cada 11 segundos

    const lfoGain = ctx.createGain();
    lfoGain.gain.value = 0.18;

    lfo.connect(lfoGain);
    lfoGain.connect(master.gain);

    // Segunda LFO más rápida para textura
    const lfo2 = ctx.createOscillator();
    lfo2.type = 'sine';
    lfo2.frequency.value = 0.22;
    const lfoGain2 = ctx.createGain();
    lfoGain2.gain.value = 0.07;
    lfo2.connect(lfoGain2);
    lfoGain2.connect(master.gain);

    noise.connect(hp);
    hp.connect(lp);
    lp.connect(master);
    master.connect(ctx.destination);

    noise.start();
    lfo.start();
    lfo2.start();

    this.nodes = [noise, lfo, lfo2];
    this.master = master;
    this.playing = true;
  }

  stop() {
    if (!this.playing || !this.ctx) return;
    const ctx = this.ctx;
    this.master.gain.setTargetAtTime(0, ctx.currentTime, 0.8); // fade out suave
    setTimeout(() => {
      this.nodes.forEach(n => { try { n.stop(); } catch(e) {} });
      ctx.close();
      this.playing = false;
      this.ctx = null;
    }, 2500);
  }
}

// Init cuando el DOM esté listo
document.addEventListener('DOMContentLoaded', () => {
  const btn = document.getElementById('ocean-play-btn');
  if (!btn) return;

  const player = new OceanPlayer();
  const label  = btn.querySelector('.ocean-btn-label');
  const icon   = btn.querySelector('.ocean-btn-icon');

  btn.addEventListener('click', () => {
    if (player.playing) {
      player.stop();
      btn.classList.remove('playing');
      label.textContent = 'Escuchá el sonido del mar';
      icon.textContent  = '▶';
    } else {
      player.play();
      btn.classList.add('playing');
      label.textContent = 'Detener preview';
      icon.textContent  = '⏹';
    }
  });
});
