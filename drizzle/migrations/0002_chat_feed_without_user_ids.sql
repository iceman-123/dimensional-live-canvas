-- Direct reads: only your own messages (admins can see all for moderation)
DROP POLICY IF EXISTS "Signed-in users read chat" ON public.chat_messages;
CREATE POLICY "Users read own chat messages" ON public.chat_messages
  FOR SELECT TO authenticated
  USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'));

-- Shared chat feed for signed-in users, without exposing other people's account ids
CREATE OR REPLACE FUNCTION public.get_chat_feed(_limit integer DEFAULT 100)
RETURNS TABLE (id uuid, author_name text, avatar_url text, body text, created_at timestamptz, is_mine boolean)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'not authenticated' USING ERRCODE = '42501';
  END IF;
  RETURN QUERY
    SELECT m.id, m.author_name, m.avatar_url, m.body, m.created_at, (m.user_id = auth.uid())
    FROM public.chat_messages m
    ORDER BY m.created_at DESC
    LIMIT least(greatest(coalesce(_limit, 100), 1), 200);
END;
$$;
REVOKE ALL ON FUNCTION public.get_chat_feed(integer) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_chat_feed(integer) TO authenticated;

-- Data-free "doorbell" so open chat screens know to refresh
CREATE OR REPLACE FUNCTION public.chat_doorbell()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  PERFORM realtime.send('{}'::jsonb, 'changed', 'chat-room', true);
  RETURN NULL;
END;
$$;
REVOKE ALL ON FUNCTION public.chat_doorbell() FROM PUBLIC, anon, authenticated;
CREATE TRIGGER chat_messages_doorbell
  AFTER INSERT OR DELETE ON public.chat_messages
  FOR EACH STATEMENT EXECUTE FUNCTION public.chat_doorbell();

CREATE POLICY "Signed-in users receive chat doorbell" ON realtime.messages
  FOR SELECT TO authenticated
  USING (realtime.topic() = 'chat-room' AND extension = 'broadcast');

-- Row changes are no longer streamed; the doorbell replaces them
ALTER PUBLICATION supabase_realtime DROP TABLE public.chat_messages;