// ═══════════════════════════════════════════════════════════
// LC10 • Dump Studio
// author: x.lusca1
// completo — 174 features + sistema de abas + PC/Mobile
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
    tabStyle: "list",
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

// ═══════════════════════════════════════════════════════════════
// FEATURES DATABASE — 174 features
// ═══════════════════════════════════════════════════════════════
const FEATURES = [
    // COMBAT (28)
    { key: "aimbot",         regex: /\baim\s*bot\b|\baimbot\b|mira\s*auto|aim\s*assist/i,          label: "Aimbot",            cat: "combat" },
    { key: "silentaim",      regex: /silent\s*aim|silent\s*aimbot/i,                               label: "Silent Aim",        cat: "combat" },
    { key: "killaura",       regex: /kill\s*aura|aura\s*kill|\baura\b/i,                            label: "Kill Aura",         cat: "combat" },
    { key: "autoatk",        regex: /auto[\s-]?attack|auto[\s-]?atk|auto[\s-]?hit/i,               label: "Auto-Attack",       cat: "combat" },
    { key: "hitbox",         regex: /hitbox|expand\s*hitbox|alcance|reach/i,                        label: "Hitbox Expander",   cat: "combat" },
    { key: "norecoil",       regex: /no\s*recoil|sem\s*recuo/i,                                     label: "No Recoil",         cat: "combat" },
    { key: "nospread",       regex: /no\s*spread|sem\s*dispers/i,                                   label: "No Spread",         cat: "combat" },
    { key: "triggerbot",     regex: /trigger\s*bot|auto\s*shoot/i,                                  label: "Trigger Bot",       cat: "combat" },
    { key: "rapidfire",      regex: /rapid\s*fire|tiro\s*r[áa]pido/i,                               label: "Rapid Fire",        cat: "combat" },
    { key: "infammo",        regex: /infinite\s*ammo|muni[çc][ãa]o\s*infinita/i,                    label: "Munição Infinita",  cat: "combat" },
    { key: "instakill",      regex: /instant\s*kill|instakill|one\s*hit/i,                          label: "Instant Kill",      cat: "combat" },
    { key: "critalways",     regex: /always\s*crit|crit\s*always/i,                                 label: "Always Critical",   cat: "combat" },
    { key: "backstab",       regex: /backstab|facada/i,                                             label: "Auto Backstab",     cat: "combat" },
    { key: "swordaura",      regex: /sword\s*aura|espada\s*aura/i,                                  label: "Sword Aura",        cat: "combat" },
    { key: "gunmods",        regex: /gun\s*mods|mod\s*de\s*arma/i,                                  label: "Gun Mods",          cat: "combat" },
    { key: "fistspeed",      regex: /fist\s*speed|velocidade\s*do\s*soque/i,                        label: "Fist Speed",        cat: "combat" },
    { key: "autoparry",      regex: /auto\s*parry|parry\s*auto/i,                                   label: "Auto-Parry",        cat: "combat" },
    { key: "autoblock",      regex: /auto\s*block|bloqueio\s*auto/i,                                label: "Auto-Block",        cat: "combat" },
    { key: "autododge",      regex: /auto\s*dodge|esquiva\s*auto/i,                                 label: "Auto-Dodge",        cat: "combat" },
    { key: "flingaura",      regex: /fling\s*aura|arremessa\s*aura/i,                               label: "Fling Aura",        cat: "combat" },
    { key: "touchaura",      regex: /touch\s*aura|toca\s*aura/i,                                    label: "Touch Aura",        cat: "combat" },
    { key: "projectilesilent",regex: /projectile\s*silent|silent\s*shot/i,                          label: "Projectile Silent", cat: "combat" },
    { key: "bowaim",         regex: /bow\s*aim|mira\s*arco/i,                                       label: "Bow Aim",           cat: "combat" },
    { key: "aimtobot",       regex: /aim\s*(no|para)\s*(bot|npc)/i,                                 label: "Aim to Bot",        cat: "combat" },
    { key: "aimtotorso",     regex: /aim\s*(to|no)\s*torso/i,                                       label: "Aim to Torso",      cat: "combat" },
    { key: "magnetfist",     regex: /magnet\s*fist|punho\s*magnetico/i,                             label: "Magnet Fist",       cat: "combat" },
    { key: "comboscript",    regex: /auto\s*combo|combo\s*auto/i,                                   label: "Auto Combo",        cat: "combat" },
    { key: "wallbang",       regex: /wall\s*bang/i,                                                 label: "Wall Bang",         cat: "combat" },

    // VISUAL / ESP (32)
    { key: "esp",            regex: /\besp\b|wallhack|see\s*players/i,                              label: "ESP Principal",     cat: "visual" },
    { key: "boxesp",         regex: /box\s*esp|esp\s*box/i,                                         label: "ESP Box",           cat: "visual" },
    { key: "box2esp",        regex: /box\s*v?2|caixa\s*arredond/i,                                  label: "ESP Box v2",        cat: "visual" },
    { key: "lineesp",        regex: /line\s*esp|esp\s*linha/i,                                      label: "ESP Line",          cat: "visual" },
    { key: "skeletonesp",    regex: /skeleton\s*esp|esp\s*esqueleto|skeleton/i,                     label: "ESP Skeleton",      cat: "visual" },
    { key: "nameesp",        regex: /name\s*esp|esp\s*nome/i,                                       label: "ESP Name",          cat: "visual" },
    { key: "healthesp",      regex: /health\s*bar|barra\s*de\s*vida/i,                              label: "ESP Health Bar",    cat: "visual" },
    { key: "distanceesp",    regex: /distance\s*esp|esp\s*distancia/i,                              label: "ESP Distance",      cat: "visual" },
    { key: "traceresp",      regex: /tracer\s*esp|tracer/i,                                         label: "ESP Tracer",        cat: "visual" },
    { key: "chams",          regex: /chams|character\s*highlight/i,                                 label: "Chams",             cat: "visual" },
    { key: "fullbright",     regex: /full[\s-]?bright|brilho|iluminac/i,                            label: "Fullbright",        cat: "visual" },
    { key: "crosshair",      regex: /crosshair|mira\s*personalizada/i,                              label: "Crosshair Custom",  cat: "visual" },
    { key: "fovcircle",      regex: /fov\s*circle|c[íi]rculo\s*fov/i,                               label: "FOV Circle",        cat: "visual" },
    { key: "playertrails",   regex: /player\s*trails|rastro/i,                                      label: "Player Trails",     cat: "visual" },
    { key: "nametags",       regex: /name\s*tags|nametags|etiqueta/i,                               label: "Name Tags",         cat: "visual" },
    { key: "hitmarker",      regex: /hit\s*marker|marcador\s*de\s*hit/i,                            label: "Hit Marker",        cat: "visual" },
    { key: "damageindicator",regex: /damage\s*indicator|indicador\s*de\s*dano/i,                    label: "Damage Indicator",  cat: "visual" },
    { key: "killfeed",       regex: /kill\s*feed/i,                                                 label: "Kill Feed",         cat: "visual" },
    { key: "topkillfeed",    regex: /top\s*kill\s*feed/i,                                           label: "Top Kill Feed",     cat: "visual" },
    { key: "customsky",      regex: /custom\s*sky|c[ée]u\s*personalizado/i,                         label: "Custom Sky",        cat: "visual" },
    { key: "ragdollchams",   regex: /ragdoll\s*chams/i,                                             label: "Ragdoll Chams",     cat: "visual" },
    { key: "serverinfo",     regex: /server\s*info/i,                                               label: "Server Info",       cat: "visual" },
    { key: "playerinfo",     regex: /player\s*info/i,                                               label: "Player Info",       cat: "visual" },
    { key: "coordinatehud",  regex: /coordenadas|coord\s*hud/i,                                     label: "Coordinates HUD",   cat: "visual" },
    { key: "compass",        regex: /compass|b[úu]ssola/i,                                          label: "Compass",           cat: "visual" },
    { key: "minimap",        regex: /minimap|mini\s*mapa/i,                                         label: "Minimap",           cat: "visual" },
    { key: "waypoints",      regex: /waypoint|marca\s*ponto/i,                                      label: "Waypoints",         cat: "visual" },
    { key: "particlesesp",   regex: /particle\s*esp/i,                                              label: "Particle ESP",      cat: "visual" },
    { key: "arrowesp",       regex: /arrow\s*esp|seta\s*esp/i,                                      label: "Arrow ESP",         cat: "visual" },
    { key: "soundesp",       regex: /sound\s*esp/i,                                                 label: "Sound ESP",         cat: "visual" },
    { key: "footstepesp",    regex: /footstep\s*esp|passo\s*esp/i,                                  label: "Footstep ESP",      cat: "visual" },
    { key: "bloodesp",       regex: /blood\s*esp|sangue\s*esp/i,                                    label: "Blood ESP",         cat: "visual" },

    // MOVEMENT (26)
    { key: "speed",          regex: /\bspeed\b|velocidade|walkspeed/i,                              label: "Speed Hack",        cat: "movement" },
    { key: "jump",           regex: /\bjump\b|\bpulo\b|jump\s*boost/i,                              label: "Jump Boost",        cat: "movement" },
    { key: "infjump",        regex: /infinite\s*jump|pulo\s*infinito/i,                             label: "Infinite Jump",     cat: "movement" },
    { key: "fly",            regex: /\bfly\b|voar|flight/i,                                         label: "Fly",               cat: "movement" },
    { key: "noclip",         regex: /noclip|atravessar/i,                                           label: "Noclip",            cat: "movement" },
    { key: "bhop",           regex: /\bbhop\b|bunny\s*hop/i,                                        label: "Bunny Hop",         cat: "movement" },
    { key: "autosprint",     regex: /auto\s*sprint/i,                                               label: "Auto Sprint",       cat: "movement" },
    { key: "teleport",       regex: /teleport|\btp\b/i,                                             label: "Teleport Player",   cat: "movement" },
    { key: "tptocursor",     regex: /tp\s*(to|no)\s*(mouse|cursor)/i,                               label: "TP to Cursor",      cat: "movement" },
    { key: "walkonwater",    regex: /walk\s*on\s*water|anda\s*na\s*agua/i,                          label: "Walk on Water",     cat: "movement" },
    { key: "wallclimb",      regex: /wall\s*climb|escalar\s*parede/i,                               label: "Wall Climb",        cat: "movement" },
    { key: "antivoid",       regex: /anti\s*void|nao\s*cai/i,                                       label: "Anti-Void",         cat: "movement" },
    { key: "dash",           regex: /\bdash\b|arranque/i,                                           label: "Dash",              cat: "movement" },
    { key: "doublejump",     regex: /double\s*jump|pulo\s*duplo/i,                                  label: "Double Jump",       cat: "movement" },
    { key: "triplejump",     regex: /triple\s*jump|pulo\s*triplo/i,                                 label: "Triple Jump",       cat: "movement" },
    { key: "highjump",       regex: /high\s*jump|pulo\s*alto/i,                                     label: "High Jump",         cat: "movement" },
    { key: "longjump",       regex: /long\s*jump|pulo\s*longo/i,                                    label: "Long Jump",         cat: "movement" },
    { key: "glide",          regex: /glide|planar/i,                                                label: "Glide",             cat: "movement" },
    { key: "swim",           regex: /swim\s*speed|nadar\s*r[áa]pido/i,                              label: "Swim Speed",        cat: "movement" },
    { key: "climb",          regex: /climb\s*speed|escalar\s*r[áa]pido/i,                           label: "Climb Speed",       cat: "movement" },
    { key: "moonwalk",       regex: /moon\s*walk|moonwalk/i,                                        label: "Moonwalk",          cat: "movement" },
    { key: "spinbot",        regex: /spin\s*bot|spinbot/i,                                          label: "Spin Bot",          cat: "movement" },
    { key: "autorun",        regex: /auto\s*run|corre\s*auto/i,                                     label: "Auto Run",          cat: "movement" },
    { key: "crouchspeed",    regex: /crouch\s*speed|agachado/i,                                     label: "Crouch Speed",      cat: "movement" },
    { key: "slide",          regex: /slide|desliza/i,                                               label: "Slide",             cat: "movement" },
    { key: "cartwheel",      regex: /cartwheel|estrela/i,                                           label: "Cartwheel",         cat: "movement" },

    // DEFENSE (22)
    { key: "godmode",        regex: /god\s*mode|godmode|imortal|invulner/i,                         label: "Godmode",           cat: "defense" },
    { key: "antifling",      regex: /anti[\s-]?fling/i,                                             label: "Anti-Fling",        cat: "defense" },
    { key: "antikick",       regex: /anti[\s-]?kick/i,                                              label: "Anti-Kick",         cat: "defense" },
    { key: "antidetect",     regex: /anti[\s-]?detect|anti[\s-]?ban/i,                             label: "Anti-Detect",       cat: "defense" },
    { key: "antistate",      regex: /anti[\s-]?state|anti[\s-]?captur/i,                           label: "Anti-State",        cat: "defense" },
    { key: "antiban",        regex: /anti[\s-]?ban/i,                                               label: "Anti-Ban",          cat: "defense" },
    { key: "antiragdoll",    regex: /anti[\s-]?ragdoll/i,                                           label: "Anti-Ragdoll",      cat: "defense" },
    { key: "invisible",      regex: /invis[íi]vel|invisible|invis\b/i,                              label: "Invisibility",      cat: "defense" },
    { key: "hitboxreduce",   regex: /reduce\s*hitbox|hitbox\s*menor/i,                              label: "Reduce Hitbox",     cat: "defense" },
    { key: "anticheatbypass",regex: /anti[\s-]?cheat\s*bypass/i,                                    label: "Anti-Cheat Bypass", cat: "defense" },
    { key: "godstaff",       regex: /god\s*staff|staff\s*god/i,                                      label: "Staff Immunity",    cat: "defense" },
    { key: "autorespawn",    regex: /auto\s*respawn/i,                                              label: "Auto Respawn",      cat: "defense" },
    { key: "antistomp",      regex: /anti[\s-]?stomp/i,                                             label: "Anti-Stomp",        cat: "defense" },
    { key: "antislow",       regex: /anti[\s-]?slow/i,                                              label: "Anti-Slow",         cat: "defense" },
    { key: "freezeimmune",   regex: /freeze\s*immune/i,                                             label: "Freeze Immune",     cat: "defense" },
    { key: "burnimmune",     regex: /burn\s*immune/i,                                               label: "Burn Immune",       cat: "defense" },
    { key: "fallimmune",     regex: /fall\s*immune/i,                                               label: "Fall Immune",       cat: "defense" },
    { key: "gravityimmune",  regex: /gravity\s*immune/i,                                            label: "Gravity Immune",    cat: "defense" },
    { key: "voidimmune",     regex: /void\s*immune/i,                                               label: "Void Immune",       cat: "defense" },
    { key: "regeneration",   regex: /regen|regenera[çc][ãa]o/i,                                     label: "Regeneration",      cat: "defense" },
    { key: "shield",         regex: /shield\s*hack|escudo/i,                                        label: "Shield Hack",       cat: "defense" },
    { key: "lifesteal",      regex: /life\s*steal/i,                                                label: "Lifesteal",         cat: "defense" },

    // UTILITY (24)
    { key: "stats",          regex: /\bstats\b|fps\b|ping/i,                                        label: "Stats Overlay",     cat: "utility" },
    { key: "rejoin",         regex: /rejoin|reconectar/i,                                           label: "Rejoin",            cat: "utility" },
    { key: "autorejoin",     regex: /auto\s*rejoin/i,                                               label: "Auto Rejoin",       cat: "utility" },
    { key: "serverhop",      regex: /server\s*hop/i,                                                label: "Server Hop",        cat: "utility" },
    { key: "chatspy",        regex: /chat\s*spy|espiar\s*chat/i,                                    label: "Chat Spy",          cat: "utility" },
    { key: "playerlist",     regex: /player\s*list|lista\s*de\s*player/i,                           label: "Player List",       cat: "utility" },
    { key: "fastprox",       regex: /instant\s*proximity/i,                                         label: "Fast Proximity",    cat: "utility" },
    { key: "serverinfo2",    regex: /full\s*server\s*info/i,                                        label: "Full Server Info",  cat: "utility" },
    { key: "autochat",       regex: /auto\s*chat|spam\s*chat/i,                                     label: "Auto Chat",         cat: "utility" },
    { key: "chatlogger",     regex: /chat\s*logger/i,                                               label: "Chat Logger",       cat: "utility" },
    { key: "keybindnotif",   regex: /keybind\s*notif/i,                                             label: "Keybind Notifier",  cat: "utility" },
    { key: "hoverinfo",      regex: /hover\s*info/i,                                                label: "Hover Info",        cat: "utility" },
    { key: "iteminfo",       regex: /item\s*info/i,                                                 label: "Item Info",         cat: "utility" },
    { key: "inspectplayer",  regex: /inspect\s*player/i,                                            label: "Inspect Player",    cat: "utility" },
    { key: "copyid",         regex: /copy\s*id/i,                                                   label: "Copy User ID",      cat: "utility" },
    { key: "copyjobid",      regex: /copy\s*job\s*id/i,                                             label: "Copy Job ID",       cat: "utility" },
    { key: "copyscript",     regex: /copy\s*script/i,                                               label: "Copy Script",       cat: "utility" },
    { key: "waypointmark",   regex: /waypoint\s*mark/i,                                             label: "Waypoint Mark",     cat: "utility" },
    { key: "speedometer",    regex: /speedometer|veloc[íi]metro/i,                                  label: "Speedometer",       cat: "utility" },
    { key: "coordinates",    regex: /coordinates|coordenadas/i,                                     label: "Coordinates",       cat: "utility" },
    { key: "hotkeys",        regex: /hotkey|atalho/i,                                               label: "Hotkeys Panel",     cat: "utility" },
    { key: "autosave",       regex: /auto\s*save/i,                                                 label: "Auto Save Config",  cat: "utility" },
    { key: "logevents",      regex: /log\s*events/i,                                                label: "Log Events",        cat: "utility" },

    // PLAYERS (14)
    { key: "playertp",       regex: /teleport\s*to\s*player/i,                                      label: "TP to Player",      cat: "players" },
    { key: "playergoto",     regex: /goto\s*player/i,                                               label: "Goto Player",       cat: "players" },
    { key: "playerfollow",   regex: /follow\s*player/i,                                             label: "Follow Player",     cat: "players" },
    { key: "playerfreeze",   regex: /freeze\s*player/i,                                             label: "Freeze Player",     cat: "players" },
    { key: "playerkill",     regex: /kill\s*player/i,                                               label: "Kill Player",       cat: "players" },
    { key: "playerfling",    regex: /fling\s*player/i,                                              label: "Fling Player",      cat: "players" },
    { key: "playerspectate", regex: /spectate|assistir\s*player/i,                                  label: "Spectate Player",   cat: "players" },
    { key: "playerbring",    regex: /bring\s*player/i,                                              label: "Bring Player",      cat: "players" },
    { key: "playerkick",     regex: /kick\s*player/i,                                               label: "Kick Player",       cat: "players" },
    { key: "playerignore",   regex: /ignore\s*player/i,                                             label: "Ignore Player",     cat: "players" },
    { key: "playerfocus",    regex: /focus\s*player/i,                                              label: "Focus Player",      cat: "players" },
    { key: "playertrack",    regex: /track\s*player/i,                                              label: "Track Player",      cat: "players" },
    { key: "playercolor",    regex: /color\s*player/i,                                              label: "Color Player",      cat: "players" },
    { key: "playersound",    regex: /sound\s*player/i,                                              label: "Player Sound",      cat: "players" },

    // WORLD (12)
    { key: "nofog",          regex: /no\s*fog|sem\s*neblina/i,                                      label: "No Fog",            cat: "world" },
    { key: "fovchanger",     regex: /fov\s*changer|alterar\s*fov/i,                                 label: "FOV Changer",       cat: "world" },
    { key: "zoom",           regex: /zoom|camera\s*distance/i,                                      label: "Zoom / Camera",     cat: "world" },
    { key: "gravity",        regex: /gravity|gravidade/i,                                           label: "Gravity Control",   cat: "world" },
    { key: "timecontrol",    regex: /time\s*control|controlar\s*tempo/i,                            label: "Time Control",      cat: "world" },
    { key: "weather",        regex: /weather|clima/i,                                               label: "Weather Control",   cat: "world" },
    { key: "antifog",        regex: /anti\s*fog/i,                                                  label: "Anti-Fog",          cat: "world" },
    { key: "antiblood",      regex: /no\s*blood|sem\s*sangue/i,                                     label: "No Blood",          cat: "world" },
    { key: "noparticles",    regex: /no\s*particles/i,                                              label: "No Particles",      cat: "world" },
    { key: "nosound",        regex: /no\s*sound|sem\s*som/i,                                        label: "No Sound",          cat: "world" },
    { key: "noeffects",      regex: /no\s*effects/i,                                                label: "No Effects",        cat: "world" },
    { key: "lagreduce",      regex: /lag\s*reduce|menos\s*lag/i,                                    label: "Reduce Lag",        cat: "world" },

    // FUN / TROLL (16)
    { key: "emoteall",       regex: /emote\s*all/i,                                                 label: "Emote All",         cat: "fun" },
    { key: "dance",          regex: /dance|dan[çc]a/i,                                              label: "Dance",             cat: "fun" },
    { key: "sit",            regex: /\bsit\b|sentar/i,                                              label: "Sit",               cat: "fun" },
    { key: "ragdoll",        regex: /ragdoll\s*self/i,                                              label: "Ragdoll Self",      cat: "fun" },
    { key: "flingall",       regex: /fling\s*all/i,                                                 label: "Fling All",         cat: "fun" },
    { key: "kickall",        regex: /kick\s*all/i,                                                  label: "Kick All",          cat: "fun" },
    { key: "freezeall",      regex: /freeze\s*all/i,                                                label: "Freeze All",        cat: "fun" },
    { key: "bringall",       regex: /bring\s*all/i,                                                 label: "Bring All",         cat: "fun" },
    { key: "sizehack",       regex: /size\s*hack|gigante/i,                                         label: "Size Changer",      cat: "fun" },
    { key: "tinyplayer",     regex: /tiny\s*player/i,                                               label: "Tiny Player",       cat: "fun" },
    { key: "giantplayer",    regex: /giant\s*player/i,                                              label: "Giant Player",      cat: "fun" },
    { key: "rainbow",        regex: /rainbow|arco[\s-]?[íi]ris/i,                                   label: "Rainbow Aura",      cat: "fun" },
    { key: "trailaura",      regex: /trail\s*aura/i,                                                label: "Trail Aura",        cat: "fun" },
    { key: "skydive",        regex: /skydive|paraquedas/i,                                          label: "Skydive",           cat: "fun" },
    { key: "spamchat",       regex: /spam\s*chat/i,                                                 label: "Spam Chat",         cat: "fun" },
    { key: "fakechat",       regex: /fake\s*chat/i,                                                 label: "Fake Chat",         cat: "fun" },
];

// ═══════════════════════════════════════════════════════════════
// HELPERS GERAIS
// ═══════════════════════════════════════════════════════════════
function set_status(text, kind) {
    const el = $("#status-text");
    if (!el) return;
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

function camelCase(str) {
    return String(str).replace(/[^a-zA-Z0-9]+(.)/g, (_, c) => c.toUpperCase())
              .replace(/^[a-z]/, c => c.toUpperCase())
              .replace(/[^a-zA-Z0-9]/g, "");
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

// ═══════════════════════════════════════════════════════════════
// PARSER
// ═══════════════════════════════════════════════════════════════
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

    const inst = /Instance\.new\s*\(\s*["']([^"']+)["']/g;
    let im;
    while ((im = inst.exec(text)) !== null) {
        const cls = im[1];
        if (cls === "RemoteEvent")     pushMap("remotes",   "_Instance.new(RemoteEvent)",   { parent: "script", kind: cls });
        if (cls === "RemoteFunction")  pushMap("functions", "_Instance.new(RemoteFunction)", { parent: "script", kind: cls });
        if (cls === "BindableEvent")   pushMap("bindables", "_Instance.new(BindableEvent)",  { parent: "script", kind: cls });
    }

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

// ═══════════════════════════════════════════════════════════════
// SUGESTÕES
// ═══════════════════════════════════════════════════════════════
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

// ═══════════════════════════════════════════════════════════════
// RENDER
// ═══════════════════════════════════════════════════════════════
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

// ═══════════════════════════════════════════════════════════════
// FILTRO
// ═══════════════════════════════════════════════════════════════
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

// ═══════════════════════════════════════════════════════════════
// GERADOR DE SNIFFER E ESQUELETO
// ═══════════════════════════════════════════════════════════════
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
    if (!state.raw) return "";
    const realRemotes = getRealRemotes();
    const L = [];
    L.push(`--[[`);
    L.push(`    LC10 • Esqueleto gerado`);
    L.push(`    Jogo: ${state.game?.name || "?"}`);
    L.push(`    Remotes reais: ${realRemotes.length}`);
    L.push(`]]`);
    L.push("");
    L.push(`local RS = game:GetService("ReplicatedStorage")`);
    L.push(`local WS = game:GetService("Workspace")`);
    L.push("");
    L.push("-- ═══ REMOTES ═══");
    for (const name of realRemotes.slice(0, 30)) {
        const args = state.firecalls.get(name)?.args;
        const note = args && args.size > 0 ? ` -- args: ${Array.from(args)[0].slice(0, 60)}` : "";
        L.push(`local ${sanitize(name)} = RS:FindFirstChild("${name}") or WS:FindFirstChild("${name}")${note}`);
    }
    L.push("");
    L.push("-- Preenche os args com sniffer antes de usar");
    return L.join("\n");
}

function generate_sniffer() {
    if (!state.raw) return "";
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
    L.push(`local WEBHOOK = ""`);
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

// ═══════════════════════════════════════════════════════════════
// PARSER DE PROMPT
// ═══════════════════════════════════════════════════════════════
function splitPrompt(prompt) {
    if (!prompt || !prompt.trim()) return [];
    let normalized = prompt
        .replace(/\s+e\s+/gi, ",")
        .replace(/\s*\+\s*/g, ",")
        .replace(/[;\n]/g, ",");
    return normalized
        .split(",")
        .map(s => s.trim())
        .filter(s => s.length > 0)
        .filter(s => !/^(painel|gui|interface|ui|menu|panel|tela|abas?|tabs?|com abas?|com tabs?)$/i.test(s))
        .filter((s, i, arr) => arr.indexOf(s) === i);
}

function promptWantsGui(prompt) {
    return /painel|gui|interface|menu|tela|hud/i.test(prompt);
}

function wantsTabsMode(prompt) {
    const p = (prompt || "").toLowerCase();
    return /\b(painel|gui|menu|interface)\b.*\babas?\b/i.test(p)
        || /\btabs?\b/i.test(p)
        || /\babas?\b/i.test(p);
}

function parsePromptFeatures(prompt) {
    const found = [];
    const lower = (prompt || "").toLowerCase();
    for (const f of FEATURES) {
        if (f.regex.test(lower)) found.push(f);
    }
    return found;
}

// ═══════════════════════════════════════════════════════════════
// GERADOR DE MÓDULOS (cada feature vira código Lua)
// ═══════════════════════════════════════════════════════════════

function moduleAimbot(label, ctx, silent) {
    const objName = silent ? "SilentAim" : "Aimbot";
    return {
        name: label, cat: "Combat", toggle: true,
        code: [
            `local ${objName} = {`,
            `    active = false,`,
            `    fov = 150,`,
            `    fovVisible = true,`,
            `    wallCheck = false,`,
            `    teamCheck = true,`,
            `    smoothness = 0.15,`,
            `    range = 500,`,
            `    showTarget = true,`,
            `    whitelist = {},`,
            `    blacklist = {},`,
            `    circle = nil,`,
            `}`,
            `function ${objName}.getTarget()`,
            `    local cam = WS.CurrentCamera`,
            `    if not cam then return nil end`,
            `    local center = cam.ViewportSize / 2`,
            `    local closest, dist = nil, ${objName}.range`,
            `    for _, p in ipairs(Players:GetPlayers()) do`,
            `        if p ~= LP and p.Character then`,
            `            if ${objName}.blacklist[p] then continue end`,
            `            if #${objName}.whitelist > 0 and not ${objName}.whitelist[p] then continue end`,
            `            local head = p.Character:FindFirstChild("Head")`,
            `            if head then`,
            `                local screenPos, onScreen = cam:WorldToViewportPoint(head.Position)`,
            `                if onScreen then`,
            `                    local distFromCenter = (Vector2.new(screenPos.X, screenPos.Y) - center).Magnitude`,
            `                    if distFromCenter < ${objName}.fov and distFromCenter < dist then`,
            `                        closest, dist = head, distFromCenter`,
            `                    end`,
            `                end`,
            `            end`,
            `        end`,
            `    end`,
            `    return closest`,
            `end`,
            `-- fov circle`,
            `function ${objName}.updateCircle()`,
            `    if not ${objName}.circle then`,
            `        ${objName}.circle = Instance.new("Frame", gui)`,
            `        ${objName}.circle.Size = UDim2.new(0, ${objName}.fov, 0, ${objName}.fov)`,
            `        ${objName}.circle.Position = UDim2.new(0.5, -${objName}.fov/2, 0.5, -${objName}.fov/2)`,
            `        ${objName}.circle.BackgroundTransparency = 1`,
            `        ${objName}.circle.BorderSizePixel = 0`,
            `        ${objName}.circle.ZIndex = 5`,
            `        local c = Instance.new("UICorner", ${objName}.circle)`,
            `        c.CornerRadius = UDim.new(1, 0)`,
            `        local s = Instance.new("UIStroke", ${objName}.circle)`,
            `        s.Color = Theme.accent`,
            `        s.Thickness = 1.5`,
            `    end`,
            `    ${objName}.circle.Visible = ${objName}.active and ${objName}.fovVisible`,
            `end`,
            `RunService.RenderStepped:Connect(function()`,
            `    ${objName}.updateCircle()`,
            `    if not ${objName}.active then return end`,
            `    local t = ${objName}.getTarget()`,
            `    if t and WS.CurrentCamera then`,
            `        local cam = WS.CurrentCamera`,
            `        local newCF = CFrame.new(cam.CFrame.Position, t.Position)`,
            `        cam.CFrame = cam.CFrame:Lerp(newCF, 1 - ${objName}.smoothness)`,
            `    end`,
            `end)`,
        ],
    };
}

function moduleESP(ctx) {
    return {
        name: "ESP", cat: "Visual", toggle: true,
        code: [
            `local ESP = {`,
            `    active = false,`,
            `    useBox = true,`,
            `    useBoxV2 = false,`,
            `    useLine = false,`,
            `    useSkeleton = false,`,
            `    useName = true,`,
            `    useHealthBar = true,`,
            `    useDistance = false,`,
            `    useTracer = false,`,
            `    thickness = 1.5,`,
            `    color = Color3.fromRGB(139, 92, 246),`,
            `    folder = nil,`,
            `    cache = {},`,
            `}`,
            `function ESP.clear()`,
            `    if ESP.folder then ESP.folder:Destroy() end`,
            `    ESP.cache = {}`,
            `end`,
            `function ESP.newESP(plr)`,
            `    if plr == LP then return end`,
            `    local bill = Instance.new("BillboardGui", ESP.folder)`,
            `    bill.Name = plr.Name`,
            `    bill.AlwaysOnTop = true`,
            `    bill.Size = UDim2.new(0, 80, 0, 80)`,
            `    bill.StudsOffset = Vector3.new(0, 3.5, 0)`,
            `    local box = Instance.new("Frame", bill)`,
            `    box.Name = "Box"`,
            `    box.BackgroundTransparency = 1`,
            `    box.Size = UDim2.new(1, 0, 1.3, 0)`,
            `    box.Position = UDim2.new(0, 0, -0.15, 0)`,
            `    local stroke = Instance.new("UIStroke", box)`,
            `    stroke.Color = ESP.color`,
            `    stroke.Thickness = ESP.thickness`,
            `    local nameLabel = Instance.new("TextLabel", bill)`,
            `    nameLabel.Name = "Name"`,
            `    nameLabel.BackgroundTransparency = 1`,
            `    nameLabel.Size = UDim2.new(1, 0, 0, 14)`,
            `    nameLabel.Position = UDim2.new(0, 0, -0.2, 0)`,
            `    nameLabel.Text = plr.Name`,
            `    nameLabel.TextColor3 = ESP.color`,
            `    nameLabel.Font = F.heading`,
            `    nameLabel.TextSize = 11`,
            `    nameLabel.TextStrokeTransparency = 0.5`,
            `    local healthBg = Instance.new("Frame", bill)`,
            `    healthBg.Name = "HealthBg"`,
            `    healthBg.BackgroundColor3 = Color3.fromRGB(30, 30, 30)`,
            `    healthBg.BorderSizePixel = 0`,
            `    healthBg.Size = UDim2.new(0, 3, 1.3, 0)`,
            `    healthBg.Position = UDim2.new(1, 3, -0.15, 0)`,
            `    Instance.new("UICorner", healthBg).CornerRadius = UDim.new(0, 2)`,
            `    local healthBar = Instance.new("Frame", healthBg)`,
            `    healthBar.Name = "HealthBar"`,
            `    healthBar.BackgroundColor3 = Color3.fromRGB(16, 185, 129)`,
            `    healthBar.BorderSizePixel = 0`,
            `    healthBar.Size = UDim2.new(1, 0, 1, 0)`,
            `    healthBar.Position = UDim2.new(0, 0, 0, 0)`,
            `    Instance.new("UICorner", healthBar).CornerRadius = UDim.new(0, 2)`,
            `    ESP.cache[plr] = { bill = bill, box = box, stroke = stroke, name = nameLabel, healthBar = healthBar }`,
            `end`,
            `function ESP.update()`,
            `    for plr, data in pairs(ESP.cache) do`,
            `        if not plr.Character or not plr.Character:FindFirstChild("HumanoidRootPart") then`,
            `            if data.bill then data.bill.Adornee = nil end`,
            `            continue`,
            `        end`,
            `        data.bill.Adornee = plr.Character.HumanoidRootPart`,
            `        data.box.Visible = ESP.useBox or ESP.useBoxV2`,
            `        data.name.Visible = ESP.useName`,
            `        data.healthBar.Parent.Visible = ESP.useHealthBar`,
            `        local hum = plr.Character:FindFirstChildOfClass("Humanoid")`,
            `        if hum then`,
            `            data.healthBar.Size = UDim2.new(1, 0, hum.Health / hum.MaxHealth, 0)`,
            `            data.healthBar.Position = UDim2.new(0, 0, 1 - hum.Health / hum.MaxHealth, 0)`,
            `        end`,
            `    end`,
            `end`,
            `function ESP.enable()`,
            `    ESP.clear()`,
            `    ESP.folder = Instance.new("Folder", CoreGui)`,
            `    ESP.folder.Name = "LC10_ESP"`,
            `    for _, plr in ipairs(Players:GetPlayers()) do ESP.newESP(plr) end`,
            `    Players.PlayerAdded:Connect(function(p) if ESP.active then ESP.newESP(p) end end)`,
            `end`,
            `function ESP.disable() ESP.clear() end`,
            `RunService.RenderStepped:Connect(function() if ESP.active then ESP.update() end end)`,
        ],
    };
}

function moduleMovement(ctx, subKeys) {
    return {
        name: "Movement", cat: "Movement", toggle: false,
        subKeys: subKeys,
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
    };
}

function moduleGodmode() {
    return {
        name: "Godmode", cat: "Defense", toggle: true,
        code: [
            `local Godmode = { active = false }`,
            `RunService.Heartbeat:Connect(function()`,
            `    if not Godmode.active then return end`,
            `    local hum = LP.Character and LP.Character:FindFirstChildOfClass("Humanoid")`,
            `    if hum then hum.Health = hum.MaxHealth end`,
            `end)`,
        ],
    };
}

function moduleFullbright() {
    return {
        name: "Fullbright", cat: "Visual", toggle: true,
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
            `    if Fullbright.prev.Ambient then Lighting.Ambient = Fullbright.prev.Ambient end`,
            `    if Fullbright.prev.Brightness then Lighting.Brightness = Fullbright.prev.Brightness end`,
            `    if Fullbright.prev.ClockTime then Lighting.ClockTime = Fullbright.prev.ClockTime end`,
            `end`,
        ],
    };
}

function moduleStats() {
    return {
        name: "Stats", cat: "Utility", toggle: true,
        code: [
            `local Stats = { active = false, gui = nil }`,
            `function Stats.enable()`,
            `    if Stats.gui then Stats.gui:Destroy() end`,
            `    Stats.gui = Instance.new("ScreenGui", CoreGui)`,
            `    local lbl = Instance.new("TextLabel", Stats.gui)`,
            `    lbl.Size = UDim2.new(0, 200, 0, 80)`,
            `    lbl.Position = UDim2.new(0, 10, 0, 10)`,
            `    lbl.BackgroundColor3 = Theme.bg`,
            `    lbl.BackgroundTransparency = 0.3`,
            `    lbl.TextColor3 = Theme.text`,
            `    lbl.Font = F.mono`,
            `    lbl.TextSize = 12`,
            `    lbl.TextXAlignment = Enum.TextXAlignment.Left`,
            `    Instance.new("UICorner", lbl).CornerRadius = UDim.new(0, 8)`,
            `    task.spawn(function()`,
            `        local frames = 0`,
            `        while Stats.gui and Stats.gui.Parent do`,
            `            frames = frames + 1`,
            `            RunService.RenderStepped:Wait()`,
            `            if frames % 30 == 0 then`,
            `                lbl.Text = string.format(" LC10 Stats\\n FPS: ~%d\\n Players: %d", math.floor(1/RunService.RenderStepped:Wait()), #Players:GetPlayers())`,
            `            end`,
            `        end`,
            `    end)`,
            `end`,
            `function Stats.disable()`,
            `    if Stats.gui then Stats.gui:Destroy(); Stats.gui = nil end`,
            `end`,
        ],
    };
}

function moduleTeleport() {
    return {
        name: "Teleport Player", cat: "Movement", toggle: false, hasInput: true,
        code: [
            `local Teleport = { active = true }`,
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
    };
}

function moduleGeneric(name) {
    const cls = camelCase(name) || "Custom";
    return {
        name: name, cat: "custom", toggle: true,
        code: [
            `local ${cls} = { active = false }`,
            `-- ⚠️ módulo genérico: "${name.replace(/"/g, '\\"')}"`,
            `-- Preenche a lógica abaixo`,
            `RunService.Heartbeat:Connect(function()`,
            `    if not ${cls}.active then return end`,
            `    -- TODO: implementar "${name.replace(/"/g, '\\"')}"`,
            `end)`,
        ],
    };
}

function buildModuleForFeature(f, ctx, subKeys) {
    const k = f.key;
    if (k === "aimbot")     return moduleAimbot("Aimbot", ctx, false);
    if (k === "silentaim")  return moduleAimbot("Silent Aim", ctx, true);
    if (k === "esp" || k === "boxesp" || k === "box2esp" || k === "lineesp" ||
        k === "skeletonesp" || k === "nameesp" || k === "healthesp" ||
        k === "distanceesp" || k === "traceresp")  return moduleESP(ctx);
    if (["speed","jump","infjump","fly","noclip"].includes(k)) return moduleMovement(ctx, subKeys);
    if (k === "godmode")    return moduleGodmode();
    if (k === "fullbright") return moduleFullbright();
    if (k === "stats")      return moduleStats();
    if (k === "teleport")   return moduleTeleport();
    return moduleGeneric(f.label);
}

// ═══════════════════════════════════════════════════════════════
// GERADOR PRINCIPAL DO SCRIPT
// ═══════════════════════════════════════════════════════════════
function generate_custom_script(prompt, platform, tabStyle) {
    if (!state.raw) return null;

    const isMobile = platform === "mobile";
    const useTabs = tabStyle === "vertical" || tabStyle === "horizontal";
    const requestedRaw = splitPrompt(prompt);
    const requestedFeatures = parsePromptFeatures(prompt);

    // remove duplicatas por key
    const seenKeys = new Set();
    const uniqueFeatures = [];
    for (const f of requestedFeatures) {
        if (!seenKeys.has(f.key)) {
            seenKeys.add(f.key);
            uniqueFeatures.push(f);
        }
    }

    // checa se pediu movimento agrupado
    const moveSubKeys = uniqueFeatures.filter(f => ["speed","jump","infjump","fly","noclip"].includes(f.key)).map(f => f.key);

    // agrupa features em módulos únicos
    const featureModules = [];
    const seenModuleNames = new Set();
    for (const f of uniqueFeatures) {
        const mod = buildModuleForFeature(f, { isMobile }, moveSubKeys);
        if (mod && !seenModuleNames.has(mod.name)) {
            seenModuleNames.add(mod.name);
            featureModules.push(mod);
        }
    }

    // se pediu features desconhecidas, cria módulos genéricos
    const knownKeysLower = requestedFeatures.map(f => f.label.toLowerCase());
    // (não processa texto avulso pra evitar lixo)

    const realRemotes = getRealRemotes();
    const gameName = state.game?.name || "Jogo";
    const L = [];
    const dateStr = new Date().toLocaleDateString("pt-BR");

    // calcula tamanho do painel
    const featureCount = featureModules.length;
    let WIN_W, WIN_H;
    if (isMobile) {
        WIN_W = useTabs ? 340 : 300;
        WIN_H = Math.min(560, (useTabs ? 380 : 320) + featureCount * 14);
    } else {
        WIN_W = useTabs ? Math.min(1100, 700 + featureCount * 15) : 480;
        WIN_H = Math.min(720, (useTabs ? 500 : 420) + featureCount * 10);
    }

    // HEADER
    L.push(`--[[`);
    L.push(`    ════════════════════════════════════════════════════════════`);
    L.push(`    LC10 • Script Gerado`);
    L.push(`    ════════════════════════════════════════════════════════════`);
    L.push(`    Jogo:        ${gameName}`);
    L.push(`    Plataforma:  ${isMobile ? "MOBILE 📱" : "PC 🖥️"}`);
    L.push(`    Estilo:      ${useTabs ? (tabStyle === "vertical" ? "ABAS VERTICAIS" : "ABAS HORIZONTAIS") : "LISTA"}`);
    L.push(`    Autor:       x.lusca1`);
    L.push(`    Data:        ${dateStr}`);
    L.push(`    Remotes:     ${realRemotes.length}`);
    L.push(`    Módulos:     ${featureCount}`);
    L.push(`    ════════════════════════════════════════════════════════════`);
    L.push(`]]`);
    L.push("");

    // SERVICES
    L.push("local Players = game:GetService(\"Players\")");
    L.push("local RunService = game:GetService(\"RunService\")");
    L.push("local UserInput = game:GetService(\"UserInputService\")");
    L.push("local TweenService = game:GetService(\"TweenService\")");
    L.push("local Lighting = game:GetService(\"Lighting\")");
    L.push("local TeleportService = game:GetService(\"TeleportService\")");
    L.push("local CoreGui = game:GetService(\"CoreGui\")");
    L.push("local RS = game:GetService(\"ReplicatedStorage\")");
    L.push("local WS = game:GetService(\"Workspace\")");
    L.push("local LP = Players.LocalPlayer");
    L.push("");

    L.push("local Config = {");
    L.push(`    brand = "LC10",`);
    L.push(`    version = "1.0.0",`);
    L.push(`    game = "${gameName.replace(/"/g, '\\"')}",`);
    L.push(`    platform = "${platform}",`);
    L.push(`    isMobile = ${isMobile},`);
    L.push(isMobile ? `    keybind = nil,` : `    keybind = Enum.KeyCode.RightShift,`);
    L.push("}");
    L.push("");

    L.push("local Theme = {");
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
    L.push("}");
    L.push("local F = { heading = Enum.Font.GothamBold, body = Enum.Font.Gotham, mono = Enum.Font.Code }");
    L.push("");

    if (realRemotes.length > 0) {
        L.push("-- REMOTES");
        for (const name of realRemotes.slice(0, 20)) {
            L.push(`local ${sanitize(name)} = RS:FindFirstChild("${name}") or WS:FindFirstChild("${name}")`);
        }
        L.push("");
    }

    // UI SYSTEM
    L.push("-- UI SYSTEM");
    L.push(`local gui = Instance.new("ScreenGui")`);
    L.push(`gui.Name = "LC10_" .. Config.brand`);
    L.push(`gui.ResetOnSpawn = false`);
    L.push(`gui.IgnoreGuiInset = true`);
    L.push(`gui.ZIndexBehavior = Enum.ZIndexBehavior.Sibling`);
    L.push(`pcall(function() gui.Parent = CoreGui end)`);
    L.push(`if not gui.Parent then gui.Parent = LP:WaitForChild("PlayerGui") end`);
    L.push("");
    L.push(`local WIN_W = ${WIN_W}`);
    L.push(`local WIN_H = ${WIN_H}`);
    L.push("");
    L.push(`local win = Instance.new("Frame", gui)`);
    L.push(`win.Size = UDim2.new(0, WIN_W, 0, WIN_H)`);
    L.push(`win.Position = UDim2.new(0.5, -WIN_W/2, 0.5, -WIN_H/2)`);
    L.push(`win.BackgroundColor3 = Theme.bg`);
    L.push(`win.BorderSizePixel = 0`);
    L.push(`Instance.new("UICorner", win).CornerRadius = UDim.new(0, 14)`);
    L.push(`local winStroke = Instance.new("UIStroke", win)`);
    L.push(`winStroke.Color = Theme.border`);
    L.push("");
    L.push(`local header = Instance.new("Frame", win)`);
    L.push(`header.Size = UDim2.new(1, 0, 0, ${isMobile ? 44 : 42})`);
    L.push(`header.BackgroundColor3 = Theme.surface`);
    L.push(`header.BorderSizePixel = 0`);
    L.push(`Instance.new("UICorner", header).CornerRadius = UDim.new(0, 14)`);
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
    L.push(`closeBtn.Size = UDim2.new(0, ${isMobile ? 34 : 28}, 0, ${isMobile ? 34 : 28})`);
    L.push(`closeBtn.Position = UDim2.new(1, ${isMobile ? -44 : -38}, 0.5, -${isMobile ? 17 : 14})`);
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

    // LAYOUT: com abas vs lista
    const headerH = isMobile ? 44 : 42;
    const contentTop = headerH + 10;
    const contentH = `WIN_H - ${contentTop + 12}`;

    if (useTabs && tabStyle === "vertical") {
        // sidebar vertical + content à direita
        L.push(`-- ABAS VERTICAIS`);
        L.push(`local sidebar = Instance.new("ScrollingFrame", win)`);
        L.push(`sidebar.Size = UDim2.new(0, 130, 1, -${contentTop + 12})`);
        L.push(`sidebar.Position = UDim2.new(0, 8, 0, ${contentTop})`);
        L.push(`sidebar.BackgroundColor3 = Theme.surface`);
        L.push(`sidebar.BorderSizePixel = 0`);
        L.push(`sidebar.ScrollBarThickness = 2`);
        L.push(`sidebar.ScrollBarImageColor3 = Theme.accent`);
        L.push(`sidebar.CanvasSize = UDim2.new(0, 0, 0, 0)`);
        L.push(`sidebar.AutomaticCanvasSize = Enum.AutomaticSize.Y`);
        L.push(`Instance.new("UICorner", sidebar).CornerRadius = UDim.new(0, 10)`);
        L.push(`local sbl = Instance.new("UIListLayout", sidebar)`);
        L.push(`sbl.Padding = UDim.new(0, 4)`);
        L.push(`sbl.SortOrder = Enum.SortOrder.LayoutOrder`);
        L.push(`local sbp = Instance.new("UIPadding", sidebar)`);
        L.push(`sbp.PaddingTop = UDim.new(0, 8)`);
        L.push("");
        L.push(`local contentHolder = Instance.new("Frame", win)`);
        L.push(`contentHolder.Size = UDim2.new(1, -150, 1, -${contentTop + 12})`);
        L.push(`contentHolder.Position = UDim2.new(0, 142, 0, ${contentTop})`);
        L.push(`contentHolder.BackgroundTransparency = 1`);
        L.push("");
        L.push(`local tabPages = {}`);
        L.push(`local currentTab = nil`);
        L.push(`local function addTab(name)`);
        L.push(`    local btn = Instance.new("TextButton", sidebar)`);
        L.push(`    btn.Size = UDim2.new(1, -16, 0, 30)`);
        L.push(`    btn.BackgroundColor3 = Theme.elevated`);
        L.push(`    btn.BackgroundTransparency = 1`);
        L.push(`    btn.Text = ""`);
        L.push(`    btn.AutoButtonColor = false`);
        L.push(`    btn.BorderSizePixel = 0`);
        L.push(`    Instance.new("UICorner", btn).CornerRadius = UDim.new(0, 6)`);
        L.push(`    local lbl = Instance.new("TextLabel", btn)`);
        L.push(`    lbl.Size = UDim2.new(1, -12, 1, 0)`);
        L.push(`    lbl.Position = UDim2.new(0, 10, 0, 0)`);
        L.push(`    lbl.BackgroundTransparency = 1`);
        L.push(`    lbl.Text = name`);
        L.push(`    lbl.TextColor3 = Theme.text2`);
        L.push(`    lbl.Font = F.body`);
        L.push(`    lbl.TextSize = 12`);
        L.push(`    lbl.TextXAlignment = Enum.TextXAlignment.Left`);
        L.push(`    local page = Instance.new("ScrollingFrame", contentHolder)`);
        L.push(`    page.Size = UDim2.new(1, 0, 1, 0)`);
        L.push(`    page.BackgroundTransparency = 1`);
        L.push(`    page.BorderSizePixel = 0`);
        L.push(`    page.ScrollBarThickness = 3`);
        L.push(`    page.ScrollBarImageColor3 = Theme.accent`);
        L.push(`    page.CanvasSize = UDim2.new(0, 0, 0, 0)`);
        L.push(`    page.AutomaticCanvasSize = Enum.AutomaticSize.Y`);
        L.push(`    page.Visible = false`);
        L.push(`    local pl = Instance.new("UIListLayout", page)`);
        L.push(`    pl.Padding = UDim.new(0, 6)`);
        L.push(`    btn.MouseButton1Click:Connect(function()`);
        L.push(`        for _, p in pairs(tabPages) do p.page.Visible = false; p.lbl.TextColor3 = Theme.text2; p.btn.BackgroundTransparency = 1 end`);
        L.push(`        page.Visible = true; lbl.TextColor3 = Theme.glow; btn.BackgroundTransparency = 0; btn.BackgroundColor3 = Theme.elevated`);
        L.push(`    end)`);
        L.push(`    table.insert(tabPages, { btn = btn, page = page, lbl = lbl })`);
        L.push(`    if #tabPages == 1 then page.Visible = true; lbl.TextColor3 = Theme.glow; btn.BackgroundTransparency = 0; btn.BackgroundColor3 = Theme.elevated end`);
        L.push(`    return page`);
        L.push(`end`);
        L.push("");
    } else if (useTabs && tabStyle === "horizontal") {
        L.push(`-- ABAS HORIZONTAIS`);
        L.push(`local tabBar = Instance.new("Frame", win)`);
        L.push(`tabBar.Size = UDim2.new(1, -16, 0, 34)`);
        L.push(`tabBar.Position = UDim2.new(0, 8, 0, ${contentTop})`);
        L.push(`tabBar.BackgroundColor3 = Theme.surface`);
        L.push(`tabBar.BorderSizePixel = 0`);
        L.push(`Instance.new("UICorner", tabBar).CornerRadius = UDim.new(0, 8)`);
        L.push(`local tabScroll = Instance.new("ScrollingFrame", tabBar)`);
        L.push(`tabScroll.Size = UDim2.new(1, -8, 1, -8)`);
        L.push(`tabScroll.Position = UDim2.new(0, 4, 0, 4)`);
        L.push(`tabScroll.BackgroundTransparency = 1`);
        L.push(`tabScroll.BorderSizePixel = 0`);
        L.push(`tabScroll.ScrollBarThickness = 2`);
        L.push(`tabScroll.CanvasSize = UDim2.new(0, 0, 0, 0)`);
        L.push(`tabScroll.AutomaticCanvasSize = Enum.AutomaticSize.X`);
        L.push(`tabScroll.ScrollingDirection = Enum.ScrollingDirection.X`);
        L.push(`local tabList = Instance.new("UIListLayout", tabScroll)`);
        L.push(`tabList.FillDirection = Enum.FillDirection.Horizontal`);
        L.push(`tabList.Padding = UDim.new(0, 4)`);
        L.push(`tabList.SortOrder = Enum.SortOrder.LayoutOrder`);
        L.push(`local contentHolder = Instance.new("Frame", win)`);
        L.push(`contentHolder.Size = UDim2.new(1, -16, 1, -${contentTop + 34 + 12})`);
        L.push(`contentHolder.Position = UDim2.new(0, 8, 0, ${contentTop + 38})`);
        L.push(`contentHolder.BackgroundTransparency = 1`);
        L.push("");
        L.push(`local tabPages = {}`);
        L.push(`local function addTab(name)`);
        L.push(`    local btn = Instance.new("TextButton", tabScroll)`);
        L.push(`    btn.Size = UDim2.new(0, 90, 0, 24)`);
        L.push(`    btn.BackgroundColor3 = Theme.elevated`);
        L.push(`    btn.BackgroundTransparency = 1`);
        L.push(`    btn.Text = name`);
        L.push(`    btn.TextColor3 = Theme.text2`);
        L.push(`    btn.Font = F.body`);
        L.push(`    btn.TextSize = 12`);
        L.push(`    btn.AutoButtonColor = false`);
        L.push(`    btn.BorderSizePixel = 0`);
        L.push(`    Instance.new("UICorner", btn).CornerRadius = UDim.new(0, 6)`);
        L.push(`    local page = Instance.new("ScrollingFrame", contentHolder)`);
        L.push(`    page.Size = UDim2.new(1, 0, 1, 0)`);
        L.push(`    page.BackgroundTransparency = 1`);
        L.push(`    page.BorderSizePixel = 0`);
        L.push(`    page.ScrollBarThickness = 3`);
        L.push(`    page.ScrollBarImageColor3 = Theme.accent`);
        L.push(`    page.CanvasSize = UDim2.new(0, 0, 0, 0)`);
        L.push(`    page.AutomaticCanvasSize = Enum.AutomaticSize.Y`);
        L.push(`    page.Visible = false`);
        L.push(`    local pl = Instance.new("UIListLayout", page)`);
        L.push(`    pl.Padding = UDim.new(0, 6)`);
        L.push(`    btn.MouseButton1Click:Connect(function()`);
        L.push(`        for _, p in pairs(tabPages) do p.page.Visible = false; p.btn.TextColor3 = Theme.text2; p.btn.BackgroundTransparency = 1 end`);
        L.push(`        page.Visible = true; btn.TextColor3 = Theme.glow; btn.BackgroundTransparency = 0; btn.BackgroundColor3 = Theme.elevated`);
        L.push(`    end)`);
        L.push(`    table.insert(tabPages, { btn = btn, page = page, lbl = btn })`);
        L.push(`    if #tabPages == 1 then page.Visible = true; btn.TextColor3 = Theme.glow; btn.BackgroundTransparency = 0; btn.BackgroundColor3 = Theme.elevated end`);
        L.push(`    return page`);
        L.push(`end`);
        L.push("");
    } else {
        // lista simples
        L.push(`-- LISTA`);
        L.push(`local list = Instance.new("ScrollingFrame", win)`);
        L.push(`list.Size = UDim2.new(1, -20, 1, -${contentTop + 12})`);
        L.push(`list.Position = UDim2.new(0, 10, 0, ${contentTop})`);
        L.push(`list.BackgroundTransparency = 1`);
        L.push(`list.BorderSizePixel = 0`);
        L.push(`list.ScrollBarThickness = 3`);
        L.push(`list.ScrollBarImageColor3 = Theme.accent`);
        L.push(`list.CanvasSize = UDim2.new(0, 0, 0, 0)`);
        L.push(`list.AutomaticCanvasSize = Enum.AutomaticSize.Y`);
        L.push(`local ll = Instance.new("UIListLayout", list)`);
        L.push(`ll.Padding = UDim.new(0, ${isMobile ? 8 : 6})`);
        L.push("");
    }

    // TOGGLE E SLIDER HELPERS (sempre presentes)
    const toggleParent = useTabs ? "page" : "list";

    L.push(`local function mkToggle(parent, label, callback, default)`);
    L.push(`    default = default or false`);
    L.push(`    local row = Instance.new("Frame", parent)`);
    L.push(`    row.Size = UDim2.new(1, 0, 0, ${isMobile ? 40 : 34})`);
    L.push(`    row.BackgroundColor3 = Theme.elevated`);
    L.push(`    row.BorderSizePixel = 0`);
    L.push(`    Instance.new("UICorner", row).CornerRadius = UDim.new(0, 8)`);
    L.push(`    local lbl = Instance.new("TextLabel", row)`);
    L.push(`    lbl.Size = UDim2.new(1, -80, 1, 0)`);
    L.push(`    lbl.Position = UDim2.new(0, 14, 0, 0)`);
    L.push(`    lbl.BackgroundTransparency = 1`);
    L.push(`    lbl.Text = label`);
    L.push(`    lbl.TextColor3 = Theme.text`);
    L.push(`    lbl.Font = F.body`);
    L.push(`    lbl.TextSize = ${isMobile ? 13 : 13}`);
    L.push(`    lbl.TextXAlignment = Enum.TextXAlignment.Left`);
    L.push(`    local btn = Instance.new("TextButton", row)`);
    L.push(`    btn.Size = UDim2.new(0, ${isMobile ? 50 : 42}, 0, ${isMobile ? 26 : 20})`);
    L.push(`    btn.Position = UDim2.new(1, -${isMobile ? 60 : 54}, 0.5, -${isMobile ? 13 : 10})`);
    L.push(`    btn.BackgroundColor3 = default and Theme.success or Theme.danger`);
    L.push(`    btn.Text = ""; btn.AutoButtonColor = false; btn.BorderSizePixel = 0`);
    L.push(`    Instance.new("UICorner", btn).CornerRadius = UDim.new(1, 0)`);
    L.push(`    local knobSize = ${isMobile ? 20 : 16}`);
    L.push(`    local knob = Instance.new("Frame", btn)`);
    L.push(`    knob.Size = UDim2.new(0, knobSize, 0, knobSize)`);
    L.push(`    knob.Position = default and UDim2.new(1, -knobSize - 3, 0.5, -knobSize/2) or UDim2.new(0, 3, 0.5, -knobSize/2)`);
    L.push(`    knob.BackgroundColor3 = Theme.text; knob.BorderSizePixel = 0`);
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
    L.push(`local function mkSlider(parent, label, min, max, default, callback)`);
    L.push(`    local row = Instance.new("Frame", parent)`);
    L.push(`    row.Size = UDim2.new(1, 0, 0, ${isMobile ? 50 : 44})`);
    L.push(`    row.BackgroundColor3 = Theme.elevated`);
    L.push(`    row.BorderSizePixel = 0`);
    L.push(`    Instance.new("UICorner", row).CornerRadius = UDim.new(0, 8)`);
    L.push(`    local lbl = Instance.new("TextLabel", row)`);
    L.push(`    lbl.Size = UDim2.new(1, -80, 0, 16); lbl.Position = UDim2.new(0, 14, 0, 6)`);
    L.push(`    lbl.BackgroundTransparency = 1; lbl.Text = label`);
    L.push(`    lbl.TextColor3 = Theme.text; lbl.Font = F.body; lbl.TextSize = 12`);
    L.push(`    lbl.TextXAlignment = Enum.TextXAlignment.Left`);
    L.push(`    local val = Instance.new("TextLabel", row)`);
    L.push(`    val.Size = UDim2.new(0, 60, 0, 16); val.Position = UDim2.new(1, -74, 0, 6)`);
    L.push(`    val.BackgroundTransparency = 1; val.Text = tostring(default)`);
    L.push(`    val.TextColor3 = Theme.glow; val.Font = F.mono; val.TextSize = 12`);
    L.push(`    val.TextXAlignment = Enum.TextXAlignment.Right`);
    L.push(`    local track = Instance.new("Frame", row)`);
    L.push(`    track.Size = UDim2.new(1, -28, 0, 4); track.Position = UDim2.new(0, 14, 0, ${isMobile ? 36 : 30})`);
    L.push(`    track.BackgroundColor3 = Theme.border; track.BorderSizePixel = 0`);
    L.push(`    Instance.new("UICorner", track).CornerRadius = UDim.new(1, 0)`);
    L.push(`    local rel = (default - min) / (max - min)`);
    L.push(`    local fill = Instance.new("Frame", track)`);
    L.push(`    fill.Size = UDim2.new(rel, 0, 1, 0); fill.BackgroundColor3 = Theme.accent; fill.BorderSizePixel = 0`);
    L.push(`    Instance.new("UICorner", fill).CornerRadius = UDim.new(1, 0)`);
    L.push(`    local hit = Instance.new("TextButton", row)`);
    L.push(`    hit.Size = UDim2.new(1, -28, 0, 22); hit.Position = UDim2.new(0, 14, 0, ${isMobile ? 26 : 22})`);
    L.push(`    hit.BackgroundTransparency = 1; hit.Text = ""`);
    L.push(`    local dragging = false`);
    L.push(`    local function upd(x)`);
    L.push(`        local r = math.clamp((x - track.AbsolutePosition.X) / track.AbsoluteSize.X, 0, 1)`);
    L.push(`        local v = min + (max - min) * r`);
    L.push(`        v = math.floor(v * 100 + 0.5) / 100`);
    L.push(`        fill.Size = UDim2.new(r, 0, 1, 0); val.Text = tostring(v)`);
    L.push(`        if callback then callback(v) end`);
    L.push(`    end`);
    L.push(`    hit.InputBegan:Connect(function(i)`);
    L.push(`        if i.UserInputType == Enum.UserInputType.MouseButton1 or i.UserInputType == Enum.UserInputType.Touch then`);
    L.push(`            dragging = true; upd(i.Position.X)`);
    L.push(`        end`);
    L.push(`    end)`);
    L.push(`    UserInput.InputChanged:Connect(function(i)`);
    L.push(`        if dragging and (i.UserInputType == Enum.UserInputType.MouseMovement or i.UserInputType == Enum.UserInputType.Touch) then upd(i.Position.X) end`);
    L.push(`    end)`);
    L.push(`    UserInput.InputEnded:Connect(function(i)`);
    L.push(`        if i.UserInputType == Enum.UserInputType.MouseButton1 or i.UserInputType == Enum.UserInputType.Touch then dragging = false end`);
    L.push(`    end)`);
    L.push(`end`);
    L.push("");

    // MOBILE FLOAT
    if (isMobile) {
        L.push(`-- FLOAT BUTTON`);
        L.push(`local float = Instance.new("TextButton", gui)`);
        L.push(`float.Size = UDim2.new(0, 56, 0, 56)`);
        L.push(`float.Position = UDim2.new(0, 16, 0.5, -28)`);
        L.push(`float.BackgroundColor3 = Theme.bg`);
        L.push(`float.Text = "LC10"`);
        L.push(`float.TextColor3 = Theme.glow`);
        L.push(`float.Font = F.heading`);
        L.push(`float.TextSize = 11`);
        L.push(`float.BorderSizePixel = 0; float.AutoButtonColor = false; float.ZIndex = 50`);
        L.push(`Instance.new("UICorner", float).CornerRadius = UDim.new(1, 0)`);
        L.push(`local fs = Instance.new("UIStroke", float); fs.Color = Theme.accent; fs.Thickness = 1.5`);
        L.push(`float.MouseButton1Click:Connect(function() win.Visible = not win.Visible end)`);
        L.push(`do`);
        L.push(`    local dr, ds, sp`);
        L.push(`    float.InputBegan:Connect(function(i)`);
        L.push(`        if i.UserInputType == Enum.UserInputType.Touch or i.UserInputType == Enum.UserInputType.MouseButton1 then`);
        L.push(`            dr = true; ds = i.Position; sp = float.Position`);
        L.push(`        end`);
        L.push(`    end)`);
        L.push(`    UserInput.InputChanged:Connect(function(i)`);
        L.push(`        if dr and (i.UserInputType == Enum.UserInputType.Touch or i.UserInputType == Enum.UserInputType.MouseMovement) then`);
        L.push(`            local d = i.Position - ds`);
        L.push(`            float.Position = UDim2.new(sp.X.Scale, sp.X.Offset + d.X, sp.Y.Scale, sp.Y.Offset + d.Y)`);
        L.push(`        end`);
        L.push(`    end)`);
        L.push(`    UserInput.InputEnded:Connect(function(i)`);
        L.push(`        if i.UserInputType == Enum.UserInputType.Touch or i.UserInputType == Enum.UserInputType.MouseButton1 then dr = false end`);
        L.push(`    end)`);
        L.push(`end`);
        L.push("");
    } else {
        L.push(`UserInput.InputBegan:Connect(function(i, gp)`);
        L.push(`    if gp then return end`);
        L.push(`    if i.KeyCode == Config.keybind then win.Visible = not win.Visible end`);
        L.push(`end)`);
        L.push("");
    }

    // MÓDULOS
    L.push("-- MÓDULOS");
    for (const mod of featureModules) {
        L.push(`-- ${mod.name}`);
        for (const line of mod.code) L.push(line);
        L.push("");
    }

    // UI PARA CADA MÓDULO
    L.push("-- UI");
    for (const mod of featureModules) {
        if (useTabs) {
            L.push(`local page_${camelCase(mod.name) || "X"} = addTab("${mod.name.replace(/"/g, '\\"')}")`);
        } else {
            L.push(`local page_${camelCase(mod.name) || "X"} = list`);
        }
    }
    L.push("");

    // TOGGLES E SLIDERS
    for (const mod of featureModules) {
        const pg = useTabs ? `page_${camelCase(mod.name) || "X"}` : "list";

        if (mod.name === "Aimbot" || mod.name === "Silent Aim") {
            const cls = mod.name === "Aimbot" ? "Aimbot" : "SilentAim";
            L.push(`-- ${mod.name}`);
            L.push(`mkToggle(${pg}, "Ativado", function(v) ${cls}.active = v end)`);
            L.push(`mkSlider(${pg}, "FOV", 30, 500, 150, function(v) ${cls}.fov = v end)`);
            L.push(`mkToggle(${pg}, "FOV visível", function(v) ${cls}.fovVisible = v end, true)`);
            L.push(`mkToggle(${pg}, "Wall Check", function(v) ${cls}.wallCheck = v end)`);
            L.push(`mkToggle(${pg}, "Team Check", function(v) ${cls}.teamCheck = v end, true)`);
            L.push(`mkSlider(${pg}, "Smoothness", 0.01, 0.5, 0.15, function(v) ${cls}.smoothness = v end)`);
            L.push(`mkSlider(${pg}, "Alcance", 100, 1000, 500, function(v) ${cls}.range = v end)`);
            L.push(`mkToggle(${pg}, "Mostrar target", function(v) ${cls}.showTarget = v end, true)`);
        } else if (mod.name === "ESP") {
            L.push(`-- ESP`);
            L.push(`mkToggle(${pg}, "Ativado", function(v) if v then ESP.enable() else ESP.disable() end; ESP.active = v end)`);
            L.push(`mkToggle(${pg}, "Box", function(v) ESP.useBox = v end, true)`);
            L.push(`mkToggle(${pg}, "Box v2", function(v) ESP.useBoxV2 = v end)`);
            L.push(`mkToggle(${pg}, "Line", function(v) ESP.useLine = v end)`);
            L.push(`mkToggle(${pg}, "Skeleton", function(v) ESP.useSkeleton = v end)`);
            L.push(`mkToggle(${pg}, "Name", function(v) ESP.useName = v end, true)`);
            L.push(`mkToggle(${pg}, "Health Bar", function(v) ESP.useHealthBar = v end, true)`);
            L.push(`mkToggle(${pg}, "Distance", function(v) ESP.useDistance = v end)`);
            L.push(`mkToggle(${pg}, "Tracer", function(v) ESP.useTracer = v end)`);
            L.push(`mkSlider(${pg}, "Espessura", 0.5, 5, 1.5, function(v) ESP.thickness = v end)`);
        } else if (mod.name === "Movement") {
            const subs = mod.subKeys || [];
            if (subs.includes("speed"))   L.push(`mkToggle(${pg}, "Speed Hack", function(v) Movement.speed = v end)`);
            if (subs.includes("jump"))    L.push(`mkToggle(${pg}, "Jump Boost", function(v) Movement.jump = v end)`);
            if (subs.includes("infjump")) L.push(`mkToggle(${pg}, "Pulo Infinito", function(v) Movement.infJump = v end)`);
            if (subs.includes("noclip"))  L.push(`mkToggle(${pg}, "Noclip", function(v) Movement.noclip = v end)`);
            L.push(`mkSlider(${pg}, "WalkSpeed", 16, 300, 32, function(v) Movement.speedValue = v end)`);
            L.push(`mkSlider(${pg}, "JumpPower", 50, 500, 100, function(v) Movement.jumpValue = v end)`);
        } else if (mod.name === "Godmode") {
            L.push(`mkToggle(${pg}, "Godmode", function(v) Godmode.active = v end)`);
        } else if (mod.name === "Fullbright") {
            L.push(`mkToggle(${pg}, "Fullbright", function(v) if v then Fullbright.enable() else Fullbright.disable() end end)`);
        } else if (mod.name === "Stats") {
            L.push(`mkToggle(${pg}, "Stats Overlay", function(v) if v then Stats.enable() else Stats.disable() end end)`);
        } else if (mod.name === "Teleport Player") {
            L.push(`local tpBox = Instance.new("TextBox", ${pg})`);
            L.push(`tpBox.Size = UDim2.new(1, 0, 0, ${isMobile ? 40 : 34})`);
            L.push(`tpBox.BackgroundColor3 = Theme.elevated`);
            L.push(`tpBox.BorderSizePixel = 0`);
            L.push(`tpBox.PlaceholderText = "Nome do player"`);
            L.push(`tpBox.Text = ""`);
            L.push(`tpBox.TextColor3 = Theme.text; tpBox.PlaceholderColor3 = Theme.text3`);
            L.push(`tpBox.Font = F.body; tpBox.TextSize = 12`);
            L.push(`Instance.new("UICorner", tpBox).CornerRadius = UDim.new(0, 8)`);
            L.push(`tpBox.FocusLost:Connect(function() if tpBox.Text ~= "" then Teleport.toPlayer(tpBox.Text) end end)`);
        } else {
            // genérico
            const cls = camelCase(mod.name) || "Custom";
            L.push(`mkToggle(${pg}, "${mod.name.replace(/"/g, '\\"')}", function(v) ${cls}.active = v end)`);
        }
        L.push("");
    }

    L.push(`print("[LC10] carregado — ${featureCount} módulos")`);

    return L.join("\n");
}

// ═══════════════════════════════════════════════════════════════
// EXPORTS
// ═══════════════════════════════════════════════════════════════
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
    a.href = url; a.download = filename;
    document.body.appendChild(a); a.click(); document.body.removeChild(a);
    URL.revokeObjectURL(url);
}

// ═══════════════════════════════════════════════════════════════
// MODAIS
// ═══════════════════════════════════════════════════════════════
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

// ═══════════════════════════════════════════════════════════════
// MENU
// ═══════════════════════════════════════════════════════════════
function toggle_menu() {
    $("#menu-dropdown").classList.toggle("hidden");
    $("#menu-btn").classList.toggle("active");
}
function close_menu() {
    $("#menu-dropdown").classList.add("hidden");
    $("#menu-btn").classList.remove("active");
}

// ═══════════════════════════════════════════════════════════════
// MAIN
// ═══════════════════════════════════════════════════════════════
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
    let combined = $("#dump-input").value || "";
    for (const f of files) {
        try { combined += (combined ? "\n\n" : "") + await f.text(); }
        catch (e) { console.warn("erro lendo", f.name, e); }
    }
    $("#dump-input").value = combined;
    update_stats();
}

// ═══════════════════════════════════════════════════════════════
// BIND
// ═══════════════════════════════════════════════════════════════
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

const fileBtn = document.getElementById("file-btn");
const fileInput = document.getElementById("file-input");
if (fileBtn && fileInput) {
    fileBtn.addEventListener("click", (e) => { e.preventDefault(); e.stopPropagation(); fileInput.click(); });
    fileInput.addEventListener("change", async (e) => {
        const files = Array.from(e.target.files || []);
        if (files.length === 0) return;
        set_status(`Lendo ${files.length} arquivo(s)...`, "warn");
        let combined = $("#dump-input").value || "";
        let total_size = 0;
        for (const f of files) {
            try { const txt = await f.text(); combined += (combined ? "\n\n" : "") + txt; total_size += txt.length; }
            catch (err) { console.warn("erro lendo", f.name, err); }
        }
        $("#dump-input").value = combined;
        update_stats();
        set_status(`${files.length} arquivo(s) — ${(total_size/1024).toFixed(1)} KB`, "ok");
        e.target.value = "";
    });
}

const menuBtn = $("#menu-btn");
if (menuBtn) menuBtn.addEventListener("click", (e) => { e.stopPropagation(); toggle_menu(); });
document.addEventListener("click", (e) => {
    if (!e.target.closest("#menu-dropdown") && !e.target.closest("#menu-btn")) close_menu();
});

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
            if (!state.raw) { set_status("Analisa um dump primeiro", "err"); return; }
            open_output_modal("🧩 Esqueleto Lua", generate_skeleton(), "Estrutura pronta");
            return;
        }
        if (action === "sniffer") {
            if (!state.raw) { set_status("Analisa um dump primeiro", "err"); return; }
            open_output_modal("📡 Sniffer", generate_sniffer(), "Roda no jogo");
            return;
        }
        if (action === "fullscript") { open_config_modal(); return; }
        if (action === "export-txt") { if (!state.raw) return set_status("Analisa um dump primeiro", "err"); download_text("lc10-analysis.txt", build_report_text("txt")); set_status("Baixado .txt", "ok"); return; }
        if (action === "export-md")  { if (!state.raw) return set_status("Analisa um dump primeiro", "err"); download_text("lc10-analysis.md", build_report_text("md")); set_status("Baixado .md", "ok"); return; }
        if (action === "export-json"){ if (!state.raw) return set_status("Analisa um dump primeiro", "err"); download_text("lc10-analysis.json", build_report_text("json")); set_status("Baixado .json", "ok"); return; }
    });
});

$("#filter-input").addEventListener("input", (e) => { state.filterQuery = e.target.value; apply_filter(); });
$("#filter-clear").addEventListener("click", () => { state.filterQuery = ""; $("#filter-input").value = ""; apply_filter(); });

$$(".sug-chip").forEach(chip => chip.addEventListener("click", () => { $("#prompt-input").value = chip.dataset.sug; }));

$$(".platform-option[data-platform]").forEach(opt => {
    opt.addEventListener("click", () => {
        $$(".platform-option[data-platform]").forEach(o => o.classList.remove("selected"));
        opt.classList.add("selected");
        state.platform = opt.dataset.platform;
    });
});

$$(".platform-option[data-tabstyle]").forEach(opt => {
    opt.addEventListener("click", () => {
        $$(".platform-option[data-tabstyle]").forEach(o => o.classList.remove("selected"));
        opt.classList.add("selected");
        state.tabStyle = opt.dataset.tabstyle;
    });
});

$("#generate-btn").addEventListener("click", () => {
    const prompt = $("#prompt-input").value.trim();
    if (!state.platform) return set_status("Escolhe Mobile ou PC", "err");
    if (!state.tabStyle) return set_status("Escolhe o estilo do painel", "err");
    set_status("Gerando script...", "warn");
    setTimeout(() => {
        const code = generate_custom_script(prompt, state.platform, state.tabStyle);
        if (!code) return set_status("Falha na geração", "err");
        const feats = parsePromptFeatures(prompt);
        const sub = `${state.platform === "mobile" ? "📱" : "🖥️"} ${state.platform} • ${state.tabStyle} • ${feats.length} features`;
        $("#config-modal").classList.add("hidden");
        open_output_modal("⚡ Script gerado", code, sub);
        set_status("Script gerado", "ok");
    }, 60);
});

$("#output-copy").addEventListener("click", async () => {
    try { await navigator.clipboard.writeText(state.lastOutput); set_status("Copiado", "ok"); }
    catch (e) { const ta = document.createElement("textarea"); ta.value = state.lastOutput; document.body.appendChild(ta); ta.select(); document.execCommand("copy"); document.body.removeChild(ta); set_status("Copiado", "ok"); }
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

$$("#summary-list li").forEach(li => li.addEventListener("click", () => {
    const sec = document.getElementById("sec-" + li.dataset.target);
    if (sec) sec.scrollIntoView({ behavior: "smooth", block: "start" });
}));

$("#dump-input").addEventListener("dragover", (e) => { e.preventDefault(); e.currentTarget.style.borderColor = "var(--accent)"; });
$("#dump-input").addEventListener("dragleave", (e) => { e.currentTarget.style.borderColor = "var(--border)"; });
$("#dump-input").addEventListener("drop", (e) => {
    e.preventDefault();
    e.currentTarget.style.borderColor = "var(--border)";
    const files = Array.from(e.dataTransfer.files);
    if (files.length > 0) load_files(files);
});

document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") {
        $("#config-modal").classList.add("hidden");
        $("#output-modal").classList.add("hidden");
        close_menu();
    }
});

const mobileOpt = document.querySelector('.platform-option[data-platform="mobile"]');
if (mobileOpt) mobileOpt.classList.add("selected");
const listOpt = document.querySelector('.platform-option[data-tabstyle="list"]');
if (listOpt) listOpt.classList.add("selected");
