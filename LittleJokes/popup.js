const textArea = document.getElementById("text");

const editScreen = document.getElementById("editScreen");
const waitScreen = document.getElementById("waitScreen");

// carregar texto salvo
chrome.storage.local.get(["savedText"], (res) => {
  if (res.savedText) textArea.value = res.savedText;
});

// auto-save
textArea.addEventListener("input", () => {
  chrome.storage.local.set({ savedText: textArea.value });
});

// iniciar
document.getElementById("start").addEventListener("click", async () => {

  // troca tela
  editScreen.classList.remove("active");
  waitScreen.classList.add("active");

  const text = textArea.value;

  const [tab] = await chrome.tabs.query({
    active: true,
    currentWindow: true
  });

  await chrome.scripting.executeScript({
    target: { tabId: tab.id },
    args: [text],
    func: async (text) => {

      const sleep = (ms) => new Promise(r => setTimeout(r, ms));

      function setValue(el, value) {
        if (!el) return;
        const proto = Object.getPrototypeOf(el);
        const setter = Object.getOwnPropertyDescriptor(proto, "value")?.set;
        setter?.call(el, value);
      }

      function trigger(el) {
        el.dispatchEvent(new Event("input", { bubbles: true }));
      }

      async function typeText() {
        const el = document.activeElement;
        if (!el) return;

        let v = "";

        for (let i = 0; i < text.length; i++) {
          v += text[i];
          setValue(el, v);
          trigger(el);

          await sleep(Math.random() * 80 + 20);
        }
      }

      setTimeout(typeText, 5000);
    }
  });
});

// voltar
document.getElementById("back").addEventListener("click", () => {
  waitScreen.classList.remove("active");
  editScreen.classList.add("active");
});

// limpar
document.getElementById("clear").addEventListener("click", () => {
  textArea.value = "";
  chrome.storage.local.remove("savedText");
});