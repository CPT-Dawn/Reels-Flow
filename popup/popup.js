document.addEventListener("DOMContentLoaded", () => {
    const toggle = document.getElementById("autoReelsToggle");
    const injectToggle = document.getElementById("injectReelsButtonToggle");

    // Load stored values
    chrome.storage.sync.get(["autoReelsStart", "injectReelsButton"], (data) => {
        toggle.checked = data.autoReelsStart || false;
        injectToggle.checked = data.injectReelsButton || false;
    });

    // ✅ Auto Scroll Toggle
    toggle.addEventListener("change", () => {
        chrome.storage.sync.set({ autoReelsStart: toggle.checked });
    });

    // ✅ Inject Button Toggle
    injectToggle.addEventListener("change", () => {
        chrome.storage.sync.set({ injectReelsButton: injectToggle.checked }, () => {
             // Reload the active tab to apply changes
             chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
                if (tabs[0]?.id) {
                    chrome.tabs.reload(tabs[0].id);
                }
            });
        });
    });

    // ✅ Make entire card clickable
    document.querySelectorAll(".setting-card").forEach(card => {
        card.addEventListener("click", (e) => {
            // Prevent double toggling if clicking the switch itself
            if (e.target.closest(".toggle-switch")) return;

            const checkbox = card.querySelector("input[type='checkbox']");
            if (checkbox) {
                checkbox.checked = !checkbox.checked;
                checkbox.dispatchEvent(new Event("change"));
            }
        });
    });
});
