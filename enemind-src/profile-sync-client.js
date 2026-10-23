/* Add this helper to the existing Enemind frontend after Firebase sign-in succeeds.
   Set SUPABASE_URL to your Supabase project URL. Do NOT put the service-role key here. */
export async function syncEnemindProfileWithSupabase(firebaseUser, supabaseUrl, supabaseAnonKey) {
  if (!firebaseUser) throw new Error("No signed-in Firebase user");
  const idToken = await firebaseUser.getIdToken(true);
  const response = await fetch(`${supabaseUrl}/functions/v1/enemind-profile`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${idToken}`,
      "apikey": supabaseAnonKey,
    },
    body: JSON.stringify({
      displayName: firebaseUser.displayName ?? null,
      photoUrl: firebaseUser.photoURL ?? null,
    }),
  });
  const result = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(result.error || `Profile sync failed (${response.status})`);
  return result.profile;
}
