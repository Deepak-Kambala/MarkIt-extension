# MarkIt - Chrome Extension 📖

---

## 🎯 Overview

**MarkIt (Highlight Saver Pro)** is a powerful Chrome extension that lets users **save, manage, and export text highlights** from any webpage. With a simple right-click, you can capture important text snippets along with their source URLs, organize them in a sleek interface, and export to PDF for offline reference.

---

## 💼 Use Cases

### 🎓 Academic Research
- Save key quotes from research papers  
- Collect references with source links  
- Organize findings by topic or project  
- Export compiled research to PDF  

### 💼 Professional Work
- Capture important information from documents  
- Save code snippets with source references  
- Collect competitive intelligence  
- Build knowledge bases from web content  

### 📚 Personal Learning
- Save inspiring quotes from articles  
- Collect recipe instructions with sources  
- Build reading lists with key insights  
- Create study guides from online resources  

### 🔍 Content Creation
- Gather reference materials for writing  
- Save statistics and facts with sources  
- Collect examples for analysis  
- Build content outlines from research  

---

## ✨ Features

### 🔥 Core Features
- **One-Click Highlight Saving:** Right-click any selected text to save instantly  
- **Smart Source Tracking:** Automatically captures page URL and timestamp  
- **Beautiful Interface:** Modern UI with smooth animations  
- **Duplicate Prevention:** Prevents saving the same highlight twice  
- **Real-time Updates:** Live refresh of highlights list  

### 📊 Management Features
- **Visual Organization:** Card-based layout with metadata  
- **Quick Deletion:** Remove highlights individually  
- **Bulk Operations:** Clear all highlights with confirmation  
- **Statistics Display:** Total count & today's highlights counter  
- **"NEW" Badges:** Indicators for recently added items  

### 📤 Export Features
- **PDF Generation:** Professional document creation  
- **Automatic Formatting:** Clean, readable PDF layout  
- **Source Links:** Clickable URLs in exported PDF  
- **Timestamped Files:** Unique filenames with export dates  
- **Progress Indicators:** Visual feedback during export  

---

## 🛠 Technology Stack
- **Frontend:** HTML5, CSS3, JavaScript (ES6+)  
- **Chrome Extension APIs:** Manifest V3, Storage API, Context Menus, Scripting API, Notifications  
- **Libraries:** jsPDF 2.5.1 for PDF generation  
- **Development Features:** Modular architecture, error handling, offline capable, cross-browser compatible  

---

## 📥 Installation Guide

### Method 1: Developer Installation
1. Download the extension files  
2. Open Chrome → `chrome://extensions/`  
3. Enable **Developer mode** (top right corner)  
4. Click **Load unpacked** → Select the extension folder  
5. Extension icon appears in toolbar  

### Method 2: Manual Setup
1. Create folder structure:
```text
highlight-saver-pro/
├── manifest.json
├── popup.html
├── popup.js
├── background.js
└── libs/
    └── jspdf.umd.min.js
