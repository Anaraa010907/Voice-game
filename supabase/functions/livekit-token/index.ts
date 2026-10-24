// Supabase Edge Function: livekit-token
// Нэвтэрсэн хэрэглэгч өөрийн өрөөний (rooms.code) LiveKit token-ыг авна.
//
// Secrets (supabase secrets set ...):
//   LIVEKIT_URL, LIVEKIT_API_KEY, LIVEKIT_API_SECRET
// SUPABASE_URL, SUPABASE_ANON_KEY нь автоматаар орно.

import { createClient } from "npm:@supabase/supabase-js@2";
import { AccessToken } from "npm:livekit-server-sdk@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization") ?? "";
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } },
    );

    const { data: userData, error: userErr } = await supabase.auth.getUser();
    if (userErr || !userData.user) return json({ error: "Нэвтрээгүй байна" }, 401);

    const { roomId } = await req.json();
    if (!roomId) return json({ error: "roomId шаардлагатай" }, 400);

    // RLS-ээр зөвхөн өөрийн өрөөний тоглогчийг харна
    const { data: player } = await supabase
      .from("players")
      .select("id, name, room_id")
      .eq("room_id", roomId)
      .eq("user_id", userData.user.id)
      .maybeSingle();
    if (!player) return json({ error: "Та энэ өрөөний гишүүн биш" }, 403);

    const at = new AccessToken(
      Deno.env.get("LIVEKIT_API_KEY")!,
      Deno.env.get("LIVEKIT_API_SECRET")!,
      { identity: player.id, name: player.name, ttl: "4h" },
    );
    at.addGrant({
      room: roomId,
      roomJoin: true,
      canPublish: true,
      canSubscribe: true,
      canPublishData: false,
    });

    return json({
      token: await at.toJwt(),
      url: Deno.env.get("LIVEKIT_URL"),
    });
  } catch (e) {
    return json({ error: String(e) }, 500);
  }
});
