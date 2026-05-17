import init, { AudioEngine } from '/game/game.js';

class SynthProcessor extends AudioWorkletProcessor {
  constructor() {
    super();
    this.engine = null;
    this.buffer = new Float32Array(128);
    init().then(() => { this.engine = new AudioEngine(sampleRate); }).catch(e => console.error("WASM Load Error in Worklet:", e));
    this.port.onmessage = (e) => {
      if (!this.engine) return;
      if (e.data === 'click') this.engine.play_ui_click();
      if (e.data === 'hover') this.engine.play_ui_hover();
      if (e.data === 'toggle_music') this.engine.toggle_music();
    };
  }
  process(inputs, outputs, parameters) {
    if (!this.engine) return true;
    const output = outputs[0];
    const channel = output[0];
    try {
      this.engine.process(this.buffer);
      for (let i = 0; i < channel.length; ++i) {
        channel[i] = this.buffer[i];
        if (output[1]) output[1][i] = this.buffer[i];
      }
    } catch (e) { console.error("Audio Engine Error:", e); return false; }
    return true;
  }
}

registerProcessor('synth-processor', SynthProcessor);
