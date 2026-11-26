import { test, expect } from 'vitest';
import { piecePatch, moveText, positionBetween } from '../../supabase/functions/ari-voice/production-rules';
test('Ari separates title, description, technical notes, hook and type', () => {
 expect(piecePatch({concept:'Recepción del nuevo láser',description:'Mostrar la entrada',tech_notes:'Limpiar audio con Podcast Enhance',hook:'Llegó nuestro láser',content_type:'reel'})).toEqual({concept:'Recepción del nuevo láser',description:'Mostrar la entrada',tech_notes:'Limpiar audio con Podcast Enhance',hook:'Llegó nuestro láser',content_type:'reel'});
});
test('a title correction never overwrites other fields',()=>{expect(piecePatch({concept:'Feliz Año Nuevo'})).toEqual({concept:'Feliz Año Nuevo'});});
test('moving description preserves existing technical notes',()=>{expect(moveText('Mostrar entrada','Zoom en 4K')).toBe('Zoom en 4K\n\nMostrar entrada');});
test('Ari rejects changing ownership and external task IDs',()=>{expect(()=>piecePatch({sheet_id:'otra-hoja'})).toThrow();expect(()=>piecePatch({clickup_task_id:'123'})).toThrow();});
test('reorder places a piece between its neighbors',()=>{expect(positionBetween(1,2)).toBe(1.5);expect(positionBetween(undefined,0)).toBe(-1);});
test('full dictation cannot become a long title',()=>{expect(()=>piecePatch({concept:'a'.repeat(181)})).toThrow();});
