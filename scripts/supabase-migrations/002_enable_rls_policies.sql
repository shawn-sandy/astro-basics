-- Enable Row Level Security on tables
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist (for idempotency)
DROP POLICY IF EXISTS "Users can view own profile" ON public.users;
DROP POLICY IF EXISTS "Users can update own profile" ON public.users;
DROP POLICY IF EXISTS "Service role can manage all users" ON public.users;
DROP POLICY IF EXISTS "Users can view own messages" ON public.messages;
DROP POLICY IF EXISTS "Users can create messages" ON public.messages;
DROP POLICY IF EXISTS "Users can update own messages" ON public.messages;
DROP POLICY IF EXISTS "Users can delete own messages" ON public.messages;
DROP POLICY IF EXISTS "Anyone can view public messages" ON public.messages;

-- Users table policies
CREATE POLICY "Users can view own profile"
  ON public.users FOR SELECT
  USING (clerk_id = auth.jwt()->>'sub');

CREATE POLICY "Users can update own profile"
  ON public.users FOR UPDATE
  USING (clerk_id = auth.jwt()->>'sub');

-- Service role can manage all users (for webhook operations)
CREATE POLICY "Service role can manage all users"
  ON public.users FOR ALL
  USING (auth.role() = 'service_role');

-- Messages table policies
CREATE POLICY "Users can view own messages"
  ON public.messages FOR SELECT
  USING (
    clerk_user_id = auth.jwt()->>'sub' 
    OR user_id IN (
      SELECT id FROM public.users WHERE clerk_id = auth.jwt()->>'sub'
    )
  );

CREATE POLICY "Users can create messages"
  ON public.messages FOR INSERT
  WITH CHECK (clerk_user_id = auth.jwt()->>'sub');

CREATE POLICY "Users can update own messages"
  ON public.messages FOR UPDATE
  USING (clerk_user_id = auth.jwt()->>'sub');

CREATE POLICY "Users can delete own messages"
  ON public.messages FOR DELETE
  USING (clerk_user_id = auth.jwt()->>'sub');

-- Optional: Public read policy for anonymous messages
CREATE POLICY "Anyone can view public messages"
  ON public.messages FOR SELECT
  USING (user_id IS NULL AND is_archived = false);