export async function getInsights(text) {
  try {
    const res = await fetch("http://localhost:3001/api/generate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "tinyllama", // or "mistral", "tinyllama", etc.
        prompt: `Summarize the key ideas from the following text in a concise manner (maximum 150-200 words). Focus only on the most important context and key takeaways:\n\n${text}`,
        stream: false
      })
    });

    const data = await res.json();
    const rawInsight = data.response || "";
    const cleaned = rawInsight
      .replace(/^(Sure!?\s*)?(Here is|Here's) a? (summary|insights?|takeaways?) of the (text|data|information|provided)( below)?:?\s*/i, "")
      .replace(/^(Here are|Here's) (the|some) key (ideas|takeaways|insights?)( from the text)?:?\s*/i, "")
      .trim();
    return cleaned;
  } catch (err) {
    console.error("❌ LLM backend error:", err);
    return "⚠️ Could not connect to proxy or LLM backend.";
  }
}
