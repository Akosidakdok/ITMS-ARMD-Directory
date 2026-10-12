import test from 'node:test';
import assert from 'node:assert/strict';
import {
  hasManagementAccess,
  getRoleLabel,
  getRoleDescription,
  canManagePersonnel
} from '../src/utils/accessControl.ts';

test('hasManagementAccess grants access for admin and superadmin roles', () => {
  assert.equal(hasManagementAccess('admin'), true);
  assert.equal(hasManagementAccess('superadmin'), true);
});

test('hasManagementAccess handles case-insensitive and whitespace roles', () => {
  assert.equal(hasManagementAccess('Admin'), true);
  assert.equal(hasManagementAccess('SUPERADMIN'), true);
  assert.equal(hasManagementAccess('  admin  '), true);
});

test('hasManagementAccess rejects non-admin roles and falsy values', () => {
  assert.equal(hasManagementAccess('viewer'), false);
  assert.equal(hasManagementAccess('user'), false);
  assert.equal(hasManagementAccess(''), false);
  assert.equal(hasManagementAccess(null), false);
  assert.equal(hasManagementAccess(undefined), false);
});

test('getRoleLabel returns human-readable titles case-insensitively', () => {
  assert.equal(getRoleLabel('superadmin'), 'Superadmin');
  assert.equal(getRoleLabel('SUPERADMIN'), 'Superadmin');
  assert.equal(getRoleLabel('admin'), 'Administrator');
  assert.equal(getRoleLabel('Admin'), 'Administrator');
  assert.equal(getRoleLabel('viewer'), 'View-only user');
  assert.equal(getRoleLabel(undefined), 'View-only user');
});

test('getRoleDescription describes permissions accurately', () => {
  assert.equal(getRoleDescription('superadmin'), 'Full system and account administration');
  assert.equal(getRoleDescription('admin'), 'Personnel and records administration');
  assert.equal(getRoleDescription('viewer'), 'Read-only records access');
});

test('canManagePersonnel delegates correctly', () => {
  assert.equal(canManagePersonnel('admin'), true);
  assert.equal(canManagePersonnel('viewer'), false);
});
