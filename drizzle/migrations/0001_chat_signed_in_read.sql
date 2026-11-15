DROP POLICY IF EXISTS "Anyone reads chat" ON public.chat_messages;
REVOKE SELECT ON public.chat_messages FROM anon;
CREATE POLICY "Signed-in users read chat" ON public.chat_messages FOR SELECT TO authenticated USING (auth.uid() IS NOT NULL);