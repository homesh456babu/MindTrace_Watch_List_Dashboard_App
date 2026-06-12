
## MindTrace: Automatic Reading & Watching History with LLM Insights

MindTrace is a Chrome/Firefox browser extension that **automatically tracks what you read or watch**, and uses a **locally running LLM** (like Gemma via Ollama) to extract **meaningful insights** — all stored and visible in a smart, searchable history panel.

---

##  Features

-  **Tracks browsing activity automatically**
-  **Separates Reading (articles) and Watching (videos)**
-  **Filters out low-value pages** like search results, login pages, ads
-  **Auto-extracts key insights** using a local LLM via `Ollama` (`gemma`, `mistral`, etc.)
-  **Zero cloud APIs** — all privacy-safe and offline
-  **Clean UI** with summaries, visit duration, and timestamps
-  **Stores history locally in browser** using `chrome.storage.local`

---

##  Installation & Setup (For Dev/Test)

### 1. Clone the repo

```bash
git clone https://github.com/homesh456babu/MindTrace_Watch_List_Dashboard_App.git
cd MindTrace_Watch_List_Dashboard_App
```

### 2. Install local LLM backend via Ollama

> [Ollama install docs →](https://ollama.com)

```bash
# Install and run your model
ollama run gemma:2b
```

You can also use: `tinyllama`, 'gemma:3-1b', or any supported model under 2GB.
For testing Just download small model like tinyllama
just do this
```bash
ollama run tinyllama
```
And requires a small change in the code-
```js
// llama-api.js
const res = await fetch("http://localhost:3001/api/generate", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    model: "tinyllama",  // 👈 change this to tinyllama, mistral, etc.
    prompt: "...",
    stream: false
  })
});
```

### 3. Run local proxy server (to bypass CORS)

```bash
# From the extension folder
npm install
node proxy.js
```

This enables the extension to communicate with Ollama without CORS errors.

### 4. Load extension in Chrome

- Go to `chrome://extensions`
- Enable **Developer Mode**
- Click **Load Unpacked** and select this project folder

Done!

---

##  How It Works (Testing Tips)

- Open any article or video (not Google/search/login pages)
- Stay for a few seconds (at least 4s)
- Close the tab
- Open the extension popup — you'll see:
  - Title + URL  
  - Duration + visit date  
  -  LLM-extracted insight (auto-generated)

If the LLM is still generating, you'll see "Extracting insight…" for a moment.

---

##  Assumptions & Design Notes

- LLM must be running **locally** via Ollama (`localhost:11434`)
- A simple **Node proxy** (`localhost:3001`) is used to bypass extension CORS limits
- Content is filtered for quality:
  -  Google searches, login pages, empty pages, short visits
  -  Only long-form content (with >100 chars and >4s dwell time)

---

##   Addtional Project Features

-  Fully automated — no button-clicking to save anything
-  No backend, no API — 100% local inference and storage
-  Smart design — separates reading/watching, filters noise
-  Uses modern tech: Ollama, LLM, `chrome.storage`, auto-summarization
-  Easily extensible into public profiles or syncable history

---

## Future Works

- [ ] Add support for public profile export
- [ ] Add "Show More" toggle for long summaries
- [ ] Add dark mode support 🌙

---


