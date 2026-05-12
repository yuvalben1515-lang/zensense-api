// api/escalate.js - Vercel Cron - רץ כל דקה
import { createClient } from '@supabase/supabase-js';
import axios from 'axios';

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

export default async function handler(req, res) {
  if (req.headers.authorization !== `Bearer ${process.env.CRON_SECRET}`) {
    return res.status(401).end();
  }

  const now = Date.now();
  const { data: alerts } = await supabase
    .from('alerts').select('*, devices(*)')
    .eq('status', 'active');

  for (const alert of alerts || []) {
    const device = alert.devices;
    const elapsed = now - new Date(alert.created_at).getTime();
    const callMs = (device.call_minutes || 2) * 60 * 1000;
    const madaMs = (device.mada_minutes || 5) * 60 * 1000;

    // שלב 2: שיחת IVR אחרי X דקות
    if (elapsed >= callMs && !alert.call_sent && device.enable_call) {
      await sendIVRCall(alert.device_id, device);
      await supabase.from('alerts').update({ call_sent: true }).eq('id', alert.id);
    }

    // שלב 3: מד"א אחרי X דקות
    if (elapsed >= madaMs && !alert.mada_sent && device.enable_mada) {
      await contactMada(device);
      await supabase.from('alerts')
        .update({ mada_sent: true, status: 'mada_called' })
        .eq('id', alert.id);
    }
  }

  res.json({ processed: alerts?.length || 0 });
}

async function sendIVRCall(deviceId, device) {
  const twiml =
    `<Response>` +
    `<Say language="he-IL">` +
    `שלום. זוהי התראת ZenSense. ` +
    `${device.elder_name} זקוק לעזרה. ` +
    `לאישור טיפול לחצו 1. ` +
    `למגן דוד אדום לחצו 2. ` +
    `לחזרה לחצו 9.` +
    `</Say>` +
    `<Gather numDigits="1" action="${process.env.VERCEL_URL}/api/ivr?deviceId=${deviceId}" method="POST" timeout="10">` +
    `</Gather>` +
    `</Response>`;

  for (const phone of device.contacts) {
    try {
      await axios.post(
        `https://api.twilio.com/2010-04-01/Accounts/${process.env.TWILIO_SID}/Calls.json`,
        new URLSearchParams({ To: phone, From: process.env.TWILIO_FROM, Twiml: twiml }),
        { auth: { username: process.env.TWILIO_SID, password: process.env.TWILIO_TOKEN } }
      );
    } catch (e) { console.error(`שגיאה בשיחה ל-${phone}:`, e.message); }
  }
}

async function contactMada(device) {
  // SMS למד"א עם כתובת מלאה
  const message =
    `ZENSENSE EMERGENCY\n` +
    `שם: ${device.elder_name}\n` +
    `כתובת: ${device.address}\n` +
    `טלפון קשר: ${device.contacts[0]}\n` +
    `נפילה זוהתה - אין מענה מהמשפחה`;

  try {
    await axios.post(
      `https://api.twilio.com/2010-04-01/Accounts/${process.env.TWILIO_SID}/Messages.json`,
      new URLSearchParams({
        To: process.env.MADA_PHONE || '+972101',
        From: process.env.TWILIO_FROM,
        Body: message
      }),
      { auth: { username: process.env.TWILIO_SID, password: process.env.TWILIO_TOKEN } }
    );
    console.log(`🚑 מד"א נוידע עבור ${device.elder_name} - ${device.address}`);
  } catch (e) { console.error('שגיאת מד"א:', e.message); }
}
