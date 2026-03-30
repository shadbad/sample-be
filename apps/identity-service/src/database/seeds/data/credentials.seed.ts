/** Default admin credential used in the identity-service seed. */
export const DEFAULT_ADMIN_CREDENTIAL = {
  userId: '9aaa0220-6fc4-43b4-af60-1c9c76b17f09',
  email: 'admin@example.com',
  password: 'Admin1234!',
  roleId: '82643745-f3f0-440f-885a-d9b88d0f3d18',
} as const;

/** Shared password used for all dummy (non-admin) seeded users. */
export const DUMMY_USER_PASSWORD = 'Password1234!';

/** Credentials for the 30 dummy member accounts. */
export const DUMMY_USER_CREDENTIALS = [
  { userId: 'a1000001-0000-0000-0000-000000000001', email: 'alice.johnson@example.com' },
  { userId: 'a1000001-0000-0000-0000-000000000002', email: 'bob.smith@example.com' },
  { userId: 'a1000001-0000-0000-0000-000000000003', email: 'carol.white@example.com' },
  { userId: 'a1000001-0000-0000-0000-000000000004', email: 'david.brown@example.com' },
  { userId: 'a1000001-0000-0000-0000-000000000005', email: 'emma.davis@example.com' },
  { userId: 'a1000001-0000-0000-0000-000000000006', email: 'frank.miller@example.com' },
  { userId: 'a1000001-0000-0000-0000-000000000007', email: 'grace.wilson@example.com' },
  { userId: 'a1000001-0000-0000-0000-000000000008', email: 'henry.moore@example.com' },
  { userId: 'a1000001-0000-0000-0000-000000000009', email: 'isabella.taylor@example.com' },
  { userId: 'a1000001-0000-0000-0000-000000000010', email: 'jack.anderson@example.com' },
  { userId: 'a1000001-0000-0000-0000-000000000011', email: 'kate.thomas@example.com' },
  { userId: 'a1000001-0000-0000-0000-000000000012', email: 'liam.jackson@example.com' },
  { userId: 'a1000001-0000-0000-0000-000000000013', email: 'mia.harris@example.com' },
  { userId: 'a1000001-0000-0000-0000-000000000014', email: 'noah.martin@example.com' },
  { userId: 'a1000001-0000-0000-0000-000000000015', email: 'olivia.garcia@example.com' },
  { userId: 'a1000001-0000-0000-0000-000000000016', email: 'peter.martinez@example.com' },
  { userId: 'a1000001-0000-0000-0000-000000000017', email: 'quinn.robinson@example.com' },
  { userId: 'a1000001-0000-0000-0000-000000000018', email: 'rachel.clark@example.com' },
  { userId: 'a1000001-0000-0000-0000-000000000019', email: 'samuel.rodriguez@example.com' },
  { userId: 'a1000001-0000-0000-0000-000000000020', email: 'tina.lewis@example.com' },
  { userId: 'a1000001-0000-0000-0000-000000000021', email: 'uma.lee@example.com' },
  { userId: 'a1000001-0000-0000-0000-000000000022', email: 'victor.walker@example.com' },
  { userId: 'a1000001-0000-0000-0000-000000000023', email: 'wendy.hall@example.com' },
  { userId: 'a1000001-0000-0000-0000-000000000024', email: 'xander.allen@example.com' },
  { userId: 'a1000001-0000-0000-0000-000000000025', email: 'yara.young@example.com' },
  { userId: 'a1000001-0000-0000-0000-000000000026', email: 'zoe.hernandez@example.com' },
  { userId: 'a1000001-0000-0000-0000-000000000027', email: 'aaron.king@example.com' },
  { userId: 'a1000001-0000-0000-0000-000000000028', email: 'bella.wright@example.com' },
  { userId: 'a1000001-0000-0000-0000-000000000029', email: 'carlos.lopez@example.com' },
  { userId: 'a1000001-0000-0000-0000-000000000030', email: 'diana.scott@example.com' },
] as const;
