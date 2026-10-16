# root.ujjwalvivek.com

![game canvas](media/zoom-game.png)

Honestly, a "**Link**"tree, but nicer. Website uses `Zola` under the hood, depends on the `journey` stack and `substrate` for a dystopian setting, all wrapped with a vanilla css. All audio is synthesized and goes through an AudioWorklet, with a ScriptProcessor fallback (iOS, old browsers).

![journey row](media/zoom-journey.png)

![echopoint row](media/zoom-echopoint.png)

## Build and run

```sh
cd game
wasm-pack build --target web --out-dir ../public/game
cd ..
zola serve --interface [IP_ADDRESS] # 0.0.0.0 --port 1111
```

![hero](media/hero.png)

![links](media/links.png)

## Global Clicker

![click counter](media/zoom-clicker.png)

## Acknowledgement

- [Journey Engine](https://crates.io/crates/journey-engine)
- [Resonance](https://crates.io/crates/journey-sound)
- [Cadence](https://crates.io/crates/journey-sequencer)
- [Substrate](https://www.npmjs.com/package/@ujjwalvivek/substrate)
- [Echopoint](https://echopoint.ujjwalvivek.com)
- [Zola](https://github.com/getzola/zola)

## Phone

<img src="media/mobile-hero.png" width="320"> <img src="media/mobile-links.png" width="320">

## License

This repository is licensed with the [MIT LICENSE](License).
