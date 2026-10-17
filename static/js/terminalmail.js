// Terminal mail: a small TUI that walks a visitor through subject, body and an optional way to reply, then sends it with EmailJS.
// Ported from the portfolio's React component to plain DOM. The EmailJS keys and the Turnstile site key are public by design.
const SERVICE_ID = "service_1uxgvw6";
const TEMPLATE_ID = "terminal_mail";
const PUBLIC_KEY = "7NdaPgOh1ikiQfrW9";
const TURNSTILE_SITE_KEY = "0x4AAAAAABmjbZtkf8GEbgrw";
const EMAILJS_URL = "https://api.emailjs.com/api/v1.0/email/send";
const TURNSTILE_SRC =
  "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit";
const TURNSTILE_WAIT_MS = 10000;

const STEPS = {
  SUBJECT: "subject",
  BODY: "body",
  CONTACT_PREFERENCE: "contact_preference",
  CONTACT_METHOD: "contact_method",
  CONTACT_INFO: "contact_info",
  READY: "ready_to_send",
  SENDING: "sending",
  COMPLETE: "complete",
};

const PROMPTS = {
  subject: { prompt: "subject", hint: "What's the subject of your message?" },
  body: {
    prompt: "body",
    hint: 'Type your message. Type "done" when finished.',
  },
  contact_preference: {
    prompt: "contact",
    hint: "Should I be able to contact you back? (y/n)",
  },
  contact_method: { prompt: "method", hint: 'Type "email" or "social"' },
  contact_info: { prompt: "info", hint: "Enter your contact details" },
  ready_to_send: {
    prompt: "send",
    hint: 'Type "send" to transmit your message',
  },
  sending: { prompt: "...", hint: "Processing..." },
  complete: { prompt: "done", hint: "Type 'reset' for new message" },
};

const SIDEBAR = ["subject", "body", "contact", "review", "send"];
const SIDEBAR_OF = {
  subject: "subject",
  body: "body",
  contact_preference: "contact",
  contact_method: "contact",
  contact_info: "contact",
  ready_to_send: "review",
  sending: "send",
  complete: "send",
};

const HINTS = {
  body: [['"done"', "finish body"]],
  contact_preference: [
    ["y", "yes"],
    ["n", "no"],
  ],
  contact_method: [
    ['"email"', "email"],
    ['"social"', "social"],
  ],
  ready_to_send: [['"send"', "transmit"]],
  sending: [["...", "transmitting"]],
  complete: [['"reset"', "new message"]],
};

const SPINNER = ["|", "/", "-", "\\"];
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const SOCIAL_RE = /^(twitter|instagram|telegram|discord|linkedin)@[\w._-]+$/i;
const INTRO = [
  ["encrypted connection established", "system"],
  [" ", "system"],
];

function el(tag, className, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text != null) node.textContent = text;
  return node;
}

let turnstileScript = null;
function loadTurnstile() {
  if (window.turnstile) return Promise.resolve(window.turnstile);
  turnstileScript ??= new Promise((resolve) => {
    const s = el("script");
    s.src = TURNSTILE_SRC;
    s.async = true;
    s.onload = () => resolve(window.turnstile || null);
    s.onerror = () => resolve(null);
    document.head.appendChild(s);
  });
  return turnstileScript;
}

class TerminalMail {
  constructor(host) {
    this.host = host;
    this.reset(true);
    this.build();
    this.render();
    this.cat = startCat(this.catCanvas, this.root);
  }

  reset(initial = false) {
    this.step = STEPS.SUBJECT;
    this.subject = "";
    this.body = [];
    this.needsContact = false;
    this.method = "";
    this.info = "";
    this.sending = false;
    this.commands = [];
    this.cursor = -1;
    this.token = "";
    if (!initial) {
      this.widget != null && window.turnstile?.reset(this.widget);
      this.output.replaceChildren();
      INTRO.forEach(([text, type]) => this.say(text, type));
      this.render();
    }
  }

  build() {
    const root = (this.root = el("div", "tm"));
    const header = el("div", "tm-header");
    const dots = el("div", "tm-dots");
    dots.append(
      el("i", "tm-dot tm-dot-red"),
      el("i", "tm-dot tm-dot-amber"),
      el("i", "tm-dot tm-dot-green"),
    );
    this.status = el("span", "tm-status");
    header.append(
      dots,
      el("div", "tm-title", "terminalmail@ujjwalvivek"),
      this.status,
    );

    const body = el("div", "tm-body");

    const side = el("div", "tm-panel tm-side");
    side.append(el("div", "tm-panel-head", "jump back"));
    const sideBody = el("div", "tm-panel-body tm-side-body");
    this.stepList = el("div", "tm-steps");
    this.catCanvas = el("canvas", "tm-cat");
    this.catCanvas.setAttribute("aria-hidden", "true");
    sideBody.append(this.stepList, this.catCanvas);
    side.append(sideBody);

    const compose = el("div", "tm-panel tm-compose");
    compose.append(el("div", "tm-panel-head", "compose"));
    this.output = el("div", "tm-output");
    this.output.setAttribute("role", "log");
    this.output.setAttribute("aria-live", "polite");
    const composeBody = el("div", "tm-panel-body");
    composeBody.append(this.output);
    compose.append(composeBody);
    compose.addEventListener("click", () => {
      if (!getSelection()?.toString()) this.input.focus();
    });

    const row = el("div", "tm-input-row");
    this.prompt = el("span", "tm-prompt");
    this.input = el("input", "tm-input");
    this.input.type = "text";
    this.input.name = "terminalInput";
    this.input.autocomplete = "off";
    this.input.spellcheck = false;
    this.input.setAttribute("aria-label", "terminal input");
    this.input.addEventListener("keydown", (e) => this.onKey(e));
    this.input.addEventListener(
      "focus",
      () => loadTurnstile().then((t) => t && this.ensureWidget()),
      { once: true },
    );
    // the wrapper lets the phone layout keep a 16px field (iOS zooms the page on smaller ones) and shrink it visually
    const inputWrap = el("div", "tm-input-wrap");
    inputWrap.append(this.input);
    row.append(this.prompt, inputWrap);

    body.append(side, compose, row);

    const help = el("div", "tm-help");
    const preview = el("div", "tm-preview");
    this.previewSubject = el("span", "tm-value");
    this.previewBody = el("span", "tm-value");
    this.previewContact = el("span", "tm-value");
    for (const [label, value] of [
      ["Subject", this.previewSubject],
      ["Body", this.previewBody],
      ["Contact", this.previewContact],
    ]) {
      const field = el("div", "tm-field");
      field.append(el("span", "tm-label", label), value);
      preview.append(field);
    }
    this.hints = el("div", "tm-hints");
    help.append(preview, this.hints);

    root.append(header, body, help);
    this.host.replaceChildren(root);
    INTRO.forEach(([text, type]) => this.say(text, type));
  }

  say(message, type = "system") {
    const line = el(
      "div",
      `tm-line ${message.trim() ? "tm-l-" + type : "tm-blank"}`,
      message,
    );
    this.output.appendChild(line);
    this.output.scrollTop = this.output.scrollHeight;
  }

  go(step) {
    this.step = step;
    this.render();
  }

  render() {
    const active = SIDEBAR_OF[this.step];
    const done = SIDEBAR.slice(0, SIDEBAR.indexOf(active));
    this.stepList.replaceChildren(
      ...SIDEBAR.map((key) => {
        const isDone = done.includes(key);
        const item = el(
          "button",
          `tm-step${key === active ? " is-active" : ""}${isDone ? " is-done" : ""}`,
        );
        item.type = "button";
        item.disabled =
          !isDone || !["subject", "body", "contact"].includes(key);
        item.append(
          el("span", "tm-marker", isDone || key === active ? "●" : "○"),
          el("span", "tm-step-label", key),
        );
        if (!item.disabled)
          item.addEventListener("click", () => this.jump(key));
        return item;
      }),
    );

    const cfg = PROMPTS[this.step];
    this.input.placeholder = cfg.hint;
    this.input.disabled = this.sending;
    this.prompt.replaceChildren();
    if (this.sending) {
      this.prompt.append(
        (this.spinner ??= el("span", "tm-spinner", SPINNER[0])),
      );
    } else {
      this.prompt.append(
        el("span", "tm-tilde", "~"),
        el("span", "tm-slash", "/"),
        el("span", "tm-step-name", cfg.prompt),
        el("span", "tm-caret", " >"),
      );
    }
    this.status.className = `tm-status ${this.sending ? "is-sending" : "is-ready"}`;

    this.previewSubject.replaceChildren(
      this.subject
        ? document.createTextNode(this.subject)
        : el("span", "tm-waiting", "waiting..."),
    );
    this.previewBody.replaceChildren(
      this.body.length
        ? document.createTextNode(
            `${this.body.length} line${this.body.length === 1 ? "" : "s"}`,
          )
        : el("span", "tm-waiting", "waiting..."),
    );
    this.previewContact.replaceChildren(
      this.info
        ? document.createTextNode(`${this.method}: ${this.info}`)
        : !this.needsContact &&
            this.subject &&
            this.step !== STEPS.SUBJECT &&
            this.step !== STEPS.BODY &&
            this.step !== STEPS.CONTACT_PREFERENCE
          ? el("span", "tm-dim", "none requested")
          : el("span", "tm-waiting", "waiting..."),
    );

    this.hints.replaceChildren(
      ...(HINTS[this.step] || []).map(([key, label]) => {
        const hint = el("span", "tm-hint");
        hint.append(
          el("kbd", "tm-key", key),
          el("span", "tm-hint-label", label),
        );
        return hint;
      }),
    );

    if (this.sending) this.spin();
    else clearInterval(this.spinTimer);
  }

  spin() {
    clearInterval(this.spinTimer);
    let i = 0;
    this.spinTimer = setInterval(() => {
      if (this.spinner)
        this.spinner.textContent = SPINNER[++i % SPINNER.length];
    }, 90);
  }

  jump(key) {
    if (key === "subject") {
      this.say(" ", "prompt");
      this.say("editing subject...", "system");
      this.go(STEPS.SUBJECT);
    } else if (key === "body") {
      this.body = [];
      this.say(" ", "prompt");
      this.say("editing body...", "system");
      this.go(STEPS.BODY);
    } else if (key === "contact") {
      this.method = this.info = "";
      this.needsContact = false;
      this.say(" ", "prompt");
      this.say("editing contact (y/n)...", "system");
      this.go(STEPS.CONTACT_PREFERENCE);
    }
    this.input.value = "";
    this.input.focus();
  }

  onKey(e) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      this.submit();
    } else if (e.key === "ArrowUp" || e.key === "ArrowDown") {
      e.preventDefault();
      if (!this.commands.length) return;
      this.cursor = Math.max(
        -1,
        Math.min(
          this.commands.length - 1,
          this.cursor + (e.key === "ArrowUp" ? 1 : -1),
        ),
      );
      this.input.value =
        this.cursor >= 0
          ? this.commands[this.commands.length - 1 - this.cursor]
          : "";
    }
  }

  submit() {
    const text = this.input.value.trim();
    if (!text) return;
    this.commands.push(text);
    this.cursor = -1;
    if (this.step !== STEPS.BODY || text.toLowerCase() === "done")
      this.say(text, "user");
    this.input.value = "";
    if (text.toLowerCase() === "reset") return this.reset();
    switch (this.step) {
      case STEPS.SUBJECT:
        return this.onSubject(text);
      case STEPS.BODY:
        return this.onBody(text);
      case STEPS.CONTACT_PREFERENCE:
        return this.onPreference(text);
      case STEPS.CONTACT_METHOD:
        return this.onMethod(text);
      case STEPS.CONTACT_INFO:
        return this.onInfo(text);
      case STEPS.READY:
        return this.onReady(text);
      default:
        this.say("invalid input", "error");
    }
  }

  onSubject(text) {
    if (text.length < 3) return this.say("minimum 3 characters", "error");
    this.subject = text;
    this.say(" ", "prompt");
    this.say("type your message (you can add multiple lines)", "prompt");
    this.go(STEPS.BODY);
  }

  onBody(text) {
    if (text.toLowerCase() === "done") {
      if (!this.body.length) return this.say("minimum one line", "error");
      this.say(" ", "prompt");
      this.say("should i be able to contact you back? (y/n)", "prompt");
      return this.go(STEPS.CONTACT_PREFERENCE);
    }
    this.body.push(text);
    this.say(`+ ${text}`, "info");
    this.render();
  }

  onPreference(text) {
    const answer = text.toLowerCase();
    if (answer === "n" || answer === "no") {
      this.needsContact = false;
      this.say(" ", "prompt");
      this.say('ready! type "send" to transmit your message', "prompt");
      this.go(STEPS.READY);
    } else if (answer === "y" || answer === "yes") {
      this.needsContact = true;
      this.say(" ", "prompt");
      this.say('perfect! choose one. type "email" or "social"', "prompt");
      this.go(STEPS.CONTACT_METHOD);
    } else {
      this.say("invalid. choose one y/n", "error");
    }
  }

  onMethod(text) {
    const method = text.toLowerCase();
    if (method === "email") {
      this.method = "email";
      this.say(" ", "prompt");
      this.say("what's your email?", "prompt");
      this.go(STEPS.CONTACT_INFO);
    } else if (method === "social") {
      this.method = "social";
      this.say(" ", "prompt");
      this.say(
        "enter your socials as platform@username, like twitter@ujjwalvivekx",
        "prompt",
      );
      this.say(
        "Supported: twitter, instagram, telegram, discord, linkedin",
        "info",
      );
      this.go(STEPS.CONTACT_INFO);
    } else {
      this.say('invalid. choose "email" or "social"', "error");
    }
  }

  onInfo(text) {
    if (this.method === "email" && !EMAIL_RE.test(text)) {
      this.say(" ", "prompt");
      return this.say("enter a valid email address", "error");
    }
    if (this.method === "social" && !SOCIAL_RE.test(text)) {
      this.say(" ", "prompt");
      return this.say("use format platform@username", "error");
    }
    this.info = text;
    this.say(" ", "prompt");
    this.say('ready! type "send" to transmit your message', "prompt");
    this.go(STEPS.READY);
  }

  onReady(text) {
    if (text.toLowerCase() === "send") return this.send();
    this.say(" ", "prompt");
    this.say('invalid. type "send"', "error");
  }

  // The widget is invisible: it only runs when a token is asked for, and tokens are single use.
  async ensureWidget() {
    if (this.widget != null) return this.widget;
    const turnstile = await loadTurnstile();
    if (!turnstile) return null;
    const holder = el("div");
    holder.style.display = "none";
    this.root.appendChild(holder);
    try {
      this.widget = turnstile.render(holder, {
        sitekey: TURNSTILE_SITE_KEY,
        size: "invisible",
        execution: "execute",
        callback: (token) => {
          this.token = token;
          this.onToken?.(token);
        },
        "error-callback": () => {
          this.token = "";
          this.onToken?.(null);
        },
        "expired-callback": () => {
          this.token = "";
        },
      });
    } catch (err) {
      console.warn("Turnstile initialization failed:", err);
      this.widget = null;
    }
    return this.widget;
  }

  // Resolves to a token, "" when verification is not available, or null on failure or timeout.
  async verify() {
    const widget = await this.ensureWidget();
    if (widget == null) return "";
    if (this.token) return this.token;
    return new Promise((resolve) => {
      const timer = setTimeout(() => {
        this.onToken = null;
        resolve(null);
      }, TURNSTILE_WAIT_MS);
      this.onToken = (token) => {
        clearTimeout(timer);
        this.onToken = null;
        resolve(token);
      };
      try {
        window.turnstile.execute(widget);
      } catch (err) {
        clearTimeout(timer);
        this.onToken = null;
        resolve("");
      }
    });
  }

  async send() {
    this.sending = true;
    this.go(STEPS.SENDING);
    const token = await this.verify();
    if (token === null) {
      this.say("timeout or failed. try again...", "error");
      this.sending = false;
      return this.go(STEPS.READY);
    }
    this.say(" ", "prompt");
    if (token) this.say("security verification completed", "success");
    else this.say("proceeding without verification", "warn");
    this.say("transmitting encrypted message...", "system");
    try {
      const res = await fetch(EMAILJS_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          service_id: SERVICE_ID,
          template_id: TEMPLATE_ID,
          user_id: PUBLIC_KEY,
          template_params: {
            subject: this.subject,
            message: this.body.join("\n"),
            from_name: "Website Visitor",
            reply_to:
              this.method === "email" ? this.info : "noreply@terminal.local",
            contact_info: this.needsContact
              ? `${this.method}: ${this.info}`
              : "No contact requested",
            "cf-turnstile-response": token,
          },
        }),
      });
      if (!res.ok) throw new Error(`${res.status} ${await res.text()}`);
      this.say(" ", "prompt");
      this.say("thank you for reaching out!", "success");
      if (this.needsContact)
        this.say(`i'll get back to you on ${this.info}`, "info");
      this.say(" ", "system");
      this.say('type "reset" to send another message', "prompt");
      this.sending = false;
      this.flash("is-success");
      this.go(STEPS.COMPLETE);
    } catch (err) {
      console.error("EmailJS error:", err);
      this.say('failed. type "send" to retry', "error");
      this.sending = false;
      this.flash("is-error");
      this.go(STEPS.READY);
    } finally {
      // tokens are single use, so ask for a fresh one next time
      this.token = "";
      if (this.widget != null)
        try {
          window.turnstile?.reset(this.widget);
        } catch (_) {}
    }
  }

  flash(cls) {
    this.root.classList.remove("is-success", "is-error");
    void this.root.offsetWidth;
    this.root.classList.add(cls);
    setTimeout(() => this.root.classList.remove(cls), 700);
  }
}

// The pixel cat that wanders and naps in the sidebar. It only animates while it is on screen.
const CAT_FONT = {
  T: ["xxx", ".x.", ".x.", ".x.", ".x."],
  E: ["xxx", "x..", "xx.", "x..", "xxx"],
  R: ["xx.", "x.x", "xx.", "x.x", "x.x"],
  M: ["x.x", "xxx", "x.x", "x.x", "x.x"],
  I: ["xxx", ".x.", ".x.", ".x.", "xxx"],
  N: ["x.x", "xxx", "xxx", "xxx", "x.x"],
  A: [".x.", "x.x", "xxx", "x.x", "x.x"],
  L: ["x..", "x..", "x..", "x..", "xxx"],
  C: [".xx", "x..", "x..", "x..", ".xx"],
};
const CAT_ART = {
  sleeping:
    "xx...xx........x\nx.xxx.x........x\nx.....x.......x.\nx.x.x.xxxxx..x..\nx.....x....xxx..\n.x...x.....x....\n..xxxx.....x....\n....xxxxxxx.....",
  walk1:
    "xx...xx........x\nx.xxx.x........x\nx.....x.......x.\nx.x.x.xxxxx..x..\nx.....x....xxx..\n.x...x.....x....\n..xxxx.....x....\n....xxxxxxx.....\n.....x.x.xxx....\n.....x.x.x.x....",
  walk2:
    "xx...xx........x\nx.xxx.x........x\nx.....x.......x.\nx.x.x.xxxxx..x..\nx.....x....xxx..\n.x...x.....x....\n..xxxx.....x....\n....xxxxxxx.....\n....x.x.xxx.....\n...x..x.x..x....",
  zSmall: "xx\n.x.\n.xx",
  zMed: "xxx.\n..x.\n.x..\n.xxx",
  zLarge: "xxxx.\n..x..\n.x...\n.xxxx",
};

function startCat(canvas, scope) {
  const size = 110;
  const px = 2;
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d");
  const reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;

  // custom properties are not resolved to numbers, so read the colours the browser computes for a probe element
  const probe = el("span");
  probe.style.cssText =
    "position:absolute;visibility:hidden;pointer-events:none";
  scope.appendChild(probe);
  const readColor = (cssColor) => {
    probe.style.color = cssColor;
    const computed = getComputedStyle(probe).color;
    const m = computed.match(
      /(\d+(?:\.\d+)?)[,\s]+(\d+(?:\.\d+)?)[,\s]+(\d+(?:\.\d+)?)/,
    );
    if (!m) return [128, 128, 128];
    // colour-mix() results come back as color(srgb r g b) with channels from 0 to 1
    const scale = computed.startsWith("color(") ? 255 : 1;
    return [+m[1] * scale, +m[2] * scale, +m[3] * scale].map(Math.round);
  };
  const textRGB = readColor("var(--text-color)");
  let accentRGB = readColor("var(--accent)");
  let pixelRGB = textRGB;

  let state = { type: "walk", x: 0, t: 0, dir: "left" };
  let colorT = 0;
  let alive = true;
  let visible = false;
  let frameTimer = 0;
  let colorTimer = 0;
  let colorTick = 0;

  const dot = (x, y) => {
    ctx.fillStyle = `rgb(${pixelRGB.join(",")})`;
    ctx.fillRect(x * px, y * px, px, px);
  };
  const art = (x0, y0, str, flip) => {
    str.split("\n").forEach((row, y) => {
      const chars = flip ? [...row].reverse() : [...row];
      chars.forEach((ch, x) => {
        if (ch === "x") dot(x + x0, y + y0);
      });
    });
  };
  const text = (x0, y0, str) => {
    let off = 0;
    for (const ch of str) {
      if (ch === " ") {
        off += 4;
        continue;
      }
      const glyph = CAT_FONT[ch];
      if (glyph)
        glyph.forEach((row, y) =>
          [...row].forEach((c, x) => {
            if (c === "x") dot(x0 + x + off, y0 + y);
          }),
        );
      off += 4;
    }
  };

  function frame() {
    ctx.clearRect(0, 0, size, size);
    text(4, 6, "TERMINAL CAT");
    if (state.type === "sleep") {
      art(20, 32, CAT_ART.sleeping);
      if (state.t >= 1) art(28, 27, CAT_ART.zSmall);
      if (state.t >= 2) art(32, 22, CAT_ART.zMed);
      if (state.t >= 3) art(36, 18, CAT_ART.zLarge);
      state.t = (state.t + 1) % 4;
      if (Math.random() < 0.1)
        state = { type: "walk", x: 0, t: 0, dir: "left" };
    } else {
      art(
        20 + state.x,
        30,
        state.t < 4 ? CAT_ART.walk1 : CAT_ART.walk2,
        state.dir === "right",
      );
      state.t++;
      if (state.t > 8) state.t -= 8;
      state.x += state.dir === "left" ? -1 : 1;
      if (state.dir === "left" && state.x < -10) state.dir = "right";
      if (state.dir === "right" && state.x > 10) state.dir = "left";
      if (state.x === 0 && Math.random() < 0.5) state = { type: "sleep", t: 0 };
    }
  }

  function loop() {
    if (!alive || !visible) {
      frameTimer = 0;
      return;
    }
    frame();
    frameTimer = setTimeout(loop, state.type === "sleep" ? 500 : 100);
  }

  const ease = (t) => {
    const s = t * t;
    return s / (2 * (s - t) + 1);
  };
  function tint() {
    if (!alive || !visible) return;
    if (++colorTick % 8 === 0) accentRGB = readColor("var(--accent)");
    const inc = 0.05;
    const before = colorT;
    colorT =
      state.type === "sleep"
        ? Math.min(colorT + inc, 1)
        : Math.max(colorT - inc, 0);
    const t = ease(before);
    canvas.style.backgroundColor = `rgb(${accentRGB.map((a, i) => (textRGB[i] - a) * t + a).join(",")})`;
    pixelRGB = colorT < 0.5 ? textRGB : accentRGB;
  }

  const observer = new IntersectionObserver(([entry]) => {
    visible = entry.isIntersecting;
    if (visible && !frameTimer) loop();
  });
  observer.observe(canvas);

  if (reduced) {
    state = { type: "sleep", t: 3 };
    frame();
    observer.disconnect();
    return () => probe.remove();
  }
  colorTimer = setInterval(tint, 33);
  return () => {
    alive = false;
    clearTimeout(frameTimer);
    clearInterval(colorTimer);
    observer.disconnect();
    probe.remove();
  };
}

// The page loads /css/terminalmail.css alongside this module (see main.js) before it calls this.
export function mountTerminalMail(host) {
  const mail = new TerminalMail(host);
  host.classList.add("is-mounted");
  return mail;
}
