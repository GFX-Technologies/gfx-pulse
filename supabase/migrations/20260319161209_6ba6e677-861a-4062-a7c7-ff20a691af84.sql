
-- Incidents table for tracking service incidents
CREATE TABLE public.incidents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  area_id uuid REFERENCES public.areas(id) ON DELETE SET NULL,
  subarea_id uuid REFERENCES public.subareas(id) ON DELETE SET NULL,
  status text NOT NULL DEFAULT 'investigating' CHECK (status IN ('investigating', 'identified', 'monitoring', 'resolved')),
  created_at timestamptz NOT NULL DEFAULT now(),
  resolved_at timestamptz
);

-- Incident updates timeline
CREATE TABLE public.incident_updates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  incident_id uuid NOT NULL REFERENCES public.incidents(id) ON DELETE CASCADE,
  status text NOT NULL CHECK (status IN ('investigating', 'identified', 'monitoring', 'resolved')),
  message text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  usuario_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE
);

-- Enable RLS
ALTER TABLE public.incidents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.incident_updates ENABLE ROW LEVEL SECURITY;

-- RLS policies for incidents
CREATE POLICY "Anyone can view incidents" ON public.incidents FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins can insert incidents" ON public.incidents FOR INSERT TO authenticated WITH CHECK (has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can update incidents" ON public.incidents FOR UPDATE TO authenticated USING (has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can delete incidents" ON public.incidents FOR DELETE TO authenticated USING (has_role(auth.uid(), 'admin'));

-- RLS policies for incident_updates
CREATE POLICY "Anyone can view incident_updates" ON public.incident_updates FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins can insert incident_updates" ON public.incident_updates FOR INSERT TO authenticated WITH CHECK (has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can update incident_updates" ON public.incident_updates FOR UPDATE TO authenticated USING (has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can delete incident_updates" ON public.incident_updates FOR DELETE TO authenticated USING (has_role(auth.uid(), 'admin'));
