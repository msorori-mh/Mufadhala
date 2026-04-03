
-- Create moderator_scopes table
CREATE TABLE public.moderator_scopes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  scope_type TEXT NOT NULL DEFAULT 'global',
  scope_id UUID,
  is_global BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  CONSTRAINT valid_scope_type CHECK (scope_type IN ('global', 'university', 'college', 'major')),
  CONSTRAINT valid_scope CHECK (
    (is_global = true AND scope_id IS NULL AND scope_type = 'global')
    OR (is_global = false AND scope_id IS NOT NULL AND scope_type != 'global')
  )
);

-- Add unique constraint to prevent duplicate scopes
CREATE UNIQUE INDEX moderator_scopes_unique ON public.moderator_scopes (user_id, scope_type, scope_id) WHERE is_global = false;
CREATE UNIQUE INDEX moderator_scopes_global_unique ON public.moderator_scopes (user_id) WHERE is_global = true;

-- Enable RLS
ALTER TABLE public.moderator_scopes ENABLE ROW LEVEL SECURITY;

-- Admins full access
CREATE POLICY "Admins can manage all scopes"
ON public.moderator_scopes
FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Moderators can view their own scopes
CREATE POLICY "Moderators can view own scopes"
ON public.moderator_scopes
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

-- Add updated_at trigger
CREATE TRIGGER set_moderator_scopes_updated_at
  BEFORE UPDATE ON public.moderator_scopes
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();
