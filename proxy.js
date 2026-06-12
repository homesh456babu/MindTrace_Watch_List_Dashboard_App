// proxy.js

import express from "express";
import cors from "cors";
import fetch from "node-fetch"; // Required for making Ollama requests

const app = express();
const PORT = 3001;

app.use(cors()); // allow all origins
app.use(express.json()); // parse JSON bodies

app.post("/api/generate", async (req, res) => {
  try {
    const ollamaRes = await fetch("http://localhost:11434/api/generate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(req.body),
    });

    const data = await ollamaRes.text(); // Ollama gives streamed/plain text sometimes
    res.send(data);
  } catch (err) {
    console.error("❌ Proxy error:", err);
    res.status(500).send("LLM proxy error");
  }
});

app.listen(PORT, () => {
  console.log(`✅ Proxy running at http://localhost:${PORT}/api/generate`);
});
