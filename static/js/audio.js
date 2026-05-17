class SynthProcessor extends AudioWorkletProcessor {
    constructor() {
        super();
        this.queue = [];
        this.idx = 0;
        this.pending = false;
        this.port.onmessage = (e) => {
            if (e.data instanceof Float32Array) {
                this.queue.push(e.data);
                this.pending = false;
            }
        };
    }
    process(inputs, outputs) {
        const out = outputs[0];
        if (!out || !out[0]) return true;
        const ch = out[0];
        if (this.queue.length === 0) {
            ch.fill(0);
            if (!this.pending) { this.pending = true; this.port.postMessage("need_data"); }
            return true;
        }
        let buf = this.queue[0];
        for (let i = 0; i < ch.length; i++) {
            if (this.idx >= buf.length) {
                this.queue.shift();
                if (this.queue.length === 0) {
                    ch.fill(0, i);
                    if (!this.pending) { this.pending = true; this.port.postMessage("need_data"); }
                    return true;
                }
                buf = this.queue[0];
                this.idx = 0;
            }
            ch[i] = buf[this.idx++];
        }
        if (this.queue.length <= 1 && !this.pending) {
            this.pending = true;
            this.port.postMessage("need_data");
        }
        return true;
    }
}
registerProcessor("audio", SynthProcessor);
