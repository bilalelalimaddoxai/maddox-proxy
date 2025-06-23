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
 * Route: GET /:clientKey/charts
 * Lists available charts for the given client.
 */
app.get('/:clientKey/charts', async (req, res) => {
  const { clientKey } = req.params;
  const upper = clientKey.toUpperCase();
  const email = process.env[`MADDOX_EMAIL_${upper}`];
  const password = process.env[`MADDOX_PASSWORD_${upper}`];
  const workspace = process.env[`MADDOX_WORKSPACE_${upper}`] || clientKey;

  if (!email || !password) {
    return res.status(400).json({ error: `Missing credentials for client '${clientKey}'.` });
  }

  try {
    // Authenticate
    const { data: loginData } = await axios.post(LOGIN_URL, { email, password });
    const token = loginData.accessToken;

    // Fetch chart list
    const chartsRes = await axios.get(LIST_CHARTS_URL(workspace), {
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: 'application/vnd.maddox.v3+json'
      }
    });

    res.json(chartsRes.data);
  } catch (err) {
    console.error(err.response?.data || err.message);
    const status = err.response?.status || 500;
    res.status(status).json({ error: 'Upstream API error listing charts', details: err.response?.data || err.message });
  }
});

/**
 * Route: GET /:clientKey/inspections/:chartId
 * Dynamically discovers chartType from chartId and fetches its data.
 * Query params: timeframe, binSize
 */
app.get('/:clientKey/inspections/:chartId', async (req, res) => {
  const { clientKey, chartId } = req.params;
  const { timeframe = '24h', binSize = 'hours' } = req.query;

  const upper = clientKey.toUpperCase();
  const email = process.env[`MADDOX_EMAIL_${upper}`];
  const password = process.env[`MADDOX_PASSWORD_${upper}`];
  const workspace = process.env[`MADDOX_WORKSPACE_${upper}`] || clientKey;

  if (!email || !password) {
    return res.status(400).json({ error: `Missing credentials for client '${clientKey}'.` });
  }

  try {
    // 1) Authenticate
    const { data: loginData } = await axios.post(LOGIN_URL, { email, password });
    const token = loginData.accessToken;
    const headers = { headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' } };

    // 2) List charts to find the type for this chartId
    const chartsRes = await axios.get(LIST_CHARTS_URL(workspace), { headers: { Authorization: `Bearer ${token}`, Accept: 'application/vnd.maddox.v3+json' } });
    const chartDef = chartsRes.data.find(c => c.id === chartId);
    if (!chartDef) {
      return res.status(404).json({ error: `Chart with id '${chartId}' not found` });
    }
    // Convert chartType to lowercase underscore form
    const chartType = chartDef.chartType.toLowerCase();

    // 3) Fetch chart data using discovered type
    const dataRes = await axios.get(
      getChartDataURL(workspace, chartType, chartId, timeframe, binSize),
      headers
    );

    // 4) Return
    res.json(dataRes.data);
  } catch (err) {
    console.error(err.response?.data || err.message);
    const status = err.response?.status || 500;
    res.status(status).json({ error: 'Upstream API error', details: err.response?.data || err.message });
  }
});

// Health-check root
app.get('/', (req, res) => res.send('🚀 Maddox Proxy live. Use /{clientKey}/charts and /{clientKey}/inspections/{chartId}'));

app.listen(port, () => console.log(`🚀 Server listening on port ${port}`));
