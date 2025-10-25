const express = require('express');
const cors = require('cors');
const axios = require('axios');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());

// OneSignal Configuration - con validación estricta
const ONESIGNAL_APP_ID = process.env.ONESIGNAL_APP_ID;
const ONESIGNAL_REST_API_KEY = process.env.ONESIGNAL_REST_API_KEY;

console.log('🔧 Configuración OneSignal:');
console.log('📱 APP_ID:', ONESIGNAL_APP_ID ? '✅ Presente' : '❌ FALTANTE');
console.log('🔑 API_KEY:', ONESIGNAL_REST_API_KEY ? '✅ Presente' : '❌ FALTANTE');

// Health check endpoint mejorado
app.get('/', (req, res) => {
  res.json({ 
    message: 'Twogo OneSignal Server is running!',
    status: 'OK',
    timestamp: new Date().toISOString(),
    onesignal_configured: !!(ONESIGNAL_APP_ID && ONESIGNAL_REST_API_KEY),
    port: PORT
  });
});

// ✅ Endpoint SIMPLIFICADO para enviar notificaciones
app.post('/api/send-notification', async (req, res) => {
  console.log('🚨 INICIANDO /api/send-notification');
  
  try {
    // Validar credenciales FIRST
    if (!ONESIGNAL_APP_ID || !ONESIGNAL_REST_API_KEY) {
      const errorMsg = '❌ OneSignal credentials missing. Check environment variables.';
      console.error(errorMsg);
      return res.status(500).json({
        success: false,
        error: errorMsg,
        details: {
          ONESIGNAL_APP_ID: ONESIGNAL_APP_ID ? 'present' : 'missing',
          ONESIGNAL_REST_API_KEY: ONESIGNAL_REST_API_KEY ? 'present' : 'missing'
        }
      });
    }

    const { title, message, target = 'all', data = {} } = req.body;
    console.log('📦 Datos recibidos:', { title, message, target });

    // Validación básica
    if (!title || !message) {
      return res.status(400).json({
        success: false,
        error: 'Title and message are required'
      });
    }

    // ✅ PAYLOAD MUY SIMPLE
    const notificationPayload = {
      app_id: ONESIGNAL_APP_ID,
      headings: { en: title },
      contents: { en: message },
      included_segments: [target === 'all' ? 'All' : target],
      data: data,
      // Configuración mínima para todas las plataformas
      chrome_web_icon: 'https://twogo.com/icon.png',
      web_url: 'https://twogo.com'
    };

    console.log('📤 Enviando a OneSignal...');
    console.log('🔧 Payload:', JSON.stringify(notificationPayload, null, 2));

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

    console.log('✅ OneSignal response:', response.data);

    res.json({
      success: true,
      message: 'Notification sent successfully',
      data: response.data
    });

  } catch (error) {
    console.error('💥 ERROR CRÍTICO en /api/send-notification:');
    
    if (error.response) {
      // El servidor respondió con un código de error
      console.error('📊 Status:', error.response.status);
      console.error('📊 Data:', error.response.data);
      console.error('📊 Headers:', error.response.headers);
      
      res.status(error.response.status || 500).json({
        success: false,
        error: 'OneSignal API Error',
        details: error.response.data,
        status: error.response.status
      });
    } else if (error.request) {
      // La solicitud fue hecha pero no se recibió respuesta
      console.error('📡 No response received:', error.request);
      res.status(503).json({
        success: false,
        error: 'No response from OneSignal API',
        details: 'Network error or timeout'
      });
    } else {
      // Algo pasó al configurar la solicitud
      console.error('⚙️ Setup error:', error.message);
      res.status(500).json({
        success: false,
        error: 'Internal server error',
        details: error.message
      });
    }
  }
});

// ✅ Endpoint de diagnóstico
app.get('/api/debug', (req, res) => {
  const debugInfo = {
    server: {
      status: 'running',
      port: PORT,
      node_version: process.version,
      environment: process.env.NODE_ENV || 'development'
    },
    onesignal: {
      app_id: ONESIGNAL_APP_ID || 'MISSING',
      api_key: ONESIGNAL_REST_API_KEY ? 'PRESENT (hidden)' : 'MISSING',
      configured: !!(ONESIGNAL_APP_ID && ONESIGNAL_REST_API_KEY)
    },
    environment_variables: {
      PORT: process.env.PORT,
      NODE_ENV: process.env.NODE_ENV
    }
  };
  
  res.json(debugInfo);
});

// ✅ Endpoint de test MUY SIMPLE
app.post('/api/simple-test', async (req, res) => {
  try {
    console.log('🧪 Ejecutando test simple...');
    
    if (!ONESIGNAL_APP_ID || !ONESIGNAL_REST_API_KEY) {
      throw new Error('OneSignal credentials not configured');
    }

    const testPayload = {
      app_id: ONESIGNAL_APP_ID,
      contents: { en: '✅ Test notification from Twogo Server' },
      included_segments: ['All']
    };

    console.log('🧪 Test payload:', testPayload);

    const response = await axios.post(
      'https://onesignal.com/api/v1/notifications',
      testPayload,
      {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Basic ${ONESIGNAL_REST_API_KEY}`
        }
      }
    );

    res.json({
      success: true,
      message: 'Test notification sent successfully',
      test_data: response.data
    });

  } catch (error) {
    console.error('❌ Test failed:', error.message);
    res.status(500).json({
      success: false,
      error: 'Test failed',
      details: error.response?.data || error.message
    });
  }
});

// Manejo de errores global
app.use((err, req, res, next) => {
  console.error('🚨 Error global no manejado:', err);
  res.status(500).json({
    success: false,
    error: 'Internal Server Error',
    message: err.message
  });
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({
    success: false,
    error: 'Endpoint not found',
    path: req.originalUrl
  });
});

app.listen(PORT, () => {
  console.log(`\n🚀 Twogo OneSignal Server iniciado en puerto ${PORT}`);
  console.log(`📱 OneSignal App ID: ${ONESIGNAL_APP_ID || '❌ NO CONFIGURADO'}`);
  console.log(`🔑 API Key: ${ONESIGNAL_REST_API_KEY ? '✅ CONFIGURADO' : '❌ NO CONFIGURADO'}`);
  console.log(`⏰ ${new Date().toISOString()}`);
  console.log(`🔍 Usa /api/debug para verificar la configuración\n`);
});
