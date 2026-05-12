// api/status.js - המכשיר בודק אם התקבל אישור
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  if (req.method !== 'GET') return res.status(405).end();

  const { deviceId } = req.query;

  const { data: alert } = await supabase
    .from('alerts').select('*')
    .eq('device_id', deviceId)
    .order('created_at', { ascending: false })
    .limit(1).single();

  if (!alert) return res.json({ handled: false });

  const handled = alert.status === 'handled';
  const playTone = alert.play_success_tone || false;

  if (playTone) {
    await supabase.from('alerts')
      .update({ play_success_tone: false }).eq('id', alert.id);
  }

  res.json({ handled, playTone, status: alert.status });
}
