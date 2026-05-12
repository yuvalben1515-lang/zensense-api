// api/ivr.js - ילד לחץ מקש בשיחה
import { createClient } from '@supabase/supabase-js';
import axios from 'axios';

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();

  const { deviceId } = req.query;
  const digit = req.body.Digits;

  const { data: device } = await supabase
    .from('devices').select('*').eq('device_id', deviceId).single();

  const { data: alert } = await supabase
    .from('alerts').select('*')
    .eq('device_id', deviceId).eq('status', 'active')
    .order('created_at', { ascending: false }).limit(1).single();

  if (!device || !alert) {
    return res.send(`<Response><Say language="he-IL">שגיאה.</Say></Response>`);
  }

  // לחץ 1 = אישור טיפול
  if (digit === '1') {
    await supabase.from('alerts').update({
      status: 'handled',
      handled_at: new Date().toISOString(),
      play_success_tone: true
    }).eq('id', alert.id);

    // עדכן שאר הילדים
    const msg = `✅ *ZenSense — עודכן*\n\nאחד מהילדים ענה ומטפל ב${device.elder_name}.\nאין צורך בפעולה נוספת. 🙏`;
    for (const phone of device.contacts) {
      try {
        await axios.get(
          `https://api.callmebot.com/whatsapp.php?phone=${phone}&text=${encodeURIComponent(msg)}&apikey=${process.env.CALLMEBOT_KEY}`
        );
      } catch (e) {}
    }

    return res.send(
      `<Response><Say language="he-IL">תודה. נרשם שאתם מטפלים. שמרו על עצמכם.</Say></Response>`
    );
  }

  // לחץ 2 = קרא מד"א
  if (digit === '2') {
    await supabase.from('alerts').update({ mada_sent: true, status: 'mada_called' }).eq('id', alert.id);
    return res.send(
      `<Response><Say language="he-IL">מגן דוד אדום נקרא. הם בדרך.</Say></Response>`
    );
  }

  // לחץ 9 = חזור על ההודעה
  if (digit === '9') {
    return res.send(
      `<Response>` +
      `<Say language="he-IL">${device.elder_name} זקוק לעזרה. לאישור לחצו 1. למגן דוד לחצו 2.</Say>` +
      `<Gather numDigits="1" action="/api/ivr?deviceId=${deviceId}" method="POST" timeout="10"></Gather>` +
      `</Response>`
    );
  }

  res.send(`<Response><Say language="he-IL">מקש לא מוכר.</Say></Response>`);
}
