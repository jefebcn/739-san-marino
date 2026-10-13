import { supabaseBrowser } from "@/lib/supabase/browser";
import type { ProfiloSmr } from "./store";

/** Messaggi d'errore di Supabase Auth tradotti per l'utente. */
const MESSAGGI: Record<string, string> = {
  invalid_credentials: "Email o password non corretti.",
  email_not_confirmed: "Prima conferma l'email: trovi il link nella tua casella di posta.",
  user_already_exists: "Esiste già un account con questa email. Prova ad accedere.",
  email_exists: "Esiste già un account con questa email. Prova ad accedere.",
  weak_password: "Password troppo debole: usa almeno 8 caratteri, con lettere e numeri.",
  over_email_send_rate_limit: "Abbiamo inviato troppe email: riprova tra qualche minuto.",
  over_request_rate_limit: "Troppi tentativi: riprova tra qualche minuto.",
  same_password: "La nuova password deve essere diversa da quella attuale.",
  validation_failed: "Controlla i dati inseriti.",
};

function messaggio(e: { code?: string; message: string } | null) {
  if (!e) return null;
  return (e.code && MESSAGGI[e.code]) || "Qualcosa non ha funzionato. Riprova tra poco.";
}

const ritorno = () => `${window.location.origin}/profile`;

export async function caricaProfilo(id: string): Promise<ProfiloSmr | null> {
  const { data, error } = await supabaseBrowser().from("profili").select("id, nome, castello_id, lingua, tessera").eq("id", id).maybeSingle();
  if (error) console.error("profilo", error.message);
  return (data as ProfiloSmr) ?? null;
}

export async function registrati(dati: { email: string; password: string; nome: string; castello_id: number | null }) {
  const { data, error } = await supabaseBrowser().auth.signUp({
    email: dati.email.trim(),
    password: dati.password,
    options: { data: { nome: dati.nome.trim(), castello_id: dati.castello_id }, emailRedirectTo: ritorno() },
  });
  // Senza sessione l'account va confermato dal link nell'email
  return { errore: messaggio(error), daConfermare: !error && !data.session };
}

export async function accedi(email: string, password: string) {
  const { error } = await supabaseBrowser().auth.signInWithPassword({ email: email.trim(), password });
  return { errore: messaggio(error) };
}

export async function recuperaPassword(email: string) {
  const { error } = await supabaseBrowser().auth.resetPasswordForEmail(email.trim(), { redirectTo: ritorno() });
  return { errore: messaggio(error) };
}

export async function nuovaPassword(password: string) {
  const { error } = await supabaseBrowser().auth.updateUser({ password });
  return { errore: messaggio(error) };
}

export async function salvaProfilo(id: string, modifiche: { nome?: string | null; castello_id?: number | null }) {
  const { error } = await supabaseBrowser().from("profili").update(modifiche).eq("id", id);
  return { errore: error ? "Non sono riuscito a salvare. Riprova." : null };
}

export async function esci() {
  await supabaseBrowser().auth.signOut();
}
