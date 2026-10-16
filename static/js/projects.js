// Everything shown on the page lives here. Edit this file, nothing else, to change what is listed.
//
// One row per working website. Related things (docs, packages, itch pages, shortcuts) hang off
// that row as badges, rendered through echopoint (see badgeFor in main.js).
// A row's `license: { repo, spdx }` and `release: "<repo>"` are not badges: they are drawn as quiet text next to the title.
// The license is static; the release tag and age are read from echopoint (a ~1.5 KB record), so no svg is fetched.
//
// badge kinds and their fields:
//   custom   logo, left, right, href
//   stars    repo
//   npm      pkg, alias?           pkg is the @ujjwalvivek/<pkg> name, alias is echopoint's store key
//   cargo    crate
//   pypi     pkg
//   docker   image
//   status   target, href

const gh = "https://github.com/ujjwalvivek";

export const links = [
  {
    title: "ujjwalvivek.com",
    url: "https://ujjwalvivek.com",
    license: { repo: "portfolio", spdx: "MIT" },
    release: "portfolio",
    badges: [{ kind: "stars", repo: "portfolio" }],
  },
  {
    title: "ujjwalvivek.itch.io",
    url: "https://ujjwalvivek.itch.io/",
    badges: [
      {
        kind: "custom",
        logo: "game",
        left: "games",
        right: "PLAY",
        href: "https://ujjwalvivek.itch.io/",
      },
    ],
  },
  {
    title: "devhub.ujjwalvivek.com",
    url: "https://devhub.ujjwalvivek.com",
    license: { repo: "devhub", spdx: "MIT" },
    release: "devhub",
    badges: [
      {
        kind: "custom",
        logo: "binaries",
        left: "download",
        right: "DEVHUB",
        href: "https://devhub.ujjwalvivek.com/",
      },
      { kind: "stars", repo: "devhub" },
    ],
  },
  {
    title: "helide.ujjwalvivek.com",
    url: "https://helide.ujjwalvivek.com",
    license: { repo: "helide", spdx: "MIT" },
    release: "helide",
    badges: [{ kind: "stars", repo: "helide" }],
  },
  {
    title: "synclippy.ujjwalvivek.com",
    url: "https://synclippy.ujjwalvivek.com",
    license: { repo: "synclippy", spdx: "MIT" },
    release: "synclippy",
    badges: [
      { kind: "docker", image: "synclippy" },
      {
        kind: "custom",
        logo: "binaries",
        left: "ios",
        right: "POST",
        href: "https://www.icloud.com/shortcuts/3ad8b7897bbb4a9caf6574756d5ab847",
      },
      {
        kind: "custom",
        logo: "binaries",
        left: "ios",
        right: "GET",
        href: "https://www.icloud.com/shortcuts/235120942d3e42ffa3464ab0a67a7876",
      },
      { kind: "stars", repo: "synclippy" },
    ],
  },
  {
    title: "store.steampowered.com/app/4958570/Woodpecker",
    url: "https://store.steampowered.com/app/4958570/Woodpecker",
    badges: [
      {
        kind: "custom",
        logo: "game",
        left: "steam",
        right: "WOODPECKER",
        href: "https://store.steampowered.com/app/4958570/Woodpecker",
      },
    ],
  },
  {
    title: "baremetal.ujjwalvivek.com",
    url: "https://baremetal.ujjwalvivek.com",
    license: { repo: "baremetal", spdx: "GPL-3.0" },
    release: "baremetal",
    badges: [{ kind: "stars", repo: "baremetal" }],
  },
  {
    title: "mazerunner.ujjwalvivek.com",
    url: "https://mazerunner.ujjwalvivek.com",
    license: { repo: "mazerunner", spdx: "MIT" },
    release: "mazerunner",
    badges: [{ kind: "stars", repo: "mazerunner" }],
  },
  {
    title: "davefuck.ujjwalvivek.com",
    url: "https://davefuck.ujjwalvivek.com",
    license: { repo: "davefuck", spdx: "MIT" },
    badges: [{ kind: "stars", repo: "davefuck" }],
  },
  {
    title: "svgmetro.ujjwalvivek.com",
    url: "https://svgmetro.ujjwalvivek.com",
    license: { repo: "svgmetro", spdx: "MIT" },
    release: "svgmetro",
    badges: [
      {
        kind: "custom",
        logo: "game",
        left: "itch",
        right: "PLAY",
        href: "https://ujjwalvivek.itch.io/svg-metro",
      },
      { kind: "npm", pkg: "svg-metro", alias: "svgmetro" },
      { kind: "stars", repo: "svgmetro" },
    ],
  },
  {
    title: "journey.ujjwalvivek.com",
    url: "https://journey.ujjwalvivek.com",
    license: { repo: "journey", spdx: "MIT" },
    release: "journey",
    badges: [
      {
        kind: "custom",
        logo: "game",
        left: "game",
        right: "PLAY",
        href: "https://journey.ujjwalvivek.com",
      },
      {
        kind: "custom",
        logo: "docs",
        left: "docs",
        right: "MD",
        href: "https://docs.journey.ujjwalvivek.com",
      },
      { kind: "cargo", crate: "journey-engine" },
      { kind: "npm", pkg: "journey-engine" },
      {
        kind: "custom",
        logo: "game",
        left: "requiem",
        right: "PLAY",
        href: "https://ujjwalvivek.itch.io/requiem-the-game",
      },
      {
        kind: "custom",
        logo: "game",
        left: "dino-blink",
        right: "PLAY",
        href: "https://ujjwalvivek.itch.io/dino-blink",
      },
      { kind: "stars", repo: "journey" },
    ],
  },
  {
    title: "loom.ujjwalvivek.com",
    url: "https://loom.ujjwalvivek.com",
    license: { repo: "loom", spdx: "MIT" },
    release: "loom",
    badges: [{ kind: "stars", repo: "loom" }],
  },
  {
    title: "tinyts.ujjwalvivek.com",
    url: "https://tinyts.ujjwalvivek.com",
    license: { repo: "tinyts", spdx: "MIT" },
    release: "tinyts",
    badges: [
      {
        kind: "custom",
        logo: "docs",
        left: "docs",
        right: "REFERENCE",
        href: "https://tinyts.ujjwalvivek.com/documents/REFERENCE",
      },
      {
        kind: "custom",
        logo: "game",
        left: "examples",
        right: "PLAY",
        href: "https://tinyts.ujjwalvivek.com/examples",
      },
      { kind: "npm", pkg: "tinyts" },
      { kind: "stars", repo: "tinyts" },
    ],
  },
  {
    title: "gogs.ujjwalvivek.com",
    url: "https://gogs.ujjwalvivek.com",
    license: { repo: "gogs", spdx: "MIT" },
    release: "gogs",
    badges: [{ kind: "stars", repo: "gogs" }],
  },
  {
    title: "echopoint.ujjwalvivek.com",
    url: "https://echopoint.ujjwalvivek.com",
    license: { repo: "echopoint", spdx: "MIT" },
    badges: [
      {
        kind: "status",
        target: "echopoint",
        href: "https://echopoint.ujjwalvivek.com/v1/health",
      },
      {
        kind: "custom",
        logo: "game",
        left: "svg",
        right: "PROFILE",
        href: "https://echopoint.ujjwalvivek.com/svg/profile?profileWidth=860&profileGap=18&profilePadding=20&profileWindow=8&profileCommitLimit=3&profileSources=true&limit=13",
      },
      {
        kind: "custom",
        logo: "game",
        left: "svg",
        right: "LANGUAGES",
        href: "https://echopoint.ujjwalvivek.com/svg/langv2?limit=6",
      },
      { kind: "pypi", pkg: "echohub" },
      { kind: "stars", repo: "echopoint" },
    ],
  },
  {
    title: "substrate.ujjwalvivek.com",
    url: "https://substrate.ujjwalvivek.com",
    license: { repo: "substrate", spdx: "MIT" },
    badges: [
      {
        kind: "custom",
        logo: "docs",
        left: "docs",
        right: "MD",
        href: "https://substrate.ujjwalvivek.com/#/docs",
      },
      { kind: "npm", pkg: "substrate" },
      { kind: "stars", repo: "substrate" },
    ],
  },
  {
    title: "pysitegen.ujjwalvivek.com",
    url: "https://pysitegen.ujjwalvivek.com",
    license: { repo: "pysitegen", spdx: "MIT" },
    release: "pysitegen",
    badges: [
      {
        kind: "custom",
        logo: "docs",
        left: "docs",
        right: "MD",
        href: "https://pysitegen.ujjwalvivek.com/#docs",
      },
      { kind: "pypi", pkg: "pysitegen" },
      { kind: "stars", repo: "pysitegen" },
    ],
  },
  {
    title: "tinybench.ujjwalvivek.com",
    url: "https://tinybench.ujjwalvivek.com",
    license: { repo: "tinybench", spdx: "MIT" },
    badges: [{ kind: "stars", repo: "tinybench" }],
  },
  {
    title: "pixess.ujjwalvivek.com",
    url: "https://pixess.ujjwalvivek.com",
    license: { repo: "pixess", spdx: "MIT" },
    badges: [{ kind: "stars", repo: "pixess" }],
  },
  {
    title: "github.com/ujjwalvivek/thereckoning",
    url: `${gh}/thereckoning`,
    license: { repo: "thereckoning", spdx: "MIT" },
    badges: [{ kind: "stars", repo: "thereckoning" }],
  },
];
