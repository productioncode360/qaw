require("dotenv").config();
const express = require("express");
const axios = require("axios");
const cors = require("cors");
const path = require("path");

const app = express();

// ✅ CORS
app.use(cors());

// ✅ JSON
app.use(express.json());

// ✅ Static frontend
app.use(express.static("public"));

// ✅ Force index.html load
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

// 🔥 MAIN API
app.post("/news", async (req, res) => {
  try {
    console.log("🔥 /news API hit");

    let { prompt, date } = req.body;

    if (!prompt) {
      return res.status(400).json({ result: "Prompt is required" });
    }

    // 🔥 Smart Query
    let tavilyQuery = `SSC UPSC govt exam news ${date}`;
    const p = prompt.toLowerCase();

    if (p.includes("ssc") && !p.includes("upsc")) {
      tavilyQuery = `SSC exam news ${date}`;
    } else if (p.includes("upsc") && !p.includes("ssc")) {
      tavilyQuery = `UPSC exam news ${date}`;
    } else if (p.includes("bank")) {
      tavilyQuery = `Banking exam news ${date}`;
    }

    // 🔎 Tavily API
    const tavilyRes = await axios.post(
      "https://api.tavily.com/search",
      {
        query: tavilyQuery,
        search_depth: "advanced",
        max_results: 6
      },
      {
        headers: {
          Authorization: `Bearer ${process.env.TAVILY_API_KEY}`
        },
        timeout: 10000
      }
    );

    const rawData = tavilyRes.data.results
      .map((item) => item.content)
      .join("\n");

    // 🤖 GROQ API
    const groqRes = await axios.post(
      "https://api.groq.com/openai/v1/chat/completions",
      {
        model: "llama-3.1-8b-instant",
        messages: [
          {
            role: "user",
            content: `${prompt.replace(/TODAY/gi, date)}

Data:
${rawData}

RULES:
- 5 to 10 short points
- One line each
- No extra text`
          }
        ]
      },
      {
        headers: {
          Authorization: `Bearer ${process.env.GROQ_API_KEY}`
        },
        timeout: 10000
      }
    );

    let result = groqRes.data.choices[0].message.content.trim();

    res.json({ result });
  } catch (error) {
    console.error("❌ ERROR:", error.response?.data || error.message);

    res.status(500).json({
      result: "❌ Server Error. Check API keys or network."
    });
  }
});

// ✅ PORT (Render compatible)
const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`✅ Server running on port ${PORT}`);
});
