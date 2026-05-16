import { loop, compose, primitives } from 'https://cdn.ujjwalvivek.com/scripts/substrate/latest/main.js';

const canvas = document.getElementById('bg-canvas');
const palette = {
    primary: '#404040',
    secondary: '#808080',
    accent: '#cccccc',
    background: '#050505'
};

window.initSubstrate = function initSubstrate() {
    const canvas = document.createElement('canvas');
    canvas.id = 'bg-canvas';
    document.body.insertBefore(canvas, document.body.firstChild);
    const state = { speed: 0.05, fps: 60 };
    const scene = compose([
        { fn: primitives.background },
        { fn: primitives.grid, options: { opacity: 1.0, spacing: 100, warpAmount: 10 } },
        { fn: primitives.wireframes, options: { opacity: 0.5 } },
        { fn: primitives.particles, options: { opacity: 0.25 } },
        { fn: primitives.vignette, options: { opacity: 0.9, innerRadius: 0.3, outerRadius: 1.2 } }
    ]);
    const palette = {
        primary: '#404040',
        secondary: '#808080',
        accent: '#cccccc',
        background: '#050505'
    };
    function resize() {
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;
    }
    window.addEventListener('resize', resize);
    resize();
    loop(canvas, scene, palette, state);
}
