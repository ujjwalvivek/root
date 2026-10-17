// Page background: a fixed substrate v2 stack on the WebGPU engine.
// To try other wallpapers and stacks, use the lab in tools/substrate and paste its "copy json" output into `layers`.
const SUBSTRATE =
  "https://cdn.jsdelivr.net/npm/@ujjwalvivek/substrate@2.0.2/dist";
const FPS = 30;
const warm = {
  primary: "#404040",
  secondary: "#808080",
  accent: "#ffaa00",
  background: "#030303",
};
const dusk = {
  primary: "#3d3752",
  secondary: "#7f78a0",
  accent: "#b794ff",
  background: "#040309",
};
// Mutated in place while the sky drifts; the engine re-reads it every frame.
const palette = { ...warm };
let renderer = null;
let violet = 0;

const rgb = (hex) => [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16));
function mix(a, b, t) {
  const [x, y] = [rgb(a), rgb(b)];
  return (
    "#" +
    x
      .map((c, i) =>
        Math.round(c + (y[i] - c) * t)
          .toString(16)
          .padStart(2, "0"),
      )
      .join("")
  );
}

// 0 = the warm palette, 1 = the violet dusk. Called by the page as the game's sky drifts.
export function setBackgroundViolet(v) {
  violet = v;
  for (const key of Object.keys(warm))
    palette[key] = mix(warm[key], dusk[key], v);
  renderer?.setPalette?.(palette);
}

// Bottom to top.
const layers = [
  {
    name: "digital-rain",
    opacity: 1,
    speed: 0.03,
    density: 3,
    params: { cellSize: 20, trailLength: 10, glyphDensity: 0.6, flicker: 15 },
  },
  {
    name: "desktop-wallpaper",
    opacity: 0.7,
    speed: 0.25,
    density: 3,
    params: {},
  },
  {
    name: "particles",
    opacity: 0.35,
    speed: 0.05,
    density: 3,
    params: { maxRadius: 1200, minRadius: 120 },
  },
  {
    name: "floating-squares",
    opacity: 1,
    speed: 0.35,
    density: 0,
    params: { minSize: 2, maxSize: 20, count: 0 },
  },
  {
    name: "vignette",
    opacity: 1,
    speed: 0,
    density: 0,
    params: { innerRadius: 0.1, outerRadius: 0.8 },
  },
  {
    name: "city-skyline",
    opacity: 0.25,
    speed: 2,
    density: 3,
    params: {
      buildingCount: 15,
      windowDensity: 0.5,
      horizon: -1,
      color: "background",
      waterDepth: 0,
    },
  },
];

function mount() {
  const cv = document.createElement("canvas");
  cv.id = "bg-canvas";
  document.body.insertBefore(cv, document.body.firstChild);
  return cv;
}

// The canvas starts transparent and out of focus, and eases in once it has painted its first frames. Until then the
// CSS placeholder (a breathing glow and grid) holds the screen, so there is no black gap and no sudden pop.
function reveal(cv) {
  requestAnimationFrame(() =>
    requestAnimationFrame(() => {
      cv.classList.add("is-ready");
      document.body.classList.add("bg-ready");
    }),
  );
}

function toScene(engine, stack) {
  return engine.compose(
    stack.map(({ name, opacity, speed, density, params }) => ({
      fn: engine.primitives[name],
      options: { opacity, speed, density, ...params },
    })),
  );
}

// Needs WebGPU. Without it the canvas is dropped and the CSS placeholder (glow and dot grid) stays as the backdrop.
export async function startBackground() {
  const cv = mount();
  try {
    const gpu = await import(`${SUBSTRATE}/index.js`);
    renderer = await gpu.loop(cv, toScene(gpu, layers), palette, { fps: FPS });
    setBackgroundViolet(violet);
    reveal(cv);
  } catch (err) {
    console.warn(
      "WebGPU background unavailable, keeping the CSS backdrop:",
      err,
    );
    cv.remove();
  }
}
