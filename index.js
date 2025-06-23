import express from 'express';
import axios from 'axios';

const app = express();
const port = process.env.PORT || 3000;

// Endpoints
const LOGIN_URL = "https://api.maddox.ai/auth/login";
const LIST_CHARTS_URL = (clientKey) =>
  `https://api.maddox.ai/monitor/${clientKey}/charts`;
const getChartDataURL = (clientKey, chartType, chartId, timeframe, binSize) =>
  `https://api.maddox.ai/monitor/${clientKey}/charts/${chartType}/${chartId}/data?timeframe=${timeframe}&binSize=${binSize}`;

app.get('/:clientKey/inspections', async (req, res) => {
  const { clientKey } = req.params;
  const {
    timeframe = '24h',
    binSize = 'hours',
    chartType = 'inspected_items'
  } = req.query;

  try {
    // 1) Login and get JWT
    const loginRes = await axios.post(LOGIN_URL, {
      email: process.env[`MADDOX_EMAIL_${clientKey.toUpperCase()}`],
      password: process.env[`MADDOX_PASSWORD_${clientKey.toUpperCase()}`]
    });
    const token = loginRes.data.accessToken;
    const authHeaders = { headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' } };

    // 2) List available charts for this client
    const chartsRes = await axios.get(LIST_CHARTS_URL(clientKey), authHeaders);
    const chartsList = chartsRes.data;

    // 3) Find the chart matching our requested type
    const chartDef = chartsList.find(c => c.key === chartType || c.id === chartType || c.name === chartType);
    if (!chartDef) {
      return res.status(404).json({ error: `No chart found for type '${chartType}'` });
    }
    const chartId = chartDef.id;

    // 4) Fetch the chart data using the discovered ID
    const dataUrl = getChartDataURL(clientKey, chartType, chartId, timeframe, binSize);
    const dataRes = await axios.get(dataUrl, authHeaders);

    // 5) Return the data
    res.json(dataRes.data);
  } catch (err) {
    console.error(err.response?.data || err.message);
    const status = err.response?.status || 500;
    res.status(status).json({ error: 'Upstream API error', details: err.response?.data || err.message });
  }
});

// Root & health check
app.get('/', (req, res) => res.send('🚀 Maddox Proxy live. Use /{clientKey}/inspections')); 

app.listen(port, () => console.log(`Server listening on port ${port}`));
