// Fetch live extension metadata from the Python API and update the page.
async function loadExtensionInfo() {
  try {
    const response = await fetch("/api/info");
    if (!response.ok) return;

    const data = await response.json();

    // Update version badge
    if (data.version) {
      const badge = document.getElementById("version-badge");
      if (badge) badge.textContent = `v${data.version}`;
    }

    // Update download links with canonical URLs from the API
    if (data.download) {
      const chromeLink = document.getElementById("chrome-download");
      const firefoxLink = document.getElementById("firefox-download");
      if (chromeLink && data.download.chrome) chromeLink.href = data.download.chrome;
      if (firefoxLink && data.download.firefox) firefoxLink.href = data.download.firefox;
    }
  } catch {
    // API unavailable — page already has correct static fallback values
  }
}

loadExtensionInfo();
