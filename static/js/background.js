// Page background: a fixed substrate v2 stack on the WebGPU engine.
// To try other wallpapers and stacks, use the lab in tools/substrate and paste its "copy json" output into `layers`.
const SUBSTRATE = "https://cdn.jsdelivr.net/npm/@ujjwalvivek/substrate@2.0.1/dist";
const FPS = 30;
const palette = { primary: "#404040", secondary: "#808080", accent: "#ffaa00", background: "#030303" };

// Bottom to top.
const layers = [
    { name: "digital-rain", opacity: 1, speed: 0.03, density: 3, params: { cellSize: 20, trailLength: 10, glyphDensity: 0.6, flicker: 15 } },
    { name: "desktop-wallpaper", opacity: 0.7, speed: 0.25, density: 3, params: {} },
    { name: "particles", opacity: 0.35, speed: 0.05, density: 3, params: { maxRadius: 1200, minRadius: 120 } },
    { name: "floating-squares", opacity: 1, speed: 0.35, density: 0, params: { minSize: 2, maxSize: 20, count: 0 } },
    { name: "vignette", opacity: 1, speed: 0, density: 0, params: { innerRadius: 0.1, outerRadius: 0.8 } },
    { name: "city-skyline", opacity: 0.25, speed: 2, density: 3, params: { buildingCount: 15, windowDensity: 0.5, horizon: -1, color: "background", waterDepth: 0 } },
];

// The Canvas2D engine only has the classic primitives, so without WebGPU the page keeps the original scene.
function classicLayers(mobile) {
    const slow = { speed: 0.05, density: 1, params: {} };
    return [
        { name: "background", opacity: 0.8, ...slow },
        { name: "grid", opacity: 1.0, ...slow, params: { spacing: 100, warpAmount: 10 } },
        { name: "wireframes", opacity: 0.5, ...slow, density: mobile ? 0.6 : 1.0 },
        { name: "particles", opacity: 0.25, ...slow },
        { name: "vignette", opacity: 0.9, ...slow, params: { innerRadius: 0.3, outerRadius: 1.2 } },
    ];
}

function mount() {
    const cv = document.createElement("canvas");
    cv.id = "bg-canvas";
    document.body.insertBefore(cv, document.body.firstChild);
    return cv;
}

function toScene(engine, stack) {
    return engine.compose(stack.map(({ name, opacity, speed, density, params }) => ({
        fn: engine.primitives[name],
        options: { opacity, speed, density, ...params },
    })));
}

// Resolves to "gpu" or "cpu" depending on which engine ended up drawing.
export async function startBackground() {
    const mobile = /Mobi|Android|iPhone|iPad|iPod|webOS|IEMobile|Opera Mini/i.test(navigator.userAgent) || window.innerWidth < 768;
    let cv = mount();
    try {
        const gpu = await import(`${SUBSTRATE}/index.js`);
        await gpu.loop(cv, toScene(gpu, layers), palette, { fps: FPS });
        return "gpu";
    } catch (err) {
        console.warn("WebGPU background unavailable, using Canvas2D:", err);
        // A canvas that already handed out a webgpu context cannot give a 2d one, so start from a fresh element.
        cv.remove();
        cv = mount();
        const cpu = await import(`${SUBSTRATE}/cpu.js`);
        cpu.loop(cv, toScene(cpu, classicLayers(mobile)), palette, { fps: FPS });
        return "cpu";
    }
}
