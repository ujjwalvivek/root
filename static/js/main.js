import { startBackground, setBackgroundViolet } from "./background.js";
import { links } from "./projects.js";
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
const hint = document.createElement("span");
hint.className = "hover-link hero-hint";
hint.setAttribute("role", "button");
hint.tabIndex = 0;
hint.textContent = "click to be counted";
heroText.appendChild(hint);
container.appendChild(heroText);

// (a tiny request, well before the game loads) and refreshed once a minute while the tab is visible.
let visitors = null;
let typed = false;
const headline = (n) => (n == null ? "ROOT ACCESS GRANTED" : `ROOT ACCESS GRANTED TO ${n.toLocaleString("en-US")} ${n === 1 ? "STRANGER" : "STRANGERS"}`);
const countReady = fetch("https://echopoint.ujjwalvivek.com/v1/click")
    .then((r) => (r.ok ? r.json() : null))
    .then((d) => (d && Number.isFinite(d.global) ? d.global : null))
    .catch(() => null);
function setVisitors(n) {
    if (n == null || n === visitors) return;
    visitors = n;
    if (typed) subtitle.textContent = headline(n);
}
// The headline starts typing straight away. The number is added once it is known, so nothing waits on the network.
countReady.then((n) => { if (n != null && visitors == null) visitors = n; });
function typeInto(text, done) {
    let i = 0;
    (function step() {
        if (i < text.length) {
            subtitle.textContent += text.charAt(i++);
            setTimeout(step, 40 + Math.random() * 40);
        } else done();
    })();
}
function finishHeadline() {
    typed = true;
    subtitle.textContent = headline(visitors);
    hint.classList.add("is-visible");
}
setTimeout(() => {
    const base = headline(null);
    typeInto(base, async () => {
        const n = visitors ?? await Promise.race([countReady, new Promise((r) => setTimeout(() => r(null), 1200))]);
        if (n == null) return finishHeadline();
        visitors = n;
        typeInto(headline(n).slice(base.length), finishHeadline);
    });
}, 150);
const CLICK_API = "https://echopoint.ujjwalvivek.com/v1/click";
setInterval(() => {
    if (document.hidden) return;
    fetch(CLICK_API).then((r) => (r.ok ? r.json() : null)).then((d) => { if (d && Number.isFinite(d.global)) setVisitors(Math.max(d.global, visitors ?? 0)); }).catch(() => { });
}, 60000);

// Clicking the hint adds one to the global count, every time. A streak of fast clicks makes the line below get less
// patient: the wording escalates, the text shakes harder and turns from slate to amber to red. After a couple of idle
// seconds it calms down and goes back to the original line.
const HINT_IDLE = "click to be counted";
const HINT_LINES = [
    "counted", "counted again", "yes, that one counted too", "you can stop now", "stop", "this is not a game",
    "it is a little bit a game", "please", "STOP.", "I SAID STOP", "YOUR FINGER IS FINE", "THERE ARE STRANGERS WAITING",
    "LOOK AT THE NUMBER", "YOU DID THAT", "THAT IS ONE PERSON", "ROOT HAS NOTICED", "ROOT IS WATCHING", "NOT FUNNY",
    "STOP CLICKING", "OKAY. KEEP GOING THEN", "...i give up",
];
const HINT_TAIL = ["still counting", "you are very persistent", "nobody asked for this", "root remembers", "this is your fault", "COUNTED. AGAIN."];
let streak = 0;
let calmTimer = 0;
function calmDown() {
    streak = 0;
    hint.classList.remove("is-shaking");
    hint.removeAttribute("data-heat");
    subtitle.classList.remove("is-rattled");
    hint.textContent = HINT_IDLE;
}
// Clicks are sent in bursts, not one request each.
let pendingClicks = 0;
let flushTimer = 0;
function queueClick() {
    pendingClicks++;
    clearTimeout(flushTimer);
    flushTimer = setTimeout(() => {
        const count = pendingClicks;
        pendingClicks = 0;
        fetch(CLICK_API, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ type: "click", count }) }).catch(() => { });
    }, 400);
}
function countMe() {
    queueClick();
    setVisitors((visitors ?? 0) + 1);
    if (window.playUISound) window.playUISound("click");
    streak++;
    hint.textContent = streak <= HINT_LINES.length ? HINT_LINES[streak - 1] : HINT_TAIL[Math.floor(Math.random() * HINT_TAIL.length)];
    const heat = streak >= 15 ? 3 : streak >= 9 ? 2 : streak >= 4 ? 1 : 0;
    if (heat) {
        hint.dataset.heat = heat;
        hint.style.setProperty("--amp", `${Math.min(0.5 + streak * 0.3, 6).toFixed(2)}px`);
        hint.style.setProperty("--shake", `${Math.max(0.05, 0.14 - streak * 0.004).toFixed(3)}s`);
        hint.classList.remove("is-shaking");
        void hint.offsetWidth;
        hint.classList.add("is-shaking");
    }
    subtitle.classList.toggle("is-rattled", heat >= 2);
    clearTimeout(calmTimer);
    calmTimer = setTimeout(calmDown, 2400);
}
hint.addEventListener("click", (e) => { e.stopPropagation(); countMe(); });
hint.addEventListener("keydown", (e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); countMe(); } });
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
const EP = "https://echopoint.ujjwalvivek.com";
const GH = "https://github.com/ujjwalvivek";
const NPM = "https://www.npmjs.com/package/@ujjwalvivek";
const baseBadge = "bg=111111&badgeColor=513600&textColor=e8e8e8&border=ffaa00&borderWidth=2&rx=0&px=0&py=0";
function badgeFor(b) {
    switch (b.kind) {
        case "custom": return { img: `${EP}/svg/root/custom?${baseBadge}&logo=${b.logo}&leftText=${b.left}&rightText=${b.right}`, href: b.href };
        case "stars": return { img: `${EP}/svg/root/stars?repo=${b.repo}&${baseBadge}&logo=github`, href: `${GH}/${b.repo}` };
        case "npm": return { img: `${EP}/svg/root/npm?${baseBadge}&logo=npm&package=${b.alias || b.pkg}`, href: `${NPM}/${b.pkg}` };
        case "cargo": return { img: `${EP}/svg/root/cargo?crate=${b.crate}&${baseBadge}&logo=rust`, href: `https://crates.io/crates/${b.crate}` };
        case "pypi": return { img: `${EP}/svg/root/pypi?package=${b.pkg}&${baseBadge}&logo=python`, href: `https://pypi.org/project/${b.pkg}` };
        case "docker": return { img: `${EP}/svg/root/docker?image=${b.image}&${baseBadge}&logo=docker`, href: `https://hub.docker.com/r/ujjwalvivek/${b.image}` };
        case "status": return { img: `${EP}/svg/root/status?target=${b.target}&${baseBadge}&logo=globe`, href: b.href };
    }
}
// Rough size of a badge before its svg arrives, so the skeleton holds the space (px per char measured off real badges).
const BADGE_TEXT = {
    custom: (b) => [b.left, b.right],
    stars: () => ["stars", "0"],
    npm: () => ["npm", "v0.0.0"],
    cargo: () => ["cargo", "v0.0.0"],
    pypi: () => ["PyPI", "v0.0.0"],
    docker: () => ["docker", "v0.0"],
    status: () => ["system status", "online"],
};
function badgeSkeleton(b) {
    const [left, right] = BADGE_TEXT[b.kind](b);
    const l = 34 + left.length * 6.7;
    const r = 18 + right.length * 6.7;
    return { width: Math.round(l + r), split: Math.round((l / (l + r)) * 100) };
}
// License and release sit next to the title as plain text. The license is static; the release tag and age come from
// echopoint's small per-repo record. Colour and weight follow the data, so rows do not all look alike:
//   license  warm coral, whatever the license
//   release  bright and glowing when under 30 days old, amber under ~4 months, dim after that; italic below 1.0
const releases = new Map();
function releaseInfo(repo) {
    if (!releases.has(repo)) {
        releases.set(repo, fetch(`${EP}/v1/store/github:${repo}:release`)
            .then((r) => (r.ok ? r.json() : null))
            .then((d) => (d && d.tag_name && d.published_at ? d : null))
            .catch(() => null));
    }
    return releases.get(repo);
}
function ageLabel(days) {
    if (days < 1) return "today";
    if (days < 30) return `${Math.floor(days)}d`;
    if (days < 365) return `${Math.floor(days / 30)}mo`;
    return `${Math.floor(days / 365)}y`;
}
function rowMeta(link) {
    const meta = document.createElement("span");
    meta.className = "row-meta";
    if (link.license) {
        const a = document.createElement("a");
        a.href = `${GH}/${link.license.repo}/blob/main/LICENSE`;
        a.target = "_blank";
        a.className = "hover-link meta-license";
        a.title = `${link.license.spdx} licensed`;
        a.textContent = link.license.spdx;
        meta.appendChild(a);
    }
    if (link.release) {
        // The slot is laid out immediately with invisible placeholder text, so the row wraps the same way before and after
        // the release arrives and nothing below it jumps.
        const a = document.createElement("a");
        a.className = "hover-link meta-release is-pending";
        a.target = "_blank";
        const ghostVer = document.createElement("span");
        ghostVer.className = "ver";
        ghostVer.textContent = "v0.0.0";
        const ghostAge = document.createElement("span");
        ghostAge.className = "age";
        ghostAge.textContent = "00mo";
        a.append(ghostVer, ghostAge);
        releaseInfo(link.release).then((info) => {
            if (!info) return a.remove();
            const days = (Date.now() - Date.parse(info.published_at)) / 864e5;
            const tier = days <= 30 ? "is-fresh" : days <= 120 ? "is-recent" : "is-old";
            a.className = `hover-link meta-release ${tier}${/^v?0\./.test(info.tag_name) ? " is-prerelease" : ""}`;
            a.href = info.html_url || `${GH}/${link.release}/releases`;
            a.title = `released ${info.published_at.slice(0, 10)}`;
            const ver = document.createElement("span");
            ver.className = "ver";
            ver.textContent = info.tag_name.length > 14 ? `${info.tag_name.slice(0, 14)}…` : info.tag_name;
            const age = document.createElement("span");
            age.className = "age";
            age.textContent = ageLabel(days);
            a.replaceChildren(ver, age);
        });
        meta.appendChild(a);
    }
    return meta.childNodes.length ? meta : null;
}
function buildRow(title, url, nodes, link) {
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
    textLink.href = url;
    textLink.className = "hover-link text-link";
    textLink.target = "_blank";
    textLink.textContent = title;
    const titleLine = document.createElement("div");
    titleLine.className = "title-line";
    titleLine.appendChild(textLink);
    const meta = link ? rowMeta(link) : null;
    if (meta) titleLine.appendChild(meta);
    linkGroup.appendChild(titleLine);
    row.appendChild(linkGroup);
    const badgesContainer = document.createElement("div");
    badgesContainer.className = "badges-container";
    nodes.forEach((n) => badgesContainer.appendChild(n));
    row.appendChild(badgesContainer);
    return row;
}
const dash = document.createElement("div");
dash.className = "dashboard-section";
const dashHeader = document.createElement("div");
dashHeader.className = "dashboard-header";
dashHeader.innerHTML = `<span class="prompt">root@ujjwalvivek:~$</span> ls -la`;
dash.appendChild(dashHeader);
const actions = document.createElement("div");
actions.className = "action-buttons";
// Badge svgs are heavy, so each is requested only once it is within 100px of the visible area, and at low priority
// so it never competes with the font, the wasm or the wallpaper. The skeleton holds the space until then.
// A stars badge first asks echopoint for the repo's star count (a ~1.5 KB record): at 0 the badge is dropped without
// ever fetching its svg. If the count cannot be read the badge is shown anyway.
const starCounts = new Map();
function starCount(repo) {
    if (!starCounts.has(repo)) {
        starCounts.set(repo, fetch(`${EP}/v1/store/github:${repo}:repo`)
            .then((r) => (r.ok ? r.json() : null))
            .then((d) => (d && typeof d.stargazers_count === "number" ? d.stargazers_count : null))
            .catch(() => null));
    }
    return starCounts.get(repo);
}
function loadBadge(a) {
    const img = a.querySelector("img");
    img.fetchPriority = "low";
    img.src = img.dataset.src;
}
const badgeLoader = "IntersectionObserver" in window
    ? new IntersectionObserver((entries) => {
        entries.forEach((entry) => {
            if (!entry.isIntersecting) return;
            const a = entry.target;
            badgeLoader.unobserve(a);
            if (!a.dataset.starsRepo) return loadBadge(a);
            starCount(a.dataset.starsRepo).then((n) => {
                if (n === 0) return a.remove();
                a.classList.replace("is-counting", "is-loading");
                loadBadge(a);
            });
        });
    }, { root: container, rootMargin: "100px 0px" })
    : null;
links.forEach((link) => {
    const nodes = link.badges.map((badge) => {
        const { img, href } = badgeFor(badge);
        const a = document.createElement("a");
        a.href = href;
        const counting = badge.kind === "stars" && badgeLoader;
        a.className = `hover-link badge-link ${counting ? "is-counting" : "is-loading"}`;
        if (counting) a.dataset.starsRepo = badge.repo;
        a.target = "_blank";
        const sk = badgeSkeleton(badge);
        a.style.setProperty("--w", `${sk.width}px`);
        a.style.setProperty("--split", `${sk.split}%`);
        const b = document.createElement("img");
        b.className = "link-badge";
        b.addEventListener("load", () => {
            a.classList.remove("is-loading");
            a.style.setProperty("--badge-img", `url("${b.currentSrc || b.src}")`);
        });
        b.addEventListener("error", () => a.classList.replace("is-loading", "is-failed"));
        b.dataset.src = img;
        a.appendChild(b);
        if (badgeLoader) badgeLoader.observe(a);
        else b.src = img;
        return a;
    });
    actions.appendChild(buildRow(link.title, link.url, nodes, link));
});
dash.appendChild(actions);
container.appendChild(dash);
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
const NativeResizeObserver = window.ResizeObserver;
window.ResizeObserver = class extends NativeResizeObserver {
    constructor(callback) {
        const reported = new WeakMap();
        super((entries, observer) => {
            const real = entries.filter((entry) => {
                if (!(entry.target instanceof HTMLCanvasElement) || entry.target.id === "bg-canvas") return true;
                const box = entry.devicePixelContentBoxSize?.[0] ?? entry.contentBoxSize?.[0];
                if (!box) return true;
                const before = reported.get(entry.target);
                if (before && Math.abs(box.inlineSize - before.w) <= 1 && Math.abs(box.blockSize - before.h) <= 1) return false;
                reported.set(entry.target, { w: box.inlineSize, h: box.blockSize });
                return true;
            });
            if (real.length) callback(real, observer);
        });
    }
};
// The wallpaper's shaders now compile off the main thread (substrate 2.0.2), so it no longer has to wait for the dots to land.
// A short hold after the game canvas appears lets the first dots start falling before it begins; if the game never shows,
// it starts anyway after WALLPAPER_MAX_WAIT_MS.
const WORDMARK_SETTLE_MS = 333;
const WALLPAPER_MAX_WAIT_MS = 2333;
function wordmarkSettled() {
    return new Promise((resolve) => {
        const t0 = performance.now();
        const poll = () => {
            if (document.getElementById("game-canvas")) return setTimeout(resolve, WORDMARK_SETTLE_MS);
            if (performance.now() - t0 > WALLPAPER_MAX_WAIT_MS) return resolve();
            requestAnimationFrame(poll);
        };
        poll();
    });
}
wordmarkSettled()
    .then(startBackground)
    .catch((err) => { console.error("Background init failed:", err); });
// The game drifts its sky from the theme to a warm haze to a violet dusk; mirror that into --violet so the UI colours follow.
const VIOLET_STEP_MS = 100;
const SCROLL_REST_MS = 160;
function followSky(mod) {
    if (typeof mod.violet_level !== "function" || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const root = document.documentElement;
    let last = -1;
    let lastWrite = 0;
    let scrolling = false;
    let restTimer = 0;
    document.addEventListener("scroll", () => {
        scrolling = true;
        clearTimeout(restTimer);
        restTimer = setTimeout(() => { scrolling = false; }, SCROLL_REST_MS);
    }, { capture: true, passive: true });
    const tick = (now) => {
        const v = mod.violet_level();
        if (Math.abs(v - last) > 0.002) {
            setBackgroundViolet(v);
            if (!scrolling && now - lastWrite >= VIOLET_STEP_MS) {
                last = v;
                lastWrite = now;
                root.style.setProperty("--violet", v.toFixed(3));
            }
        }
        requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
}
initGame()
    .then((mod) => {
        followSky(mod);
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
    function handleWorkletMsg(e) {
        if (e.data === "need_data" && audioEngineRef) {
            audioEngineRef.process(buf);
            node.port.postMessage(buf.slice());
        }
    }
    node.port.onmessage = handleWorkletMsg;
    audioNode = node;
    node.port.postMessage("need_data");
    return node;
}
function initAudio() {
    if (audioInitPromise) return audioInitPromise;
    audioInitPromise = (async () => {
        try {
            if (!audioCtx || audioCtx.state === "closed") audioCtx = new (window.AudioContext || window.webkitAudioContext)();
            if (audioCtx.state === "suspended") await audioCtx.resume();
            const mod = await initGame();
            audioEngineRef = new mod.AudioEngine(audioCtx.sampleRate);
            const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
            if (!isIOS && audioCtx.audioWorklet && typeof AudioWorkletNode === "function") {
                try { await createWorkletAudioNode(); }
                catch (workletErr) {
                    console.warn("AudioWorklet unavailable, using ScriptProcessor fallback:", workletErr);
                    createScriptAudioNode();
                }
            } else { createScriptAudioNode(); }
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
document.addEventListener("click", () => {
    if (!audioCtx || audioCtx.state === "closed") {
        audioCtx = new (window.AudioContext || window.webkitAudioContext)();
        if (audioCtx.state === "suspended") audioCtx.resume();
    }
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
