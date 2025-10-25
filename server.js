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

console.log('🔧 Configuración OneSignal para Web y Android');

// Health check
app.get('/', (req, res) => {
  res.json({ 
    message: 'Twogo OneSignal Server - Web & Android',
    status: 'OK',
    platforms: ['web', 'android'],
    onesignal_configured: !!(ONESIGNAL_APP_ID && ONESIGNAL_REST_API_KEY)
  });
});

// ✅ ENDPOINT PRINCIPAL PARA WEB Y ANDROID
app.post('/api/send-notification', async (req, res) => {
  try {
    const { title, message, target = 'all', data = {} } = req.body;

    if (!title || !message) {
      return res.status(400).json({
        success: false,
        error: 'Title and message are required'
      });
    }

    console.log(`📤 Enviando: "${title}" a ${target} [Web & Android]`);

    // ✅ CONFIGURACIÓN OPTIMIZADA PARA WEB Y ANDROID
    const notificationPayload = {
      app_id: ONESIGNAL_APP_ID,
      headings: { en: title },
      contents: { en: message },
      included_segments: target === 'all' ? ['All'] : [target],
      data: data || {},
      
      // ✅ CONFIGURACIÓN WEB
      chrome_web_icon: 'https://twogo.com/icon.png',
      chrome_web_badge: 'https://twogo.com/badge.png',
      web_url: data?.url || 'https://twogo.com',
      
      // ✅ CONFIGURACIÓN ANDROID
      android_accent_color: 'FF4A6BFF',
      android_led_color: 'FF4A6BFF',
      android_visibility: 1,
      android_group: 'Twogo_Notifications',
      android_group_message: { en: `Tienes %n notificaciones nuevas` },
      large_icon: 'https://twogo.com/icon.png',
      small_icon: 'ic_stat_onesignal_default',
      android_channel_id: 'twogo-notifications',
      
      // ✅ PLATAFORMAS ESPECÍFICAS
      isAnyWeb: true,
      isAndroid: true,
      isIos: false, // ❌ DESHABILITADO iOS
      
      // ✅ CONFIGURACIÓN GLOBAL
      priority: 7,
      content_available: true
    };

    console.log('🔧 Payload para Web & Android:');
    console.log(JSON.stringify(notificationPayload, null, 2));

    const response = await axios.post(
      'https://onesignal.com/api/v1/notifications',
      notificationPayload,
      {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Basic ${ONESIGNAL_REST_API_KEY}`
        },
        timeout: 15000
      }
    );

    console.log('✅ Notificación enviada a Web & Android:', response.data);

    res.json({
      success: true,
      message: 'Notification sent to Web & Android successfully',
      platforms: ['web', 'android'],
      data: response.data
    });

  } catch (error) {
    console.error('❌ Error enviando notificación:', error.response?.data || error.message);
    
    res.status(500).json({
      success: false,
      error: 'Failed to send notification',
      details: error.response?.data || error.message,
      platforms: ['web', 'android']
    });
  }
});

// ✅ ENDPOINT SOLO PARA WEB
app.post('/api/send-web-only', async (req, res) => {
  try {
    const { title, message, data = {} } = req.body;

    if (!title || !message) {
      return res.status(400).json({
        success: false,
        error: 'Title and message are required'
      });
    }

    console.log(`🌐 Enviando solo WEB: "${title}"`);

    const notificationPayload = {
      app_id: ONESIGNAL_APP_ID,
      headings: { en: title },
      contents: { en: message },
      included_segments: ['Subscribed Users'], // Solo suscriptores web
      data: data || {},
      
      // ✅ SOLO CONFIGURACIÓN WEB
      chrome_web_icon: 'https://twogo.com/icon.png',
      chrome_web_badge: 'https://twogo.com/badge.png',
      web_url: data?.url || 'https://twogo.com',
      
      // ✅ SOLO PLATAFORMA WEB
      isAnyWeb: true,
      isAndroid: false,
      isIos: false,
      
      priority: 5
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

    console.log('✅ Notificación WEB enviada:', response.data);

    res.json({
      success: true,
      message: 'Web-only notification sent successfully',
      platform: 'web',
      data: response.data
    });

  } catch (error) {
    console.error('❌ Error enviando notificación web:', error.response?.data);
    res.status(500).json({
      success: false,
      error: 'Failed to send web notification'
    });
  }
});

// ✅ ENDPOINT SOLO PARA ANDROID
app.post('/api/send-android-only', async (req, res) => {
  try {
    const { title, message, data = {} } = req.body;

    if (!title || !message) {
      return res.status(400).json({
        success: false,
        error: 'Title and message are required'
      });
    }

    console.log(`📱 Enviando solo ANDROID: "${title}"`);

    const notificationPayload = {
      app_id: ONESIGNAL_APP_ID,
      headings: { en: title },
      contents: { en: message },
      included_segments: ['Total Subscriptions'], // Dispositivos móviles
      data: data || {},
      
      // ✅ SOLO CONFIGURACIÓN ANDROID
      android_accent_color: 'FF4A6BFF',
      android_led_color: 'FF4A6BFF',
      android_visibility: 1,
      android_group: 'Twogo_Notifications',
      android_group_message: { en: `Tienes %n notificaciones nuevas` },
      large_icon: 'https://twogo.com/icon.png',
      small_icon: 'ic_stat_onesignal_default',
      android_channel_id: 'twogo-notifications',
      
      // ✅ SOLO PLATAFORMA ANDROID
      isAnyWeb: false,
      isAndroid: true,
      isIos: false,
      
      priority: 8,
      content_available: true
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

    console.log('✅ Notificación ANDROID enviada:', response.data);

    res.json({
      success: true,
      message: 'Android-only notification sent successfully',
      platform: 'android',
      data: response.data
    });

  } catch (error) {
    console.error('❌ Error enviando notificación Android:', error.response?.data);
    res.status(500).json({
      success: false,
      error: 'Failed to send Android notification'
    });
  }
});

// ✅ CONFIGURACIÓN ANDROID EN ONESIGNAL
app.get('/api/android-setup-guide', (req, res) => {
  const guide = {
    title: "🚀 Guía para Configurar Android en OneSignal",
    steps: [
      {
        step: 1,
        title: "Crear Proyecto en Firebase",
        description: "Ve a https://console.firebase.google.com y crea un nuevo proyecto",
        details: [
          "Nombre del proyecto: 'Twogo'",
          "Desactiva Google Analytics (opcional)",
          "Crea el proyecto"
        ]
      },
      {
        step: 2,
        title: "Configurar Cloud Messaging",
        description: "En Firebase Console ve a: Project Settings → Cloud Messaging",
        details: [
          "Copia el 'Server key'",
          "Copia el 'Sender ID'"
        ]
      },
      {
        step: 3,
        title: "Configurar OneSignal",
        description: "En OneSignal Dashboard ve a: Settings → Platforms → Android",
        details: [
          "Pega el 'Server key' de Firebase en 'Google Android GCM/FCM API Key'",
          "Pega el 'Sender ID' de Firebase",
          "Guarda los cambios"
        ]
      },
      {
        step: 4,
        title: "Configurar tu App Android",
        description: "En tu código Android agrega:",
        code: `// En build.gradle (app)
implementation 'com.onesignal:OneSignal:[4.8.6, 4.99.99]'

// En AndroidManifest.xml
<service android:name="com.onesignal.OSNotificationClickedEvent" />

// En Application class
OneSignal.initWithContext(this, "ONESIGNAL_APP_ID")`
      }
    ],
    important_notes: [
      "✅ La plataforma WEB ya está funcionando",
      "📱 Para Android necesitas configurar Firebase primero",
      "🔑 Necesitas las credenciales de Firebase Cloud Messaging",
      "📲 Las notificaciones Android empezarán a funcionar después de configurar Firebase"
    ]
  };

  res.json(guide);
});

// ✅ ESTADO ACTUAL DE PLATAFORMAS
app.get('/api/platform-status', async (req, res) => {
  try {
    const appResponse = await axios.get(
      `https://onesignal.com/api/v1/apps/${ONESIGNAL_APP_ID}`,
      {
        headers: {
          'Authorization': `Basic ${ONESIGNAL_REST_API_KEY}`
        }
      }
    );

    const appInfo = appResponse.data;

    const status = {
      success: true,
      platforms: {
        web: {
          status: '✅ CONFIGURADO',
          subscribers: 1,
          configured: true,
          message: 'Listo para usar'
        },
        android: {
          status: appInfo.android_gcm_sender_id ? '✅ CONFIGURADO' : '❌ NO CONFIGURADO',
          subscribers: 0,
          configured: !!appInfo.android_gcm_sender_id,
          message: appInfo.android_gcm_sender_id ? 
            'Listo para usar - Configura tu app Android' : 
            'Necesita configuración en OneSignal + Firebase'
        },
        ios: {
          status: '❌ DESHABILITADO',
          subscribers: 0,
          configured: false,
          message: 'No soportado en esta configuración'
        }
      },
      recommendations: [
        "🌐 Usa /api/send-web-only para notificaciones solo web",
        "📱 Usa /api/send-android-only para notificaciones solo Android", 
        "🚀 Usa /api/send-notification para ambas plataformas",
        "🔧 Ve a /api/android-setup-guide para configurar Android"
      ]
    };

    res.json(status);

  } catch (error) {
    console.error('Error obteniendo estado:', error.response?.data);
    res.status(500).json({
      success: false,
      error: 'Failed to get platform status'
    });
  }
});

// Manejo de errores
app.use((err, req, res, next) => {
  console.error('🚨 Error global:', err);
  res.status(500).json({
    success: false,
    error: 'Internal Server Error'
  });
});

app.use('*', (req, res) => {
  res.status(404).json({
    success: false,
    error: 'Endpoint not found'
  });
});

app.listen(PORT, () => {
  console.log(`\n🚀 Twogo OneSignal Server - Web & Android`);
  console.log(`📍 Puerto: ${PORT}`);
  console.log(`\n📊 PLATAFORMAS CONFIGURADAS:`);
  console.log(`   🌐 WEB: ✅ CONFIGURADO (1 suscriptor)`);
  console.log(`   📱 ANDROID: ⚠️  POR CONFIGURAR (0 dispositivos)`);
  console.log(`   📱 iOS: ❌ DESHABILITADO`);
  console.log(`\n🔧 ENDPOINTS DISPONIBLES:`);
  console.log(`   GET  /api/platform-status - Estado de plataformas`);
  console.log(`   GET  /api/android-setup-guide - Guía para Android`);
  console.log(`   POST /api/send-notification - Web + Android`);
  console.log(`   POST /api/send-web-only - Solo Web`);
  console.log(`   POST /api/send-android-only - Solo Android\n`);
});
