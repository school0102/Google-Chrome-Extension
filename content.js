function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// função que força atualização em inputs modernos
function setNativeValue(element, value) {
  const valueSetter = Object.getOwnPropertyDescriptor(element.__proto__, 'value')?.set;
  const prototype = Object.getPrototypeOf(element);
  const prototypeValueSetter = Object.getOwnPropertyDescriptor(prototype, 'value')?.set;

  if (prototypeValueSetter && valueSetter !== prototypeValueSetter) {
    prototypeValueSetter.call(element, value);
  } else if (valueSetter) {
    valueSetter.call(element, value);
  }
}

// dispara eventos reais do navegador
function triggerInputEvents(el) {
  el.dispatchEvent(new Event('input', { bubbles: true }));
  el.dispatchEvent(new Event('change', { bubbles: true }));
}

async function typeText(text) {
  const el = document.activeElement;

  if (!el) return;

  let currentValue = el.value || "";

  for (let i = 0; i < text.length; i++) {
    const char = text[i];

    if (char === "\n") {
      currentValue += "\n";
    } else {
      currentValue += char;
    }

    setNativeValue(el, currentValue);
    triggerInputEvents(el);

    // delay humano
    await sleep(Math.random() * 80 + 20);
  }
}

chrome.runtime.onMessage.addListener((msg) => {
  if (msg.action === "startTyping") {
    setTimeout(() => {
      typeText(msg.text);
    }, 5000);
  }
});