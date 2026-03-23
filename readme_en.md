<p align="center">
  <img src="./images/RedBox.jpg" alt="RedBox - Xiaohongshu Creator Workbench" width="25%">
</p>

<p align="center">
  <img src="https://img.shields.io/github/v/release/Jamailar/RedBox?style=flat-square&color=E11D48" alt="Version">
  &nbsp;
  <img src="https://img.shields.io/badge/license-MIT--NC-E11D48?style=flat-square" alt="License">
  &nbsp;
  <img src="https://img.shields.io/badge/platform-macOS%20%7C%20Windows-6C757D?style=flat-square" alt="Platform">
  &nbsp;
  <img src="https://img.shields.io/github/stars/Jamailar/RedBox?style=flat-square&color=F59E0B" alt="Stars">
</p>

---

<p align="center">
  <strong>A local AI creator workbench for Xiaohongshu</strong><br>
  <em>Knowledge Capture | Inspiration | RedClaw Automation | Manuscript + Media Workflow | Background Execution</em>
</p>

<p align="center">
  <a href="https://github.com/Jamailar/RedBox/releases">
    <img src="https://img.shields.io/badge/⬇️%20Download-Latest%20Release-E11D48?style=for-the-badge&logo=github&logoColor=white" alt="Download Latest Release" height="46">
  </a>
</p>

<p align="center">
  <strong>English</strong> | <a href="./README.md">简体中文</a> | <a href="./readme_tw.md">繁體中文</a> | <a href="./readme_jp.md">日本語</a> | <a href="./readme_ko.md">한국어</a> | <a href="./readme_es.md">Español</a> | <a href="./readme_pt.md">Português</a> | <a href="./readme_tr.md">Türkçe</a>
</p>

---

## Quick Navigation

<p align="center">

[Overview](#overview) ·
[Core Features](#core-features) ·
[Screenshots](#screenshots) ·
[Quick Start](#quick-start) ·
[Community](#community)

</p>

---

## Overview

**RedBox (RedConvert)** is a desktop AI creation workspace focused on Xiaohongshu workflows.

It connects:
- content capture (built-in browser)
- local knowledge base
- AI-assisted drafting
- RedClaw automation
- media generation and binding

All data is workspace-aware and space-isolated.

## Core Features

1. Built-in Xiaohongshu browser and one-click capture
2. Local knowledge base with retrieval support
3. Multi-space isolation for different creator projects
4. Wander mode for random inspiration generation
5. Manuscript editor with AI side assistance
6. Advisors + group chat discussion workflow
7. RedClaw single-session automation cockpit
8. Image generation and media library integration
9. Background runner for scheduled and long-cycle tasks

## Screenshots

### RedClaw
![RedClaw](./images/redclaw.png)

### Manuscripts
![Manuscripts](./images/darft.png)

### Knowledge Base
![Knowledge](./images/knowledge.png)

### Wander
![Wander](./images/wander.png)

### Advisors
![Advisors](./images/advisor.png)

### Group Chat
![Group Chat](./images/groupchat.png)

## Quick Start

1. Download the latest installer from [Releases](https://github.com/Jamailar/RedBox/releases).
2. Open `Settings -> AI` and configure:
   - API Endpoint
   - API Key
   - Model Name
3. Test connection and save.
4. Start from `XHS Browser -> Capture -> Knowledge -> Manuscripts/RedClaw`.

## Community

<p align="center">
  <img src="./images/wechatgroup.png" alt="RedBox WeChat Group" width="35%">
</p>

## Changelog

### v1.7.9 (2026-03-22)

- Fixed the Wander AI request flow:
  - Explicitly disables Qwen thinking mode for single-call execution
  - Added stronger Wander request logging and timeout control for diagnosis
- Refined the RedClaw tool timeline UI:
  - Tool-call rows are now denser, smaller, and visually less intrusive
- Tightened the Wander header:
  - Merged title, hint text, and mode switch into a shorter single-row header

### v1.7.8 (2026-03-21)

- Performance updates (based on commits in `v1.7.6..HEAD`):
  - Main process now opens window first, then initializes heavy background services asynchronously
  - App pages now use lazy loading with loading fallback to reduce startup and tab-switch loading cost
- Settings model management improvement:
  - Added model list fetching and searching for AI source configuration
- YouTube collection updates:
  - Added global clipboard capture entry for YouTube links
  - Enforced yt-dlp readiness checks before collection
- Release pipeline updates:
  - Added automatic release note publishing in release script
  - Release notes now default to matching README changelog section, with recent commits as fallback

### v1.7.6 (2026-03-21)

- Added first-run guided onboarding (Tippy.js) to show the recommended workflow order
- Added “Start Creating” action in Wander result to send topic + materials directly to RedClaw
- Fixed stale bottom-left app version display by loading app version dynamically
- Unified MCP client version reporting with package version

### v1.7.5 (2026-03-21)

- Restored note detection and refresh behavior
- Prioritized current opened note container parsing
- Improved image/video type classification
- Enhanced capture pipeline consistency

### v1.7.4 (2026-03-20)

- Upgraded RedClaw task center and background execution
- Improved scheduled task visibility and heartbeat flow
- Unified app display name as `RedBox`
