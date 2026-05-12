// api/settings.js - שמירת ומשיכת הגדרות מכשיר
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();

  // GET - המכשיר מושך הגדרות
  if (req.method === 'GET') {
    const { deviceId } = req.query;
    const { data, error } = await supabase
      .from('devices').select('*').eq('device_id', deviceId).single();
    if (error) return res.status(404).json({ error: 'לא נמצא' });
    const { wifi_pass, ...safeData } = data;
    return res.json(safeData);
  }

  // POST - לקוח שומר הגדרות
  if (req.method === 'POST') {
    const {
      deviceId, wifiSSID, wifiPass,
      elderName, roomName, address,
      contacts, verifySeconds, callMinutes, madaMinutes,
      buzzerVolume, enableWhatsapp, enableCall,
      enableMada, enableBuzzer, enableButton
    } = req.body;

    if (!deviceId || !contacts?.length) {
      return res.status(400).json({ error: 'חסרים פרטים חובה' });
    }

    const { error } = await supabase.from('devices').upsert({
      device_id: deviceId,
      wifi_ssid: wifiSSID,
      wifi_pass: wifiPass,
      elder_name: elderName || 'הקשיש',
      room_name: roomName || 'הבית',
      address: address || '',       // כתובת למד"א
      contacts,
      verify_seconds: verifySeconds || 30,
      call_minutes: callMinutes || 2,
      mada_minutes: madaMinutes || 5,
      buzzer_volume: buzzerVolume || 70,
      enable_whatsapp: enableWhatsapp !== false,
      enable_call: enableCall !== false,
      enable_mada: enableMada !== false,
      enable_buzzer: enableBuzzer !== false,
      enable_button: enableButton !== false,
      updated_at: new Date().toISOString()
    });

    if (error) return res.status(500).json({ error: error.message });
    return res.json({ success: true, message: 'נשמר בהצלחה!' });
  }

  res.status(405).end();
}
