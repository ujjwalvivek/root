import { loop, compose, primitives, } from "https://cdn.ujjwalvivek.com/scripts/substrate/latest/main.js";
function installGlobal(name, value) {
    if (typeof globalThis[name] === "function") return;
    try { globalThis[name] = value; } catch (_) { Object.defineProperty(globalThis, name, { value, configurable: true }); }
}
function normalizeBytes(input) {
    if (!input) return new Uint8Array();
    if (input instanceof Uint8Array) return input;
    if (ArrayBuffer.isView(input)) { return new Uint8Array(input.buffer, input.byteOffset, input.byteLength); }
    return new Uint8Array(input);
}
function installEncodingFallbacks() {
    installGlobal("TextDecoder",
        class {
            decode(input) {
                const bytes = normalizeBytes(input);
                let output = "";
                for (let i = 0; i < bytes.length; i++) {
                    const b1 = bytes[i];
                    if (b1 < 0x80) {
                        output += String.fromCharCode(b1);
                    } else if (b1 >= 0xc0 && b1 < 0xe0 && i + 1 < bytes.length) {
                        const b2 = bytes[++i] & 0x3f;
                        output += String.fromCharCode(((b1 & 0x1f) << 6) | b2);
                    } else if (b1 >= 0xe0 && b1 < 0xf0 && i + 2 < bytes.length) {
                        const b2 = bytes[++i] & 0x3f;
                        const b3 = bytes[++i] & 0x3f;
                        output += String.fromCharCode(((b1 & 0x0f) << 12) | (b2 << 6) | b3);
                    } else if (b1 >= 0xf0 && b1 < 0xf8 && i + 3 < bytes.length) {
                        const b2 = bytes[++i] & 0x3f;
                        const b3 = bytes[++i] & 0x3f;
                        const b4 = bytes[++i] & 0x3f;
                        const codePoint = ((b1 & 0x07) << 18) | (b2 << 12) | (b3 << 6) | b4;
                        output += String.fromCodePoint(codePoint);
                    } else { output += "\ufffd"; }
                } return output;
            }
        },
    );
    installGlobal("TextEncoder",
        class {
            encode(input = "") {
                const str = String(input);
                const bytes = [];
                for (let i = 0; i < str.length; i++) {
                    let codePoint = str.codePointAt(i);
                    if (codePoint > 0xffff) i++;
                    if (codePoint < 0x80) {
                        bytes.push(codePoint);
                    } else if (codePoint < 0x800) {
                        bytes.push(0xc0 | (codePoint >> 6), 0x80 | (codePoint & 0x3f));
                    } else if (codePoint < 0x10000) {
                        bytes.push(0xe0 | (codePoint >> 12), 0x80 | ((codePoint >> 6) & 0x3f), 0x80 | (codePoint & 0x3f));
                    } else {
                        bytes.push(0xf0 | (codePoint >> 18), 0x80 | ((codePoint >> 12) & 0x3f), 0x80 | ((codePoint >> 6) & 0x3f), 0x80 | (codePoint & 0x3f));
                    }
                } return new Uint8Array(bytes);
            }
            encodeInto(input, view) {
                const bytes = this.encode(input);
                const written = Math.min(bytes.length, view.length);
                view.set(bytes.subarray(0, written));
                return { read: String(input).length, written };
            }
        },
    );
}
let gameModulePromise = null;
let gameInitPromise = null;
function loadGameModule() {
    if (!gameModulePromise) {
        installEncodingFallbacks();
        gameModulePromise = import("/game/game.js").catch((err) => { gameModulePromise = null; throw err; });
    } return gameModulePromise;
}
function initGame() {
    if (!gameInitPromise) {
        gameInitPromise = loadGameModule().then(async (mod) => { await mod.default(); return mod; }).catch((err) => { gameInitPromise = null; throw err; });
    } return gameInitPromise;
}
const body = document.body;
const container = document.createElement("div");
container.className = "container container--scroll";
container.id = "hero-container";
const heroText = document.createElement("div");
heroText.className = "hero-text";
const subtitle = document.createElement("p");
subtitle.className = "hero-subtitle";
subtitle.textContent = "";
heroText.appendChild(subtitle);
container.appendChild(heroText);
const textToType = "TERMINAL ACCESS GRANTED";
let typeIndex = 0;
function typeWriter() {
    if (typeIndex < textToType.length) {
        subtitle.textContent += textToType.charAt(typeIndex);
        typeIndex++;
        setTimeout(typeWriter, 40 + Math.random() * 40);
    }
}
setTimeout(typeWriter, 800);
const wrapper = document.createElement("div");
wrapper.className = "canvas-wrapper";
const inner = document.createElement("div");
inner.className = "canvas-inner";
const spinner = document.createElement("div");
spinner.className = "canvas-spinner";
inner.appendChild(spinner);
wrapper.appendChild(inner);
const pathAudioOn = "M3 7h2v5H3zm4 0h2v13H7zm4-3h2v16h-2zm4 0h2v13h-2zM5 5h2v2H5zm4 15h2v2H9zm4-18h2v2h-2zm4 15h2v2h-2zm2-5h2v5h-2zm2-2h2v2h-2zM1 12h2v2H1z";
const pathAudioOff = "M12 7h2v1h1v1h2V8h1V7h2v2h-1v1h-1v2h1v1h1v2h-2v-1h-1v-1h-2v1h-1v1h-2v-2h1v-1h1v-2h-1V9h-1zM6 8V7h1V6h1V5h1V4h1V3h1v16h-1v-1H9v-1H8v-1H7v-1H6v-1H2V8zm1 2H4v2h3v1h1v1h1V8H8v1H7z";
const audioBtn = document.createElement("button");
audioBtn.className = "audio-toggle";
audioBtn.id = "audio-toggle";
audioBtn.innerHTML = `<svg viewBox="0 0 24 24" width="24" height="24"><path fill="currentColor" d="${pathAudioOff}" /></svg>`;
wrapper.appendChild(audioBtn);
container.appendChild(wrapper);
window.updateAudioIcon = function (state) {
    if (state === "error") {
        audioBtn.textContent = "error";
    } else {
        const d = state === "on" ? pathAudioOn : pathAudioOff;
        audioBtn.innerHTML = `<svg viewBox="0 0 24 24" width="24" height="24"><path fill="currentColor" d="${d}" /></svg>`;
    }
};
const dash = document.createElement("div");
dash.className = "dashboard-section";
const dashHeader = document.createElement("div");
dashHeader.className = "dashboard-header";
dashHeader.innerHTML = `<span class="prompt">root@ujjwalvivek:~$</span> ls -la`;
dash.appendChild(dashHeader);
const actions = document.createElement("div");
actions.className = "action-buttons";
const baseBadge = "bg=111111&badgeColor=513600&textColor=e8e8e8&border=ffaa00&borderWidth=2&rx=0&px=0&py=0";
const dashboardLinks = [
    {
        title: "ujjwalvivek.com", url: "https://ujjwalvivek.com", badges: [
            { img: `https://echopoint.ujjwalvivek.com/svg/badges/custom?${baseBadge}&logo=github&leftText=code&rightText=MIT`, href: "https://github.com/ujjwalvivek/portfolio/blob/main/LICENSE", },
            { img: `https://echopoint.ujjwalvivek.com/svg/badges/custom?${baseBadge}&logo=github&leftText=logs&rightText=MD`, href: "https://ujjwalvivek.com/blog", },
            { img: `https://echopoint.ujjwalvivek.com/svg/badges/stars?repo=portfolio&${baseBadge}&logo=github`, href: "https://github.com/ujjwalvivek/portfolio", },
        ],
    },
    {
        title: "journey.ujjwalvivek.com", url: "https://journey.ujjwalvivek.com", badges: [
            { img: `https://echopoint.ujjwalvivek.com/svg/badges/custom?${baseBadge}&logo=github&leftText=code&rightText=MIT`, href: "https://github.com/ujjwalvivek/journey/blob/main/LICENSE", },
            { img: `https://echopoint.ujjwalvivek.com/svg/badges/custom?${baseBadge}&logo=game&leftText=game&rightText=PLAY`, href: "https://journey.ujjwalvivek.com", },
            { img: `https://echopoint.ujjwalvivek.com/svg/badges/custom?${baseBadge}&logo=docs&leftText=docs&rightText=MD`, href: "https://docs.journey.ujjwalvivek.com", },
            { img: `https://echopoint.ujjwalvivek.com/svg/badges/cargo?crate=journey-engine&${baseBadge}&logo=rust`, href: "https://crates.io/users/ujjwalvivek", },
            { img: `https://echopoint.ujjwalvivek.com/svg/badges/stars?repo=journey&${baseBadge}&logo=github`, href: "https://github.com/ujjwalvivek/journey", },
        ],
    },
    {
        title: "substrate.ujjwalvivek.com", url: "https://substrate.ujjwalvivek.com", badges: [
            { img: `https://echopoint.ujjwalvivek.com/svg/badges/custom?${baseBadge}&logo=github&leftText=code&rightText=MIT`, href: "https://github.com/ujjwalvivek/substrate/blob/main/LICENSE", },
            { img: `https://echopoint.ujjwalvivek.com/svg/badges/custom?${baseBadge}&logo=game&leftText=bg&rightText=PLAY`, href: "https://substrate.ujjwalvivek.com/", },
            { img: `https://echopoint.ujjwalvivek.com/svg/badges/custom?${baseBadge}&logo=docs&leftText=docs&rightText=MD`, href: "https://substrate.ujjwalvivek.com/#/docs", },
            { img: `https://echopoint.ujjwalvivek.com/svg/badges/stars?repo=substrate&${baseBadge}&logo=github`, href: "https://github.com/ujjwalvivek/substrate", },
        ],
    },
    {
        title: "echopoint.ujjwalvivek.com", url: "https://echopoint.ujjwalvivek.com", badges: [
            { img: `https://echopoint.ujjwalvivek.com/svg/badges/custom?${baseBadge}&logo=github&leftText=code&rightText=MIT`, href: "https://github.com/ujjwalvivek/echopoint/blob/main/LICENSE", },
            { img: `https://echopoint.ujjwalvivek.com/svg/badges/custom?${baseBadge}&logo=game&leftText=svg&rightText=GENERATOR`, href: "https://echopoint.ujjwalvivek.com/#docs", },
            { img: `https://echopoint.ujjwalvivek.com/svg/status?target=echopoint&${baseBadge}&logo=globe`, href: "https://echopoint.ujjwalvivek.com/v1/health", },
            { img: `https://echopoint.ujjwalvivek.com/svg/badges/stars?repo=echopoint&${baseBadge}&logo=github`, href: "https://github.com/ujjwalvivek/echopoint", },
        ],
    },
    {
        title: "synclippy.ujjwalvivek.com", url: "https://synclippy.ujjwalvivek.com", badges: [
            { img: `https://echopoint.ujjwalvivek.com/svg/badges/custom?${baseBadge}&logo=github&leftText=code&rightText=MIT`, href: "https://github.com/ujjwalvivek/synclippy/blob/main/LICENSE", },
            { img: `https://echopoint.ujjwalvivek.com/svg/badges/docker?image=synclippy&${baseBadge}&logo=docker`, href: "https://hub.docker.com/r/ujjwalvivek/synclippy", },
            { img: `https://echopoint.ujjwalvivek.com/svg/badges/custom?${baseBadge}&logo=game&leftText=open&rightText=SYNCLIPPY`, href: "https://synclippy.ujjwalvivek.com/", },
            { img: `https://echopoint.ujjwalvivek.com/svg/badges/stars?repo=synclippy&${baseBadge}&logo=github`, href: "https://github.com/ujjwalvivek/synclippy", },
        ],
    },
    {
        title: "baremetal.ujjwalvivek.com", url: "https://baremetal.ujjwalvivek.com", badges: [
            { img: `https://echopoint.ujjwalvivek.com/svg/badges/custom?${baseBadge}&logo=github&leftText=code&rightText=MIT`, href: "https://github.com/ujjwalvivek/baremetal/blob/main/LICENSE", },
            { img: `https://echopoint.ujjwalvivek.com/svg/badges/custom?${baseBadge}&logo=game&leftText=open&rightText=TERMINAL`, href: "https://baremetal.ujjwalvivek.com/", },
            { img: `https://echopoint.ujjwalvivek.com/svg/badges/stars?repo=baremetal&${baseBadge}&logo=github`, href: "https://github.com/ujjwalvivek/baremetal", },
        ],
    },
    {
        title: "devhub.ujjwalvivek.com", url: "https://devhub.ujjwalvivek.com", badges: [
            { img: `https://echopoint.ujjwalvivek.com/svg/badges/custom?${baseBadge}&logo=github&leftText=code&rightText=MIT`, href: "https://github.com/ujjwalvivek/devhub/blob/main/LICENSE", },
            { img: `https://echopoint.ujjwalvivek.com/svg/badges/custom?${baseBadge}&logo=binaries&leftText=download&rightText=DEVHUB`, href: "https://devhub.ujjwalvivek.com/", },
            { img: `https://echopoint.ujjwalvivek.com/svg/badges/stars?repo=devhub&${baseBadge}&logo=github`, href: "https://github.com/ujjwalvivek/devhub", },
        ],
    },
    {
        title: "ujjwalvivek.itch.io", url: "https://ujjwalvivek.itch.io/", badges: [
            { img: `https://echopoint.ujjwalvivek.com/svg/badges/custom?${baseBadge}&logo=game&leftText=games&rightText=PLAY`, href: "https://ujjwalvivek.itch.io/", },
            { img: `https://echopoint.ujjwalvivek.com/svg/badges/npm?${baseBadge}&logo=npm&package=requiem`, href: "https://www.npmjs.com/package/requiem", },
            { img: `https://echopoint.ujjwalvivek.com/svg/badges/npm?${baseBadge}&logo=npm&package=dino-blink`, href: "https://www.npmjs.com/package/dino-blink", },
            { img: `https://echopoint.ujjwalvivek.com/svg/badges/npm?${baseBadge}&logo=npm&package=journey-engine`, href: "https://www.npmjs.com/package/journey-engine", },
        ],
    },
    {
        title: "github.com/ujjwalvivek/thereckoning", url: "https://github.com/ujjwalvivek/thereckoning", badges: [
            { img: `https://echopoint.ujjwalvivek.com/svg/badges/custom?${baseBadge}&logo=github&leftText=code&rightText=MIT`, href: "https://github.com/ujjwalvivek/thereckoning/blob/main/LICENSE", },
            { img: `https://echopoint.ujjwalvivek.com/svg/badges/stars?repo=thereckoning&${baseBadge}&logo=github`, href: "https://github.com/ujjwalvivek/thereckoning", },
        ],
    },
];
dashboardLinks.forEach((link) => {
    const row = document.createElement("div");
    row.className = "dashboard-row";
    const linkGroup = document.createElement("div");
    linkGroup.className = "link-group";
    const iconSvg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    iconSvg.setAttribute("viewBox", "0 0 24 24");
    iconSvg.setAttribute("width", "18");
    iconSvg.setAttribute("height", "18");
    iconSvg.setAttribute("class", "row-icon");
    const iconPath = document.createElementNS("http://www.w3.org/2000/svg", "path");
    iconPath.setAttribute("fill", "currentColor");
    iconPath.setAttribute("d", "M4 6h7v2H4zm0 10h7v2H4zM2 8h2v8H2zm18-2h-7v2h7zm0 10h-7v2h7zm2-8h-2v8h2zM7 11h10v2H7z");
    iconSvg.appendChild(iconPath);
    linkGroup.appendChild(iconSvg);
    const textLink = document.createElement("a");
    textLink.href = link.url;
    textLink.className = "hover-link text-link";
    if (link.url !== "#") textLink.target = "_blank";
    textLink.textContent = link.title;
    linkGroup.appendChild(textLink);
    row.appendChild(linkGroup);
    const leader = document.createElement("div");
    leader.className = "row-leader";
    row.appendChild(leader);
    const badgesContainer = document.createElement("div");
    badgesContainer.className = "badges-container";
    if (link.badges) {
        link.badges.forEach((badge) => {
            const a = document.createElement("a");
            a.href = badge.href;
            a.className = "hover-link badge-link";
            if (badge.href !== "#") a.target = "_blank";
            const b = document.createElement("img");
            b.src = badge.img;
            b.className = "link-badge";
            a.appendChild(b);
            badgesContainer.appendChild(a);
        });
    }
    row.appendChild(badgesContainer);
    actions.appendChild(row);
});
dash.appendChild(actions);
container.appendChild(dash);
const footer = document.createElement("div");
footer.className = "site-footer";
footer.innerHTML = `<span>[EOF]</span> &copy; ${new Date().getFullYear()} Ujjwal Vivek`;
container.appendChild(footer);
body.appendChild(container);
if (window.location.protocol !== "https:" && window.location.hostname !== "localhost" && window.location.hostname !== "127.0.0.1") {
    try {
        delete Navigator.prototype.gpu;
        Object.defineProperty(Navigator.prototype, "gpu", { get: () => undefined, configurable: true, });
    } catch (e) { }
    if (typeof window.GPUCanvasContext === "undefined") window.GPUCanvasContext = function () { };
    const og = HTMLCanvasElement.prototype.getContext;
    HTMLCanvasElement.prototype.getContext = function (type, ...args) {
        if (type === "webgpu") return Object.create(window.GPUCanvasContext.prototype);
        return og.apply(this, [type, ...args]);
    };
    if (navigator.gpu) navigator.gpu.requestAdapter = () => Promise.resolve(null);
}
window.initSubstrate = function initSubstrate() {
    const cv = document.createElement("canvas");
    cv.id = "bg-canvas";
    document.body.insertBefore(cv, document.body.firstChild);
    const mobile = /Mobi|Android|iPhone|iPad|iPod|webOS|IEMobile|Opera Mini/i.test(navigator.userAgent) || window.innerWidth < 768;
    const state = { speed: 0.05, fps: 60 };
    const scene = compose([
        { fn: primitives.background },
        { fn: primitives.grid, options: { opacity: 1.0, spacing: 100, warpAmount: 10 } },
        { fn: primitives.wireframes, options: { opacity: 0.5, density: mobile ? 0.6 : 1.0 } },
        { fn: primitives.particles, options: { opacity: 0.25 } },
        { fn: primitives.vignette, options: { opacity: 0.9, innerRadius: 0.3, outerRadius: 1.2 } },
    ]);
    const pal = { primary: "#404040", secondary: "#808080", accent: "#ffaa00", background: "#030303", };
    function resize() {
        cv.width = window.innerWidth;
        cv.height = window.innerHeight;
    }
    window.addEventListener("resize", resize);
    resize();
    loop(cv, scene, pal, state);
};
initGame()
    .then(() => {
        if (window.initSubstrate) window.initSubstrate();
        const canvases = document.querySelectorAll("canvas");
        const gameCanvas = Array.from(canvases).find((c) => c.id !== "bg-canvas");
        if (gameCanvas) {
            gameCanvas.id = "game-canvas";
            const ci = document.querySelector(".canvas-inner");
            ci.innerHTML = "";
            ci.appendChild(gameCanvas);
        }
    })
    .catch((err) => { console.error("Game init failed:", err); });
let audioCtx = null;
let isAudioPlaying = false;
let audioNode = null;
let audioScriptNode = null;
let audioEngineRef = null;
let audioRaf = null;
const btn = document.getElementById("audio-toggle");
let audioInitPromise = null;
function createScriptAudioNode() {
    const bufSize = 4096;
    const buf = new Float32Array(bufSize);
    const sn = audioCtx.createScriptProcessor(bufSize, 0, 1);
    sn.onaudioprocess = (e) => {
        const ch = e.outputBuffer.getChannelData(0);
        if (!audioEngineRef) { ch.fill(0); return; }
        audioEngineRef.process(buf);
        ch.set(buf.subarray(0, ch.length));
    };
    sn.connect(audioCtx.destination);
    audioScriptNode = sn;
    return sn;
}
async function createWorkletAudioNode() {
    await audioCtx.audioWorklet.addModule("/js/audio.js");
    const node = new AudioWorkletNode(audioCtx, "audio");
    node.connect(audioCtx.destination);
    const buf = new Float32Array(4096);
    function push() {
        if (!audioEngineRef) return;
        audioEngineRef.process(buf);
        node.port.postMessage(buf.slice());
        audioRaf = requestAnimationFrame(push);
    }
    push();
    audioNode = node;
    return node;
}
function initAudio() {
    if (audioInitPromise) return audioInitPromise;
    audioInitPromise = (async () => {
        try {
            audioCtx = new (window.AudioContext || window.webkitAudioContext)();
            const mod = await initGame();
            audioEngineRef = new mod.AudioEngine(audioCtx.sampleRate);
            if (audioCtx.audioWorklet && typeof AudioWorkletNode === "function") {
                try { await createWorkletAudioNode(); }
                catch (workletErr) {
                    console.warn("AudioWorklet unavailable, using ScriptProcessor fallback:", workletErr);
                    createScriptAudioNode();
                }
            } else { createScriptAudioNode(); }
            if (audioCtx.state === "suspended") await audioCtx.resume();
            return true;
        } catch (err) {
            console.error("Audio init failed:", err);
            window.updateAudioIcon("error");
            audioInitPromise = null;
            return false;
        }
    })();
    return audioInitPromise;
}
document.addEventListener("pointerdown", () => {
    initAudio();
});
btn.addEventListener("click", async (e) => {
    e.stopPropagation();
    if (await initAudio()) {
        if (audioEngineRef) audioEngineRef.toggle_music();
        isAudioPlaying = !isAudioPlaying;
        window.updateAudioIcon(isAudioPlaying ? "on" : "off");
        btn.classList.toggle("active", isAudioPlaying);
    }
});
window.playUISound = function (type) {
    if (audioEngineRef) { if (type === "click") audioEngineRef.play_ui_click(); if (type === "hover") audioEngineRef.play_ui_hover(); }
};
document.querySelectorAll("button, .hover-link, .dashboard-row").forEach((b) => {
    b.addEventListener("mouseenter", (e) => { e.stopPropagation(); window.playUISound("hover"); });
    b.addEventListener("click", (e) => { if (b.tagName !== "A" && b.tagName !== "BUTTON") return; window.playUISound("click"); });
});
