// ═══════════════════════════════════════════════════════════
// LC10 • FTF — Análise de Dump
// author: x.lusca1
// ═══════════════════════════════════════════════════════════

const API = "https://api.github.com";
const RAW = "https://raw.githubusercontent.com";

let state = {
    repo:    "",
    path:    "dumps",
    branch:  "main",
    files:   [],
    parsed:  {
        remotes:    new Map(),   // name -> { parents:Set, kind }
        functions:  new Map(),
        modules:    new Map(),
        bindables:  new Map(),
        constants:  new Map(),
        localscripts: new Map(),
        executor:   {},          // função -> bool
        raw:        "",          // texto cru concatenado
    },
};

// ─── UI HELPERS ──────────────────────────────────────────────
const $ = (s) => document.querySelector(s);

function set_status(text, kind) {
    const el = $("#status-text");
    el.textContent = text;
    el.style.color = kind === "ok" ? "var(--success)"
                  : kind === "err" ? "var(--danger)"
                  : kind === "warn" ? "var(--warn)"
                  : "var(--text2)";
}

function esc(str) {
    return String(str)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;");
}

// ─── GITHUB API ──────────────────────────────────────────────
async function list_files(repo, path) {
    // tenta main, depois master
    const branches = ["main", "master"];
    for (const b of branches) {
        const url = `${API}/repos/${repo}/contents/${path}?ref=${b}`;
        const res = await fetch(url, {
            headers: { "Accept": "application/vnd.github.v3+json" }
        });
        if (res.ok) {
            state.branch = b;
            const data = await res.json();
            return data.filter(f => f.type === "file");
        }
    }
    throw new Error("Não consegui listar arquivos. Verifica repo/pasta.");
}

async function fetch_file(download_url) {
    const res = await fetch(download_url);
    if (!res.ok) throw new Error("Falha ao baixar: " + download_url);
    return await res.text();
}

// ─── PARSER ──────────────────────────────────────────────────
// Detecta linhas tipo:
//   RS/NomeDoRemote (RemoteEvent)
//   WS/NomeDoRemote
//   CHAR/Player/Nome
//   ═══ REMOTE EVENTS (13) ═══
//   Nome = valor
//   [1] "arg" ...
function parse_text(text, filename) {
    const lines = text.split(/\r?\n/);
    let current_section = null;

    for (let i = 0; i < lines.length; i++) {
        let line = lines[i].trim();
        if (!line) continue;

        // headers de seção
        const section_match = line.match(/^[═=─-]*\s*(.+?)\s*[═=─-]*$/);
        if (/REMOTE EVENTS/i.test(line))     { current_section = "remotes";    continue; }
        if (/REMOTE FUNCTIONS/i.test(line))  { current_section = "functions";  continue; }
        if (/BINDABLE EVENTS/i.test(line))   { current_section = "bindables";  continue; }
        if (/LOCAL SCRIPTS/i.test(line))     { current_section = "localscripts"; continue; }
        if (/MODULE SCRIPTS/i.test(line))    { current_section = "modules";    continue; }
        if (/CONSTANTS/i.test(line))         { current_section = "constants";  continue; }
        if (/EXECUTOR/i.test(line))          { current_section = "executor";   continue; }

        // linha de path tipo RS/Nome ou CHAR/player/Nome
        const path_match = line.match(/^([A-Z]{2,4})\/(.+?)(?:\s+\((.+?)\))?$/);
        if (path_match && current_section) {
            const [, prefix, name, kind] = path_match;
            const key = name;
            if (!state.parsed[current_section]) state.parsed[current_section] = new Map();
            if (!state.parsed[current_section].has(key)) {
                state.parsed[current_section].set(key, { parents: new Set(), kind: kind || "" });
            }
            state.parsed[current_section].get(key).parents.add(prefix);
            continue;
        }

        // executor detection — linha tipo "hookfunction: function"
        const exec_match = line.match(/^([a-zA-Z_][\w]*)\s*[:=]\s*(.+)$/);
        if (exec_match && current_section === "executor") {
            const [, fn, val] = exec_match;
            state.parsed.executor[fn] = val.trim();
            continue;
        }

        // constantes tipo "Nome = valor"
        if (current_section === "constants") {
            const c_match = line.match(/^([\w_]+)\s*=\s*(.+)$/);
            if (c_match) {
                state.parsed.constants.set(c_match[1], c_match[2]);
            }
        }

        // detecção passiva de executor (caso o dump tenha prints como "hookfunction: function")
        const passive = line.match(/\b(hookfunction|newcclosure|getconnections|getconstants|getrawmetatable|setreadonly|identifyexecutor|request|syn\.request)\b\s*[:=]\s*(\S+)/);
        if (passive) {
            state.parsed.executor[passive[1]] = passive[2];
        }
    }

    // também guarda o texto cru
    state.parsed.raw += `\n\n───── ${filename} ─────\n` + text;
}

// ─── SUGESTÕES ───────────────────────────────────────────────
function build_suggestions(p) {
    const out = [];
    const remotes_lower = new Set(Array.from(p.remotes.keys()).map(k => k.toLowerCase()));

    // AUTO-PARRY / AUTO-ATTACK (marreta)
    const hammer = Array.from(p.remotes.keys()).find(k => /hammer/i.test(k));
    if (hammer) {
        out.push({
            title: "⚔ Auto-Attack (marreta)",
            body: [
                `Remote detectado: <code>${esc(hammer)}</code>`,
                `Presente em: ${Array.from(p.remotes.get(hammer)?.parents || []).join(", ")}`,
                "Esse remote só dispara no <strong>client do atacante</strong>. Pra auto-atacar:",
                "<code>HammerEvent:FireServer(target, ...)</code> — precisa confirmar os args no dump mais novo.",
                "Cooldown recomendado: 0.5s por alvo. Detecta player mais próximo num raio de 8 studs.",
            ].join("<br>"),
        });
    }

    // AUTO-HACK / CAPTURA
    const status = Array.from(p.remotes.keys()).find(k => /status/i.test(k));
    if (status) {
        out.push({
            title: "🔒 Anti-Captura / Auto-Hack",
            body: [
                `Remote detectado: <code>${esc(status)}</code>`,
                "Uso: <code>StatusEvent.OnClientEvent:Connect(...)</code> com payload <code>{Content={player=\"Estado\"}, Type=\"Edit\"}</code>.",
                "Estados vistos: <code>Idle</code>, <code>Hacking</code>, <code>Captured</code>, <code>Seen</code>, <code>Detected</code>.",
                "<strong>Anti-captura:</strong> interceptar OnClientEvent, remover <code>Content[meu_nome]</code> quando for <code>\"Captured\"</code>.",
                "<strong>Auto-hack:</strong> disparar <code>FireServer({Content={meu_nome=\"Hacking\"}, Type=\"Edit\"})</code> perto de computadores.",
            ].join("<br>"),
        });
    }

    // ANTI-DETECÇÃO
    const detected = Array.from(p.remotes.keys()).find(k => /detect/i.test(k));
    if (detected) {
        out.push({
            title: "👁 Anti-Detecção",
            body: [
                `Remote detectado: <code>${esc(detected)}</code>`,
                "Payload: <code>(true, \"Seen\")</code> ou <code>(true, \"Detected\")</code> = te viram. <code>(false)</code> = limpo.",
                "<strong>Bloqueio:</strong> com <code>getconnections(DetectedEvent.OnClientEvent)</code>, iterar e desabilitar as conexões do script do jogo.",
                "Sem <code>getconnections</code>, só dá pra <strong>visualmente</strong> suprimir — o server já decidiu que te viu.",
            ].join("<br>"),
        });
    }

    // HITBOX
    out.push({
        title: "📦 Hitbox Expander",
        body: [
            "FtF não tem hitbox de combate explícito — o que dá pra expandir é o <strong>hitbox do próprio character</strong> pra interação (alcançar botões, NPCs, computadores).",
            "Método: iterar <code>Character:GetChildren()</code>, filtrar <code>BasePart</code> e ajustar <code>Size</code> + <code>Transparency = 0.7</code> + <code>CanCollide = false</code>.",
            "Atenção: <code>CanCollide=false</code> te faz cair do mapa se mexer nos pés.",
        ].join("<br>"),
    });

    // EXECUTOR
    if (Object.keys(p.executor).length > 0) {
        const has_hook = p.executor.hookfunction && p.executor.hookfunction !== "nil";
        const has_conn = p.executor.getconnections && p.executor.getconnections !== "nil";
        out.push({
            title: "🛠 Executor",
            body: [
                `<code>hookfunction</code>: <span class="tag ${has_hook ? "ok" : "no"}">${has_hook ? "DISPONÍVEL" : "AUSENTE"}</span>`,
                `<code>getconnections</code>: <span class="tag ${has_conn ? "ok" : "no"}">${has_conn ? "DISPONÍVEL" : "AUSENTE"}</span>`,
                has_hook
                    ? "Pode hookar FireServer/OnClientEvent e interceptar chamadas."
                    : "Sem hookfunction, o script só escuta — não bloqueia.",
                has_conn
                    ? "Pode desabilitar conexões específicas (anti-detecção real)."
                    : "Sem getconnections, anti-detecção é só visual.",
            ].join("<br>"),
        });
    }

    return out;
}

// ─── RENDER ──────────────────────────────────────────────────
function render_report() {
    const p = state.parsed;
    const rep = $("#report");
    rep.innerHTML = "";

    const total = (p.remotes.size + p.functions.size + p.modules.size + p.bindables.size);

    if (total === 0) {
        rep.innerHTML = `<div class="empty"><p>Nenhum dado parseado.</p>
            <p class="hint">Verifica se os arquivos .txt seguem o formato do dump.</p></div>`;
        return;
    }

    // ── Remotes
    render_map(rep, "remotes", "Remote Events");
    render_map(rep, "functions", "Remote Functions");
    render_map(rep, "bindables", "Bindable Events");
    render_map(rep, "modules", "Module Scripts");
    render_map(rep, "localscripts", "Local Scripts");
    render_map(rep, "constants", "Constantes");

    // ── Executor
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

    // ── Sugestões
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

function make_section(id, count) {
    const wrap = document.createElement("div");
    wrap.className = "section";
    wrap.id = "sec-" + id;
    wrap.innerHTML = `
        <div class="section-title">
            <span>${esc(id)}</span>
            <span class="count">${count}</span>
        </div>
        <div class="body"></div>`;
    return { wrap, body: wrap.querySelector(".body") };
}

function render_map(parent, key, title) {
    const map = state.parsed[key];
    if (!map || map.size === 0) return;

    const sec = make_section(title, map.size);

    // ordena alfabeticamente
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

function render_file_list(files) {
    const ul = $("#file-list");
    ul.innerHTML = "";
    if (files.length === 0) {
        ul.innerHTML = `<li style="color:var(--text3)">nenhum .txt</li>`;
        return;
    }
    for (const f of files) {
        const li = document.createElement("li");
        li.textContent = f.name;
        li.title = f.path;
        ul.appendChild(li);
    }
}

// ─── MAIN ────────────────────────────────────────────────────
async function scan() {
    const repo = $("#repo-input").value.trim();
    const path = $("#path-input").value.trim() || "dumps";

    if (!repo || !repo.includes("/")) {
        set_status("Preenche o repo no formato usuario/repo", "err");
        return;
    }

    state.repo = repo;
    state.path = path;
    state.parsed = {
        remotes: new Map(),
        functions: new Map(),
        modules: new Map(),
        bindables: new Map(),
        constants: new Map(),
        localscripts: new Map(),
        executor: {},
        raw: "",
    };

    set_status("Listando arquivos...", "warn");
    try {
        const files = await list_files(repo, path);
        const txts = files.filter(f => f.name.endsWith(".txt") || f.name.endsWith(".lua"));
        state.files = txts;
        render_file_list(txts);

        if (txts.length === 0) {
            set_status("Nenhum .txt/.lua encontrado na pasta " + path, "err");
            return;
        }

        set_status(`Baixando ${txts.length} arquivo(s)...`, "warn");

        for (let i = 0; i < txts.length; i++) {
            const f = txts[i];
            set_status(`[${i+1}/${txts.length}] ${f.name}`, "warn");
            try {
                const text = await fetch_file(f.download_url);
                parse_text(text, f.name);
            } catch (e) {
                console.warn("erro ao baixar", f.name, e);
            }
        }

        set_status(`Parseado. Gerando relatório...`, "ok");
        render_report();
        set_status(`Pronto — ${txts.length} arquivo(s) processado(s)`, "ok");

    } catch (e) {
        console.error(e);
        set_status("Erro: " + e.message, "err");
    }
}

// ─── BIND ────────────────────────────────────────────────────
$("#scan-btn").addEventListener("click", scan);
$("#repo-input").addEventListener("keydown", e => {
    if (e.key === "Enter") scan();
});
$("#path-input").addEventListener("keydown", e => {
    if (e.key === "Enter") scan();
});

// scroll pra seção
document.querySelectorAll("#summary-list li").forEach(li => {
    li.addEventListener("click", () => {
        const target = li.dataset.target;
        const sec = document.getElementById("sec-" + target);
        if (sec) sec.scrollIntoView({ behavior: "smooth", block: "start" });
    });
});

// autofill do repo se tiver ?repo=user/repo na URL
const params = new URLSearchParams(location.search);
if (params.get("repo")) $("#repo-input").value = params.get("repo");
if (params.get("path")) $("#path-input").value = params.get("path");
