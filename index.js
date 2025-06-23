import express from 'express';
import axios from 'axios';

const app = express();
const port = process.env.PORT || 3000;

// Verified Maddox API login endpoint
const LOGIN_URL = "https://api.maddox.ai/auth/login";

// Helper to construct chart data URL dynamically
const getChartURL = (chartId, timeframe = '24h', binSize = 'hours') =>
  `https://api.maddox.ai/monitor/rohstellen/charts/inspected_items/${chartId}/data?timeframe=${timeframe}&binSize=${binSize}`;

/**
 * Route: GET /inspections/:chartId
 * Example: /inspections/109c440b-d2d6-4684-9845-f42b38e3ad78?timeframe=24h&binSize=hours
 * Logs in, fetches chart data for given chartId, and returns JSON.
 */
app.get('/inspections/:chartId', async (req, res) => {
  const { chartId } = req.params;
  const { timeframe = '24h', binSize = 'hours' } = req.query;

  try {
    // 1) Authenticate
    const { data: loginData } = await axios.post(LOGIN_URL, {
      email: process.env.MADDOX_EMAIL,
      password: process.env.MADDOX_PASSWORD
    });
    const token = loginData.accessToken;

    // 2) Fetch chart data
    const chartURL = getChartURL(chartId, timeframe, binSize);
    const { data: chartData } = await axios.get(chartURL, {
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: 'application/json'
      }
    });

    // 3) Respond with the chart data
    res.json(chartData);
  } catch (err) {
    console.error(err.response?.data || err.message);
    res.status(500).json({
      error: 'Upstream API error',
      details: err.response?.data || err.message
    });
  }
});

// Optional root health check
app.get('/', (req, res) => {
  res.send('🚀 Maddox Proxy is live. Use /inspections/:chartId');
});

app.listen(port, () => {
  console.log(`🚀 Server running on port ${port}`);
});
