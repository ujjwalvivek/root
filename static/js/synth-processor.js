class SynthProcessor extends AudioWorkletProcessor {
  constructor() {
    super();
    this.buf = null;
    this.idx = 0;
    this.port.onmessage = e => {
      if (e.data instanceof Float32Array) { this.buf = e.data; this.idx = 0; }
    };
  }
  process(inputs, outputs) {
    const out = outputs[0];
    if (!out || !out[0]) return true;
    const ch = out[0];
    if (this.buf && this.idx < this.buf.length) {
      for (let i = 0; i < ch.length; i++) {
        ch[i] = this.idx < this.buf.length ? this.buf[this.idx++] : 0;
      }
    } else {
      ch.fill(0);
    }
    return true;
  }
}

registerProcessor('synth-processor', SynthProcessor);
