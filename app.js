// ═══════════════════════════════════════════════════════════
// LC10 • Dump Studio
// author: x.lusca1
// ═══════════════════════════════════════════════════════════

const $ = (s) => document.querySelector(s);
const $$ = (s) => document.querySelectorAll(s);

const state = {
    game: null,
    remotes: new Map(),
    functions: new Map(),
    modules: new Map(),
    bindables: new Map(),
    localscripts: new Map(),
    firecalls: new Map(),
    executor: {},
    mentions: new Map(),
    raw: "",
    filterQuery: "",
    importantMode: false,
    platform: "mobile",
    lastOutput: "",
};

const STOPWORDS = new Set([
    "the","a","an","of","in","on","for","to","is","it","this","that","and","or","if",
    "then","else","end","do","while","return","function","local","self","nil","true",
    "false","not","with","from","by","as","game","workspace","script","player","players",
    "character","humanoid","localplayer","instance","cframe","vector3","color3","udim2",
    "udim","enum","typeof","type","pairs","ipairs","tostring","tonumber","pcall","xpcall",
    "table","string","math","task","wait","spawn","delay","connect","fire","invoke",
    "waitforchild","findfirstchild","getchildren","getdescendants","getservice","new",
    "parent","name","value","size","position","rotation","color","transparency","visible",
    "enabled","text","image","button","frame","label","gui","module","coregui",
    "replicatedstorage","startergui","starterplayer","userinputservice","runservice",
    "tweenService","marketplaceservice","playerservice","httpservice",
]);

const GENERIC_REMOTES = /^(RemoteEvent|RemoteFunction|BindableEvent|BindableFunction|Sound|Chat|Announcement|Analytics|SystemMessage|GameSound|Warning)$/i;

const NON_REMOTE_NAMES = new Set([
    "humanoid","humanoidrootpart","head","torso","handle","uppertorso","lowertorso",
    "rightarm","leftarm","rightleg","leftleg","rightfoot","leftfoot","righthand","lefthand",
    "position","size","cframe","rotation","color","transparency","material","brickcolor",
    "weight","scaledampeningpercent","walkspeed","jumppower","hipheight","health","maxhealth",
    "velocity","angularvelocity","assemblylinearvelocity","anchored","cancollide","cantouch",
    "massless","locked","name","parent","classname","children","descendants",
    "playemote","emote","animation","animator","animtrack","animationcontroller",
    "camera","cameratype","fieldofview","subject","focus",
    "mousedown","mouseup","mousemove","mousebutton1","mousebutton2",
]);

// ═══════════ FEATURES DISPONÍVEIS ═══════════
const FEATURES = [
    { key: "aimbot",      regex: /aim\s*bot|aimbot|mira\s*auto|aim\s*assist/i,           label: "Aimbot",           cat: "combat" },
    { key: "esp",         regex: /esp|wallhack|chams|ver\s*players|see\s*players|box/i,  label: "ESP",              cat: "visual" },
    { key: "speed",       regex: /speed|velocidade|correr\s*r[áa]pido|walkspeed/i,        label: "Speed",            cat: "movement" },
    { key: "jump",        regex: /jump|pulo\b|jump\s*boost/i,                              label: "Jump Boost",       cat: "movement" },
    { key: "infjump",     regex: /infinite\s*jump|pulo\s*infinito|inf\s*jump/i,           label: "Pulo Infinito",    cat: "movement" },
    { key: "fly",         regex: /fly|voar|flight/i,                                       label: "Fly",              cat: "movement" },
    { key: "noclip",      regex: /noclip|atravessar|no\s*clip/i,                           label: "Noclip",           cat: "movement" },
    { key: "godmode",     regex: /god\s*mode|godmode|imortal|invulner|invenc/i,            label: "Godmode",          cat: "defense" },
    { key: "teleport",    regex: /teleport|\btp\b/i,                                       label: "Teleport",         cat: "movement" },
    { key: "fullbright",  regex: /full[\s-]?bright|brilho|iluminac|noite\s*clara/i,        label: "Fullbright",       cat: "visual" },
    { key: "autoatk",     regex: /auto[\s-]?attack|auto[\s-]?atk|auto[\s-]?hit|ataca\s*auto/i, label: "Auto-Attack",  cat: "combat" },
    { key: "antidet",     regex: /anti[\s-]?detect|anti[\s-]?ban|nao\s*detect/i,          label: "Anti-Detect",      cat: "defense" },
    { key: "antistate",   regex: /anti[\s-]?state|anti[\s-]?captur|escapar/i,             label: "Anti-State",       cat: "defense" },
    { key: "stats",       regex: /stats|fps\b|ping/i,                                      label: "Stats Overlay",    cat: "info" },
    { key: "rejoin",      regex: /rejoin|reconectar|relogar/i,                             label: "Rejoin",           cat: "util" },
    { key: "invisible",   regex: /invis[íi]vel|invisible/i,                                label: "Invisibilidade",   cat: "defense" },
    { key: "hitbox",      regex: /hitbox|expand\s*hitbox|alcance/i,                        label: "Hitbox Expander",  cat: "combat" },
    { key: "spam",        regex: /spam|flood/i,                                            label: "Spam Remotes",     cat: "util" },
];

// ═══════════ HELPERS ═══════════
function set_status(text, kind) {
    const el = $("#status-text");
    el.textContent = text;
    el.style.color = kind === "ok"   ? "var(--success)"
                  : kind === "err"  ? "var(--danger)"
                  : kind === "warn" ? "var(--warn)"
                  : "var(--text2)";
}

function esc(str) {
    return String(str).replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;");
}

function sanitize(name) {
    let s = String(name).replace(/[^a-zA-Z0-9_]/g, "_");
    if (/^\d/.test(s)) s = "_" + s;
    if (["end","if","then","else","for","while","do","local","function","return","true","false","nil","and","or","not"].includes(s)) s = "_" + s;
    return s;
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

function looksLikeRemote(name) {
    if (!name || typeof name !== "string") return false;
    if (name.length > 60) return false;
    if (NON_REMOTE_NAMES.has(name.toLowerCase())) return false;
    if (GENERIC_REMOTES.test(name)) return false;
    return /(Event|Remote|Signal|Trigger|Request|Response|Notify|Action|Call|Handler|Attack|Hit|Move|Jump|Speed|State|Status|Ping|Message|Chat)$/i.test(name);
}

// ═══════════ PARSER ═══════════
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
    for (const re of [
        /nome\s+do\s+jogo\s*[:\-]\s*(.+?)(?:\s*\((\d+)\))?$/im,
        /gamename\s*[:\-]\s*(.+)$/im,
        /game\s*name\s*[:\-]\s*(.+)$/im,
    ]) {
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
    for (const line of lines) {
        const l = line.trim();
        if (!l) continue;
        if (/REMOTE\s+EVENTS/i.test(l))     { section = "remotes"; continue; }
        if (/REMOTE\s+FUNCTIONS/i.test(l))  { section = "functions"; continue; }
        if (/BINDABLE\s+EVENTS/i.test(l))   { section = "bindables"; continue; }
        if (/LOCAL\s+SCRIPTS/i.test(l))     { section = "localscripts"; continue; }
        if (/MODULE\s+SCRIPTS/i.test(l))    { section = "modules"; continue; }

        const pm = l.match(/^([A-Z]{2,4})\/(.+?)(?:\s+\((.+?)\))?$/);
        if (pm && section) {
            const [, prefix, rest, kind] = pm;
            let name = rest, parent = prefix;
            if (prefix === "CHAR" && rest.includes("/")) {
                const parts = rest.split("/");
                parent = "CHAR/" + parts[0];
                name = parts.slice(1).join("/");
            }
            if (!state[section].has(name)) {
                state[section].set(name, { parents: new Set(), kind: kind || "" });
            }
            state[section].get(name).parents.add(parent);
        }
    }
}

function parse_lua_source(text) {
    // WaitForChild / FindFirstChild
    for (const re of [/:WaitForChild\s*\(\s*["']([^"']+)["']/g, /:FindFirstChild\s*\(\s*["']([^"']+)["']/g]) {
        let m;
        while ((m = re.exec(text)) !== null) {
            const name = m[1];
            const ctx = text.slice(Math.max(0, m.index - 250), m.index + 250);
            const isRemoteCtx = /RemoteEvent|RemoteFunction|\.OnClientEvent|\.OnServerEvent|:FireServer|:FireClient|:InvokeServer|:FireAllClients/i.test(ctx);
            if (isRemoteCtx || looksLikeRemote(name)) {
                if (!state.remotes.has(name)) {
                    state.remotes.set(name, { parents: new Set(), kind: "" });
                }
                state.remotes.get(name).parents.add("script");
            }
        }
    }

    // Instance.new
    const inst = /Instance\.new\s*\(\s*["']([^"']+)["']/g;
    let im;
    while ((im = inst.exec(text)) !== null) {
        const cls = im[1];
        if (cls === "RemoteEvent")     pushMap("remotes",   "_Instance.new(RemoteEvent)",   { parent: "script", kind: cls });
        if (cls === "RemoteFunction")  pushMap("functions", "_Instance.new(RemoteFunction)", { parent: "script", kind: cls });
        if (cls === "BindableEvent")   pushMap("bindables", "_Instance.new(BindableEvent)",  { parent: "script", kind: cls });
    }

    // FireServer / FireClient / InvokeServer
    for (const { re, kind } of [
        { re: /([\w.\[\]"_'()]+)\s*:\s*FireServer\s*\(([^)]*)\)/g, kind: "FireServer" },
        { re: /([\w.\[\]"_'()]+)\s*:\s*FireClient\s*\(([^)]*)\)/g, kind: "FireClient" },
        { re: /([\w.\[\]"_'()]+)\s*:\s*FireAllClients\s*\(([^)]*)\)/g, kind: "FireAllClients" },
        { re: /([\w.\[\]"_'()]+)\s*:\s*InvokeServer\s*\(([^)]*)\)/g, kind: "InvokeServer" },
    ]) {
        let m;
        while ((m = re.exec(text)) !== null) {
            const name = extract_name(m[1].trim());
            const args = m[2].trim();
            if (!name) continue;
            if (NON_REMOTE_NAMES.has(name.toLowerCase())) continue;
            if (!state.firecalls.has(name)) {
                state.firecalls.set(name, { kinds: new Set(), args: new Set() });
            }
            const e = state.firecalls.get(name);
            e.kinds.add(kind);
            if (args) e.args.add(args);
            pushMap("remotes", name, { parent: "firecalls", kind: "" });
        }
    }

    // Connect
    const connect = /([\w.\[\]"_'()]+)\s*\.\s*(OnClientEvent|OnServerEvent)\s*:\s*Connect\s*\(\s*function\s*\(([^)]*)\)/g;
    let cm;
    while ((cm = connect.exec(text)) !== null) {
        const name = extract_name(cm[1]);
        if (!name) continue;
        if (NON_REMOTE_NAMES.has(name.toLowerCase())) continue;
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

function pushMap(section, name, info) {
    if (!state[section]) return;
    if (!state[section].has(name)) {
        state[section].set(name, { parents: new Set(), kind: info.kind || "" });
    }
    state[section].get(name).parents.add(info.parent);
}

function extract_name(expr) {
    if (!expr) return null;
    const q = expr.match(/["']([^"']+)["']/);
    if (q) return q[1];
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
        const low = tok.toLowerCase();
        if (STOPWORDS.has(low)) continue;
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
        const efn = fn.replace(".", "\\.");
        if (new RegExp(`\\b${efn}\\s*[:=]\\s*function`, "i").test(text) ||
            new RegExp(`\\b${efn}\\b\\s*\\(`, "i").test(text)) {
            state.executor[fn] = "presente";
        }
    }
}

// ═══════════ SUGESTÕES ═══════════
function build_suggestions() {
    const out = [];

    const totalRemotes = state.remotes.size + state.functions.size;
    out.push({
        title: "📊 Visão geral",
        body: [
            `<strong>${totalRemotes}</strong> remotes/functions detectados`,
            `<strong>${state.firecalls.size}</strong> remotes chamados via Fire`,
            `<strong>${Object.keys(state.executor).length}</strong> funções de executor`,
            `<strong>${state.modules.size}</strong> modules · <strong>${state.localscripts.size}</strong> locals`,
        ].join("<br>"),
    });

    const sorted = Array.from(state.firecalls.entries())
        .sort((a, b) => b[1].kinds.size - a[1].kinds.size).slice(0, 5);
    if (sorted.length > 0) {
        out.push({
            title: "🎯 Remotes mais usados",
            body: sorted.map(([name, info]) => {
                const args = info.args.size > 0 ? ` — args: <code>${esc(Array.from(info.args)[0].slice(0, 60))}</code>` : "";
                return `<code>${esc(name)}</code> — ${Array.from(info.kinds).join(", ")}${args}`;
            }).join("<br>"),
        });
    }

    const cats = [
        { r: /attack|hit|damage|combat|swing|shoot|punch/i, t: "⚔ Auto-Attack candidatos" },
        { r: /status|state|captur|stun|freeze|prison/i,     t: "🔒 Anti-State candidatos" },
        { r: /detect|ban|kick|report|alert|watch/i,          t: "⚠️ Anti-Detect candidatos" },
        { r: /move|speed|jump|teleport|dash|walk|sprint/i,   t: "🏃 Movement candidatos" },
    ];
    for (const cat of cats) {
        const m = Array.from(state.firecalls.keys()).filter(n => cat.r.test(n));
        if (m.length > 0) {
            out.push({ title: cat.t, body: m.map(n => `<code>${esc(n)}</code>`).join("<br>") });
        }
    }

    const exec = Object.keys(state.executor);
    if (exec.length > 0) {
        out.push({
            title: "🛠 Executor",
            body: [
                exec.map(k => `<span class="tag ok">${esc(k)}</span>`).join(" "),
                exec.includes("hookfunction") ? "✅ hookfunction disponível." : "⚠️ hookfunction ausente.",
            ].join("<br>"),
        });
    }

    return out;
}

// ═══════════ RENDER ═══════════
function make_section(title, count) {
    const wrap = document.createElement("div");
    wrap.className = "section";
    wrap.id = "sec-" + title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
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
    if (g.placeId) meta += `<span>Place ID: <strong>${esc(g.placeId)}</strong></span>`;
    if (g.jobId)   meta += `<span>JobId: <strong>${esc(g.jobId.slice(0, 16))}...</strong></span>`;
    if (g.player)  meta += `<span>Player: <strong>${esc(g.player)}</strong></span>`;
    card.innerHTML = `
        <h2>${g.name ? esc(g.name) : "Jogo não identificado"}</h2>
        <div class="game-meta">${meta || "<span style='color:var(--text3)'>sem metadados</span>"}</div>
    `;
    parent.appendChild(card);
}

function render_map(parent, map, title, showArgs = false) {
    if (!map || map.size === 0) return;
    const sec = make_section(title, map.size);
    const sorted = Array.from(map.entries()).sort((a, b) => a[0].localeCompare(b[0]));

    for (const [name, info] of sorted) {
        const parents = info.parents ? Array.from(info.parents).join(", ") : "";
        let args_html = "";
        if (showArgs && info.args && info.args.size > 0) {
            args_html = `<div class="meta" style="color:var(--glow); margin-top:6px">args: ${Array.from(info.args).map(a => esc(a)).join(" / ")}</div>`;
        }
        const generic = GENERIC_REMOTES.test(name) ? "true" : "false";
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
        const argsList = Array.from(info.args).slice(0, 2).map(a => `<div class="snippet">${esc(a)}</div>`).join("");
        const generic = GENERIC_REMOTES.test(name) ? "true" : "false";
        sec.body.innerHTML += `
            <div class="entry" data-name="${esc(name.toLowerCase())}" data-generic="${generic}">
                <span class="name">${esc(name)}</span>
                <div class="meta"><span class="tag remote">${Array.from(info.kinds).join(", ")}</span></div>
                ${argsList}
            </div>`;
    }
    parent.appendChild(sec.wrap);
}

function render_mentions(parent) {
    const relevant = Array.from(state.mentions.entries())
        .filter(([t, i]) => i.count >= 3 && !STOPWORDS.has(t.toLowerCase()))
        .sort((a, b) => b[1].count - a[1].count).slice(0, 30);
    if (relevant.length === 0) return;

    const max = relevant[0][1].count;
    const sec = make_section("Menções frequentes", relevant.length);
    for (const [tok, info] of relevant) {
        const pct = (info.count / max) * 100;
        const samples = info.samples.slice(0, 1).map(s => `<div class="snippet">${esc(s)}</div>`).join("");
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
            <div class="empty-icon">📋</div>
            <h3>Nada reconhecido</h3>
            <p>O dump parece vazio ou em formato não suportado.</p>
        </div>`;
        return;
    }

    render_game_card(rep);
    render_map(rep, state.remotes, "Remote Events", true);
    render_map(rep, state.functions, "Remote Functions", true);
    render_map(rep, state.bindables, "Bindable Events");
    render_map(rep, state.modules, "Module Scripts");
    render_map(rep, state.localscripts, "Local Scripts");
    render_firecalls(rep);
    render_mentions(rep);
    render_executor(rep);

    const sug = build_suggestions();
    if (sug.length > 0) {
        const sec = make_section("Sugestões", sug.length);
        for (const s of sug) {
            sec.body.innerHTML += `<div class="suggestion"><h4>${s.title}</h4><p>${s.body}</p></div>`;
        }
        rep.appendChild(sec.wrap);
    }

    apply_filter();
    apply_important_mode();
}

// ═══════════ FILTRO ═══════════
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
    $$(".section").forEach(sec => {
        const vis = sec.querySelectorAll(".entry:not(.hidden-by-filter):not(.hidden-by-important)");
        if (sec.querySelector(".body")) {
            sec.style.display = vis.length > 0 ? "" : "none";
        }
    });
    const fc = $("#filter-count");
    if (q) fc.textContent = `${visible} / ${entries.length}`;
    else fc.textContent = "";
}

function apply_important_mode() {
    $$(".entry").forEach(el => {
        const generic = el.dataset.generic === "true";
        el.classList.toggle("hidden-by-important", state.importantMode && generic);
    });
    $$(".section").forEach(sec => {
        const vis = sec.querySelectorAll(".entry:not(.hidden-by-filter):not(.hidden-by-important)");
        if (sec.querySelector(".body")) {
            sec.style.display = vis.length > 0 ? "" : "none";
        }
    });
}

// ═══════════ GERADORES ═══════════

function getRealRemotes() {
    return Array.from(new Set([...state.remotes.keys(), ...state.firecalls.keys()]))
        .filter(n => {
            if (n.startsWith("_Instance")) return false;
            if (NON_REMOTE_NAMES.has(n.toLowerCase())) return false;
            if (GENERIC_REMOTES.test(n)) return false;
            return looksLikeRemote(n) || state.firecalls.has(n);
        });
}

function generate_skeleton() {
    if (!state.raw) { set_status("Analisa um dump primeiro", "err"); return; }
    const realRemotes = getRealRemotes();
    const L = [];

    L.push(`--[[`);
    L.push(`    LC10 • Esqueleto gerado`);
    L.push(`    Jogo: ${state.game?.name || "?"}`);
    L.push(`    Remotes reais: ${realRemotes.length}`);
    L.push(`    Gerado por LC10 Dump Studio — x.lusca1`);
    L.push(`]]`);
    L.push("");
    L.push(`local RS = game:GetService("ReplicatedStorage")`);
    L.push(`local WS = game:GetService("Workspace")`);
    L.push("");
    L.push("-- ═══ REMOTES ═══");
    for (const name of realRemotes.slice(0, 30)) {
        const info = state.remotes.get(name);
        const args = state.firecalls.get(name)?.args;
        const note = args && args.size > 0 ? ` -- args: ${Array.from(args)[0].slice(0, 60)}` : "";
        L.push(`local ${sanitize(name)} = RS:FindFirstChild("${name}") or WS:FindFirstChild("${name}")${note}`);
    }
    L.push("");
    L.push("-- Preenche os args com sniffer antes de usar");
    return L.join("\n");
}

function generate_sniffer() {
    if (!state.raw) { set_status("Analisa um dump primeiro", "err"); return; }
    const remotes = getRealRemotes();
    const L = [];

    L.push(`--[[`);
    L.push(`    LC10 • Sniffer`);
    L.push(`    Jogo: ${state.game?.name || "?"}`);
    L.push(`    ${remotes.length} remotes detectados`);
    L.push(`]]`);
    L.push("");
    L.push(`local RS = game:GetService("ReplicatedStorage")`);
    L.push(`local WS = game:GetService("Workspace")`);
    L.push("");
    L.push(`local WEBHOOK = "" -- opcional`);
    L.push("");
    L.push(`local function http_post(url, body)`);
    L.push(`    if syn and syn.request then return syn.request({Url=url,Method="POST",Headers={["Content-Type"]="application/json"},Body=body})`);
    L.push(`    elseif http and http.request then return http.request({Url=url,Method="POST",Headers={["Content-Type"]="application/json"},Body=body})`);
    L.push(`    elseif request then return request({Url=url,Method="POST",Headers={["Content-Type"]="application/json"},Body=body}) end`);
    L.push(`end`);
    L.push("");
    L.push(`local function ser(v, d)`);
    L.push(`    d = d or 0; if d > 3 then return "..." end`);
    L.push(`    local t = type(v)`);
    L.push(`    if t == "string" then return '"'..v..'"'`);
    L.push(`    elseif t == "number" or t == "boolean" then return tostring(v)`);
    L.push(`    elseif t == "Instance" then return v:GetFullName()`);
    L.push(`    elseif t == "table" then`);
    L.push(`        local p = {}; for k,vv in pairs(v) do table.insert(p, tostring(k).."="..ser(vv,d+1)) end`);
    L.push(`        return "{"..table.concat(p,", ").."}"`);
    L.push(`    else return "<"..t..">" end`);
    L.push(`end`);
    L.push("");
    L.push(`local function capture(name, direction, ...)`);
    L.push(`    local args = {...}; local out = {}`);
    L.push(`    for i=1,#args do out[i] = "["..i.."] "..ser(args[i]) end`);
    L.push(`    local txt = table.concat(out, "\\n")`);
    L.push(`    print("[LC10] "..name.." / "..direction.."\\n"..txt)`);
    L.push(`    if WEBHOOK ~= "" then`);
    L.push(`        local body = game:GetService("HttpService"):JSONEncode({content = "**"..name.."** — "..direction.."\\n\\\`\\\`\\\`\\n"..txt.."\\n\\\`\\\`\\\`"})`);
    L.push(`        pcall(function() http_post(WEBHOOK, body) end)`);
    L.push(`    end`);
    L.push(`end`);
    L.push("");
    L.push("local alvos = {");
    for (const n of remotes.slice(0, 40)) L.push(`    "${n}",`);
    L.push("}");
    L.push("");
    L.push("for _, nome in ipairs(alvos) do");
    L.push(`    for _, parent in ipairs({RS, WS}) do`);
    L.push(`        local r = parent:FindFirstChild(nome)`);
    L.push(`        if r and (r:IsA("RemoteEvent") or r:IsA("RemoteFunction")) then`);
    L.push(`            if r.OnClientEvent then`);
    L.push(`                r.OnClientEvent:Connect(function(...) capture(nome, "OnClientEvent", ...) end)`);
    L.push(`            end`);
    L.push(`            if hookfunction then`);
    L.push(`                local old = r.FireServer`);
    L.push(`                hookfunction(old, newcclosure(function(self, ...)`);
    L.push(`                    capture(nome, "FireServer", ...)`);
    L.push(`                    return old(self, ...)`);
    L.push(`                end))`);
    L.push(`            end`);
    L.push(`            print("[LC10] hookado: "..nome)`);
    L.push(`        end`);
    L.push(`    end`);
    L.push(`end`);
    L.push("");
    L.push(`print("[LC10] sniffer ativo.")`);
    return L.join("\n");
}

// ═══════════ SCRIPT COMPLETO (com prompt + plataforma) ═══════════
function parsePromptFeatures(prompt) {
    const found = [];
    const lower = prompt.toLowerCase();
    for (const f of FEATURES) {
        if (f.regex.test(lower)) found.push(f);
    }
    return found;
}

function generate_custom_script(prompt, platform) {
    if (!state.raw) return null;

    const requested = parsePromptFeatures(prompt || "");
    const realRemotes = getRealRemotes();
    const gameName = state.game?.name || "Jogo";
    const isMobile = platform === "mobile";

    // categoriza remotes do dump
    const attackRemotes = realRemotes.filter(n => /attack|hit|damage|combat|swing|shoot|punch|slash|melee|kill/i.test(n));
    const stateRemotes  = realRemotes.filter(n => /status|state|captur|stun|freeze|prison|jail|arrest/i.test(n));
    const detectRemotes = realRemotes.filter(n => /detect|ban|kick|report|alert|flag|watch/i.test(n));
    const moveRemotes   = realRemotes.filter(n => /move|speed|jump|teleport|dash|sprint|walk|fly|position/i.test(n));

    const L = [];
    const dateStr = new Date().toLocaleDateString("pt-BR");

    // ─── HEADER
    L.push(`--[[`);
    L.push(`    ════════════════════════════════════════════════════════════`);
    L.push(`    LC10 • Script Gerado Automaticamente`);
    L.push(`    ════════════════════════════════════════════════════════════`);
    L.push(`    Jogo:        ${gameName}`);
    L.push(`    Plataforma:  ${isMobile ? "MOBILE 📱" : "PC 🖥️"}`);
    L.push(`    Autor:       x.lusca1`);
    L.push(`    Data:        ${dateStr}`);
    L.push(`    Remotes:     ${realRemotes.length} detectados no dump`);
    L.push(`    Funções:     ${requested.length > 0 ? requested.map(f => f.label).join(", ") : "auto-detect"}`);
    L.push(`    ════════════════════════════════════════════════════════════`);
    L.push(`]]`);
    L.push("");

    // ─── SERVICES
    L.push("-- ═══ SERVICES ═══");
    L.push(`local Players = game:GetService("Players")`);
    L.push(`local RunService = game:GetService("RunService")`);
    L.push(`local UserInput = game:GetService("UserInputService")`);
    L.push(`local TweenService = game:GetService("TweenService")`);
    L.push(`local Lighting = game:GetService("Lighting")`);
    L.push(`local TeleportService = game:GetService("TeleportService")`);
    L.push(`local CoreGui = game:GetService("CoreGui")`);
    L.push(`local RS = game:GetService("ReplicatedStorage")`);
    L.push(`local WS = game:GetService("Workspace")`);
    L.push(`local LP = Players.LocalPlayer`);
    L.push("");

    // ─── CONFIG
    L.push("-- ═══ CONFIG ═══");
    L.push(`local Config = {`);
    L.push(`    brand = "LC10",`);
    L.push(`    version = "1.0.0",`);
    L.push(`    game = "${gameName.replace(/"/g, '\\"')}",`);
    L.push(`    platform = "${platform}",`);
    L.push(`    isMobile = ${isMobile},`);
    L.push(isMobile
        ? `    keybind = nil, -- mobile não usa keybind`
        : `    keybind = Enum.KeyCode.RightShift,`);
    L.push(`}`);
    L.push("");

    L.push("-- ═══ TEMA ═══");
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
    L.push(`    text3    = Color3.fromHex("6B7280"),`);
    L.push(`    gold     = Color3.fromHex("FBBF24"),`);
    L.push(`}`);
    L.push("");
    L.push(`local F = { heading = Enum.Font.GothamBold, body = Enum.Font.Gotham, mono = Enum.Font.Code }`);
    L.push("");

    // ─── REMOTES
    if (realRemotes.length > 0) {
        L.push("-- ═══ REMOTES (do dump) ═══");
        for (const name of realRemotes.slice(0, 25)) {
            L.push(`local ${sanitize(name)} = RS:FindFirstChild("${name}") or WS:FindFirstChild("${name}")`);
        }
        L.push("");
    }

    // ─── MÓDULOS DE FEATURES
    const featureModules = [];

    // ESP
    if (requested.some(f => f.key === "esp") || requested.length === 0) {
        featureModules.push({
            name: "ESP",
            cat: "Visual",
            code: [
                `local ESP = { active = false, folder = nil }`,
                `function ESP.enable()`,
                `    if ESP.folder then ESP.folder:Destroy() end`,
                `    ESP.folder = Instance.new("Folder", CoreGui)`,
                `    ESP.folder.Name = "LC10_ESP"`,
                `    for _, plr in ipairs(Players:GetPlayers()) do`,
                `        if plr ~= LP then`,
                `            local hl = Instance.new("Highlight", ESP.folder)`,
                `            hl.FillColor = Theme.accent`,
                `            hl.OutlineColor = Theme.glow`,
                `            hl.FillTransparency = 0.6`,
                `            hl.DepthMode = Enum.HighlightDepthMode.AlwaysOnTop`,
                `            local function upd() hl.Adornee = plr.Character end`,
                `            plr.CharacterAdded:Connect(upd); upd()`,
                `        end`,
                `    end`,
                `end`,
                `function ESP.disable()`,
                `    if ESP.folder then ESP.folder:Destroy(); ESP.folder = nil end`,
                `end`,
            ],
        });
    }

    // Aimbot
    if (requested.some(f => f.key === "aimbot")) {
        featureModules.push({
            name: "Aimbot",
            cat: "Combat",
            code: [
                `local Aimbot = { active = false, smoothness = 0.15, range = 300 }`,
                `function Aimbot.loop()`,
                `    RunService.RenderStepped:Connect(function()`);
                L.push(`        -- Aimbot: usa Camera do player pra mirar no mais próximo`);
                L.push(`    end)`);
                L.push(`end`);
                L.push(`function Aimbot.getTarget()`);
                L.push(`    local cam = WS.CurrentCamera`);
                L.push(`    local closest, dist = nil, Aimbot.range`);
                L.push(`    for _, p in ipairs(Players:GetPlayers()) do`);
                L.push(`        if p ~= LP and p.Character then`);
                L.push(`            local head = p.Character:FindFirstChild("Head")`);
                L.push(`            if head then`);
                L.push(`                local d = (cam.CFrame.Position - head.Position).Magnitude`);
                L.push(`                if d < dist then closest, dist = head, d end`);
                L.push(`            end`);
                L.push(`        end`);
                L.push(`    end`);
                L.push(`    return closest`);
                L.push(`end`);
            ],
        });
    }

    // Speed / Jump / Movement
    if (requested.some(f => ["speed","jump","infjump","fly","noclip"].includes(f.key)) || moveRemotes.length > 0) {
        featureModules.push({
            name: "Movement",
            cat: "Movement",
            code: [
                `local Movement = { speed = false, jump = false, infJump = false, fly = false, noclip = false, speedValue = 32, jumpValue = 100 }`,
                `RunService.Heartbeat:Connect(function()`,
                `    local char = LP.Character`,
                `    local hum = char and char:FindFirstChildOfClass("Humanoid")`,
                `    if not hum then return end`,
                `    if Movement.speed then hum.WalkSpeed = Movement.speedValue end`,
                `    if Movement.jump then hum.UseJumpPower = true; hum.JumpPower = Movement.jumpValue end`,
                `    if Movement.noclip then`,
                `        for _, p in ipairs(char:GetDescendants()) do`,
                `            if p:IsA("BasePart") then p.CanCollide = false end`,
                `        end`,
                `    end`,
                `end)`,
                `UserInput.JumpRequest:Connect(function()`,
                `    if Movement.infJump then`,
                `        local hum = LP.Character and LP.Character:FindFirstChildOfClass("Humanoid")`,
                `        if hum then hum:ChangeState(Enum.HumanoidStateType.Jumping) end`,
                `    end`,
                `end)`,
            ],
        });
    }

    // Godmode
    if (requested.some(f => f.key === "godmode")) {
        featureModules.push({
            name: "Godmode",
            cat: "Defense",
            code: [
                `local Godmode = { active = false }`,
                `RunService.Heartbeat:Connect(function()`,
                `    if not Godmode.active then return end`,
                `    local hum = LP.Character and LP.Character:FindFirstChildOfClass("Humanoid")`,
                `    if hum then hum.Health = hum.MaxHealth end`,
                `end)`,
            ],
        });
    }

    // Fullbright
    if (requested.some(f => f.key === "fullbright")) {
        featureModules.push({
            name: "Fullbright",
            cat: "Visual",
            code: [
                `local Fullbright = { active = false, prev = {} }`,
                `function Fullbright.enable()`,
                `    Fullbright.prev.Ambient = Lighting.Ambient`,
                `    Fullbright.prev.Brightness = Lighting.Brightness`,
                `    Fullbright.prev.ClockTime = Lighting.ClockTime`,
                `    Lighting.Ambient = Color3.fromRGB(200,200,200)`,
                `    Lighting.Brightness = 3`,
                `    Lighting.ClockTime = 14`,
                `end`,
                `function Fullbright.disable()`,
                `    Lighting.Ambient = Fullbright.prev.Ambient or Lighting.Ambient`,
                `    Lighting.Brightness = Fullbright.prev.Brightness or 2`,
                `    Lighting.ClockTime = Fullbright.prev.ClockTime or 14`,
                `end`,
            ],
        });
    }

    // Anti-Detect
    if (requested.some(f => f.key === "antidet") && detectRemotes.length > 0) {
        featureModules.push({
            name: "Anti-Detect",
            cat: "Defense",
            code: [
                `local AntiDetect = { active = false }`,
                `function AntiDetect.install()`,
                ...detectRemotes.flatMap(r => [
                    `    if ${sanitize(r)} and ${sanitize(r)}.OnClientEvent then`,
                    `        ${sanitize(r)}.OnClientEvent:Connect(function(...)`,
                    `            if not AntiDetect.active then return end`,
                    `            print("[LC10] detect interceptado: ${sanitize(r)}")`,
                    `        end)`,
                    `    end`,
                ]),
                `end`,
            ],
        });
    }

    // Anti-State
    if (requested.some(f => f.key === "antistate") && stateRemotes.length > 0) {
        featureModules.push({
            name: "Anti-State",
            cat: "Defense",
            code: [
                `local AntiState = { active = false }`,
                `function AntiState.install()`,
                ...stateRemotes.flatMap(r => [
                    `    if ${sanitize(r)} and ${sanitize(r)}.OnClientEvent then`,
                    `        ${sanitize(r)}.OnClientEvent:Connect(function(...)`,
                    `            if not AntiState.active then return end`,
                    `            print("[LC10] state interceptado: ${sanitize(r)}")`,
                    `        end)`,
                    `    end`,
                ]),
                `end`,
            ],
        });
    }

    // Auto-Attack
    if (requested.some(f => f.key === "autoatk") && attackRemotes.length > 0) {
        featureModules.push({
            name: "Auto-Attack",
            cat: "Combat",
            code: [
                `local AutoAttack = { active = false, last = 0, cooldown = 0.8, range = 15 }`,
                `RunService.Heartbeat:Connect(function()`,
                `    if not AutoAttack.active then return end`,
                `    if tick() - AutoAttack.last < AutoAttack.cooldown then return end`,
                `    local hrp = LP.Character and LP.Character:FindFirstChild("HumanoidRootPart")`,
                `    if not hrp then return end`,
                `    local target, dist = nil, AutoAttack.range`,
                `    for _, p in ipairs(Players:GetPlayers()) do`,
                `        if p ~= LP and p.Character then`,
                `            local t = p.Character:FindFirstChild("HumanoidRootPart")`,
                `            if t then`,
                `                local d = (t.Position - hrp.Position).Magnitude`,
                `                if d < dist then target, dist = p, d end`,
                `            end`,
                `        end`,
                `    end`,
                `    if target then`,
                `        AutoAttack.last = tick()`,
                ...attackRemotes.map(r => `        if ${sanitize(r)} then pcall(function() ${sanitize(r)}:FireServer(target) end) end`),
                `    end`,
                `end)`,
            ],
        });
    }

    // Teleport
    if (requested.some(f => f.key === "teleport")) {
        featureModules.push({
            name: "Teleport",
            cat: "Movement",
            code: [
                `local Teleport = { active = false }`,
                `function Teleport.toPlayer(name)`,
                `    for _, p in ipairs(Players:GetPlayers()) do`,
                `        if p.Name:lower():find(name:lower()) and p.Character then`,
                `            local hrp = LP.Character and LP.Character:FindFirstChild("HumanoidRootPart")`,
                `            local t = p.Character:FindFirstChild("HumanoidRootPart")`,
                `            if hrp and t then hrp.CFrame = t.CFrame * CFrame.new(0, 3, 0) end`,
                `        end`,
                `    end`,
                `end`,
            ],
        });
    }

    // Stats
    if (requested.some(f => f.key === "stats")) {
        featureModules.push({
            name: "Stats",
            cat: "Info",
            code: [
                `local Stats = { active = false, gui = nil }`,
                `function Stats.enable()`,
                `    if Stats.gui then Stats.gui:Destroy() end`,
                `    Stats.gui = Instance.new("ScreenGui", CoreGui)`,
                `    Stats.gui.Name = "LC10_Stats"`,
                `    local lbl = Instance.new("TextLabel", Stats.gui)`,
                `    lbl.Size = UDim2.new(0, 180, 0, 60)`,
                `    lbl.Position = UDim2.new(0, 10, 0, 10)`,
                `    lbl.BackgroundColor3 = Theme.bg`,
                `    lbl.TextColor3 = Theme.text`,
                `    lbl.Font = F.mono`,
                `    lbl.TextSize = 12`,
                `    lbl.TextXAlignment = Enum.TextXAlignment.Left`,
                `    Instance.new("UICorner", lbl).CornerRadius = UDim.new(0, 6)`,
                `    task.spawn(function()`,
                `        while Stats.gui and Stats.gui.Parent do`,
                `            lbl.Text = string.format(" FPS: %d\\n Ping: %d ms\\n Players: %d",`,
                `                math.floor(1/RunService.RenderStepped:Wait()),`,
                `                math.floor(LP:GetNetworkPing() * 1000),`,
                `                #Players:GetPlayers())`,
                `        end`,
                `    end)`,
                `end`,
                `function Stats.disable()`,
                `    if Stats.gui then Stats.gui:Destroy(); Stats.gui = nil end`,
                `end`,
            ],
        });
    }

    // Rejoin
    if (requested.some(f => f.key === "rejoin")) {
        featureModules.push({
            name: "Rejoin",
            cat: "Util",
            code: [
                `local function doRejoin()`,
                `    pcall(function()`,
                `        TeleportService:TeleportToPlaceInstance(game.PlaceId, game.JobId, LP)`,
                `    end)`,
                `end`,
            ],
        });
    }

    // Se pediram "gui" ou "painel" ou nada foi pedido, força o módulo de UI
    const wantsGui = requested.some(f => f.key === "gui") || requested.length === 0 || true;

    // ─── UI SYSTEM
    L.push("-- ═══ UI SYSTEM ═══");
    L.push(`local gui = Instance.new("ScreenGui")`);
    L.push(`gui.Name = "LC10_" .. Config.brand`);
    L.push(`gui.ResetOnSpawn = false`);
    L.push(`gui.IgnoreGuiInset = true`);
    L.push(`gui.ZIndexBehavior = Enum.ZIndexBehavior.Sibling`);
    L.push(`pcall(function() gui.Parent = CoreGui end)`);
    L.push(`if not gui.Parent then gui.Parent = LP:WaitForChild("PlayerGui") end`);
    L.push("");
    L.push(`local WIN_W = ${isMobile ? 300 : 480}`);
    L.push(`local WIN_H = ${isMobile ? 320 : 420}`);
    L.push("");
    L.push(`local win = Instance.new("Frame", gui)`);
    L.push(`win.Size = UDim2.new(0, WIN_W, 0, WIN_H)`);
    L.push(`win.Position = UDim2.new(0.5, -WIN_W/2, 0.5, -WIN_H/2)`);
    L.push(`win.BackgroundColor3 = Theme.bg`);
    L.push(`win.BorderSizePixel = 0`);
    L.push(`Instance.new("UICorner", win).CornerRadius = UDim.new(0, 14)`);
    L.push(`local winStroke = Instance.new("UIStroke", win)`);
    L.push(`winStroke.Color = Theme.border`);
    L.push(`winStroke.Thickness = 1`);
    L.push("");
    L.push(`-- header`);
    L.push(`local header = Instance.new("Frame", win)`);
    L.push(`header.Size = UDim2.new(1, 0, 0, ${isMobile ? 46 : 42})`);
    L.push(`header.BackgroundColor3 = Theme.surface`);
    L.push(`header.BorderSizePixel = 0`);
    L.push(`Instance.new("UICorner", header).CornerRadius = UDim.new(0, 14)`);
    L.push(`local hcrop = Instance.new("Frame", header)`);
    L.push(`hcrop.Size = UDim2.new(1, 0, 0, 14)`);
    L.push(`hcrop.Position = UDim2.new(0, 0, 1, -14)`);
    L.push(`hcrop.BackgroundColor3 = Theme.surface`);
    L.push(`hcrop.BorderSizePixel = 0`);
    L.push("");
    L.push(`local title = Instance.new("TextLabel", header)`);
    L.push(`title.Size = UDim2.new(1, -100, 1, 0)`);
    L.push(`title.Position = UDim2.new(0, 16, 0, 0)`);
    L.push(`title.BackgroundTransparency = 1`);
    L.push(`title.Text = Config.brand .. " • " .. Config.game`);
    L.push(`title.TextColor3 = Theme.text`);
    L.push(`title.Font = F.heading`);
    L.push(`title.TextSize = ${isMobile ? 13 : 14}`);
    L.push(`title.TextXAlignment = Enum.TextXAlignment.Left`);
    L.push("");
    L.push(`local closeBtn = Instance.new("TextButton", header)`);
    L.push(`closeBtn.Size = UDim2.new(0, ${isMobile ? 36 : 28}, 0, ${isMobile ? 36 : 28})`);
    L.push(`closeBtn.Position = UDim2.new(1, ${isMobile ? -46 : -38}, 0.5, ${isMobile ? -18 : -14})`);
    L.push(`closeBtn.BackgroundColor3 = Theme.danger`);
    L.push(`closeBtn.Text = "×"`);
    L.push(`closeBtn.TextColor3 = Theme.text`);
    L.push(`closeBtn.Font = F.heading`);
    L.push(`closeBtn.TextSize = 18`);
    L.push(`closeBtn.BorderSizePixel = 0`);
    L.push(`closeBtn.AutoButtonColor = false`);
    L.push(`Instance.new("UICorner", closeBtn).CornerRadius = UDim.new(0, 6)`);
    L.push(`closeBtn.MouseButton1Click:Connect(function() win.Visible = false end)`);
    L.push("");

    // drag
    L.push("-- drag universal (mouse + touch)");
    L.push(`do`);
    L.push(`    local dragging, dragStart, startPos`);
    L.push(`    header.InputBegan:Connect(function(i)`);
    L.push(`        if i.UserInputType == Enum.UserInputType.MouseButton1 or i.UserInputType == Enum.UserInputType.Touch then`);
    L.push(`            dragging = true; dragStart = i.Position; startPos = win.Position`);
    L.push(`        end`);
    L.push(`    end)`);
    L.push(`    UserInput.InputChanged:Connect(function(i)`);
    L.push(`        if dragging and (i.UserInputType == Enum.UserInputType.MouseMovement or i.UserInputType == Enum.UserInputType.Touch) then`);
    L.push(`            local d = i.Position - dragStart`);
    L.push(`            win.Position = UDim2.new(startPos.X.Scale, startPos.X.Offset + d.X, startPos.Y.Scale, startPos.Y.Offset + d.Y)`);
    L.push(`        end`);
    L.push(`    end)`);
    L.push(`    UserInput.InputEnded:Connect(function(i)`);
    L.push(`        if i.UserInputType == Enum.UserInputType.MouseButton1 or i.UserInputType == Enum.UserInputType.Touch then dragging = false end`);
    L.push(`    end)`);
    L.push(`end`);
    L.push("");

    // lista de toggles
    L.push("-- lista de features");
    L.push(`local list = Instance.new("ScrollingFrame", win)`);
    L.push(`list.Size = UDim2.new(1, -24, 1, -${isMobile ? 70 : 66})`);
    L.push(`list.Position = UDim2.new(0, 12, 0, ${isMobile ? 56 : 52})`);
    L.push(`list.BackgroundTransparency = 1`);
    L.push(`list.BorderSizePixel = 0`);
    L.push(`list.ScrollBarThickness = ${isMobile ? 4 : 3}`);
    L.push(`list.ScrollBarImageColor3 = Theme.accent`);
    L.push(`list.CanvasSize = UDim2.new(0, 0, 0, 0)`);
    L.push(`list.AutomaticCanvasSize = Enum.AutomaticSize.Y`);
    L.push(`local ll = Instance.new("UIListLayout", list)`);
    L.push(`ll.Padding = UDim.new(0, ${isMobile ? 8 : 6})`);
    L.push("");

    // função toggle (tamanhos maiores no mobile)
    L.push(`local function mkToggle(label, callback, default)`);
    L.push(`    default = default or false`);
    L.push(`    local row = Instance.new("Frame", list)`);
    L.push(`    row.Size = UDim2.new(1, 0, 0, ${isMobile ? 44 : 36})`);
    L.push(`    row.BackgroundColor3 = Theme.elevated`);
    L.push(`    row.BorderSizePixel = 0`);
    L.push(`    Instance.new("UICorner", row).CornerRadius = UDim.new(0, 8)`);
    L.push(`    local lbl = Instance.new("TextLabel", row)`);
    L.push(`    lbl.Size = UDim2.new(1, -80, 1, 0)`);
    L.push(`    lbl.Position = UDim2.new(0, 16, 0, 0)`);
    L.push(`    lbl.BackgroundTransparency = 1`);
    L.push(`    lbl.Text = label`);
    L.push(`    lbl.TextColor3 = Theme.text`);
    L.push(`    lbl.Font = F.body`);
    L.push(`    lbl.TextSize = ${isMobile ? 14 : 13}`);
    L.push(`    lbl.TextXAlignment = Enum.TextXAlignment.Left`);
    L.push(`    local btn = Instance.new("TextButton", row)`);
    L.push(`    btn.Size = UDim2.new(0, ${isMobile ? 52 : 42}, 0, ${isMobile ? 28 : 20})`);
    L.push(`    btn.Position = UDim2.new(1, -${isMobile ? 64 : 54}, 0.5, -${isMobile ? 14 : 10})`);
    L.push(`    btn.BackgroundColor3 = default and Theme.success or Theme.danger`);
    L.push(`    btn.Text = ""; btn.AutoButtonColor = false; btn.BorderSizePixel = 0`);
    L.push(`    Instance.new("UICorner", btn).CornerRadius = UDim.new(1, 0)`);
    L.push(`    local knobSize = ${isMobile ? 22 : 16}`);
    L.push(`    local knob = Instance.new("Frame", btn)`);
    L.push(`    knob.Size = UDim2.new(0, knobSize, 0, knobSize)`);
    L.push(`    knob.Position = default and UDim2.new(1, -knobSize - 3, 0.5, -knobSize/2) or UDim2.new(0, 3, 0.5, -knobSize/2)`);
    L.push(`    knob.BackgroundColor3 = Theme.text`);
    L.push(`    knob.BorderSizePixel = 0`);
    L.push(`    Instance.new("UICorner", knob).CornerRadius = UDim.new(1, 0)`);
    L.push(`    local state = default`);
    L.push(`    btn.MouseButton1Click:Connect(function()`);
    L.push(`        state = not state`);
    L.push(`        TweenService:Create(btn, TweenInfo.new(0.15), {BackgroundColor3 = state and Theme.success or Theme.danger}):Play()`);
    L.push(`        TweenService:Create(knob, TweenInfo.new(0.15), {Position = state and UDim2.new(1, -knobSize - 3, 0.5, -knobSize/2) or UDim2.new(0, 3, 0.5, -knobSize/2)}):Play()`);
    L.push(`        if callback then callback(state) end`);
    L.push(`    end)`);
    L.push(`end`);
    L.push("");

    // ─── MOBILE floating button
    if (isMobile) {
        L.push("-- ═══ BOTÃO FLUTUANTE (mobile) ═══");
        L.push(`local float = Instance.new("TextButton", gui)`);
        L.push(`float.Size = UDim2.new(0, 60, 0, 60)`);
        L.push(`float.Position = UDim2.new(0, 16, 0.5, -30)`);
        L.push(`float.BackgroundColor3 = Theme.bg`);
        L.push(`float.Text = "LC10"`);
        L.push(`float.TextColor3 = Theme.glow`);
        L.push(`float.Font = F.heading`);
        L.push(`float.TextSize = 12`);
        L.push(`float.BorderSizePixel = 0`);
        L.push(`float.AutoButtonColor = false`);
        L.push(`float.ZIndex = 50`);
        L.push(`Instance.new("UICorner", float).CornerRadius = UDim.new(1, 0)`);
        L.push(`local fs = Instance.new("UIStroke", float)`);
        L.push(`fs.Color = Theme.accent`);
        L.push(`fs.Thickness = 1.5`);
        L.push(`float.MouseButton1Click:Connect(function() win.Visible = not win.Visible end)`);
        L.push(`-- drag do botão flutuante`);
        L.push(`do`);
        L.push(`    local dragging, dragStart, startPos, moved`);
        L.push(`    float.InputBegan:Connect(function(i)`);
        L.push(`        if i.UserInputType == Enum.UserInputType.Touch or i.UserInputType == Enum.UserInputType.MouseButton1 then`);
        L.push(`            dragging = true; moved = false; dragStart = i.Position; startPos = float.Position`);
        L.push(`        end`);
        L.push(`    end)`);
        L.push(`    UserInput.InputChanged:Connect(function(i)`);
        L.push(`        if dragging and (i.UserInputType == Enum.UserInputType.Touch or i.UserInputType == Enum.UserInputType.MouseMovement) then`);
        L.push(`            local d = i.Position - dragStart`);
        L.push(`            if d.Magnitude > 5 then moved = true end`);
        L.push(`            float.Position = UDim2.new(startPos.X.Scale, startPos.X.Offset + d.X, startPos.Y.Scale, startPos.Y.Offset + d.Y)`);
        L.push(`        end`);
        L.push(`    end)`);
        L.push(`    UserInput.InputEnded:Connect(function(i)`);
        L.push(`        if i.UserInputType == Enum.UserInputType.Touch or i.UserInputType == Enum.UserInputType.MouseButton1 then`);
        L.push(`            dragging = false`);
        L.push(`        end`);
        L.push(`    end)`);
        L.push(`end`);
        L.push("");
    } else {
        L.push("-- ═══ KEYBIND (PC) ═══");
        L.push(`UserInput.InputBegan:Connect(function(i, gp)`);
        L.push(`    if gp then return end`);
        L.push(`    if i.KeyCode == Config.keybind then win.Visible = not win.Visible end`);
        L.push(`end)`);
        L.push("");
    }

    // ─── INSERE MÓDULOS
    if (featureModules.length > 0) {
        L.push("-- ═══ MÓDULOS ═══");
        for (const mod of featureModules) {
            L.push(`-- ${mod.name} (${mod.cat})`);
            for (const line of mod.code) L.push(line);
            L.push("");
        }
    }

    // ─── INSTALL CALLS
    L.push("-- ═══ INSTALA ═══");
    if (featureModules.find(m => m.name === "Anti-Detect")) L.push(`if AntiDetect and AntiDetect.install then AntiDetect.install() end`);
    if (featureModules.find(m => m.name === "Anti-State"))  L.push(`if AntiState and AntiState.install then AntiState.install() end`);
    if (featureModules.find(m => m.name === "Aimbot"))      L.push(`if Aimbot and Aimbot.loop then Aimbot.loop() end`);
    L.push("");

    // ─── TOGGLES NA UI
    L.push("-- ═══ TOGGLES ═══");
    const toggleCalls = [];
    if (featureModules.find(m => m.name === "Aimbot"))       toggleCalls.push(`mkToggle("Aimbot", function(v) Aimbot.active = v end)`);
    if (featureModules.find(m => m.name === "ESP"))          toggleCalls.push(`mkToggle("ESP", function(v) if v then ESP.enable() else ESP.disable() end end)`);
    if (featureModules.find(m => m.name === "Movement")) {
        const mvReq = requested.filter(f => ["speed","jump","infjump","noclip"].includes(f.key));
        if (mvReq.some(f => f.key === "speed") || mvReq.length === 0)
            toggleCalls.push(`mkToggle("Speed Hack", function(v) Movement.speed = v end)`);
        if (mvReq.some(f => f.key === "jump") || mvReq.length === 0)
            toggleCalls.push(`mkToggle("Jump Boost", function(v) Movement.jump = v end)`);
        if (mvReq.some(f => f.key === "infjump"))
            toggleCalls.push(`mkToggle("Pulo Infinito", function(v) Movement.infJump = v end)`);
        if (mvReq.some(f => f.key === "noclip"))
            toggleCalls.push(`mkToggle("Noclip", function(v) Movement.noclip = v end)`);
    }
    if (featureModules.find(m => m.name === "Godmode"))      toggleCalls.push(`mkToggle("Godmode", function(v) Godmode.active = v end)`);
    if (featureModules.find(m => m.name === "Fullbright"))   toggleCalls.push(`mkToggle("Fullbright", function(v) if v then Fullbright.enable() else Fullbright.disable() end end)`);
    if (featureModules.find(m => m.name === "Anti-Detect"))  toggleCalls.push(`mkToggle("Anti-Detect", function(v) AntiDetect.active = v end)`);
    if (featureModules.find(m => m.name === "Anti-State"))   toggleCalls.push(`mkToggle("Anti-State", function(v) AntiState.active = v end)`);
    if (featureModules.find(m => m.name === "Auto-Attack"))  toggleCalls.push(`mkToggle("Auto-Attack", function(v) AutoAttack.active = v end)`);
    if (featureModules.find(m => m.name === "Stats"))        toggleCalls.push(`mkToggle("Stats", function(v) if v then Stats.enable() else Stats.disable() end end)`);

    if (toggleCalls.length === 0) {
        toggleCalls.push(`mkToggle("Painel LC10", function(v) print("[LC10] toggle:", v) end)`);
    }
    for (const t of toggleCalls) L.push(t);
    L.push("");

    // teleport input
    if (featureModules.find(m => m.name === "Teleport")) {
        L.push("-- teleport input");
        L.push(`local tpBox = Instance.new("TextBox", list)`);
        L.push(`tpBox.Size = UDim2.new(1, 0, 0, ${isMobile ? 44 : 34})`);
        L.push(`tpBox.BackgroundColor3 = Theme.elevated`);
        L.push(`tpBox.BorderSizePixel = 0`);
        L.push(`tpBox.PlaceholderText = "Nome do player pra teleportar"`);
        L.push(`tpBox.Text = ""`);
        L.push(`tpBox.TextColor3 = Theme.text`);
        L.push(`tpBox.PlaceholderColor3 = Theme.text3`);
        L.push(`tpBox.Font = F.body`);
        L.push(`tpBox.TextSize = ${isMobile ? 13 : 12}`);
        L.push(`Instance.new("UICorner", tpBox).CornerRadius = UDim.new(0, 8)`);
        L.push(`tpBox.FocusLost:Connect(function() if tpBox.Text ~= "" then Teleport.toPlayer(tpBox.Text) end end)`);
        L.push("");
    }

    // ─── PRINT FINAL
    L.push(`print("[LC10] " .. Config.brand .. " carregado — " .. Config.game .. " (" .. Config.platform .. ")")`);
    L.push(`print("[LC10] remotes detectados: ${realRemotes.length}")`);
    L.push(`print("[LC10] features: ${featureModules.length}")`);

    return L.join("\n");
}

// ═══════════ EXPORTS ═══════════
function build_report_text(format) {
    const g = state.game || {};
    if (format === "json") {
        return JSON.stringify({
            game: g,
            remotes: Array.from(state.remotes.entries()).map(([n, i]) => ({
                name: n, kind: i.kind, parents: Array.from(i.parents),
            })),
            firecalls: Array.from(state.firecalls.entries()).map(([n, i]) => ({
                name: n, kinds: Array.from(i.kinds), args: Array.from(i.args),
            })),
            mentions: Array.from(state.mentions.entries()).sort((a,b) => b[1].count - a[1].count).slice(0, 50),
            executor: state.executor,
            generated_by: "LC10 Dump Studio",
            generated_at: new Date().toISOString(),
        }, null, 2);
    }

    const lines = [];
    if (format === "md") {
        lines.push(`# LC10 • Análise de Dump`);
        lines.push(`**Gerado:** ${new Date().toLocaleString()}`);
        if (g.name)    lines.push(`**Jogo:** ${g.name}`);
        if (g.placeId) lines.push(`**Place ID:** ${g.placeId}`);
        lines.push("");
        lines.push(`## Remotes (${state.remotes.size})`);
        for (const [n, i] of state.remotes) lines.push(`- \`${n}\` — ${i.kind || "?"}`);
        lines.push("");
        lines.push(`## Fire Calls (${state.firecalls.size})`);
        for (const [n, i] of state.firecalls) lines.push(`- \`${n}\` — ${Array.from(i.kinds).join(", ")}`);
        return lines.join("\n");
    }

    lines.push("═══════════════════════════════════════");
    lines.push("LC10 • Análise de Dump — by x.lusca1");
    lines.push(`Gerado: ${new Date().toLocaleString()}`);
    lines.push("═══════════════════════════════════════");
    if (g.name)    lines.push(`Nome do jogo: ${g.name}`);
    if (g.placeId) lines.push(`Place ID: ${g.placeId}`);
    lines.push("");
    lines.push(`═══ REMOTES (${state.remotes.size}) ═══`);
    for (const [n, i] of state.remotes) lines.push(`  ${n} — ${i.kind || "?"}`);
    lines.push("");
    lines.push(`═══ FIRE CALLS (${state.firecalls.size}) ═══`);
    for (const [n, i] of state.firecalls) lines.push(`  ${n} — ${Array.from(i.kinds).join(", ")}`);
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

// ═══════════ MODAL ═══════════
function open_output_modal(title, content, sub = "") {
    state.lastOutput = content;
    $("#output-title").textContent = title;
    $("#output-sub").textContent = sub;
    $("#output-content").textContent = content;
    $("#output-modal").classList.remove("hidden");
}

function open_config_modal() {
    if (!state.raw) { set_status("Analisa um dump primeiro", "err"); return; }
    $("#config-modal").classList.remove("hidden");
}

// ═══════════ MENU ═══════════
function toggle_menu() {
    $("#menu-dropdown").classList.toggle("hidden");
    $("#menu-btn").classList.toggle("active");
}

function close_menu() {
    $("#menu-dropdown").classList.add("hidden");
    $("#menu-btn").classList.remove("active");
}

// ═══════════ MAIN ═══════════
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
    }, 40);
}

function update_stats() {
    const v = $("#dump-input").value;
    const chars = v.length;
    const lines = v ? v.split(/\r?\n/).length : 0;
    const kb = (chars / 1024).toFixed(1);
    $("#input-stats").textContent = `${chars.toLocaleString()} chars · ${lines.toLocaleString()} linhas · ${kb} KB`;
}

async function load_files(files) {
    let combined = $("#dump-input").value;
    for (const f of files) {
        try { combined += (combined ? "\n\n" : "") + await f.text(); }
        catch (e) { console.warn(e); }
    }
    $("#dump-input").value = combined;
    update_stats();
    set_status(`${files.length} arquivo(s) carregado(s)`, "ok");
}

// ═══════════ BIND ═══════════
$("#parse-btn").addEventListener("click", run_parse);

$("#clear-btn").addEventListener("click", () => {
    $("#dump-input").value = "";
    update_stats();
    reset_state();
    set_status("Limpo", "ok");
    $("#report").innerHTML = `<div class="empty">
        <div class="empty-icon">📋</div>
        <h3>Nenhum dump analisado</h3>
        <p>Cola um dump no campo acima e clica em <strong>Analisar</strong>.</p>
    </div>`;
});

$("#dump-input").addEventListener("input", update_stats);

$("#file-input").addEventListener("change", (e) => {
    const files = Array.from(e.target.files);
    if (files.length > 0) load_files(files);
    e.target.value = "";
});

// menu
$("#menu-btn").addEventListener("click", (e) => { e.stopPropagation(); toggle_menu(); });
document.addEventListener("click", (e) => {
    if (!e.target.closest("#menu-dropdown") && !e.target.closest("#menu-btn")) close_menu();
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
            const strong = btn.querySelector("strong");
            if (strong) strong.textContent = state.importantMode ? "Modo foco ✓" : "Modo foco";
            apply_important_mode();
            set_status(state.importantMode ? "Modo foco ON" : "Modo foco OFF", "ok");
            return;
        }
        if (action === "skeleton") {
            const code = generate_skeleton();
            open_output_modal("🧩 Esqueleto Lua", code, "Estrutura pronta pra preencher");
            return;
        }
        if (action === "sniffer") {
            const code = generate_sniffer();
            open_output_modal("📡 Sniffer", code, "Cola no executor e roda no jogo");
            return;
        }
        if (action === "fullscript") {
            open_config_modal();
            return;
        }
        if (action === "export-txt") {
            if (!state.raw) { set_status("Analisa um dump primeiro", "err"); return; }
            download_text("lc10-analysis.txt", build_report_text("txt"));
            set_status("Relatório .txt baixado", "ok");
            return;
        }
        if (action === "export-md") {
            if (!state.raw) { set_status("Analisa um dump primeiro", "err"); return; }
            download_text("lc10-analysis.md", build_report_text("md"));
            set_status("Relatório .md baixado", "ok");
            return;
        }
        if (action === "export-json") {
            if (!state.raw) { set_status("Analisa um dump primeiro", "err"); return; }
            download_text("lc10-analysis.json", build_report_text("json"));
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

// config modal — sugestões
$$(".sug-chip").forEach(chip => {
    chip.addEventListener("click", () => {
        $("#prompt-input").value = chip.dataset.sug;
    });
});

// config modal — plataforma
$$(".platform-option").forEach(opt => {
    opt.addEventListener("click", () => {
        $$(".platform-option").forEach(o => o.classList.remove("selected"));
        opt.classList.add("selected");
        state.platform = opt.dataset.platform;
    });
});

// botão gerar
$("#generate-btn").addEventListener("click", () => {
    const prompt = $("#prompt-input").value.trim();
    if (!state.platform) {
        set_status("Escolhe Mobile ou PC", "err");
        return;
    }

    set_status("Gerando script...", "warn");

    setTimeout(() => {
        const code = generate_custom_script(prompt, state.platform);
        if (!code) {
            set_status("Falha na geração — verifica se o dump tem remotes", "err");
            return;
        }

        const features = parsePromptFeatures(prompt);
        const sub = `${state.platform === "mobile" ? "📱 Mobile" : "🖥️ PC"} • ${features.length} features`;

        $("#config-modal").classList.add("hidden");
        open_output_modal(`⚡ Script gerado`, code, sub);
        set_status("Script gerado com sucesso", "ok");
    }, 60);
});

// output modal
$("#output-copy").addEventListener("click", async () => {
    try {
        await navigator.clipboard.writeText(state.lastOutput);
        set_status("Copiado pra clipboard", "ok");
    } catch (e) {
        const ta = document.createElement("textarea");
        ta.value = state.lastOutput;
        document.body.appendChild(ta);
        ta.select();
        document.execCommand("copy");
        document.body.removeChild(ta);
        set_status("Copiado", "ok");
    }
});

$("#output-download").addEventListener("click", () => {
    const title = $("#output-title").textContent;
    let fn = "lc10-output.txt";
    if (title.includes("Esqueleto")) fn = "lc10-skeleton.lua";
    else if (title.includes("Sniffer")) fn = "lc10-sniffer.lua";
    else if (title.includes("Script")) fn = "lc10-script.lua";
    download_text(fn, state.lastOutput);
    set_status("Baixado", "ok");
});

// sidebar
$$("#summary-list li").forEach(li => {
    li.addEventListener("click", () => {
        const sec = document.getElementById("sec-" + li.dataset.target);
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

// ESC fecha modais
document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") {
        $("#config-modal").classList.add("hidden");
        $("#output-modal").classList.add("hidden");
        close_menu();
    }
});

// mobile default
document.querySelector('.platform-option[data-platform="mobile"]').classList.add("selected");
