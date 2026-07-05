
-- ============ ENUMS ============
CREATE TYPE public.app_role AS ENUM ('acheteur','vendeur','expert','admin');
CREATE TYPE public.car_status AS ENUM ('open','en_cours','en_attente_validation','vendu_validee','vendu_annulee');
CREATE TYPE public.payment_status_t AS ENUM ('non_paye','paye');
CREATE TYPE public.delivery_status_t AS ENUM ('non_livre','livre');
CREATE TYPE public.car_type_t AS ENUM ('loueur','entreprise','particulier');
CREATE TYPE public.procuration_t AS ENUM ('procuration','carton_ouvert','carton_ferme');
CREATE TYPE public.transmission_t AS ENUM ('manuelle','automatique');
CREATE TYPE public.carburant_t AS ENUM ('essence','diesel','hybride','electrique');
CREATE TYPE public.auction_type_t AS ENUM ('ouverte','fermee');
CREATE TYPE public.auction_status_t AS ENUM ('scheduled','live','closed','validated','cancelled');
CREATE TYPE public.auction_visibility_t AS ENUM ('ouvert','ferme');
CREATE TYPE public.offer_status_t AS ENUM ('active','winning','rejected');

-- ============ UTILITY: updated_at ============
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;

-- ============ PROFILES ============
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  nom TEXT NOT NULL DEFAULT '',
  email TEXT,
  telephone TEXT,
  caution_validee BOOLEAN NOT NULL DEFAULT false,
  avatar_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.profiles TO anon, authenticated;
GRANT INSERT, UPDATE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "profiles_select_all" ON public.profiles FOR SELECT USING (true);
CREATE POLICY "profiles_update_own" ON public.profiles FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "profiles_insert_own" ON public.profiles FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE TRIGGER profiles_set_updated_at BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ============ USER ROLES ============
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.app_role NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);
GRANT SELECT ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role public.app_role)
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role)
$$;

CREATE POLICY "user_roles_select_own_or_admin" ON public.user_roles
  FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "user_roles_admin_all" ON public.user_roles
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- ============ AUCTION EVENTS ============
CREATE TABLE public.auction_events (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  starts_at TIMESTAMPTZ NOT NULL,
  ends_at TIMESTAMPTZ NOT NULL,
  status public.auction_status_t NOT NULL DEFAULT 'scheduled',
  visibility public.auction_visibility_t NOT NULL DEFAULT 'ouvert',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.auction_events TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.auction_events TO authenticated;
GRANT ALL ON public.auction_events TO service_role;
ALTER TABLE public.auction_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "events_select_all" ON public.auction_events FOR SELECT USING (true);
CREATE POLICY "events_admin_write" ON public.auction_events FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE TRIGGER events_set_updated_at BEFORE UPDATE ON public.auction_events
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ============ CARS ============
CREATE TABLE public.cars (
  id TEXT PRIMARY KEY,
  vendeur_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  vendeur_nom TEXT NOT NULL DEFAULT '',
  type public.car_type_t NOT NULL DEFAULT 'particulier',
  marque TEXT NOT NULL,
  modele TEXT NOT NULL,
  finition TEXT NOT NULL DEFAULT '',
  transmission public.transmission_t NOT NULL DEFAULT 'automatique',
  carburant public.carburant_t NOT NULL DEFAULT 'diesel',
  annee INT NOT NULL,
  kilometrage INT NOT NULL DEFAULT 0,
  couleur_exterieur TEXT NOT NULL DEFAULT '',
  couleur_interieur TEXT NOT NULL DEFAULT '',
  note_expert INT,
  nombre_cles INT NOT NULL DEFAULT 2,
  opposition BOOLEAN NOT NULL DEFAULT false,
  main_levee BOOLEAN NOT NULL DEFAULT true,
  puissance_fiscale INT NOT NULL DEFAULT 8,
  carte_grise_barree BOOLEAN NOT NULL DEFAULT false,
  procuration public.procuration_t NOT NULL DEFAULT 'procuration',
  date_vente TIMESTAMPTZ,
  status public.car_status NOT NULL DEFAULT 'open',
  payment_status public.payment_status_t NOT NULL DEFAULT 'non_paye',
  delivery_status public.delivery_status_t NOT NULL DEFAULT 'non_livre',
  prix_attendu INT NOT NULL DEFAULT 0,
  minimum_accepted_price INT,
  images JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.cars TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.cars TO authenticated;
GRANT ALL ON public.cars TO service_role;
ALTER TABLE public.cars ENABLE ROW LEVEL SECURITY;
CREATE POLICY "cars_insert_seller" ON public.cars FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = vendeur_id OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "cars_delete_admin" ON public.cars FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));
CREATE TRIGGER cars_set_updated_at BEFORE UPDATE ON public.cars
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ============ AUCTIONS ============
CREATE TABLE public.auctions (
  id TEXT PRIMARY KEY,
  car_id TEXT NOT NULL REFERENCES public.cars(id) ON DELETE CASCADE,
  event_id TEXT REFERENCES public.auction_events(id) ON DELETE SET NULL,
  starts_at TIMESTAMPTZ NOT NULL,
  ends_at TIMESTAMPTZ NOT NULL,
  starting_price INT NOT NULL,
  current_price INT NOT NULL,
  bid_count INT NOT NULL DEFAULT 0,
  status public.auction_status_t NOT NULL DEFAULT 'scheduled',
  visibility public.auction_visibility_t NOT NULL DEFAULT 'ouvert',
  auction_type public.auction_type_t NOT NULL DEFAULT 'ouverte',
  top_bidder_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  closed_at TIMESTAMPTZ,
  admin_validation_deadline TIMESTAMPTZ,
  validated_at TIMESTAMPTZ,
  payment_deadline TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_auctions_event ON public.auctions(event_id);
CREATE INDEX idx_auctions_status ON public.auctions(status);
GRANT INSERT, UPDATE, DELETE ON public.auctions TO authenticated;
GRANT ALL ON public.auctions TO service_role;
ALTER TABLE public.auctions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "auctions_admin_write" ON public.auctions FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY auctions_select_authenticated ON public.auctions
  FOR SELECT TO authenticated USING (true);
CREATE POLICY auctions_select_anon ON public.auctions
  FOR SELECT TO anon USING (true);
CREATE TRIGGER auctions_set_updated_at BEFORE UPDATE ON public.auctions
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ============ BIDS ============
CREATE TABLE public.bids (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  auction_id TEXT NOT NULL REFERENCES public.auctions(id) ON DELETE CASCADE,
  car_id TEXT NOT NULL,
  bidder_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  bidder_name TEXT NOT NULL DEFAULT 'Anonyme',
  amount INT NOT NULL,
  is_auto BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_bids_auction ON public.bids(auction_id, created_at DESC);
CREATE INDEX idx_bids_bidder ON public.bids(bidder_id);
GRANT INSERT, UPDATE, DELETE ON public.bids TO authenticated;
GRANT ALL ON public.bids TO service_role;
ALTER TABLE public.bids ENABLE ROW LEVEL SECURITY;
CREATE POLICY bids_select_own_or_admin ON public.bids
  FOR SELECT TO authenticated
  USING (bidder_id = auth.uid() OR public.has_role(auth.uid(), 'admin'::app_role));

-- ============ OFFERS (sealed) ============
CREATE TABLE public.offers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  auction_id TEXT NOT NULL REFERENCES public.auctions(id) ON DELETE CASCADE,
  car_id TEXT NOT NULL,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  user_name TEXT NOT NULL DEFAULT 'Anonyme',
  amount INT NOT NULL,
  status public.offer_status_t NOT NULL DEFAULT 'active',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (auction_id, user_id)
);
CREATE INDEX idx_offers_auction ON public.offers(auction_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.offers TO authenticated;
GRANT ALL ON public.offers TO service_role;
ALTER TABLE public.offers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "offers_select_own_or_admin" ON public.offers FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));
CREATE TRIGGER offers_set_updated_at BEFORE UPDATE ON public.offers
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ============ PROFILES extras ============
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS actif boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS ville text,
  ADD COLUMN IF NOT EXISTS caution_montant integer NOT NULL DEFAULT 0;

-- ============ EXPERT ASSIGNMENTS ============
CREATE TYPE public.expert_assignment_status_t AS ENUM ('non_assigne','en_inspection','rapport_recu');

CREATE TABLE public.expert_assignments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  car_id text NOT NULL UNIQUE,
  expert_id uuid,
  status public.expert_assignment_status_t NOT NULL DEFAULT 'non_assigne',
  assigne_le timestamptz,
  rapport_recu_le timestamptz,
  note_finale integer,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.expert_assignments TO authenticated;
GRANT ALL ON public.expert_assignments TO service_role;
ALTER TABLE public.expert_assignments ENABLE ROW LEVEL SECURITY;
CREATE POLICY ea_select_admin_or_assignee ON public.expert_assignments
  FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::public.app_role) OR expert_id = auth.uid());
CREATE POLICY ea_admin_write ON public.expert_assignments
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin'))
  WITH CHECK (public.has_role(auth.uid(),'admin'));
CREATE TRIGGER trg_ea_updated_at
  BEFORE UPDATE ON public.expert_assignments
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE OR REPLACE FUNCTION public.ensure_expert_assignment()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.expert_assignments (car_id) VALUES (NEW.id)
  ON CONFLICT (car_id) DO NOTHING;
  RETURN NEW;
END $$;

CREATE TRIGGER trg_cars_ensure_assignment
  AFTER INSERT ON public.cars
  FOR EACH ROW EXECUTE FUNCTION public.ensure_expert_assignment();

-- ============ NOTIFICATIONS ============
CREATE TYPE public.notif_type_t AS ENUM ('outbid','won','lost','ending_soon','caution','system');

CREATE TABLE public.notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  type public.notif_type_t NOT NULL,
  titre TEXT NOT NULL,
  message TEXT NOT NULL,
  auction_id TEXT,
  read BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_notifications_user_created ON public.notifications(user_id, created_at DESC);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.notifications TO authenticated;
GRANT ALL ON public.notifications TO service_role;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
CREATE POLICY notifications_select_own ON public.notifications
  FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY notifications_update_own ON public.notifications
  FOR UPDATE TO authenticated USING (user_id = auth.uid());
CREATE POLICY notifications_delete_own ON public.notifications
  FOR DELETE TO authenticated USING (user_id = auth.uid());

-- ============ PAYMENTS ============
CREATE TABLE public.payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  auction_id TEXT,
  car_id TEXT,
  type TEXT NOT NULL CHECK (type IN ('caution','achat','remboursement','commission','virement_vendeur')),
  amount INTEGER NOT NULL,
  status TEXT NOT NULL DEFAULT 'en_attente' CHECK (status IN ('en_attente','paye','rembourse','annule')),
  reference TEXT,
  proof_url text,
  proof_name text,
  notes text,
  recorded_by uuid,
  paid_at timestamptz,
  payment_method text,
  bank text,
  due_date date,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.payments TO authenticated;
GRANT ALL ON public.payments TO service_role;
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "payments_select_own_or_admin"
ON public.payments FOR SELECT TO authenticated
USING (user_id = auth.uid() OR public.has_role(auth.uid(),'admin'));
CREATE POLICY "payments_admin_write"
ON public.payments FOR ALL TO authenticated
USING (public.has_role(auth.uid(),'admin'))
WITH CHECK (public.has_role(auth.uid(),'admin'));
CREATE TRIGGER trg_payments_updated_at
BEFORE UPDATE ON public.payments
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE INDEX idx_payments_user ON public.payments(user_id);
CREATE INDEX idx_payments_auction ON public.payments(auction_id);

-- ============ COLUMN-LEVEL anon restrictions ============
REVOKE SELECT ON public.cars FROM anon;
GRANT SELECT (
  id, type, marque, modele, finition, transmission, carburant, annee, kilometrage,
  couleur_exterieur, couleur_interieur, note_expert, nombre_cles, puissance_fiscale,
  images, status, created_at, updated_at, prix_attendu
) ON public.cars TO anon;
CREATE POLICY cars_select_authenticated ON public.cars
  FOR SELECT TO authenticated USING (true);
CREATE POLICY cars_select_anon ON public.cars FOR SELECT TO anon USING (true);
CREATE POLICY "cars_update_owner_or_admin" ON public.cars FOR UPDATE TO authenticated
  USING (auth.uid() = vendeur_id OR public.has_role(auth.uid(), 'admin'))
  WITH CHECK (auth.uid() = vendeur_id OR public.has_role(auth.uid(), 'admin'));

REVOKE SELECT ON public.auctions FROM anon;
GRANT SELECT (
  id, car_id, event_id, starts_at, ends_at, starting_price, current_price,
  bid_count, status, visibility, auction_type, created_at, updated_at
) ON public.auctions TO anon;

-- ============ PROFILES: column-level + RPCs ============
REVOKE SELECT ON public.profiles FROM authenticated;
GRANT SELECT
  (id, user_id, nom, avatar_url, ville, caution_validee, caution_montant, actif, created_at, updated_at)
  ON public.profiles TO authenticated;
GRANT INSERT, UPDATE, DELETE ON public.profiles TO authenticated;
DROP POLICY IF EXISTS profiles_select_all ON public.profiles;
CREATE POLICY profiles_select_own_or_admin ON public.profiles
  FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'::public.app_role));

CREATE OR REPLACE FUNCTION public.get_my_profile()
RETURNS TABLE (
  user_id UUID, nom TEXT, email TEXT, telephone TEXT, ville TEXT,
  avatar_url TEXT, caution_validee BOOLEAN, caution_montant INT
)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT user_id, nom, email, telephone, ville, avatar_url, caution_validee, caution_montant
  FROM public.profiles WHERE user_id = auth.uid();
$$;

CREATE OR REPLACE FUNCTION public.admin_list_profiles()
RETURNS TABLE (
  user_id UUID, nom TEXT, email TEXT, telephone TEXT,
  actif BOOLEAN, caution_validee BOOLEAN, caution_montant INT, created_at TIMESTAMPTZ
)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT public.has_role(auth.uid(),'admin') THEN
    RAISE EXCEPTION 'Réservé aux administrateurs';
  END IF;
  RETURN QUERY
    SELECT p.user_id, p.nom, p.email, p.telephone, p.actif, p.caution_validee, p.caution_montant, p.created_at
    FROM public.profiles p ORDER BY p.created_at DESC;
END $$;

CREATE OR REPLACE FUNCTION public.admin_get_profile(p_user_id UUID)
RETURNS TABLE (
  user_id UUID, nom TEXT, email TEXT, telephone TEXT,
  actif BOOLEAN, caution_validee BOOLEAN, caution_montant INT, ville TEXT, avatar_url TEXT
)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT public.has_role(auth.uid(),'admin') THEN
    RAISE EXCEPTION 'Réservé aux administrateurs';
  END IF;
  RETURN QUERY
    SELECT p.user_id, p.nom, p.email, p.telephone, p.actif, p.caution_validee, p.caution_montant, p.ville, p.avatar_url
    FROM public.profiles p WHERE p.user_id = p_user_id;
END $$;

CREATE OR REPLACE FUNCTION public.admin_set_user_active(p_user_id uuid, p_actif boolean)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT public.has_role(auth.uid(),'admin') THEN
    RAISE EXCEPTION 'Réservé aux administrateurs';
  END IF;
  UPDATE public.profiles SET actif = p_actif WHERE user_id = p_user_id;
END $$;

-- ============ NEW USER HANDLER ============
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_role public.app_role;
  v_actif boolean;
BEGIN
  v_role := COALESCE((NEW.raw_user_meta_data->>'role')::public.app_role, 'acheteur');
  v_actif := COALESCE((NEW.raw_user_meta_data->>'actif')::boolean, false);

  INSERT INTO public.profiles (user_id, nom, email, telephone, actif)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'nom', split_part(NEW.email, '@', 1)),
    NEW.email,
    NEW.raw_user_meta_data->>'telephone',
    v_actif
  )
  ON CONFLICT (user_id) DO NOTHING;

  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, v_role)
  ON CONFLICT DO NOTHING;

  RETURN NEW;
END; $$;

CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

CREATE OR REPLACE FUNCTION public.admin_list_pending_users()
 RETURNS TABLE(user_id uuid, nom text, email text, telephone text, role app_role, created_at timestamptz)
 LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $$
BEGIN
  IF NOT public.has_role(auth.uid(),'admin') THEN
    RAISE EXCEPTION 'Réservé aux administrateurs';
  END IF;
  RETURN QUERY
    SELECT p.user_id, p.nom, p.email, p.telephone,
           (SELECT r.role FROM public.user_roles r WHERE r.user_id = p.user_id ORDER BY r.role LIMIT 1) AS role,
           p.created_at
    FROM public.profiles p WHERE p.actif = false ORDER BY p.created_at DESC;
END $$;

CREATE OR REPLACE FUNCTION public.is_my_account_active()
 RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $$
  SELECT COALESCE((SELECT actif FROM public.profiles WHERE user_id = auth.uid()), false);
$$;

-- ============ PLACE BID with anti-snipe ============
CREATE OR REPLACE FUNCTION public.place_bid(
  p_auction_id TEXT, p_amount INT, p_is_auto BOOLEAN DEFAULT false
)
RETURNS public.bids LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_auction public.auctions;
  v_user UUID := auth.uid();
  v_name TEXT;
  v_bid public.bids;
  v_new_end TIMESTAMPTZ;
BEGIN
  IF v_user IS NULL THEN RAISE EXCEPTION 'Vous devez être connecté pour enchérir.'; END IF;
  SELECT * INTO v_auction FROM public.auctions WHERE id = p_auction_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Enchère introuvable'; END IF;
  IF v_auction.auction_type = 'fermee' THEN
    RAISE EXCEPTION 'Cette enchère est à enveloppe fermée. Soumettez une offre confidentielle.';
  END IF;
  IF v_auction.status = 'scheduled' AND v_auction.starts_at <= now() THEN
    UPDATE public.auctions SET status = 'live' WHERE id = p_auction_id;
    v_auction.status := 'live';
  END IF;
  IF v_auction.status <> 'live' THEN RAISE EXCEPTION 'Cette enchère n''est plus active'; END IF;
  IF v_auction.ends_at <= now() THEN
    UPDATE public.auctions SET status = 'closed' WHERE id = p_auction_id;
    RAISE EXCEPTION 'L''enchère est terminée';
  END IF;
  IF p_amount <= v_auction.current_price THEN
    RAISE EXCEPTION 'Votre offre doit dépasser % DH', v_auction.current_price;
  END IF;
  SELECT nom INTO v_name FROM public.profiles WHERE user_id = v_user;
  INSERT INTO public.bids (auction_id, car_id, bidder_id, bidder_name, amount, is_auto)
  VALUES (p_auction_id, v_auction.car_id, v_user, COALESCE(NULLIF(v_name,''),'Anonyme'), p_amount, p_is_auto)
  RETURNING * INTO v_bid;

  IF v_auction.ends_at - now() <= INTERVAL '2 minutes' THEN
    v_new_end := now() + INTERVAL '2 minutes';
  ELSE
    v_new_end := v_auction.ends_at;
  END IF;

  UPDATE public.auctions
  SET current_price = p_amount, bid_count = bid_count + 1,
      top_bidder_id = v_user, ends_at = v_new_end
  WHERE id = p_auction_id;
  RETURN v_bid;
END; $$;

-- ============ SUBMIT OFFER ============
CREATE OR REPLACE FUNCTION public.submit_offer(p_auction_id TEXT, p_amount INT)
RETURNS public.offers LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_auction public.auctions;
  v_car public.cars;
  v_user UUID := auth.uid();
  v_name TEXT;
  v_offer public.offers;
  v_min INT;
  v_count INT;
BEGIN
  IF v_user IS NULL THEN RAISE EXCEPTION 'Vous devez être connecté pour soumettre une offre.'; END IF;
  SELECT * INTO v_auction FROM public.auctions WHERE id = p_auction_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Enchère introuvable'; END IF;
  IF v_auction.auction_type <> 'fermee' THEN
    RAISE EXCEPTION 'Cette enchère n''accepte pas d''offres confidentielles.';
  END IF;
  IF v_auction.status = 'scheduled' AND v_auction.starts_at <= now() THEN
    UPDATE public.auctions SET status = 'live' WHERE id = p_auction_id;
    v_auction.status := 'live';
  END IF;
  IF v_auction.status <> 'live' THEN RAISE EXCEPTION 'Cette enchère n''est plus active'; END IF;
  IF v_auction.ends_at <= now() THEN RAISE EXCEPTION 'L''enchère est terminée'; END IF;
  SELECT * INTO v_car FROM public.cars WHERE id = v_auction.car_id;
  v_min := COALESCE(v_car.minimum_accepted_price, v_auction.starting_price);
  IF NOT (p_amount > v_min) THEN
    RAISE EXCEPTION 'Votre offre doit être strictement supérieure à % DH', v_min;
  END IF;
  SELECT nom INTO v_name FROM public.profiles WHERE user_id = v_user;
  INSERT INTO public.offers (auction_id, car_id, user_id, user_name, amount)
  VALUES (p_auction_id, v_auction.car_id, v_user, COALESCE(NULLIF(v_name,''),'Anonyme'), p_amount)
  ON CONFLICT (auction_id, user_id) DO UPDATE
    SET amount = EXCLUDED.amount, updated_at = now()
  RETURNING * INTO v_offer;
  SELECT COUNT(*) INTO v_count FROM public.offers WHERE auction_id = p_auction_id;
  UPDATE public.auctions SET bid_count = v_count WHERE id = p_auction_id;
  RETURN v_offer;
END; $$;

-- ============ ADMIN/EXPERT RPCs ============
CREATE OR REPLACE FUNCTION public.assign_expert(p_car_id text, p_expert_id uuid)
RETURNS public.expert_assignments LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE r public.expert_assignments;
BEGIN
  IF NOT public.has_role(auth.uid(),'admin') THEN RAISE EXCEPTION 'Réservé aux administrateurs'; END IF;
  IF NOT public.has_role(p_expert_id,'expert') THEN RAISE EXCEPTION 'Cet utilisateur n''est pas un expert'; END IF;
  INSERT INTO public.expert_assignments (car_id, expert_id, status, assigne_le)
  VALUES (p_car_id, p_expert_id, 'en_inspection', now())
  ON CONFLICT (car_id) DO UPDATE
    SET expert_id = EXCLUDED.expert_id, status = 'en_inspection',
        assigne_le = now(), rapport_recu_le = NULL, note_finale = NULL
  RETURNING * INTO r;
  RETURN r;
END $$;

CREATE OR REPLACE FUNCTION public.submit_expert_report(p_car_id text, p_note integer)
RETURNS public.expert_assignments LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE r public.expert_assignments;
BEGIN
  IF NOT public.has_role(auth.uid(),'expert') AND NOT public.has_role(auth.uid(),'admin') THEN
    RAISE EXCEPTION 'Réservé aux experts';
  END IF;
  IF p_note < 0 OR p_note > 10 THEN RAISE EXCEPTION 'La note doit être entre 0 et 10'; END IF;
  UPDATE public.expert_assignments
    SET status = 'rapport_recu', note_finale = p_note, rapport_recu_le = now()
    WHERE car_id = p_car_id RETURNING * INTO r;
  IF r IS NULL THEN RAISE EXCEPTION 'Assignation introuvable'; END IF;
  UPDATE public.cars SET note_expert = p_note WHERE id = p_car_id;
  RETURN r;
END $$;

-- ============ AUCTION CLOSURE STAMP + VALIDATE ============
CREATE OR REPLACE FUNCTION public.stamp_auction_closure()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.status = 'closed' AND (OLD.status IS DISTINCT FROM 'closed') AND NEW.closed_at IS NULL THEN
    NEW.closed_at := now();
    NEW.admin_validation_deadline := now() + INTERVAL '24 hours';
  END IF;
  RETURN NEW;
END $$;

CREATE TRIGGER trg_stamp_auction_closure
  BEFORE UPDATE OF status ON public.auctions
  FOR EACH ROW EXECUTE FUNCTION public.stamp_auction_closure();

CREATE OR REPLACE FUNCTION public.validate_auction(p_auction_id text, p_decision text)
RETURNS public.auctions LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v public.auctions;
  v_car public.cars;
  v_new_status public.auction_status_t;
  v_car_status public.car_status;
BEGIN
  IF NOT public.has_role(auth.uid(),'admin') THEN RAISE EXCEPTION 'Réservé aux administrateurs'; END IF;
  IF p_decision NOT IN ('validee','annulee') THEN RAISE EXCEPTION 'Décision invalide'; END IF;
  SELECT * INTO v FROM public.auctions WHERE id = p_auction_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Enchère introuvable'; END IF;
  IF v.status <> 'closed' THEN RAISE EXCEPTION 'Seules les enchères clôturées peuvent être validées'; END IF;
  SELECT * INTO v_car FROM public.cars WHERE id = v.car_id;
  IF p_decision = 'validee' THEN
    v_new_status := 'validated'; v_car_status := 'vendu_validee';
    UPDATE public.auctions
       SET status = v_new_status, validated_at = now(),
           payment_deadline = now() + INTERVAL '48 hours', updated_at = now()
     WHERE id = p_auction_id RETURNING * INTO v;
    IF v.top_bidder_id IS NOT NULL THEN
      INSERT INTO public.notifications (user_id, type, titre, message, auction_id)
      VALUES (v.top_bidder_id, 'system', 'Paiement requis sous 48h',
        'Votre achat ' || COALESCE(v_car.marque,'') || ' ' || COALESCE(v_car.modele,'')
          || ' (' || v.current_price || ' DH) est validé. Réglez et téléversez votre justificatif sous 48h.',
        v.id);
    END IF;
  ELSE
    v_new_status := 'cancelled'; v_car_status := 'vendu_annulee';
    UPDATE public.auctions SET status = v_new_status, updated_at = now()
      WHERE id = p_auction_id RETURNING * INTO v;
  END IF;
  UPDATE public.cars SET status = v_car_status,
    date_vente = CASE WHEN p_decision = 'validee' THEN now() ELSE date_vente END
    WHERE id = v.car_id;
  RETURN v;
END $$;

-- ============ TICK AUCTIONS w/ deadline auto-cancel ============
CREATE OR REPLACE FUNCTION public.tick_auctions()
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  r RECORD;
  v_car public.cars;
BEGIN
  UPDATE public.auctions SET status = 'live'
   WHERE status = 'scheduled' AND starts_at <= now();
  UPDATE public.auctions SET status = 'closed'
   WHERE status = 'live' AND ends_at <= now();
  UPDATE public.auction_events SET status = 'live'
   WHERE status = 'scheduled' AND starts_at <= now();
  UPDATE public.auction_events SET status = 'closed'
   WHERE status = 'live' AND ends_at <= now();

  FOR r IN
    SELECT * FROM public.auctions
    WHERE status = 'closed' AND admin_validation_deadline IS NOT NULL
      AND admin_validation_deadline <= now()
  LOOP
    UPDATE public.auctions SET status = 'cancelled', updated_at = now() WHERE id = r.id;
    UPDATE public.cars SET status = 'vendu_annulee' WHERE id = r.car_id;
    SELECT * INTO v_car FROM public.cars WHERE id = r.car_id;
    IF r.top_bidder_id IS NOT NULL THEN
      INSERT INTO public.notifications (user_id, type, titre, message, auction_id)
      VALUES (r.top_bidder_id, 'system', 'Enchère annulée automatiquement',
        'L''administrateur n''a pas validé sous 24h votre achat ' || COALESCE(v_car.marque,'') || ' ' || COALESCE(v_car.modele,'') || '.',
        r.id);
    END IF;
  END LOOP;

  FOR r IN
    SELECT a.* FROM public.auctions a
    WHERE a.status = 'validated' AND a.payment_deadline IS NOT NULL
      AND a.payment_deadline <= now()
      AND NOT EXISTS (
        SELECT 1 FROM public.payments p
        WHERE p.auction_id = a.id AND p.type = 'achat' AND p.status = 'paye')
  LOOP
    UPDATE public.auctions SET status = 'cancelled', updated_at = now() WHERE id = r.id;
    UPDATE public.cars SET status = 'vendu_annulee' WHERE id = r.car_id;
    SELECT * INTO v_car FROM public.cars WHERE id = r.car_id;
    IF r.top_bidder_id IS NOT NULL THEN
      INSERT INTO public.notifications (user_id, type, titre, message, auction_id)
      VALUES (r.top_bidder_id, 'system', 'Délai de paiement dépassé',
        'Le délai de 48h pour régler ' || COALESCE(v_car.marque,'') || ' ' || COALESCE(v_car.modele,'') || ' est dépassé. La vente est annulée.',
        r.id);
    END IF;
  END LOOP;
END $$;

-- ============ NOTIFICATIONS TRIGGERS ============
CREATE OR REPLACE FUNCTION public.notify_on_bid()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_prev_leader UUID; v_car public.cars;
BEGIN
  SELECT top_bidder_id INTO v_prev_leader FROM public.auctions WHERE id = NEW.auction_id;
  IF v_prev_leader IS NOT NULL AND v_prev_leader <> NEW.bidder_id THEN
    SELECT * INTO v_car FROM public.cars WHERE id = NEW.car_id;
    INSERT INTO public.notifications (user_id, type, titre, message, auction_id)
    VALUES (v_prev_leader, 'outbid', 'Vous avez été surenchéri',
      COALESCE(v_car.marque,'') || ' ' || COALESCE(v_car.modele,'') || ' — nouveau prix ' || NEW.amount || ' DH',
      NEW.auction_id);
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER trg_notify_on_bid AFTER INSERT ON public.bids
FOR EACH ROW EXECUTE FUNCTION public.notify_on_bid();

CREATE OR REPLACE FUNCTION public.notify_on_auction_status()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_car public.cars; v_bidder UUID;
BEGIN
  IF NEW.status = OLD.status THEN RETURN NEW; END IF;
  SELECT * INTO v_car FROM public.cars WHERE id = NEW.car_id;
  IF NEW.status = 'closed' AND NEW.top_bidder_id IS NOT NULL THEN
    INSERT INTO public.notifications (user_id, type, titre, message, auction_id)
    VALUES (NEW.top_bidder_id, 'won', 'Vous avez remporté l''enchère !',
      COALESCE(v_car.marque,'') || ' ' || COALESCE(v_car.modele,'') || ' pour ' || NEW.current_price || ' DH. En attente de validation.',
      NEW.id);
    FOR v_bidder IN SELECT DISTINCT bidder_id FROM public.bids
      WHERE auction_id = NEW.id AND bidder_id <> NEW.top_bidder_id
    LOOP
      INSERT INTO public.notifications (user_id, type, titre, message, auction_id)
      VALUES (v_bidder, 'lost', 'Enchère terminée',
        COALESCE(v_car.marque,'') || ' ' || COALESCE(v_car.modele,'') || ' — vous n''avez pas remporté cette enchère.',
        NEW.id);
    END LOOP;
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER trg_notify_on_auction_status AFTER UPDATE OF status ON public.auctions
FOR EACH ROW EXECUTE FUNCTION public.notify_on_auction_status();

-- ============ BUYER PAYMENT + ADMIN PAYMENT RPCs ============
CREATE OR REPLACE FUNCTION public.buyer_submit_payment(
  p_auction_id text, p_amount integer, p_reference text,
  p_proof_url text, p_proof_name text, p_notes text,
  p_payment_method text DEFAULT NULL, p_bank text DEFAULT NULL, p_due_date date DEFAULT NULL
)
RETURNS public.payments LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_uid UUID := auth.uid(); v_auction public.auctions; v_car public.cars;
  v_pay public.payments; v_admin_id UUID;
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'Connexion requise'; END IF;
  SELECT * INTO v_auction FROM public.auctions WHERE id = p_auction_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'Enchère introuvable'; END IF;
  IF v_auction.status <> 'validated' THEN RAISE EXCEPTION 'Cette enchère n''est pas en attente de paiement'; END IF;
  IF v_auction.top_bidder_id IS DISTINCT FROM v_uid THEN RAISE EXCEPTION 'Vous n''êtes pas le gagnant de cette enchère'; END IF;
  IF v_auction.payment_deadline IS NOT NULL AND v_auction.payment_deadline <= now() THEN
    RAISE EXCEPTION 'Le délai de paiement (48h) est dépassé';
  END IF;
  IF p_amount IS NULL OR p_amount <= 0 THEN RAISE EXCEPTION 'Montant invalide'; END IF;
  IF p_proof_url IS NULL OR length(p_proof_url) = 0 THEN RAISE EXCEPTION 'Justificatif de paiement requis'; END IF;
  SELECT * INTO v_car FROM public.cars WHERE id = v_auction.car_id;
  SELECT * INTO v_pay FROM public.payments
    WHERE auction_id = p_auction_id AND user_id = v_uid AND type = 'achat' FOR UPDATE;
  IF v_pay.id IS NULL THEN
    INSERT INTO public.payments (
      user_id, type, amount, status, auction_id, car_id,
      reference, proof_url, proof_name, notes, paid_at, recorded_by,
      payment_method, bank, due_date
    ) VALUES (
      v_uid, 'achat', p_amount, 'en_attente', p_auction_id, v_auction.car_id,
      NULLIF(p_reference,''), p_proof_url, NULLIF(p_proof_name,''),
      NULLIF(p_notes,''), now(), v_uid,
      NULLIF(p_payment_method,''), NULLIF(p_bank,''), p_due_date
    ) RETURNING * INTO v_pay;
  ELSE
    UPDATE public.payments SET
      amount = p_amount, status = 'en_attente',
      reference = NULLIF(p_reference,''), proof_url = p_proof_url,
      proof_name = NULLIF(p_proof_name,''), notes = NULLIF(p_notes,''),
      paid_at = now(), recorded_by = v_uid,
      payment_method = NULLIF(p_payment_method,''), bank = NULLIF(p_bank,''),
      due_date = p_due_date, updated_at = now()
    WHERE id = v_pay.id RETURNING * INTO v_pay;
  END IF;
  FOR v_admin_id IN SELECT user_id FROM public.user_roles WHERE role = 'admin' LOOP
    INSERT INTO public.notifications (user_id, type, titre, message, auction_id)
    VALUES (v_admin_id, 'system', 'Justificatif de paiement reçu',
      COALESCE(v_car.marque,'') || ' ' || COALESCE(v_car.modele,'') || ' — paiement de ' || p_amount || ' DH à vérifier.',
      p_auction_id);
  END LOOP;
  RETURN v_pay;
END $$;

CREATE OR REPLACE FUNCTION public.admin_set_payment_status(p_id uuid, p_status text)
RETURNS public.payments LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v public.payments; v_car public.cars;
BEGIN
  IF NOT public.has_role(auth.uid(),'admin') THEN RAISE EXCEPTION 'Réservé aux administrateurs'; END IF;
  IF p_status NOT IN ('paye','annule','rembourse','en_attente') THEN RAISE EXCEPTION 'Statut invalide'; END IF;
  UPDATE public.payments
     SET status = p_status,
         paid_at = CASE WHEN p_status = 'paye' THEN COALESCE(paid_at, now()) ELSE paid_at END,
         updated_at = now()
   WHERE id = p_id RETURNING * INTO v;
  IF v.id IS NULL THEN RAISE EXCEPTION 'Paiement introuvable'; END IF;
  IF v.type = 'achat' AND p_status = 'paye' AND v.car_id IS NOT NULL THEN
    UPDATE public.cars SET payment_status = 'paye' WHERE id = v.car_id;
  END IF;
  SELECT * INTO v_car FROM public.cars WHERE id = v.car_id;
  IF v.type = 'achat' THEN
    INSERT INTO public.notifications (user_id, type, titre, message, auction_id)
    VALUES (v.user_id, 'system',
      CASE WHEN p_status = 'paye' THEN 'Paiement validé' ELSE 'Statut du paiement mis à jour' END,
      COALESCE(v_car.marque,'') || ' ' || COALESCE(v_car.modele,'') || ' — paiement ' || p_status || '.',
      v.auction_id);
  END IF;
  RETURN v;
END $$;

CREATE OR REPLACE FUNCTION public.admin_upsert_payment(
  p_id uuid, p_user_id uuid, p_type text, p_amount integer, p_status text,
  p_auction_id text, p_car_id text, p_reference text,
  p_proof_url text, p_proof_name text, p_notes text, p_paid_at timestamptz,
  p_payment_method text DEFAULT NULL, p_bank text DEFAULT NULL, p_due_date date DEFAULT NULL
) RETURNS public.payments LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE r public.payments;
BEGIN
  IF NOT public.has_role(auth.uid(),'admin') THEN RAISE EXCEPTION 'Réservé aux administrateurs'; END IF;
  IF p_id IS NULL THEN
    INSERT INTO public.payments (
      user_id, type, amount, status, auction_id, car_id,
      reference, proof_url, proof_name, notes, paid_at, recorded_by,
      payment_method, bank, due_date
    ) VALUES (
      p_user_id, p_type, p_amount, COALESCE(p_status,'en_attente'),
      NULLIF(p_auction_id,''), NULLIF(p_car_id,''),
      NULLIF(p_reference,''), NULLIF(p_proof_url,''), NULLIF(p_proof_name,''),
      NULLIF(p_notes,''), p_paid_at, auth.uid(),
      NULLIF(p_payment_method,''), NULLIF(p_bank,''), p_due_date
    ) RETURNING * INTO r;
  ELSE
    UPDATE public.payments SET
      user_id = COALESCE(p_user_id, user_id),
      type = COALESCE(p_type, type),
      amount = COALESCE(p_amount, amount),
      status = COALESCE(p_status, status),
      auction_id = NULLIF(p_auction_id,''), car_id = NULLIF(p_car_id,''),
      reference = NULLIF(p_reference,''), proof_url = NULLIF(p_proof_url,''),
      proof_name = NULLIF(p_proof_name,''), notes = NULLIF(p_notes,''),
      paid_at = p_paid_at, recorded_by = auth.uid(),
      payment_method = NULLIF(p_payment_method,''), bank = NULLIF(p_bank,''),
      due_date = p_due_date
    WHERE id = p_id RETURNING * INTO r;
    IF r IS NULL THEN RAISE EXCEPTION 'Paiement introuvable'; END IF;
  END IF;
  RETURN r;
END $$;

CREATE OR REPLACE FUNCTION public.admin_delete_payment(p_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT public.has_role(auth.uid(),'admin') THEN RAISE EXCEPTION 'Réservé aux administrateurs'; END IF;
  DELETE FROM public.payments WHERE id = p_id;
END $$;

CREATE OR REPLACE FUNCTION public.admin_list_payments()
RETURNS TABLE (
  id uuid, user_id uuid, user_nom text, user_email text,
  type text, amount integer, status text, auction_id text, car_id text,
  car_label text, reference text, proof_url text, proof_name text, notes text,
  paid_at timestamptz, created_at timestamptz, updated_at timestamptz,
  payment_method text, bank text, due_date date
)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT public.has_role(auth.uid(),'admin') THEN RAISE EXCEPTION 'Réservé aux administrateurs'; END IF;
  RETURN QUERY
    SELECT p.id, p.user_id, pr.nom, pr.email,
           p.type, p.amount, p.status, p.auction_id, p.car_id,
           CASE WHEN c.id IS NOT NULL
                THEN c.marque || ' ' || c.modele || ' (' || c.annee || ')'
                ELSE NULL END,
           p.reference, p.proof_url, p.proof_name, p.notes,
           p.paid_at, p.created_at, p.updated_at,
           p.payment_method, p.bank, p.due_date
    FROM public.payments p
    LEFT JOIN public.profiles pr ON pr.user_id = p.user_id
    LEFT JOIN public.cars c ON c.id = p.car_id
    ORDER BY p.created_at DESC;
END $$;

-- ============ MASKED BID HISTORY ============
CREATE OR REPLACE FUNCTION public.list_auction_bids(p_auction_id text)
RETURNS TABLE (
  id uuid, auction_id text, car_id text, amount integer, is_auto boolean,
  created_at timestamptz, bidder_name text, is_own boolean
)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT b.id, b.auction_id, b.car_id, b.amount, b.is_auto, b.created_at,
    CASE WHEN auth.uid() IS NOT NULL
      AND (b.bidder_id = auth.uid() OR public.has_role(auth.uid(), 'admin'::app_role))
      THEN b.bidder_name ELSE 'Anonyme' END AS bidder_name,
    (auth.uid() IS NOT NULL AND b.bidder_id = auth.uid()) AS is_own
  FROM public.bids b WHERE b.auction_id = p_auction_id
  ORDER BY b.created_at DESC LIMIT 200;
$$;

-- ============ EXECUTE GRANTS ============
REVOKE EXECUTE ON FUNCTION public.place_bid(text, integer, boolean) FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.submit_offer(text, integer) FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.submit_expert_report(text, integer) FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.assign_expert(text, uuid) FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.validate_auction(text, text) FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.admin_get_profile(uuid) FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.admin_set_user_active(uuid, boolean) FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.admin_list_profiles() FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.get_my_profile() FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) FROM anon, public;
GRANT EXECUTE ON FUNCTION public.place_bid(text, integer, boolean) TO authenticated;
GRANT EXECUTE ON FUNCTION public.submit_offer(text, integer) TO authenticated;
GRANT EXECUTE ON FUNCTION public.submit_expert_report(text, integer) TO authenticated;
GRANT EXECUTE ON FUNCTION public.assign_expert(text, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.validate_auction(text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_get_profile(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_set_user_active(uuid, boolean) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_list_profiles() TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_my_profile() TO authenticated;
GRANT EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) TO authenticated;
GRANT EXECUTE ON FUNCTION public.buyer_submit_payment(text,integer,text,text,text,text,text,text,date) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_upsert_payment(uuid,uuid,text,integer,text,text,text,text,text,text,text,timestamptz,text,text,date) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_list_payments() TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_set_payment_status(uuid,text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.tick_auctions() TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.list_auction_bids(text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.admin_list_pending_users() TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_my_account_active() TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_delete_payment(uuid) TO authenticated;

-- ============ REALTIME ============
ALTER PUBLICATION supabase_realtime ADD TABLE public.bids;
ALTER PUBLICATION supabase_realtime ADD TABLE public.auctions;
ALTER PUBLICATION supabase_realtime ADD TABLE public.offers;
ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;
ALTER TABLE public.bids REPLICA IDENTITY FULL;
ALTER TABLE public.auctions REPLICA IDENTITY FULL;
ALTER TABLE public.offers REPLICA IDENTITY FULL;
ALTER TABLE public.notifications REPLICA IDENTITY FULL;

-- ============ STORAGE POLICIES (buckets created via storage tool) ============
CREATE POLICY "car_images_read_auth"
ON storage.objects FOR SELECT TO authenticated
USING (bucket_id = 'car-images');

CREATE POLICY car_images_insert_owner_or_admin ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'car-images'
    AND (
      public.has_role(auth.uid(), 'admin'::public.app_role)
      OR EXISTS (
        SELECT 1 FROM public.cars c
        WHERE c.id = split_part(name, '/', 1)
          AND c.vendeur_id = auth.uid()
      )
    )
  );

CREATE POLICY "car_images_update_own"
ON storage.objects FOR UPDATE TO authenticated
USING (bucket_id = 'car-images' AND owner = auth.uid());

CREATE POLICY "car_images_delete_own"
ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'car-images' AND (owner = auth.uid() OR public.has_role(auth.uid(),'admin')));

CREATE POLICY "payment_proofs_admin_all" ON storage.objects
  FOR ALL TO authenticated
  USING (bucket_id = 'payment-proofs' AND public.has_role(auth.uid(),'admin'))
  WITH CHECK (bucket_id = 'payment-proofs' AND public.has_role(auth.uid(),'admin'));

CREATE POLICY payment_proofs_buyer_insert ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'payment-proofs'
    AND (auth.uid())::text = split_part(name, '/', 1)
    AND EXISTS (
      SELECT 1 FROM public.auctions a
      WHERE a.top_bidder_id = auth.uid()
        AND a.status IN ('validated', 'closed')
    )
  );

CREATE POLICY payment_proofs_buyer_read_own ON storage.objects
  FOR SELECT TO authenticated
  USING (
    bucket_id = 'payment-proofs'
    AND (
      has_role(auth.uid(), 'admin'::app_role)
      OR (auth.uid())::text = split_part(name, '/', 1)
    )
  );

-- ============ NEW carburant + car fields ============
ALTER TYPE public.carburant_t ADD VALUE IF NOT EXISTS 'essence_hybride';
ALTER TYPE public.carburant_t ADD VALUE IF NOT EXISTS 'diesel_hybride';
ALTER TABLE public.cars ADD COLUMN IF NOT EXISTS body_type text;
ALTER TABLE public.cars ADD COLUMN IF NOT EXISTS prix_plancher integer;
ALTER TABLE public.cars ADD COLUMN IF NOT EXISTS prix_minimum integer;
ALTER TYPE public.car_status ADD VALUE IF NOT EXISTS 'expertise';

-- ============ REALTIME gate ============
ALTER TABLE realtime.messages ENABLE ROW LEVEL SECURITY;
CREATE POLICY realtime_authenticated_only ON realtime.messages
  FOR SELECT TO authenticated
  USING (auth.uid() IS NOT NULL);

-- ============ pg_cron tick job ============
CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;
DO $$
DECLARE v_existing INT;
BEGIN
  SELECT count(*) INTO v_existing FROM cron.job WHERE jobname = 'tick-auctions-job';
  IF v_existing = 0 THEN
    PERFORM cron.schedule('tick-auctions-job', '* * * * *', $cron$ SELECT public.tick_auctions(); $cron$);
  END IF;
END $$;

-- ============ SEED DATA ============
INSERT INTO public.auction_events (id, title, starts_at, ends_at, status, visibility) VALUES
  ('0031','Vente du jour — Casablanca', now() - interval '5 hours', now() + interval '19 hours','live','ouvert'),
  ('0032','Vente programmée — Premium', now() + interval '6 hours', now() + interval '30 hours','scheduled','ouvert'),
  ('0033','Vente confidentielle — Enveloppes fermées', now() - interval '2 hours', now() + interval '22 hours','live','ferme');

INSERT INTO public.cars (id, marque, modele, finition, transmission, carburant, annee, kilometrage, couleur_exterieur, couleur_interieur, note_expert, prix_attendu, minimum_accepted_price, status) VALUES
  ('00101','Mercedes-Benz','Classe C 220d','Premium','automatique','diesel',2021,62000,'Gris graphite','Beige',9,320000,NULL,'en_cours'),
  ('00102','Renault','Clio 5 Intens','Premium','automatique','diesel',2022,38000,'Blanc nacré','Beige',8,145000,NULL,'en_cours'),
  ('00103','Dacia','Duster Prestige','Premium','automatique','diesel',2020,95000,'Bleu cosmos','Beige',7,165000,NULL,'en_cours'),
  ('00104','BMW','Série 3 320d','Premium','automatique','diesel',2019,110000,'Noir saphir','Beige',7,280000,NULL,'vendu_validee'),
  ('00105','Peugeot','208 GT Line','Premium','automatique','diesel',2021,45000,'Rouge ultimate','Beige',9,155000,NULL,'en_cours'),
  ('00106','Audi','A4 Avant 35 TDI','Premium','automatique','diesel',2022,28000,'Blanc glacier','Beige',9,380000,320000,'en_cours'),
  ('00107','BMW','Série 3 320d','Premium','automatique','diesel',2021,52000,'Noir saphir','Beige',8,295000,250000,'en_cours'),
  ('00108','Mercedes-Benz','Classe C 220d','Premium','automatique','diesel',2022,35000,'Gris sélénite','Beige',9,420000,360000,'en_cours'),
  ('00109','Volkswagen','Golf 8 GTD','Premium','automatique','diesel',2023,18000,'Bleu Atlantic','Beige',9,340000,290000,'en_cours');

INSERT INTO public.auctions (id, car_id, event_id, starts_at, ends_at, starting_price, current_price, bid_count, status, visibility, auction_type) VALUES
  ('a1','00101','0031', now() - interval '2 hours', now() + interval '22 hours', 250000, 285000, 14, 'live','ouvert','ouverte'),
  ('a2','00102','0031', now() - interval '5 hours', now() + interval '19 hours', 110000, 152000, 22, 'live','ouvert','ouverte'),
  ('a3','00103','0031', now() - interval '1 hour',  now() + interval '23 hours', 120000, 138000, 8,  'live','ouvert','ouverte'),
  ('a4','00104',NULL,   now() - interval '48 hours',now() - interval '24 hours', 200000, 295000, 31, 'validated','ouvert','ouverte'),
  ('a5','00105',NULL,   now() - interval '72 hours',now() - interval '48 hours', 110000, 148000, 18, 'closed','ouvert','ouverte'),
  ('a6','00106','0032', now() + interval '6 hours', now() + interval '30 hours', 320000, 320000, 0,  'scheduled','ouvert','fermee'),
  ('a7','00107','0033', now() - interval '2 hours', now() + interval '22 hours', 250000, 250000, 0,  'live','ferme','fermee'),
  ('a8','00108','0033', now() - interval '2 hours', now() + interval '22 hours', 360000, 360000, 0,  'live','ferme','fermee'),
  ('a9','00109','0033', now() - interval '2 hours', now() + interval '22 hours', 290000, 290000, 0,  'live','ferme','fermee');
