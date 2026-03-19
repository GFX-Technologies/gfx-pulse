
-- Create role enum
CREATE TYPE public.app_role AS ENUM ('admin', 'operador');

-- Create status enum
CREATE TYPE public.status_type AS ENUM ('green', 'yellow', 'red', 'gray');

-- Create profiles table
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  nome TEXT NOT NULL,
  email TEXT NOT NULL,
  role app_role NOT NULL DEFAULT 'operador',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Create areas table
CREATE TABLE public.areas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nome TEXT NOT NULL,
  tipo TEXT NOT NULL DEFAULT 'normal' CHECK (tipo IN ('normal', 'group')),
  ordem INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.areas ENABLE ROW LEVEL SECURITY;

-- Create subareas table
CREATE TABLE public.subareas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  area_id UUID NOT NULL REFERENCES public.areas(id) ON DELETE CASCADE,
  nome TEXT NOT NULL,
  ordem INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.subareas ENABLE ROW LEVEL SECURITY;

-- Create status_logs table
CREATE TABLE public.status_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  area_id UUID NOT NULL REFERENCES public.areas(id) ON DELETE CASCADE,
  subarea_id UUID REFERENCES public.subareas(id) ON DELETE CASCADE,
  status status_type NOT NULL DEFAULT 'gray',
  observacao TEXT,
  usuario_id UUID NOT NULL REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.status_logs ENABLE ROW LEVEL SECURITY;

-- Create SLA schedule table for WhatsApp checks
CREATE TABLE public.sla_schedules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  area_id UUID NOT NULL REFERENCES public.areas(id) ON DELETE CASCADE,
  check_time TIME NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.sla_schedules ENABLE ROW LEVEL SECURITY;

-- Security definer function to check roles
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = _user_id AND role = _role
  )
$$;

-- RLS Policies for profiles
CREATE POLICY "Users can view all profiles" ON public.profiles
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Users can update own profile" ON public.profiles
  FOR UPDATE TO authenticated USING (id = auth.uid());

CREATE POLICY "Anyone can insert profiles" ON public.profiles
  FOR INSERT WITH CHECK (true);

-- RLS Policies for areas
CREATE POLICY "Anyone can view areas" ON public.areas
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Admins can insert areas" ON public.areas
  FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update areas" ON public.areas
  FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete areas" ON public.areas
  FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- RLS Policies for subareas
CREATE POLICY "Anyone can view subareas" ON public.subareas
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Admins can insert subareas" ON public.subareas
  FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update subareas" ON public.subareas
  FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete subareas" ON public.subareas
  FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- RLS Policies for status_logs
CREATE POLICY "Anyone can view status_logs" ON public.status_logs
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated users can insert status_logs" ON public.status_logs
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = usuario_id);

-- RLS Policies for sla_schedules
CREATE POLICY "Anyone can view sla_schedules" ON public.sla_schedules
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Admins can insert sla_schedules" ON public.sla_schedules
  FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update sla_schedules" ON public.sla_schedules
  FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete sla_schedules" ON public.sla_schedules
  FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- Trigger to create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, nome, email, role)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'nome', split_part(NEW.email, '@', 1)),
    NEW.email,
    COALESCE((NEW.raw_user_meta_data->>'role')::app_role, 'operador')
  );
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Enable realtime on status_logs
ALTER PUBLICATION supabase_realtime ADD TABLE public.status_logs;
