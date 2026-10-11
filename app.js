// ═══════════════════════════════════════════════════════════════
// LC10 • FEATURES DATABASE — 174 features
// ═══════════════════════════════════════════════════════════════

const FEATURES = [
    // ═══════════ COMBAT (28) ═══════════
    { key: "aimbot",         regex: /\baim\s*bot\b|\baimbot\b|mira\s*auto|aim\s*assist/i,          label: "Aimbot",            cat: "combat" },
    { key: "silentaim",      regex: /silent\s*aim|silent\s*aimbot|\bsilent\b.*\baim\b/i,            label: "Silent Aim",        cat: "combat" },
    { key: "killaura",       regex: /kill\s*aura|aura\s*kill|\baura\b/i,                            label: "Kill Aura",         cat: "combat" },
    { key: "autoatk",        regex: /auto[\s-]?attack|auto[\s-]?atk|auto[\s-]?hit|ataca\s*auto/i,  label: "Auto-Attack",       cat: "combat" },
    { key: "hitbox",         regex: /hitbox|expand\s*hitbox|alcance|reach/i,                        label: "Hitbox Expander",   cat: "combat" },
    { key: "norecoil",       regex: /no\s*recoil|sem\s*recuo/i,                                     label: "No Recoil",         cat: "combat" },
    { key: "nospread",       regex: /no\s*spread|sem\s*dispers/i,                                   label: "No Spread",         cat: "combat" },
    { key: "triggerbot",     regex: /trigger\s*bot|auto\s*shoot|atira\s*auto/i,                     label: "Trigger Bot",       cat: "combat" },
    { key: "rapidfire",      regex: /rapid\s*fire|tiro\s*r[áa]pido|fast\s*fire/i,                   label: "Rapid Fire",        cat: "combat" },
    { key: "infammo",        regex: /infinite\s*ammo|muni[çc][ãa]o\s*infinita/i,                    label: "Munição Infinita",  cat: "combat" },
    { key: "instakill",      regex: /instant\s*kill|instakill|mata\s*r[áa]pido|one\s*hit/i,         label: "Instant Kill",      cat: "combat" },
    { key: "critalways",     regex: /always\s*crit|crit\s*always|critico\s*sempre/i,                label: "Always Critical",   cat: "combat" },
    { key: "backstab",       regex: /backstab|facada|atr[áa]s/i,                                    label: "Auto Backstab",     cat: "combat" },
    { key: "swordaura",      regex: /sword\s*aura|espada\s*aura/i,                                  label: "Sword Aura",        cat: "combat" },
    { key: "gunmods",        regex: /gun\s*mods|mods\s*arma|mod\s*de\s*arma/i,                      label: "Gun Mods",          cat: "combat" },
    { key: "fistspeed",      regex: /fist\s*speed|velocidade\s*do\s*soque/i,                        label: "Fist Speed",        cat: "combat" },
    { key: "autoparry",      regex: /auto\s*parry|parry\s*auto|auto\s*defend/i,                     label: "Auto-Parry",        cat: "combat" },
    { key: "autoblock",      regex: /auto\s*block|bloqueio\s*auto|auto\s*defesa/i,                  label: "Auto-Block",        cat: "combat" },
    { key: "autododge",      regex: /auto\s*dodge|esquiva\s*auto/i,                                 label: "Auto-Dodge",        cat: "combat" },
    { key: "flingaura",      regex: /fling\s*aura|arremessa\s*aura|fling\s*all/i,                   label: "Fling Aura",        cat: "combat" },
    { key: "touchaura",      regex: /touch\s*aura|toca\s*aura/i,                                    label: "Touch Aura",        cat: "combat" },
    { key: "projectilesilent", regex: /projectile\s*silent|silent\s*shot/i,                         label: "Projectile Silent", cat: "combat" },
    { key: "bowaim",         regex: /bow\s*aim|mira\s*arco/i,                                       label: "Bow Aim",           cat: "combat" },
    { key: "aimtobot",       regex: /aim\s*(no|para)\s*(bot|npc)|mira\s*em\s*(bot|npc)/i,           label: "Aim to Bot",        cat: "combat" },
    { key: "aimtotorso",     regex: /aim\s*(to|no)\s*torso|mira\s*no\s*torso/i,                     label: "Aim to Torso",      cat: "combat" },
    { key: "magnetfist",     regex: /magnet\s*fist|punho\s*magnetico/i,                             label: "Magnet Fist",       cat: "combat" },
    { key: "comboscript",    regex: /auto\s*combo|combo\s*auto/i,                                   label: "Auto Combo",        cat: "combat" },
    { key: "wallbang",       regex: /wall\s*bang|atira\s*atravess/i,                                label: "Wall Bang",         cat: "combat" },

    // ═══════════ VISUAL / ESP (32) ═══════════
    { key: "esp",            regex: /\besp\b|wallhack|see\s*players|box\s*esp/i,                   label: "ESP Principal",     cat: "visual" },
    { key: "boxesp",         regex: /box\s*esp|esp\s*box|caixa/i,                                   label: "ESP Box",           cat: "visual" },
    { key: "box2esp",        regex: /box\s*v?2|esp\s*box\s*v?2|caixa\s*arredond/i,                 label: "ESP Box v2",        cat: "visual" },
    { key: "lineesp",        regex: /line\s*esp|esp\s*linha|esp\s*line/i,                            label: "ESP Line",          cat: "visual" },
    { key: "skeletonesp",    regex: /skeleton\s*esp|esp\s*esqueleto|skeleton/i,                     label: "ESP Skeleton",      cat: "visual" },
    { key: "nameesp",        regex: /name\s*esp|esp\s*nome|player\s*name/i,                         label: "ESP Name",          cat: "visual" },
    { key: "healthesp",      regex: /health\s*bar|barra\s*de\s*vida|esp\s*health/i,                 label: "ESP Health Bar",    cat: "visual" },
    { key: "distanceesp",    regex: /distance\s*esp|esp\s*distancia/i,                              label: "ESP Distance",      cat: "visual" },
    { key: "traceresp",      regex: /tracer\s*esp|esp\s*linha\s*baixo|tracer/i,                     label: "ESP Tracer",        cat: "visual" },
    { key: "chams",          regex: /chams|character\s*highlight|destaque/i,                        label: "Chams",             cat: "visual" },
    { key: "fullbright",     regex: /full[\s-]?bright|brilho|iluminac|noite\s*clara/i,              label: "Fullbright",        cat: "visual" },
    { key: "crosshair",      regex: /crosshair|mira\s*personalizada/i,                              label: "Crosshair Custom",  cat: "visual" },
    { key: "fovcircle",      regex: /fov\s*circle|c[íi]rculo\s*fov|circulo\s*fov/i,                 label: "FOV Circle",        cat: "visual" },
    { key: "playertrails",   regex: /player\s*trails|rastro|trilha\s*player/i,                      label: "Player Trails",     cat: "visual" },
    { key: "nametags",       regex: /name\s*tags|nametags|etiqueta/i,                               label: "Name Tags",         cat: "visual" },
    { key: "hitmarker",      regex: /hit\s*marker|marcador\s*de\s*hit/i,                            label: "Hit Marker",        cat: "visual" },
    { key: "damageindicator",regex: /damage\s*indicator|indicador\s*de\s*dano/i,                    label: "Damage Indicator",  cat: "visual" },
    { key: "killfeed",       regex: /kill\s*feed|feed\s*de\s*kill/i,                                label: "Kill Feed",         cat: "visual" },
    { key: "topkillfeed",    regex: /top\s*kill\s*feed|feed\s*top/i,                                label: "Top Kill Feed",     cat: "visual" },
    { key: "customsky",      regex: /custom\s*sky|c[ée]u\s*personalizado/i,                         label: "Custom Sky",        cat: "visual" },
    { key: "ragdollchams",   regex: /ragdoll\s*chams|chams\s*ragdoll/i,                             label: "Ragdoll Chams",     cat: "visual" },
    { key: "serverinfo",     regex: /server\s*info|info\s*do\s*servidor/i,                          label: "Server Info",       cat: "visual" },
    { key: "playerinfo",     regex: /player\s*info|info\s*do\s*player/i,                            label: "Player Info",       cat: "visual" },
    { key: "coordinatehud",  regex: /coord|coordenadas|xyz\s*hud/i,                                 label: "Coordinates HUD",   cat: "visual" },
    { key: "compass",        regex: /compass|b[úu]ssola/i,                                          label: "Compass",           cat: "visual" },
    { key: "minimap",        regex: /minimap|mini\s*mapa/i,                                         label: "Minimap",           cat: "visual" },
    { key: "waypoints",      regex: /waypoint|waypoints|marca\s*ponto/i,                            label: "Waypoints",         cat: "visual" },
    { key: "particlesesp",   regex: /particle\s*esp|part[íi]cula\s*esp/i,                           label: "Particle ESP",      cat: "visual" },
    { key: "arrowesp",       regex: /arrow\s*esp|seta\s*esp|indicador\s*de\s*dire/i,                label: "Arrow ESP",         cat: "visual" },
    { key: "soundesp",       regex: /sound\s*esp|esp\s*de\s*som/i,                                  label: "Sound ESP",         cat: "visual" },
    { key: "footstepesp",    regex: /footstep\s*esp|passo\s*esp/i,                                  label: "Footstep ESP",      cat: "visual" },
    { key: "bloodesp",       regex: /blood\s*esp|sangue\s*esp/i,                                    label: "Blood ESP",         cat: "visual" },

    // ═══════════ MOVEMENT (26) ═══════════
    { key: "speed",          regex: /\bspeed\b|velocidade|walkspeed/i,                              label: "Speed Hack",        cat: "movement" },
    { key: "jump",           regex: /\bjump\b|\bpulo\b|jump\s*boost|super\s*jump/i,                label: "Jump Boost",        cat: "movement" },
    { key: "infjump",        regex: /infinite\s*jump|pulo\s*infinito|inf\s*jump/i,                  label: "Infinite Jump",     cat: "movement" },
    { key: "fly",            regex: /\bfly\b|voar|flight|flying/i,                                  label: "Fly",               cat: "movement" },
    { key: "noclip",         regex: /noclip|atravessar|no\s*clip/i,                                 label: "Noclip",            cat: "movement" },
    { key: "bhop",           regex: /\bbhop\b|bunny\s*hop|pulo\s*coelho/i,                          label: "Bunny Hop",         cat: "movement" },
    { key: "autosprint",     regex: /auto\s*sprint|sprint\s*auto/i,                                 label: "Auto Sprint",       cat: "movement" },
    { key: "teleport",       regex: /teleport|\btp\b/i,                                             label: "Teleport Player",   cat: "movement" },
    { key: "tptocursor",     regex: /tp\s*(to|no)\s*(mouse|cursor)|teleporte\s*mouse/i,             label: "TP to Cursor",      cat: "movement" },
    { key: "walkonwater",    regex: /walk\s*on\s*water|anda\s*na\s*agua/i,                          label: "Walk on Water",     cat: "movement" },
    { key: "wallclimb",      regex: /wall\s*climb|escalar\s*parede/i,                               label: "Wall Climb",        cat: "movement" },
    { key: "antivoid",       regex: /anti\s*void|anti[\s-]?v[óo]i?d|nao\s*cai/i,                   label: "Anti-Void",         cat: "movement" },
    { key: "dash",           regex: /\bdash\b|arranque|avan[çc]o/i,                                 label: "Dash",              cat: "movement" },
    { key: "doublejump",     regex: /double\s*jump|pulo\s*duplo/i,                                  label: "Double Jump",       cat: "movement" },
    { key: "triplejump",     regex: /triple\s*jump|pulo\s*triplo/i,                                 label: "Triple Jump",       cat: "movement" },
    { key: "highjump",       regex: /high\s*jump|pulo\s*alto|super\s*pulo/i,                        label: "High Jump",         cat: "movement" },
    { key: "longjump",       regex: /long\s*jump|pulo\s*longo/i,                                    label: "Long Jump",         cat: "movement" },
    { key: "glidе",          regex: /glide|planar|planador/i,                                       label: "Glide",             cat: "movement" },
    { key: "swim",           regex: /swim\s*speed|nadar\s*r[áa]pido/i,                              label: "Swim Speed",        cat: "movement" },
    { key: "climb",          regex: /climb\s*speed|escalar\s*r[áa]pido/i,                           label: "Climb Speed",       cat: "movement" },
    { key: "moonwalk",       regex: /moon\s*walk|moonwalk/i,                                        label: "Moonwalk",          cat: "movement" },
    { key: "spinbot",        regex: /spin\s*bot|spinbot|girar\s*bot/i,                              label: "Spin Bot",          cat: "movement" },
    { key: "autorun",        regex: /auto\s*run|corre\s*auto/i,                                     label: "Auto Run",          cat: "movement" },
    { key: "crouchspeed",    regex: /crouch\s*speed|agachado\s*r[áa]pido/i,                         label: "Crouch Speed",      cat: "movement" },
    { key: "slide",          regex: /slide|desliza/i,                                               label: "Slide",             cat: "movement" },
    { key: "cartwheel",      regex: /cartwheel|estrela/i,                                           label: "Cartwheel",         cat: "movement" },

    // ═══════════ DEFENSE (22) ═══════════
    { key: "godmode",        regex: /god\s*mode|godmode|imortal|invulner|invenc/i,                  label: "Godmode",           cat: "defense" },
    { key: "antifling",      regex: /anti[\s-]?fling|anti[\s-]?arremess/i,                          label: "Anti-Fling",        cat: "defense" },
    { key: "antikick",       regex: /anti[\s-]?kick|anti[\s-]?expuls/i,                             label: "Anti-Kick",         cat: "defense" },
    { key: "antidetect",     regex: /anti[\s-]?detect|anti[\s-]?ban|nao\s*detect/i,                label: "Anti-Detect",       cat: "defense" },
    { key: "antistate",      regex: /anti[\s-]?state|anti[\s-]?captur|escapar/i,                   label: "Anti-State",        cat: "defense" },
    { key: "antiban",        regex: /anti[\s-]?ban|nao\s*banir/i,                                   label: "Anti-Ban",          cat: "defense" },
    { key: "antiragdoll",    regex: /anti[\s-]?ragdoll|nao\s*ragdoll/i,                             label: "Anti-Ragdoll",      cat: "defense" },
    { key: "invisible",      regex: /invis[íi]vel|invisible|invis\b/i,                              label: "Invisibility",      cat: "defense" },
    { key: "hitboxreduce",   regex: /reduce\s*hitbox|hitbox\s*menor/i,                              label: "Reduce Hitbox",     cat: "defense" },
    { key: "anticheatbypass",regex: /anti[\s-]?cheat\s*bypass|bypass\s*anti/i,                      label: "Anti-Cheat Bypass", cat: "defense" },
    { key: "godstaff",       regex: /god\s*staff|staff\s*god/i,                                      label: "Staff Immunity",    cat: "defense" },
    { key: "autorespawn",    regex: /auto\s*respawn|respawn\s*auto/i,                               label: "Auto Respawn",      cat: "defense" },
    { key: "antistomp",      regex: /anti[\s-]?stomp|anti[\s-]?esmag/i,                             label: "Anti-Stomp",        cat: "defense" },
    { key: "antislow",       regex: /anti[\s-]?slow|anti[\s-]?lentid/i,                             label: "Anti-Slow",         cat: "defense" },
    { key: "freezeimmune",   regex: /freeze\s*immune|imune\s*congel/i,                              label: "Freeze Immune",     cat: "defense" },
    { key: "burnimmune",     regex: /burn\s*immune|imune\s*queim/i,                                 label: "Burn Immune",       cat: "defense" },
    { key: "fallimmune",     regex: /fall\s*immune|imune\s*queda/i,                                 label: "Fall Damage Immune",cat: "defense" },
    { key: "gravityimmune",  regex: /gravity\s*immune|imune\s*gravidade/i,                          label: "Gravity Immune",    cat: "defense" },
    { key: "voidimmune",     regex: /void\s*immune|imune\s*void/i,                                  label: "Void Immune",       cat: "defense" },
    { key: "regeneration",   regex: /regen|regenera[çc][ãa]o/i,                                     label: "Regeneration",      cat: "defense" },
    { key: "shield",         regex: /shield\s*hack|escudo/i,                                        label: "Shield Hack",       cat: "defense" },
    { key: "lifesteal",      regex: /life\s*steal|rouba\s*vida/i,                                   label: "Lifesteal",         cat: "defense" },

    // ═══════════ UTILITY (24) ═══════════
    { key: "stats",          regex: /\bstats\b|fps\b|ping/i,                                        label: "Stats Overlay",     cat: "utility" },
    { key: "rejoin",         regex: /rejoin|reconectar|relogar/i,                                   label: "Rejoin",            cat: "utility" },
    { key: "autorejoin",     regex: /auto\s*rejoin/i,                                               label: "Auto Rejoin",       cat: "utility" },
    { key: "serverhop",      regex: /server\s*hop|trocar\s*servidor/i,                              label: "Server Hop",        cat: "utility" },
    { key: "chatspy",        regex: /chat\s*spy|espiar\s*chat/i,                                    label: "Chat Spy",          cat: "utility" },
    { key: "playerlist",     regex: /player\s*list|lista\s*de\s*player/i,                           label: "Player List",       cat: "utility" },
    { key: "autorespawn2",   regex: /auto\s*respawn|respawn\s*auto|renascer/i,                      label: "Auto Respawn",      cat: "utility" },
    { key: "fastprox",       regex: /instant\s*proximity|proximity\s*fast/i,                        label: "Fast Proximity",    cat: "utility" },
    { key: "serverinfo2",    regex: /full\s*server\s*info|info\s*completa/i,                        label: "Full Server Info",  cat: "utility" },
    { key: "autochat",       regex: /auto\s*chat|chat\s*auto|spam\s*chat/i,                         label: "Auto Chat",         cat: "utility" },
    { key: "chatlogger",     regex: /chat\s*logger|log\s*chat/i,                                    label: "Chat Logger",       cat: "utility" },
    { key: "keybindnotif",   regex: /keybind\s*notif/i,                                             label: "Keybind Notifier",  cat: "utility" },
    { key: "hoverinfo",      regex: /hover\s*info|info\s*hover/i,                                   label: "Hover Info",        cat: "utility" },
    { key: "iteminfo",       regex: /item\s*info|info\s*item/i,                                     label: "Item Info",         cat: "utility" },
    { key: "inspectplayer",  regex: /inspect\s*player|inspecionar\s*player/i,                       label: "Inspect Player",    cat: "utility" },
    { key: "copyid",         regex: /copy\s*id|copiar\s*id/i,                                       label: "Copy User ID",      cat: "utility" },
    { key: "copyjobid",      regex: /copy\s*job\s*id|copiar\s*job/i,                                label: "Copy Job ID",       cat: "utility" },
    { key: "copyscript",     regex: /copy\s*script|copiar\s*script/i,                               label: "Copy Script",       cat: "utility" },
    { key: "waypointmark",   regex: /waypoint\s*mark|marcar\s*waypoint/i,                           label: "Waypoint Mark",     cat: "utility" },
    { key: "speedometer",    regex: /speedometer|veloc[íi]metro/i,                                  label: "Speedometer",       cat: "utility" },
    { key: "coordinates",    regex: /coordinates|coordenadas/i,                                     label: "Coordinates",       cat: "utility" },
    { key: "hotkeys",        regex: /hotkey|atalho/i,                                               label: "Hotkeys Panel",     cat: "utility" },
    { key: "autosave",       regex: /auto\s*save|salva\s*auto/i,                                    label: "Auto Save Config",  cat: "utility" },
    { key: "logevents",      regex: /log\s*events|logar\s*eventos/i,                                label: "Log Events",        cat: "utility" },

    // ═══════════ PLAYERS (14) ═══════════
    { key: "playertp",       regex: /teleport\s*to\s*player|tp\s*player|ir\s*pro\s*player/i,        label: "TP to Player",      cat: "players" },
    { key: "playergoto",     regex: /goto\s*player|ir\s*at[ée]\s*player/i,                          label: "Goto Player",       cat: "players" },
    { key: "playerfollow",   regex: /follow\s*player|seguir\s*player/i,                             label: "Follow Player",     cat: "players" },
    { key: "playerfreeze",   regex: /freeze\s*player|congelar\s*player/i,                           label: "Freeze Player",     cat: "players" },
    { key: "playerkill",     regex: /kill\s*player|matar\s*player/i,                                label: "Kill Player",       cat: "players" },
    { key: "playerfling",    regex: /fling\s*player|arremessar\s*player/i,                          label: "Fling Player",      cat: "players" },
    { key: "playerspectate", regex: /spectate|assistir\s*player/i,                                  label: "Spectate Player",   cat: "players" },
    { key: "playerbring",    regex: /bring\s*player|trazer\s*player/i,                              label: "Bring Player",      cat: "players" },
    { key: "playerkick",     regex: /kick\s*player|expulsar\s*player/i,                             label: "Kick Player",       cat: "players" },
    { key: "playerignore",   regex: /ignore\s*player|ignorar\s*player/i,                            label: "Ignore Player",     cat: "players" },
    { key: "playerfocus",    regex: /focus\s*player|focar\s*player/i,                               label: "Focus Player",      cat: "players" },
    { key: "playertrack",    regex: /track\s*player|rastrear\s*player/i,                            label: "Track Player",      cat: "players" },
    { key: "playercolor",    regex: /color\s*player|colorir\s*player/i,                             label: "Color Player",      cat: "players" },
    { key: "playersound",    regex: /sound\s*player|som\s*player/i,                                 label: "Player Sound",      cat: "players" },

    // ═══════════ WORLD (12) ═══════════
    { key: "nofog",          regex: /no\s*fog|sem\s*neblina/i,                                      label: "No Fog",            cat: "world" },
    { key: "fovchanger",     regex: /fov\s*changer|alterar\s*fov|campo\s*de\s*visao/i,              label: "FOV Changer",       cat: "world" },
    { key: "zoom",           regex: /zoom|camera\s*distance|distancia\s*da\s*camera/i,              label: "Zoom / Camera",     cat: "world" },
    { key: "gravity",        regex: /gravity|gravidade/i,                                           label: "Gravity Control",   cat: "world" },
    { key: "timecontrol",    regex: /time\s*control|controlar\s*tempo|hora\s*do\s*jogo/i,           label: "Time Control",      cat: "world" },
    { key: "weather",        regex: /weather|clima|chuva|neve/i,                                    label: "Weather Control",   cat: "world" },
    { key: "antifog",        regex: /anti\s*fog|anti[\s-]?neblina/i,                                label: "Anti-Fog",          cat: "world" },
    { key: "antiblood",      regex: /no\s*blood|sem\s*sangue/i,                                     label: "No Blood",          cat: "world" },
    { key: "noparticles",    regex: /no\s*particles|sem\s*part[íi]cula/i,                           label: "No Particles",      cat: "world" },
    { key: "nosound",        regex: /no\s*sound|sem\s*som|mudo/i,                                   label: "No Sound",          cat: "world" },
    { key: "noeffects",      regex: /no\s*effects|sem\s*efeito/i,                                   label: "No Effects",        cat: "world" },
    { key: "lagreduce",      regex: /lag\s*reduce|reduce\s*lag|menos\s*lag/i,                       label: "Reduce Lag",        cat: "world" },

    // ═══════════ FUN / TROLL (16) ═══════════
    { key: "emoteall",       regex: /emote\s*all|emote\s*todos/i,                                   label: "Emote All",         cat: "fun" },
    { key: "dance",          regex: /dance|dan[çc]a/i,                                              label: "Dance",             cat: "fun" },
    { key: "sit",            regex: /\bsit\b|sentar/i,                                              label: "Sit",               cat: "fun" },
    { key: "ragdoll",        regex: /ragdoll\s*self|ragdoll\s*proprio/i,                            label: "Ragdoll Self",      cat: "fun" },
    { key: "flingall",       regex: /fling\s*all|arremessa\s*todos/i,                               label: "Fling All",         cat: "fun" },
    { key: "kickall",        regex: /kick\s*all|expulsa\s*todos/i,                                  label: "Kick All (server)", cat: "fun" },
    { key: "freezeall",      regex: /freeze\s*all|congela\s*todos/i,                                label: "Freeze All",        cat: "fun" },
    { key: "bringall",       regex: /bring\s*all|traz\s*todos/i,                                    label: "Bring All",         cat: "fun" },
    { key: "sizehack",       regex: /size\s*hack|tamanho\s*hack|gigante|an[ãa]o/i,                  label: "Size Changer",      cat: "fun" },
    { key: "tinyplayer",     regex: /tiny\s*player|pequenin/i,                                      label: "Tiny Player",       cat: "fun" },
    { key: "giantplayer",    regex: /giant\s*player|gigante/i,                                      label: "Giant Player",      cat: "fun" },
    { key: "rainbow",        regex: /rainbow|arco[\s-]?[íi]ris/i,                                   label: "Rainbow Aura",      cat: "fun" },
    { key: "trailaura",      regex: /trail\s*aura|rastro\s*aura/i,                                  label: "Trail Aura",        cat: "fun" },
    { key: "skydive",        regex: /skydive|paraquedas/i,                                          label: "Skydive",           cat: "fun" },
    { key: "spamchat",       regex: /spam\s*chat|spam\s*mensage/i,                                  label: "Spam Chat",         cat: "fun" },
    { key: "fakechat",       regex: /fake\s*chat|chat\s*fake|chat\s*falso/i,                        label: "Fake Chat",         cat: "fun" },
];

// ═══════════════════════════════════════════════════════════════
// SISTEMA DE ABAS — detecta se o user quer painel com abas
// ═══════════════════════════════════════════════════════════════
function wantsTabsMode(prompt) {
    const p = (prompt || "").toLowerCase();
    // Detecta "painel gui com abas", "painel com abas", "tabs", "aba", "abas"
    return /\b(painel|gui|menu|interface)\b.*\babas?\b/i.test(p)
        || /\btabs?\b/i.test(p)
        || /\babas?\b/i.test(p)
        || /\bcom\s+abas?\b/i.test(p);
}

// Conta quantas features foram pedidas pra ajustar tamanho do painel
function getPanelSize(featureCount, isMobile, hasTabs) {
    if (isMobile) {
        if (hasTabs) return { w: 340, h: Math.min(560, 380 + featureCount * 12) };
        return { w: 300, h: Math.min(520, 320 + featureCount * 15) };
    } else {
        if (hasTabs) return { w: Math.min(1100, 700 + featureCount * 15), h: Math.min(720, 500 + featureCount * 10) };
        return { w: 480, h: Math.min(600, 420 + featureCount * 12) };
    }
        }
