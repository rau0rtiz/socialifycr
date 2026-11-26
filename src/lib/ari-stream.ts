import { z } from 'zod';
const eventSchema = z.discriminatedUnion('type', [
 z.object({type:z.literal('transcript'),text:z.string()}),
 z.object({type:z.literal('intent'),text:z.string()}),
 z.object({type:z.literal('reply'),text:z.string(),link:z.string().nullable().optional(),copy:z.string().nullable().optional(),navigate:z.string().nullable().optional(),invalidate:z.array(z.string()).optional()}),
 z.object({type:z.literal('tool_result'),name:z.string(),result:z.unknown(),invalidate:z.array(z.string()).optional()}),
 z.object({type:z.literal('audio'),audio:z.string()}),
 z.object({type:z.literal('error'),error:z.string(),invalidate:z.array(z.string()).optional()}),
 z.object({type:z.literal('done')}),
]);
export type AriEvent = z.infer<typeof eventSchema>;
export async function readAriEvents(body: ReadableStream<Uint8Array>, onEvent: (event: AriEvent) => void) {
 const reader=body.getReader();const decoder=new TextDecoder();let pending='';let finished=false;
 const line=(value:string)=>{if(value.trim()){const event=eventSchema.parse(JSON.parse(value));onEvent(event);if(event.type==='done'||event.type==='error')finished=true;}};
 try {
  while(true){const {value,done}=await reader.read();if(done)break;pending+=decoder.decode(value,{stream:true});let boundary=pending.indexOf('\n');while(boundary>=0){line(pending.slice(0,boundary));pending=pending.slice(boundary+1);boundary=pending.indexOf('\n');}}
  pending+=decoder.decode();line(pending);
  if(!finished)throw new Error('La conexión se interrumpió; revisá los cambios guardados antes de repetir.');
 } finally {reader.releaseLock();}
}
