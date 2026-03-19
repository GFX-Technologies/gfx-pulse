
-- Fix the overly permissive INSERT policy on profiles
-- The trigger runs as SECURITY DEFINER so it bypasses RLS anyway
-- But let's restrict the policy to only allow users to insert their own profile
DROP POLICY "Anyone can insert profiles" ON public.profiles;
CREATE POLICY "Users can insert own profile" ON public.profiles
  FOR INSERT TO authenticated WITH CHECK (id = auth.uid());
