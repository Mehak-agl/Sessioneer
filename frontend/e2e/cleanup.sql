-- Removes everything the full-stack E2E tests created: every account whose
-- email matches e2e-%@example.com, plus their units and all related rows.
-- Real accounts and units are never touched.
BEGIN;

CREATE TEMP TABLE e2e_users ON COMMIT DROP AS
  SELECT id FROM users WHERE email LIKE 'e2e-%@example.com';
CREATE TEMP TABLE e2e_units ON COMMIT DROP AS
  SELECT id FROM units WHERE coordinator_id IN (SELECT id FROM e2e_users);
CREATE TEMP TABLE e2e_sessions ON COMMIT DROP AS
  SELECT id FROM sessions WHERE unit_id IN (SELECT id FROM e2e_units);
CREATE TEMP TABLE e2e_groups ON COMMIT DROP AS
  SELECT id FROM group_chats WHERE creator_id IN (SELECT id FROM e2e_users);
CREATE TEMP TABLE e2e_swaps ON COMMIT DROP AS
  SELECT id FROM swap_requests
  WHERE unit_id IN (SELECT id FROM e2e_units)
     OR requesting_staff_id IN (SELECT id FROM e2e_users)
     OR target_staff_id IN (SELECT id FROM e2e_users);

DELETE FROM swap_request_sessions WHERE swap_request_id IN (SELECT id FROM e2e_swaps);
DELETE FROM swap_requests WHERE id IN (SELECT id FROM e2e_swaps);
DELETE FROM session_unavailable_staff
  WHERE session_id IN (SELECT id FROM e2e_sessions) OR staff_id IN (SELECT id FROM e2e_users);
DELETE FROM allocations
  WHERE session_id IN (SELECT id FROM e2e_sessions) OR staff_id IN (SELECT id FROM e2e_users);
DELETE FROM availability
  WHERE unit_id IN (SELECT id FROM e2e_units) OR staff_id IN (SELECT id FROM e2e_users);
DELETE FROM notifications
  WHERE recipient_id IN (SELECT id FROM e2e_users) OR unit_id IN (SELECT id FROM e2e_units);
DELETE FROM unit_invitations
  WHERE unit_id IN (SELECT id FROM e2e_units) OR staff_id IN (SELECT id FROM e2e_users);
DELETE FROM group_messages
  WHERE group_id IN (SELECT id FROM e2e_groups) OR sender_id IN (SELECT id FROM e2e_users);
DELETE FROM group_memberships
  WHERE group_id IN (SELECT id FROM e2e_groups) OR user_id IN (SELECT id FROM e2e_users);
DELETE FROM group_chats WHERE id IN (SELECT id FROM e2e_groups);
DELETE FROM messages
  WHERE sender_id IN (SELECT id FROM e2e_users) OR receiver_id IN (SELECT id FROM e2e_users);
DELETE FROM sessions WHERE id IN (SELECT id FROM e2e_sessions);
DELETE FROM units WHERE id IN (SELECT id FROM e2e_units);
DELETE FROM users WHERE id IN (SELECT id FROM e2e_users);

COMMIT;
