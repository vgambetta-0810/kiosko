import { useEffect, useState } from 'react';
import { api } from '../services/api';

export default function ClientPanel() {
  const [reservations, setReservations] = useState([]);
  const [notifications, setNotifications] = useState([]);

  useEffect(() => {
    api.get('/reservations').then((r) => setReservations(r.data));
    api.get('/notifications/mine').then((r) => setNotifications(r.data));
  }, []);

  return (
    <div className="page">
      <h1>Client Panel</h1>
      <h2>Reservations</h2>
      <ul>{reservations.map((r) => <li key={r._id}>{r.status} - Total: {r.total}</li>)}</ul>
      <h2>Notifications</h2>
      <ul>{notifications.map((n) => <li key={n._id}>{n.message}</li>)}</ul>
    </div>
  );
}
