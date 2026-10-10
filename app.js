// ═══════════════════════════════════════════════════════════
// LC10 • Dump Analyzer — Universal
// author: x.lusca1
// analisa dumps de qualquer jogo Roblox
// ═══════════════════════════════════════════════════════════

const $ = (s) => document.querySelector(s);

const state = {
    game:        null,
    remotes:     new Map(),
    functions:   new Map(),
    modules:     new Map(),
    bindables:   new Map(),
    localscripts:new Map(),
    firecalls:   new Map(),   // remote_name -> [{args, kind}]
    executor:    {},
    mentions:    new Map(),   // token -> {count, samples:[]}
    raw:         "",
};

// ─── helpers ────────────────────────────────────────────────
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

// ─── keywords comuns que aparecem como identificadores Roblox ─
// palavras que terminam nesses sufixos provavelmente são remotes/eventos
const SUFFIX_HINTS = /(Event|Remote|Function|Signal|SignalEvent)$/i;

// palavras genéricas que NÃO interessam como "menção"
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
    "position","rotation","cframe","color","transparency","visible","enabled",
    "text","image","button","frame","label","gui","script","module",
]);

// ─── PARSER PRINCIPAL ───────────────────────────────────────
function parse_text(text) {
    state.raw = text;

    // 1. nome do jogo (se tiver no dump)
    detect_game_info(text);

    // 2. parser estruturado (se tiver headers ═══)
    if (/═══|REMOTE\s+EVENTS|REMOTE\s+FUNCTIONS|MODULE\s+SCRIPTS/i.test(text)) {
        parse_structured(text);
    }

    // 3. parser source Lua (sempre roda)
    parse_lua_source(text);

    // 4. contador de menções por token
    count_mentions(text);

    // 5. detecção de executor
    detect_executor(text);
}

// ─── 1) nome do jogo ────────────────────────────────────────
function detect_game_info(text) {
    // formatos comuns:
    //   "Nome do jogo: Jogo X (123456)"
    //   "Nome do jogo: Jogo X"
    //   "PlaceId: 123456"
    //   "Place ID: 123456"
    //   "GameName: X"
    const name_matches = [
        /nome\s+do\s+jogo\s*[:\-]\s*(.+?)(?:\s*\((\d+)\))?$/im,
        /gamename\s*[:\-]\s*(.+)$/im,
        /game\s*name\s*[:\-]\s*(.+)$/im,
    ];
    for (const re of name_matches) {
        const m = text.match(re);
        if (m) {
            state.game = state.game || {};
            state.game.name = m[1].trim();
            if (m[2]) state.game.placeId = m[2];
            break;
        }
    }

    const place_matches = [
        /place\s*id\s*[:\-]\s*(\d+)/i,
        /placeid\s*[:\-]\s*(\d+)/i,
        /game\.PlaceId\s*[=\s]*(\d+)/i,
    ];
    for (const re of place_matches) {
        const m = text.match(re);
        if (m) {
            state.game = state.game || {};
            state.game.placeId = m[1];
            break;
        }
    }

    // job id
    const job = text.match(/job\s*id\s*[:\-]\s*([\w\-]+)/i);
    if (job) {
        state.game = state.game || {};
        state.game.jobId = job[1];
    }

    // player name
    const player = text.match(/player\s*[:\-]\s*([\w\d_]+)\s*\(?(\d+)?\)?/i);
    if (player) {
        state.game = state.game || {};
        state.game.player = player[1];
        if (player[2]) state.game.userId = player[2];
    }
}

// ─── 2) parser estruturado ──────────────────────────────────
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

        // linha tipo RS/Nome (RemoteEvent) ou CHAR/player/Nome
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
    const entry = state[section].get(name);
    entry.parents.add(info.parent);
}

// ─── 3) parser de source Lua ────────────────────────────────
function parse_lua_source(text) {
    // :WaitForChild("X") / :FindFirstChild("X")
    const child_patterns = [
        /:WaitForChild\s*\(\s*["']([^"']+)["']/g,
        /:FindFirstChild\s*\(\s*["']([^"']+)["']/g,
    ];
    for (const re of child_patterns) {
        let m;
        while ((m = re.exec(text)) !== null) {
            const name = m[1];
            add_to_map("remotes", name, { parent: "script", kind: "" });
        }
    }

    // Instance.new("RemoteEvent") / etc
    const inst = /Instance\.new\s*\(\s*["']([^"']+)["']/g;
    let im;
    while ((im = inst.exec(text)) !== null) {
        const cls = im[1];
        if (cls === "RemoteEvent")     add_to_map("remotes",   "_Instance.new(RemoteEvent)",   { parent: "script", kind: cls });
        if (cls === "RemoteFunction")  add_to_map("functions", "_Instance.new(RemoteFunction)", { parent: "script", kind: cls });
        if (cls === "BindableEvent")   add_to_map("bindables", "_Instance.new(BindableEvent)",  { parent: "script", kind: cls });
    }

    // :FireServer(...) / :FireClient(...) / :FireAllClients(...)
    const fire_patterns = [
        { re: /([\w.\[\]"_'()]+)\s*:\s*FireServer\s*\(([^)]*)\)/g, kind: "FireServer" },
        { re: /([\w.\[\]"_'()]+)\s*:\s*FireClient\s*\(([^)]*)\)/g, kind: "FireClient" },
        { re: /([\w.\[\]"_'()]+)\s*:\s*FireAllClients\s*\(([^)]*)\)/g, kind: "FireAllClients" },
        { re: /([\w.\[\]"_'()]+)\s*:\s*InvokeServer\s*\(([^)]*)\)/g, kind: "InvokeServer" },
    ];

    for (const { re, kind } of fire_patterns) {
        let m;
        while ((m = re.exec(text)) !== null) {
            const remote_expr = m[1].trim();
            const args = m[2].trim();
            const remote_name = extract_name(remote_expr);
            if (!remote_name) continue;

            if (!state.firecalls.has(remote_name)) {
                state.firecalls.set(remote_name, { kinds: new Set(), args: new Set() });
            }
            const e = state.firecalls.get(remote_name);
            e.kinds.add(kind);
            if (args) e.args.add(args);
        }
    }

    // :Connect(function(...)) — captura assinatura de args
    const connect = /([\w.\[\]"_'()]+)\s*\.\s*(OnClientEvent|OnServerEvent)\s*:\s*Connect\s*\(\s*function\s*\(([^)]*)\)/g;
    let cm;
    while ((cm = connect.exec(text)) !== null) {
        const expr = cm[1];
        const evt = cm[2];
        const args = cm[3].trim();
        const name = extract_name(expr);
        if (!name) continue;

        if (!state.remotes.has(name)) {
            state.remotes.set(name, { parents: new Set(), kind: "", args: new Set() });
        }
        const e = state.remotes.get(name);
        e.parents.add(evt);
        e.kind = evt;
        e.args = e.args || new Set();
        if (args) e.args.add(args);
    }
}

function extract_name(expr) {
    if (!expr) return null;
    const quoted = expr.match(/["']([^"']+)["']/);
    if (quoted) return quoted[1];
    // pega último identificador válido
    const parts = expr.split(/[.:\[\]()\s]/).filter(Boolean);
    const last = parts[parts.length - 1];
    if (!last) return null;
    // filtra nomes óbvios de função
    if (/^(FireServer|FireClient|FireAllClients|InvokeServer|Connect|WaitForChild|FindFirstChild)$/i.test(last)) {
        return parts[parts.length - 2] || null;
    }
    return last;
}

// ─── 4) contador de menções ─────────────────────────────────
function count_mentions(text) {
    const tokens = text.match(/\b[A-Z][A-Za-z0-9_]{2,}\b/g) || [];

    for (const tok of tokens) {
        const lower = tok.toLowerCase();
        if (STOPWORDS.has(lower)) continue;
        if (tok.length < 3 || tok.length > 40) continue;

        if (!state.mentions.has(tok)) {
            state.mentions.set(tok, { count: 0, samples: [] });
        }
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

// ─── 5) detecção de executor ────────────────────────────────
const EXECUTOR_FNS = [
    "hookfunction","newcclosure","getconnections","getconstants",
    "getrawmetatable","setreadonly","identifyexecutor","getgenv",
    "is_sirhurt_closure","checkcaller","syn.request","http_request",
    "getreg","getgc","getloadedmodules","getnilinstances","setclipboard",
    "firetouchinterest","fireclickdetector","getnamecallmethod",
];

function detect_executor(text) {
    for (const fn of EXECUTOR_FNS) {
        const esc_fn = fn.replace(".", "\\.");
        const patterns = [
            new RegExp(`\\b${esc_fn}\\s*[:=]\\s*function`, "i"),
            new RegExp(`\\b${esc_fn}\\s*[:=]\\s*["']?available`, "i"),
            new RegExp(`\\b${esc_fn}\\b\\s*\\(`, "i"),
        ];
        for (const re of pats_iter(patterns)) {
            if (re.test(text)) {
                state.executor[fn] = "presente";
                break;
            }
        }
    }
}

function* pats_iter(arr) { for (const x of arr) yield x; }

// ─── SUGESTÕES ──────────────────────────────────────────────
function build_suggestions() {
    const out = [];

    // 1. Resumo geral
    const totalRemotes = state.remotes.size + state.functions.size;
    out.push({
        title: "📊 Visão geral",
        body: [
            `<strong>${totalRemotes}</strong> remotes/functions detectados`,
            `<strong>${state.firecalls.size}</strong> remotes chamados via FireServer/FireClient`,
            `<strong>${state.executor ? Object.keys(state.executor).length : 0}</strong> funções de executor disponíveis`,
            `<strong>${state.modules.size}</strong> modules e <strong>${state.localscripts.size}</strong> local scripts`,
        ].join("<br>"),
    });

    // 2. Top remotes por frequência
    const fireSorted = Array.from(state.firecalls.entries())
        .sort((a, b) => b[1].kinds.size - a[1].kinds.size)
        .slice(0, 5);

    if (fireSorted.length > 0) {
        out.push({
            title: "🎯 Remotes mais usados (candidatos a hook)",
            body: fireSorted.map(([name, info]) => {
                const kinds = Array.from(info.kinds).join(", ");
                const args = info.args.size > 0 ? " — args: <code>" + esc(Array.from(info.args)[0]) + "</code>" : "";
                return `<code>${esc(name)}</code> — ${kinds}${args}`;
            }).join("<br>"),
        });
    }

    // 3. Padrão de detecção por nome
    const suspicious = Array.from(state.remotes.keys()).filter(k => /detect|ban|kick|report|alert|warn|punish/i.test(k));
    if (suspicious.length > 0) {
        out.push({
            title: "⚠️ Possíveis sistemas de detecção",
            body: suspicious.map(n => `<code>${esc(n)}</code>`).join("<br>") +
                "<br><br>Esses nomes sugerem anti-cheat, report ou kick. Hookar antes de qualquer outra coisa.",
        });
    }

    // 4. Candidatos a auto-attack (nomes com combat/attack/hit/damage)
    const combat = Array.from(state.firecalls.keys()).filter(k =>
        /attack|hit|damage|combat|swing|shoot|punch|slash|melee/i.test(k)
    );
    if (combat.length > 0) {
        out.push({
            title: "⚔ Auto-Attack candidatos",
            body: combat.map(n => `<code>${esc(n)}</code>`).join("<br>") +
                "<br><br>Captura os args reais com sniffer antes de forjar FireServer.",
        });
    }

    // 5. Candidatos a anti-captura / anti-state
    const status = Array.from(state.firecalls.keys()).filter(k =>
        /status|state|captur|prison|jail|stun|freeze|block/i.test(k)
    );
    if (status.length > 0) {
        out.push({
            title: "🔒 Anti-captura / Anti-state candidatos",
            body: status.map(n => `<code>${esc(n)}</code>`).join("<br>"),
        });
    }

    // 6. Candidatos a movement/teleport
    const mov = Array.from(state.firecalls.keys()).filter(k =>
        /move|speed|jump|teleport|dash|walk|sprint|fly/i.test(k)
    );
    if (mov.length > 0) {
        out.push({
            title: "🏃 Movement candidatos",
            body: mov.map(n => `<code>${esc(n)}</code>`).join("<br>"),
        });
    }

    // 7. Executor
    const execKeys = Object.keys(state.executor);
    if (execKeys.length > 0) {
        const has_hook = execKeys.includes("hookfunction");
        const has_conn = execKeys.includes("getconnections");
        out.push({
            title: "🛠 Executor detectado no dump",
            body: [
                execKeys.map(k => `<span class="tag ok">${esc(k)}</span>`).join(" "),
                has_hook ? "✅ <strong>hookfunction</strong> presente — dá pra interceptar FireServer e OnClientEvent." : "⚠️ <strong>hookfunction</strong> ausente — script só escuta, não bloqueia.",
                has_conn ? "✅ <strong>getconnections</strong> presente — dá pra desabilitar conexões específicas." : "⚠️ <strong>getconnections</strong> ausente — anti-detecção só visual.",
            ].join("<br>"),
        });
    }

    // 8. Nada detectado
    if (out.length <= 1) {
        out.push({
            title: "ℹ️ Dump analisado",
            body: "Nenhum padrão específico reconhecido. O dump contém dados estruturais (remotes, scripts) mas sem nomes que sugiram combate, state ou detecção. Foca nos remotes com maior frequência de FireServer na aba de FireServer calls.",
        });
    }

    return out;
}

// ─── RENDER ─────────────────────────────────────────────────
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

    let name_html = g.name ? esc(g.name) : "Jogo não identificado";
    let meta = "";
    if (g.placeId)  meta += `<span>Place ID: <strong>${esc(g.placeId)}</strong></span>`;
    if (g.jobId)    meta += `<span>JobId: <strong>${esc(g.jobId.slice(0, 16))}...</strong></span>`;
    if (g.player)   meta += `<span>Player: <strong>${esc(g.player)}</strong></span>`;
    if (g.userId)   meta += `<span>UserId: <strong>${esc(g.userId)}</strong></span>`;

    card.innerHTML = `
        <h2>${name_html}</h2>
        <div class="game-meta">${meta || "<span style='color:var(--text3)'>sem metadados</span>"}</div>
    `;
    parent.appendChild(card);
}

function render_map(parent, map, title, showArgs = false) {
    if (!map || map.size === 0) return;
    const sec = make_section(title, map.size);
    const sorted = Array.from(map.entries()).sort((a, b) => {
        // ordena por frequência decrescente se tiver, senão alfabética
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
        sec.body.innerHTML += `
            <div class="entry">
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
        sec.body.innerHTML += `
            <div class="entry">
                <span class="name">${esc(name)}</span>
                <div class="meta">
                    <span class="tag remote">${esc(kinds)}</span>
                </div>
                ${argsList}
            </div>`;
    }
    parent.appendChild(sec.wrap);
}

function render_mentions(parent) {
    // filtra tokens que aparecem 3+ vezes e são relevantes
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
            <div class="entry">
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
            <div class="entry">
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
            <p class="hint">O dump parece vazio ou em formato não suportado. Verifica se tem pelo menos linhas tipo <strong>RS/Nome</strong> ou código Lua real.</p>
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
}

// ─── MAIN ───────────────────────────────────────────────────
function run_parse() {
    const text = $("#dump-input").value;
    if (!text.trim()) {
        set_status("Cola o dump primeiro", "err");
        return;
    }

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
        } catch (e) {
            console.warn("erro lendo", f.name, e);
        }
    }
    $("#dump-input").value = combined;
    update_stats();
    set_status(`${files.length} arquivo(s) carregado(s)`, "ok");
}

// ─── BIND ───────────────────────────────────────────────────
$("#parse-btn").addEventListener("click", run_parse);
$("#clear-btn").addEventListener("click", () => {
    $("#dump-input").value = "";
    update_stats();
    set_status("Limpo", "ok");
    reset_state();
    $("#report").innerHTML = `<div class="empty">
        <p>Nenhum dump analisado ainda.</p>
        <p class="hint">Cola o dump no campo acima ou carrega um arquivo <strong>.txt</strong> / <strong>.lua</strong>.</p>
    </div>`;
});

$("#dump-input").addEventListener("input", update_stats);

$("#file-input").addEventListener("change", (e) => {
    const files = Array.from(e.target.files);
    if (files.length > 0) load_files(files);
    e.target.value = "";
});

$("#dump-input").addEventListener("dragover", (e) => {
    e.preventDefault();
    e.currentTarget.style.borderColor = "var(--accent)";
});
$("#dump-input").addEventListener("dragleave", (e) => {
    e.currentTarget.style.borderColor = "var(--border)";
});
$("#dump-input").addEventListener("drop", (e) => {
    e.preventDefault();
    e.currentTarget.style.borderColor = "var(--border)";
    const files = Array.from(e.dataTransfer.files);
    if (files.length > 0) load_files(files);
});

document.querySelectorAll("#summary-list li").forEach(li => {
    li.addEventListener("click", () => {
        const target = li.dataset.target;
        const sec = document.getElementById("sec-" + target);
        if (sec) sec.scrollIntoView({ behavior: "smooth", block: "start" });
    });
});
