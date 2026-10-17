// Profile telemetry, drawn natively from echopoint's own data so it can follow the page theme: a contribution grid, streak,
// every language, and the latest commits.
const EP = "https://echopoint.ujjwalvivek.com";
const OWNER = "ujjwalvivek";
const WEEKS = 53;
const COMMITS = 5;
const DAY_MS = 86400000;

function el(tag, className, text) {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (text != null) node.textContent = text;
    return node;
}

async function getJson(path) {
    try {
        const res = await fetch(EP + path);
        return res.ok ? await res.json() : null;
    } catch (_) {
        return null;
    }
}

const prevDay = (date) => new Date(Date.parse(`${date}T00:00:00Z`) - DAY_MS).toISOString().slice(0, 10);
const fmt = (n) => Number(n).toLocaleString("en-US");

// Same rules as echopoint's own streak card: a zero for today does not break the run yet.
function streaks(days) {
    const counts = new Map(days.map((d) => [d.date, d.count]));
    const today = new Date().toISOString().slice(0, 10);
    let cursor = counts.has(today) ? today : days.at(-1)?.date;
    if (cursor === today && !(counts.get(cursor) > 0)) cursor = prevDay(cursor);
    let current = 0;
    while (cursor && counts.get(cursor) > 0) { current++; cursor = prevDay(cursor); }
    let longest = 0;
    let run = 0;
    for (const d of days) {
        run = d.count > 0 ? run + 1 : 0;
        longest = Math.max(longest, run);
    }
    return { current, longest };
}

// Levels 1 to 4 are the quartiles of the busy days, so the grid reads the same however active the year was.
function levelOf(counts) {
    const busy = counts.filter((n) => n > 0).sort((a, b) => a - b);
    const at = (q) => busy[Math.min(busy.length - 1, Math.floor(busy.length * q))] ?? 0;
    const [q1, q2, q3] = [at(0.25), at(0.5), at(0.75)];
    return (n) => (n <= 0 ? 0 : n <= q1 ? 1 : n <= q2 ? 2 : n <= q3 ? 3 : 4);
}

const shortDate = (iso) => new Date(iso).toLocaleString("en-US", { month: "short", day: "numeric" });

// The numbers are drawn in the same 3 x 5 pixel font as the wordmark in the game, as an svg of small squares, so they take the page colours.
const LED = {
    "0": ["111", "101", "101", "101", "111"],
    "1": ["010", "110", "010", "010", "111"],
    "2": ["111", "001", "111", "100", "111"],
    "3": ["111", "001", "111", "001", "111"],
    "4": ["101", "101", "111", "001", "001"],
    "5": ["111", "100", "111", "001", "111"],
    "6": ["111", "100", "111", "101", "111"],
    "7": ["111", "001", "001", "001", "001"],
    "8": ["111", "101", "111", "101", "111"],
    "9": ["111", "101", "111", "001", "111"],
};
const SVG_NS = "http://www.w3.org/2000/svg";

function led(text, label = text) {
    const svg = document.createElementNS(SVG_NS, "svg");
    svg.setAttribute("class", "tl-led");
    svg.setAttribute("role", "img");
    svg.setAttribute("aria-label", label);
    let x = 0;
    let n = 0;
    for (const ch of text) {
        const glyph = LED[ch];
        if (!glyph) { x += 2; continue; }
        glyph.forEach((row, y) => [...row].forEach((bit, i) => {
            if (bit !== "1") return;
            const pixel = document.createElementNS(SVG_NS, "rect");
            pixel.setAttribute("x", x + i);
            pixel.setAttribute("y", y);
            pixel.setAttribute("width", "0.8");
            pixel.setAttribute("height", "0.8");
            pixel.style.setProperty("--d", `${n++ * 8}ms`);
            svg.append(pixel);
        }));
        x += glyph[0].length + 1;
    }
    svg.setAttribute("viewBox", `0 0 ${x - 1} 5`);
    return svg;
}

function stat(label, number, unit, note) {
    const box = el("div", "tl-stat");
    const read = el("div", "tl-read");
    read.append(led(number.replace(/,/g, ""), number)); // drawn without the thousands comma, read out with it
    if (unit) read.append(el("span", "tl-unit", unit));
    box.append(el("span", "tl-label", label), read);
    if (note) box.append(el("small", "tl-note", note));
    return box;
}

function heatmap(weeks) {
    const rows = weeks.slice(-WEEKS);
    const level = levelOf(rows.flatMap((w) => w.contributionDays.map((d) => d.contributionCount)));
    const wrap = el("div", "tl-heat");
    const months = el("div", "tl-months");
    const grid = el("div", "tl-grid");
    let lastMonth = -1;
    let lastLabel = -9;
    rows.forEach((week, col) => {
        const first = week.contributionDays[0]?.date;
        const month = first ? new Date(`${first}T00:00:00Z`).getUTCMonth() : -1;
        if (month !== lastMonth && first) {
            lastMonth = month;
            // one label per month, kept clear of the previous one and of the right edge
            if (col - lastLabel >= 4 && col < rows.length - 3) {
                const tag = el("span", "", new Date(`${first}T00:00:00Z`).toLocaleString("en-US", { month: "short", timeZone: "UTC" }));
                tag.style.gridColumn = String(col + 1);
                tag.style.gridRow = "1";
                months.append(tag);
                lastLabel = col;
            }
        }
        for (let row = 0; row < 7; row++) {
            const day = week.contributionDays[row];
            const cell = el("i", day ? `l${level(day.contributionCount)}` : "l-");
            if (day) cell.title = `${day.date}: ${fmt(day.contributionCount)} contributions`;
            // the pixels come online left to right, a little out of step, like the dots of the wordmark landing
            cell.style.setProperty("--d", `${col * 14 + Math.floor(Math.random() * 220)}ms`);
            // and about a third of the lit ones flash now and then, each at its own pace
            if (day && day.contributionCount > 0 && Math.random() < 0.34) {
                cell.classList.add("tw");
                cell.style.setProperty("--tw", `${(3.5 + Math.random() * 6).toFixed(1)}s`);
                cell.style.setProperty("--tw-delay", `${(1.4 + Math.random() * 8).toFixed(1)}s`);
            }
            grid.append(cell);
        }
    });
    wrap.append(months, grid);
    return wrap;
}

function languages(data) {
    const entries = Object.entries(data || {}).filter(([, bytes]) => bytes > 0).sort((a, b) => b[1] - a[1]);
    const total = entries.reduce((sum, [, bytes]) => sum + bytes, 0);
    const block = el("div", "tl-langs");
    const bar = el("div", "tl-bar");
    const legend = el("div", "tl-legend");
    entries.forEach(([name, bytes], rank) => {
        const shade = Math.max(0.22, 1 - rank * 0.07);
        const part = el("i");
        part.style.flex = `${bytes} 0 1px`;
        part.style.setProperty("--o", shade);
        part.title = `${name}: ${((100 * bytes) / total).toFixed(1)}%`;
        bar.append(part);
        const item = el("span", "tl-lang");
        const swatch = el("u");
        swatch.style.setProperty("--o", shade);
        item.append(swatch, document.createTextNode(`${name} `), el("b", "", `${((100 * bytes) / total).toFixed(1)}%`));
        legend.append(item);
    });
    block.append(bar, legend);
    return block;
}

// A timeline like the one on the echopoint card: a square marker per commit on a vertical line, the message, then a meta line.
function commitList(commits) {
    const block = el("div", "tl-log");
    const head = el("div", "tl-log-head");
    head.append(el("span", "", "activity log"), el("span", "tl-live", "live feed"));
    const list = el("div", "tl-commits");
    for (const c of commits) {
        const row = el("div", "tl-commit");
        const link = el("a", "hover-link tl-msg", c.message);
        if (/^https:\/\/github\.com\//.test(c.url)) {
            link.href = c.url;
            link.target = "_blank";
            link.rel = "noopener";
        }
        const meta = el("div", "tl-meta");
        meta.append(
            el("b", "tl-repo", c.repo),
            document.createTextNode(` · ${shortDate(c.date)} · ${String(c.sha).slice(0, 7)} · `),
            el("em", "tl-add", `+${fmt(c.additions ?? 0)}`),
            document.createTextNode(" "),
            el("em", "tl-del", `-${fmt(c.deletions ?? 0)}`),
        );
        row.append(el("i", "tl-mark"), link, meta);
        list.append(row);
    }
    block.append(head, list, el("span", "tl-caret"));
    return block;
}

// Draws as soon as the summary arrives (it is the part everything else hangs off), then fills in the languages and the commits
// when their requests finish, so one slow request cannot hold the whole block back. The two slots below the grid keep their
// final height from the start, so the page under the block does not move as they fill in.
export async function mountTelemetry(host, repos = []) {
    const summaryRequest = getJson(`/v1/store/github:${OWNER}:summary`);
    const langRequest = getJson("/v1/langs");
    const commitRequests = repos.map((repo) => getJson(`/v1/store/github:${repo}:commits`).then((list) => (Array.isArray(list) ? list.map((c) => ({ ...c, repo })) : [])));

    const all = (await summaryRequest)?.data?.user?.allTime;
    host.classList.add("is-mounted");
    if (!all?.weeks) {
        host.replaceChildren(el("div", "lazy-fail", "telemetry unavailable"));
        return;
    }

    const days = all.weeks.flatMap((w) => w.contributionDays).map((d) => ({ date: d.date, count: d.contributionCount }));
    const { current, longest } = streaks(days);
    const lastYear = all.weeks.slice(-WEEKS).flatMap((w) => w.contributionDays).slice(-364).reduce((sum, d) => sum + d.contributionCount, 0);

    const root = el("div", "tl");
    const stats = el("div", "tl-stats");
    stats.append(
        stat("contributions", fmt(all.totalContributions)),
        stat("streak", fmt(current), "days", `longest ${fmt(longest)}`),
        stat("last year", fmt(lastYear)),
        stat("since", all.startDate?.slice(0, 4) ?? ""),
    );
    const langSlot = el("div", "tl-slot tl-slot-langs");
    const logSlot = el("div", "tl-slot tl-slot-log");
    root.append(stats, heatmap(all.weeks), langSlot, logSlot, el("div", "tl-scan"));
    host.classList.add("is-framed");
    host.replaceChildren(root);

    langRequest.then((langs) => { if (langs) langSlot.replaceChildren(languages(langs)); });
    Promise.all(commitRequests).then((sets) => {
        const commits = sets.flat().sort((a, b) => Date.parse(b.date) - Date.parse(a.date)).slice(0, COMMITS)
            .map((c) => ({ repo: c.repo, message: String(c.message).split("\n")[0].slice(0, 90), url: c.url, date: c.date, sha: c.sha, additions: c.additions, deletions: c.deletions }));
        if (commits.length) logSlot.replaceChildren(commitList(commits));
    });
}
