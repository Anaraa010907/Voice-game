import { useCallback, useEffect, useRef, useState } from "react";
import { Room as LiveKitRoom, RoomEvent, Track } from "livekit-client";
import { supabase } from "./supabase";
import type { VoicePolicy } from "../games/registry";

const tokenUrl =
  import.meta.env.VITE_LIVEKIT_TOKEN_URL ??
  `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/livekit-token`;

async function fetchToken(roomId: string): Promise<{ token: string; url: string }> {
  const { data } = await supabase.auth.getSession();
  const res = await fetch(tokenUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${data.session?.access_token ?? ""}`,
      apikey: import.meta.env.VITE_SUPABASE_ANON_KEY ?? "",
    },
    body: JSON.stringify({ roomId }),
  });
  const body = await res.json();
  if (!res.ok) throw new Error(body.error ?? "Voice token авч чадсангүй");
  return body;
}

/**
 * LiveKit voice. identity = players.id тул тоглоомын дүрмээр
 * (policy.hearOnly) хэнийг сонсохоо клиент талд шийднэ.
 */
export function useVoice(roomId: string, policy: VoicePolicy) {
  const lkRef = useRef<LiveKitRoom | null>(null);
  const audioRef = useRef<Map<string, HTMLMediaElement[]>>(new Map());
  const policyRef = useRef(policy);
  policyRef.current = policy;

  const [connected, setConnected] = useState(false);
  const [micOn, setMicOn] = useState(false);
  const [speaking, setSpeaking] = useState<Set<string>>(new Set());
  const [error, setError] = useState<string | null>(null);

  const applyHearing = useCallback(() => {
    const { hearOnly } = policyRef.current;
    audioRef.current.forEach((els, identity) => {
      const allowed = hearOnly === null || hearOnly.has(identity);
      els.forEach((el) => {
        el.muted = !allowed;
      });
    });
  }, []);

  useEffect(() => {
    let cancelled = false;
    const lk = new LiveKitRoom({ adaptiveStream: true, dynacast: true });
    lkRef.current = lk;

    lk.on(RoomEvent.ActiveSpeakersChanged, (list) =>
      setSpeaking(new Set(list.map((p) => p.identity))),
    );
    lk.on(RoomEvent.TrackSubscribed, (track, _pub, participant) => {
      if (track.kind !== Track.Kind.Audio) return;
      const el = track.attach();
      el.style.display = "none";
      document.body.appendChild(el);
      const list = audioRef.current.get(participant.identity) ?? [];
      list.push(el);
      audioRef.current.set(participant.identity, list);
      applyHearing();
    });
    lk.on(RoomEvent.TrackUnsubscribed, (track, _pub, participant) => {
      track.detach().forEach((el) => el.remove());
      audioRef.current.delete(participant.identity);
    });
    lk.on(RoomEvent.Disconnected, () => setConnected(false));

    (async () => {
      try {
        const { token, url } = await fetchToken(roomId);
        if (cancelled) return;
        await lk.connect(url, token);
        if (!cancelled) setConnected(true);
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : String(e));
      }
    })();

    return () => {
      cancelled = true;
      audioRef.current.forEach((els) => els.forEach((el) => el.remove()));
      audioRef.current.clear();
      void lk.disconnect();
      lkRef.current = null;
      setConnected(false);
      setMicOn(false);
    };
  }, [roomId, applyHearing]);

  // Тоглоомын дүрэм (үе, үүрэг) өөрчлөгдөхөд сонсох хүмүүсийг шинэчилнэ
  useEffect(() => {
    applyHearing();
  }, [policy.hearOnly, applyHearing]);

  const setMic = useCallback(async (on: boolean) => {
    const lk = lkRef.current;
    if (!lk) return;
    try {
      await lk.localParticipant.setMicrophoneEnabled(on);
      setMicOn(on);
      setError(null);
    } catch {
      setError("Микрофон ашиглах зөвшөөрөл олдсонгүй");
    }
  }, []);

  // Ярих эрхгүй болоход микрофоныг автоматаар унтраана
  useEffect(() => {
    if (!policy.canSpeak && micOn) void setMic(false);
  }, [policy.canSpeak, micOn, setMic]);

  const toggleMic = useCallback(() => {
    if (!policyRef.current.canSpeak) return;
    void setMic(!micOn);
  }, [micOn, setMic]);

  return { connected, micOn, speaking, error, toggleMic };
}
