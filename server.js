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

// ✅ NUEVO: Endpoint mejorado para enviar notificaciones a TODAS las plataformas
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

    // ✅ ENVIAR A USUARIOS ESPECÍFICOS (Para aprobación de conductores)
    if (specificUserIds.length > 0) {
      console.log(`📱 Enviando a usuarios específicos: ${specificUserIds.length} usuarios`);
      
      const userNotification = await sendToSpecificUsers(title, message, specificUserIds, data, platforms);
      notificationResults.push(userNotification);
    } 
    // ✅ ENVIAR POR SEGMENTOS (Para notificaciones masivas)
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

// ✅ NUEVA FUNCIÓN: Enviar por segmentos a múltiples plataformas
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

  // ✅ CONFIGURACIÓN PARA MÚLTIPLES PLATAFORMAS
  const notificationPayload = {
    app_id: ONESIGNAL_APP_ID,
    headings: { en: title },
    contents: { en: message },
    included_segments: included_segments,
    data: data || {},
    
    // ✅ CONFIGURACIÓN PARA WEB
    chrome_web_icon: 'https://twogo.com/icon.png',
    chrome_web_badge: 'https://twogo.com/badge.png',
    url: data?.url || 'https://twogo.com',
    web_url: data?.url || 'https://twogo.com',
    
    // ✅ CONFIGURACIÓN PARA ANDROID
    android_accent_color: 'FF4A6BFF',
    android_led_color: 'FF4A6BFF',
    android_visibility: 1,
    android_group: 'Twogo_Notifications',
    android_group_message: { en: `Tienes %n notificaciones nuevas` },
    large_icon: 'https://twogo.com/icon.png',
    small_icon: 'ic_stat_onesignal_default',
    
    // ✅ CONFIGURACIÓN PARA iOS
    ios_badgeType: 'Increase',
    ios_badgeCount: 1,
    ios_sound: 'notification.wav',
    ios_attachments: data?.image ? { id: 'image', url: data.image } : undefined,
    
    // ✅ CONFIGURACIÓN GLOBAL
    send_after: new Date(Date.now() + 1000).toISOString(), // Enviar en 1 segundo
    delayed_option: 'timezone',
    delivery_time_of_day: '9:00AM',
    
    // ✅ INCLUIR TODAS LAS PLATAFORMAS
    isAnyWeb: platforms.includes('web'),
    isAndroid: platforms.includes('android'),
    isIos: platforms.includes('ios'),
    
    // ✅ CONFIGURACIÓN DE PRIORIDAD
    priority: 7, // Alta prioridad
    content_available: true, // Para iOS background updates
    mutable_content: true // Para modificaciones en iOS
  };

  // Filtrar configuraciones basado en plataformas seleccionadas
  if (!platforms.includes('web')) {
    delete notificationPayload.chrome_web_icon;
    delete notificationPayload.chrome_web_badge;
    delete notificationPayload.url;
    delete notificationPayload.web_url;
  }

  if (!platforms.includes('android')) {
    delete notificationPayload.android_accent_color;
    delete notificationPayload.android_led_color;
    delete notificationPayload.android_visibility;
    delete notificationPayload.large_icon;
    delete notificationPayload.small_icon;
  }

  if (!platforms.includes('ios')) {
    delete notificationPayload.ios_badgeType;
    delete notificationPayload.ios_badgeCount;
    delete notificationPayload.ios_sound;
    delete notificationPayload.ios_attachments;
  }

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

// ✅ NUEVA FUNCIÓN: Enviar a usuarios específicos en múltiples plataformas
async function sendToSpecificUsers(title, message, playerIds, data = {}, platforms = ['web', 'android', 'ios']) {
  // Si playerIds es un array vacío, no enviar
  if (!playerIds || playerIds.length === 0) {
    throw new Error('No player IDs provided');
  }

  // ✅ CONFIGURACIÓN PARA MÚLTIPLES PLATAFORMAS
  const notificationPayload = {
    app_id: ONESIGNAL_APP_ID,
    headings: { en: title },
    contents: { en: message },
    include_player_ids: Array.isArray(playerIds) ? playerIds : [playerIds],
    data: data || {},
    
    // ✅ CONFIGURACIÓN PARA WEB
    chrome_web_icon: 'https://twogo.com/icon.png',
    chrome_web_badge: 'https://twogo.com/badge.png',
    url: data?.url || 'https://twogo.com',
    
    // ✅ CONFIGURACIÓN PARA ANDROID
    android_accent_color: 'FF4A6BFF',
    android_led_color: 'FF4A6BFF',
    android_visibility: 1,
    large_icon: 'https://twogo.com/icon.png',
    small_icon: 'ic_stat_onesignal_default',
    
    // ✅ CONFIGURACIÓN PARA iOS
    ios_badgeType: 'Increase',
    ios_badgeCount: 1,
    ios_sound: 'notification.wav',
    ios_attachments: data?.image ? { id: 'image', url: data.image } : undefined,
    
    // ✅ CONFIGURACIÓN GLOBAL
    priority: 10, // Máxima prioridad para notificaciones importantes
    content_available: true,
    mutable_content: true
  };

  // Filtrar configuraciones basado en plataformas seleccionadas
  if (!platforms.includes('web')) {
    delete notificationPayload.chrome_web_icon;
    delete notificationPayload.chrome_web_badge;
    delete notificationPayload.url;
  }

  if (!platforms.includes('android')) {
    delete notificationPayload.android_accent_color;
    delete notificationPayload.android_led_color;
    delete notificationPayload.android_visibility;
    delete notificationPayload.large_icon;
    delete notificationPayload.small_icon;
  }

  if (!platforms.includes('ios')) {
    delete notificationPayload.ios_badgeType;
    delete notificationPayload.ios_badgeCount;
    delete notificationPayload.ios_sound;
    delete notificationPayload.ios_attachments;
  }

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

// ✅ NUEVO: Endpoint para enviar notificación de aprobación de conductor
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

    // ✅ ENVIAR A TODAS LAS PLATAFORMAS
    const result = await sendToSpecificUsers(
      title, 
      message, 
      oneSignalPlayerId, 
      data,
      ['web', 'android', 'ios'] // ✅ ENVIAR A TODAS LAS PLATAFORMAS
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

// ✅ NUEVO: Endpoint para enviar notificación de viaje
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
      notificationType: notificationType, // 'ride_requested', 'driver_assigned', 'ride_completed', etc.
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
      ['web', 'android', 'ios'] // ✅ ENVIAR A TODAS LAS PLATAFORMAS
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

// ✅ NUEVO: Endpoint para enviar notificación de pago
app.post('/api/send-payment-notification', async (req, res) => {
  try {
    const { 
      userId, 
      playerId, 
      paymentId, 
      amount, 
      status, 
      title, 
      message 
    } = req.body;

    if (!playerId || !paymentId) {
      return res.status(400).json({
        success: false,
        error: 'Player ID and payment ID are required'
      });
    }

    const data = {
      type: 'payment_notification',
      paymentId: paymentId,
      amount: amount,
      status: status, // 'approved', 'rejected', 'pending'
      userId: userId,
      timestamp: new Date().toISOString(),
      action: 'open_payments',
      url: 'twogo://payments'
    };

    const result = await sendToSpecificUsers(
      title || `Pago ${status}`,
      message || `Tu pago de $${amount} ha sido ${status}`,
      playerId,
      data,
      ['web', 'android', 'ios'] // ✅ ENVIAR A TODAS LAS PLATAFORMAS
    );

    console.log(`✅ Notificación de pago enviada: ${paymentId}`);

    res.json({
      success: true,
      message: 'Payment notification sent successfully',
      data: result
    });

  } catch (error) {
    console.error('❌ Error enviando notificación de pago:', error.response?.data || error.message);
    
    res.status(500).json({
      success: false,
      error: 'Failed to send payment notification',
      details: error.response?.data || error.message
    });
  }
});

// ✅ NUEVO: Endpoint para enviar notificación de soporte
app.post('/api/send-support-notification', async (req, res) => {
  try {
    const { 
      userId, 
      playerId, 
      supportId, 
      title, 
      message 
    } = req.body;

    if (!playerId || !supportId) {
      return res.status(400).json({
        success: false,
        error: 'Player ID and support ID are required'
      });
    }

    const data = {
      type: 'support_notification',
      supportId: supportId,
      userId: userId,
      timestamp: new Date().toISOString(),
      action: 'open_support',
      url: `twogo://support/${supportId}`
    };

    const result = await sendToSpecificUsers(
      title || 'Soporte Twogo',
      message || 'Tienes una actualización de soporte',
      playerId,
      data,
      ['web', 'android', 'ios'] // ✅ ENVIAR A TODAS LAS PLATAFORMAS
    );

    console.log(`✅ Notificación de soporte enviada: ${supportId}`);

    res.json({
      success: true,
      message: 'Support notification sent successfully',
      data: result
    });

  } catch (error) {
    console.error('❌ Error enviando notificación de soporte:', error.response?.data || error.message);
    
    res.status(500).json({
      success: false,
      error: 'Failed to send support notification',
      details: error.response?.data || error.message
    });
  }
});

// ✅ NUEVO: Endpoint para verificar estado del servidor OneSignal
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

// ✅ MANTENER endpoints existentes (para compatibilidad)
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
      ['web', 'android', 'ios'] // ✅ ENVIAR A TODAS LAS PLATAFORMAS
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
  console.log(`🌍 Supported platforms: Web, Android, iOS`);
  console.log(`✅ Ready to send notifications to ALL platforms!`);
});
