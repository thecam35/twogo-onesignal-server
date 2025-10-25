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
    status: 'OK',
    supports: ['web', 'android', 'ios']
  });
});

// ✅ Endpoint mejorado para enviar notificaciones
app.post('/api/send-notification', async (req, res) => {
  try {
    const { title, message, target, data, platforms = ['web', 'android', 'ios'], specificUserIds = [] } = req.body;

    // Validar campos requeridos
    if (!title || !message) {
      return res.status(400).json({
        success: false,
        error: 'Title and message are required'
      });
    }

    let notificationResults = [];

    // ✅ ENVIAR A USUARIOS ESPECÍFICOS
    if (specificUserIds.length > 0) {
      console.log(`📱 Enviando a usuarios específicos: ${specificUserIds.length} usuarios`);
      
      const userNotification = await sendToSpecificUsers(title, message, specificUserIds, data, platforms);
      notificationResults.push(userNotification);
    } 
    // ✅ ENVIAR POR SEGMENTOS
    else {
      console.log(`🌍 Enviando notificación por segmentos: ${target}`);
      
      const segmentNotification = await sendBySegments(title, message, target, data, platforms);
      notificationResults.push(segmentNotification);
    }

    res.json({
      success: true,
      message: 'Notifications sent successfully to all platforms',
      results: notificationResults
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

// ✅ FUNCIÓN MEJORADA: Enviar por segmentos
async function sendBySegments(title, message, target, data = {}, platforms = ['web', 'android', 'ios']) {
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
      // ✅ IMPORTANTE: Configuración específica de Android
      android_channel_id: 'twogo-notifications',
      priority: 7
    }),
    
    ...(platforms.includes('ios') && {
      ios_badgeType: 'Increase',
      ios_badgeCount: 1,
      ios_sound: 'default',
      ios_attachments: data?.image ? { id: 'image', url: data.image } : undefined,
      // ✅ IMPORTANTE: Configuración específica de iOS
      apns_alert: {
        title: title,
        body: message
      }
    }),
    
    // ✅ CONFIGURACIÓN GLOBAL MEJORADA
    priority: 7,
    content_available: true,
    mutable_content: true,
    
    // ✅ INCLUIR EXPLÍCITAMENTE LAS PLATAFORMAS
    isAnyWeb: platforms.includes('web'),
    isAndroid: platforms.includes('android'),
    isIos: platforms.includes('ios')
  };

  console.log('📤 Payload mejorado enviado a OneSignal:', JSON.stringify(notificationPayload, null, 2));

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

  console.log('✅ Notificación enviada a segmentos:', response.data);
  return response.data;
}

// ✅ FUNCIÓN MEJORADA: Enviar a usuarios específicos
async function sendToSpecificUsers(title, message, playerIds, data = {}, platforms = ['web', 'android', 'ios']) {
  if (!playerIds || playerIds.length === 0) {
    throw new Error('No player IDs provided');
  }

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
      android_channel_id: 'twogo-notifications',
      priority: 10
    }),
    
    ...(platforms.includes('ios') && {
      ios_badgeType: 'Increase',
      ios_badgeCount: 1,
      ios_sound: 'default',
      ios_attachments: data?.image ? { id: 'image', url: data.image } : undefined,
      apns_alert: {
        title: title,
        body: message
      }
    }),
    
    // ✅ CONFIGURACIÓN GLOBAL
    priority: 10,
    content_available: true,
    mutable_content: true,
    
    // ✅ INCLUIR EXPLÍCITAMENTE LAS PLATAFORMAS
    isAnyWeb: platforms.includes('web'),
    isAndroid: platforms.includes('android'),
    isIos: platforms.includes('ios')
  };

  console.log('📤 Payload mejorado para usuarios específicos:', JSON.stringify(notificationPayload, null, 2));

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

  console.log(`✅ Notificación enviada a ${playerIds.length} usuarios específicos:`, response.data);
  return response.data;
}

// ✅ NUEVO: Endpoint para TESTEAR notificaciones específicas
app.post('/api/test-notification', async (req, res) => {
  try {
    const { playerId, platform } = req.body;

    if (!playerId) {
      return res.status(400).json({
        success: false,
        error: 'Player ID is required for testing'
      });
    }

    const title = '🔔 Test Twogo';
    const message = '¡Esta es una notificación de prueba!';
    
    const data = {
      type: 'test_notification',
      timestamp: new Date().toISOString(),
      action: 'open_app'
    };

    // Determinar plataformas basado en el test
    let platforms = ['web', 'android', 'ios'];
    if (platform) {
      platforms = [platform];
    }

    const result = await sendToSpecificUsers(
      title, 
      message, 
      playerId, 
      data,
      platforms
    );

    console.log(`✅ Notificación de TEST enviada a ${playerId} para plataformas: ${platforms}`);

    res.json({
      success: true,
      message: 'Test notification sent successfully',
      playerId: playerId,
      platforms: platforms,
      data: result
    });

  } catch (error) {
    console.error('❌ Error enviando notificación de test:', error.response?.data || error.message);
    
    res.status(500).json({
      success: false,
      error: 'Failed to send test notification',
      details: error.response?.data || error.message
    });
  }
});

// ✅ Endpoint para enviar notificación de aprobación de conductor
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

// Mantener los otros endpoints igual...
app.post('/api/send-ride-notification', async (req, res) => {
  try {
    const { 
      userId, 
      playerId, 
      rideId, 
      notificationType, 
      title, 
      message, 
      additionalData = {} 
    } = req.body;

    if (!playerId || !notificationType) {
      return res.status(400).json({
        success: false,
        error: 'Player ID and notification type are required'
      });
    }

    const data = {
      type: 'ride_notification',
      rideId: rideId,
      notificationType: notificationType,
      userId: userId,
      timestamp: new Date().toISOString(),
      action: 'open_ride_details',
      url: `twogo://ride/${rideId}`,
      ...additionalData
    };

    const result = await sendToSpecificUsers(
      title, 
      message, 
      playerId, 
      data,
      ['web', 'android', 'ios']
    );

    console.log(`✅ Notificación de viaje enviada: ${notificationType}`);

    res.json({
      success: true,
      message: 'Ride notification sent successfully',
      data: result
    });

  } catch (error) {
    console.error('❌ Error enviando notificación de viaje:', error.response?.data || error.message);
    
    res.status(500).json({
      success: false,
      error: 'Failed to send ride notification',
      details: error.response?.data || error.message
    });
  }
});

// ✅ MANTENER endpoints existentes
app.post('/api/send-to-user', async (req, res) => {
  try {
    const { title, message, playerId, data } = req.body;

    if (!title || !message || !playerId) {
      return res.status(400).json({
        success: false,
        error: 'Title, message and playerId are required'
      });
    }

    const result = await sendToSpecificUsers(
      title, 
      message, 
      playerId, 
      data,
      ['web', 'android', 'ios']
    );

    res.json({
      success: true,
      message: 'Notification sent to user successfully',
      data: result
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

// Endpoint para verificar estado
app.get('/api/onesignal-status', async (req, res) => {
  try {
    const response = await axios.get(
      `https://onesignal.com/api/v1/apps/${ONESIGNAL_APP_ID}`,
      {
        headers: {
          'Authorization': `Basic ${ONESIGNAL_REST_API_KEY}`
        }
      }
    );

    res.json({
      success: true,
      data: {
        app_id: response.data.id,
        name: response.data.name,
        players: response.data.players,
        messageable_players: response.data.messageable_players,
        updated_at: response.data.updated_at,
        platforms: response.data.platforms || ['web', 'android', 'ios']
      }
    });

  } catch (error) {
    console.error('❌ Error verificando estado de OneSignal:', error.response?.data || error.message);
    
    res.status(500).json({
      success: false,
      error: 'Failed to get OneSignal status',
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

app.use('*', (req, res) => {
  res.status(404).json({
    success: false,
    error: 'Route not found'
  });
});

app.listen(PORT, () => {
  console.log(`🚀 Twogo OneSignal Server running on port ${PORT}`);
  console.log(`📱 OneSignal App ID: ${ONESIGNAL_APP_ID}`);
  console.log(`🌍 Supported platforms: Web, Android, iOS`);
  console.log(`✅ Ready to send notifications!`);
});
