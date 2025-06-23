import express from 'express';
import axios from 'axios';

const app = express();
const port = process.env.PORT || 3000;

// Verified endpoints for Maddox API
const LOGIN_URL = "https://api.maddox.ai/auth/login";
const CHART_ID = "109c440b-d2d6-4684-9845-f42b38e3ad78";
const CHART_URL = id =>
  `https://api.maddox.ai/monitor/rohstellen/charts/inspected_items/${id}/data?timeframe=24h&binSize=hours`;

app.get('/inspections', async (req, res) => {
  try {
    // 1) Log in and grab JWT
    const { data: loginData } = await axios.post(LOGIN_URL, {
      email: process.env.MADDOX_EMAIL,
      password: process.env.MADDOX_PASSWORD
    });
    const token = loginData.accessToken;

    // 2) Fetch chart data
    const { data: chartData } = await axios.get(CHART_URL(CHART_ID), {
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: 'application/json'
      }
    });

    // 3) Return the data
    res.json(chartData);

  } catch (err) {
    console.error(err.response?.data || err.message);
    res.status(500).json({ 
      error: 'Upstream API error', 
      details: err.response?.data || err.message 
    });
  }
});

app.listen(port, () => {
  console.log(`🚀 Server running on port ${port}`);
});
