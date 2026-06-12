export async function getInsights(text) {
  try {
    const res = await fetch("http://localhost:3001/api/generate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "gemma:2b", // or "mistral", "tinyllama", etc.
      prompt: `Summarize the key ideas from the following text if you need external resources just summarize about title: (the first line of your response should always be "Sure, here's the summary of the data you provided:")
      ${text}`,
        stream: false
      })
    });

    const data = await res.json();
const rawInsight = data.response;
const cleaned = rawInsight
  .replace(/^Sure,?\s*here'?s the summary of the data you provided:?\s*/i, '')
  .trim();
return cleaned;


  } catch (err) {
    console.error("❌ LLM backend error:", err);
    return "⚠️ Could not connect to proxy or LLM backend.";
  }
}
