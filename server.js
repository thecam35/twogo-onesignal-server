const express = require('express');
const cors = require('cors');
const axios = require('axios');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());

// OneSignal Configuration
const ONESIGNAL_APP_ID = process.env.ONESIGNAL_APP_ID;
const ONESIGNAL_REST_API_KEY = process.env.ONESIGNAL_REST_API_KEY;

// Health check endpoint
app.get('/', (req, res) => {
  res.json({ 
    message: 'Twogo OneSignal Server is running!',
    status: 'OK'
  });
});

// Endpoint para enviar notificaciones
app.post('/api/send-notification', async (req, res) => {
  try {
    const { title, message, target, data } = req.body;

    // Validar campos requeridos
    if (!title || !message) {
      return res.status(400).json({
        success: false,
        error: 'Title and message are required'
      });
    }

    // Determinar el segmento objetivo
    let included_segments;
    switch (target) {
      case 'passengers':
        included_segments = ['Passengers'];
        break;
      case 'drivers':
        included_segments = ['Drivers'];
        break;
      case 'all':
      default:
        included_segments = ['All'];
    }

    // Preparar el payload para OneSignal
    const notificationPayload = {
      app_id: ONESIGNAL_APP_ID,
      headings: { en: title },
      contents: { en: message },
      included_segments: included_segments,
      data: data || {},
      // Opciones adicionales para mejor delivery
      chrome_web_icon: 'https://twogo.com/icon.png',
      chrome_web_badge: 'https://twogo.com/badge.png',
      url: data?.url || 'https://twogo.com'
    };

    // Enviar notificación a OneSignal
    const response = await axios.post(
      'https://onesignal.com/api/v1/notifications',
      notificationPayload,
      {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Basic ${ONESIGNAL_REST_API_KEY}`
        }
      }
    );

    console.log('✅ Notificación enviada exitosamente:', response.data);

    res.json({
      success: true,
      message: 'Notification sent successfully',
      data: response.data
    });

  } catch (error) {
    console.error('❌ Error enviando notificación:', error.response?.data || error.message);
    
    res.status(500).json({
      success: false,
      error: 'Failed to send notification',
      details: error.response?.data || error.message
    });
  }
});

// Endpoint para enviar notificación a usuario específico
app.post('/api/send-to-user', async (req, res) => {
  try {
    const { title, message, playerId, data } = req.body;

    if (!title || !message || !playerId) {
      return res.status(400).json({
        success: false,
        error: 'Title, message and playerId are required'
      });
    }

    const notificationPayload = {
      app_id: ONESIGNAL_APP_ID,
      headings: { en: title },
      contents: { en: message },
      include_player_ids: [playerId],
      data: data || {},
      chrome_web_icon: 'https://twogo.com/icon.png'
    };

    const response = await axios.post(
      'https://onesignal.com/api/v1/notifications',
      notificationPayload,
      {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Basic ${ONESIGNAL_REST_API_KEY}`
        }
      }
    );

    console.log('✅ Notificación enviada a usuario:', response.data);

    res.json({
      success: true,
      message: 'Notification sent to user successfully',
      data: response.data
    });

  } catch (error) {
    console.error('❌ Error enviando notificación a usuario:', error.response?.data || error.message);
    
    res.status(500).json({
      success: false,
      error: 'Failed to send notification to user',
      details: error.response?.data || error.message
    });
  }
});

// Endpoint para obtener estadísticas de notificaciones
app.get('/api/notification-stats/:notificationId', async (req, res) => {
  try {
    const { notificationId } = req.params;

    const response = await axios.get(
      `https://onesignal.com/api/v1/notifications/${notificationId}?app_id=${ONESIGNAL_APP_ID}`,
      {
        headers: {
          'Authorization': `Basic ${ONESIGNAL_REST_API_KEY}`
        }
      }
    );

    res.json({
      success: true,
      data: response.data
    });

  } catch (error) {
    console.error('❌ Error obteniendo estadísticas:', error.response?.data || error.message);
    
    res.status(500).json({
      success: false,
      error: 'Failed to get notification statistics',
      details: error.response?.data || error.message
    });
  }
});

// Manejo de errores
app.use((err, req, res, next) => {
  console.error('🚨 Error del servidor:', err);
  res.status(500).json({
    success: false,
    error: 'Internal server error'
  });
});

// Manejo de rutas no encontradas
app.use('*', (req, res) => {
  res.status(404).json({
    success: false,
    error: 'Route not found'
  });
});

app.listen(PORT, () => {
  console.log(`🚀 Twogo OneSignal Server running on port ${PORT}`);
  console.log(`📱 OneSignal App ID: ${ONESIGNAL_APP_ID}`);
});
