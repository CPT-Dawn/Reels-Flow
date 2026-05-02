<div align="center">
  <img src="assets/icon128.png" alt="Reels Flow Logo" width="128" />
  <h1>Reels Flow</h1>
  <h3>Auto Scroll for Instagram Reels</h3>
  
  <p>
    <b>Watch Instagram Reels Hands-Free. Seamlessly.</b>
  </p>

  <p>
    <a href="#features">Features</a> •
    <a href="#installation">Installation</a> •
    <a href="#usage">Usage</a> •
    <a href="#privacy">Privacy</a>
  </p>

  <img src="https://img.shields.io/badge/version-2.1.0-blue?style=flat-square" alt="Version" />
  <img src="https://img.shields.io/badge/license-MIT-green?style=flat-square" alt="License" />
  <img src="https://img.shields.io/badge/platform-Chrome%20%7C%20Edge%20%7C%20Brave-orange?style=flat-square" alt="Platform" />
</div>

<br />

---

## 🚀 Overview

**Reels Flow** transforms your Instagram Reels experience. Say goodbye to repetitive swiping and hello to a continuous, immersive flow. Whether you're cooking, working out, or just relaxing, Reels Flow intelligently detects when a Reel ends and automatically glides to the next one.

Engineered with performance and privacy in mind, Reels Flow is built as a highly optimized Manifest V3 extension. It uses minimal system resources and operates strictly within the local environment.

## ✨ Features

### 🔄 Intelligent Auto-Scroll
- **Smart Detection**: Automatically detects when a video finishes and scrolls to the next one instantly.
- **Robust Video Targeting**: Uses geometric bounding box calculations rather than fragile DOM structures, ensuring consistent behavior even when Instagram updates its interface.
- **Loop Prevention**: Disables the default loop behavior so you never get stuck watching the same Reel twice, gracefully restoring functionality when disabled.
- **Zero-Lag Architecture**: Bypasses heavy DOM mutation observers in favor of lightweight polling, saving battery and CPU.

### 🎛️ Premium Control Center
- **On-Screen Toggle**: A sleek floating button injected directly onto the Reels page for quick access, updating instantly without page reloads.
- **Popup Dashboard**: A beautiful, gradient-themed popup to manage settings globally.
- **Visual Feedback**: Interactive animations and hover effects that feel responsive and modern.

### 🎨 Native Aesthetic
- **Instagram-Inspired Design**: The UI uses Instagram's gradient colors and design language to feel right at home.
- **Dark Mode Optimized**: Perfect for late-night scrolling sessions.

## 📦 Installation

This extension is built for Chromium-based browsers (Chrome, Edge, Brave).

1.  **Download the Code**: Clone this repository or download the ZIP file and extract it.
2.  **Open Extensions Page**:
    - In Chrome/Edge/Brave, navigate to `chrome://extensions`.
3.  **Enable Developer Mode**:
    - Toggle the **"Developer mode"** switch in the top right corner.
4.  **Load Unpacked**:
    - Click the **"Load unpacked"** button.
    - Select the folder containing the `manifest.json` file.
5.  **Pin & Enjoy**: Pin the extension to your toolbar for easy access!

## 🎮 Usage

### The Popup
Click the extension icon in your browser toolbar to open the **Control Center**.
- **Auto-Scroll**: Master switch to enable/disable the auto-scrolling feature.
- **Show Toggle**: Choose whether to display the floating button on the Instagram page itself. Settings update instantly without requiring a page refresh.

### The Floating Toggle
When enabled, a sleek button appears on the top-right of your Instagram Reels feed.
- **One-Click Control**: Tap it to pause or resume auto-scrolling instantly without opening the popup.
- **Status Indicator**: The switch glows with the Instagram gradient when active.

## 🛠️ Tech Stack

- **Core**: Vanilla JavaScript (ES6+), HTML5, CSS3
- **Architecture**: Chrome Extensions Manifest V3
- **Performance**: High-efficiency event polling & IntersectionObserver integration
- **Styling**: Native CSS Variables, Flexbox, CSS Transitions
- **APIs**: `chrome.storage`

## 🔒 Privacy & Security

**Reels Flow** is designed around a strict zero-trust philosophy.
- **Absolute Minimum Permissions**: Only requires local `storage` to save your preferences. It does NOT request intrusive `tabs`, `scripting`, or `activeTab` permissions.
- **No Data Collection**: We do not collect, store, or transmit any of your personal data, credentials, or browsing history.
- **Offline First**: All code runs entirely locally on your browser.

## 📄 License

This project is licensed under the [MIT License](LICENSE) - see the file for details.

---

<div align="center">
  <p>Made with ❤️ for an uninterrupted viewing experience</p>
</div>
