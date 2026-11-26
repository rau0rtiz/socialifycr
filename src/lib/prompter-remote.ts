import { supabase } from '@/integrations/supabase/client';

export type RemoteState = { playing: boolean; speed: number; size: number; mirrorX: boolean; mirrorY: boolean; line?: number; title: string; idx?: number; titles?: string[]; script?: string };
export type RemoteCmd =
  | { a: 'toggle' } | { a: 'reset' } | { a: 'speed'; d: number } | { a: 'size'; d: number }
  | { a: 'nudge'; d: number } | { a: 'mirrorX' } | { a: 'mirrorY' } | { a: 'hello' }
  | { a: 'seek'; f: number } | { a: 'select'; i: number };

export function newRoomId() {
  const b = crypto.getRandomValues(new Uint8Array(16));
  return Array.from(b, x => x.toString(16).padStart(2, '0')).join('');
}

export function openRoom(room: string) {
  return supabase.channel(`prompter-${room}`, { config: { broadcast: { self: false, ack: false } } });
}
