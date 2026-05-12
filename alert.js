// api/alert.js - התראת נפילה או כפתור חירום
import { createClient } from '@supabase/supabase-js';
import axios from 'axios';

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).end();

  const { deviceId, type } = req.body;
  // type: 'fall' = נפילה | 'button' = כפתור חירום

  const { data: device, error } = await supabase
    .from('devices').select('*').eq('device_id', deviceId).single();

  if (error || !device) return res.status(404).json({ error: 'מכשיר לא נמצא' });

  // שמור התראה בדאטאבייס
  const { data: alert } = await supabase.from('alerts').insert({
    device_id: deviceId,
    type,
    status: 'active',
    created_at: new Date().toISOString()
  }).select().single();

  const isButton = type === 'button';
  const message =
    `${isButton ? '🆘' : '🚨'} *התראת ZenSense*\n\n` +
    `${isButton ? `${device.elder_name} לחצו על כפתור החירום` : `זוהתה נפילה אצל ${device.elder_name}`}\n` +
    `📍 מיקום: ${device.room_name}\n` +
    `⏰ שעה: ${new Date().toLocaleTimeString('he-IL')}\n\n` +
    `אנא בדקו מיד.\nשלח *טיפלתי* לאישור.`;

  // שלח WhatsApp לכולם מיד
  if (device.enable_whatsapp) {
    for (const phone of device.contacts) {
      try {
        await axios.get(
          `https://api.callmebot.com/whatsapp.php?phone=${phone}&text=${encodeURIComponent(message)}&apikey=${process.env.CALLMEBOT_KEY}`
        );
      } catch (e) { console.error('WhatsApp error:', e.message); }
    }
  }

  res.json({ success: true, alertId: alert.id });
}
