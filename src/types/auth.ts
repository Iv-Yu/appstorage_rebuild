/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export type UserRole = 'admin' | 'technician' | 'supervisor' | 'superadmin';
export type AccountStatus = 'ACTIVE' | 'PENDING_APPROVAL' | 'REJECTED';

export interface UserAccount {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  roleLabel: string;
  department: string;
  avatarUrl: string;
  phone: string;
  passwordHash?: string;
  salt?: string;
  status: AccountStatus;
  isMasterAdmin?: boolean;
}
