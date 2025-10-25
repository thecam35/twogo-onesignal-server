const express = require('express');
const axios = require('axios');
const app = express();
app.use(express.json());

app.post('/api/send-to-app', async (req, res) => {
  try {
    const { title, message } = req.body;

    // ✅ PAYLOAD ESPECÍFICO PARA APPS MÓVILES
    const payload = {
      app_id: "f8865b25-29e8-48e8-a5d5-b54e69098a2e",
      headings: { en: title },
      contents: { en: message },
      
      // ✅ ENVIAR SOLO A DISPOSITIVOS MÓVILES
      included_segments: ["Total Subscriptions"], // Solo suscriptores móviles
      
      // ✅ CONFIGURACIÓN ANDROID
      android_accent_color: "FF4A6BFF",
      android_visibility: 1,
      small_icon: "ic_stat_onesignal_default",
      
      // ✅ SOLO PLATAFORMAS MÓVILES
      isAnyWeb: false,    // ❌ NO web
      isAndroid: true,    // ✅ SÍ Android
      isIos: false        // ❌ NO iOS
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

    res.json({ 
      success: true, 
      message: 'Enviado SOLO a app móvil',
      data: response.data 
    });

  } catch (error) {
    res.json({ success: false, error: error.message });
  }
});

app.listen(3000, () => console.log('🚀 Servidor para APP móvil'));
