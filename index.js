import express from 'express';
import axios from 'axios';
import dotenv from 'dotenv';

dotenv.config();
const app = express();
const port = process.env.PORT || 3000;

const LOGIN_URL = "https://api.maddox.ai/api/auth/login";

app.get('/inspections', async (req, res) => {
  try {
    const chartId = "109c440b-d2d6-4684-9845-f42b38e3ad78";
    const chartURL = `https://api.maddox.ai/monitor/rohstellen/charts/inspected_items/${chartId}/data?timeframe=24h&binSize=hours`;

    const loginRes = await axios.post(LOGIN_URL, {
      email: process.env.MADDOX_EMAIL,
      password: process.env.MADDOX_PASSWORD
    });

    const token = loginRes.data.accessToken;

    const chartRes = await axios.get(chartURL, {
      headers: {
        "Authorization": `Bearer ${token}`,
        "Accept": "application/json",
        "User-Agent": "Mozilla/5.0"
      }
    });

    res.json(chartRes.data);

  } catch (err) {
    console.error(err.response?.data || err.message);
    res.status(500).json({ error: "API error", details: err.response?.data || err.message });
  }
});

app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});
