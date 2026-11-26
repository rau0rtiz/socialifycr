export function appendTechnicalTranscript(notes: string, transcript: string): string {
  const text = transcript.trim();
  if (!text) return notes;
  return notes.trim() ? `${notes}\n\n${text}` : text;
}