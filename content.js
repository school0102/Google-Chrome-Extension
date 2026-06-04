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
        z-index: 2147483646 !important;
        width: 126px !important;
        height: 46px !important;
        border: 1px solid rgba(255,255,255,.16) !important;
        border-radius: 999px !important;
        background: linear-gradient(135deg,#176ed2,#35a2ff) !important;
        color: white !important;
        font-size: 15px !important;
        font-weight: 900 !important;
        cursor: pointer !important;
        display: flex !important;
        align-items: center !important;
        justify-content: center !important;
        box-shadow: 0 14px 38px rgba(47,156,255,.38) !important;
        transition: transform .18s ease, filter .18s ease, box-shadow .18s ease !important;
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

      .eb-wide-content {
        flex: 1 !important;
        min-height: 0 !important;
        display: grid !important;
        gap: 14px !important;
      }


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

    <button id="eb-open-panel">Painel</button>

    <div id="eb-panel">
      <div class="eb-dragbar" id="eb-dragbar">ARRASTE PARA MOVER O PAINEL</div>

      <div class="eb-app" id="eb-app">
        <aside class="eb-sidebar">
          <div class="eb-brand">
            <div class="eb-feather">🤠</div>
            <div class="eb-brand-text"><span>ESCRITOR</span><br>BAIANO</div>
          </div>

          <div class="eb-nav-item eb-active" data-page="writer"><div class="eb-nav-icon">🏠</div><div>Auto Writer</div></div>
          <div class="eb-nav-item" data-page="history"><div class="eb-nav-icon">📄</div><div>Histórico</div></div>
          <div class="eb-nav-item" data-page="settings"><div class="eb-nav-icon">⚙️</div><div>Configurações</div></div>

          <div class="eb-version-simple">v1.5</div>
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
              <p class="eb-desc">Ajustes do painel. Não seja ganancioso.</p>

              <div class="eb-settings-grid">
                <div class="eb-config-row">
                  <label>Velocidade de escrita: <span id="eb-speed-value">Normal</span></label>
                  <input id="eb-speed" type="range" min="1" max="100" value="50">
                  <div class="eb-config-muted">Não cometa o mesmo erro que o João.</div>
                </div>

                <div class="eb-config-row">
                  <label>Escala do painel: <span id="eb-scale-value">88%</span></label>
                  <input id="eb-scale" type="range" min="70" max="105" value="88">
                  <div class="eb-config-muted">Dimensione o painel com a ajuda deste slider.</div>
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

  function applyScale() {
    panel.style.zoom = panelScale;
    panel.style.transform = "";
    scaleInput.value = Math.round(panelScale * 100);
    scaleValue.textContent = Math.round(panelScale * 100) + "%";
  }

  function getSpeedLabel(value) {
    if (value <= 10) return "Extremamente lenta";
    if (value <= 22) return "Muito lenta";
    if (value <= 35) return "Lenta";
    if (value <= 48) return "Levemente lenta";
    if (value <= 62) return "Normal";
    if (value <= 75) return "Levemente rápida";
    if (value <= 87) return "Rápida";
    if (value <= 96) return "Muito rápida";
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

  applyScale();
  applySpeed();
  applyPosition();

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

  function closePanelAnimated() {
    if (!panel.classList.contains("eb-show")) return;

    panel.classList.remove("eb-show");
    panel.classList.add("eb-closing");
    openPanel.textContent = "Painel";

    setTimeout(() => {
      panel.classList.remove("eb-closing");
    }, 230);
  }

  function openPanelAnimated() {
    panel.classList.remove("eb-closing");
    panel.classList.add("eb-show");
    openPanel.textContent = "Fechar";
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

    el.focus();

    if ("value" in el) {
      setNativeValue(el, "");
    } else {
      el.textContent = "";
    }

    triggerInputEvents(el);

    let currentValue = "";

    for (let i = 0; i < text.length; i++) {
      const char = text[i];

      if (char === "\n") {
        currentValue += "\n";
      } else {
        currentValue += char;
      }

      setNativeValue(el, currentValue);
      triggerInputEvents(el);

      progress.textContent = Math.round(((i + 1) / text.length) * 100) + "%";

      await sleep(getTypingDelay());
    }

    setStatus("Concluído", "Nenhum", "100%");
  }

  root.querySelector("#eb-start").addEventListener("click", () => {
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

    showToast("Iniciando...");
    saveHistory(text);
    closePanelAnimated();

    setStatus("Aguardando...", "5 segundos", "0%");

    setTimeout(() => {
      setStatus("Digitando...", "Agora", "0%");
      typeText(text);
    }, 5000);
  });
})();
