require("dotenv").config();
const express = require("express");
const axios = require("axios");
const cors = require("cors");

const app = express();

// CORS Settings: Isse frontend se connection block nahi hoga
app.use(cors({
    origin: "*", // Sabhi domains ko allow karne ke liye
    methods: ["GET", "POST"],
    allowedHeaders: ["Content-Type", "Authorization"]
}));

app.use(express.json());
app.use(express.static("public"));

app.post("/news", async (req, res) => {
    try {
        let { prompt, date } = req.body;

        if (!prompt) return res.status(400).json({ result: "Prompt is required" });

        // 🔥 SMART QUERY
        let tavilyQuery = `SSC UPSC govt exam news ${date}`;
        const p = prompt.toLowerCase();
        if (p.includes("ssc") && !p.includes("upsc")) tavilyQuery = `SSC board exams news ${date}`;
        else if (p.includes("upsc") && !p.includes("ssc")) tavilyQuery = `UPSC CSE CDS CAPF news ${date}`;
        else if (p.includes("ap ssc") || p.includes("telangana")) tavilyQuery = `AP Telangana SSC exams ${date}`;
        else if (p.includes("gd") || p.includes("cgl") || p.includes("cds")) tavilyQuery = `SSC GD CGL CDS exam update ${date}`;

        const tavilyRes = await axios.post("https://api.tavily.com/search", {
            query: tavilyQuery,
            search_depth: "advanced",
            max_results: p.includes("big") || p.includes("major") ? 8 : 6
        }, {
            headers: { "Authorization": `Bearer ${process.env.TAVILY_API_KEY}` }
        });

        const rawData = tavilyRes.data.results.map(item => item.content).join("\n");

        // 🔥 GROQ 
        const groqRes = await axios.post("https://api.groq.com/openai/v1/chat/completions", {
            model: "llama-3.1-8b-instant",
            messages: [{
                role: "user",
                content: `${prompt.replace(/TODAY/gi, date)}\n\nData:\n${rawData}\n\nSTRICT RULES:\n- Exactly 5 to 20 short news (1 line each only).\n- Follow user prompt 100%.\n- No explanation, no extra text.\n- Numbered list only if user asked.`
            }]
        }, {
            headers: { "Authorization": `Bearer ${process.env.GROQ_API_KEY}` }
        });

        let result = groqRes.data.choices[0].message.content.trim();
        
        // Final filter to ensure clean response
        if (result.split("\n").length > 21) result = result.split("\n").slice(0, 20).join("\n");

        res.json({ result });

    } catch (error) {
        console.error("ERROR:", error.response?.data || error.message);
        res.status(500).json({ result: "❌ Server Error. Please check API keys or Network." });
    }
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`✅ Server running on http://localhost:${PORT}`));