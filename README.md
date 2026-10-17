# root.ujjwalvivek.com

<!-- releasegen:demo:start -->
![game scene](media/hero.gif)
<!-- releasegen:demo:end -->

Honestly, a "**Link**"tree, but nicer. Website uses `Zola` under the hood, depends on the `journey` stack and `substrate` for a dystopian setting, all wrapped with a vanilla css. All audio is synthesized and goes through an AudioWorklet, with a ScriptProcessor fallback (iOS, old browsers).

![hero](media/hero.png)

## Git log

Drawn from the echopoint data, so it takes the page colours.

![git log](media/gitlog.gif)

## Mail Me

![terminal mail](media/mail.gif)

## Build and run

```sh
cd game
wasm-pack build --target web --out-name game --out-dir ../static/game
cd ..
zola serve --interface [IP_ADDRESS] # 0.0.0.0 --port 1111
```

## Acknowledgements

![journey row](media/zoom-journey.png)

![substrate row](media/zoom-substrate.png)

![echopoint row](media/zoom-echopoint.png)

## License

![click counter](media/clicker.gif)

This repository is licensed with the [MIT LICENSE](License).
