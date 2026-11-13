-- Profiles
CREATE TABLE public.profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name text NOT NULL DEFAULT 'User',
  avatar_url text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT display_name_len CHECK (char_length(display_name) BETWEEN 1 AND 40)
);
GRANT SELECT, UPDATE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users read own profile" ON public.profiles FOR SELECT TO authenticated USING (auth.uid() = id);
CREATE POLICY "Users update own profile" ON public.profiles FOR UPDATE TO authenticated USING (auth.uid() = id) WITH CHECK (auth.uid() = id);

-- Roles
CREATE TYPE public.app_role AS ENUM ('admin', 'moderator', 'user');
CREATE TABLE public.user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role public.app_role NOT NULL,
  UNIQUE (user_id, role)
);
GRANT SELECT ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users read own roles" ON public.user_roles FOR SELECT TO authenticated USING (auth.uid() = user_id);

CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role public.app_role)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role)
$$;

-- New user: create profile, grant admin to the owner email
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  nm text;
BEGIN
  nm := left(coalesce(nullif(trim(NEW.raw_user_meta_data->>'full_name'), ''),
                      nullif(trim(NEW.raw_user_meta_data->>'name'), ''),
                      split_part(coalesce(NEW.email, 'User'), '@', 1)), 40);
  INSERT INTO public.profiles (id, display_name, avatar_url)
  VALUES (NEW.id, coalesce(nullif(nm, ''), 'User'), NEW.raw_user_meta_data->>'avatar_url')
  ON CONFLICT (id) DO NOTHING;
  IF lower(NEW.email) = 'icman5050@gmail.com' THEN
    INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'admin') ON CONFLICT DO NOTHING;
  END IF;
  RETURN NEW;
END;
$$;
CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

CREATE OR REPLACE FUNCTION public.touch_updated_at()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at := now(); RETURN NEW; END;
$$;
CREATE TRIGGER profiles_touch BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- Chat
CREATE TABLE public.chat_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid(),
  author_name text NOT NULL DEFAULT '',
  avatar_url text,
  body text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT body_len CHECK (char_length(trim(body)) BETWEEN 1 AND 500)
);
CREATE INDEX chat_messages_created_idx ON public.chat_messages (created_at DESC);
GRANT SELECT ON public.chat_messages TO anon;
GRANT SELECT, INSERT, DELETE ON public.chat_messages TO authenticated;
GRANT ALL ON public.chat_messages TO service_role;
ALTER TABLE public.chat_messages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone reads chat" ON public.chat_messages FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "Signed-in users post as themselves" ON public.chat_messages FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Owner or admin deletes" ON public.chat_messages FOR DELETE TO authenticated
  USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'));

-- Name and avatar always come from the poster's profile
CREATE OR REPLACE FUNCTION public.chat_set_author()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE p record;
BEGIN
  NEW.user_id := auth.uid();
  SELECT display_name, avatar_url INTO p FROM public.profiles WHERE id = NEW.user_id;
  NEW.author_name := coalesce(p.display_name, 'User');
  NEW.avatar_url := p.avatar_url;
  NEW.body := trim(NEW.body);
  NEW.created_at := now();
  RETURN NEW;
END;
$$;
CREATE TRIGGER chat_messages_author BEFORE INSERT ON public.chat_messages FOR EACH ROW EXECUTE FUNCTION public.chat_set_author();
ALTER PUBLICATION supabase_realtime ADD TABLE public.chat_messages;

-- Daily extras (9:30 / 2:00 Modern & Internet, lucky numbers)
CREATE TABLE public.daily_extras (
  date date PRIMARY KEY,
  modern_930 text,
  internet_930 text,
  modern_200 text,
  internet_200 text,
  gift_groups jsonb NOT NULL DEFAULT '[]'::jsonb,
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.daily_extras TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.daily_extras TO authenticated;
GRANT ALL ON public.daily_extras TO service_role;
ALTER TABLE public.daily_extras ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone reads extras" ON public.daily_extras FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "Admins insert extras" ON public.daily_extras FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins update extras" ON public.daily_extras FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins delete extras" ON public.daily_extras FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE TRIGGER daily_extras_touch BEFORE UPDATE ON public.daily_extras FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- Site settings (top announcement)
CREATE TABLE public.site_settings (
  id int PRIMARY KEY DEFAULT 1,
  ticker_text text NOT NULL DEFAULT '',
  ticker_enabled boolean NOT NULL DEFAULT true,
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT single_row CHECK (id = 1)
);
GRANT SELECT ON public.site_settings TO anon;
GRANT SELECT, UPDATE ON public.site_settings TO authenticated;
GRANT ALL ON public.site_settings TO service_role;
ALTER TABLE public.site_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone reads settings" ON public.site_settings FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "Admins update settings" ON public.site_settings FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE TRIGGER site_settings_touch BEFORE UPDATE ON public.site_settings FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
INSERT INTO public.site_settings (id, ticker_text, ticker_enabled)
VALUES (1, '2D3D ထွက်ဂဏန်းများကို အချိန်နဲ့တပြေးညီ ကြည့်ရှုနိုင်ပါပြီ', true);