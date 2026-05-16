import init from '/game/game.js';

init().then(() => {
    if (window.initSubstrate) window.initSubstrate();
    const canvases = document.querySelectorAll('canvas');
    const gameCanvas = Array.from(canvases).find(c => c.id !== 'bg-canvas');
    if (gameCanvas) {
        gameCanvas.id = 'game-canvas';
        document.querySelector('.canvas-inner').appendChild(gameCanvas);
    }
});

let audioCtx = null;
let isAudioPlaying = false;
let audioEngineRef = null;
let synthWorkletNode = null;
const btn = document.getElementById('audio-toggle');

let audioInitialized = false;
document.addEventListener('pointerdown', async () => {
    if (audioInitialized) return;
    audioInitialized = true;
    btn.textContent = "AUDIO: LOADING...";
    audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    if (audioCtx.audioWorklet) {
        const workletCode = `
                    import init, { AudioEngine } from '/game/game.js';
                    class SynthProcessor extends AudioWorkletProcessor {
                        constructor() {
                            super();
                            this.engine = null;
                            this.buffer = new Float32Array(128);
                            init().then(() => {
                                this.engine = new AudioEngine(sampleRate);
                            }).catch(e => console.error("WASM Load Error in Worklet:", e));
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
                            } catch (e) {
                                console.error("Audio Engine Error:", e);
                                return false;
                            }
                            return true;
                        }
                    }
                    registerProcessor('synth-processor', SynthProcessor);
                `;
        const blob = new Blob([workletCode], { type: 'application/javascript' });
        const workletUrl = URL.createObjectURL(blob);
        try {
            await audioCtx.audioWorklet.addModule(workletUrl);
            synthWorkletNode = new AudioWorkletNode(audioCtx, 'synth-processor');
            synthWorkletNode.connect(audioCtx.destination);
            btn.textContent = "AUDIO: OFF";
        } catch (err) {
            console.error("Failed to load AudioWorklet:", err);
            btn.textContent = "AUDIO: ERROR";
        }
    } else {
        console.warn("AudioWorklet undefined (unsecure HTTP context). Using ScriptProcessorNode fallback.");
        try {
            const module = await import('/game/game.js');
            audioEngineRef = new module.AudioEngine(audioCtx.sampleRate);
            const bufferSize = 4096;
            const scriptNode = audioCtx.createScriptProcessor(bufferSize, 1, 1);
            const buffer = new Float32Array(bufferSize);
            scriptNode.onaudioprocess = function (audioProcessingEvent) {
                const outputBuffer = audioProcessingEvent.outputBuffer;
                const channel = outputBuffer.getChannelData(0);
                audioEngineRef.process(buffer);
                for (let i = 0; i < bufferSize; i++) {
                    channel[i] = buffer[i];
                }
            };
            const dummyOsc = audioCtx.createOscillator();
            dummyOsc.connect(scriptNode);
            scriptNode.connect(audioCtx.destination);
            btn.textContent = "AUDIO: OFF";
        } catch (err) {
            console.error("Failed to load ScriptProcessorNode fallback:", err);
            btn.textContent = "AUDIO: ERROR";
        }
    }
});

btn.addEventListener('click', (e) => {
    e.stopPropagation();
    if (!audioCtx) return;
    if (synthWorkletNode) synthWorkletNode.port.postMessage('toggle_music');
    if (audioEngineRef) audioEngineRef.toggle_music();
    isAudioPlaying = !isAudioPlaying;
    if (isAudioPlaying) {
        btn.textContent = "AUDIO: ON";
        btn.classList.add('active');
    } else {
        btn.textContent = "AUDIO: OFF";
        btn.classList.remove('active');
    }
});

window.playUISound = function (type) {
    if (synthWorkletNode) synthWorkletNode.port.postMessage(type);
    if (audioEngineRef) {
        if (type === 'click') audioEngineRef.play_ui_click();
        if (type === 'hover') audioEngineRef.play_ui_hover();
    }
};

document.querySelectorAll('button').forEach(b => {
    b.addEventListener('mouseenter', () => window.playUISound('hover'));
    b.addEventListener('click', () => window.playUISound('click'));
});
