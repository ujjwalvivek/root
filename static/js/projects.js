// Everything shown on the page lives here. Edit this file, nothing else, to change what is listed.
//
// One row per working website. Related things (docs, packages, itch pages, shortcuts) hang off
// that row as badges, rendered through echopoint (see featuredBadge in main.js).
//
// badge kinds and their fields:
//   license  repo, spdx            "code | SPDX", links to the repo LICENSE
//   custom   logo, left, right, href
//   stars    repo
//   release  repo
//   npm      pkg, alias?           pkg is the @ujjwalvivek/<pkg> name, alias is echopoint's store key
//   cargo    crate
//   pypi     pkg
//   docker   image
//   status   target, href

const gh = "https://github.com/ujjwalvivek";

export const links = [
    {
        title: "ujjwalvivek.com", url: "https://ujjwalvivek.com", badges: [
            { kind: "license", repo: "portfolio", spdx: "MIT" },
            { kind: "release", repo: "portfolio" },
            { kind: "stars", repo: "portfolio" },
        ],
    },
    {
        title: "journey.ujjwalvivek.com", url: "https://journey.ujjwalvivek.com", badges: [
            { kind: "license", repo: "journey", spdx: "MIT" },
            { kind: "custom", logo: "game", left: "game", right: "PLAY", href: "https://journey.ujjwalvivek.com" },
            { kind: "custom", logo: "docs", left: "docs", right: "MD", href: "https://docs.journey.ujjwalvivek.com" },
            { kind: "cargo", crate: "journey-engine" },
            { kind: "npm", pkg: "journey-engine" },
            { kind: "custom", logo: "game", left: "requiem", right: "PLAY", href: "https://ujjwalvivek.itch.io/requiem-the-game" },
            { kind: "npm", pkg: "requiem" },
            { kind: "custom", logo: "game", left: "dino-blink", right: "PLAY", href: "https://ujjwalvivek.itch.io/dino-blink" },
            { kind: "npm", pkg: "dino-blink" },
            { kind: "release", repo: "journey" },
            { kind: "stars", repo: "journey" },
        ],
    },
    {
        title: "tinyts.ujjwalvivek.com", url: "https://tinyts.ujjwalvivek.com", badges: [
            { kind: "license", repo: "tinyts", spdx: "MIT" },
            { kind: "custom", logo: "docs", left: "docs", right: "REFERENCE", href: "https://tinyts.ujjwalvivek.com/documents/REFERENCE" },
            { kind: "custom", logo: "game", left: "examples", right: "PLAY", href: "https://tinyts.ujjwalvivek.com/examples" },
            { kind: "npm", pkg: "tinyts" },
            { kind: "release", repo: "tinyts" },
            { kind: "stars", repo: "tinyts" },
        ],
    },
    {
        title: "substrate.ujjwalvivek.com", url: "https://substrate.ujjwalvivek.com", badges: [
            { kind: "license", repo: "substrate", spdx: "MIT" },
            { kind: "custom", logo: "game", left: "bg", right: "PLAY", href: "https://substrate.ujjwalvivek.com/" },
            { kind: "custom", logo: "docs", left: "docs", right: "MD", href: "https://substrate.ujjwalvivek.com/#/docs" },
            { kind: "npm", pkg: "substrate" },
            { kind: "stars", repo: "substrate" },
        ],
    },
    {
        title: "loom.ujjwalvivek.com", url: "https://loom.ujjwalvivek.com", badges: [
            { kind: "license", repo: "loom", spdx: "MIT" },
            { kind: "release", repo: "loom" },
            { kind: "stars", repo: "loom" },
        ],
    },
    {
        title: "gogs.ujjwalvivek.com", url: "https://gogs.ujjwalvivek.com", badges: [
            { kind: "license", repo: "gogs", spdx: "MIT" },
            { kind: "release", repo: "gogs" },
            { kind: "stars", repo: "gogs" },
        ],
    },
    {
        title: "pysitegen.ujjwalvivek.com", url: "https://pysitegen.ujjwalvivek.com", badges: [
            { kind: "license", repo: "pysitegen", spdx: "MIT" },
            { kind: "custom", logo: "docs", left: "docs", right: "MD", href: "https://pysitegen.ujjwalvivek.com/#docs" },
            { kind: "pypi", pkg: "pysitegen" },
            { kind: "release", repo: "pysitegen" },
            { kind: "stars", repo: "pysitegen" },
        ],
    },
    {
        title: "echopoint.ujjwalvivek.com", url: "https://echopoint.ujjwalvivek.com", badges: [
            { kind: "license", repo: "echopoint", spdx: "MIT" },
            { kind: "custom", logo: "game", left: "svg", right: "GENERATOR", href: "https://echopoint.ujjwalvivek.com/#docs" },
            { kind: "status", target: "echopoint", href: "https://echopoint.ujjwalvivek.com/v1/health" },
            { kind: "custom", logo: "game", left: "svg", right: "CALENDAR", href: "https://echopoint.ujjwalvivek.com/svg/calendar?ytd=1" },
            { kind: "custom", logo: "game", left: "svg", right: "PROFILE", href: "https://echopoint.ujjwalvivek.com/svg/profile?profileWidth=860&profileGap=18&profilePadding=20&profileWindow=8&profileCommitLimit=3&profileSources=true&limit=13" },
            { kind: "custom", logo: "game", left: "svg", right: "LANGUAGES", href: "https://echopoint.ujjwalvivek.com/svg/langv2?limit=6" },
            { kind: "pypi", pkg: "echohub" },
            { kind: "stars", repo: "echopoint" },
        ],
    },
    {
        title: "synclippy.ujjwalvivek.com", url: "https://synclippy.ujjwalvivek.com", badges: [
            { kind: "license", repo: "synclippy", spdx: "MIT" },
            { kind: "docker", image: "synclippy" },
            { kind: "custom", logo: "game", left: "open", right: "SYNCLIPPY", href: "https://synclippy.ujjwalvivek.com/" },
            { kind: "custom", logo: "binaries", left: "ios", right: "POST", href: "https://www.icloud.com/shortcuts/3ad8b7897bbb4a9caf6574756d5ab847" },
            { kind: "custom", logo: "binaries", left: "ios", right: "GET", href: "https://www.icloud.com/shortcuts/235120942d3e42ffa3464ab0a67a7876" },
            { kind: "release", repo: "synclippy" },
            { kind: "stars", repo: "synclippy" },
        ],
    },
    {
        title: "devhub.ujjwalvivek.com", url: "https://devhub.ujjwalvivek.com", badges: [
            { kind: "license", repo: "devhub", spdx: "MIT" },
            { kind: "custom", logo: "binaries", left: "download", right: "DEVHUB", href: "https://devhub.ujjwalvivek.com/" },
            { kind: "release", repo: "devhub" },
            { kind: "stars", repo: "devhub" },
        ],
    },
    {
        title: "helide.ujjwalvivek.com", url: "https://helide.ujjwalvivek.com", badges: [
            { kind: "license", repo: "helide", spdx: "MIT" },
            { kind: "release", repo: "helide" },
            { kind: "stars", repo: "helide" },
        ],
    },
    {
        title: "tinybench.ujjwalvivek.com", url: "https://tinybench.ujjwalvivek.com", badges: [
            { kind: "license", repo: "tinybench", spdx: "MIT" },
            { kind: "stars", repo: "tinybench" },
        ],
    },
    {
        title: "pixess.ujjwalvivek.com", url: "https://pixess.ujjwalvivek.com", badges: [
            { kind: "license", repo: "pixess", spdx: "MIT" },
            { kind: "stars", repo: "pixess" },
        ],
    },
    {
        title: "baremetal.ujjwalvivek.com", url: "https://baremetal.ujjwalvivek.com", badges: [
            { kind: "license", repo: "baremetal", spdx: "GPL-3.0" },
            { kind: "custom", logo: "game", left: "open", right: "TERMINAL", href: "https://baremetal.ujjwalvivek.com/" },
            { kind: "release", repo: "baremetal" },
            { kind: "stars", repo: "baremetal" },
        ],
    },
    {
        title: "mazerunner.ujjwalvivek.com", url: "https://mazerunner.ujjwalvivek.com", badges: [
            { kind: "license", repo: "mazerunner", spdx: "MIT" },
            { kind: "release", repo: "mazerunner" },
            { kind: "stars", repo: "mazerunner" },
        ],
    },
    {
        title: "davefuck.ujjwalvivek.com", url: "https://davefuck.ujjwalvivek.com", badges: [
            { kind: "license", repo: "davefuck", spdx: "MIT" },
            { kind: "stars", repo: "davefuck" },
        ],
    },
    {
        title: "svgmetro.ujjwalvivek.com", url: "https://svgmetro.ujjwalvivek.com", badges: [
            { kind: "license", repo: "svgmetro", spdx: "MIT" },
            { kind: "custom", logo: "game", left: "itch", right: "PLAY", href: "https://ujjwalvivek.itch.io/svg-metro" },
            { kind: "npm", pkg: "svg-metro", alias: "svgmetro" },
            { kind: "release", repo: "svgmetro" },
            { kind: "stars", repo: "svgmetro" },
        ],
    },
    {
        title: "ujjwalvivek.itch.io", url: "https://ujjwalvivek.itch.io/", badges: [
            { kind: "custom", logo: "game", left: "games", right: "PLAY", href: "https://ujjwalvivek.itch.io/" },
        ],
    },
    {
        title: "github.com/ujjwalvivek/thereckoning", url: `${gh}/thereckoning`, badges: [
            { kind: "license", repo: "thereckoning", spdx: "MIT" },
            { kind: "stars", repo: "thereckoning" },
        ],
    },
    {
        title: "store.steampowered.com/app/4958570/Woodpecker", url: "https://store.steampowered.com/app/4958570/Woodpecker", badges: [
            { kind: "custom", logo: "game", left: "steam", right: "WOODPECKER", href: "https://store.steampowered.com/app/4958570/Woodpecker" },
        ],
    },
];
