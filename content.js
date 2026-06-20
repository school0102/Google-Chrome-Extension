(() => {
  if (window.__ESCRITOR_BAIANO_INJETADO__) {
    const btn = document.getElementById("eb-open-panel");
    const panel = document.getElementById("eb-panel");
    if (btn) btn.style.display = "flex";
    if (panel) panel.classList.add("eb-show");
    return;
  }

  window.__ESCRITOR_BAIANO_INJETADO__ = true;

  let lastFocusedElement = null;
  let savedText = localStorage.getItem("eb_saved_text") || "";
  let history = JSON.parse(localStorage.getItem("eb_history") || "[]");
  let panelScale = Number(localStorage.getItem("eb_panel_scale") || "0.88");
  let typingSpeed = Number(localStorage.getItem("eb_typing_speed") || "50");
  let panelPos = JSON.parse(localStorage.getItem("eb_panel_pos") || "null");
  let stopTypingRequested = false;
  let typingActive = false;
  let typingTimeout = null;

  const BACKEND_URL = "https://meulindobackend.onrender.com/generate";

  const OPENROUTER_MODELS = [
    "nex-agi/nex-n2-pro:free",
    "nvidia/llama-nemotron-rerank-vl-1b-v2:free",
    "nvidia/nemotron-3-ultra-550b-a55b:free"
  ];

  const DEFAULT_AI_INSTRUCTIONS = [
    { id: "ptbr", label: "Português brasileiro", text: "Escreva sempre em português brasileiro." },
    { id: "humanizado", label: "Humanizar texto", text: "Humanize o texto e escreva como uma pessoa real." },
    { id: "paragrafos", label: "Parágrafos naturais", text: "Use parágrafos naturais, sem pular duas linhas entre os parágrafos." },
    { id: "sem_markdown", label: "Sem markdown", text: "Não use markdown, títulos desnecessários, listas ou tópicos a menos que o usuário peça." },
    { id: "redacao", label: "Modo redação", text: "Quando o usuário pedir uma redação, faça introdução, desenvolvimento e conclusão de forma natural." },
    { id: "gramatica", label: "Boa gramática", text: "Mantenha boa gramática e desenvolva bem as ideias." }
  ];

  let aiInstructionStates = JSON.parse(localStorage.getItem("eb_ai_instruction_states") || "null")
    || Object.fromEntries(DEFAULT_AI_INSTRUCTIONS.map(item => [item.id, true]));

  let aiCustomInstructions = localStorage.getItem("eb_ai_custom_instructions") || "";

  let selectedModelIndex = Number(localStorage.getItem("eb_selected_model_index") || "0");
  if (!OPENROUTER_MODELS[selectedModelIndex]) selectedModelIndex = 0;

  let lastUsedModel = localStorage.getItem("eb_last_used_model") || "Nenhum ainda";
  let lastFallbackInfo = localStorage.getItem("eb_last_fallback_info") || "Modelo principal";

  function isEditable(el) {
    if (!el) return false;
    const tag = el.tagName ? el.tagName.toLowerCase() : "";
    return tag === "textarea" || tag === "input" || el.isContentEditable;
  }

  document.addEventListener("focusin", (e) => {
    const root = document.getElementById("eb-root");
    if (root && root.contains(e.target)) return;
    if (isEditable(e.target)) lastFocusedElement = e.target;
  }, true);

  const root = document.createElement("div");
  root.id = "eb-root";

  root.innerHTML = `
    <style>
      #eb-root, #eb-root * {
        box-sizing: border-box !important;
        font-family: Inter, Arial, Helvetica, sans-serif !important;
      }

      @keyframes ebPanelOpen {
        0% {
          opacity: 0;
          transform: translateY(22px) scale(.96);
          filter: blur(3px);
        }
        100% {
          opacity: 1;
          transform: translateY(0) scale(1);
          filter: blur(0);
        }
      }

      @keyframes ebPanelClose {
        0% {
          opacity: 1;
          transform: translateY(0) scale(1);
          filter: blur(0);
        }
        100% {
          opacity: 0;
          transform: translateY(24px) scale(.96);
          filter: blur(3px);
        }
      }

      @keyframes ebFadeUp {
        0% {
          opacity: 0;
          transform: translateY(12px);
        }
        100% {
          opacity: 1;
          transform: translateY(0);
        }
      }

      @keyframes ebSoftPulse {
        0%, 100% {
          box-shadow: 0 0 0 rgba(59,156,255,0);
        }
        50% {
          box-shadow: 0 0 22px rgba(59,156,255,.34);
        }
      }

      @keyframes ebAvatarGlow {
        0%, 100% {
          box-shadow: 0 0 24px rgba(59,156,255,.32);
        }
        50% {
          box-shadow: 0 0 36px rgba(59,156,255,.62);
        }
      }

      @keyframes ebDotPulse {
        0%, 100% {
          transform: scale(1);
          opacity: 1;
        }
        50% {
          transform: scale(1.35);
          opacity: .7;
        }
      }

      @keyframes ebButtonShine {
        0% { left: -90%; }
        100% { left: 130%; }
      }

      @keyframes ebToastIn {
        from {
          opacity: 0;
          transform: translateY(14px) scale(.97);
        }
        to {
          opacity: 1;
          transform: translateY(0) scale(1);
        }
      }

      @keyframes ebToastOut {
        from {
          opacity: 1;
          transform: translateY(0) scale(1);
        }
        to {
          opacity: 0;
          transform: translateY(14px) scale(.97);
        }
      }

      #eb-open-panel {
        position: fixed !important;
        right: 22px !important;
        bottom: 22px !important;
        width: 52px !important;
        height: 52px !important;
        min-width: 52px !important;
        min-height: 52px !important;
        padding: 0 !important;
        border-radius: 50% !important;
        font-size: 24px !important;
        line-height: 1 !important;
        display: flex !important;
        align-items: center !important;
        justify-content: center !important;
        z-index: 2147483647 !important;
      }

      #eb-open-panel:hover {
        transform: translateY(-2px) scale(1.03) !important;
        filter: brightness(1.08) !important;
        box-shadow: 0 18px 44px rgba(47,156,255,.48) !important;
      }

      #eb-open-panel:active {
        transform: scale(.96) !important;
      }

      #eb-panel {
        position: fixed !important;
        right: 24px !important;
        bottom: 84px !important;
        z-index: 2147483645 !important;
        width: min(920px, calc(100vw - 48px)) !important;
        height: min(590px, calc(100vh - 112px)) !important;
        min-width: 720px !important;
        min-height: 500px !important;
        background:
          radial-gradient(circle at 22% 0%,rgba(47,156,255,.18),transparent 34%),
          radial-gradient(circle at 90% 20%,rgba(34,197,94,.08),transparent 30%),
          linear-gradient(135deg,#020817,#06142d 55%,#020817) !important;
        color: #f4f8ff !important;
        border: 1px solid rgba(81,143,223,.32) !important;
        border-radius: 18px !important;
        overflow: hidden !important;
        box-shadow: 0 24px 100px rgba(0,0,0,.62), inset 0 1px 0 rgba(255,255,255,.06) !important;
        display: none;
        resize: both !important;
      }

      #eb-panel.eb-show {
        display: block !important;
        animation: ebPanelOpen .26s cubic-bezier(.2,.9,.25,1) !important;
      }

      #eb-panel.eb-closing {
        display: block !important;
        animation: ebPanelClose .22s ease forwards !important;
      }

      .eb-dragbar {
        position: absolute !important;
        left: 0 !important;
        top: 0 !important;
        right: 0 !important;
        height: 26px !important;
        cursor: move !important;
        z-index: 5 !important;
        background: rgba(3,12,30,.58) !important;
        border-bottom: 1px solid rgba(255,255,255,.07) !important;
        display: flex !important;
        align-items: center !important;
        justify-content: center !important;
        color: #7fc2ff !important;
        font-size: 11px !important;
        font-weight: 900 !important;
        letter-spacing: .8px !important;
        transition: background .18s ease, color .18s ease !important;
      }

      .eb-dragbar:hover {
        background: rgba(12,35,78,.72) !important;
        color: #b9dcff !important;
      }

      .eb-app {
        width: 100% !important;
        height: 100% !important;
        padding-top: 26px !important;
        display: grid !important;
        grid-template-columns: 160px 205px minmax(0, 1fr) !important;
        gap: 14px !important;
      }

      .eb-app.eb-wide {
        grid-template-columns: 160px minmax(0, 1fr) !important;
      }

      .eb-sidebar {
        background: rgba(2,10,24,.72) !important;
        border-right: 1px solid rgba(92,155,255,.17) !important;
        padding: 22px 10px 10px !important;
        position: relative !important;
        overflow: hidden !important;
        transition: transform .16s ease, border-color .16s ease, background .16s ease !important;
      }

      .eb-stat-card:hover {
        transform: translateY(-2px) !important;
        background: rgba(13,36,76,.88) !important;
        border-color: rgba(59,156,255,.34) !important;
      }

      .eb-brand {
        display: flex !important;
        align-items: center !important;
        gap: 8px !important;
        margin: 0 0 24px 4px !important;
      }

      .eb-feather {
        font-size: 24px !important;
        filter: drop-shadow(0 0 10px rgba(59,156,255,.35)) !important;
      }

      .eb-brand-text {
        font-size: 15px !important;
        line-height: 16px !important;
        font-weight: 950 !important;
        color: white !important;
        letter-spacing: .3px !important;
      }

      .eb-brand-text span { color: #46a6ff !important; }

      .eb-nav-item {
        height: 40px !important;
        display: flex !important;
        align-items: center !important;
        gap: 8px !important;
        padding: 0 10px !important;
        border-radius: 10px !important;
        color: white !important;
        font-size: 12px !important;
        font-weight: 850 !important;
        margin-bottom: 8px !important;
        cursor: pointer !important;
        user-select: none !important;
        transition: transform .16s ease, background .16s ease, box-shadow .16s ease, filter .16s ease !important;
      }

      .eb-nav-item:hover {
        background: rgba(53,162,255,.11) !important;
        transform: translateX(3px) !important;
      }

      .eb-nav-item.eb-active {
        background: linear-gradient(135deg,#176ed2,#2b72d8) !important;
        box-shadow: 0 10px 24px rgba(27,110,210,.26), inset 0 1px 0 rgba(255,255,255,.13) !important;
      }

      .eb-nav-icon {
        font-size: 17px !important;
        width: 20px !important;
        text-align: center !important;
      }

      .eb-version {
        position: absolute !important;
        left: 10px !important;
        right: 10px !important;
        bottom: 10px !important;
        padding: 10px !important;
        height: 58px !important;
        border: 1px solid rgba(92,155,255,.18) !important;
        border-radius: 12px !important;
        background: rgba(5,18,42,.72) !important;
        display: flex !important;
        gap: 9px !important;
        align-items: center !important;
        color: white !important;
      }


      .eb-version-simple {
        position: absolute !important;
        left: 18px !important;
        bottom: 18px !important;
        color: #8fb7e8 !important;
        font-size: 12px !important;
        font-weight: 800 !important;
        opacity: .9 !important;
      }

      .eb-info-circle {
        width: 30px !important;
        height: 30px !important;
        border-radius: 50% !important;
        border: 2px solid #3b9cff !important;
        color: #3b9cff !important;
        display: flex !important;
        align-items: center !important;
        justify-content: center !important;
        font-weight: 900 !important;
        font-size: 16px !important;
      }

      .eb-version strong { color: #35a2ff !important; font-size: 11px !important; }
      .eb-version p { margin-top: 2px !important; color: white !important; font-size: 11px !important; }

      .eb-profile {
        padding: 14px 0 14px !important;
        min-width: 0 !important;
        overflow: hidden !important;
      }

      .eb-profile-card {
        height: 100% !important;
        animation: ebFadeUp .32s ease both !important;
        border: 1px solid rgba(81,143,223,.24) !important;
        border-radius: 14px !important;
        padding: 16px 12px !important;
        background: linear-gradient(180deg,rgba(11,28,59,.88),rgba(7,18,40,.9)) !important;
        box-shadow: inset 0 1px 0 rgba(255,255,255,.04) !important;
        overflow: hidden !important;
      }

      .eb-avatar-big {
        display: block !important;
        width: 104px !important;
        height: 104px !important;
        margin: 0 auto 11px !important;
        border-radius: 50% !important;
        border: 3px solid #3b9cff !important;
        object-fit: cover !important;
        box-shadow: 0 0 24px rgba(59,156,255,.32) !important;
        animation: ebAvatarGlow 2.8s ease-in-out infinite !important;
        transition: transform .2s ease, filter .2s ease !important;
      }

      .eb-avatar-big:hover {
        transform: scale(1.04) rotate(-1deg) !important;
        filter: brightness(1.08) !important;
      }

      .eb-profile-name {
        text-align: center !important;
        font-size: 16px !important;
        font-weight: 950 !important;
        margin-bottom: 6px !important;
        color: white !important;
      }

      .eb-badge {
        width: max-content !important;
        max-width: 100% !important;
        margin: 0 auto 10px !important;
        color: #45a8ff !important;
        background: rgba(45,138,255,.16) !important;
        padding: 4px 9px !important;
        border-radius: 999px !important;
        font-size: 11px !important;
      }

      .eb-profile-desc {
        color: #d0d8e6 !important;
        line-height: 16px !important;
        font-size: 11px !important;
        width: 150px !important;
        max-width: 100% !important;
        margin: 0 auto 10px !important;
        text-align: center !important;
      }

      .eb-stat-card {
        height: 47px !important;
        border-radius: 10px !important;
        border: 1px solid rgba(255,255,255,.07) !important;
        background: rgba(9,25,53,.72) !important;
        display: flex !important;
        align-items: center !important;
        gap: 9px !important;
        padding: 0 10px !important;
        margin-bottom: 7px !important;
        overflow: hidden !important;
      }

      .eb-stat-icon { width: 20px !important; font-size: 17px !important; color: #b9c8df !important; flex:0 0 20px !important; }
      .eb-stat-label { color: #c5d0df !important; font-size: 10px !important; white-space: nowrap !important; }
      .eb-stat-value { font-size: 11px !important; font-weight: 900 !important; margin-top: 2px !important; color: #22c764 !important; white-space: nowrap !important; }
      .eb-blue { color: #3da1ff !important; }
      .eb-purple { color: #a855f7 !important; }

      .eb-theme-card {
        height: 38px !important;
        border-radius: 10px !important;
        border: 1px solid rgba(255,255,255,.08) !important;
        background: rgba(9,25,53,.72) !important;
        display: flex !important;
        align-items: center !important;
        justify-content: space-between !important;
        padding: 0 9px !important;
        margin-top: 8px !important;
        font-size: 10px !important;
        overflow: hidden !important;
      }

      .eb-toggle {
        width: 31px !important;
        height: 18px !important;
        background: #2e97ff !important;
        border-radius: 999px !important;
        position: relative !important;
        flex:0 0 31px !important;
      }

      .eb-toggle:after {
        content: "" !important;
        width: 12px !important;
        height: 12px !important;
        background: white !important;
        border-radius: 50% !important;
        position: absolute !important;
        right: 3px !important;
        top: 3px !important;
      }

      .eb-main {
        padding: 14px 14px 12px 0 !important;
        display: flex !important;
        flex-direction: column !important;
        min-width: 0 !important;
        overflow: hidden !important;
      }

      .eb-app.eb-wide .eb-main {
        padding-left: 0 !important;
      }

      .eb-writer-panel {
        flex: 1 !important;
        animation: ebFadeUp .34s ease both !important;
        min-height: 0 !important;
        border-radius: 14px !important;
        border: 1px solid rgba(81,143,223,.24) !important;
        background: linear-gradient(180deg,rgba(9,24,52,.92),rgba(6,16,36,.96)) !important;
        padding: 18px !important;
        overflow: hidden !important;
      }

      .eb-app.eb-wide .eb-writer-panel {
        padding: 22px !important;
      }

      .eb-header {
        display: flex !important;
        justify-content: space-between !important;
        align-items: flex-start !important;
        gap: 12px !important;
        margin-bottom: 12px !important;
      }

      .eb-heading {
        display: flex !important;
        align-items: center !important;
        gap: 10px !important;
        min-width: 0 !important;
      }

      .eb-heading-icon { font-size: 25px !important; color: #3aa1ff !important; flex:0 0 auto !important; }
      .eb-heading h1 { font-size: 22px !important; color: #429dff !important; letter-spacing: .4px !important; white-space: nowrap !important; }

      .eb-help {
        height: 31px !important;
        padding: 0 10px !important;
        border-radius: 8px !important;
        border: 1px solid rgba(255,255,255,.08) !important;
        background: rgba(10,26,56,.8) !important;
        color: #eaf2ff !important;
        display: flex !important;
        align-items: center !important;
        gap: 6px !important;
        font-size: 11px !important;
        white-space: nowrap !important;
      }

      .eb-desc {
        color: #e3e8f2 !important;
        font-size: 12px !important;
        line-height: 18px !important;
        margin-bottom: 13px !important;
      }

      #eb-text {
        width: 100% !important;
        height: clamp(185px, 31vh, 248px) !important;
        resize: none !important;
        outline: none !important;
        border-radius: 12px !important;
        border: 1.5px solid #2e96ff !important;
        color: white !important;
        background: linear-gradient(145deg,rgba(11,29,59,.9),rgba(8,21,45,.95)) !important;
        padding: 13px !important;
        font-size: 14px !important;
        line-height: 21px !important;
        transition: border-color .18s ease, box-shadow .18s ease, transform .18s ease !important;
      }

      #eb-text {
        scrollbar-width: thin !important;
        scrollbar-color: rgba(59,156,255,.58) transparent !important;
      }

      #eb-text::-webkit-scrollbar {
        width: 9px !important;
      }

      #eb-text::-webkit-scrollbar-thumb {
        background: rgba(59,156,255,.58) !important;
        border-radius: 999px !important;
        border: 2px solid rgba(8,24,53,.82) !important;
      }

      #eb-text::-webkit-scrollbar-track {
        background: rgba(255,255,255,.04) !important;
        border-radius: 999px !important;
      }

      #eb-text:focus {
        border-color: #60b5ff !important;
        box-shadow: 0 0 0 3px rgba(59,156,255,.16), inset 0 0 28px rgba(0,0,0,.18) !important;
      }

      #eb-text::placeholder { color: #8494aa !important; }

      .eb-actions {
        display: grid !important;
        grid-template-columns: 1.25fr .68fr !important;
        gap: 16px !important;
        margin-top: 15px !important;
      }

      .eb-action-btn {
        height: 42px !important;
        border: none !important;
        border-radius: 10px !important;
        font-size: 15px !important;
        font-weight: 950 !important;
        color: white !important;
        cursor: pointer !important;
        transition: transform .16s ease, filter .16s ease, box-shadow .16s ease !important;
        position: relative !important;
        overflow: hidden !important;
      }

      .eb-action-btn::after {
        content: "" !important;
        position: absolute !important;
        top: 0 !important;
        left: -90% !important;
        width: 42% !important;
        height: 100% !important;
        background: linear-gradient(90deg,transparent,rgba(255,255,255,.28),transparent) !important;
        transform: skewX(-18deg) !important;
      }

      .eb-action-btn:hover::after {
        animation: ebButtonShine .65s ease !important;
      }

      .eb-action-btn:hover { filter: brightness(1.08) !important; transform: translateY(-2px) !important; }
      .eb-action-btn:active { transform: scale(.97) !important; }
      .eb-start { background: linear-gradient(135deg,#21c965,#22b85a) !important; box-shadow:0 10px 24px rgba(34,199,100,.16) !important; }
      .eb-clear { background: linear-gradient(135deg,#d3344a,#c52b40) !important; box-shadow:0 10px 24px rgba(207,47,69,.13) !important; }

      .eb-bottom-status {
        margin-top: 15px !important;
        min-height: 58px !important;
        border: 1px solid rgba(255,255,255,.07) !important;
        background: rgba(6,18,40,.82) !important;
        border-radius: 12px !important;
        display: grid !important;
        grid-template-columns: 1.35fr 1fr 1fr 1fr !important;
        align-items: center !important;
        overflow: hidden !important;
      }

      .eb-status-box {
        height: 35px !important;
        padding: 0 10px !important;
        display: flex !important;
        gap: 7px !important;
        align-items: flex-start !important;
        border-right: 1px solid rgba(255,255,255,.13) !important;
        overflow: hidden !important;
      }

      .eb-status-box:last-child { border-right: none !important; }
      .eb-dot {
        width: 9px !important;
        height: 9px !important;
        margin-top: 6px !important;
        border-radius: 50% !important;
        background: #22c764 !important;
        flex:0 0 9px !important;
        animation: ebDotPulse 1.6s ease-in-out infinite !important;
      }
      .eb-mini-icon { color: #c0ccdc !important; font-size: 14px !important; margin-top: 2px !important; flex:0 0 auto !important; }
      .eb-status-title { color: #bac4d4 !important; font-size: 10px !important; margin-bottom: 3px !important; white-space: nowrap !important; }
      .eb-status-main { color: white !important; font-size: 11px !important; white-space: nowrap !important; overflow: hidden !important; text-overflow: ellipsis !important; max-width: 120px !important; }

      .eb-notice {
        margin-top: 10px !important;
        min-height: 34px !important;
        border: 1px solid rgba(81,143,223,.22) !important;
        border-radius: 11px !important;
        background: rgba(8,24,53,.82) !important;
        display: flex !important;
        align-items: center !important;
        gap: 8px !important;
        padding: 8px 13px !important;
        color: #dfe7f3 !important;
        font-size: 11px !important;
        line-height: 15px !important;
      }

      .eb-notice span { color: #35a2ff !important; font-weight: 900 !important; white-space: nowrap !important; }

      .eb-page { display: none !important; height: 100% !important; min-height: 0 !important; }
      .eb-page.eb-page-active {
        display: flex !important;
        flex-direction: column !important;
        animation: ebFadeUp .22s ease both !important;
      }

      #eb-page-ai {
        overflow-y: auto !important;
        overflow-x: hidden !important;
        padding-right: 8px !important;
      }

      #eb-page-ai::-webkit-scrollbar,
      .eb-settings-one-card::-webkit-scrollbar {
        width: 8px !important;
      }

      #eb-page-ai::-webkit-scrollbar-thumb,
      .eb-settings-one-card::-webkit-scrollbar-thumb {
        background: rgba(59,156,255,.45) !important;
        border-radius: 999px !important;
      }

      #eb-page-ai::-webkit-scrollbar-track,
      .eb-settings-one-card::-webkit-scrollbar-track {
        background: transparent !important;
      }

      .eb-wide-content {
        flex: 1 !important;
        min-height: 0 !important;
        display: grid !important;
        gap: 14px !important;
      }

      #eb-ai-prompt,
      #eb-ai-result {
        width: 100% !important;
        resize: none !important;
        outline: none !important;
        border-radius: 12px !important;
        border: 1.5px solid #2e96ff !important;
        color: white !important;
        background: linear-gradient(145deg,rgba(11,29,59,.9),rgba(8,21,45,.95)) !important;
        padding: 13px !important;
        font-size: 14px !important;
        line-height: 21px !important;
        transition: border-color .18s ease, box-shadow .18s ease, transform .18s ease !important;
      }

      #eb-ai-prompt {
        height: 210px !important;
      }

      #eb-ai-result {
        height: 300px !important;
        margin-top: 10px !important;
      }

      #eb-ai-prompt:focus,
      #eb-ai-result:focus {
        border-color: #60b5ff !important;
        box-shadow: 0 0 0 3px rgba(59,156,255,.16), inset 0 0 28px rgba(0,0,0,.18) !important;
      }

      #eb-ai-prompt::placeholder,
      #eb-ai-result::placeholder {
        color: #8494aa !important;
      }


      #eb-ai-progress-wrap {
        width: 100% !important;
        height: 10px !important;
        background: rgba(255,255,255,.08) !important;
        border-radius: 999px !important;
        overflow: hidden !important;
        margin: 8px 0 4px !important;
      }

      #eb-ai-progress-bar {
        width: 0% !important;
        height: 100% !important;
        border-radius: 999px !important;
        background: linear-gradient(90deg,#35a2ff,#4fb4ff) !important;
        transition: width .25s ease !important;
      }

      #eb-ai-progress-text {
        color: #9ccfff !important;
        font-size: 11px !important;
        font-weight: 900 !important;
        margin-bottom: 10px !important;
      }

      #eb-ai-progress-wrap {
        width: 100% !important;
        height: 12px !important;
        background: rgba(255,255,255,.08) !important;
        border-radius: 999px !important;
        overflow: hidden !important;
        margin: 8px 0 6px !important;
        border: 1px solid rgba(59,156,255,.22) !important;
      }

      #eb-ai-progress-bar {
        display: block !important;
        width: 0%;
        min-width: 0 !important;
        height: 100% !important;
        border-radius: 999px !important;
        background: linear-gradient(90deg,#22c55e,#35a2ff,#4fb4ff) !important;
        box-shadow: 0 0 14px rgba(53,162,255,.55) !important;
        transition: width .45s ease !important;
      }

      #eb-ai-progress-text{
        color:#9ccfff;
        font-size:11px;
        font-weight:900;
        margin-bottom:10px;
      }

      .eb-ai-label {
        color: #dbeafe !important;
        font-size: 12px !important;
        font-weight: 900 !important;
        margin: 8px 0 7px !important;
      }

      .eb-ai-actions {
        display: grid !important;
        grid-template-columns: 1fr 1fr !important;
        gap: 14px !important;
        margin-top: 14px !important;
      }


      .eb-ai-model-info {
        margin: 8px 0 12px !important;
        padding: 8px 10px !important;
        border-radius: 10px !important;
        border: 1px solid rgba(81,143,223,.22) !important;
        background: rgba(8,24,53,.72) !important;
        color: #dfe7f3 !important;
        font-size: 11px !important;
        line-height: 15px !important;
        white-space: nowrap !important;
        overflow: hidden !important;
        text-overflow: ellipsis !important;
      }

      .eb-ai-model-info b { color: #62b3ff !important; }

      .eb-ai-check-list {
        display: grid !important;
        gap: 8px !important;
      }

      .eb-ai-check {
        display: flex !important;
        align-items: center !important;
        gap: 9px !important;
        padding: 9px 10px !important;
        border-radius: 10px !important;
        border: 1px solid rgba(81,143,223,.18) !important;
        background: rgba(7,20,44,.72) !important;
        color: #e7eefb !important;
        font-size: 12px !important;
        font-weight: 800 !important;
        cursor: pointer !important;
      }

      .eb-ai-check input {
        width: 15px !important;
        height: 15px !important;
        accent-color: #3b9cff !important;
      }

      #eb-ai-custom-instructions,
      #eb-ai-model-select {
        width: 100% !important;
        outline: none !important;
        border-radius: 10px !important;
        border: 1.5px solid #2e96ff !important;
        color: white !important;
        background: rgba(8,21,45,.95) !important;
        padding: 10px !important;
        font-size: 12px !important;
      }

      #eb-ai-custom-instructions {
        height: 90px !important;
        resize: vertical !important;
        line-height: 17px !important;
      }

      #eb-ai-reset-instructions { margin-top: 10px !important; }

      .eb-history-clear-btn {
        height: 32px !important;
        padding: 0 13px !important;
        border: none !important;
        border-radius: 9px !important;
        background: linear-gradient(135deg,#d3344a,#c52b40) !important;
        color: white !important;
        font-size: 12px !important;
        font-weight: 900 !important;
        cursor: pointer !important;
        transition: transform .16s ease, filter .16s ease, box-shadow .16s ease !important;
        box-shadow: 0 10px 22px rgba(207,47,69,.16) !important;
        white-space: nowrap !important;
      }

      .eb-history-clear-btn:hover {
        filter: brightness(1.08) !important;
        transform: translateY(-1px) !important;
      }

      .eb-history-clear-btn:active {
        transform: scale(.97) !important;
      }

      .eb-history-list {
        flex: 1 !important;
        min-height: 0 !important;
        overflow: auto !important;
        padding-right: 5px !important;
        display: grid !important;
        grid-template-columns: repeat(auto-fill, minmax(190px, 1fr)) !important;
        gap: 12px !important;
        align-content: start !important;
      }

      .eb-history-item {
        background: rgba(9,25,53,.72) !important;
        border: 1px solid rgba(81,143,223,.20) !important;
        border-radius: 12px !important;
        padding: 12px !important;
        color: #dfe7f3 !important;
        font-size: 12px !important;
        line-height: 17px !important;
        cursor: pointer !important;
        min-height: 85px !important;
        overflow: hidden !important;
        transition:.15s ease !important;
      }

      .eb-history-item:hover {
        background: rgba(18,46,94,.88) !important;
        border-color: rgba(59,156,255,.45) !important;
        transform: translateY(-1px) !important;
      }

      .eb-history-date {
        color: #62b3ff !important;
        font-weight: 900 !important;
        font-size: 11px !important;
        margin-bottom: 8px !important;
      }

      .eb-history-text {
        color: #e7eefb !important;
        font-size: 12px !important;
        line-height: 17px !important;
      }

      .eb-settings-grid {
        flex: 1 !important;
        min-height: 0 !important;
        display: grid !important;
        grid-template-columns: repeat(auto-fit, minmax(210px, 1fr)) !important;
        gap: 14px !important;
        align-content: start !important;
      }

      .eb-config-row {
        background: rgba(9,25,53,.72) !important;
        border: 1px solid rgba(81,143,223,.20) !important;
        border-radius: 14px !important;
        padding: 16px !important;
        color: #dfe7f3 !important;
        min-height: 105px !important;
        overflow: hidden !important;
      }

      .eb-config-row label {
        display: block !important;
        font-size: 13px !important;
        margin-bottom: 12px !important;
        font-weight: 900 !important;
        color: white !important;
      }

      .eb-config-row input[type="range"] {
        width: 100% !important;
        accent-color: #3b9cff !important;
      }

      .eb-config-row button {
        width: 100% !important;
        height: 40px !important;
        border: none !important;
        border-radius: 10px !important;
        background: linear-gradient(135deg,#2563eb,#3b82f6) !important;
        color: white !important;
        font-weight: 900 !important;
        cursor: pointer !important;
        font-size: 13px !important;
      }

      .eb-config-muted {
        color:#a8b7cc !important;
        font-size: 11px !important;
        line-height: 16px !important;
        margin-top: 9px !important;
      }


      #eb-toast {
        position: fixed !important;
        right: 22px !important;
        bottom: 84px !important;
        z-index: 2147483647 !important;
        max-width: 360px !important;
        padding: 14px 16px !important;
        border-radius: 14px !important;
        background: linear-gradient(135deg,rgba(9,25,53,.96),rgba(13,38,80,.96)) !important;
        border: 1px solid rgba(59,156,255,.35) !important;
        color: white !important;
        font-size: 14px !important;
        font-weight: 800 !important;
        line-height: 20px !important;
        box-shadow: 0 18px 50px rgba(0,0,0,.45), 0 0 28px rgba(59,156,255,.18) !important;
        display: none !important;
      }

      #eb-toast.eb-toast-show {
        display: block !important;
        animation: ebToastIn .2s ease-out !important;
      }


      #eb-toast.eb-toast-hide {
        display: block !important;
        animation: ebToastOut .22s ease forwards !important;
      }

      #eb-page-settings {
        overflow: hidden !important;
        min-height: 0 !important;
      }

      #eb-page-settings .eb-header {
        flex: 0 0 auto !important;
      }

      #eb-page-settings .eb-desc {
        flex: 0 0 auto !important;
      }

      .eb-settings-one-card {
        height: calc(100% - 92px) !important;
        max-height: calc(100% - 92px) !important;
        min-height: 0 !important;
        overflow-y: auto !important;
        overflow-x: hidden !important;
        padding: 16px !important;
        padding-right: 10px !important;
        border-radius: 14px !important;
        border: 1px solid rgba(81,143,223,.26) !important;
        background: linear-gradient(180deg,rgba(9,25,53,.82),rgba(6,18,40,.82)) !important;
        scrollbar-width: thin !important;
        scrollbar-color: rgba(59,156,255,.55) transparent !important;
      }

      .eb-settings-one-card::-webkit-scrollbar {
        width: 9px !important;
      }

      .eb-settings-one-card::-webkit-scrollbar-thumb {
        background: rgba(59,156,255,.58) !important;
        border-radius: 999px !important;
        border: 2px solid rgba(8,24,53,.82) !important;
      }

      .eb-settings-one-card::-webkit-scrollbar-track {
        background: rgba(255,255,255,.04) !important;
        border-radius: 999px !important;
      }

      .eb-settings-title {
        font-size: 13px !important;
        font-weight: 950 !important;
        color: #49a8ff !important;
        letter-spacing: .2px !important;
        margin: 2px 0 10px !important;
        font-family: Inter, Arial, Helvetica, sans-serif !important;
      }

      .eb-settings-line label,
      .eb-ai-check span,
      .eb-ai-check,
      #eb-ai-model-select,
      #eb-ai-custom-instructions {
        font-family: Inter, Arial, Helvetica, sans-serif !important;
        font-weight: 850 !important;
      }

      .eb-ai-check {
        min-height: 38px !important;
        border-radius: 11px !important;
        padding: 9px 11px !important;
        background: rgba(7,20,44,.74) !important;
        border: 1px solid rgba(81,143,223,.25) !important;
      }

      .eb-ai-check span {
        color: #f4f8ff !important;
        font-size: 12px !important;
      }

      .eb-ai-check input {
        appearance: auto !important;
        width: 15px !important;
        height: 15px !important;
        accent-color: #3b9cff !important;
        flex: 0 0 auto !important;
      }

      #eb-ai-model-select {
        height: 36px !important;
        font-size: 12px !important;
      }

      #eb-ai-custom-instructions {
        min-height: 105px !important;
        font-size: 12px !important;
        color: #f4f8ff !important;
      }


      /* ===== FIX FINAL: scroll da IA + fonte das configurações ===== */

      #eb-page-ai.eb-page-active {
        display: flex !important;
        flex-direction: column !important;
        min-height: 0 !important;
        overflow: hidden !important;
      }

      #eb-page-ai .eb-header,
      #eb-page-ai .eb-desc,
      #eb-page-ai .eb-ai-model-info {
        flex: 0 0 auto !important;
      }

      .eb-page-ai-scroll {
        flex: 1 1 auto !important;
        min-height: 0 !important;
        overflow-y: auto !important;
        overflow-x: hidden !important;
        padding-right: 9px !important;
        scrollbar-width: thin !important;
        scrollbar-color: rgba(59,156,255,.58) transparent !important;
      }

      .eb-page-ai-scroll::-webkit-scrollbar {
        width: 9px !important;
      }

      .eb-page-ai-scroll::-webkit-scrollbar-thumb {
        background: rgba(59,156,255,.58) !important;
        border-radius: 999px !important;
        border: 2px solid rgba(8,24,53,.82) !important;
      }

      .eb-page-ai-scroll::-webkit-scrollbar-track {
        background: rgba(255,255,255,.04) !important;
        border-radius: 999px !important;
      }

      #eb-ai-prompt {
        height: 220px !important;
        min-height: 220px !important;
      }

      #eb-ai-result {
        height: 320px !important;
        min-height: 320px !important;
      }

      #eb-page-ai .eb-ai-model-info {
        margin: 8px 0 12px !important;
        padding: 6px 10px !important;
        min-height: 28px !important;
        font-size: 11px !important;
        line-height: 14px !important;
      }

      #eb-page-settings,
      #eb-page-settings *,
      .eb-settings-one-card,
      .eb-settings-one-card *,
      .eb-ai-check,
      .eb-ai-check span,
      #eb-ai-model-select,
      #eb-ai-custom-instructions {
        font-family: inherit !important;
      }

      .eb-ai-check span {
        color: white !important;
        font-size: 12px !important;
        font-weight: 900 !important;
        letter-spacing: 0 !important;
      }

      .eb-settings-title {
        font-family: inherit !important;
        font-size: 13px !important;
        font-weight: 950 !important;
        color: #49a8ff !important;
      }

      .eb-settings-line label {
        font-family: inherit !important;
        font-size: 12px !important;
        font-weight: 900 !important;
        color: white !important;
      }

      
      .eb-setting-label {
        width: 145px !important;
        min-width: 145px !important;
        color: white !important;
        font-size: 12px !important;
        font-weight: 900 !important;
        white-space: nowrap !important;
      }

      .eb-settings-line {
        display: flex !important;
        align-items: center !important;
        gap: 12px !important;
      }

      .eb-settings-line input[type="range"] {
        flex: 1 !important;
        margin: 0 !important;
      }


      @media (max-width: 820px) {
        #eb-panel {
          left: 12px !important;
          right: 12px !important;
          bottom: 76px !important;
          width: auto !important;
          min-width: 0 !important;
          height: calc(100vh - 92px) !important;
        }

        .eb-app,
        .eb-app.eb-wide {
          grid-template-columns: 138px minmax(0, 1fr) !important;
          gap: 10px !important;
        }

        .eb-profile { display: none !important; }
        .eb-sidebar { padding-top: 20px !important; }
        .eb-brand-text { font-size: 13px !important; }
      }
    </style>

    <button id="eb-open-panel">👀</button>

    <div id="eb-panel">
      <div class="eb-dragbar" id="eb-dragbar">ARRASTE PARA MOVER O PAINEL</div>

      <div class="eb-app" id="eb-app">
        <aside class="eb-sidebar">
          <div class="eb-brand">
            <div class="eb-feather">🤠</div>
            <div class="eb-brand-text"><span>ESCRITOR</span><br>BAIANO</div>
          </div>

          <div class="eb-nav-item eb-active" data-page="writer"><div class="eb-nav-icon">🏠</div><div>Auto Writer</div></div>
          <div class="eb-nav-item" data-page="ai"><div class="eb-nav-icon">🤖</div><div>IA</div></div>
          <div class="eb-nav-item" data-page="history"><div class="eb-nav-icon">📄</div><div>Histórico</div></div>
          <div class="eb-nav-item" data-page="settings"><div class="eb-nav-icon">⚙️</div><div>Configurações</div></div>

          <div class="eb-version-simple">v2.2</div>
        </aside>

        <section class="eb-profile" id="eb-profile">
          <div class="eb-profile-card">
            <img class="eb-avatar-big" id="eb-avatar" src="">
            <div class="eb-profile-name">Escritor Baiano</div>
            <div class="eb-badge">Auto Writer</div>
            <div class="eb-profile-desc">Extensão para digitação automática e muito top 😝</div>

            <div class="eb-stat-card">
              <div class="eb-stat-icon">⚡</div>
              <div>
                <div class="eb-stat-label">Status</div>
                <div class="eb-stat-value" id="eb-side-status">Pronto</div>
              </div>
            </div>

            <div class="eb-stat-card">
              <div class="eb-stat-icon">🕘</div>
              <div>
                <div class="eb-stat-label">Atraso inicial</div>
                <div class="eb-stat-value eb-blue">5 segundos</div>
              </div>
            </div>

            <div class="eb-stat-card">
              <div class="eb-stat-icon">⌨️</div>
              <div>
                <div class="eb-stat-label">Velocidade</div>
                <div class="eb-stat-value eb-purple" id="eb-speed-side">Normal</div>
              </div>
            </div>

            <div class="eb-stat-card">
              <div class="eb-stat-icon">✅</div>
              <div>
                <div class="eb-stat-label">Hugo lindo?</div>
                <div class="eb-stat-value">Simm</div>
              </div>
            </div>

          </div>
        </section>

        <main class="eb-main">
          <section class="eb-writer-panel">
            <div class="eb-page eb-page-active" id="eb-page-writer">
              <div class="eb-header">
                <div class="eb-heading">
                  <div class="eb-heading-icon">😎</div>
                  <h1>AUTO WRITER</h1>
                </div>
              </div>

              <p class="eb-desc">
                Clique onde você deseja digitar o texto, cole ele aqui e inicie.
              </p>

              <textarea id="eb-text" placeholder="Cole seu texto aqui..."></textarea>

              <div class="eb-actions">
                <button class="eb-action-btn eb-start" id="eb-start">▶ &nbsp; Iniciar</button>
                <button class="eb-action-btn eb-clear" id="eb-clear">🗑 &nbsp; Limpar</button>
              </div>

              <div class="eb-bottom-status">
                <div class="eb-status-box">
                  <div class="eb-dot"></div>
                  <div>
                    <div class="eb-status-title">Status atual</div>
                    <div class="eb-status-main" id="eb-bottom-status">Pronto para iniciar</div>
                  </div>
                </div>

                <div class="eb-status-box">
                  <div class="eb-mini-icon">🕘</div>
                  <div>
                    <div class="eb-status-title">Aguardando</div>
                    <div class="eb-status-main" id="eb-waiting">Nenhum</div>
                  </div>
                </div>

                <div class="eb-status-box">
                  <div class="eb-mini-icon">⌨️</div>
                  <div>
                    <div class="eb-status-title">Caracteres</div>
                    <div class="eb-status-main" id="eb-chars">0</div>
                  </div>
                </div>

                <div class="eb-status-box">
                  <div class="eb-mini-icon">⏱️</div>
                  <div>
                    <div class="eb-status-title">Progresso</div>
                    <div class="eb-status-main" id="eb-progress">0%</div>
                  </div>
                </div>
              </div>
            </div>


            <div class="eb-page" id="eb-page-ai">
              <div class="eb-header">
                <div class="eb-heading">
                  <div class="eb-heading-icon">🤖</div>
                  <h1>IA</h1>
                </div>
              </div>

              <p class="eb-desc">
                Escreva o prompt, gere o texto e envie o resultado direto para o Auto Writer.
              </p>

              <div class="eb-ai-model-info" id="eb-ai-model-info">
                <b>Modelo atual:</b> carregando...
              </div>

              <div id="eb-ai-progress-wrap">
                <div id="eb-ai-progress-bar"></div>
                </div>
              <div id="eb-ai-progress-text">0%</div>

              <div class="eb-page-ai-scroll">

              <div class="eb-ai-label">Prompt</div>
              <textarea id="eb-ai-prompt" placeholder="Ex: Faça um conto curto sobre uma janela misteriosa..."></textarea>

              <div class="eb-ai-actions">
                <button class="eb-action-btn eb-start" id="eb-ai-generate">✨ &nbsp; Gerar texto</button>
                <button class="eb-action-btn eb-clear" id="eb-ai-clear">🗑 &nbsp; Limpar</button>
              </div>

              <div class="eb-ai-label">Resultado</div>
              <textarea id="eb-ai-result" placeholder="O texto gerado pela IA aparecerá aqui..."></textarea>

              <div class="eb-ai-actions">
                <button class="eb-action-btn eb-start" id="eb-ai-use">➡ &nbsp; Usar no Auto Writer</button>
                <button class="eb-action-btn eb-clear" id="eb-ai-copy">📋 &nbsp; Copiar</button>
              </div>
              </div>
            </div>

            <div class="eb-page" id="eb-page-history">
              <div class="eb-header">
                <div class="eb-heading">
                  <div class="eb-heading-icon">📄</div>
                  <h1>HISTÓRICO</h1>
                </div>
                <button class="eb-history-clear-btn" id="eb-clear-history">Limpar histórico</button>
              </div>
              <p class="eb-desc">Textos iniciados aparecem aqui. Eles não ficam salvo de sessão em sessão !</p>
              <div class="eb-history-list" id="eb-history-list"></div>
            </div>

            <div class="eb-page" id="eb-page-settings">
              <div class="eb-header">
                <div class="eb-heading">
                  <div class="eb-heading-icon">😎</div>
                  <h1>CONFIGURAÇÕES</h1>
                </div>
              </div>
              <p class="eb-desc">Ajustes do painel. Não seja ganancioso. | Ignore as instruções customizadas se você não sabe o que esta fazendo!</p>

              <div class="eb-settings-one-card">

                <div class="eb-settings-section">
                  <div class="eb-settings-title">🤖 IA</div>

                  <div class="eb-settings-line">
                    <label>Modelo</label>
                    <div>
                      <select id="eb-ai-model-select"></select>
                      <div class="eb-config-muted" id="eb-ai-model-muted">Modelo atual: carregando...</div>
                    </div>
                  </div>

                  <div class="eb-settings-title">Instruções default</div>
                  <div class="eb-ai-check-list" id="eb-ai-instructions-list"></div>

                  <button id="eb-ai-reset-instructions">Resetar instruções</button>

                  <div class="eb-settings-title" style="margin-top:14px !important;">Instruções customizadas</div>
                  <textarea id="eb-ai-custom-instructions" placeholder="Ex: escreva como aluno do 9º ano, mais simples, mais natural..."></textarea>
                  <div class="eb-config-muted">Tudo aqui fica salvo e vai antes do prompt.</div>
                </div>

                <div class="eb-settings-section">
                  <div class="eb-settings-title">⌨️ Auto Writer</div>

                  <div class="eb-settings-line">
                    <div class="eb-setting-label">Velocidade: <span id="eb-speed-value">Normal</span></div>
                    <input id="eb-speed" type="range" min="1" max="100" value="50">
                  </div>

                  <div class="eb-settings-line">
                    <div class="eb-setting-label">Escala: <span id="eb-scale-value">88%</span></div>
                    <input id="eb-scale" type="range" min="70" max="105" value="88">
                  </div>

                  <div class="eb-config-muted">Não cometa o mesmo erro que o joão</div>
                </div>

              </div>
            </div>
          </section>

          <div class="eb-notice">
            <span>ⓘ Importante:</span>
            TrickTrack baraboom
          </div>
        </main>
      </div>
    </div>

    <div id="eb-toast"></div>
  `;

  document.documentElement.appendChild(root);

  const avatar = root.querySelector("#eb-avatar");
  const avatarUrl = chrome.runtime.getURL("icons/icon128.png");
  avatar.src = avatarUrl;
  avatar.onerror = () => {
    avatar.style.display = "none";
  };

  const toast = root.querySelector("#eb-toast");
  const openPanel = root.querySelector("#eb-open-panel");
  const panel = root.querySelector("#eb-panel");
  const app = root.querySelector("#eb-app");
  const profile = root.querySelector("#eb-profile");
  const dragbar = root.querySelector("#eb-dragbar");
  const textArea = root.querySelector("#eb-text");
  const aiPrompt = root.querySelector("#eb-ai-prompt");
  const aiResult = root.querySelector("#eb-ai-result");
  const aiGenerate = root.querySelector("#eb-ai-generate");
  const aiClear = root.querySelector("#eb-ai-clear");
  const aiUse = root.querySelector("#eb-ai-use");
  const aiCopy = root.querySelector("#eb-ai-copy");

  const sideStatus = root.querySelector("#eb-side-status");
  const bottomStatus = root.querySelector("#eb-bottom-status");
  const waiting = root.querySelector("#eb-waiting");
  const chars = root.querySelector("#eb-chars");
  const progress = root.querySelector("#eb-progress");
  const speedSide = root.querySelector("#eb-speed-side");

  const historyList = root.querySelector("#eb-history-list");
  const scaleInput = root.querySelector("#eb-scale");
  const scaleValue = root.querySelector("#eb-scale-value");
  const speedInput = root.querySelector("#eb-speed");
  const speedValue = root.querySelector("#eb-speed-value");
  const aiModelInfo = root.querySelector("#eb-ai-model-info");
  const aiModelSelect = root.querySelector("#eb-ai-model-select");
  const aiModelMuted = root.querySelector("#eb-ai-model-muted");
  const aiInstructionsList = root.querySelector("#eb-ai-instructions-list");
  const aiCustomInstructionsBox = root.querySelector("#eb-ai-custom-instructions");
  const aiResetInstructions = root.querySelector("#eb-ai-reset-instructions");
  const aiProgressBar = root.querySelector("#eb-ai-progress-bar");
  const aiProgressText = root.querySelector("#eb-ai-progress-text");

  function applyScale() {
    panel.style.zoom = panelScale;
    panel.style.transform = "";
    scaleInput.value = Math.round(panelScale * 100);
    scaleValue.textContent = Math.round(panelScale * 100) + "%";
  }

  function getSpeedLabel(value) {
    if (value <= 10) return "🐢";
    if (value <= 22) return "Muy lenta";
    if (value <= 35) return "Lentinha";
    if (value <= 48) return "Lenta";
    if (value <= 62) return "Normal";
    if (value <= 75) return "Rápida";
    if (value <= 87) return "Rapidinha";
    if (value <= 96) return "Muy rápida";
    return "Insana";
  }

  function applySpeed() {
    speedInput.value = typingSpeed;
    const label = getSpeedLabel(typingSpeed);
    speedValue.textContent = label;
    speedSide.textContent = label;
  }

  function getTypingDelay() {
    const minDelay = 3;
    const maxDelay = 260;
    const base = maxDelay - ((typingSpeed - 1) / 99) * (maxDelay - minDelay);
    return Math.random() * base + Math.max(2, base * 0.22);
  }

  function applyPosition() {
    if (!panelPos) return;
    panel.style.left = panelPos.left + "px";
    panel.style.top = panelPos.top + "px";
    panel.style.right = "auto";
    panel.style.bottom = "auto";
  }


  function getPrimaryModel() {
    return OPENROUTER_MODELS[selectedModelIndex] || OPENROUTER_MODELS[0];
  }

  function getModelFallbackList() {
    const primary = getPrimaryModel();
    return [primary, ...OPENROUTER_MODELS.filter(model => model !== primary)];
  }

  function updateAiModelInfo(extra = "") {
    const current = getPrimaryModel();

    if (aiModelInfo) {
      const suffix = lastFallbackInfo && lastFallbackInfo !== "Modelo principal"
        ? ` • ${lastFallbackInfo}`
        : "";
      aiModelInfo.innerHTML = `<b>🤖 Modelo:</b> ${lastUsedModel === "Nenhum ainda" ? current : lastUsedModel}${suffix}`;
      if (extra) aiModelInfo.innerHTML += ` • ${extra.replace(/<[^>]+>/g, "")}`;
    }

    if (aiModelMuted) {
      aiModelMuted.textContent = `Atual: ${current} | Usado: ${lastUsedModel} | ${lastFallbackInfo}`;
    }
  }

  function renderAiModelSelect() {
    aiModelSelect.innerHTML = "";

    OPENROUTER_MODELS.forEach((model, index) => {
      const option = document.createElement("option");
      option.value = String(index);
      option.textContent = model;
      aiModelSelect.appendChild(option);
    });

    aiModelSelect.value = String(selectedModelIndex);
    updateAiModelInfo();
  }

  function renderAiInstructionSettings() {
    aiInstructionsList.innerHTML = "";

    DEFAULT_AI_INSTRUCTIONS.forEach((item) => {
      const label = document.createElement("label");
      label.className = "eb-ai-check";

      const input = document.createElement("input");
      input.type = "checkbox";
      input.checked = aiInstructionStates[item.id] !== false;

      input.addEventListener("change", () => {
        aiInstructionStates[item.id] = input.checked;
        localStorage.setItem("eb_ai_instruction_states", JSON.stringify(aiInstructionStates));
      });

      const span = document.createElement("span");
      span.textContent = item.label;

      label.appendChild(input);
      label.appendChild(span);
      aiInstructionsList.appendChild(label);
    });

    aiCustomInstructionsBox.value = aiCustomInstructions;
  }

  function buildSystemInstructions() {
    const activeDefaultInstructions = DEFAULT_AI_INSTRUCTIONS
      .filter(item => aiInstructionStates[item.id] !== false)
      .map(item => "- " + item.text)
      .join("\n");

    const custom = aiCustomInstructions.trim()
      ? "\n\nInstruções customizadas do usuário:\n" + aiCustomInstructions.trim()
      : "";

    return `Você é um escritor profissional no estilo Escritor Baiano.

Instruções ativas:
${activeDefaultInstructions || "- Nenhuma instrução default ativa."}${custom}`;
  }



  applyScale();
  applySpeed();
  applyPosition();
  renderAiModelSelect();
  renderAiInstructionSettings();

  let toastTimer = null;

  function showToast(message) {
    toast.textContent = message;
    toast.classList.remove("eb-toast-hide");
    toast.classList.add("eb-toast-show");

    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => {
      toast.classList.remove("eb-toast-show");
      toast.classList.add("eb-toast-hide");

      setTimeout(() => {
        toast.classList.remove("eb-toast-hide");
      }, 240);
    }, 4200);
  }

  function setStatus(status, waitText = "Nenhum", prog = "0%") {
    sideStatus.textContent = status;
    bottomStatus.textContent = status === "Pronto" ? "Pronto para iniciar" : status;
    waiting.textContent = waitText;
    progress.textContent = prog;
  }

  function updateChars() {
    chars.textContent = textArea.value.length;
  }

  function saveHistory(item) {
    if (!item.trim()) return;
    history.unshift({ text: item, date: new Date().toLocaleString() });
    history = history.slice(0, 20);
    localStorage.setItem("eb_history", JSON.stringify(history));
    renderHistory();
  }

  function renderHistory() {
    historyList.innerHTML = "";

    if (!history.length) {
      historyList.innerHTML = `<div class="eb-history-item"><div class="eb-history-date">Vazio</div><div class="eb-history-text">Nenhum histórico ainda.</div></div>`;
      return;
    }

    history.forEach((item) => {
      const div = document.createElement("div");
      div.className = "eb-history-item";
      div.innerHTML = `<div class="eb-history-date">${item.date}</div><div class="eb-history-text">${item.text.slice(0, 190)}</div>`;
      div.addEventListener("click", () => {
        textArea.value = item.text;
        localStorage.setItem("eb_saved_text", textArea.value);
        updateChars();
        goPage("writer");
      });
      historyList.appendChild(div);
    });
  }

  textArea.value = savedText;
  updateChars();
  renderHistory();

  textArea.addEventListener("input", () => {
    localStorage.setItem("eb_saved_text", textArea.value);
    updateChars();
  });


  function setTypingButtonState(isTyping) {
    const startBtn = root.querySelector("#eb-start");
    if (!startBtn) return;

    if (isTyping) {
      startBtn.innerHTML = "⛔ &nbsp; Parar";
      startBtn.dataset.typing = "true";
      startBtn.classList.remove("eb-start");
      startBtn.classList.add("eb-clear");
    } else {
      startBtn.innerHTML = "▶ &nbsp; Iniciar";
      startBtn.dataset.typing = "false";
      startBtn.classList.remove("eb-clear");
      startBtn.classList.add("eb-start");
    }
  }

  function closePanelAnimated() {
    if (!panel.classList.contains("eb-show")) return;

    panel.classList.remove("eb-show");
    panel.classList.add("eb-closing");
    openPanel.textContent = "👀";

    setTimeout(() => {
      panel.classList.remove("eb-closing");
    }, 230);
  }

  function openPanelAnimated() {
    panel.classList.remove("eb-closing");
    panel.classList.add("eb-show");
    openPanel.textContent = "👀";
  }

  openPanel.addEventListener("click", () => {
    if (panel.classList.contains("eb-show")) {
      closePanelAnimated();
    } else {
      openPanelAnimated();
    }
  });

  function goPage(page) {
    root.querySelectorAll(".eb-nav-item").forEach(item => {
      item.classList.toggle("eb-active", item.dataset.page === page);
    });

    root.querySelectorAll(".eb-page").forEach(p => p.classList.remove("eb-page-active"));
    root.querySelector(`#eb-page-${page}`).classList.add("eb-page-active");

    if (page === "writer") {
      profile.style.display = "";
      app.classList.remove("eb-wide");
    } else {
      profile.style.display = "none";
      app.classList.add("eb-wide");
    }
  }

  root.querySelectorAll(".eb-nav-item").forEach(item => {
    item.addEventListener("click", () => goPage(item.dataset.page));
  });

  root.querySelector("#eb-clear").addEventListener("click", () => {
    textArea.value = "";
    localStorage.removeItem("eb_saved_text");
    updateChars();
    setStatus("Pronto", "Nenhum", "0%");
  });

  scaleInput.addEventListener("input", () => {
    scaleValue.textContent = scaleInput.value + "%";
  });

  scaleInput.addEventListener("change", () => {
    panelScale = Number(scaleInput.value) / 100;
    localStorage.setItem("eb_panel_scale", String(panelScale));
    applyScale();
  });

  speedInput.addEventListener("input", () => {
    speedValue.textContent = getSpeedLabel(Number(speedInput.value));
  });

  speedInput.addEventListener("change", () => {
    typingSpeed = Number(speedInput.value);
    localStorage.setItem("eb_typing_speed", String(typingSpeed));
    applySpeed();
  });

  root.querySelector("#eb-clear-history").addEventListener("click", () => {
    history = [];
    localStorage.removeItem("eb_history");
    renderHistory();
  });


  aiModelSelect.addEventListener("change", () => {
    selectedModelIndex = Number(aiModelSelect.value);
    localStorage.setItem("eb_selected_model_index", String(selectedModelIndex));
    lastFallbackInfo = "Modelo principal";
    localStorage.setItem("eb_last_fallback_info", lastFallbackInfo);
    updateAiModelInfo();
    showToast("Modelo da IA atualizado.");
  });

  aiCustomInstructionsBox.addEventListener("input", () => {
    aiCustomInstructions = aiCustomInstructionsBox.value;
    localStorage.setItem("eb_ai_custom_instructions", aiCustomInstructions);
  });

  aiResetInstructions.addEventListener("click", () => {
    aiInstructionStates = Object.fromEntries(DEFAULT_AI_INSTRUCTIONS.map(item => [item.id, true]));
    aiCustomInstructions = "";
    localStorage.setItem("eb_ai_instruction_states", JSON.stringify(aiInstructionStates));
    localStorage.removeItem("eb_ai_custom_instructions");
    renderAiInstructionSettings();
    showToast("Instruções da IA resetadas.");
  });





  let fakeProgressInterval = null;
  let fakeProgress = 0;

function startFakeProgress() {
  clearInterval(fakeProgressInterval);

  fakeProgress = 0;

  aiProgressBar.style.width = "0%";
  aiProgressText.textContent = "0%";

  fakeProgressInterval = setInterval(() => {

    if (fakeProgress >= 95) return;

    const remaining = 95 - fakeProgress;

    fakeProgress += Math.max(
      0.5,
      remaining * 0.04
    );

    if (fakeProgress > 95) {
      fakeProgress = 95;
    }

    aiProgressBar.style.setProperty(
     "width",
     fakeProgress.toFixed(1) + "%",
     "important"
    );

    aiProgressText.textContent =
      Math.floor(fakeProgress) + "%";

  }, 650);
  }

  function finishFakeProgress() {
  clearInterval(fakeProgressInterval);

  aiProgressBar.style.width = "100%";
  aiProgressText.textContent = "100%";

  setTimeout(() => {
    aiProgressBar.style.width = "0%";
    aiProgressText.textContent = "0%";
  }, 1500);
  }

  function resetFakeProgress() {
    if (!aiProgressBar || !aiProgressText) return;

    clearInterval(fakeProgressInterval);
    aiProgressBar.style.width = "0%";
    aiProgressText.textContent = "Erro";
  }


  async function generateGeminiText(prompt) {
    const selectedModel = getPrimaryModel();

    const res = await fetch(BACKEND_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        prompt,
        system: buildSystemInstructions(),
        model: selectedModel
      })
    });

    const data = await res.json();

    if (!res.ok) {
      throw new Error(data?.error || "Erro ao gerar texto pelo backend.");
    }

    const generated = data?.text?.trim() || "";

    if (!generated) {
      throw new Error("O backend não retornou texto.");
    }

    lastUsedModel = data.modelUsed || selectedModel;
    lastFallbackInfo = data.fallbackUsed ? "Fallback usado" : "Modelo principal";

    localStorage.setItem("eb_last_used_model", lastUsedModel);
    localStorage.setItem("eb_last_fallback_info", lastFallbackInfo);

    updateAiModelInfo();

    if (data.fallbackUsed) {
      showToast(`Modelo principal não foi. Usando fallback: ${lastUsedModel}`);
    }

    return generated
      .replace(/\r\n/g, "\n")
      .replace(/\r/g, "\n")
      .replace(/\n{2,}/g, "\n")
      .trim();
  }

  aiGenerate.addEventListener("click", async () => {
    const prompt = aiPrompt.value.trim();

    if (!prompt) {
      showToast("Digite um prompt antes de gerar.");
      return;
    }

    aiGenerate.disabled = true;
    aiGenerate.textContent = "Gerando...";
    showToast("Gerando texto pelo backend...");
    startFakeProgress();

    try {
      const generated = await generateGeminiText(prompt);
      aiResult.value = generated;
      finishFakeProgress();
      showToast("Texto gerado!");
    } catch (err) {
      console.error(err);
      resetFakeProgress();
      showToast(err.message || "Erro ao gerar com IA.");
    } finally {
      aiGenerate.disabled = false;
      aiGenerate.textContent = "✨  Gerar texto";
    }
  });

  aiClear.addEventListener("click", () => {
    aiPrompt.value = "";
    aiResult.value = "";
  });

  aiUse.addEventListener("click", () => {
    const generated = aiResult.value.trim();

    if (!generated) {
      showToast("Nenhum texto gerado ainda.");
      return;
    }

    textArea.value = generated;
    localStorage.setItem("eb_saved_text", textArea.value);
    updateChars();
    goPage("writer");
    showToast("Texto enviado para o Auto Writer.");
  });

  aiCopy.addEventListener("click", async () => {
    const generated = aiResult.value.trim();

    if (!generated) {
      showToast("Nenhum texto para copiar.");
      return;
    }

    try {
      await navigator.clipboard.writeText(generated);
      showToast("Texto copiado.");
    } catch (err) {
      console.error(err);
      showToast("Não foi possível copiar.");
    }
  });

  let dragging = false;
  let startX = 0;
  let startY = 0;
  let startLeft = 0;
  let startTop = 0;

  dragbar.addEventListener("mousedown", (e) => {
    dragging = true;
    const rect = panel.getBoundingClientRect();
    panel.style.left = rect.left + "px";
    panel.style.top = rect.top + "px";
    panel.style.right = "auto";
    panel.style.bottom = "auto";
    startX = e.clientX;
    startY = e.clientY;
    startLeft = rect.left;
    startTop = rect.top;
    e.preventDefault();
  });

  document.addEventListener("mousemove", (e) => {
    if (!dragging) return;

    const newLeft = Math.max(0, Math.min(window.innerWidth - 80, startLeft + (e.clientX - startX)));
    const newTop = Math.max(0, Math.min(window.innerHeight - 60, startTop + (e.clientY - startY)));

    panel.style.left = newLeft + "px";
    panel.style.top = newTop + "px";

    panelPos = { left: newLeft, top: newTop };
    localStorage.setItem("eb_panel_pos", JSON.stringify(panelPos));
  });

  document.addEventListener("mouseup", () => { dragging = false; });

  function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  function setNativeValue(element, value) {
    const valueSetter = Object.getOwnPropertyDescriptor(element.__proto__, "value")?.set;
    const prototype = Object.getPrototypeOf(element);
    const prototypeValueSetter = Object.getOwnPropertyDescriptor(prototype, "value")?.set;

    if (prototypeValueSetter && valueSetter !== prototypeValueSetter) {
      prototypeValueSetter.call(element, value);
    } else if (valueSetter) {
      valueSetter.call(element, value);
    } else if ("value" in element) {
      element.value = value;
    } else {
      element.textContent = value;
    }
  }

  function triggerInputEvents(el) {
    el.dispatchEvent(new Event("input", { bubbles: true }));
    el.dispatchEvent(new Event("change", { bubbles: true }));
  }

  async function typeText(text) {
    const el = lastFocusedElement;

    if (!el) {
      setStatus("Sem campo", "Clique em um campo", "0%");
      showToast("Clique na area de texto e pressione iniciar novamente.");
      return;
    }

    typingActive = true;
    setTypingButtonState(true);

    try {
      el.focus();

      if ("value" in el) {
        setNativeValue(el, "");
      } else {
        el.textContent = "";
      }

      triggerInputEvents(el);

      let currentValue = "";

      for (let i = 0; i < text.length; i++) {

        if (stopTypingRequested) {
          setStatus("Parado", "Nenhum", "Interrompido");
          showToast("Escrita interrompida.");
          return;
        }

        const char = text[i];

        if (char === "\n") {
          currentValue += "\n";
        } else {
          currentValue += char;
        }

        setNativeValue(el, currentValue);
        triggerInputEvents(el);

        progress.textContent =
          Math.round(((i + 1) / text.length) * 100) + "%";

        await sleep(getTypingDelay());
      }

      setStatus("Concluído", "Nenhum", "100%");

    } finally {
      typingActive = false;
      stopTypingRequested = false;
      setTypingButtonState(false);
    }
  }

  root.querySelector("#eb-start").addEventListener("click", () => {

    if (typingActive) {
      stopTypingRequested = true;

      if (typingTimeout) {
        clearTimeout(typingTimeout);
        typingTimeout = null;
        typingActive = false;
        setTypingButtonState(false);
      }

      return;
    }

    const text = textArea.value;

    if (!text.trim()) {
      setStatus("Sem texto", "Nenhum", "0%");
      return;
    }

    if (!lastFocusedElement) {
      setStatus("Sem campo", "Clique em um campo", "0%");
      showToast("Clique na area de texto e pressione iniciar novamente.");
      return;
    }

    typingActive = true;
    stopTypingRequested = false;
    setTypingButtonState(true);

    showToast("Iniciando...");
    saveHistory(text);
    closePanelAnimated();

    setStatus("Aguardando...", "5 segundos", "0%");

    typingTimeout = setTimeout(() => {
      typingTimeout = null;
      setStatus("Digitando...", "Agora", "0%");
      typeText(text);
    }, 5000);
  });
})();
