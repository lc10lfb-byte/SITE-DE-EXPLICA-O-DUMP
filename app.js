// ═══════════════════════════════════════════════════════════
// LC10 • FTF — Análise de Dump (v2 — input direto)
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
    },
};

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

// ─── RESET ───────────────────────────────────────────────────
function reset_parsed() {
    state.parsed = {
        remotes:      new Map(),
        functions:    new Map(),
        modules:      new Map(),
        bindables:    new Map(),
        constants:    new Map(),
        localscripts: new Map(),
        executor:     {},
    };
}

// ─── PARSER ──────────────────────────────────────────────────
function parse_text(text) {
    const lines = text.split(/\r?\n/);
    let current_section = null;

    for (let i = 0; i < lines.length; i++) {
        let line = lines[i].trim();
        if (!line) continue;

        // headers
        if (/REMOTE\s+EVENTS/i.test(line))     { current_section = "remotes";      continue; }
        if (/REMOTE\s+FUNCTIONS/i.test(line))  { current_section = "functions";    continue; }
        if (/BINDABLE\s+EVENTS/i.test(line))   { current_section = "bindables";    continue; }
        if (/LOCAL\s+SCRIPTS/i.test(line))     { current_section = "localscripts"; continue; }
        if (/MODULE\s+SCRIPTS/i.test(line))    { current_section = "modules";      continue; }
        if (/CONSTANTS/i.test(line))           { current_section = "constants";    continue; }
        if (/EXECUTOR/i.test(line))            { current_section = "executor";     continue; }

        // path tipo RS/Nome ou CHAR/player/Nome
        const path_match = line.match(/^([A-Z]{2,4})\/(.+?)(?:\s+\((.+?)\))?$/);
        if (path_match && current_section && current_section !== "executor" && current_section !== "constants") {
            const prefix = path_match[1];
            const rest   = path_match[2];
            const kind   = path_match[3] || "";

            let name = rest;
            let parent = prefix;

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
            continue;
        }

        // executor
        const exec_match = line.match(/^([a-zA-Z_][\w]*)\s*[:=]\s*(.+)$/);
        if (exec_match && current_section === "executor") {
            state.parsed.executor[exec_match[1]] = exec_match[2].trim();
            continue;
        }

        // constants
        if (current_section === "constants") {
            const c_match = line.match(/^([\w_]+)\s*=\s*(.+)$/);
            if (c_match) state.parsed.constants.set(c_match[1], c_match[2]);
            continue;
        }

        // executor passivo (em qualquer linha)
        const passive = line.match(/\b(hookfunction|newcclosure|getconnections|getconstants|getrawmetatable|setreadonly|identifyexecutor|getgenv|request|syn\.request|is_sirhurt_closure|checkcaller)\b\s*[:=]\s*(\S+)/);
        if (passive) {
            state.parsed.executor[passive[1]] = passive[2];
        }
    }
}

// ─── SUGESTÕES ───────────────────────────────────────────────
function build_suggestions(p) {
    const out = [];

    const hammer = Array.from(p.remotes.keys()).find(k => /hammer/i.test(k));
    if (hammer) {
        out.push({
            title: "⚔ Auto-Attack (marreta)",
            body: [
                `Remote detectado: <code>${esc(hammer)}</code>`,
                `Presente em: ${Array.from(p.remotes.get(hammer).parents).join(", ")}`,
                "Dispara só no client do atacante. Pra atacar sozinho: <code>" + esc(hammer) + ":FireServer(target, ...)</code>.",
                "Precisa confirmar args reais com sniffer rodando no jogo.",
            ].join("<br>"),
        });
    }

    const status = Array.from(p.remotes.keys()).find(k => /status/i.test(k));
    if (status) {
        out.push({
            title: "🔒 Anti-Captura / Auto-Hack",
            body: [
                `Remote: <code>${esc(status)}</code>`,
                `Payload: <code>{Content = {player = "Estado"}, Type = "Edit"}</code>`,
                `Estados: <code>Idle</code>, <code>Hacking</code>, <code>Captured</code>, <code>Seen</code>, <code>Detected</code>`,
                "<strong>Anti-captura:</strong> interceptar OnClientEvent e remover <code>Content[meu_nome]</code> quando for <code>\"Captured\"</code>.",
                "<strong>Auto-hack:</strong> <code>" + esc(status) + ":FireServer({Content={meu_nome=\"Hacking\"}, Type=\"Edit\"})</code>",
            ].join("<br>"),
        });
    }

    const detected = Array.from(p.remotes.keys()).find(k => /detect/i.test(k));
    if (detected) {
        out.push({
            title: "👁 Anti-Detecção",
            body: [
                `Remote: <code>${esc(detected)}</code>`,
                `Payload: <code>(true, "Seen")</code> ou <code>(true, "Detected")</code> = viram. <code>(false)</code> = limpo.`,
                "Bloqueio real precisa de <code>getconnections</code> pra desabilitar as conexões do script do jogo.",
            ].join("<br>"),
        });
    }

    out.push({
        title: "📦 Hitbox Expander",
        body: [
            "Não há hitbox de combate no FtF — o que dá pra expandir é o <strong>character</strong> pra interagir com objetos.",
            "Iterar <code>Character:GetChildren()</code>, filtrar <code>BasePart</code> e ajustar <code>Size</code> + <code>Transparency = 0.7</code>.",
            "Atenção: <code>CanCollide = false</code> nos pés te faz cair do mapa.",
        ].join("<br>"),
    });

    if (Object.keys(p.executor).length > 0) {
        const has_hook = p.executor.hookfunction && p.executor.hookfunction !== "nil";
        const has_conn = p.executor.getconnections && p.executor.getconnections !== "nil";
        out.push({
            title: "🛠 Executor",
            body: [
                `<code>hookfunction</code>: <span class="tag ${has_hook ? "ok" : "no"}">${has_hook ? "DISPONÍVEL" : "AUSENTE"}</span>`,
                `<code>getconnections</code>: <span class="tag ${has_conn ? "ok" : "no"}">${has_conn ? "DISPONÍVEL" : "AUSENTE"}</span>`,
                has_hook ? "Pode hookar FireServer/OnClientEvent." : "Sem hookfunction, o script só escuta.",
                has_conn ? "Pode desabilitar conexões específicas." : "Sem getconnections, anti-detecção é visual.",
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

function render_map(parent, key, title) {
    const map = state.parsed[key];
    if (!map || map.size === 0) return;

    const sec = make_section(title, map.size);
    const sorted = Array.from(map.entries()).sort((a, b) => a[0].localeCompare(b[0]));

    for (const [name, info] of sorted) {
        const parents = Array.from(info.parents).join(", ");
        sec.body.innerHTML += `
            <div class="entry">
                <span class="name">${esc(name)}</span>
                <div class="meta">${info.kind ? "(" + esc(info.kind) + ") " : ""}em: ${esc(parents)}</div>
            </div>`;
    }
    parent.appendChild(sec.wrap);
}

function render_report() {
    const p = state.parsed;
    const rep = $("#report");
    rep.innerHTML = "";

    const total = p.remotes.size + p.functions.size + p.modules.size + p.bindables.size + p.localscripts.size;

    if (total === 0 && Object.keys(p.executor).length === 0) {
        rep.innerHTML = `<div class="empty">
            <p>Nenhum dado parseado.</p>
            <p class="hint">Verifica se o texto tem linhas tipo <strong>RS/Nome</strong>, <strong>WS/Nome</strong>, ou headers <strong>═══</strong>.</p>
        </div>`;
        return;
    }

    render_map(rep, "remotes",      "Remote Events");
    render_map(rep, "functions",    "Remote Functions");
    render_map(rep, "bindables",    "Bindable Events");
    render_map(rep, "localscripts", "Local Scripts");
    render_map(rep, "modules",      "Module Scripts");
    render_map(rep, "constants",    "Constantes");

    if (Object.keys(p.executor).length > 0) {
        const sec = make_section("Executor", Object.keys(p.executor).length);
        for (const [k, v] of Object.entries(p.executor)) {
            const ok = v !== "nil" && v !== "false";
            sec.body.innerHTML += `
                <div class="entry">
                    <span class="name">${esc(k)}</span>
                    <div class="meta">
                        <span class="tag ${ok ? "ok" : "no"}">${ok ? "disponível" : "ausente"}</span>
                        valor: ${esc(v)}
                    </div>
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

    set_status("Analisando...", "warn");
    reset_parsed();
    parse_text(text);
    render_report();

    const total = state.parsed.remotes.size
        + state.parsed.functions.size
        + state.parsed.modules.size
        + state.parsed.bindables.size
        + state.parsed.localscripts.size
        + state.parsed.constants.size
        + Object.keys(state.parsed.executor).length;

    set_status(`Pronto — ${total} entrada(s) encontrada(s)`, "ok");
}

// ─── STATS DO INPUT ──────────────────────────────────────────
function update_stats() {
    const v = $("#dump-input").value;
    const chars = v.length;
    const lines = v ? v.split(/\r?\n/).length : 0;
    $("#input-stats").textContent = `${chars} caracteres · ${lines} linhas`;
}

// ─── FILE INPUT ──────────────────────────────────────────────
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

// drag&drop no textarea
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

// sumário — scroll pras seções
document.querySelectorAll("#summary-list li").forEach(li => {
    li.addEventListener("click", () => {
        const target = li.dataset.target;
        const sec = document.getElementById("sec-" + target);
        if (sec) sec.scrollIntoView({ behavior: "smooth", block: "start" });
    });
});
