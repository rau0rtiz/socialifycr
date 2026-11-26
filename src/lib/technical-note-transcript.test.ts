import { describe, expect, it } from 'vitest';
import { appendTechnicalTranscript } from './technical-note-transcript';

describe('technical note transcription', () => {
  it('preserves existing notes while appending speech', () => {
    expect(appendTechnicalTranscript('Cámara A: plano abierto.', '  Grabar detalle del producto.  '))
      .toBe('Cámara A: plano abierto.\n\nGrabar detalle del producto.');
  });
  it('uses the transcript for empty notes', () => {
    expect(appendTechnicalTranscript('', 'Plano cerrado.')).toBe('Plano cerrado.');
  });
  it('does not erase notes for an empty transcript', () => {
    expect(appendTechnicalTranscript('Conservar esta nota.', '  ')).toBe('Conservar esta nota.');
  });
});