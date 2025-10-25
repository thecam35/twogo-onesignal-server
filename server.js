const express = require('express');
const axios = require('axios');
const app = express();

// ✅ PERMITIR TODO (solo para desarrollo)
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Headers', '*');
  res.header('Access-Control-Allow-Methods', '*');
  next();
});

app.use(express.json());

app.post('/api/send-notification', async (req, res) => {
  try {
    const { title, message } = req.body;
    
    const payload = {
      app_id: "f8865b25-29e8-48e8-a5d5-b54e69098a2e",
      contents: { en: message },
      headings: { en: title },
      included_segments: ["All"]
    };

    const response = await axios.post(
      'https://onesignal.com/api/v1/notifications',
      payload,
      {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Basic ' + process.env.ONESIGNAL_REST_API_KEY
        }
      }
    );

    res.json({ success: true, data: response.data });

  } catch (error) {
    res.json({ success: false, error: error.message });
  }
});

app.listen(3000, () => console.log('✅ Servidor sin CORS'));
