<div align="center">
  <img src="store assets/icon.png" alt="Reels Flow Logo" width="100" height="100" />

  <h1>Reels Flow</h1>
  
  <p><b>A frictionless, hands-free experience for Instagram Reels.</b></p>

  <p>
    <a href="" <img src="https://img.shields.io/badge/version-2.1.0-2EA043?style=for-the-badge&logo=github" alt="Version"></a>
    <a href="LICENSE"><img src="https://img.shields.io/badge/license-MIT-blue.svg?style=for-the-badge" alt="License"></a>
    <img href="https://chromewebstore.google.com/detail/reels-flow-auto-scroll-fo/mlmllpiifbmfnopepamjhbdedfjajgcl" src="https://img.shields.io/badge/platform-Chrome%20%7C%20Edge%20%7C%20Brave-5A5A5A?style=for-the-badge&logo=googlechrome" alt="Platform">
  </p>
</div>

## 🚀 Overview

**Reels Flow** transforms how you consume Instagram Reels. Say goodbye to repetitive swiping and hello to an immersive, continuous flow. Engineered with a zero-lag architecture and fully compliant with Manifest V3, Reels Flow intelligently detects when a Reel ends and glides seamlessly to the next.

Perfect for when you're cooking, working out, or simply want to sit back and relax.

## ✨ Features

<table>
  <tr>
    <td width="50%">
      <h3>🔄 Intelligent Auto-Scroll</h3>
      <ul>
        <li><b>Smart Detection:</b> Glides to the next Reel instantly upon completion.</li>
        <li><b>Robust Targeting:</b> Uses vertical geometric bounding boxes, avoiding fragile DOM hierarchy dependencies.</li>
        <li><b>Loop Prevention:</b> Gracefully disables default loops to keep your feed moving.</li>
        <li><b>Zero-Lag Engine:</b> Bypasses heavy DOM observers in favor of lightweight polling, preserving CPU and battery life.</li>
      </ul>
    </td>
    <td width="50%">
      <h3>🎛️ Premium Control</h3>
      <ul>
        <li><b>Floating Toggle:</b> An unobtrusive, sleek button injected directly onto the Reels interface.</li>
        <li><b>Popup Dashboard:</b> A beautifully crafted, dark-mode optimized control center.</li>
        <li><b>Real-time Sync:</b> Instantaneous state updates across all tabs without page reloads.</li>
        <li><b>Native Aesthetic:</b> Integrates seamlessly with Instagram's native UI and gradient language.</li>
      </ul>
    </td>
  </tr>
</table>

## 📦 Installation

### Chrome web store:

[Reels Flow - Auto Scroll for Instagram Reels](https://chromewebstore.google.com/detail/reels-flow-auto-scroll-fo/mlmllpiifbmfnopepamjhbdedfjajgcl)

### Install as a developer:

1. **Download:** Clone this repository or download the ZIP file and extract it.
2. **Extensions Page:** Navigate to `chrome://extensions` in your browser.
3. **Developer Mode:** Toggle **"Developer mode"** in the top right corner.
4. **Load Extension:** Click **"Load unpacked"** and select the extracted folder (the one containing `manifest.json`).
5. **Pin:** Pin the Reels Flow icon to your toolbar for immediate access!

## 🎮 Usage

### Control Center Popup
Click the extension icon in your toolbar to access global settings:
- **Auto-Scroll:** Master switch to enable or disable hands-free scrolling.
- **Show Toggle:** Display or hide the floating control button on the Instagram feed.

### Floating Interface
When enabled, a minimal floating button appears on the Instagram Reels page. 
- **Quick Access:** Instantly pause or resume auto-scrolling without opening the popup.
- **Visual Feedback:** The toggle illuminates with the signature Instagram gradient when active.

## 🛠️ Architecture & Tech Stack

Built strictly with modern, vanilla web technologies to ensure maximum performance and security.

- **Core:** Vanilla JavaScript (ES6+), HTML5, CSS3
- **Framework:** Chrome Extensions Manifest V3
- **Performance Engine:** High-efficiency event polling & IntersectionObserver
- **Styling:** Native CSS Variables, CSS Transitions, Flexbox

## 🔒 Privacy & Security

**Reels Flow is built on a strict zero-trust philosophy.**

- **Absolute Minimum Permissions:** We request only the local `storage` permission. No `tabs`, no `scripting`, no invasive monitoring.
- **Zero Data Collection:** We do not track, store, or transmit your viewing habits, credentials, or personal data.
- **Offline Capable:** The entire extension executes strictly locally within your browser environment.

## 📄 License

Distributed under the [MIT License](LICENSE).

---
<div align="center">
  <sub>Built with ❤️ for a frictionless viewing experience.</sub>
</div>
