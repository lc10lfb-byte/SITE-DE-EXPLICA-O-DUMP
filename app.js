// ═══════════════════════════════════════════════════════════
// LC10 • FTF — Análise de Dump (v3 — source Lua)
// author: x.lusca1
// ═══════════════════════════════════════════════════════════

const $ = (s) => document.querySelector(s);

const state = {
    parsed: {
        remotes:      new Map(),
        functions:    new Map(),
        modules:      new Map(),
        bindables:    new Map(),
        constants:    new Map(),
        localscripts: new Map(),
        executor:     {},
        keywords:     new Map(),   // keyword -> [linhas]
    },
};

// palavras-chave específicas do FtF
const KEYWORDS = [
    "HammerEvent", "PowersEvent", "StatusEvent", "DetectedEvent",
    "WarningEvent", "SystemMessageEvent", "GameSoundEvent",
    "ChatRemoteEvent", "AnnouncementEvent", "AnalyticsRemoteEvent",
    "RemoteEvent", "RemoteFunction", "BindableEvent",
    "Captured", "Hacking", "Idle", "Seen", "Detected",
];

// funções de executor pra detectar
const EXECUTOR_FNS = [
    "hookfunction", "newcclosure", "getconnections", "getconstants",
    "getrawmetatable", "setreadonly", "identifyexecutor", "getgenv",
    "is_sirhurt_closure", "checkcaller", "syn.request", "http_request",
    "getreg", "getgc", "getloadedmodules", "getnilinstances",
];

// ─── STATUS ──────────────────────────────────────────────────
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

function reset_parsed() {
    state.parsed = {
        remotes:      new Map(),
        functions:    new Map(),
        modules:      new Map(),
        bindables:    new Map(),
        constants:    new Map(),
        localscripts: new Map(),
        executor:     {},
        keywords:     new Map(),
    };
}

// ─── PARSER LUA SOURCE ───────────────────────────────────────
function parse_text(text) {
    // ─── 1) FORMATO ESTRUTURADO (dump antigo)
    if (/═══|REMOTE EVENTS|REMOTE FUNCTIONS|MODULE SCRIPTS/i.test(text)) {
        parse_structured(text);
    }

    // ─── 2) SOURCE LUA BRUTO — sempre roda
    parse_lua_source(text);
}

function parse_structured(text) {
    const lines = text.split(/\r?\n/);
    let current_section = null;

    for (let i = 0; i < lines.length; i++) {
        const line = lines[i].trim();
        if (!line) continue;

        if (/REMOTE\s+EVENTS/i.test(line))     { current_section = "remotes";      continue; }
        if (/REMOTE\s+FUNCTIONS/i.test(line))  { current_section = "functions";    continue; }
        if (/BINDABLE\s+EVENTS/i.test(line))   { current_section = "bindables";    continue; }
        if (/LOCAL\s+SCRIPTS/i.test(line))     { current_section = "localscripts"; continue; }
        if (/MODULE\s+SCRIPTS/i.test(line))    { current_section = "modules";      continue; }
        if (/CONSTANTS/i.test(line))           { current_section = "constants";    continue; }

        const pm = line.match(/^([A-Z]{2,4})\/(.+?)(?:\s+\((.+?)\))?$/);
        if (pm && current_section && current_section !== "constants") {
            const prefix = pm[1], rest = pm[2], kind = pm[3] || "";
            let name = rest, parent = prefix;
            if (prefix === "CHAR" && rest.includes("/")) {
                const parts = rest.split("/");
                parent = "CHAR/" + parts[0];
                name = parts.slice(1).join("/");
            }
            if (!state.parsed[current_section]) state.parsed[current_section] = new Map();
            if (!state.parsed[current_section].has(name)) {
                state.parsed[current_section].set(name, { parents: new Set(), kind });
            }
            state.parsed[current_section].get(name).parents.add(parent);
        }
    }
}

function parse_lua_source(text) {
    // ─── 2.1) :WaitForChild("X") / :FindFirstChild("X")
    const wait = /:WaitForChild\s*\(\s*["']([^"']+)["']/g;
    let m;
    while ((m = wait.exec(text)) !== null) {
        const name = m[1];
        if (!state.parsed.remotes.has(name)) {
            state.parsed.remotes.set(name, { parents: new Set(["script"]), kind: "WaitForChild" });
        } else {
            state.parsed.remotes.get(name).parents.add("script");
        }
    }

    const find = /:FindFirstChild\s*\(\s*["']([^"']+)["']/g;
    while ((m = find.exec(text)) !== null) {
        const name = m[1];
        if (!state.parsed.remotes.has(name)) {
            state.parsed.remotes.set(name, { parents: new Set(["script"]), kind: "FindFirstChild" });
        } else {
            state.parsed.remotes.get(name).parents.add("script");
        }
    }

    // ─── 2.2) :FireServer(...) e :FireClient(...) — captura args
    const fire_patterns = [
        { regex: /([\w.\[\]"_]+)\s*:\s*FireServer\s*\(([^)]*)\)/g, kind: "FireServer" },
        { regex: /([\w.\[\]"_]+)\s*:\s*FireClient\s*\(([^)]*)\)/g, kind: "FireClient" },
        { regex: /([\w.\[\]"_]+)\s*:\s*FireAllClients\s*\(([^)]*)\)/g, kind: "FireAllClients" },
    ];

    for (const { regex, kind } of fire_patterns) {
        let match;
        while ((match = regex.exec(text)) !== null) {
            const remote_expr = match[1];
            const args = match[2].trim();
            const remote_name = extract_name(remote_expr);
            if (!remote_name) continue;

            if (!state.parsed.functions.has(remote_name)) {
                state.parsed.functions.set(remote_name, {
                    parents: new Set([kind]),
                    kind: "",
                    args: new Set(),
                });
            }
            const entry = state.parsed.functions.get(remote_name);
            entry.parents.add(kind);
            if (args) entry.args.add(args);
        }
    }

    // ─── 2.3) :Connect(function(...)) — assinatura
    const connect = /([\w.\[\]"_]+)\s*\.\s*(OnClientEvent|OnServerEvent)\s*:\s*Connect\s*\(\s*function\s*\(([^)]*)\)/g;
    while ((m = connect.exec(text)) !== null) {
        const expr = m[1];
        const evt = m[2];
        const args = m[3].trim();
        const name = extract_name(expr);
        if (!name) continue;

        if (!state.parsed.remotes.has(name)) {
            state.parsed.remotes.set(name, { parents: new Set(), kind: "" });
        }
        const entry = state.parsed.remotes.get(name);
        entry.parents.add(evt);
        entry.kind = evt;
        entry.args = entry.args || new Set();
        if (args) entry.args.add(args);
    }

    // ─── 2.4) Instance.new("RemoteEvent") etc
    const instnew = /Instance\.new\s*\(\s*["']([^"']+)["']/g;
    while ((m = instnew.exec(text)) !== null) {
        const cls = m[1];
        if (cls === "RemoteEvent") {
            state.parsed.remotes.set("_Instance.new(RemoteEvent)", {
                parents: new Set(["script"]), kind: cls
            });
        }
    }

    // ─── 2.5) Keywords — procura menções
    for (const kw of KEYWORDS) {
        const re = new RegExp(`\\b${kw}\\b`, "g");
        let count = 0;
        const samples = [];
        let match;
        while ((match = re.exec(text)) !== null && count < 5) {
            const idx = match.index;
            const start = Math.max(0, idx - 60);
            const end = Math.min(text.length, idx + 100);
            const snippet = text.slice(start, end).replace(/\s+/g, " ");
            samples.push(snippet);
            count++;
        }
        const total = (text.match(re) || []).length;
        if (total > 0) {
            state.parsed.keywords.set(kw, { total, samples });
        }
    }

    // ─── 2.6) Executor detection
    for (const fn of EXECUTOR_FNS) {
        const re = new RegExp(`\\b${fn.replace(".", "\\.")}\\b\\s*[=:(]`, "g");
        if (re.test(text)) {
            state.parsed.executor[fn] = "usado";
        }
    }
}

function extract_name(expr) {
    // pega último identificador ou string entre aspas
    // Ex: "RS.hammer" -> "hammer"
    //     "RS:WaitForChild('X')" -> "X"
    //     "hammer" -> "hammer"
    if (!expr) return null;
    const quoted = expr.match(/["']([^"']+)["']/);
    if (quoted) return quoted[1];
    const parts = expr.split(/[.:\[\]]/).filter(Boolean);
    return parts[parts.length - 1] || null;
}

// ─── SUGESTÕES ───────────────────────────────────────────────
function build_suggestions(p) {
    const out = [];

    // Helper: procura keyword em qualquer mapa
    const find_kw = (name) => {
        const k = Array.from(p.keywords.keys()).find(x => x.toLowerCase() === name.toLowerCase());
        return k ? p.keywords.get(k) : null;
    };

    // ── marreta
    const hammer = find_kw("HammerEvent");
    if (hammer) {
        out.push({
            title: "⚔ Auto-Attack (marreta)",
            body: [
                `<strong>HammerEvent</strong> aparece <code>${hammer.total}x</code> no source.`,
                "Amostras de uso:",
                hammer.samples.slice(0, 3).map(s => `<code>${esc(s)}</code>`).join("<br>"),
            ].join("<br>"),
        });
    }

    // ── status / captura
    const status = find_kw("StatusEvent");
    const captured = find_kw("Captured");
    if (status || captured) {
        out.push({
            title: "🔒 Anti-Captura",
            body: [
                status ? `<strong>StatusEvent</strong>: <code>${status.total}x</code>` : "",
                captured ? `<strong>Captured</strong>: <code>${captured.total}x</code>` : "",
                status ? status.samples.slice(0, 2).map(s => `<code>${esc(s)}</code>`).join("<br>") : "",
                captured ? captured.samples.slice(0, 2).map(s => `<code>${esc(s)}</code>`).join("<br>") : "",
            ].filter(Boolean).join("<br>"),
        });
    }

    // ── powers
    const powers = find_kw("PowersEvent");
    if (powers) {
        out.push({
            title: "✨ PowersEvent",
            body: [
                `<code>${powers.total}x</code> no source.`,
                powers.samples.slice(0, 3).map(s => `<code>${esc(s)}</code>`).join("<br>"),
            ].join("<br>"),
        });
    }

    // ── detecção
    const detected = find_kw("DetectedEvent");
    if (detected) {
        out.push({
            title: "👁 Anti-Detecção",
            body: [
                `<strong>DetectedEvent</strong>: <code>${detected.total}x</code>`,
                detected.samples.slice(0, 3).map(s => `<code>${esc(s)}</code>`).join("<br>"),
            ].join("<br>"),
        });
    }

    // ── hitbox sempre
    out.push({
        title: "📦 Hitbox Expander",
        body: [
            "FtF não tem hitbox de combate. O que dá pra fazer é <strong>expandir o character</strong> pra interagir com objetos.",
            "Iterar <code>Character:GetChildren()</code>, filtrar <code>BasePart</code>, ajustar <code>Size</code> + <code>Transparency = 0.7</code>.",
        ].join("<br>"),
    });

    // ── executor
    if (Object.keys(p.executor).length > 0) {
        const has_hook = p.executor.hookfunction;
        const has_conn = p.executor.getconnections;
        out.push({
            title: "🛠 Executor",
            body: [
                Object.entries(p.executor).map(([k, v]) =>
                    `<code>${esc(k)}</code>: <span class="tag ok">${esc(v)}</span>`
                ).join("<br>"),
                has_hook ? "✅ hookfunction disponível." : "⚠️ hookfunction ausente.",
                has_conn ? "✅ getconnections disponível." : "⚠️ getconnections ausente.",
            ].join("<br>"),
        });
    }

    return out;
}

// ─── RENDER ──────────────────────────────────────────────────
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

function render_map(parent, key, title, show_args = false) {
    const map = state.parsed[key];
    if (!map || map.size === 0) return;

    const sec = make_section(title, map.size);
    const sorted = Array.from(map.entries()).sort((a, b) => a[0].localeCompare(b[0]));

    for (const [name, info] of sorted) {
        const parents = Array.from(info.parents || []).join(", ");
        let args_html = "";
        if (show_args && info.args && info.args.size > 0) {
            args_html = `<div class="meta" style="color:var(--glow)">args: ${Array.from(info.args).map(a => esc(a)).join(" / ")}</div>`;
        }
        sec.body.innerHTML += `
            <div class="entry">
                <span class="name">${esc(name)}</span>
                <div class="meta">${info.kind ? "(" + esc(info.kind) + ") " : ""}em: ${esc(parents)}</div>
                ${args_html}
            </div>`;
    }
    parent.appendChild(sec.wrap);
}

function render_keywords(parent) {
    const map = state.parsed.keywords;
    if (map.size === 0) return;

    const sec = make_section("Menções a Keywords", map.size);
    const sorted = Array.from(map.entries()).sort((a, b) => b[1].total - a[1].total);

    for (const [kw, info] of sorted) {
        sec.body.innerHTML += `
            <div class="entry">
                <span class="name">${esc(kw)}</span>
                <div class="meta">aparece ${info.total}x</div>
                ${info.samples.slice(0, 2).map(s => `<div class="meta" style="color:var(--text3);margin-top:4px">${esc(s)}</div>`).join("")}
            </div>`;
    }
    parent.appendChild(sec.wrap);
}

function render_report() {
    const p = state.parsed;
    const rep = $("#report");
    rep.innerHTML = "";

    const total = p.remotes.size + p.functions.size + p.keywords.size + Object.keys(p.executor).length;

    if (total === 0) {
        rep.innerHTML = `<div class="empty">
            <p>Nada parseado.</p>
            <p class="hint">O texto não parece ser nem dump estruturado nem source Lua.</p>
        </div>`;
        return;
    }

    render_map(rep, "remotes",   "Remotes (WaitForChild / Connect)", true);
    render_map(rep, "functions", "FireServer / FireClient calls", true);
    render_keywords(rep);

    if (Object.keys(p.executor).length > 0) {
        const sec = make_section("Executor", Object.keys(p.executor).length);
        for (const [k, v] of Object.entries(p.executor)) {
            sec.body.innerHTML += `
                <div class="entry">
                    <span class="name">${esc(k)}</span>
                    <div class="meta"><span class="tag ok">${esc(v)}</span></div>
                </div>`;
        }
        rep.appendChild(sec.wrap);
    }

    const sug = build_suggestions(p);
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

// ─── MAIN ────────────────────────────────────────────────────
function run_parse() {
    const text = $("#dump-input").value;
    if (!text.trim()) {
        set_status("Cola o dump primeiro", "err");
        return;
    }

    set_status("Analisando " + (text.length / 1024).toFixed(0) + " KB...", "warn");

    // processa em background pra não travar a UI
    setTimeout(() => {
        reset_parsed();
        parse_text(text);
        render_report();

        const total = state.parsed.remotes.size
            + state.parsed.functions.size
            + state.parsed.keywords.size
            + Object.keys(state.parsed.executor).length;

        set_status(`Pronto — ${total} entradas encontradas`, "ok");
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
            console.warn("erro lendo arquivo", f.name, e);
        }
    }
    $("#dump-input").value = combined;
    update_stats();
    set_status(`${files.length} arquivo(s) carregado(s)`, "ok");
}

// ─── BIND ────────────────────────────────────────────────────
$("#parse-btn").addEventListener("click", run_parse);
$("#clear-btn").addEventListener("click", () => {
    $("#dump-input").value = "";
    update_stats();
    set_status("Limpo", "ok");
    $("#report").innerHTML = `<div class="empty"><p>Nenhum dump analisado ainda.</p>
        <p class="hint">Cola o dump no campo acima ou carrega um arquivo <strong>.txt</strong>.</p></div>`;
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
