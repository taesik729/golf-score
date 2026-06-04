-- 1. 라운드 테이블
CREATE TABLE golf_rounds (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  course_name text NOT NULL,
  played_at date NOT NULL,
  holes int NOT NULL DEFAULT 18,
  total_score int,
  notes text,
  created_at timestamptz DEFAULT now()
);

-- 2. 홀별 스코어 테이블
CREATE TABLE golf_scores (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  round_id uuid REFERENCES golf_rounds(id) ON DELETE CASCADE NOT NULL,
  hole int NOT NULL,
  par int NOT NULL DEFAULT 4,
  score int NOT NULL DEFAULT 4,
  created_at timestamptz DEFAULT now()
);

-- 3. RLS 활성화
ALTER TABLE golf_rounds ENABLE ROW LEVEL SECURITY;
ALTER TABLE golf_scores ENABLE ROW LEVEL SECURITY;

-- 4. RLS 정책 (자기 데이터만 접근)
CREATE POLICY "users can manage own rounds"
  ON golf_rounds FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "users can manage own scores"
  ON golf_scores FOR ALL
  USING (
    round_id IN (
      SELECT id FROM golf_rounds WHERE user_id = auth.uid()
    )
  );
