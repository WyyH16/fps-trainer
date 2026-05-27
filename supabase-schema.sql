-- =============================================
-- FPS训练台 Supabase 数据库 Schema
-- 在 Supabase SQL Editor 中运行此文件
-- 支持重复运行（先清理再创建）
-- =============================================

-- 清理旧对象（如果存在）
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS public.update_profile;
DROP FUNCTION IF EXISTS public.get_leaderboard;
DROP FUNCTION IF EXISTS public.upsert_personal_best;
DROP FUNCTION IF EXISTS public.handle_new_user;
DROP POLICY IF EXISTS "profiles_select" ON public.profiles;
DROP POLICY IF EXISTS "profiles_insert" ON public.profiles;
DROP POLICY IF EXISTS "profiles_update" ON public.profiles;
DROP POLICY IF EXISTS "records_select" ON public.training_records;
DROP POLICY IF EXISTS "records_insert" ON public.training_records;
DROP POLICY IF EXISTS "bests_select" ON public.personal_bests;
DROP POLICY IF EXISTS "bests_insert" ON public.personal_bests;
DROP POLICY IF EXISTS "bests_update" ON public.personal_bests;
DROP TABLE IF EXISTS public.training_records;
DROP TABLE IF EXISTS public.personal_bests;
DROP TABLE IF EXISTS public.profiles;

-- =============================================
-- TABLE: profiles (用户显示名)
-- =============================================
CREATE TABLE public.profiles (
  id          UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  username    TEXT NOT NULL,
  country     TEXT NOT NULL DEFAULT '',
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- =============================================
-- TABLE: training_records (训练事件日志，追加)
-- =============================================
CREATE TABLE public.training_records (
  id          BIGSERIAL PRIMARY KEY,
  user_id     UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  module      TEXT NOT NULL,
  sub_key     TEXT NOT NULL DEFAULT '',
  score_data  JSONB NOT NULL,
  rank        TEXT,
  tags        TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON COLUMN public.training_records.module IS 'schulte | reaction | aim | stroop | moving | speedtest | snake | 2048';
COMMENT ON COLUMN public.training_records.sub_key IS 'For schulte: "5x5" etc. Otherwise empty.';
COMMENT ON COLUMN public.training_records.score_data IS 'e.g. {"time":"18.23"} {"hits":28} {"ms":172} {"cps":8.2}';

-- =============================================
-- TABLE: personal_bests (每人每模块最佳成绩)
-- =============================================
CREATE TABLE public.personal_bests (
  id          BIGSERIAL PRIMARY KEY,
  user_id     UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  module      TEXT NOT NULL,
  sub_key     TEXT NOT NULL DEFAULT '',
  score_data  JSONB NOT NULL,
  rank        TEXT,
  tags        TEXT,
  achieved_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, module, sub_key)
);

-- =============================================
-- INDEXES
-- =============================================
CREATE INDEX idx_training_records_user ON public.training_records(user_id, module, sub_key);
CREATE INDEX idx_personal_bests_lb     ON public.personal_bests(module, sub_key);
CREATE INDEX idx_personal_bests_user   ON public.personal_bests(user_id);

-- =============================================
-- ROW LEVEL SECURITY
-- =============================================
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.training_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.personal_bests ENABLE ROW LEVEL SECURITY;

-- Profiles: 公开可读，仅本人可写
CREATE POLICY "profiles_select" ON public.profiles FOR SELECT USING (true);
CREATE POLICY "profiles_insert" ON public.profiles FOR INSERT WITH CHECK (auth.uid() = id);
CREATE POLICY "profiles_update" ON public.profiles FOR UPDATE USING (auth.uid() = id);

-- Training records: 公开可读（排行榜需要），仅本人可插入
CREATE POLICY "records_select" ON public.training_records FOR SELECT USING (true);
CREATE POLICY "records_insert" ON public.training_records FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Personal bests: 公开可读，仅本人可 upsert
CREATE POLICY "bests_select" ON public.personal_bests FOR SELECT USING (true);
CREATE POLICY "bests_insert" ON public.personal_bests FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "bests_update" ON public.personal_bests FOR UPDATE USING (auth.uid() = user_id);

-- =============================================
-- TRIGGER: 注册时自动创建 profile
-- =============================================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.profiles (id, username, country)
  VALUES (
    new.id,
    COALESCE(new.raw_user_meta_data->>'username', split_part(new.email, '@', 1)),
    COALESCE(new.raw_user_meta_data->>'country', '')
  );
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- =============================================
-- FUNCTION: upsert personal best（服务端比较成绩）
-- =============================================
CREATE OR REPLACE FUNCTION public.upsert_personal_best(
  p_user_id    UUID,
  p_module     TEXT,
  p_sub_key    TEXT,
  p_score_data JSONB,
  p_rank       TEXT DEFAULT NULL,
  p_tags       TEXT DEFAULT NULL
) RETURNS void AS $$
DECLARE
  existing JSONB;
  is_better BOOLEAN := false;
BEGIN
  SELECT score_data INTO existing
  FROM public.personal_bests
  WHERE user_id = p_user_id AND module = p_module AND sub_key = p_sub_key;

  IF existing IS NULL THEN
    is_better := true;
  ELSE
    CASE p_module
      WHEN 'schulte'  THEN is_better := (p_score_data->>'time')::float  < (existing->>'time')::float;
      WHEN 'reaction' THEN is_better := (p_score_data->>'ms')::int      < (existing->>'ms')::int;
      WHEN 'aim'      THEN is_better := (p_score_data->>'hits')::int    > (existing->>'hits')::int;
      WHEN 'stroop'   THEN is_better := (p_score_data->>'time')::float  < (existing->>'time')::float;
      WHEN 'moving'   THEN is_better := (p_score_data->>'score')::int   > (existing->>'score')::int;
      WHEN 'speedtest'THEN is_better := (p_score_data->>'cps')::float   > (existing->>'cps')::float;
      WHEN 'snake'       THEN is_better := (p_score_data->>'score')::int   > (existing->>'score')::int;
      WHEN '2048'        THEN is_better := (p_score_data->>'score')::int   > (existing->>'score')::int;
      WHEN 'minesweeper' THEN is_better := (p_score_data->>'time')::float  < (existing->>'time')::float;
      WHEN 'breakout'    THEN is_better := (p_score_data->>'score')::int   > (existing->>'score')::int;
      ELSE is_better := false;
    END CASE;
  END IF;

  IF is_better THEN
    INSERT INTO public.personal_bests (user_id, module, sub_key, score_data, rank, tags, achieved_at)
    VALUES (p_user_id, p_module, p_sub_key, p_score_data, p_rank, p_tags, now())
    ON CONFLICT (user_id, module, sub_key)
    DO UPDATE SET
      score_data  = EXCLUDED.score_data,
      rank        = EXCLUDED.rank,
      tags        = EXCLUDED.tags,
      achieved_at = EXCLUDED.achieved_at;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =============================================
-- FUNCTION: get_leaderboard（排行榜查询，服务端 JOIN）
-- =============================================
CREATE OR REPLACE FUNCTION public.get_leaderboard(
  p_module  TEXT,
  p_sub_key TEXT DEFAULT ''
) RETURNS TABLE(
  user_id     UUID,
  username    TEXT,
  country     TEXT,
  score_data  JSONB,
  rank        TEXT,
  achieved_at TIMESTAMPTZ
) AS $$
BEGIN
  RETURN QUERY
    SELECT
      pb.user_id,
      pr.username,
      pr.country,
      pb.score_data,
      pb.rank,
      pb.achieved_at
    FROM public.personal_bests pb
    INNER JOIN public.profiles pr ON pr.id = pb.user_id
    WHERE pb.module = p_module AND pb.sub_key = p_sub_key
    ORDER BY
      CASE p_module
        WHEN 'schulte'     THEN (pb.score_data->>'time')::float
        WHEN 'reaction'    THEN (pb.score_data->>'ms')::int::float
        WHEN 'stroop'      THEN (pb.score_data->>'time')::float
        WHEN 'minesweeper' THEN (pb.score_data->>'time')::float
      END ASC,
      CASE p_module
        WHEN 'aim'       THEN (pb.score_data->>'hits')::int::float
        WHEN 'moving'    THEN (pb.score_data->>'score')::int::float
        WHEN 'speedtest' THEN (pb.score_data->>'cps')::float
        WHEN 'snake'     THEN (pb.score_data->>'score')::int::float
        WHEN '2048'      THEN (pb.score_data->>'score')::int::float
        WHEN 'breakout'  THEN (pb.score_data->>'score')::int::float
      END DESC NULLS LAST
    LIMIT 100;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =============================================
-- FUNCTION: update_profile（修改用户名和国家）
-- =============================================
CREATE OR REPLACE FUNCTION public.update_profile(
  p_user_id  UUID,
  p_username TEXT,
  p_country  TEXT DEFAULT ''
) RETURNS void AS $$
BEGIN
  UPDATE public.profiles
  SET username = COALESCE(p_username, username),
      country  = COALESCE(p_country, country)
  WHERE id = p_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
