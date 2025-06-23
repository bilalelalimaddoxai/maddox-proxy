import express from 'express';
import axios from 'axios';

const app = express();
const port = process.env.PORT || 3000;

// Maddox API login endpoint
const LOGIN_URL = "https://api.maddox.ai/auth/login";

// Client credentials mapping — configure these env vars in Render
const CLIENTS = {
  endurance: {
    email: process.env.MADDOX_EMAIL_ENDURANCE,
    password: process.env.MADDOX_PASSWORD_ENDURANCE
  },
  acme: {
    email: process.env.MADDOX_EMAIL_ACME,
    password: process.env.MADDOX_PASSWORD_ACME
  }
  // Add more clients here as needed
};

// Construct the chart data URL dynamically
const getChartURL = (chartId, timeframe = '24h', binSize = 'hours') =>
  `https://api.maddox.ai/monitor/rohstellen/charts/inspected_items/${chartId}/data?timeframe=${timeframe}&binSize=${binSize}`;

/**
 * Route: GET /:clientKey/inspections/:chartId
 * Example: /endurance/inspections/109c440b-d2d6-4684-9845-f42b38e3ad78?timeframe=24h&binSize=hours
 * Logs in as the specified client, fetches chart data, and returns JSON.
 */
app.get('/:clientKey/inspections/:chartId', async (req, res) => {
  const { clientKey, chartId } = req.params;
  const { timeframe = '24h', binSize = 'hours' } = req.query;

  // Validate client
  const creds = CLIENTS[clientKey];
  if (!creds || !creds.email || !creds.password) {
    return res.status(400).json({ error: 'Unknown client key or missing credentials' });
  }

  try {
    // Authenticate
    const { data: loginData } = await axios.post(LOGIN_URL, {
      email: creds.email,
      password: creds.password
    });
    const token = loginData.accessToken;

    // Fetch chart data
    const chartURL = getChartURL(chartId, timeframe, binSize);
    const { data: chartData } = await axios.get(chartURL, {
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: 'application/json'
      }
    });

    // Return the chart data
    res.json(chartData);

  } catch (err) {
    console.error(err.response?.data || err.message);
    res.status(err.response?.status || 500).json({
      error: 'Upstream API error',
      details: err.response?.data || err.message
    });
  }
});

// Root health-check
app.get('/', (req, res) => {
  res.send('🚀 Maddox Proxy is live. Use /{clientKey}/inspections/{chartId}');
});

app.listen(port, () => {
  console.log(`🚀 Server running on port ${port}`);
});
