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

console.log('🔧 Iniciando servidor...');
console.log('📱 ONESIGNAL_APP_ID:', ONESIGNAL_APP_ID ? '✅' : '❌');
console.log('🔑 ONESIGNAL_REST_API_KEY:', ONESIGNAL_REST_API_KEY ? '✅' : '❌');

// Health check
app.get('/', (req, res) => {
  res.json({ 
    message: 'Twogo OneSignal Server is running!',
    status: 'OK',
    timestamp: new Date().toISOString()
  });
});

// ✅ ENDPOINT SIMPLIFICADO CON MÁXIMO LOGGING
app.post('/api/send-notification', async (req, res) => {
  console.log('\n🚨 ========== INICIANDO /api/send-notification ==========');
  console.log('⏰ Timestamp:', new Date().toISOString());
  
  try {
    // 1. Validar que tenemos las credenciales
    console.log('🔍 Paso 1: Validando credenciales...');
    if (!ONESIGNAL_APP_ID || !ONESIGNAL_REST_API_KEY) {
      const errorMsg = 'Credenciales de OneSignal faltantes';
      console.error('❌', errorMsg);
      console.log('ONESIGNAL_APP_ID:', ONESIGNAL_APP_ID);
      console.log('ONESIGNAL_REST_API_KEY:', ONESIGNAL_REST_API_KEY ? 'PRESENTE' : 'FALTANTE');
      
      return res.status(500).json({
        success: false,
        error: errorMsg,
        details: {
          ONESIGNAL_APP_ID: ONESIGNAL_APP_ID ? 'present' : 'missing',
          ONESIGNAL_REST_API_KEY: ONESIGNAL_REST_API_KEY ? 'present' : 'missing'
        }
      });
    }
    console.log('✅ Credenciales validadas');

    // 2. Validar body de la request
    console.log('🔍 Paso 2: Validando body de la request...');
    console.log('📦 Body completo:', JSON.stringify(req.body, null, 2));
    
    const { title, message, target = 'all', data = {} } = req.body;

    if (!title || !message) {
      console.error('❌ Title o message faltantes');
      console.log('Title:', title);
      console.log('Message:', message);
      
      return res.status(400).json({
        success: false,
        error: 'Title and message are required',
        received: { title, message }
      });
    }
    console.log('✅ Body validado');

    // 3. Crear payload SIMPLIFICADO
    console.log('🔍 Paso 3: Creando payload...');
    const notificationPayload = {
      app_id: ONESIGNAL_APP_ID,
      headings: { en: title },
      contents: { en: message },
      included_segments: ['All'], // Siempre usar 'All' para pruebas
      data: data
    };

    console.log('📤 Payload creado:', JSON.stringify(notificationPayload, null, 2));

    // 4. Enviar a OneSignal
    console.log('🔍 Paso 4: Enviando a OneSignal...');
    console.log('🔗 URL: https://onesignal.com/api/v1/notifications');
    console.log('🔑 Auth:', `Basic ${ONESIGNAL_REST_API_KEY.substring(0, 10)}...`);
    
    const response = await axios.post(
      'https://onesignal.com/api/v1/notifications',
      notificationPayload,
      {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Basic ${ONESIGNAL_REST_API_KEY}`
        },
        timeout: 30000
      }
    );

    console.log('✅ OneSignal response recibida');
    console.log('📊 Response data:', JSON.stringify(response.data, null, 2));
    console.log('📊 Response status:', response.status);

    // 5. Responder al cliente
    console.log('🔍 Paso 5: Enviando respuesta al cliente...');
    res.json({
      success: true,
      message: 'Notification sent successfully',
      data: response.data
    });

    console.log('🎉 ========== NOTIFICACIÓN ENVIADA EXITOSAMENTE ==========\n');

  } catch (error) {
    console.error('\n💥 ========== ERROR CRÍTICO ==========');
    
    if (error.response) {
      // Error de OneSignal API
      console.error('📊 OneSignal API Error:');
      console.error('🔴 Status:', error.response.status);
      console.error('🔴 Data:', JSON.stringify(error.response.data, null, 2));
      console.error('🔴 Headers:', error.response.headers);
      
      res.status(error.response.status).json({
        success: false,
        error: 'OneSignal API Error',
        status: error.response.status,
        details: error.response.data
      });
      
    } else if (error.request) {
      // No se recibió respuesta
      console.error('📡 Network Error:');
      console.error('🔴 No response received from OneSignal');
      console.error('🔴 Request:', error.request);
      
      res.status(503).json({
        success: false,
        error: 'Network Error - No response from OneSignal',
        details: 'Check your internet connection and OneSignal service status'
      });
      
    } else {
      // Error de configuración
      console.error('⚙️ Setup Error:');
      console.error('🔴 Message:', error.message);
      console.error('🔴 Stack:', error.stack);
      
      res.status(500).json({
        success: false,
        error: 'Internal Server Error',
        details: error.message,
        stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
      });
    }
    
    console.error('💥 ========== FIN ERROR ==========\n');
  }
});

// ✅ Endpoint de diagnóstico
app.get('/api/debug', (req, res) => {
  const debugInfo = {
    server: {
      status: 'running',
      port: PORT,
      node_version: process.version,
      uptime: process.uptime(),
      timestamp: new Date().toISOString()
    },
    onesignal: {
      app_id: ONESIGNAL_APP_ID || 'MISSING',
      api_key: ONESIGNAL_REST_API_KEY ? 'PRESENT' : 'MISSING',
      configured: !!(ONESIGNAL_APP_ID && ONESIGNAL_REST_API_KEY)
    },
    environment: {
      NODE_ENV: process.env.NODE_ENV || 'development',
      PORT: process.env.PORT
    }
  };
  
  console.log('🔍 Debug info:', debugInfo);
  res.json(debugInfo);
});

// ✅ Endpoint de test SUPER SIMPLE
app.post('/api/simple-test', async (req, res) => {
  console.log('\n🧪 ========== TEST SIMPLE ==========');
  
  try {
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

    console.log('✅ Test successful:', response.data);
    
    res.json({
      success: true,
      message: 'Test notification sent successfully',
      data: response.data
    });

  } catch (error) {
    console.error('❌ Test failed:', error.message);
    if (error.response) {
      console.error('❌ Response data:', error.response.data);
    }
    
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
  console.log('🔍 404 - Ruta no encontrada:', req.originalUrl);
  res.status(404).json({
    success: false,
    error: 'Endpoint not found',
    path: req.originalUrl
  });
});

app.listen(PORT, () => {
  console.log(`\n🎉 ========== SERVIDOR INICIADO ==========`);
  console.log(`🚀 Puerto: ${PORT}`);
  console.log(`📱 OneSignal App ID: ${ONESIGNAL_APP_ID || '❌ NO CONFIGURADO'}`);
  console.log(`🔑 API Key: ${ONESIGNAL_REST_API_KEY ? '✅ CONFIGURADO' : '❌ NO CONFIGURADO'}`);
  console.log(`⏰ Iniciado: ${new Date().toISOString()}`);
  console.log(`🔍 Endpoints disponibles:`);
  console.log(`   GET  /api/debug - Información de diagnóstico`);
  console.log(`   POST /api/send-notification - Enviar notificación`);
  console.log(`   POST /api/simple-test - Test simple`);
  console.log(`🎉 ========== LISTO ==========\n`);
});
