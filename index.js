import express from 'express';
import axios from 'axios';

const app = express();
const port = process.env.PORT || 3000;

// Maddox API endpoints
typeof LOGIN_URL;
const LOGIN_URL = "https://api.maddox.ai/auth/login";
const LIST_CHARTS_URL = (workspaceKey) =>
  `https://api.maddox.ai/monitor/${workspaceKey}/charts`;
const getChartDataURL = (workspaceKey, chartType, chartId, timeframe, binSize) =>
  `https://api.maddox.ai/monitor/${workspaceKey}/charts/${chartType}/${chartId}/data?timeframe=${timeframe}&binSize=${binSize}`;

/**
 * Route: GET /:clientKey/inspections/:chartId
 * Example: /endurance/inspections/109c440b-d2d6-4684-9845-f42b38e3ad78?timeframe=24h&binSize=hours
 * - clientKey maps to credentials and workspaceKey
 * Env vars needed per client:
 *   MADDOX_EMAIL_<CLIENTKEY_UPPERCASE>
 *   MADDOX_PASSWORD_<CLIENTKEY_UPPERCASE>
 *   MADDOX_WORKSPACE_<CLIENTKEY_UPPERCASE>
 */
app.get('/:clientKey/inspections/:chartId', async (req, res) => {
  const { clientKey, chartId } = req.params;
  const { timeframe = '24h', binSize = 'hours', chartType = 'inspected_items' } = req.query;

  // Retrieve client-specific creds & workspace
  const upper = clientKey.toUpperCase();
  const email = process.env[`MADDOX_EMAIL_${upper}`];
  const password = process.env[`MADDOX_PASSWORD_${upper}`];
  const workspace = process.env[`MADDOX_WORKSPACE_${upper}`];

  if (!email || !password || !workspace) {
    return res.status(400).json({ error: `Missing config for client '${clientKey}'. Ensure MADDOX_EMAIL_${upper}, MADDOX_PASSWORD_${upper}, and MADDOX_WORKSPACE_${upper} are set.` });
  }

  try {
    // 1) Authenticate and get JWT
    const { data: loginData } = await axios.post(LOGIN_URL, { email, password });
    const token = loginData.accessToken;
    const headers = { headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' } };

    // 2) Optionally list charts to validate chartType
    // const chartsRes = await axios.get(LIST_CHARTS_URL(workspace), headers);

    // 3) Fetch chart data using workspace key
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

