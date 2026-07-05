DO $$
DECLARE col text;
BEGIN
  FOREACH col IN ARRAY ARRAY[
    'id','type','body_type','marque','modele','finition','transmission','carburant',
    'annee','kilometrage','couleur_exterieur','couleur_interieur','note_expert',
    'nombre_cles','opposition','main_levee','puissance_fiscale','carte_grise_barree',
    'procuration','date_vente','status','payment_status','delivery_status',
    'prix_attendu','images','created_at','updated_at'
  ] LOOP
    EXECUTE format('GRANT SELECT (%I) ON public.cars TO anon, authenticated', col);
  END LOOP;
END $$;

-- Safe columns for insert/update by owner (RLS still enforces WHERE clause)
GRANT INSERT, UPDATE, DELETE ON public.cars TO authenticated;
GRANT ALL ON public.cars TO service_role;