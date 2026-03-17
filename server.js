require("dotenv").config();
const express = require("express");
const axios = require("axios");
const cors = require("cors");

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.static("public"));

app.post("/news", async (req, res) => {
  try {
    let { prompt, date } = req.body;

    // 🔥 SMART QUERY (credit save + accurate)
    let tavilyQuery = `SSC UPSC govt exam news ${date}`;
    const p = prompt.toLowerCase();
    if (p.includes("ssc") && !p.includes("upsc")) tavilyQuery = `SSC board exams news ${date}`;
    else if (p.includes("upsc") && !p.includes("ssc")) tavilyQuery = `UPSC CSE CDS CAPF news ${date}`;
    else if (p.includes("ap ssc") || p.includes("telangana")) tavilyQuery = `AP Telangana SSC exams ${date}`;
    else if (p.includes("gd") || p.includes("cgl") || p.includes("cds")) tavilyQuery = `SSC GD CGL CDS exam update ${date}`;

    const tavilyRes = await axios.post("https://api.tavily.com/search", {
      query: tavilyQuery,
      search_depth: "advanced",
      max_results: p.includes("big") || p.includes("major") ? 8 : 6   // kam results = kam credit
    }, {
      headers: { Authorization: `Bearer ${process.env.TAVILY_API_KEY}` }
    });

    const rawData = tavilyRes.data.results.map(item => item.content).join("\n");

    // 🔥 GROQ (strict rules)
    const groqRes = await axios.post("https://api.groq.com/openai/v1/chat/completions", {
      model: "llama-3.1-8b-instant",
      messages: [{
        role: "user",
        content: `
${prompt.replace(/TODAY/gi, date)}

Data:
${rawData}

STRICT RULES:
- Exactly 5 to 20 short news (1 line each only).
- Follow user prompt 100% (if "only SSC" then only SSC, if "big news" then 10-15, if "all" then 15-20).
- If very less news today → give only 5-8.
- Total response under 500 words.
- No explanation, no extra text.
- Numbered list only if user asked.
`
      }]
    }, {
      headers: { Authorization: `Bearer ${process.env.GROQ_API_KEY}` }
    });

    let result = groqRes.data.choices[0].message.content.trim();
    // safety cut
    if (result.split("\n").length > 21) result = result.split("\n").slice(0, 20).join("\n");

    res.json({ result });

  } catch (error) {
    console.error("ERROR:", error.response?.data || error.message);
    res.json({ result: "❌ Error (API limit ya network issue). 2 minute baad try karo." });
  }
});

app.listen(5000, () => console.log("✅ Server running on http://localhost:5000"));