const statusBox = document.getElementById("status");

document.getElementById("inject").addEventListener("click", async () => {
  statusBox.textContent = "Injetando...";

  try {
    const [tab] = await chrome.tabs.query({
      active: true,
      currentWindow: true
    });

    await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      files: ["content.js"]
    });

    statusBox.textContent = "Código injetado!";
  } catch (err) {
    console.error(err);
    statusBox.textContent = "Erro ao injetar.";
  }
});
