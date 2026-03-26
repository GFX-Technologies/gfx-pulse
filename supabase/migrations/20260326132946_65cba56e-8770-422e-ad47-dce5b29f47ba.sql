
CREATE TABLE public.whatsapp_checks (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  subarea_id UUID NOT NULL REFERENCES public.subareas(id) ON DELETE CASCADE,
  check_date DATE NOT NULL DEFAULT CURRENT_DATE,
  check_time_slot TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'not_checked' CHECK (status IN ('operational', 'degraded', 'down', 'not_checked')),
  observacao TEXT,
  checked_by UUID REFERENCES public.profiles(id),
  checked_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  bulk_action BOOLEAN DEFAULT false,
  bulk_scope TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(subarea_id, check_date, check_time_slot)
);

ALTER TABLE public.whatsapp_checks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view whatsapp_checks" ON public.whatsapp_checks
  FOR SELECT TO anon, authenticated USING (true);

CREATE POLICY "Admins can insert whatsapp_checks" ON public.whatsapp_checks
  FOR INSERT TO authenticated WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can update whatsapp_checks" ON public.whatsapp_checks
  FOR UPDATE TO authenticated USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can delete whatsapp_checks" ON public.whatsapp_checks
  FOR DELETE TO authenticated USING (has_role(auth.uid(), 'admin'::app_role));
