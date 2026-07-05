import { createFileRoute, useRouter } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Loader2, User, KeyRound, Phone, MapPin, Save, ShieldCheck } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";

export const Route = createFileRoute("/mon-compte")({
  head: () => ({
    meta: [
      { title: "Mon compte — Bidlik" },
      { name: "description", content: "Gérez vos informations personnelles et votre mot de passe." },
    ],
  }),
  component: MonComptePage,
});

type Msg = { kind: "ok" | "err"; text: string } | null;

function MonComptePage() {
  const auth = useAuth();
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [nom, setNom] = useState("");
  const [telephone, setTelephone] = useState("");
  const [ville, setVille] = useState("");
  const [email, setEmail] = useState("");

  const [savingProfile, setSavingProfile] = useState(false);
  const [profileMsg, setProfileMsg] = useState<Msg>(null);

  const [pwd, setPwd] = useState("");
  const [pwd2, setPwd2] = useState("");
  const [savingPwd, setSavingPwd] = useState(false);
  const [pwdMsg, setPwdMsg] = useState<Msg>(null);

  useEffect(() => {
    if (auth.status === "anonymous") {
      router.navigate({ to: "/login" });
    }
  }, [auth.status, router]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data } = await supabase.rpc("get_my_profile");
      const p = Array.isArray(data) ? data[0] : null;
      if (cancelled) return;
      setNom(p?.nom ?? auth.user?.nom ?? "");
      setTelephone(p?.telephone ?? "");
      setVille(p?.ville ?? "");
      setEmail(p?.email ?? auth.user?.email ?? "");
      setLoading(false);
    })();
    return () => { cancelled = true; };
  }, [auth.user?.email, auth.user?.nom]);

  async function saveProfile(e: React.FormEvent) {
    e.preventDefault();
    setProfileMsg(null);
    setSavingProfile(true);
    const { error } = await supabase.rpc("update_my_profile", {
      p_nom: nom,
      p_telephone: telephone,
      p_ville: ville,
    });
    setSavingProfile(false);
    if (error) setProfileMsg({ kind: "err", text: error.message });
    else setProfileMsg({ kind: "ok", text: "Vos informations ont été mises à jour." });
  }

  async function savePassword(e: React.FormEvent) {
    e.preventDefault();
    setPwdMsg(null);
    if (pwd.length < 6) {
      setPwdMsg({ kind: "err", text: "Le mot de passe doit contenir au moins 6 caractères." });
      return;
    }
    if (pwd !== pwd2) {
      setPwdMsg({ kind: "err", text: "Les deux mots de passe ne correspondent pas." });
      return;
    }
    setSavingPwd(true);
    const { error } = await supabase.auth.updateUser({ password: pwd });
    setSavingPwd(false);
    if (error) {
      setPwdMsg({ kind: "err", text: error.message });
    } else {
      setPwd(""); setPwd2("");
      setPwdMsg({ kind: "ok", text: "Mot de passe mis à jour avec succès." });
    }
  }

  if (auth.status !== "authenticated" || loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const initials = (nom || email || "?")
    .split(" ")
    .map((s) => s[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase();

  return (
    <div className="bg-muted/30">
      <div className="mx-auto w-full max-w-4xl px-4 py-10 sm:py-14">
        {/* Header */}
        <div className="mb-8 flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-4">
            <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full bg-primary text-xl font-semibold text-primary-foreground shadow-sm">
              {initials}
            </div>
            <div>
              <h1 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
                Mon compte
              </h1>
              <p className="mt-1 text-sm text-muted-foreground">{email}</p>
            </div>
          </div>
        </div>

        <div className="grid gap-6 lg:grid-cols-5">
          {/* Profile */}
          <Card className="lg:col-span-3">
            <CardHeader>
              <div className="flex items-center gap-2">
                <User className="h-5 w-5 text-primary" />
                <CardTitle>Informations personnelles</CardTitle>
              </div>
              <CardDescription>
                Mettez à jour votre nom, votre téléphone et votre ville.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={saveProfile} className="space-y-5">
                <div className="space-y-2">
                  <Label htmlFor="nom">Nom complet</Label>
                  <div className="relative">
                    <User className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      id="nom"
                      type="text"
                      value={nom}
                      onChange={(e) => setNom(e.target.value)}
                      required
                      className="pl-9"
                      placeholder="Votre nom"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="tel">Téléphone</Label>
                  <div className="relative">
                    <Phone className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      id="tel"
                      type="tel"
                      value={telephone}
                      onChange={(e) => setTelephone(e.target.value)}
                      placeholder="+212 6 12 34 56 78"
                      className="pl-9"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="ville">Ville</Label>
                  <div className="relative">
                    <MapPin className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      id="ville"
                      type="text"
                      value={ville}
                      onChange={(e) => setVille(e.target.value)}
                      className="pl-9"
                      placeholder="Casablanca"
                    />
                  </div>
                </div>

                {profileMsg && <MessageBox kind={profileMsg.kind}>{profileMsg.text}</MessageBox>}

                <div className="flex justify-end pt-2">
                  <Button type="submit" disabled={savingProfile} className="gap-2">
                    {savingProfile ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Save className="h-4 w-4" />
                    )}
                    Enregistrer
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>

          {/* Password */}
          <Card className="lg:col-span-2">
            <CardHeader>
              <div className="flex items-center gap-2">
                <KeyRound className="h-5 w-5 text-primary" />
                <CardTitle>Sécurité</CardTitle>
              </div>
              <CardDescription>
                Modifiez votre mot de passe pour protéger votre compte.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={savePassword} className="space-y-5">
                <div className="space-y-2">
                  <Label htmlFor="pwd">Nouveau mot de passe</Label>
                  <div className="relative">
                    <KeyRound className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      id="pwd"
                      type="password"
                      value={pwd}
                      onChange={(e) => setPwd(e.target.value)}
                      minLength={6}
                      required
                      className="pl-9"
                      placeholder="••••••••"
                    />
                  </div>
                  <p className="text-xs text-muted-foreground">6 caractères minimum.</p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="pwd2">Confirmer le mot de passe</Label>
                  <div className="relative">
                    <KeyRound className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      id="pwd2"
                      type="password"
                      value={pwd2}
                      onChange={(e) => setPwd2(e.target.value)}
                      minLength={6}
                      required
                      className="pl-9"
                      placeholder="••••••••"
                    />
                  </div>
                </div>

                {pwdMsg && <MessageBox kind={pwdMsg.kind}>{pwdMsg.text}</MessageBox>}

                <Separator />

                <div className="flex items-start gap-2 text-xs text-muted-foreground">
                  <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                  <span>
                    Votre mot de passe est chiffré. Nous ne le stockons jamais en clair.
                  </span>
                </div>

                <div className="flex justify-end">
                  <Button type="submit" disabled={savingPwd} className="gap-2">
                    {savingPwd ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Save className="h-4 w-4" />
                    )}
                    Mettre à jour
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

function MessageBox({ kind, children }: { kind: "ok" | "err"; children: React.ReactNode }) {
  return (
    <div
      role="alert"
      className={
        kind === "ok"
          ? "rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-800 dark:border-emerald-900 dark:bg-emerald-950 dark:text-emerald-200"
          : "rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive"
      }
    >
      {children}
    </div>
  );
}
