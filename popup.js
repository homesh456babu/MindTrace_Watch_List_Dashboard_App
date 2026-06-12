import { getInsights } from './llama-api.js';

chrome.storage.local.get(["history"], async (result) => {
  const list = document.getElementById("list");

  if (!result.history || result.history.length === 0) {
    list.innerHTML = "<p>No history yet 😴</p>";
    return;
  }

 
  const filtered = result.history.filter(item => !item.url.includes("google.com/search"));

  //  Reverse for recent-first
  const reversed = [...filtered].reverse();

  //  Split into reading/watching
  const watching = reversed.filter(item => item.isVideo);
  const reading = reversed.filter(item => !item.isVideo);

  // Render Section Utility
  async function renderSection(title, items) {
    const section = document.createElement("div");
    section.innerHTML = `<h3>${title}</h3>`;

    if (items.length === 0) {
      section.innerHTML += `<p style="color:gray;">No ${title.toLowerCase()} yet.</p>`;
      return section;
    }

    for (const item of items) {
      const div = document.createElement("div");
      div.style.marginBottom = "1em";

      // Format time
      const minutes = Math.floor(item.timeSpent / 60);
      const seconds = item.timeSpent % 60;
      const timeText = minutes > 0 ? `${minutes}m ${seconds}s` : `${seconds}s`;

      //  Format date
      const date = new Date(item.timestamp);
      const dateText = date.toLocaleDateString(undefined, {
        year: 'numeric', month: 'short', day: 'numeric'
      });

      //  Insight block
      const insightText = item.insight
        ? `<p style="margin-top:0.5em; padding:0.5em; background:#f0f0f0; border-radius:8px;">
            <b>🧠 Insight:</b><br>${item.insight}
           </p>`
        : `<p style="margin-top:0.5em; color:gray;">Extracting insight...</p>`;

      div.innerHTML = `
        <b>${item.title}</b> (${timeText} on ${dateText})
        <br><i style="font-size: 0.85em;">${item.url}</i>
        ${insightText}
        <hr>`;

      section.appendChild(div);
      list.appendChild(section);

      //  If insight is missing → call LLM and update
      if (!item.insight) {
        const insight = await getInsights(item.content || item.title);
        item.insight = insight;

        // Update storage
        chrome.storage.local.get(["history"], (updated) => {
          const history = updated.history || [];
          const i = history.findIndex(h => h.url === item.url && h.timestamp === item.timestamp);
          if (i !== -1) {
            history[i].insight = insight;
            chrome.storage.local.set({ history }, () => {
              console.log(" Insight saved for", item.title);
            });
          }
        });

        // Update UI in-place
        div.querySelector("p").outerHTML = `
          <p style="margin-top:0.5em; padding:0.5em; background:#f0f0f0; border-radius:8px;">
            <b> Insight:</b><br>${insight}
          </p>`;
      }
    }

    return section;
  }

  //  Render sections
  list.innerHTML = "";
  await renderSection("Watching", watching);
  await renderSection("Reading", reading);
});
