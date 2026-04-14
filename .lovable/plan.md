

## Problem

The edge function `send-client-invitation` only accepts 3 roles: `account_manager`, `editor`, `viewer`. But the `InviteClientDialog` UI offers 6 roles including `media_buyer`, `closer`, and `setter`. Selecting any of the newer commercial roles causes the "Invalid role" error.

## Fix

**Update the edge function** to accept all valid client team member roles:

**File: `supabase/functions/send-client-invitation/index.ts`** (line 62)
- Change `validRoles` from `["account_manager", "editor", "viewer"]` to `["account_manager", "media_buyer", "closer", "setter", "editor", "viewer"]`

That's it — one line change, then redeploy.

