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

// Validar que las variables de entorno estén configuradas
if (!ONESIGNAL_APP_ID || !ONESIGNAL_REST_API_KEY) {
  console.error('❌ ERROR: OneSignal credentials not configured in environment variables');
  console.error('ONESIGNAL_APP_ID:', ONESIGNAL_APP_ID ? '✅ Set' : '❌ Missing');
  console.error('ONESIGNAL_REST_API_KEY:', ONESIGNAL_REST_API_KEY ? '✅ Set' : '❌ Missing');
}

// Health check endpoint
app.get('/', (req, res) => {
  res.json({ 
    message: 'Twogo OneSignal Server is running!',
    status: 'OK',
    supports: ['web', 'android', 'ios'],
    onesignal_configured: !!(ONESIGNAL_APP_ID && ONESIGNAL_REST_API_KEY)
  });
});

// ✅ Endpoint mejorado con mejor manejo de errores
app.post('/api/send-notification', async (req, res) => {
  try {
    console.log('📨 Solicitud recibida en /api/send-notification');
    console.log('📦 Body recibido:', JSON.stringify(req.body, null, 2));

    const { title, message, target, data, platforms = ['web', 'android', 'ios'], specificUserIds = [] } = req.body;

    // Validar credenciales de OneSignal
    if (!ONESIGNAL_APP_ID || !ONESIGNAL_REST_API_KEY) {
      console.error('❌ Credenciales de OneSignal no configuradas');
      return res.status(500).json({
        success: false,
        error: 'OneSignal credentials not configured',
        details: 'Check ONESIGNAL_APP_ID and ONESIGNAL_REST_API_KEY environment variables'
      });
    }

    // Validar campos requeridos
    if (!title || !message) {
      return res.status(400).json({
        success: false,
        error: 'Title and message are required'
      });
    }

    let notificationResults = [];

    // ✅ ENVIAR A USUARIOS ESPECÍFICOS
    if (specificUserIds && specificUserIds.length > 0) {
      console.log(`📱 Enviando a usuarios específicos: ${specificUserIds.length} usuarios`);
      
      const userNotification = await sendToSpecificUsers(title, message, specificUserIds, data, platforms);
      notificationResults.push(userNotification);
    } 
    // ✅ ENVIAR POR SEGMENTOS
    else if (target) {
      console.log(`🌍 Enviando notificación por segmentos: ${target}`);
      
      const segmentNotification = await sendBySegments(title, message, target, data, platforms);
      notificationResults.push(segmentNotification);
    } else {
      return res.status(400).json({
        success: false,
        error: 'Either target or specificUserIds must be provided'
      });
    }

    res.json({
      success: true,
      message: 'Notifications sent successfully to all platforms',
      results: notificationResults
    });

  } catch (error) {
    console.error('❌ Error completo enviando notificación:');
    console.error('📌 Mensaje:', error.message);
    console.error('📌 Stack:', error.stack);
    
    if (error.response) {
      console.error('📌 Response status:', error.response.status);
      console.error('📌 Response data:', error.response.data);
      console.error('📌 Response headers:', error.response.headers);
    } else if (error.request) {
      console.error('📌 No response received:', error.request);
    }
    
    res.status(500).json({
      success: false,
      error: 'Failed to send notification',
      details: error.response?.data || error.message,
      ...(process.env.NODE_ENV === 'development' && { stack: error.stack })
    });
  }
});

// ✅ FUNCIÓN MEJORADA: Enviar por segmentos
async function sendBySegments(title, message, target, data = {}, platforms = ['web', 'android', 'ios']) {
  try {
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

    console.log(`🎯 Segmentos objetivo: ${included_segments}`);
    console.log(`📱 Plataformas: ${platforms}`);

    // ✅ CONFIGURACIÓN MEJORADA PARA MÚLTIPLES PLATAFORMAS
    const notificationPayload = {
      app_id: ONESIGNAL_APP_ID,
      headings: { en: title },
      contents: { en: message },
      included_segments: included_segments,
      data: data || {},
      
      // ✅ CONFIGURACIÓN ESPECÍFICA POR PLATAFORMA
      ...(platforms.includes('web') && {
        chrome_web_icon: 'https://twogo.com/icon.png',
        chrome_web_badge: 'https://twogo.com/badge.png',
        web_url: data?.url || 'https://twogo.com'
      }),
      
      ...(platforms.includes('android') && {
        android_accent_color: 'FF4A6BFF',
        android_led_color: 'FF4A6BFF',
        android_visibility: 1,
        android_group: 'Twogo_Notifications',
        android_group_message: { en: `Tienes %n notificaciones nuevas` },
        large_icon: 'https://twogo.com/icon.png',
        small_icon: 'ic_stat_onesignal_default',
        android_channel_id: 'twogo-notifications'
      }),
      
      ...(platforms.includes('ios') && {
        ios_badgeType: 'Increase',
        ios_badgeCount: 1,
        ios_sound: 'default',
        ios_attachments: data?.image ? { id: 'image', url: data.image } : undefined
      }),
      
      // ✅ CONFIGURACIÓN GLOBAL MEJORADA
      priority: 7,
      content_available: true,
      mutable_content: true
    };

    console.log('📤 Payload a enviar a OneSignal:');
    console.log(JSON.stringify(notificationPayload, null, 2));

    const response = await axios.post(
      'https://onesignal.com/api/v1/notifications',
      notificationPayload,
      {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Basic ${ONESIGNAL_REST_API_KEY}`
        },
        timeout: 10000 // 10 segundos timeout
      }
    );

    console.log('✅ Respuesta de OneSignal:', response.data);
    return response.data;

  } catch (error) {
    console.error('❌ Error en sendBySegments:');
    console.error('📌 Mensaje:', error.message);
    if (error.response) {
      console.error('📌 OneSignal response:', error.response.data);
    }
    throw error;
  }
}

// ✅ FUNCIÓN MEJORADA: Enviar a usuarios específicos
async function sendToSpecificUsers(title, message, playerIds, data = {}, platforms = ['web', 'android', 'ios']) {
  try {
    if (!playerIds || playerIds.length === 0) {
      throw new Error('No player IDs provided');
    }

    console.log(`👤 Enviando a ${playerIds.length} usuarios específicos`);
    console.log(`📱 Plataformas: ${platforms}`);

    // ✅ CONFIGURACIÓN MEJORADA
    const notificationPayload = {
      app_id: ONESIGNAL_APP_ID,
      headings: { en: title },
      contents: { en: message },
      include_player_ids: Array.isArray(playerIds) ? playerIds : [playerIds],
      data: data || {},
      
      // ✅ CONFIGURACIÓN ESPECÍFICA POR PLATAFORMA
      ...(platforms.includes('web') && {
        chrome_web_icon: 'https://twogo.com/icon.png',
        chrome_web_badge: 'https://twogo.com/badge.png',
        web_url: data?.url || 'https://twogo.com'
      }),
      
      ...(platforms.includes('android') && {
        android_accent_color: 'FF4A6BFF',
        android_led_color: 'FF4A6BFF',
        android_visibility: 1,
        large_icon: 'https://twogo.com/icon.png',
        small_icon: 'ic_stat_onesignal_default',
        android_channel_id: 'twogo-notifications'
      }),
      
      ...(platforms.includes('ios') && {
        ios_badgeType: 'Increase',
        ios_badgeCount: 1,
        ios_sound: 'default',
        ios_attachments: data?.image ? { id: 'image', url: data.image } : undefined
      }),
      
      // ✅ CONFIGURACIÓN GLOBAL
      priority: 10,
      content_available: true,
      mutable_content: true
    };

    console.log('📤 Payload para usuarios específicos:');
    console.log(JSON.stringify(notificationPayload, null, 2));

    const response = await axios.post(
      'https://onesignal.com/api/v1/notifications',
      notificationPayload,
      {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Basic ${ONESIGNAL_REST_API_KEY}`
        },
        timeout: 10000
      }
    );

    console.log(`✅ Notificación enviada a ${playerIds.length} usuarios:`, response.data);
    return response.data;

  } catch (error) {
    console.error('❌ Error en sendToSpecificUsers:');
    console.error('📌 Mensaje:', error.message);
    if (error.response) {
      console.error('📌 OneSignal response:', error.response.data);
    }
    throw error;
  }
}

// ✅ Endpoint para verificar configuración
app.get('/api/config', (req, res) => {
  res.json({
    success: true,
    onesignal_configured: !!(ONESIGNAL_APP_ID && ONESIGNAL_REST_API_KEY),
    onesignal_app_id: ONESIGNAL_APP_ID ? '✅ Configured' : '❌ Missing',
    server_status: 'running',
    port: PORT
  });
});

// ✅ Endpoint simple de test
app.post('/api/test', async (req, res) => {
  try {
    const { message = 'Test notification', playerId } = req.body;

    if (!ONESIGNAL_APP_ID || !ONESIGNAL_REST_API_KEY) {
      return res.status(500).json({
        success: false,
        error: 'OneSignal credentials not configured'
      });
    }

    let result;
    if (playerId) {
      // Enviar a usuario específico
      result = await sendToSpecificUsers(
        '🔔 Test Twogo',
        message,
        playerId,
        { type: 'test', timestamp: new Date().toISOString() },
        ['web', 'android', 'ios']
      );
    } else {
      // Enviar a todos
      result = await sendBySegments(
        '🔔 Test Twogo',
        message,
        'all',
        { type: 'test', timestamp: new Date().toISOString() },
        ['web', 'android', 'ios']
      );
    }

    res.json({
      success: true,
      message: 'Test notification sent successfully',
      data: result
    });

  } catch (error) {
    console.error('❌ Error en test:', error.response?.data || error.message);
    res.status(500).json({
      success: false,
      error: 'Test failed',
      details: error.response?.data || error.message
    });
  }
});

// Mantener los otros endpoints existentes...
app.post('/api/send-driver-approval', async (req, res) => {
  try {
    const { driverId, driverName, oneSignalPlayerId } = req.body;

    if (!driverId || !oneSignalPlayerId) {
      return res.status(400).json({
        success: false,
        error: 'Driver ID and OneSignal Player ID are required'
      });
    }

    const title = '🎉 ¡Felicidades!';
    const message = `Tu solicitud como conductor ha sido aprobada. Ya puedes comenzar a trabajar con Twogo.`;
    
    const data = {
      type: 'driver_approved',
      driverId: driverId,
      driverName: driverName || 'Conductor',
      timestamp: new Date().toISOString(),
      action: 'open_driver_mode',
      url: 'twogo://driver/mode'
    };

    const result = await sendToSpecificUsers(
      title, 
      message, 
      oneSignalPlayerId, 
      data,
      ['web', 'android', 'ios']
    );

    console.log(`✅ Notificación de aprobación enviada al conductor ${driverId}`);

    res.json({
      success: true,
      message: 'Driver approval notification sent successfully',
      data: result
    });

  } catch (error) {
    console.error('❌ Error enviando notificación de aprobación:', error.response?.data || error.message);
    
    res.status(500).json({
      success: false,
      error: 'Failed to send driver approval notification',
      details: error.response?.data || error.message
    });
  }
});

// Manejo de errores
app.use((err, req, res, next) => {
  console.error('🚨 Error del servidor no manejado:', err);
  res.status(500).json({
    success: false,
    error: 'Internal server error',
    message: err.message
  });
});

// Manejo de rutas no encontradas
app.use('*', (req, res) => {
  res.status(404).json({
    success: false,
    error: 'Route not found',
    path: req.originalUrl
  });
});

app.listen(PORT, () => {
  console.log(`🚀 Twogo OneSignal Server running on port ${PORT}`);
  console.log(`📱 OneSignal App ID: ${ONESIGNAL_APP_ID ? '✅ Configured' : '❌ Missing'}`);
  console.log(`🔑 OneSignal API Key: ${ONESIGNAL_REST_API_KEY ? '✅ Configured' : '❌ Missing'}`);
  console.log(`🌍 Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`✅ Server ready!`);
});
