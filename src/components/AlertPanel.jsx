import React from 'react';
import { 
  Activity, AlertTriangle, ShieldCheck, MapPin, Clock, X, 
  Waves, Flame, Tornado, Mountain, Wind, PhoneCall
} from 'lucide-react';

const hazardConfig = {
  quake: { icon: AlertTriangle, color: 'var(--color-hazard-quake)', label: 'Sismo' },
  tsunami: { icon: Waves, color: 'var(--color-hazard-tsunami)', label: 'Tsunami' },
  fire: { icon: Flame, color: 'var(--color-hazard-fire)', label: 'Incendio Forestal' },
  hurricane: { icon: Tornado, color: 'var(--color-hazard-hurricane)', label: 'Huracán' },
  volcano: { icon: Mountain, color: 'var(--color-hazard-volcano)', label: 'Erupción' },
  air: { icon: Wind, color: 'var(--color-hazard-air)', label: 'Calidad del Aire' },
};

export default function AlertPanel({ activeEvents, systemStatus, onTestAlert, onDismissAlert }) {
  
  return (
    <div className="sidebar">
      {/* Header Panel */}
      <div className="glass-panel header-panel">
        <div className="header-title">
          <Activity size={24} color={systemStatus === 'connected' ? '#10b981' : '#f59e0b'} />
          <div>
            <h1>Alertas MX</h1>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.8rem', color: 'var(--color-text-muted)' }}>
              <div style={{ width: 8, height: 8, borderRadius: '50%', background: systemStatus==='connected'?'#10b981':'#f59e0b' }} />
              {systemStatus === 'connected' ? 'Centro de Mando Activo' : 'Conectando...'}
            </div>
          </div>
        </div>
      </div>

      {/* Alert Feed */}
      <div className="alert-feed">
        {activeEvents.length > 0 ? (
          activeEvents.map(alert => {
            const config = hazardConfig[alert.type];
            const IconComponent = config.icon;
            
            return (
              <div key={alert.id} className={`glass-panel alert-card ${alert.type}`}>
                <button className="btn-dismiss" onClick={() => onDismissAlert(alert.id)}>
                  <X size={16} />
                </button>
                
                <div className="alert-card-header">
                  <div className="hazard-title" style={{ color: config.color }}>
                    <IconComponent size={18} className={alert.type === 'quake' && alert.severity === 'critical' ? 'animate-pulse-red' : ''} />
                    ALERTA DE {config.label.toUpperCase()}
                  </div>
                  <span className="alert-meta"><Clock size={12}/> {new Date(alert.time).toLocaleTimeString()}</span>
                </div>
                
                <div className="alert-value" style={{ color: config.color }}>
                  {alert.value}
                </div>
                
                <div className="alert-location">
                  <MapPin size={14} style={{ display: 'inline', marginRight: '4px' }}/>
                  {alert.location}
                </div>
                
                <div className="alert-meta" style={{ marginTop: '4px' }}>
                  {alert.details.map((detail, idx) => (
                    <span key={idx} style={{ marginRight: '8px' }}>• {detail}</span>
                  ))}
                </div>
                
                {/* Botón de Emergencia WhatsApp */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginTop: '12px' }}>
                  <a 
                    href={`https://wa.me/5215511964285?text=🚨 *ALERTA EN SISTEMA* 🚨%0ASe ha detectado: *${config.label.toUpperCase()}*%0ALocalización: ${alert.location}%0ADetalle: ${alert.value}`} 
                    target="_blank" rel="noopener noreferrer" className="btn-whatsapp" style={{ marginTop: 0, padding: '8px', fontSize: '0.8rem' }}
                  >
                    <PhoneCall size={14} /> Dalvis
                  </a>
                  <a 
                    href={`https://wa.me/526862267018?text=🚨 *ALERTA EN SISTEMA* 🚨%0ASe ha detectado: *${config.label.toUpperCase()}*%0ALocalización: ${alert.location}%0ADetalle: ${alert.value}`} 
                    target="_blank" rel="noopener noreferrer" className="btn-whatsapp" style={{ marginTop: 0, padding: '8px', fontSize: '0.8rem' }}
                  >
                    <PhoneCall size={14} /> Yndira
                  </a>
                  <a 
                    href={`https://wa.me/526862827516?text=🚨 *ALERTA EN SISTEMA* 🚨%0ASe ha detectado: *${config.label.toUpperCase()}*%0ALocalización: ${alert.location}%0ADetalle: ${alert.value}`} 
                    target="_blank" rel="noopener noreferrer" className="btn-whatsapp" style={{ marginTop: 0, padding: '8px', fontSize: '0.8rem' }}
                  >
                    <PhoneCall size={14} /> Anais
                  </a>
                  <a 
                    href={`https://wa.me/5216863706972?text=🚨 *ALERTA EN SISTEMA* 🚨%0ASe ha detectado: *${config.label.toUpperCase()}*%0ALocalización: ${alert.location}%0ADetalle: ${alert.value}`} 
                    target="_blank" rel="noopener noreferrer" className="btn-whatsapp" style={{ marginTop: 0, padding: '8px', fontSize: '0.8rem' }}
                  >
                    <PhoneCall size={14} /> Vanesa
                  </a>
                </div>
              </div>
            );
          })
        ) : (
          <div className="glass-panel" style={{ padding: '30px 20px', textAlign: 'center', color: 'var(--color-text-muted)', marginTop: 'auto', marginBottom: 'auto' }}>
            <ShieldCheck size={48} color="var(--color-level-low)" style={{ margin: '0 auto 10px', opacity: 0.5 }} />
            <h3>Sin alertas activas</h3>
            <p style={{ fontSize: '0.85rem', marginTop: '4px' }}>Monitoreando territorio nacional.</p>
          </div>
        )}
      </div>

      {/* Simulator Controls */}
      <div className="glass-panel simulator-panel">
        <h3>Simulador de Desastres (Pruebas)</h3>
        {Object.entries(hazardConfig).map(([type, config]) => {
          const Icon = config.icon;
          return (
            <button 
              key={type} 
              className={`btn-sim ${type}`} 
              onClick={() => onTestAlert(type)}
            >
              <Icon size={20} />
              {config.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}
