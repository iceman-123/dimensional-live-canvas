-- Browser push subscriptions (one per device/browser). Managed only by server code.
CREATE TABLE public.push_subscriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  endpoint text NOT NULL UNIQUE,
  p256dh text NOT NULL,
  auth text NOT NULL,
  user_id uuid,
  wants_results boolean NOT NULL DEFAULT true,
  wants_announcements boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT ALL ON public.push_subscriptions TO service_role;
ALTER TABLE public.push_subscriptions ENABLE ROW LEVEL SECURITY;
CREATE TRIGGER push_subscriptions_touch BEFORE UPDATE ON public.push_subscriptions
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- The app's own push signing key pair (created by the server on first use).
CREATE TABLE public.push_keys (
  id integer PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  public_key text NOT NULL,
  private_jwk jsonb NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT ALL ON public.push_keys TO service_role;
ALTER TABLE public.push_keys ENABLE ROW LEVEL SECURITY;

-- Which notifications were already sent, so each result goes out once.
CREATE TABLE public.push_sent (
  key text PRIMARY KEY,
  sent_at timestamptz NOT NULL DEFAULT now()
);
GRANT ALL ON public.push_sent TO service_role;
ALTER TABLE public.push_sent ENABLE ROW LEVEL SECURITY;