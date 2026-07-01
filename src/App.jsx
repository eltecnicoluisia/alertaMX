import React, { useState, useEffect, useRef } from 'react';
import EarthquakeMap from './components/Map';
import AlertPanel from './components/AlertPanel';

// Default cities if location is denied
const DEFAULT_CITIES = [
  { name: 'Guadalajara, Jalisco', lat: 20.659698, lng: -103.349609 },
  { name: 'Mexicali, Baja California', lat: 32.624538, lng: -115.452262 }
];

// Haversine formula for distance in km
function calculateDistance(lat1, lon1, lat2, lon2) {
  const R = 6371; 
  const dLat = (lat2 - lat1) * (Math.PI / 180);
  const dLon = (lon2 - lon1) * (Math.PI / 180); 
  const a = 
    Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(lat1 * (Math.PI / 180)) * Math.cos(lat2 * (Math.PI / 180)) * 
    Math.sin(dLon/2) * Math.sin(dLon/2); 
  return R * (2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a))); 
}

function App() {
  const [started, setStarted] = useState(false);
  const [systemStatus, setSystemStatus] = useState('connecting');
  const [activeEvents, setActiveEvents] = useState([]);
  const [userLocation, setUserLocation] = useState(null);
  
  // Ask for permissions and start the app
  const handleStart = async () => {
    // 1. Request Notification Permission
    if ('Notification' in window) {
      const perm = await Notification.requestPermission();
      console.log('Notification permission:', perm);
    }
    
    // 2. Request Geolocation
    if ('geolocation' in navigator) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          setUserLocation({
            name: 'Tu Ubicación Actual',
            lat: pos.coords.latitude,
            lng: pos.coords.longitude
          });
        },
        (err) => console.warn('Location denied, using defaults', err)
      );
    }

    setStarted(true);
    // Play a tiny silent sound to unlock AudioContext on iOS/Android
    playAlertSound('init');
  };

  // WebSocket Connection
  useEffect(() => {
    if (!started) return;

    let ws;
    let reconnectTimer;
    
    const connectWebSocket = () => {
      setSystemStatus('connecting');
      ws = new WebSocket('wss://www.seismicportal.eu/standing_order/websocket');

      ws.onopen = () => setSystemStatus('connected');

      ws.onmessage = (event) => {
        try {
          const message = JSON.parse(event.data);
          if (message.action === 'create' && message.data && message.data.properties) {
            const props = message.data.properties;
            const geom = message.data.geometry;
            const lat = geom.coordinates[1];
            const lng = geom.coordinates[0];
            const mag = props.mag;
            
            // Filter 1: Magnitude must be > 4.0
            if (mag <= 4.0) return;

            // Filter 2: Must be within 300km of Jalisco or Mexicali
            const distJalisco = calculateDistance(lat, lng, DEFAULT_CITIES[0].lat, DEFAULT_CITIES[0].lng);
            const distMexicali = calculateDistance(lat, lng, DEFAULT_CITIES[1].lat, DEFAULT_CITIES[1].lng);
            
            const isNearTarget = distJalisco <= 300 || distMexicali <= 300;

            if (!isNearTarget) return; // Ignore if too far or too small
            
            const isCritical = mag >= 6.0;

            const liveQuake = {
              id: props.unid || Date.now().toString(),
              time: props.time,
              lat, lng,
              location: props.flynn_region || 'Ubicación Desconocida',
              type: 'quake',
              value: `M ${mag.toFixed(1)}`,
              severity: isCritical ? 'critical' : (mag >= 4.5 ? 'med' : 'low'),
              details: [`Profundidad: ${props.depth} km`, `Agencia: ${props.auth}`],
              elapsedSeconds: 0, initialRadius: 10, speedMultiplier: 4
            };

            triggerSystemNotification('Alerta Sísmica', `Magnitud ${mag.toFixed(1)} detectada cerca de ti`);
            
            setActiveEvents(prev => [liveQuake, ...prev].slice(0, 50));
            playAlertSound('quake');
          }
        } catch (error) { console.error('Error WS', error); }
      };

      ws.onclose = () => {
        setSystemStatus('disconnected');
        reconnectTimer = setTimeout(connectWebSocket, 5000);
      };
      ws.onerror = () => setSystemStatus('error');
    };

    connectWebSocket();

    return () => {
      if (ws) ws.close();
      if (reconnectTimer) clearTimeout(reconnectTimer);
    };
  }, [started]);

  // Update dynamic events
  useEffect(() => {
    if (activeEvents.length === 0) return;
    const interval = setInterval(() => {
      setActiveEvents(prev => prev.map(event => {
        if (event.type === 'quake' || event.type === 'tsunami') {
          return {
            ...event,
            elapsedSeconds: event.elapsedSeconds + 1,
            waveRadius: event.initialRadius + ((event.elapsedSeconds + 1) * event.speedMultiplier)
          };
        }
        return event;
      }));
    }, 1000);
    return () => clearInterval(interval);
  }, [activeEvents.length]);

  const triggerSystemNotification = (title, body) => {
    try {
      if (typeof Notification !== 'undefined' && Notification.permission === 'granted') {
        new Notification(title, { body, icon: '/favicon.ico' });
      }
    } catch (e) {
      console.warn('Error al enviar notificación:', e);
    }

    try {
      if (navigator.vibrate) {
        navigator.vibrate([200, 100, 200, 100, 200]);
      }
    } catch (e) {
      console.warn('Vibración no soportada', e);
    }
  };

  const playAlertSound = (type) => {
    try {
      const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      
      if (type === 'init') {
        osc.frequency.setValueAtTime(0, audioCtx.currentTime);
        setTimeout(() => audioCtx.close(), 100);
      } else if (type === 'quake' || type === 'tsunami') {
        osc.type = 'square';
        osc.frequency.setValueAtTime(400, audioCtx.currentTime);
        osc.frequency.linearRampToValueAtTime(800, audioCtx.currentTime + 1);
        osc.frequency.linearRampToValueAtTime(400, audioCtx.currentTime + 2);
      } else {
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(600, audioCtx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(300, audioCtx.currentTime + 0.5);
      }
      
      osc.connect(gain);
      gain.connect(audioCtx.destination);
      osc.start();
      
      gain.gain.setValueAtTime(0, audioCtx.currentTime);
      gain.gain.linearRampToValueAtTime(type === 'init' ? 0 : 0.1, audioCtx.currentTime + 0.1);
      
      if (type !== 'init') {
        setTimeout(() => {
          gain.gain.linearRampToValueAtTime(0, audioCtx.currentTime + 0.5);
          setTimeout(() => { osc.stop(); audioCtx.close(); }, 600);
        }, 3000);
      }
    } catch(e) {}
  };

  const triggerTestAlert = (type) => {
    const id = Date.now().toString();
    const time = new Date().toISOString();
    
    // Test near the user's location if available, else Jalisco
    const target = userLocation || DEFAULT_CITIES[0];
    
    let newEvent = { id, time, lat: target.lat + 0.5, lng: target.lng + 0.5, location: `Cerca de ${target.name}`, type };

    switch(type) {
      case 'quake':
        newEvent = { ...newEvent, value: `M 6.5`, severity: 'critical', details: ['Profundidad: 15km'], elapsedSeconds: 0, initialRadius: 10, speedMultiplier: 4 };
        triggerSystemNotification('Simulación de Sismo', 'Magnitud 6.5 detectada cerca de ti.');
        break;
      case 'tsunami':
        newEvent = { ...newEvent, value: 'Olas de 3m', severity: 'high', details: ['Evacuación inmediata'], elapsedSeconds: 0, initialRadius: 20, speedMultiplier: 1.5 };
        triggerSystemNotification('Alerta de Tsunami', 'Evacúe las zonas costeras inmediatamente.');
        break;
      case 'fire':
        newEvent = { ...newEvent, value: 'Fuego Activo', severity: 'med', details: ['Área afectada: 500 ha'] };
        triggerSystemNotification('Incendio Forestal', 'Fuego activo detectado en su región.');
        break;
      case 'hurricane':
        newEvent = { ...newEvent, value: 'Cat. 3', severity: 'critical', details: ['Vientos: 180 km/h'] };
        triggerSystemNotification('Alerta de Huracán', 'Huracán categoría 3 aproximándose.');
        break;
      case 'volcano':
        newEvent = { ...newEvent, value: 'Fase Roja', severity: 'critical', details: ['Emisión de ceniza a 5km'] };
        triggerSystemNotification('Erupción Volcánica', 'Emisión importante de ceniza detectada.');
        break;
      case 'air':
        newEvent = { ...newEvent, value: 'AQI 185', severity: 'med', details: ['Riesgo Alto'] };
        triggerSystemNotification('Mala Calidad del Aire', 'Índice AQI 185. Quedarse en interiores.');
        break;
    }

    setActiveEvents(prev => [newEvent, ...prev]);
    setTimeout(() => playAlertSound(type), 50);
  };

  const handleDismiss = (id) => setActiveEvents(prev => prev.filter(e => e.id !== id));
  const hasCritical = activeEvents.some(e => e.severity === 'critical');

  if (!started) {
    return (
      <div style={{ height: '100vh', width: '100vw', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: '#0f1115', color: 'white' }}>
        <h1 style={{ fontSize: '2rem', marginBottom: '20px' }}>Alertas MX</h1>
        <p style={{ marginBottom: '30px', color: '#9ca3af', textAlign: 'center', maxWidth: '400px' }}>
          Esta aplicación necesita permisos de ubicación y notificaciones para avisarte a tiempo sobre riesgos naturales cercanos.
        </p>
        <button onClick={handleStart} style={{ padding: '15px 30px', fontSize: '1.1rem', background: '#3b82f6', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold' }}>
          Otorgar Permisos y Entrar
        </button>
      </div>
    );
  }

  return (
    <div className="app-container">
      <div className={`flash-overlay ${hasCritical ? 'active' : ''}`} />
      <AlertPanel 
        activeEvents={activeEvents}
        systemStatus={systemStatus}
        onTestAlert={triggerTestAlert}
        onDismissAlert={handleDismiss}
      />
      <EarthquakeMap 
        activeEvents={activeEvents} 
        userLocation={userLocation}
      />
    </div>
  );
}

export default App;
