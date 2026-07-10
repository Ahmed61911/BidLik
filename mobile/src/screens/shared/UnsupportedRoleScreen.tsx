import { ScreenPlaceholder } from "@/components/ScreenPlaceholder";

/** Shown when an authenticated account has neither the acheteur nor vendeur role (e.g. admin/expert-only). */
export function UnsupportedRoleScreen() {
  return (
    <ScreenPlaceholder
      title="Compte non pris en charge"
      subtitle="Ce compte n'a pas de rôle Acheteur ou Vendeur. Utilisez la plateforme web Bidlik pour y accéder."
    />
  );
}
