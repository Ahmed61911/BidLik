
CREATE OR REPLACE FUNCTION public.update_my_profile(
  p_nom text DEFAULT NULL,
  p_telephone text DEFAULT NULL,
  p_ville text DEFAULT NULL
) RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Connexion requise';
  END IF;
  UPDATE public.profiles
    SET nom = COALESCE(NULLIF(trim(p_nom), ''), nom),
        telephone = CASE WHEN p_telephone IS NULL THEN telephone ELSE NULLIF(trim(p_telephone), '') END,
        ville = CASE WHEN p_ville IS NULL THEN ville ELSE NULLIF(trim(p_ville), '') END,
        updated_at = now()
    WHERE user_id = auth.uid();
END $$;

REVOKE ALL ON FUNCTION public.update_my_profile(text, text, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.update_my_profile(text, text, text) TO authenticated;
