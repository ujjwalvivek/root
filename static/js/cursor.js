// A targeting-reticle cursor: a precise dot, a ring that trails it and locks onto links, and a small readout.
// Only for devices with a real pointer. Text fields keep the normal I-beam, and nothing is hidden until the cursor is running.
const LOCKABLE = "a, button, [role='button'], .hover-link, .tm-step, summary, label";
const TEXTY = "input, textarea, [contenteditable='true']";
const RING = 34;
const IDLE_MS = 3500;

function el(tag, className) {
    const node = document.createElement(tag);
    if (className) node.className = className;
    return node;
}

function loadStyles() {
    return new Promise((resolve) => {
        if (document.querySelector("link[data-cursor]")) return resolve();
        const link = el("link");
        link.rel = "stylesheet";
        link.href = "/css/cursor.css";
        link.dataset.cursor = "";
        link.onload = link.onerror = () => resolve();
        document.head.appendChild(link);
    });
}

const pad = (n) => String(Math.max(0, Math.round(n))).padStart(4, "0");

export async function startCursor() {
    if (!matchMedia("(hover: hover) and (pointer: fine)").matches) return;
    const reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;
    await loadStyles();

    const root = el("div", "cur");
    root.setAttribute("aria-hidden", "true");
    const ring = el("div", "cur-ring");
    const spin = el("div", "cur-spin");
    for (const corner of ["tl", "tr", "bl", "br"]) spin.appendChild(el("i", `cur-c cur-${corner}`));
    ring.appendChild(spin);
    const dot = el("div", "cur-dot");
    const label = el("div", "cur-label");
    root.append(ring, dot, label);
    document.body.appendChild(root);
    const html = document.documentElement;

    const mouse = { x: -100, y: -100 };
    const at = { x: -100, y: -100, w: RING, h: RING };
    let lock = null;
    let raf = 0;
    let idleTimer = 0;
    let labelAt = 0;
    let shown = false;

    function paint() {
        ring.style.width = `${at.w}px`;
        ring.style.height = `${at.h}px`;
        ring.style.transform = `translate3d(${at.x}px, ${at.y}px, 0) translate(-50%, -50%)`;
        label.style.transform = `translate3d(${at.x + at.w / 2 + 8}px, ${at.y + at.h / 2 + 2}px, 0)`;
    }

    function frame() {
        raf = 0;
        let tx = mouse.x;
        let ty = mouse.y;
        let tw = RING;
        let th = RING;
        if (lock) {
            if (!lock.isConnected) { lock = null; root.classList.remove("is-lock"); } else {
                const r = lock.getBoundingClientRect();
                tx = r.left + r.width / 2;
                ty = r.top + r.height / 2;
                tw = r.width + 14;
                th = r.height + 10;
            }
        }
        const k = reduced ? 1 : 0.24;
        at.x += (tx - at.x) * k;
        at.y += (ty - at.y) * k;
        at.w += (tw - at.w) * k;
        at.h += (th - at.h) * k;
        paint();
        const settled = Math.abs(tx - at.x) + Math.abs(ty - at.y) + Math.abs(tw - at.w) + Math.abs(th - at.h) < 0.3;
        if (!settled) kick();
    }

    function kick() {
        if (!raf) raf = requestAnimationFrame(frame);
    }

    function setLabel(text) {
        if (label.textContent !== text) label.textContent = text;
    }

    function readout(now) {
        if (now - labelAt < 90) return;
        labelAt = now;
        setLabel(lock ? "LOCK" : `${pad(mouse.x)}:${pad(mouse.y)}`);
    }

    function wake() {
        root.classList.remove("is-idle");
        clearTimeout(idleTimer);
        idleTimer = setTimeout(() => { root.classList.add("is-idle"); setLabel("IDLE"); }, IDLE_MS);
    }

    function show() {
        if (shown) return;
        shown = true;
        html.classList.add("has-cursor");
        root.classList.add("is-on");
    }

    document.addEventListener("pointermove", (e) => {
        if (e.pointerType !== "mouse") return;
        mouse.x = e.clientX;
        mouse.y = e.clientY;
        if (!shown) { at.x = mouse.x; at.y = mouse.y; show(); }
        dot.style.transform = `translate3d(${mouse.x}px, ${mouse.y}px, 0)`;
        root.classList.remove("is-away");
        wake();
        readout(e.timeStamp);
        kick();
    }, { passive: true });

    document.addEventListener("pointerover", (e) => {
        if (e.pointerType !== "mouse") return;
        root.classList.toggle("is-text", !!e.target.closest?.(TEXTY));
        const target = e.target.closest?.(LOCKABLE) || null;
        if (target === lock) return;
        lock = target;
        root.classList.toggle("is-lock", !!lock);
        setLabel(lock ? "LOCK" : `${pad(mouse.x)}:${pad(mouse.y)}`);
        kick();
    }, { passive: true });

    document.addEventListener("pointerdown", (e) => { if (e.pointerType === "mouse") root.classList.add("is-down"); }, { passive: true });
    document.addEventListener("pointerup", () => root.classList.remove("is-down"), { passive: true });
    document.addEventListener("scroll", () => { if (lock) kick(); }, { capture: true, passive: true });
    html.addEventListener("pointerleave", () => root.classList.add("is-away"));
    html.addEventListener("pointerenter", () => root.classList.remove("is-away"));
    window.addEventListener("blur", () => root.classList.add("is-away"));
}
