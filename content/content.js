let autoScrollEnabled = false;
let showToggleEnabled = false;
let currentVideo = null;
let videoObserver = null;
let pageObserver = null;

// ✅ Initialize the extension
// ✅ Initialize the extension
function init() {
  chrome.storage.sync.get(["autoReelsStart", "injectReelsButton"], (data) => {
    autoScrollEnabled = data.autoReelsStart || false;
    showToggleEnabled = data.injectReelsButton || false;
    checkPage();
  });
}

// ✅ Listen for storage changes (Dynamic Updates)
chrome.storage.onChanged.addListener((changes) => {
  if (changes.autoReelsStart) {
    autoScrollEnabled = changes.autoReelsStart.newValue;
    updateToggleState(autoScrollEnabled);
    if (autoScrollEnabled && currentVideo) {
      setupVideoListener(currentVideo);
    }
  }
  if (changes.injectReelsButton) {
    showToggleEnabled = changes.injectReelsButton.newValue;
    checkPage();
  }
});

// ✅ Check if current page is Reels
function isReelsPage() {
  return window.location.href.includes("/reels/");
}

// ✅ Main Logic to Start/Stop App based on URL
function checkPage() {
  if (isReelsPage()) {
    if (showToggleEnabled) injectToggle(autoScrollEnabled);
    setupObservers();
  } else {
    cleanup();
  }
}

// ✅ Setup Observers
function setupObservers() {
  if (videoObserver) return; // Already set up

  // IntersectionObserver to detect the active video
  videoObserver = new IntersectionObserver(handleVideoIntersection, {
    threshold: 0.7, // Video is considered "active" when 70% visible
  });

  // MutationObserver to detect new videos loading (Infinite Scroll)
  pageObserver = new MutationObserver((mutations) => {
    // Check if we are still on reels page and toggle is missing but should be there
    if (isReelsPage() && showToggleEnabled && !document.getElementById("myInjectedToggleWrapper")) {
        injectToggle(autoScrollEnabled);
    }

    mutations.forEach((mutation) => {
      mutation.addedNodes.forEach((node) => {
        if (node.nodeType === 1) {
          const videos = node.querySelectorAll ? node.querySelectorAll("video") : [];
          videos.forEach((video) => videoObserver.observe(video));
          if (node.tagName === "VIDEO") videoObserver.observe(node);
        }
      });
    });
  });

  pageObserver.observe(document.body, { childList: true, subtree: true });

  // Observe existing videos
  document.querySelectorAll("video").forEach((video) => videoObserver.observe(video));
}

// ✅ Handle Video Intersection
function handleVideoIntersection(entries) {
  entries.forEach((entry) => {
    if (entry.isIntersecting) {
      currentVideo = entry.target;
      if (autoScrollEnabled) {
        setupVideoListener(currentVideo);
      }
    }
  });
}

// ✅ Setup Video End Listener
function setupVideoListener(video) {
  video.removeAttribute("loop");
  video.removeEventListener("ended", onVideoEnd); // Prevent duplicates
  video.addEventListener("ended", onVideoEnd);
}

// ✅ Handle Video End -> Scroll to Next
function onVideoEnd() {
  if (!autoScrollEnabled) return;
  
  const nextVideo = getNextVideo();
  if (nextVideo) {
    nextVideo.scrollIntoView({ behavior: "smooth", block: "center" });
  }
}

// ✅ Find the next video in the DOM
function getNextVideo() {
  if (!currentVideo) return null;
  const videos = Array.from(document.querySelectorAll("video"));
  const currentIndex = videos.indexOf(currentVideo);
  return videos[currentIndex + 1] || null;
}

// ✅ Cleanup function
function cleanup() {
  removeToggle();
  if (videoObserver) {
    videoObserver.disconnect();
    videoObserver = null;
  }
  if (pageObserver) {
    pageObserver.disconnect();
    pageObserver = null;
  }
  currentVideo = null;
}

// ✅ Listen for URL changes (SPA navigation)
let lastUrl = location.href;
// Use a more robust URL change detection
const urlObserver = new MutationObserver(() => {
  const url = location.href;
  if (url !== lastUrl) {
    lastUrl = url;
    checkPage();
  }
});
urlObserver.observe(document, { subtree: true, childList: true });

// Also listen to popstate just in case
window.addEventListener("popstate", () => {
    const url = location.href;
    if (url !== lastUrl) {
        lastUrl = url;
        checkPage();
    }
});


// ✅ Inject Styles
function injectStyles() {
  if (document.getElementById("instaReelsStyles")) return;
  const style = document.createElement("style");
  style.id = "instaReelsStyles";
  style.textContent = `
    :root {
      --instagram-gradient: linear-gradient(45deg, #FFD600, #FF0169, #D300C5);
      --instagram-gradient-hover: linear-gradient(45deg, #FFC107, #E91E63, #9C27B0);
      --card-bg: linear-gradient(135deg, #1a1a1a 0%, #121212 100%);
    }
    
    .injected-wrapper {
      position: fixed;
      top: 30px;
      right: 20px;
      z-index: 9999;
      background: var(--card-bg);
      border-radius: 12px;
      padding: 12px 16px;
      display: flex;
      align-items: center;
      gap: 12px;
      cursor: pointer;
      border: 1px solid rgba(255, 255, 255, 0.06);
      box-shadow: 0 8px 24px rgba(0, 0, 0, 0.4);
      transition: all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
      backdrop-filter: blur(10px);
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
    }

    .injected-wrapper:hover {
      transform: translateY(-2px);
      border-color: rgba(255, 1, 105, 0.2);
      box-shadow: 0 12px 32px rgba(0, 0, 0, 0.5), 0 0 0 1px rgba(255, 1, 105, 0.1);
    }

    .injected-icon {
      width: 32px;
      height: 32px;
      border-radius: 50%;
      background: rgba(255, 255, 255, 0.05);
      display: flex;
      align-items: center;
      justify-content: center;
      color: #fff;
      transition: all 0.3s ease;
    }

    .injected-wrapper:hover .injected-icon {
      background: rgba(255, 1, 105, 0.15);
      color: #FF0169;
      transform: rotate(5deg);
    }

    .injected-label {
      color: #fff;
      font-size: 14px;
      font-weight: 500;
      margin: 0;
    }

    /* Toggle Switch */
    .injected-switch {
      position: relative;
      width: 44px;
      height: 24px;
      flex-shrink: 0;
    }

    .injected-slider {
      position: absolute;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background: #3f3f3f;
      border-radius: 24px;
      transition: 0.3s;
    }

    .injected-slider::before {
      content: "";
      position: absolute;
      height: 20px;
      width: 20px;
      left: 2px;
      bottom: 2px;
      background: #fff;
      border-radius: 50%;
      transition: 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
      box-shadow: 0 2px 4px rgba(0,0,0,0.2);
    }

    .injected-switch.active .injected-slider {
      background: var(--instagram-gradient);
      box-shadow: 0 0 12px rgba(255, 1, 105, 0.4);
    }

    .injected-switch.active .injected-slider::before {
      transform: translateX(20px);
    }
  `;
  document.head.appendChild(style);
}

// ✅ Inject Toggle Button
function injectToggle(isEnabled) {
  if (document.getElementById("myInjectedToggleWrapper")) return;
  injectStyles();

  const toggleWrapper = document.createElement("div");
  toggleWrapper.id = "myInjectedToggleWrapper";
  toggleWrapper.className = "injected-wrapper";

  // Icon
  const iconDiv = document.createElement("div");
  iconDiv.className = "injected-icon";
  iconDiv.innerHTML = `
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M12 4V20M12 20L8 16M12 20L16 16" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
    </svg>
  `;

  // Label
  const label = document.createElement("p");
  label.className = "injected-label";
  label.innerText = "Auto-Scroll";

  // Switch
  const switchDiv = document.createElement("div");
  switchDiv.className = `injected-switch ${isEnabled ? "active" : ""}`;
  const slider = document.createElement("span");
  slider.className = "injected-slider";
  switchDiv.appendChild(slider);

  toggleWrapper.appendChild(iconDiv);
  toggleWrapper.appendChild(label);
  toggleWrapper.appendChild(switchDiv);

  toggleWrapper.addEventListener("click", () => {
    const newState = !autoScrollEnabled;
    chrome.storage.sync.set({ autoReelsStart: newState });
  });

  document.body.appendChild(toggleWrapper);
}

// ✅ Update Toggle Visuals
function updateToggleState(isEnabled) {
  const switchDiv = document.querySelector("#myInjectedToggleWrapper .injected-switch");
  if (switchDiv) {
    if (isEnabled) {
      switchDiv.classList.add("active");
    } else {
      switchDiv.classList.remove("active");
    }
  }
}

// ✅ Remove Toggle
function removeToggle() {
  const el = document.getElementById("myInjectedToggleWrapper");
  if (el) el.remove();
}

// Start
init();
