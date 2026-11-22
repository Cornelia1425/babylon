// Lets two devices share one tower.
// Messages go through public relay servers (MQTT over secure WebSocket).
// Every relay that answers is used at once, so two devices still meet
// even if one relay is blocked on the local Wi-Fi.
import mqtt from '../../vendor/mqtt.esm.js';

// All three answered from the venue Wi-Fi on 2026-11-22. The last one uses the
// ordinary https port, for networks that block the others.
const RELAYS = [
  ['wss://broker.emqx.io:8084/mqtt', {}],
  ['wss://broker.hivemq.com:8884/mqtt', {}],
  ['wss://demo.tbmq.io:443/mqtt', { username: 'demo' }],
];

export function connect({ room, onMessage, onStatus }) {
  const me = Math.random().toString(36).slice(2, 10);
  const base = `nonslop-tower-7f3a/${room}`;
  const custom = new URLSearchParams(location.search).get('relay'); // for testing against one relay
  const clients = (custom ? [[custom, {}]] : RELAYS).map(([url, extra]) => {
    const c = mqtt.connect(url, {
      ...extra,
      clientId: `tw_${me}_${Math.random().toString(36).slice(2, 6)}`,
      clean: true, keepalive: 30, reconnectPeriod: 2500, connectTimeout: 8000,
    });
    c.on('connect', () => { c.subscribe(`${base}/#`); report(); });
    c.on('close', report);
    c.on('error', () => {});
    c.on('message', (topic, payload) => {
      try {
        const data = JSON.parse(payload.toString());
        if (data.i === me) return; // my own echo
        onMessage(topic.slice(base.length + 1), data);
      } catch { /* ignore anything malformed */ }
    });
    return c;
  });
  function report() { onStatus && onStatus(clients.filter((c) => c.connected).length); }
  return {
    id: me,
    send(sub, obj) {
      const s = JSON.stringify({ ...obj, i: me });
      for (const c of clients) if (c.connected) c.publish(`${base}/${sub}`, s);
    },
    online: () => clients.some((c) => c.connected),
  };
}
