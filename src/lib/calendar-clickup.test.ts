import { describe, expect, it } from 'vitest';
import { listBelongsToSpace, calendarFinalStatusPatch, calendarSyncFields, calendarTaskPayload, isClickUpApproved, isClickUpCalendarExcluded, isClickUpTaskDeleted, parseCalendarTaskTitle, shouldShowCalendarPiece, calendarDeliveryPatch, calendarSpaceListIds, calendarSpaceConfigFields } from '../../supabase/functions/_shared/calendar-clickup-rules';

describe('calendar ClickUp destination', () => {
  it('marks final pieces approved and schedules on the actual completion date in Costa Rica', () => {
    expect(calendarFinalStatusPatch({ status: { status: 'subido', type: 'closed' }, date_closed: String(Date.parse('2026-10-26T03:00:00Z')) })).toEqual({ status: 'aprobado', publish_date: '2026-10-25' });
    expect(calendarFinalStatusPatch({ status: { status: 'aprobado & milanote', type: 'done' }, date_done: String(Date.parse('2026-10-26T18:00:00Z')) })).toEqual({ status: 'aprobado', publish_date: '2026-10-26' });
  });
  it('does not invent completion dates or treat editing dates as approval dates', () => {
    expect(calendarFinalStatusPatch({ status: { status: 'aprobado', type: 'custom' } })).toEqual({ status: 'aprobado' });
    expect(calendarFinalStatusPatch({ status: { status: 'editar', type: 'custom' } })).toEqual({});
  });
  it('preserves a manually assigned delivery date when ClickUp marks the task final', () => {
    expect(calendarFinalStatusPatch({ status: { status: 'subido', type: 'closed' }, date_closed: String(Date.parse('2026-10-26T18:00:00Z')) }, null, '2026-11-02')).toEqual({ status: 'aprobado' });
  });
  it('deletes the calendar piece when ClickUp confirms VIDEITO PRUEBA no longer exists', () => {
    expect(isClickUpTaskDeleted(404, JSON.stringify({ err: 'Task not found, deleted', ECODE: 'ITEM_013' }))).toBe(true);
  });
  it.each([401, 403, 429, 500])('never deletes calendar pieces on ClickUp error %s', (status) => {
    expect(isClickUpTaskDeleted(status, JSON.stringify({ err: 'Task not found, deleted', ECODE: 'ITEM_013' }))).toBe(false);
  });
  it('never treats a missing list, unavailable task permission, or invalid body as confirmed deletion', () => {
    expect(isClickUpTaskDeleted(404, JSON.stringify({ err: 'List not found', ECODE: 'ITEM_013' }))).toBe(false);
    expect(isClickUpTaskDeleted(404, JSON.stringify({ err: 'Task not found', ECODE: 'ACCESS_DENIED' }))).toBe(false);
    expect(isClickUpTaskDeleted(404, 'Not found')).toBe(false);
  });
  it('configures the whole client space without a production list filter', () => {
    expect(calendarSpaceConfigFields({ id: '123', name: 'B-Dental' })).toEqual({ space_id: '123', space_name: 'B-Dental', list_id: null, list_name: null });
  });
  it('includes every production list, foldered and folderless, and discovers new lists on the next sync', () => {
    const folders = [{ lists: [{ id: 'produccion-1' }, { id: 'produccion-2' }] }, { lists: [{ id: 'produccion-3' }] }];
    expect(calendarSpaceListIds(folders, [{ id: 'fotos' }, { id: 'produccion-1' }])).toEqual(['produccion-1', 'produccion-2', 'produccion-3', 'fotos']);
    expect(calendarSpaceListIds([...folders, { lists: [{ id: 'produccion-4' }] }], [{ id: 'fotos' }])).toContain('produccion-4');
    expect(calendarSpaceListIds([], [])).toEqual([]);
  });
  it('moves pieces back to unscheduled by clearing only the delivery date', () => {
    const piece = { publish_date: '2026-10-25', status: 'cambios', cover_status: 'aprobado', title: 'Reel', due_date: '1792944000000' };
    expect({ ...piece, ...calendarDeliveryPatch(null) }).toEqual({ ...piece, publish_date: null });
    expect(calendarDeliveryPatch('2026-10-26')).toEqual({ publish_date: '2026-10-26' });
  });
  it('hides only pieces explicitly flagged as non-content operations', () => {
    expect(isClickUpApproved({ status: 'APROBADO' })).toBe(true);
    expect(isClickUpApproved({ status: 'aprobada' })).toBe(true);
    expect(isClickUpApproved({ status: 'pre-aprobación' })).toBe(false);
    expect(isClickUpApproved({ status: 'no aprobado' })).toBe(false);
    expect(shouldShowCalendarPiece({ publish_date: null, clickup_approved: true })).toBe(false);
    expect(shouldShowCalendarPiece({ publish_date: '2026-10-25', clickup_approved: true })).toBe(false);
    expect(shouldShowCalendarPiece({ publish_date: null, clickup_approved: false })).toBe(true);
  });
  it.each(['Aprobado', 'subida', 'subida a Milanote', 'subido', 'aprobado & milanote'])('excludes the confirmed ClickUp status %s', (status) => {
    expect(isClickUpCalendarExcluded({ status })).toBe(true);
  });
  it.each(['en edición', 'pre-aprobación', 'no aprobado', 'por grabar'])('includes every other status %s', (status) => {
    expect(isClickUpCalendarExcluded({ status })).toBe(false);
  });
  it('imports untagged tasks from the client space and retains tagged types', () => {
    expect(parseCalendarTaskTitle('Video nuevo de octubre')).toEqual({ title: 'Video nuevo de octubre', contentType: 'otro', platform: null });
    expect(parseCalendarTaskTitle('[3] [REEL · IG] Nuevo video')).toEqual({ title: 'Nuevo video', contentType: 'reel', platform: 'instagram' });
    expect(parseCalendarTaskTitle('[PRODUCCIÓN] Pasar material al servidor')).toBeNull();
  });
  it('rejects lists from another client space and missing space data', () => {
    expect(listBelongsToSpace({ space: { id: 'cliente-a' } }, 'cliente-a')).toBe(true);
    expect(listBelongsToSpace({ space: { id: 'cliente-b' } }, 'cliente-a')).toBe(false);
    expect(listBelongsToSpace({}, 'cliente-a')).toBe(false);
  });
  it('never imports editing deadlines as delivery dates, including unscheduled pieces', () => {
    const fields = calendarSyncFields({ due_date: String(Date.parse('2026-10-25T18:00:00Z')), url: 'https://app.clickup.com/t/123' }, 'Reel');
    expect(fields).toEqual({ title: 'Reel', clickup_url: 'https://app.clickup.com/t/123' });
    expect({ publish_date: null, ...fields }.publish_date).toBeNull();
    expect({ publish_date: '2026-11-02', ...fields }.publish_date).toBe('2026-11-02');
  });
  it('never exports manual delivery dates as ClickUp editing deadlines', () => {
    const task = calendarTaskPayload({ id: 'piece-1', title: 'Reel', content_type: 'reel', publish_date: '2026-10-25' });
    expect(task).not.toHaveProperty('due_date');
    expect(task).not.toHaveProperty('start_date');
    expect(task.name).toBe('[REEL] Reel');
  });
});