import { test, expect } from 'vitest';
import { readAriEvents, type AriEvent } from './ari-stream';
test('voice transcript precedes intent, saved action and reply across split network chunks', async () => {
 const events = [{type:'transcript',text:'Cambiar título'}, {type:'intent',text:'Voy a cambiar el título'}, {type:'tool_result',name:'update_piece',result:{ok:true}}, {type:'reply',text:'Título cambiado'}, {type:'done'}];
 const bytes = new TextEncoder().encode(events.map(e=>JSON.stringify(e)).join('\n')+'\n');
 const stream=new ReadableStream<Uint8Array>({start(c){c.enqueue(bytes.slice(0,20));c.enqueue(bytes.slice(20));c.close();}});
 const received:AriEvent[]=[];
 await readAriEvents(stream,e=>received.push(e));
 expect(received.map(e=>e.type)).toEqual(['transcript','intent','tool_result','reply','done']);
});
test('an interrupted action never looks completed', async () => {
 const stream=new ReadableStream<Uint8Array>({start(c){c.enqueue(new TextEncoder().encode('{"type":"transcript","text":"Editar pieza"}\n'));c.close();}});
 await expect(readAriEvents(stream,()=>{})).rejects.toThrow('La conexión se interrumpió');
});