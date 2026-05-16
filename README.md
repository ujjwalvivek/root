# root.ujjwalvivek.com

Basically, a Linktree, but nicer terminal-style interactive page with a game canvas.

*   Custom Canvas-based interactive terminal console written in Rust, compiling down to client-side WASM.
*   Bypasses all standard samples, asset loading, and synthesis presets to generate audio frame-by-frame using pure mathematical equations.
*   Zero-Preset Tactile UI Sounds, real-time synthesized interactive feedback.

### Tech Stack

*   Zola
*   Journey Engine
*   Resonance, Cadence
*   Vanilla CSS

### Build Routine

```bash
cd game
wasm-pack build --target web --out-dir ../public/game
cd ..
zola serve --interface [IP_ADDRESS] # 0.0.0.0 --port 1111 
```
