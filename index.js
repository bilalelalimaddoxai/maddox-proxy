import express from 'express';
import axios from 'axios';

const app = express();
const port = process.env.PORT || 3000;

// Maddox API endpoints
const LOGIN_URL = "https://api.maddox.ai/auth/login";
const LIST_CHARTS_URL = (workspaceKey) =>
  `https://api.maddox.ai/monitor/${workspaceKey}/charts`;
const getChartDataURL = (workspaceKey, chartType, chartId, timeframe, binSize) =>
  `https://api.maddox.ai/monitor/${workspaceKey}/charts/${chartType}/${chartId}/data?timeframe=${timeframe}&binSize=${binSize}`;

/**
 * Route: GET /:clientKey/inspections/:chartId
 * Example: /endurance/inspections/109c440b-d2d6-4684-9845-f42b38e3ad78?timeframe=24h&binSize=hours
 */
app.get('/:clientKey/inspections/:chartId', async (req, res) => {
  const { clientKey, chartId } = req.params;
  const { timeframe = '24h', binSize = 'hours', chartType = 'inspected_items' } = req.query;

  // Retrieve credentials & workspace
  const upper = clientKey.toUpperCase();
  const email = process.env[`MADDOX_EMAIL_${upper}`];
  const password = process.env[`MADDOX_PASSWORD_${upper}`];
  const workspace = process.env[`MADDOX_WORKSPACE_${upper}`] || clientKey;

  if (!email || !password) {
    return res.status(400).json({ error: `Missing credentials for client '${clientKey}'` });
  }

  try {
    // Authenticate
    const { data: loginData } = await axios.post(LOGIN_URL, { email, password });
    const token = loginData.accessToken;
    const headers = { headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' } };

    // Fetch chart data
    const dataRes = await axios.get(
      getChartDataURL(workspace, chartType, chartId, timeframe, binSize),
      headers
    );

    res.json(dataRes.data);
  } catch (err) {
    console.error(err.response?.data || err.message);
    const status = err.response?.status || 500;
    res.status(status).json({ error: 'Upstream API error', details: err.response?.data || err.message });
  }
});

// Health-check
app.get('/', (req, res) => res.send('🚀 Maddox Proxy live. Use /{clientKey}/inspections/{chartId}?timeframe&binSize'));

app.listen(port, () => console.log(`🚀 Server running on port ${port}`));
