import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  const email = "gerencia.dnz@gmail.com";
  const password = "Dnzoticas2025!";

  // Check if exists
  const { data: list } = await supabase.auth.admin.listUsers();
  const exists = list?.users?.find((u) => u.email === email);

  if (exists) {
    await supabase.auth.admin.updateUserById(exists.id, { password, email_confirm: true });
    return new Response(JSON.stringify({ status: "updated", id: exists.id }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const { data, error } = await supabase.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  });

  if (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  return new Response(JSON.stringify({ status: "created", id: data.user?.id }), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
});