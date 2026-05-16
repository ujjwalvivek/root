use engine::{Context, GameAction, GameApp, Vec2};
use wasm_bindgen::prelude::*;
use cadence::{Transport, EuclideanPattern, MarkovChain};
use core::f32::consts::TAU;

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

struct Player {
    pos: Vec2,
    size: Vec2,
    velocity: Vec2,
}

pub struct HeroGame {
    player: Player,
}

impl GameApp for HeroGame {
    type Action = HeroAction;
    fn internal_resolution() -> (u32, u32) { (640, 360) }
    fn init(_ctx: &mut Context<HeroAction>) -> Self {
        HeroGame {
            player: Player {
                pos: Vec2::new(0.0, 344.0),
                size: Vec2::new(16.0, 16.0),
                velocity: Vec2::new(100.0, 0.0),
            },
        }
    }
    fn update(&mut self, ctx: &mut Context<HeroAction>) {
        let dt = ctx.delta_time.min(0.05);
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
    }
    fn render(&mut self, ctx: &mut Context<HeroAction>) {
        ctx.draw_rect(self.player.pos, self.player.size, [0.8, 0.8, 0.8, 1.0]);
        draw_text(ctx, "ujjwalvivek.com", Vec2::new(140.0, 140.0), [1.0, 1.0, 1.0, 1.0], 5.0, 1.5);
        draw_text(ctx, "DIRECTORY", Vec2::new(260.0, 200.0), [0.7, 0.7, 0.7, 1.0], 3.0, 1.5);
    }
    fn ui(
        &mut self,
        _egui_ctx: &engine::egui::Context,
        _ctx: &mut Context<Self::Action>,
        scene_params: &mut engine::SceneParams,
    ) {
        scene_params.background_color = [0.05, 0.05, 0.05];
        scene_params.fog_color = [0.08, 0.08, 0.08];
        scene_params.fog_density = 8.0;
        scene_params.fog_opacity = 0.7;
    }
}

fn draw_text(ctx: &mut Context<HeroAction>, text: &str, start: Vec2, color: [f32; 4], block_size: f32, spacing: f32) {
    let font: &[(char, &[&str])] = &[
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
    let mut x_offset = start.x;
    for c in text.chars() {
        if let Some((_, glyph)) = font.iter().find(|(ch, _)| *ch == c) {
            for (y, row) in glyph.iter().enumerate() {
                for (x, bit) in row.chars().enumerate() {
                    if bit == '1' {
                        let center = Vec2::new(
                            x_offset + (x as f32) * block_size + block_size / 2.0,
                            start.y + (y as f32) * block_size + block_size / 2.0
                        );
                        ctx.draw_rect(center, Vec2::new(block_size, block_size), color);
                    }
                }
            }
            x_offset += 3.0 * block_size + spacing * block_size;
        } else {
            x_offset += 2.0 * block_size + spacing * block_size;
        }
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
}

#[wasm_bindgen]
impl AudioEngine {
    #[wasm_bindgen(constructor)]
    pub fn new(sample_rate: u32) -> Self {
        let bpm = 80.0;
        let transport = Transport::new(sample_rate, bpm);
        let kick_pat = EuclideanPattern::<16>::new(4, 16, 0);
        let synth_pat = EuclideanPattern::<16>::new(5, 16, 2);
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
        Self {
            transport,
            sample_rate: sample_rate as f32,
            kick_pat,
            synth_pat,
            kick_phase: 0.0,
            kick_env: 0.0,
            synth_phase1: 0.0,
            synth_phase2: 0.0,
            synth_freq: 110.0, // A2
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
        let scale = [110.0, 130.81, 146.83, 164.81, 196.00, 220.0, 261.63, 293.66];
        let dt = 1.0 / self.sample_rate;
        for i in 0..output.len() {
            if self.transport.tick() {
                let step = self.transport.current_step() as usize;
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
                }
            }
            let kick_pitch = 40.0 + (self.kick_env * 120.0);
            self.kick_phase = (self.kick_phase + kick_pitch * dt) % 1.0;
            let kick_osc = (self.kick_phase * TAU).sin();
            let kick_out = kick_osc * self.kick_env;
            self.kick_env *= 0.9992;
            self.sub_phase = (self.sub_phase + (self.synth_freq * 0.5) * dt) % 1.0;
            let sub_osc = (self.sub_phase * TAU).sin();
            let sidechain = 1.0 - (self.kick_env * 0.8);
            let sub_out = sub_osc * sidechain * 0.3;
            self.synth_phase1 = (self.synth_phase1 + self.synth_freq * dt) % 1.0;
            self.synth_phase2 = (self.synth_phase2 + (self.synth_freq * 1.01) * dt) % 1.0;
            let saw1 = self.synth_phase1 * 2.0 - 1.0;
            let saw2 = self.synth_phase2 * 2.0 - 1.0;
            let synth_raw = (saw1 + saw2) * 0.5;
            let cutoff = 0.02 + (self.synth_env * 0.15);
            self.filter_state += (synth_raw - self.filter_state) * cutoff;
            let synth_out = self.filter_state * self.synth_env;
            self.synth_env *= 0.9996;
            let dry = (kick_out * 0.6) + sub_out + (synth_out * 0.5);
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
