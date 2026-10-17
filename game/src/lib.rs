use engine::{BloomSettings, Context, GameAction, GameApp, RenderLayer, SkyParams, SkyTransition, Vec2};
use wasm_bindgen::prelude::*;
use cadence::{Transport, EuclideanPattern, MarkovChain};
use core::f32::consts::TAU;
use core::sync::atomic::{AtomicU32, Ordering};

// How far the sky has drifted toward violet (0..1). The page reads it every frame to recolour its UI.
static VIOLET: AtomicU32 = AtomicU32::new(0);

#[wasm_bindgen]
pub fn violet_level() -> f32 {
    f32::from_bits(VIOLET.load(Ordering::Relaxed))
}

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum HeroAction {
    MoveLeft,
    MoveRight,
    Jump,
}

impl GameAction for HeroAction {
    fn count() -> usize { 3 }
    fn index(&self) -> usize { *self as usize }
    fn from_index(i: usize) -> Option<Self> {
        match i {
            0 => Some(Self::MoveLeft),
            1 => Some(Self::MoveRight),
            2 => Some(Self::Jump),
            _ => None
        }
    }
    fn move_negative_x() -> Option<Self> { Some(Self::MoveLeft) }
    fn move_positive_x() -> Option<Self> { Some(Self::MoveRight) }
}

const W: f32 = 640.0;
const H: f32 = 360.0;
// How long a dot takes to fly into place, and how late the last one starts.
const ASSEMBLE: f32 = 1.2;
const NUM_EMBERS: usize = 140;
const NUM_STARS: usize = 260;
const TRAIL: usize = 28;
const SPAWN_ZONE_COUNT: usize = 4;

struct Player {
    pos: Vec2,
    size: Vec2,
    velocity: Vec2,
}

#[derive(Clone, Copy)]
struct Ember {
    origin_x: f32,
    origin_y: f32,
    phase: f32,
    phase_speed: f32,
    drift_x: f32,
    speed: f32,
    size: f32,
    life: f32,
    lifetime: f32,
    r: f32,
    g: f32,
    b: f32,
}

#[derive(Clone, Copy)]
struct Star {
    x: f32,
    y: f32,
    phase: f32,
    speed: f32,
}

// One LED of the wordmark. Every lit pixel of the font is split into several of these.
#[derive(Clone, Copy)]
struct Dot {
    x: f32,
    y: f32,
    from_x: f32,
    from_y: f32,
    size: f32,
    delay: f32,
    phase: f32,
    color: [f32; 3],
    tint: bool,
}

pub struct HeroGame {
    player: Player,
    trail: [Vec2; TRAIL],
    trail_head: usize,
    embers: Vec<Ember>,
    stars: Vec<Star>,
    dots: Vec<Dot>,
    sky: SkyTransition,
    sky_stage: usize,
    violet: f32,
    rng: u32,
    time: f32,
}

fn rand_range(rng: &mut u32, lo: f32, hi: f32) -> f32 {
    *rng = rng.wrapping_mul(1664525).wrapping_add(1013904223);
    let t = (*rng >> 9) as f32 / 8388607.0;
    lo + t * (hi - lo)
}

fn spawn_ember(rng: &mut u32, cx: f32, cy: f32, spread_x: f32, spread_y: f32, life_offset: f32) -> Ember {
    let colors: [[f32; 3]; 5] = [
        [1.0, 0.6, 0.1],
        [1.0, 0.4, 0.0],
        [1.0, 0.8, 0.3],
        [1.0, 0.9, 0.6],
        [0.9, 0.3, 0.0],
    ];
    let ci = (rand_range(rng, 0.0, 5.0)) as usize % 5;
    let lifetime = rand_range(rng, 2.0, 5.0);
    Ember {
        origin_x: cx + rand_range(rng, -spread_x, spread_x),
        origin_y: cy + rand_range(rng, -spread_y, spread_y),
        phase: rand_range(rng, 0.0, 1.0),
        phase_speed: rand_range(rng, 0.4, 1.2),
        drift_x: rand_range(rng, -6.0, 6.0),
        speed: rand_range(rng, 15.0, 35.0),
        size: rand_range(rng, 1.5, 3.5),
        life: life_offset,
        lifetime,
        r: colors[ci][0],
        g: colors[ci][1],
        b: colors[ci][2],
    }
}

// The site's own near-black, so the haze starts from the theme and fades up from it.
fn dusk_theme() -> SkyParams {
    SkyParams {
        enabled: true,
        horizon_glow: 0.3,
        top_color: [0.010, 0.010, 0.010],
        horizon_color: [0.012, 0.012, 0.012],
        bottom_color: [0.010, 0.010, 0.010],
        horizon_y: 0.52,
        horizon_width: 0.42,
    }
}

// Stage 0 fades the haze up from the theme black once. After that it only swings between the warm haze and the violet dusk.
fn sky_leg(stage: usize) -> SkyTransition {
    match stage {
        0 => SkyTransition::new(dusk_theme(), dusk_warm(), 7.0),
        1 => SkyTransition::new(dusk_warm(), dusk_violet(), 9.0),
        _ => SkyTransition::new(dusk_violet(), dusk_warm(), 9.0),
    }
}

// Shifts a warm colour toward violet, keeping its brightness.
fn tone(c: [f32; 3], v: f32) -> [f32; 3] {
    let lum = c[0] * 0.5 + c[1] * 0.4 + c[2] * 0.1;
    let vio = [(0.45 + 0.35 * lum).min(1.0), (0.30 + 0.30 * lum).min(1.0), (0.78 + 0.22 * lum).min(1.0)];
    [c[0] + (vio[0] - c[0]) * v, c[1] + (vio[1] - c[1]) * v, c[2] + (vio[2] - c[2]) * v]
}

fn dusk_warm() -> SkyParams {
    SkyParams {
        enabled: true,
        horizon_glow: 0.9,
        top_color: [0.010, 0.010, 0.014],
        horizon_color: [0.14, 0.06, 0.02],
        bottom_color: [0.016, 0.012, 0.010],
        horizon_y: 0.52,
        horizon_width: 0.42,
    }
}

fn dusk_violet() -> SkyParams {
    SkyParams {
        enabled: true,
        horizon_glow: 0.7,
        top_color: [0.014, 0.011, 0.024],
        horizon_color: [0.10, 0.04, 0.08],
        bottom_color: [0.014, 0.010, 0.014],
        horizon_y: 0.46,
        horizon_width: 0.5,
    }
}

fn ember_zones(player_x: f32, player_y: f32) -> [(f32, f32, f32, f32); SPAWN_ZONE_COUNT] {
    [
        (320.0, 184.0, 200.0, 12.0),
        (320.0, 224.0, 70.0, 8.0),
        (319.0, 114.0, 42.0, 18.0),
        (player_x, player_y, 30.0, 8.0),
    ]
}

const FONT: &[(char, &[&str])] = &[
    ('u', &["101", "101", "101", "101", "111"]),
    ('j', &["001", "001", "001", "101", "111"]),
    ('w', &["101", "101", "101", "111", "111"]),
    ('a', &["111", "101", "111", "101", "101"]),
    ('l', &["100", "100", "100", "100", "111"]),
    ('v', &["101", "101", "101", "101", "010"]),
    ('i', &["010", "000", "010", "010", "010"]),
    ('e', &["111", "100", "111", "100", "111"]),
    ('k', &["101", "110", "100", "110", "101"]),
    ('.', &["000", "000", "000", "000", "010"]),
    ('c', &["111", "100", "100", "100", "111"]),
    ('o', &["111", "101", "101", "101", "111"]),
    ('m', &["111", "111", "101", "101", "101"]),
    ('D', &["110", "101", "101", "101", "110"]),
    ('I', &["111", "010", "010", "010", "111"]),
    ('R', &["110", "101", "110", "101", "101"]),
    ('E', &["111", "100", "111", "100", "111"]),
    ('C', &["111", "100", "100", "100", "111"]),
    ('T', &["111", "010", "010", "010", "010"]),
    ('O', &["111", "101", "101", "101", "111"]),
    ('Y', &["101", "101", "010", "010", "010"]),
];

fn new_dot(rng: &mut u32, x: f32, y: f32, size: f32, color: [f32; 3]) -> Dot {
    Dot {
        x,
        y,
        from_x: x + rand_range(rng, -70.0, 70.0),
        from_y: y - rand_range(rng, 50.0, 190.0),
        size,
        delay: (x / W) * 0.6 + rand_range(rng, 0.0, 0.35),
        phase: rand_range(rng, 0.0, 1.0),
        color,
        // only the orange dots follow the sky; the white and grey text stays put
        tint: color[2] < 0.3,
    }
}

// Lays text out as LEDs, centred on `center_x`. Each font pixel becomes `sub_n` x `sub_n` dots.
fn push_text(dots: &mut Vec<Dot>, rng: &mut u32, text: &str, center_x: f32, y: f32, block: f32, sub_n: usize, dot: f32, spacing: f32, color: [f32; 3]) {
    let advance = (3.0 + spacing) * block;
    let width = text.chars().count() as f32 * advance - spacing * block;
    let x0 = (center_x - width / 2.0).round();
    let sub = block / sub_n as f32;
    for (i, c) in text.chars().enumerate() {
        let Some((_, glyph)) = FONT.iter().find(|(ch, _)| *ch == c) else { continue };
        let x_off = x0 + i as f32 * advance;
        for (cy, row) in glyph.iter().enumerate() {
            for (cx, bit) in row.chars().enumerate() {
                if bit != '1' { continue; }
                for sy in 0..sub_n {
                    for sx in 0..sub_n {
                        let px = x_off + cx as f32 * block + sx as f32 * sub + (sub - dot) / 2.0;
                        let py = y + cy as f32 * block + sy as f32 * sub + (sub - dot) / 2.0;
                        dots.push(new_dot(rng, px, py, dot, color));
                    }
                }
            }
        }
    }
}

fn push_border(dots: &mut Vec<Dot>, rng: &mut u32, x: f32, y: f32, w: f32, h: f32, color: [f32; 3]) {
    let step = 3.0;
    let mut i = 0.0;
    while i <= w {
        dots.push(new_dot(rng, x + i, y, 2.0, color));
        dots.push(new_dot(rng, x + i, y + h - 2.0, 2.0, color));
        i += step;
    }
    let mut j = step;
    while j < h - 2.0 {
        dots.push(new_dot(rng, x, y + j, 2.0, color));
        dots.push(new_dot(rng, x + w - 2.0, y + j, 2.0, color));
        j += step;
    }
}

fn draw_dot(ctx: &mut Context<HeroAction>, d: &Dot, time: f32, sweep_x: f32, violet: f32) {
    let base = if d.tint { tone(d.color, violet) } else { d.color };
    let t = ((time - d.delay) / ASSEMBLE).clamp(0.0, 1.0);
    if t <= 0.0 { return; }
    let e = 1.0 - (1.0 - t) * (1.0 - t) * (1.0 - t);
    let x = d.from_x + (d.x - d.from_x) * e;
    let y = d.from_y + (d.y - d.from_y) * e;
    let twinkle = 0.84 + 0.16 * (time * 2.3 + d.phase * TAU).sin();
    let dx = (d.x - sweep_x) / 24.0;
    let sweep = (-dx * dx).exp();
    let lum = twinkle + sweep * 0.7;
    ctx.draw_rect_layer(
        RenderLayer::World,
        Vec2::new(x, y),
        Vec2::new(d.size, d.size),
        [(base[0] * lum).min(1.0), (base[1] * lum).min(1.0), (base[2] * lum).min(1.0), t],
    );
    let g = d.size * 2.4;
    let off = (g - d.size) / 2.0;
    ctx.draw_rect_additive(
        Vec2::new(x - off, y - off),
        Vec2::new(g, g),
        [base[0], base[1], base[2], t * (0.05 + sweep * 0.22)],
    );
}

impl GameApp for HeroGame {
    type Action = HeroAction;
    fn internal_resolution() -> (u32, u32) { (640, 360) }
    fn init(ctx: &mut Context<HeroAction>) -> Self {
        ctx.show_perf_hud = false;
        ctx.bloom = BloomSettings { enabled: true, threshold: 0.62, intensity: 0.5, radius: 2.0 };
        let mut rng = 12345u32;
        let player = Player {
            pos: Vec2::new(0.0, 344.0),
            size: Vec2::new(16.0, 16.0),
            velocity: Vec2::new(100.0, 0.0),
        };
        let mut embers = Vec::with_capacity(NUM_EMBERS);
        let zones = ember_zones(0.0, 340.0);
        for i in 0..NUM_EMBERS {
            let (cx, cy, sx, sy) = zones[i % SPAWN_ZONE_COUNT];
            embers.push(spawn_ember(&mut rng, cx, cy, sx, sy, i as f32 / NUM_EMBERS as f32));
        }
        let stars = (0..NUM_STARS)
            .map(|_| Star {
                x: rand_range(&mut rng, 0.0, W),
                y: rand_range(&mut rng, 0.0, H),
                phase: rand_range(&mut rng, 0.0, 1.0),
                speed: rand_range(&mut rng, 0.15, 0.7),
            })
            .collect();
        let white = [1.0, 0.96, 0.88];
        let orange = [1.0, 0.55, 0.12];
        let grey = [0.62, 0.62, 0.66];
        let mut dots = Vec::new();
        push_border(&mut dots, &mut rng, 277.0, 95.0, 84.0, 40.0, [1.0, 0.4, 0.0]);
        push_text(&mut dots, &mut rng, "u.v", 319.0, 100.0, 6.0, 3, 1.5, 1.5, orange);
        push_text(&mut dots, &mut rng, "ujjwalvivek.com", 320.0, 164.0, 6.0, 3, 1.5, 1.5, white);
        push_text(&mut dots, &mut rng, "DIRECTORY", 320.0, 220.0, 3.0, 1, 2.2, 1.5, grey);
        HeroGame {
            player,
            trail: [Vec2::new(0.0, 344.0); TRAIL],
            trail_head: 0,
            embers,
            stars,
            dots,
            sky: sky_leg(0),
            sky_stage: 0,
            violet: 0.0,
            rng,
            time: 0.0,
        }
    }
    fn update(&mut self, ctx: &mut Context<HeroAction>) {
        let dt = ctx.delta_time.min(0.05);
        self.time += dt;
        self.sky.advance(dt);
        if self.sky.done() {
            // warm -> violet -> warm, back and forth
            self.sky_stage = if self.sky_stage == 1 { 2 } else { 1 };
            self.sky = sky_leg(self.sky_stage);
        }
        let p = self.sky.progress();
        self.violet = match self.sky_stage {
            0 => 0.0,
            1 => p,
            _ => 1.0 - p,
        };
        VIOLET.store(self.violet.to_bits(), Ordering::Relaxed);
        self.player.pos.x += self.player.velocity.x * dt;
        self.player.pos.y = 360.0 - self.player.size.y;
        let max_x = 640.0 - self.player.size.x;
        if self.player.pos.x <= 0.0 {
            self.player.pos.x = 0.0;
            self.player.velocity.x = self.player.velocity.x.abs();
        } else if self.player.pos.x >= max_x {
            self.player.pos.x = max_x;
            self.player.velocity.x = -self.player.velocity.x.abs();
        }
        self.trail[self.trail_head] = self.player.pos;
        self.trail_head = (self.trail_head + 1) % TRAIL;
        let zones = ember_zones(self.player.pos.x + self.player.size.x / 2.0, self.player.pos.y);
        for e in self.embers.iter_mut() {
            e.life += dt / e.lifetime;
            if e.life >= 1.0 {
                let zi = (rand_range(&mut self.rng, 0.0, SPAWN_ZONE_COUNT as f32)) as usize % SPAWN_ZONE_COUNT;
                let (cx, cy, sx, sy) = zones[zi];
                *e = spawn_ember(&mut self.rng, cx, cy, sx, sy, 0.0);
            }
            e.origin_y += dt * 0.2;
        }
    }
    fn render(&mut self, ctx: &mut Context<HeroAction>) {
        for s in &self.stars {
            let a = 0.10 + 0.32 * (0.5 + 0.5 * (self.time * s.speed * TAU + s.phase * TAU).sin());
            ctx.draw_rect_layer(RenderLayer::Background, Vec2::new(s.x, s.y), Vec2::new(1.0, 1.0), [0.65, 0.65, 0.75, a]);
        }
        // light band that sweeps over the wordmark once everything has landed, then rests
        let sweep_x = if self.time < ASSEMBLE + 1.2 { -1000.0 } else { -60.0 + ((self.time - ASSEMBLE - 1.2) * 110.0) % 900.0 };
        for d in &self.dots {
            draw_dot(ctx, d, self.time, sweep_x, self.violet);
        }
        ctx.draw_rect(self.player.pos, self.player.size, [0.8, 0.8, 0.8, 1.0]);
        let trail_c = tone([1.0, 0.5, 0.1], self.violet);
        for i in 0..TRAIL {
            let p = self.trail[(self.trail_head + i) % TRAIL];
            let f = (i + 1) as f32 / TRAIL as f32;
            let s = self.player.size.x * (0.35 + 0.65 * f);
            ctx.draw_rect_additive(
                Vec2::new(p.x + (self.player.size.x - s) / 2.0, p.y + (self.player.size.y - s) / 2.0),
                Vec2::new(s, s),
                [trail_c[0], trail_c[1], trail_c[2], 0.16 * f * f],
            );
        }
        for e in &self.embers {
            let t = e.life;
            let wobble = (t * e.phase_speed * TAU + e.phase * TAU).sin() * 12.0;
            let x = e.origin_x + wobble + e.drift_x * t;
            let y = e.origin_y - t * e.speed * e.lifetime + (t * 3.0).sin() * 4.0;
            let fade_in = (t * 4.0).min(1.0);
            let fade_out = ((1.0 - t) * 3.0).min(1.0);
            let alpha = fade_in * fade_out * 0.75;
            let s = e.size * (1.0 - t * 0.2);
            let c = tone([e.r, e.g, e.b], self.violet);
            ctx.draw_rect_additive(Vec2::new(x, y), Vec2::new(s, s), [c[0], c[1], c[2], alpha]);
        }
    }
    fn ui(
        &mut self,
        _egui_ctx: &engine::egui::Context,
        _ctx: &mut Context<Self::Action>,
        scene_params: &mut engine::SceneParams,
    ) {
        scene_params.background_color = [0.04, 0.04, 0.04];
        scene_params.sky = self.sky.lerp();
        scene_params.fog_color = [0.10, 0.06, 0.04];
        scene_params.fog_density = 8.0;
        scene_params.fog_opacity = 0.45;
    }
}

#[wasm_bindgen]
pub struct AudioEngine {
    transport: Transport,
    sample_rate: f32,
    kick_pat: EuclideanPattern<16>,
    synth_pat: EuclideanPattern<16>,
    kick_phase: f32,
    kick_env: f32,
    synth_phase1: f32,
    synth_phase2: f32,
    synth_freq: f32,
    synth_env: f32,
    filter_state: f32,
    sub_phase: f32,
    delay_line: Vec<f32>,
    delay_idx: usize,
    markov: MarkovChain<8>,
    lfsr: u32,
    ui_hover_phase: f32,
    ui_hover_env: f32,
    ui_click_env: f32,
    ui_click_seed: u32,
    music_muted: bool,
    hat_pat: EuclideanPattern<16>,
    hat_env: f32,
    hat_seed: u32,
    pad_phases: [f32; 3],
    pad_env: f32,
    pad_freqs: [f32; 3],
    lfo_phase: f32,
    chord_idx: usize,
    bass_freq: f32,
    snare_env: f32,
    snare_seed: u32,
    arp_phase: f32,
    arp_env: f32,
    arp_note_idx: usize,
}

#[wasm_bindgen]
impl AudioEngine {
    #[wasm_bindgen(constructor)]
    pub fn new(sample_rate: u32) -> Self {
        let bpm = 80.0;
        let transport = Transport::new(sample_rate, bpm);
        let kick_pat = EuclideanPattern::<16>::new(4, 16, 0);
        let synth_pat = EuclideanPattern::<16>::new(7, 16, 2);
        let matrix = [
            [10, 30, 20, 10, 10, 10,  5,  5],
            [20, 10, 30, 20, 10,  5,  5,  0],
            [10, 20, 10, 30, 20, 10,  0,  0],
            [ 5, 10, 20, 10, 30, 20,  5,  0],
            [ 0,  5, 10, 20, 10, 30, 20,  5],
            [ 0,  0,  5, 10, 20, 10, 30, 25],
            [ 5,  0,  0,  5, 10, 20, 10, 50],
            [30, 10,  0,  0,  5, 10, 20, 25],
        ];
        let markov = MarkovChain::new(matrix, 0);
        let delay_samples = (sample_rate as f32 * 60.0 / bpm * 0.75) as usize;
        let hat_pat = EuclideanPattern::<16>::new(8, 16, 0);
        Self {
            transport,
            sample_rate: sample_rate as f32,
            kick_pat,
            synth_pat,
            kick_phase: 0.0,
            kick_env: 0.0,
            synth_phase1: 0.0,
            synth_phase2: 0.0,
            synth_freq: 110.0,
            synth_env: 0.0,
            filter_state: 0.0,
            sub_phase: 0.0,
            delay_line: vec![0.0; delay_samples],
            delay_idx: 0,
            markov,
            lfsr: 0xBEEF,
            ui_hover_phase: 0.0,
            ui_hover_env: 0.0,
            ui_click_env: 0.0,
            ui_click_seed: 123456789,
            music_muted: true,
            hat_pat,
            hat_env: 0.0,
            hat_seed: 987654321,
            pad_phases: [0.0; 3],
            pad_env: 0.0,
            pad_freqs: [0.0; 3],
            lfo_phase: 0.0,
            chord_idx: 0,
            bass_freq: 55.0,
            snare_env: 0.0,
            snare_seed: 111111111,
            arp_phase: 0.0,
            arp_env: 0.0,
            arp_note_idx: 0,
        }
    }
    pub fn play_ui_click(&mut self) {
        self.ui_click_env = 1.0;
    }
    pub fn play_ui_hover(&mut self) {
        self.ui_hover_env = 1.0;
    }
    pub fn toggle_music(&mut self) {
        self.music_muted = !self.music_muted;
    }
    pub fn process(&mut self, output: &mut [f32]) {
        let chords: [(f32, f32, f32); 4] = [
            (110.0, 130.81, 164.81),
            (174.61, 220.0, 261.63),
            (130.81, 164.81, 196.0),
            (196.0, 246.94, 293.66),
        ];
        let scale = [110.0, 123.47, 130.81, 146.83, 164.81, 174.61, 196.00, 220.0];
        let dt = 1.0 / self.sample_rate;
        for i in 0..output.len() {
            if self.transport.tick() {
                let step = self.transport.current_step() as usize;
                if step == 0 {
                    self.chord_idx = (self.chord_idx + 1) % 4;
                    let (root, third, fifth) = chords[self.chord_idx];
                    self.pad_freqs = [root, third, fifth];
                    self.bass_freq = root * 0.5;
                }
                if self.kick_pat.is_active(step) {
                    self.kick_env = 1.0;
                }
                if self.synth_pat.is_active(step) {
                    self.lfsr = self.lfsr ^ (self.lfsr << 13);
                    self.lfsr = self.lfsr ^ (self.lfsr >> 17);
                    self.lfsr = self.lfsr ^ (self.lfsr << 5);
                    let next_state = self.markov.next(self.lfsr as u16);
                    self.synth_freq = scale[next_state];
                    self.synth_env = 1.0;
                    self.pad_env = 1.0;
                }
                if step == 4 || step == 12 {
                    self.snare_env = 1.0;
                }
                if step % 2 == 0 {
                    self.arp_note_idx = (self.arp_note_idx + 1) % 3;
                    self.arp_env = 1.0;
                }
                if self.hat_pat.is_active(step) {
                    self.hat_env = 1.0;
                }
            }
            let kick_pitch = 40.0 + (self.kick_env * 120.0);
            self.kick_phase = (self.kick_phase + kick_pitch * dt) % 1.0;
            let kick_osc = (self.kick_phase * TAU).sin();
            let kick_out = kick_osc * self.kick_env;
            self.kick_env *= 0.9992;
            self.sub_phase = (self.sub_phase + self.bass_freq * dt) % 1.0;
            let sub_osc = (self.sub_phase * TAU).sin();
            let sidechain = 1.0 - (self.kick_env * 0.8);
            let sub_out = sub_osc * sidechain * 0.12;
            self.synth_phase1 = (self.synth_phase1 + self.synth_freq * dt) % 1.0;
            self.synth_phase2 = (self.synth_phase2 + (self.synth_freq * 1.01) * dt) % 1.0;
            let saw1 = self.synth_phase1 * 2.0 - 1.0;
            let saw2 = self.synth_phase2 * 2.0 - 1.0;
            let synth_raw = (saw1 + saw2) * 0.5;
            let lfo = (self.lfo_phase * TAU).sin();
            self.lfo_phase = (self.lfo_phase + 0.3 * dt) % 1.0;
            let lfo_mod = (lfo + 1.0) * 0.06;
            let cutoff = 0.02 + lfo_mod + (self.synth_env * 0.15);
            self.filter_state += (synth_raw - self.filter_state) * cutoff;
            let synth_out = self.filter_state * self.synth_env;
            self.synth_env *= 0.9996;
            self.snare_seed = self.snare_seed.wrapping_mul(1664525).wrapping_add(1013904223);
            let snare_noise = (self.snare_seed as f32 / u32::MAX as f32) * 2.0 - 1.0;
            let snare_out = snare_noise * self.snare_env * 0.25;
            self.snare_env *= 0.992;
            self.hat_seed = self.hat_seed.wrapping_mul(1664525).wrapping_add(1013904223);
            let hat_noise = (self.hat_seed as f32 / u32::MAX as f32) * 2.0 - 1.0;
            let hat_out = hat_noise * self.hat_env * 0.08;
            self.hat_env *= 0.96;
            for ch in 0..3 {
                let detune = [1.001, 1.0, 0.999][ch];
                self.pad_phases[ch] = (self.pad_phases[ch] + self.pad_freqs[ch] * detune * dt) % 1.0;
            }
            let pad_osc = (self.pad_phases[0] * TAU).sin() * 0.15
                + (self.pad_phases[1] * TAU).sin() * 0.15
                + (self.pad_phases[2] * TAU).sin() * 0.10;
            let pad_out = pad_osc * self.pad_env;
            self.pad_env *= 0.9995;
            let arp_freq = self.pad_freqs[self.arp_note_idx] * 2.0;
            self.arp_phase = (self.arp_phase + arp_freq * dt) % 1.0;
            let arp_osc = (self.arp_phase * TAU).sin()
                + 0.5 * ((self.arp_phase * 2.0) % 1.0 * TAU).sin()
                + 0.3 * ((self.arp_phase * 3.0) % 1.0 * TAU).sin();
            let arp_out = arp_osc * 0.18 / 1.8 * self.arp_env;
            self.arp_env *= 0.997;
            let dry = (kick_out * 0.6) + sub_out + (synth_out * 0.5) + (pad_out * 0.35) + hat_out + snare_out + arp_out;
            let delay_read = self.delay_line[self.delay_idx];
            self.delay_line[self.delay_idx] = dry + (delay_read * 0.4);
            self.delay_idx = (self.delay_idx + 1) % self.delay_line.len();
            let mut final_out = if self.music_muted {
                0.0
            } else {
                (dry * 0.7) + (delay_read * 0.35)
            };
            let hover_pitch = 1000.0 + (self.ui_hover_env * 500.0);
            self.ui_hover_phase = (self.ui_hover_phase + hover_pitch * dt) % 1.0;
            let hover_osc = (self.ui_hover_phase * TAU).sin();
            let hover_out = hover_osc * self.ui_hover_env * 0.15;
            self.ui_hover_env *= 0.995;
            self.ui_click_seed = self.ui_click_seed.wrapping_mul(1664525).wrapping_add(1013904223);
            let noise = (self.ui_click_seed as f32 / u32::MAX as f32) * 2.0 - 1.0;
            let click_out = noise * self.ui_click_env * 0.20;
            self.ui_click_env *= 0.985;
            final_out += hover_out + click_out;
            output[i] = final_out.tanh();
        }
    }
}

#[wasm_bindgen(start)]
pub fn wasm_main() {
    engine::run_wasm::<HeroGame>();
}
