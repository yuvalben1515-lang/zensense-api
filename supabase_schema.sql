-- ============================================================
--  ZenSense Database Schema - גרסה סופית
--  הרץ ב-Supabase SQL Editor
-- ============================================================

-- מחק טבלאות קיימות אם יש
DROP TABLE IF EXISTS alerts;
DROP TABLE IF EXISTS devices;

-- טבלת מכשירים
CREATE TABLE devices (
  id              UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  device_id       TEXT UNIQUE NOT NULL,
  wifi_ssid       TEXT,
  wifi_pass       TEXT,
  elder_name      TEXT DEFAULT 'הקשיש',
  room_name       TEXT DEFAULT 'הבית',
  address         TEXT DEFAULT '',        -- כתובת מלאה למד"א
  contacts        TEXT[] NOT NULL DEFAULT '{}',
  verify_seconds  INTEGER DEFAULT 30,
  call_minutes    INTEGER DEFAULT 2,
  mada_minutes    INTEGER DEFAULT 5,
  buzzer_volume   INTEGER DEFAULT 70,
  enable_whatsapp BOOLEAN DEFAULT TRUE,
  enable_call     BOOLEAN DEFAULT TRUE,
  enable_mada     BOOLEAN DEFAULT TRUE,
  enable_buzzer   BOOLEAN DEFAULT TRUE,
  enable_button   BOOLEAN DEFAULT TRUE,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);

-- טבלת התראות
CREATE TABLE alerts (
  id                UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  device_id         TEXT REFERENCES devices(device_id),
  type              TEXT NOT NULL,        -- 'fall' | 'button'
  status            TEXT DEFAULT 'active',-- active | handled | mada_called
  call_sent         BOOLEAN DEFAULT FALSE,
  mada_sent         BOOLEAN DEFAULT FALSE,
  play_success_tone BOOLEAN DEFAULT FALSE,
  handled_at        TIMESTAMPTZ,
  created_at        TIMESTAMPTZ DEFAULT NOW()
);

-- אינדקסים
CREATE INDEX idx_alerts_device_id ON alerts(device_id);
CREATE INDEX idx_alerts_status ON alerts(status);
CREATE INDEX idx_devices_device_id ON devices(device_id);
