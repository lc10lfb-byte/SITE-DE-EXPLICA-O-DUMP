// ═══════════════════════════════════════════════════════════
// LC10 • Dump Analyzer — Universal v2.0
// author: x.lusca1
// features: parser, filtro, modos, geradores, export, menu
// ═══════════════════════════════════════════════════════════

const $ = (s) => document.querySelector(s);
const $$ = (s) => document.querySelectorAll(s);

const state = {
    game:        null,
    remotes:     new Map(),
    functions:   new Map(),
    modules:     new Map(),
    bindables:   new Map(),
    localscripts:new Map(),
    firecalls:   new Map(),
    executor:    {},
    mentions:    new Map(),
    raw:         "",
    filterQuery: "",
    importantMode: false,
};

const STOPWORDS = new Set([
    "the","a","an","of","in","on","for","to","is","it","this","that",
    "and","or","if","then","else","end","do","while","return","function",
    "local","self","nil","true","false","not","with","from","by","as",
    "game","workspace","script","player","players","character","humanoid",
    "localplayer","instance","cframe","vector3","color3","udim2","udim",
    "enum","typeof","type","pairs","ipairs","tostring","tonumber","pcall",
    "xpcall","table","string","math","task","wait","spawn","delay",
    "connect","fire","invoke","waitforchild","findfirstchild","getchildren",
    "getdescendants","getservice","new","parent","name","value","size",
    "position","rotation","color","transparency","visible","enabled",
    "text","image","button","frame","label","gui","module","coregui",
    "replicatedstorage","startergui","starterplayer","userinputservice",
    "runservice","tweenService","marketplaceservice","playerservice",
]);

const GENERIC_REMOTES = /^(RemoteEvent|RemoteFunction|BindableEvent|BindableFunction|Sound|Chat|Announcement|Analytics|SystemMessage|GameSound|Warning|StatusEvent)$/i;

// ─── STATUS ────────────────────────────────────────────────
function set_status(text, kind) {
    const el = $("#status-text");
    el.textContent = text;
    el.style.color = kind === "ok"   ? "var(--success)"
                  : kind === "err"  ? "var(--danger)"
                  : kind === "warn" ? "var(--warn)"
                  : "var(--text2)";
}

function esc(str) {
    return String(str)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;");
}

function reset_state() {
    state.game = null;
    state.remotes = new Map();
    state.functions = new Map();
    state.modules = new Map();
    state.bindables = new Map();
    state.localscripts = new Map();
    state.firecalls = new Map();
    state.executor = {};
    state.mentions = new Map();
    state.raw = "";
}

// ─── PARSER ────────────────────────────────────────────────
function parse_text(text) {
    state.raw = text;
    detect_game_info(text);
    if (/═══|REMOTE\s+EVENTS|REMOTE\s+FUNCTIONS|MODULE\s+SCRIPTS/i.test(text)) {
        parse_structured(text);
    }
    parse_lua_source(text);
    count_mentions(text);
    detect_executor(text);
}

function detect_game_info(text) {
    const name_patterns = [
        /nome\s+do\s+jogo\s*[:\-]\s*(.+?)(?:\s*\((\d+)\))?$/im,
        /gamename\s*[:\-]\s*(.+)$/im,
        /game\s*name\s*[:\-]\s*(.+)$/im,
    ];
    for (const re of name_patterns) {
        const m = text.match(re);
        if (m) {
            state.game = state.game || {};
            state.game.name = m[1].trim();
            if (m[2]) state.game.placeId = m[2];
            break;
        }
    }
    for (const re of [/place\s*id\s*[:\-]\s*(\d+)/i, /placeid\s*[:\-]\s*(\d+)/i, /game\.PlaceId\s*[=\s]*(\d+)/i]) {
        const m = text.match(re);
        if (m) { state.game = state.game || {}; state.game.placeId = m[1]; break; }
    }
    const job = text.match(/job\s*id\s*[:\-]\s*([\w\-]+)/i);
    if (job) { state.game = state.game || {}; state.game.jobId = job[1]; }
    const player = text.match(/player\s*[:\-]\s*([\w\d_]+)\s*\(?(\d+)?\)?/i);
    if (player) {
        state.game = state.game || {};
        state.game.player = player[1];
        if (player[2]) state.game.userId = player[2];
    }
}

function parse_structured(text) {
    const lines = text.split(/\r?\n/);
    let section = null;
    for (let i = 0; i < lines.length; i++) {
        const line = lines[i].trim();
        if (!line) continue;
        if (/REMOTE\s+EVENTS/i.test(line))     { section = "remotes";      continue; }
        if (/REMOTE\s+FUNCTIONS/i.test(line))  { section = "functions";    continue; }
        if (/BINDABLE\s+EVENTS/i.test(line))   { section = "bindables";    continue; }
        if (/LOCAL\s+SCRIPTS/i.test(line))     { section = "localscripts"; continue; }
        if (/MODULE\s+SCRIPTS/i.test(line))    { section = "modules";      continue; }

        const pm = line.match(/^([A-Z]{2,4})\/(.+?)(?:\s+\((.+?)\))?$/);
        if (pm && section) {
            const prefix = pm[1], rest = pm[2], kind = pm[3] || "";
            let name = rest, parent = prefix;
            if (prefix === "CHAR" && rest.includes("/")) {
                const parts = rest.split("/");
                parent = "CHAR/" + parts[0];
                name = parts.slice(1).join("/");
            }
            add_to_map(section, name, { parent, kind });
        }
    }
}

function add_to_map(section, name, info) {
    if (!state[section]) return;
    if (!state[section].has(name)) {
        state[section].set(name, { parents: new Set(), kind: info.kind || "" });
    }
    state[section].get(name).parents.add(info.parent);
}

function parse_lua_source(text) {
    for (const re of [/:WaitForChild\s*\(\s*["']([^"']+)["']/g, /:FindFirstChild\s*\(\s*["']([^"']+)["']/g]) {
        let m;
        while ((m = re.exec(text)) !== null) {
            add_to_map("remotes", m[1], { parent: "script", kind: "" });
        }
    }

    const inst = /Instance\.new\s*\(\s*["']([^"']+)["']/g;
    let im;
    while ((im = inst.exec(text)) !== null) {
        const cls = im[1];
        if (cls === "RemoteEvent")     add_to_map("remotes",   "_Instance.new(RemoteEvent)",   { parent: "script", kind: cls });
        if (cls === "RemoteFunction")  add_to_map("functions", "_Instance.new(RemoteFunction)", { parent: "script", kind: cls });
        if (cls === "BindableEvent")   add_to_map("bindables", "_Instance.new(BindableEvent)",  { parent: "script", kind: cls });
    }

    for (const { re, kind } of [
        { re: /([\w.\[\]"_'()]+)\s*:\s*FireServer\s*\(([^)]*)\)/g, kind: "FireServer" },
        { re: /([\w.\[\]"_'()]+)\s*:\s*FireClient\s*\(([^)]*)\)/g, kind: "FireClient" },
        { re: /([\w.\[\]"_'()]+)\s*:\s*FireAllClients\s*\(([^)]*)\)/g, kind: "FireAllClients" },
        { re: /([\w.\[\]"_'()]+)\s*:\s*InvokeServer\s*\(([^)]*)\)/g, kind: "InvokeServer" },
    ]) {
        let m;
        while ((m = re.exec(text)) !== null) {
            const remote_name = extract_name(m[1].trim());
            const args = m[2].trim();
            if (!remote_name) continue;
            if (!state.firecalls.has(remote_name)) {
                state.firecalls.set(remote_name, { kinds: new Set(), args: new Set() });
            }
            const e = state.firecalls.get(remote_name);
            e.kinds.add(kind);
            if (args) e.args.add(args);
        }
    }

    const connect = /([\w.\[\]"_'()]+)\s*\.\s*(OnClientEvent|OnServerEvent)\s*:\s*Connect\s*\(\s*function\s*\(([^)]*)\)/g;
    let cm;
    while ((cm = connect.exec(text)) !== null) {
        const name = extract_name(cm[1]);
        if (!name) continue;
        if (!state.remotes.has(name)) {
            state.remotes.set(name, { parents: new Set(), kind: "", args: new Set() });
        }
        const e = state.remotes.get(name);
        e.parents.add(cm[2]);
        e.kind = cm[2];
        e.args = e.args || new Set();
        if (cm[3].trim()) e.args.add(cm[3].trim());
    }
}

function extract_name(expr) {
    if (!expr) return null;
    const quoted = expr.match(/["']([^"']+)["']/);
    if (quoted) return quoted[1];
    const parts = expr.split(/[.:\[\]()\s]/).filter(Boolean);
    const last = parts[parts.length - 1];
    if (!last) return null;
    if (/^(FireServer|FireClient|FireAllClients|InvokeServer|Connect|WaitForChild|FindFirstChild)$/i.test(last)) {
        return parts[parts.length - 2] || null;
    }
    return last;
}

function count_mentions(text) {
    const tokens = text.match(/\b[A-Z][A-Za-z0-9_]{2,}\b/g) || [];
    for (const tok of tokens) {
        const lower = tok.toLowerCase();
        if (STOPWORDS.has(lower)) continue;
        if (tok.length < 3 || tok.length > 40) continue;
        if (!state.mentions.has(tok)) state.mentions.set(tok, { count: 0, samples: [] });
        const e = state.mentions.get(tok);
        e.count++;
        if (e.samples.length < 2) {
            const idx = text.indexOf(tok);
            if (idx >= 0) {
                const s = Math.max(0, idx - 40);
                const en = Math.min(text.length, idx + tok.length + 60);
                e.samples.push(text.slice(s, en).replace(/\s+/g, " "));
            }
        }
    }
}

const EXECUTOR_FNS = [
    "hookfunction","newcclosure","getconnections","getconstants","getrawmetatable",
    "setreadonly","identifyexecutor","getgenv","is_sirhurt_closure","checkcaller",
    "syn.request","http_request","getreg","getgc","getloadedmodules","getnilinstances",
    "setclipboard","firetouchinterest","fireclickdetector","getnamecallmethod",
];

function detect_executor(text) {
    for (const fn of EXECUTOR_FNS) {
        const esc_fn = fn.replace(".", "\\.");
        const patterns = [
            new RegExp(`\\b${esc_fn}\\s*[:=]\\s*function`, "i"),
            new RegExp(`\\b${esc_fn}\\s*[:=]\\s*["']?available`, "i"),
            new RegExp(`\\b${esc_fn}\\b\\s*\\(`, "i"),
        ];
        for (const re of patterns) {
            if (re.test(text)) { state.executor[fn] = "presente"; break; }
        }
    }
}

// ─── SUGESTÕES ─────────────────────────────────────────────
function build_suggestions() {
    const out = [];

    const totalRemotes = state.remotes.size + state.functions.size;
    out.push({
        title: "📊 Visão geral",
        body: [
            `<strong>${totalRemotes}</strong> remotes/functions detectados`,
            `<strong>${state.firecalls.size}</strong> remotes chamados`,
            `<strong>${Object.keys(state.executor).length}</strong> funções de executor`,
            `<strong>${state.modules.size}</strong> modules e <strong>${state.localscripts.size}</strong> local scripts`,
        ].join("<br>"),
    });

    const fireSorted = Array.from(state.firecalls.entries())
        .sort((a, b) => b[1].kinds.size - a[1].kinds.size).slice(0, 5);
    if (fireSorted.length > 0) {
        out.push({
            title: "🎯 Remotes mais usados",
            body: fireSorted.map(([name, info]) => {
                const kinds = Array.from(info.kinds).join(", ");
                const args = info.args.size > 0 ? " — args: <code>" + esc(Array.from(info.args)[0]) + "</code>" : "";
                return `<code>${esc(name)}</code> — ${kinds}${args}`;
            }).join("<br>"),
        });
    }

    const suspicious = Array.from(state.remotes.keys()).filter(k => /detect|ban|kick|report|alert|warn|punish/i.test(k));
    if (suspicious.length > 0) {
        out.push({
            title: "⚠️ Possíveis sistemas de detecção",
            body: suspicious.map(n => `<code>${esc(n)}</code>`).join("<br>"),
        });
    }

    const combat = Array.from(state.firecalls.keys()).filter(k => /attack|hit|damage|combat|swing|shoot|punch|slash|melee/i.test(k));
    if (combat.length > 0) {
        out.push({
            title: "⚔ Auto-Attack candidatos",
            body: combat.map(n => `<code>${esc(n)}</code>`).join("<br>"),
        });
    }

    const status = Array.from(state.firecalls.keys()).filter(k => /status|state|captur|prison|jail|stun|freeze|block/i.test(k));
    if (status.length > 0) {
        out.push({
            title: "🔒 Anti-captura candidatos",
            body: status.map(n => `<code>${esc(n)}</code>`).join("<br>"),
        });
    }

    const mov = Array.from(state.firecalls.keys()).filter(k => /move|speed|jump|teleport|dash|walk|sprint|fly/i.test(k));
    if (mov.length > 0) {
        out.push({
            title: "🏃 Movement candidatos",
            body: mov.map(n => `<code>${esc(n)}</code>`).join("<br>"),
        });
    }

    const execKeys = Object.keys(state.executor);
    if (execKeys.length > 0) {
        const has_hook = execKeys.includes("hookfunction");
        out.push({
            title: "🛠 Executor",
            body: [
                execKeys.map(k => `<span class="tag ok">${esc(k)}</span>`).join(" "),
                has_hook ? "✅ hookfunction presente." : "⚠️ hookfunction ausente.",
            ].join("<br>"),
        });
    }

    return out;
}

// ─── RENDER ────────────────────────────────────────────────
function make_section(title, count) {
    const wrap = document.createElement("div");
    wrap.className = "section";
    wrap.id = "sec-" + title.toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-|-$/g, "");
    wrap.innerHTML = `
        <div class="section-title">
            <span>${esc(title)}</span>
            <span class="count">${count}</span>
        </div>
        <div class="body"></div>`;
    return { wrap, body: wrap.querySelector(".body") };
}

function render_game_card(parent) {
    if (!state.game) return;
    const g = state.game;
    const card = document.createElement("div");
    card.className = "game-card";
    card.id = "sec-jogo";
    let meta = "";
    if (g.placeId)  meta += `<span>Place ID: <strong>${esc(g.placeId)}</strong></span>`;
    if (g.jobId)    meta += `<span>JobId: <strong>${esc(g.jobId.slice(0, 16))}...</strong></span>`;
    if (g.player)   meta += `<span>Player: <strong>${esc(g.player)}</strong></span>`;
    if (g.userId)   meta += `<span>UserId: <strong>${esc(g.userId)}</strong></span>`;
    card.innerHTML = `
        <h2>${g.name ? esc(g.name) : "Jogo não identificado"}</h2>
        <div class="game-meta">${meta || "<span style='color:var(--text3)'>sem metadados</span>"}</div>
    `;
    parent.appendChild(card);
}

function render_map(parent, map, title, showArgs = false) {
    if (!map || map.size === 0) return;
    const sec = make_section(title, map.size);
    const sorted = Array.from(map.entries()).sort((a, b) => {
        const aFreq = a[1].count || a[1].kinds?.size || 0;
        const bFreq = b[1].count || b[1].kinds?.size || 0;
        if (aFreq !== bFreq) return bFreq - aFreq;
        return a[0].localeCompare(b[0]);
    });

    for (const [name, info] of sorted) {
        const parents = info.parents ? Array.from(info.parents).join(", ") : "";
        let args_html = "";
        if (showArgs && info.args && info.args.size > 0) {
            args_html = `<div class="meta" style="color:var(--glow); margin-top:4px">args: ${Array.from(info.args).map(a => esc(a)).join(" / ")}</div>`;
        }
        const generic = GENERIC_REMOTES.test(name) ? " true" : "";
        sec.body.innerHTML += `
            <div class="entry" data-name="${esc(name.toLowerCase())}" data-generic="${generic}">
                <span class="name">${esc(name)}</span>
                <div class="meta">${info.kind ? "(" + esc(info.kind) + ") " : ""}${parents ? "em: " + esc(parents) : ""}</div>
                ${args_html}
            </div>`;
    }
    parent.appendChild(sec.wrap);
}

function render_firecalls(parent) {
    if (state.firecalls.size === 0) return;
    const sec = make_section("FireServer / FireClient calls", state.firecalls.size);
    const sorted = Array.from(state.firecalls.entries()).sort((a, b) => b[1].kinds.size - a[1].kinds.size);

    for (const [name, info] of sorted) {
        const kinds = Array.from(info.kinds).join(", ");
        const argsList = Array.from(info.args).slice(0, 2).map(a =>
            `<div class="snippet">${esc(a)}</div>`
        ).join("");
        const generic = GENERIC_REMOTES.test(name) ? " true" : "";
        sec.body.innerHTML += `
            <div class="entry" data-name="${esc(name.toLowerCase())}" data-generic="${generic}">
                <span class="name">${esc(name)}</span>
                <div class="meta"><span class="tag remote">${esc(kinds)}</span></div>
                ${argsList}
            </div>`;
    }
    parent.appendChild(sec.wrap);
}

function render_mentions(parent) {
    const relevant = Array.from(state.mentions.entries())
        .filter(([tok, info]) => info.count >= 3 && !STOPWORDS.has(tok.toLowerCase()))
        .sort((a, b) => b[1].count - a[1].count)
        .slice(0, 30);
    if (relevant.length === 0) return;

    const max = relevant[0][1].count;
    const sec = make_section("Menções frequentes", relevant.length);
    for (const [tok, info] of relevant) {
        const pct = (info.count / max) * 100;
        const samples = info.samples.slice(0, 1).map(s =>
            `<div class="snippet">${esc(s)}</div>`
        ).join("");
        sec.body.innerHTML += `
            <div class="entry" data-name="${esc(tok.toLowerCase())}">
                <span class="name">${esc(tok)}</span>
                <div class="meta">aparece ${info.count}x</div>
                <div class="freq-bar"><div class="freq-fill" style="width:${pct}%"></div></div>
                ${samples}
            </div>`;
    }
    parent.appendChild(sec.wrap);
}

function render_executor(parent) {
    const keys = Object.keys(state.executor);
    if (keys.length === 0) return;
    const sec = make_section("Executor", keys.length);
    for (const k of keys) {
        sec.body.innerHTML += `
            <div class="entry" data-name="${esc(k.toLowerCase())}">
                <span class="name">${esc(k)}</span>
                <div class="meta"><span class="tag ok">presente</span></div>
            </div>`;
    }
    parent.appendChild(sec.wrap);
}

function render_report() {
    const rep = $("#report");
    rep.innerHTML = "";

    const total = state.remotes.size + state.functions.size + state.modules.size +
                  state.bindables.size + state.localscripts.size + state.firecalls.size +
                  state.mentions.size + Object.keys(state.executor).length;

    if (total === 0) {
        rep.innerHTML = `<div class="empty">
            <p>Nada foi reconhecido no texto.</p>
            <p class="hint">O dump parece vazio ou em formato não suportado.</p>
        </div>`;
        return;
    }

    render_game_card(rep);
    render_map(rep, state.remotes,      "Remote Events", true);
    render_map(rep, state.functions,    "Remote Functions", true);
    render_map(rep, state.bindables,    "Bindable Events");
    render_map(rep, state.modules,      "Module Scripts");
    render_map(rep, state.localscripts, "Local Scripts");
    render_firecalls(rep);
    render_mentions(rep);
    render_executor(rep);

    const sug = build_suggestions();
    if (sug.length > 0) {
        const sec = make_section("Sugestões", sug.length);
        for (const s of sug) {
            sec.body.innerHTML += `
                <div class="suggestion">
                    <h4>${s.title}</h4>
                    <p>${s.body}</p>
                </div>`;
        }
        rep.appendChild(sec.wrap);
    }

    // aplica filtros ativos
    apply_filter();
    apply_important_mode();
}

// ─── FILTRO EM TEMPO REAL ──────────────────────────────────
function apply_filter() {
    const q = state.filterQuery.toLowerCase().trim();
    const entries = $$(".entry");
    let visible = 0;

    entries.forEach(el => {
        const name = (el.dataset.name || "").toLowerCase();
        const match = !q || name.includes(q);
        el.classList.toggle("hidden-by-filter", !match);
        if (match) visible++;
    });

    // esconde sections vazias
    $$(".section").forEach(sec => {
        const visibleEntries = sec.querySelectorAll(".entry:not(.hidden-by-filter):not(.hidden-by-important)");
        const title = sec.querySelector(".section-title");
        if (title && sec.querySelector(".body")) {
            sec.style.display = visibleEntries.length > 0 ? "" : "none";
        }
    });

    const fc = $("#filter-count");
    if (q) fc.textContent = `${visible} / ${entries.length} visíveis`;
    else fc.textContent = "";
}

function apply_important_mode() {
    if (!state.importantMode) {
        $$(".entry").forEach(el => el.classList.remove("hidden-by-important"));
        return;
    }
    $$(".entry").forEach(el => {
        const generic = el.dataset.generic === "true";
        el.classList.toggle("hidden-by-important", generic);
    });
    $$(".section").forEach(sec => {
        const visibleEntries = sec.querySelectorAll(".entry:not(.hidden-by-filter):not(.hidden-by-important)");
        if (sec.querySelector(".body")) {
            sec.style.display = visibleEntries.length > 0 ? "" : "none";
        }
    });
}

// ─── GERADOR DE ESQUELETO ──────────────────────────────────
function generate_skeleton() {
    if (!state.raw) {
        set_status("Analisa um dump primeiro", "err");
        return;
    }

    const gameName = state.game?.name || "Jogo";
    const lines = [];

    lines.push(`--[[`);
    lines.push(`    LC10 • Skeleton Gerado`);
    lines.push(`    Jogo: ${gameName}`);
    lines.push(`    Gerado por LC10 Dump Analyzer — by x.lusca1`);
    lines.push(`    Data: ${new Date().toISOString().slice(0,10)}`);
    lines.push(`]]`);
    lines.push("");
    lines.push(`local Players = game:GetService("Players")`);
    lines.push(`local RS = game:GetService("ReplicatedStorage")`);
    lines.push(`local LP = Players.LocalPlayer`);
    lines.push("");

    // remotes
    const relevantRemotes = Array.from(state.remotes.keys())
        .filter(n => !GENERIC_REMOTES.test(n))
        .slice(0, 20);

    if (relevantRemotes.length > 0) {
        lines.push("-- ═══ REMOTES ═══");
        for (const name of relevantRemotes) {
            const info = state.remotes.get(name);
            const args = info.args && info.args.size > 0
                ? ` -- args: ${Array.from(info.args)[0]}`
                : "";
            const kind = info.kind ? ` -- ${info.kind}` : "";
            lines.push(`local ${sanitize(name)} = RS:WaitForChild("${name}")${args}${kind}`);
        }
        lines.push("");
    }

    // fire calls — candidatos por categoria
    const categories = [
        { label: "AUTO-ATTACK", regex: /attack|hit|damage|combat|swing|shoot|punch|slash/i },
        { label: "ANTI-CAPTURE", regex: /status|state|captur|prison|jail|stun|freeze/i },
        { label: "MOVEMENT", regex: /move|speed|jump|teleport|dash|walk|sprint/i },
        { label: "DETECÇÃO", regex: /detect|ban|kick|report|alert|warn/i },
    ];

    for (const cat of categories) {
        const matches = Array.from(state.firecalls.entries())
            .filter(([n]) => cat.regex.test(n));
        if (matches.length === 0) continue;

        lines.push(`-- ═══ ${cat.label} ═══`);
        for (const [name, info] of matches) {
            const args = info.args.size > 0 ? Array.from(info.args)[0] : "...";
            lines.push(`-- ${name}: ${Array.from(info.kinds).join(", ")}`);
            lines.push(`--     args: ${args}`);
            lines.push(`--     chamar: ${sanitize(name)}:FireServer(${args === "..." ? "..." : "/* " + args + " */"})`);
        }
        lines.push("");
    }

    // executor
    const execKeys = Object.keys(state.executor);
    if (execKeys.length > 0) {
        lines.push("-- ═══ EXECUTOR ═══");
        lines.push(`-- Detectado no dump: ${execKeys.join(", ")}`);
        if (!execKeys.includes("hookfunction")) {
            lines.push(`-- ⚠️ hookfunction AUSENTE — hooks reais não vão funcionar`);
        }
        lines.push("");
    }

    lines.push("-- ═══ FIM DO ESQUELETO ═══");
    lines.push("-- Preenche os args reais com sniffer antes de usar");

    return lines.join("\n");
}

function sanitize(name) {
    return name.replace(/[^a-zA-Z0-9_]/g, "_");
}

// ─── GERADOR DE SNIFFER ────────────────────────────────────
function generate_sniffer() {
    if (!state.raw) { set_status("Analisa um dump primeiro", "err"); return; }

    const remoteNames = Array.from(new Set([
        ...state.remotes.keys(),
        ...state.firecalls.keys(),
    ])).filter(n => !GENERIC_REMOTES.test(n) && n.length < 40 && !n.startsWith("_"));

    const lines = [];
    lines.push(`--[[`);
    lines.push(`    LC10 • Sniffer Gerado`);
    lines.push(`    Jogo: ${state.game?.name || "?"}`);
    lines.push(`    Detecta ${remoteNames.length} remotes — manda capturas pra webhook`);
    lines.push(`]]`);
    lines.push("");
    lines.push(`local RS = game:GetService("ReplicatedStorage")`);
    lines.push(`local WS = game:GetService("Workspace")`);
    lines.push("");
    lines.push(`local WEBHOOK = "" -- cola teu webhook aqui`);
    lines.push("");
    lines.push(`local function http_post(url, body)`);
    lines.push(`    if syn and syn.request then return syn.request({Url=url,Method="POST",Headers={["Content-Type"]="application/json"},Body=body})`);
    lines.push(`    elseif http and http.request then return http.request({Url=url,Method="POST",Headers={["Content-Type"]="application/json"},Body=body})`);
    lines.push(`    elseif request then return request({Url=url,Method="POST",Headers={["Content-Type"]="application/json"},Body=body}) end`);
    lines.push(`end`);
    lines.push("");
    lines.push(`local function ser(v, d)`);
    lines.push(`    d = d or 0; if d > 3 then return "..." end`);
    lines.push(`    local t = type(v)`);
    lines.push(`    if t == "string" then return '"'..v..'"'`);
    lines.push(`    elseif t == "number" or t == "boolean" then return tostring(v)`);
    lines.push(`    elseif t == "Instance" then return v:GetFullName()`);
    lines.push(`    elseif t == "table" then`);
    lines.push(`        local p = {}; for k,vv in pairs(v) do table.insert(p, tostring(k).."="..ser(vv,d+1)) end`);
    lines.push(`        return "{"..table.concat(p,", ").."}"`);
    lines.push(`    else return "<"..t..">" end`);
    lines.push(`end`);
    lines.push("");
    lines.push(`local function capture(name, direction, ...)`);
    lines.push(`    local args = {...}; local out = {}`);
    lines.push(`    for i=1,#args do out[i] = "["..i.."] "..ser(args[i]) end`);
    lines.push(`    local text = table.concat(out, "\\n")`);
    lines.push(`    print("[LC10] "..name.." / "..direction.."\\n"..text)`);
    lines.push(`    if WEBHOOK ~= "" then`);
    lines.push(`        local body = game:GetService("HttpService"):JSONEncode({`);
    lines.push(`            content = "**"..name.."** — "..direction.."\\n\\\`\\\`\\\`\\n"..text.."\\n\\\`\\\`\\\`"`);
    lines.push(`        })`);
    lines.push(`        pcall(function() http_post(WEBHOOK, body) end)`);
    lines.push(`    end`);
    lines.push(`end`);
    lines.push("");
    lines.push("-- remotes alvo (gerado do dump):");
    lines.push("local alvos = {");
    for (const n of remoteNames.slice(0, 30)) {
        lines.push(`    "${n}",`);
    }
    lines.push("}");
    lines.push("");
    lines.push("for _, nome in ipairs(alvos) do");
    lines.push(`    for _, parent in ipairs({RS, WS}) do`);
    lines.push(`        local r = parent:FindFirstChild(nome)`);
    lines.push(`        if r and (r:IsA("RemoteEvent") or r:IsA("RemoteFunction")) then`);
    lines.push(`            if r.OnClientEvent then`);
    lines.push(`                r.OnClientEvent:Connect(function(...) capture(nome, "OnClientEvent", ...) end)`);
    lines.push(`            end`);
    lines.push(`            if hookfunction then`);
    lines.push(`                local old = r.FireServer`);
    lines.push(`                hookfunction(old, newcclosure(function(self, ...)`);
    lines.push(`                    capture(nome, "FireServer", ...)`);
    lines.push(`                    return old(self, ...)`);
    lines.push(`                end))`);
    lines.push(`            end`);
    lines.push(`            print("[LC10] hookado: "..nome)`);
    lines.push(`        end`);
    lines.push(`    end`);
    lines.push("end");
    lines.push("");
    lines.push(`print("[LC10] sniffer ativo. joga normal. manda os prints.")`);

    return lines.join("\n");
}

// ─── GERADOR DE SCRIPT COMPLETO ────────────────────────────
function generate_full_script() {
    if (!state.raw) { set_status("Analisa um dump primeiro", "err"); return; }

    const gameName = state.game?.name || "Jogo";
    const remoteNames = Array.from(new Set([...state.remotes.keys(), ...state.firecalls.keys()]))
        .filter(n => !GENERIC_REMOTES.test(n));

    // detecta categorias
    const attackRemotes = remoteNames.filter(n => /attack|hit|damage|combat|swing/i.test(n));
    const stateRemotes = remoteNames.filter(n => /status|state|captur|stun/i.test(n));
    const detectRemotes = remoteNames.filter(n => /detect|ban|kick|report/i.test(n));
    const moveRemotes = remoteNames.filter(n => /move|speed|jump|teleport|dash/i.test(n));

    const L = [];
    L.push(`--[[`);
    L.push(`    ═══════════════════════════════════════════════════════════`);
    L.push(`    LC10 • Script Gerado`);
    L.push(`    Jogo: ${gameName}`);
    L.push(`    Gerado por: LC10 Dump Analyzer`);
    L.push(`    Author: x.lusca1`);
    L.push(`    Data: ${new Date().toISOString().slice(0,10)}`);
    L.push(`    ═══════════════════════════════════════════════════════════`);
    L.push(`]]`);
    L.push("");
    L.push(`local Players = game:GetService("Players")`);
    L.push(`local RunService = game:GetService("RunService")`);
    L.push(`local UserInput = game:GetService("UserInputService")`);
    L.push(`local TweenService = game:GetService("TweenService")`);
    L.push(`local CoreGui = game:GetService("CoreGui")`);
    L.push(`local RS = game:GetService("ReplicatedStorage")`);
    L.push(`local WS = game:GetService("Workspace")`);
    L.push(`local LP = Players.LocalPlayer`);
    L.push("");
    L.push(`-- ═══ CONFIG ═══`);
    L.push(`local Config = {`);
    L.push(`    brand = "LC10",`);
    L.push(`    version = "1.0.0",`);
    L.push(`    keybind = Enum.KeyCode.RightShift,`);
    L.push(`}`);
    L.push("");
    L.push(`local Theme = {`);
    L.push(`    bg       = Color3.fromHex("0A0A0F"),`);
    L.push(`    surface  = Color3.fromHex("14141C"),`);
    L.push(`    elevated = Color3.fromHex("1C1C26"),`);
    L.push(`    border   = Color3.fromHex("2A2A38"),`);
    L.push(`    accent   = Color3.fromHex("8B5CF6"),`);
    L.push(`    glow     = Color3.fromHex("C4B5FD"),`);
    L.push(`    success  = Color3.fromHex("10B981"),`);
    L.push(`    danger   = Color3.fromHex("EF4444"),`);
    L.push(`    text     = Color3.fromHex("F3F4F6"),`);
    L.push(`    text2    = Color3.fromHex("9CA3AF"),`);
    L.push(`}`);
    L.push("");
    L.push(`local F = { heading = Enum.Font.GothamBold, body = Enum.Font.Gotham }`);
    L.push("");
    L.push(`-- ═══ REMOTES (do dump) ═══`);
    for (const name of remoteNames.slice(0, 15)) {
        L.push(`local ${sanitize(name)} = RS:FindFirstChild("${name}") or WS:FindFirstChild("${name}")`);
    }
    L.push("");

    // ─── módulos
    if (stateRemotes.length > 0) {
        L.push(`-- ═══ MÓDULO: ANTI-STATE ═══`);
        L.push(`local AntiState = { active = false }`);
        L.push(`function AntiState.install()`);
        for (const r of stateRemotes) {
            L.push(`    if ${sanitize(r)} and ${sanitize(r)}.OnClientEvent then`);
            L.push(`        ${sanitize(r)}.OnClientEvent:Connect(function(...)`);
            L.push(`            if not AntiState.active then return end`);
            L.push(`            local args = {...}`);
            L.push(`            -- TODO: bloquear state ruim aqui`);
            L.push(`            print("[LC10] AntiState interceptou:", ${sanitize(r)}, ...)`);
            L.push(`        end)`);
            L.push(`    end`);
        }
        L.push(`end`);
        L.push("");
    }

    if (detectRemotes.length > 0) {
        L.push(`-- ═══ MÓDULO: ANTI-DETECT ═══`);
        L.push(`local AntiDetect = { active = false }`);
        L.push(`function AntiDetect.install()`);
        for (const r of detectRemotes) {
            L.push(`    if ${sanitize(r)} and ${sanitize(r)}.OnClientEvent then`);
            L.push(`        ${sanitize(r)}.OnClientEvent:Connect(function(...)`);
            L.push(`            if not AntiDetect.active then return end`);
            L.push(`            print("[LC10] detect bloqueado:", ${sanitize(r)})`);
            L.push(`        end)`);
            L.push(`    end`);
        }
        L.push(`end`);
        L.push("");
    }

    if (attackRemotes.length > 0) {
        L.push(`-- ═══ MÓDULO: AUTO-ATTACK ═══`);
        L.push(`local AutoAttack = { active = false, last = 0, cooldown = 1 }`);
        L.push(`function AutoAttack.loop()`);
        L.push(`    RunService.Heartbeat:Connect(function()`);
        L.push(`        if not AutoAttack.active then return end`);
        L.push(`        if tick() - AutoAttack.last < AutoAttack.cooldown then return end`);
        L.push(`        local hrp = LP.Character and LP.Character:FindFirstChild("HumanoidRootPart")`);
        L.push(`        if not hrp then return end`);
        L.push(`        local closest, dist = nil, math.huge`);
        L.push(`        for _, p in ipairs(Players:GetPlayers()) do`);
        L.push(`            if p ~= LP and p.Character then`);
        L.push(`                local t = p.Character:FindFirstChild("HumanoidRootPart")`);
        L.push(`                if t then`);
        L.push(`                    local d = (t.Position - hrp.Position).Magnitude`);
        L.push(`                    if d < dist then closest, dist = p, d end`);
        L.push(`                end`);
        L.push(`            end`);
        L.push(`        end`);
        L.push(`        if closest and dist < 15 then`);
        L.push(`            AutoAttack.last = tick()`);
        for (const r of attackRemotes) {
            L.push(`            if ${sanitize(r)} then pcall(function() ${sanitize(r)}:FireServer(closest) end) end`);
        }
        L.push(`        end`);
        L.push(`    end)`);
        L.push(`end`);
        L.push("");
    }

    if (moveRemotes.length > 0) {
        L.push(`-- ═══ MÓDULO: MOVEMENT ═══`);
        L.push(`local Movement = { active = false, speed = 32 }`);
        L.push(`function Movement.loop()`);
        L.push(`    RunService.Heartbeat:Connect(function()`);
        L.push(`        if not Movement.active then return end`);
        L.push(`        local hum = LP.Character and LP.Character:FindFirstChildOfClass("Humanoid")`);
        L.push(`        if hum then hum.WalkSpeed = Movement.speed end`);
        L.push(`    end)`);
        L.push(`end`);
        L.push("");
    }

    // ─── UI básica
    L.push(`-- ═══ UI BÁSICA ═══`);
    L.push(`local gui = Instance.new("ScreenGui")`);
    L.push(`gui.Name = "LC10_Generated"`);
    L.push(`gui.ResetOnSpawn = false`);
    L.push(`pcall(function() gui.Parent = CoreGui end)`);
    L.push(`if not gui.Parent then gui.Parent = LP:WaitForChild("PlayerGui") end`);
    L.push("");
    L.push(`local win = Instance.new("Frame", gui)`);
    L.push(`win.Size = UDim2.new(0, 400, 0, 280)`);
    L.push(`win.Position = UDim2.new(0.5, -200, 0.5, -140)`);
    L.push(`win.BackgroundColor3 = Theme.bg`);
    L.push(`win.BorderSizePixel = 0`);
    L.push(`Instance.new("UICorner", win).CornerRadius = UDim.new(0, 12)`);
    L.push(`local ws = Instance.new("UIStroke", win); ws.Color = Theme.border`);
    L.push("");
    L.push(`local header = Instance.new("Frame", win)`);
    L.push(`header.Size = UDim2.new(1, 0, 0, 40)`);
    L.push(`header.BackgroundColor3 = Theme.surface`);
    L.push(`header.BorderSizePixel = 0`);
    L.push(`Instance.new("UICorner", header).CornerRadius = UDim.new(0, 12)`);
    L.push("");
    L.push(`local title = Instance.new("TextLabel", header)`);
    L.push(`title.Size = UDim2.new(1, -20, 1, 0)`);
    L.push(`title.Position = UDim2.new(0, 14, 0, 0)`);
    L.push(`title.BackgroundTransparency = 1`);
    L.push(`title.Text = "LC10 • ${gameName}"`);
    L.push(`title.TextColor3 = Theme.text`);
    L.push(`title.Font = F.heading`);
    L.push(`title.TextSize = 14`);
    L.push(`title.TextXAlignment = Enum.TextXAlignment.Left`);
    L.push("");
    L.push(`-- toggles`);
    L.push(`local list = Instance.new("Frame", win)`);
    L.push(`list.Size = UDim2.new(1, -28, 1, -68)`);
    L.push(`list.Position = UDim2.new(0, 14, 0, 54)`);
    L.push(`list.BackgroundTransparency = 1`);
    L.push(`local ll = Instance.new("UIListLayout", list)`);
    L.push(`ll.Padding = UDim.new(0, 8)`);
    L.push("");
    L.push(`local function mkToggle(label, callback, default)`);
    L.push(`    default = default or false`);
    L.push(`    local row = Instance.new("Frame", list)`);
    L.push(`    row.Size = UDim2.new(1, 0, 0, 34)`);
    L.push(`    row.BackgroundColor3 = Theme.elevated`);
    L.push(`    row.BorderSizePixel = 0`);
    L.push(`    Instance.new("UICorner", row).CornerRadius = UDim.new(0, 6)`);
    L.push(`    local lbl = Instance.new("TextLabel", row)`);
    L.push(`    lbl.Size = UDim2.new(1, -70, 1, 0); lbl.Position = UDim2.new(0, 12, 0, 0)`);
    L.push(`    lbl.BackgroundTransparency = 1; lbl.Text = label`);
    L.push(`    lbl.TextColor3 = Theme.text; lbl.Font = F.body; lbl.TextSize = 13`);
    L.push(`    lbl.TextXAlignment = Enum.TextXAlignment.Left`);
    L.push(`    local btn = Instance.new("TextButton", row)`);
    L.push(`    btn.Size = UDim2.new(0, 42, 0, 20); btn.Position = UDim2.new(1, -54, 0.5, -10)`);
    L.push(`    btn.BackgroundColor3 = default and Theme.success or Theme.danger`);
    L.push(`    btn.Text = ""; btn.AutoButtonColor = false; btn.BorderSizePixel = 0`);
    L.push(`    Instance.new("UICorner", btn).CornerRadius = UDim.new(1, 0)`);
    L.push(`    local knob = Instance.new("Frame", btn)`);
    L.push(`    knob.Size = UDim2.new(0, 16, 0, 16)`);
    L.push(`    knob.Position = default and UDim2.new(1, -18, 0.5, -8) or UDim2.new(0, 2, 0.5, -8)`);
    L.push(`    knob.BackgroundColor3 = Theme.text; knob.BorderSizePixel = 0`);
    L.push(`    Instance.new("UICorner", knob).CornerRadius = UDim.new(1, 0)`);
    L.push(`    local state = default`);
    L.push(`    btn.MouseButton1Click:Connect(function()`);
    L.push(`        state = not state`);
    L.push(`        btn.BackgroundColor3 = state and Theme.success or Theme.danger`);
    L.push(`        knob.Position = state and UDim2.new(1, -18, 0.5, -8) or UDim2.new(0, 2, 0.5, -8)`);
    L.push(`        if callback then callback(state) end`);
    L.push(`    end)`);
    L.push(`end`);
    L.push("");

    if (attackRemotes.length > 0) {
        L.push(`mkToggle("Auto-Attack", function(v) AutoAttack.active = v end)`);
    }
    if (stateRemotes.length > 0) {
        L.push(`mkToggle("Anti-State", function(v) AntiState.active = v end)`);
    }
    if (detectRemotes.length > 0) {
        L.push(`mkToggle("Anti-Detect", function(v) AntiDetect.active = v end)`);
    }
    if (moveRemotes.length > 0) {
        L.push(`mkToggle("Movement", function(v) Movement.active = v end)`);
    }
    if (attackRemotes.length === 0 && stateRemotes.length === 0 && detectRemotes.length === 0 && moveRemotes.length === 0) {
        L.push(`-- nenhum módulo específico detectado. Toggles genéricos:`);
        L.push(`mkToggle("Placeholder 1", function(v) print("toggle 1:", v) end)`);
        L.push(`mkToggle("Placeholder 2", function(v) print("toggle 2:", v) end)`);
    }

    L.push("");
    L.push(`-- instala modulos`);
    if (stateRemotes.length > 0)  L.push(`AntiState.install()`);
    if (detectRemotes.length > 0) L.push(`AntiDetect.install()`);
    if (attackRemotes.length > 0) L.push(`AutoAttack.loop()`);
    if (moveRemotes.length > 0)   L.push(`Movement.loop()`);
    L.push("");
    L.push(`-- keybind`);
    L.push(`UserInput.InputBegan:Connect(function(i, gp)`);
    L.push(`    if gp then return end`);
    L.push(`    if i.KeyCode == Config.keybind then win.Visible = not win.Visible end`);
    L.push(`end)`);
    L.push("");
    L.push(`print("[LC10] script gerado carregado — " .. Config.version)`);
    L.push(`print("[LC10] ⚠️ preenche os args dos FireServer com sniffer antes de confiar")`);

    return L.join("\n");
}

// ─── EXPORT ────────────────────────────────────────────────
function build_report_text(format) {
    const g = state.game || {};
    const lines = [];

    if (format === "json") {
        return JSON.stringify({
            game: g,
            remotes: Array.from(state.remotes.entries()).map(([n, i]) => ({
                name: n, kind: i.kind, parents: Array.from(i.parents), args: i.args ? Array.from(i.args) : [],
            })),
            functions: Array.from(state.functions.entries()),
            modules: Array.from(state.modules.entries()),
            firecalls: Array.from(state.firecalls.entries()).map(([n, i]) => ({
                name: n, kinds: Array.from(i.kinds), args: Array.from(i.args),
            })),
            mentions: Array.from(state.mentions.entries()).sort((a,b) => b[1].count - a[1].count).slice(0, 50),
            executor: state.executor,
            generated_by: "LC10 Dump Analyzer",
            generated_at: new Date().toISOString(),
        }, null, 2);
    }

    if (format === "md") {
        lines.push(`# LC10 • Análise de Dump`);
        lines.push(`**Gerado:** ${new Date().toLocaleString()}`);
        lines.push("");
        if (g.name)     lines.push(`**Jogo:** ${g.name}`);
        if (g.placeId)  lines.push(`**Place ID:** ${g.placeId}`);
        if (g.jobId)    lines.push(`**JobId:** ${g.jobId}`);
        if (g.player)   lines.push(`**Player:** ${g.player}`);
        lines.push("");
        lines.push(`## Remotes (${state.remotes.size})`);
        for (const [n, i] of state.remotes) lines.push(`- \`${n}\` — ${i.kind || "?"} — ${Array.from(i.parents).join(", ")}`);
        lines.push("");
        lines.push(`## Fire Calls (${state.firecalls.size})`);
        for (const [n, i] of state.firecalls) lines.push(`- \`${n}\` — ${Array.from(i.kinds).join(", ")}`);
        lines.push("");
        lines.push(`## Menções frequentes`);
        for (const [t, i] of Array.from(state.mentions.entries()).sort((a,b) => b[1].count - a[1].count).slice(0, 20)) {
            lines.push(`- ${t}: ${i.count}x`);
        }
        lines.push("");
        lines.push(`## Executor`);
        for (const k of Object.keys(state.executor)) lines.push(`- ${k}`);
        return lines.join("\n");
    }

    // txt padrão
    lines.push("═══════════════════════════════════════");
    lines.push("LC10 • Análise de Dump — by x.lusca1");
    lines.push(`Gerado: ${new Date().toLocaleString()}`);
    lines.push("═══════════════════════════════════════");
    lines.push("");
    if (g.name)     lines.push(`Nome do jogo: ${g.name}`);
    if (g.placeId)  lines.push(`Place ID: ${g.placeId}`);
    if (g.jobId)    lines.push(`JobId: ${g.jobId}`);
    if (g.player)   lines.push(`Player: ${g.player}`);
    lines.push("");
    lines.push(`═══ REMOTES (${state.remotes.size}) ═══`);
    for (const [n, i] of state.remotes) lines.push(`  ${n} — ${i.kind || "?"} — ${Array.from(i.parents).join(", ")}`);
    lines.push("");
    lines.push(`═══ FIRE CALLS (${state.firecalls.size}) ═══`);
    for (const [n, i] of state.firecalls) lines.push(`  ${n} — ${Array.from(i.kinds).join(", ")}`);
    lines.push("");
    lines.push(`═══ MENÇÕES FREQUENTES ═══`);
    for (const [t, i] of Array.from(state.mentions.entries()).sort((a,b) => b[1].count - a[1].count).slice(0, 30)) {
        lines.push(`  ${t}: ${i.count}x`);
    }
    lines.push("");
    lines.push(`═══ EXECUTOR ═══`);
    for (const k of Object.keys(state.executor)) lines.push(`  ${k}`);
    return lines.join("\n");
}

function download_text(filename, content) {
    const blob = new Blob([content], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
}

// ─── MODAL ─────────────────────────────────────────────────
let lastModalContent = "";

function open_modal(title, content) {
    lastModalContent = content;
    $("#modal-title").textContent = title;
    $("#modal-content").textContent = content;
    $("#modal").classList.remove("hidden");
}

function close_modal() {
    $("#modal").classList.add("hidden");
}

// ─── MENU ──────────────────────────────────────────────────
function toggle_menu() {
    const m = $("#menu-dropdown");
    const b = $("#menu-btn");
    m.classList.toggle("hidden");
    b.classList.toggle("active");
}

function close_menu() {
    $("#menu-dropdown").classList.add("hidden");
    $("#menu-btn").classList.remove("active");
}

// ─── MAIN ──────────────────────────────────────────────────
function run_parse() {
    const text = $("#dump-input").value;
    if (!text.trim()) { set_status("Cola o dump primeiro", "err"); return; }

    set_status("Analisando " + (text.length / 1024).toFixed(0) + " KB...", "warn");

    setTimeout(() => {
        reset_state();
        parse_text(text);
        render_report();

        const total = state.remotes.size + state.functions.size + state.modules.size +
                      state.bindables.size + state.localscripts.size + state.firecalls.size;

        set_status(`Pronto — ${total} entidades detectadas`, "ok");
    }, 50);
}

function update_stats() {
    const v = $("#dump-input").value;
    const chars = v.length;
    const lines = v ? v.split(/\r?\n/).length : 0;
    const kb = (chars / 1024).toFixed(1);
    $("#input-stats").textContent = `${chars.toLocaleString()} caracteres · ${lines.toLocaleString()} linhas · ${kb} KB`;
}

async function load_files(files) {
    let combined = $("#dump-input").value;
    for (const f of files) {
        try {
            const txt = await f.text();
            combined += (combined ? "\n\n" : "") + txt;
        } catch (e) { console.warn(e); }
    }
    $("#dump-input").value = combined;
    update_stats();
    set_status(`${files.length} arquivo(s) carregado(s)`, "ok");
}

// ─── BIND ──────────────────────────────────────────────────
$("#parse-btn").addEventListener("click", run_parse);

$("#clear-btn").addEventListener("click", () => {
    $("#dump-input").value = "";
    update_stats();
    reset_state();
    set_status("Limpo", "ok");
    $("#report").innerHTML = `<div class="empty">
        <p>Nenhum dump analisado ainda.</p>
        <p class="hint">Cola o dump acima ou carrega um arquivo <strong>.txt</strong> / <strong>.lua</strong>.</p>
    </div>`;
});

$("#dump-input").addEventListener("input", update_stats);

$("#file-input").addEventListener("change", (e) => {
    const files = Array.from(e.target.files);
    if (files.length > 0) load_files(files);
    e.target.value = "";
});

// menu
$("#menu-btn").addEventListener("click", (e) => {
    e.stopPropagation();
    toggle_menu();
});

document.addEventListener("click", (e) => {
    if (!e.target.closest("#menu-dropdown") && !e.target.closest("#menu-btn")) {
        close_menu();
    }
});

// menu actions
$$(".menu-item").forEach(btn => {
    btn.addEventListener("click", () => {
        const action = btn.dataset.action;
        close_menu();

        if (action === "filter-toggle") {
            const bar = $("#filter-bar");
            bar.classList.toggle("hidden");
            if (!bar.classList.contains("hidden")) $("#filter-input").focus();
            else { state.filterQuery = ""; $("#filter-input").value = ""; apply_filter(); }
            return;
        }

        if (action === "important-toggle") {
            state.importantMode = !state.importantMode;
            btn.querySelector("strong").textContent = state.importantMode ? "Modo só o importante ✓" : "Modo só o importante";
            apply_important_mode();
            set_status(state.importantMode ? "Modo importante ON" : "Modo importante OFF", "ok");
            return;
        }

        if (action === "skeleton") {
            const code = generate_skeleton();
            open_modal("🧩 Esqueleto Lua gerado", code);
            return;
        }

        if (action === "sniffer") {
            const code = generate_sniffer();
            open_modal("📡 Sniffer gerado", code);
            return;
        }

        if (action === "fullscript") {
            const code = generate_full_script();
            open_modal("⚡ Script completo gerado", code);
            return;
        }

        if (action === "export-txt") {
            if (!state.raw) { set_status("Analisa um dump primeiro", "err"); return; }
            download_text("lc10-dump-analysis.txt", build_report_text("txt"));
            set_status("Relatório .txt baixado", "ok");
            return;
        }

        if (action === "export-md") {
            if (!state.raw) { set_status("Analisa um dump primeiro", "err"); return; }
            download_text("lc10-dump-analysis.md", build_report_text("md"));
            set_status("Relatório .md baixado", "ok");
            return;
        }

        if (action === "export-json") {
            if (!state.raw) { set_status("Analisa um dump primeiro", "err"); return; }
            download_text("lc10-dump-analysis.json", build_report_text("json"));
            set_status("Relatório .json baixado", "ok");
            return;
        }
    });
});

// filtro
$("#filter-input").addEventListener("input", (e) => {
    state.filterQuery = e.target.value;
    apply_filter();
});

$("#filter-clear").addEventListener("click", () => {
    state.filterQuery = "";
    $("#filter-input").value = "";
    apply_filter();
});

// modal
$("#modal-close").addEventListener("click", close_modal);
$("#modal").addEventListener("click", (e) => {
    if (e.target.id === "modal") close_modal();
});

$("#modal-copy").addEventListener("click", async () => {
    try {
        await navigator.clipboard.writeText(lastModalContent);
        set_status("Copiado pra clipboard", "ok");
    } catch (e) {
        // fallback
        const ta = document.createElement("textarea");
        ta.value = lastModalContent;
        document.body.appendChild(ta);
        ta.select();
        document.execCommand("copy");
        document.body.removeChild(ta);
        set_status("Copiado (fallback)", "ok");
    }
});

$("#modal-download").addEventListener("click", () => {
    const title = $("#modal-title").textContent;
    let filename = "lc10-output.txt";
    if (title.includes("Esqueleto")) filename = "lc10-skeleton.lua";
    else if (title.includes("Sniffer")) filename = "lc10-sniffer.lua";
    else if (title.includes("Script completo")) filename = "lc10-script.lua";
    download_text(filename, lastModalContent);
    set_status("Baixado", "ok");
});

// sidebar scroll
$$("#summary-list li").forEach(li => {
    li.addEventListener("click", () => {
        const target = li.dataset.target;
        const sec = document.getElementById("sec-" + target);
        if (sec) sec.scrollIntoView({ behavior: "smooth", block: "start" });
    });
});

// drag&drop
$("#dump-input").addEventListener("dragover", (e) => { e.preventDefault(); e.currentTarget.style.borderColor = "var(--accent)"; });
$("#dump-input").addEventListener("dragleave", (e) => { e.currentTarget.style.borderColor = "var(--border)"; });
$("#dump-input").addEventListener("drop", (e) => {
    e.preventDefault();
    e.currentTarget.style.borderColor = "var(--border)";
    const files = Array.from(e.dataTransfer.files);
    if (files.length > 0) load_files(files);
});

// ESC fecha modal/menu
document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") { close_modal(); close_menu(); }
});
