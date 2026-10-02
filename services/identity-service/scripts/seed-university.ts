import { Prisma, PrismaClient } from '@resourcehive/database';
import * as bcrypt from 'bcrypt';

const SEED_KEY = 'university-demo-v1';
const ADVISORY_LOCK_ID = 731002;
const prisma = new PrismaClient({
  datasources: {
    db: {
      url: process.env.DATABASE_URL_UNPOOLED ?? process.env.DATABASE_URL,
    },
  },
});

const firstNames = [
  'Amaya',
  'Ashen',
  'Chamath',
  'Chathuri',
  'Dinuka',
  'Hasini',
  'Isuru',
  'Kavindi',
  'Kavishka',
  'Malith',
  'Nadeesha',
  'Nimesh',
  'Pavithra',
  'Ravindu',
  'Sachini',
  'Tharindu',
  'Udari',
  'Vihanga',
  'Yasiru',
  'Dilani',
];
const lastNames = [
  'Perera',
  'Fernando',
  'Silva',
  'Jayasinghe',
  'Senanayake',
  'Bandara',
  'Wickramasinghe',
  'Gunawardena',
  'Abeysekara',
  'Rajapaksha',
  'Wijesinghe',
  'Dissanayake',
  'Karunaratne',
  'Ekanayake',
  'Pathirana',
  'Weerasinghe',
  'Herath',
  'Samarasinghe',
  'Kumara',
  'Nanayakkara',
];
const uomStudents = [
  {
    email: 'shared.student@uom.lk',
    firstName: 'Kasun',
    lastName: 'Perera',
    group: 'CSE',
  },
  {
    email: 'engineering.student@uom.lk',
    firstName: 'Amaya',
    lastName: 'Fernando',
    group: 'CSE',
  },
  ...Array.from({ length: 28 }, (_, index) => ({
    ...namedAccount(index + 2, 'uom.lk'),
    group: 'CSE',
  })),
  ...Array.from({ length: 20 }, (_, index) => ({
    ...namedAccount(index + 30, 'uom.lk'),
    group: 'ENTC',
  })),
  ...Array.from({ length: 20 }, (_, index) => ({
    ...namedAccount(index + 50, 'uom.lk'),
    group: 'Electrical',
  })),
  ...Array.from({ length: 15 }, (_, index) => ({
    ...namedAccount(index + 70, 'uom.lk'),
    group: 'Medical Sciences',
  })),
  ...Array.from({ length: 15 }, (_, index) => ({
    ...namedAccount(index + 85, 'uom.lk'),
    group: 'Business Studies',
  })),
];
const lecturerNames = Array.from({ length: 20 }, (_, index) => ({
  ...namedAccount(index + 120, 'uom.lk'),
  group:
    index < 12
      ? ['CSE', 'ENTC', 'Electrical'][Math.floor(index / 4)]
      : index < 16
        ? 'Medical Sciences'
        : 'Business Studies',
}));
lecturerNames[0] = {
  email: 'engineering.admin@uom.lk',
  firstName: 'Nuwan',
  lastName: 'Senanayake',
  group: 'CSE',
};

type Account = {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  group?: string;
  role: 'STUDENT' | 'LECTURER' | 'PLATFORM';
};
type Org = {
  id: string;
  name: string;
  type: string;
  parentId: string | null;
  rootId: string;
  joinBonusPoints: number;
};
type DemoTenant = {
  root: string;
  faculties: string[];
  departments: string[];
  clubs: string[];
  students: Account[];
  lecturers: Account[];
  orgAdmins: Map<string, string>;
};

let nextId = 1;
const uuid = (prefix: string) =>
  `${prefix}-0000-4000-8000-${String(nextId++).padStart(12, '0')}`;
const id = (prefix: string, value: number) =>
  `${prefix}-0000-4000-8000-${String(value).padStart(12, '0')}`;
const orgIds = {
  uom: id('a1000000', 1),
  engineering: id('a1000000', 2),
  medicine: id('a1000000', 3),
  business: id('a1000000', 4),
  cse: id('a1000000', 5),
  entc: id('a1000000', 6),
  electrical: id('a1000000', 7),
  medical: id('a1000000', 8),
  businessStudies: id('a1000000', 9),
  rotaract: id('a1000000', 10),
  csess: id('a1000000', 11),
  electronic: id('a1000000', 12),
  carrom: id('a1000000', 13),
  sliit: id('a2000000', 1),
  computing: id('a2000000', 2),
  software: id('a2000000', 3),
  society: id('a2000000', 4),
};
const deptIds: Record<string, string> = {
  CSE: orgIds.cse,
  ENTC: orgIds.entc,
  Electrical: orgIds.electrical,
  'Medical Sciences': orgIds.medical,
  'Business Studies': orgIds.businessStudies,
  'Software Engineering': orgIds.software,
};
const orgByName = new Map<string, Org>();
const makeOrg = (
  idValue: string,
  name: string,
  type: string,
  parentId: string | null,
  rootId: string,
  bonus: number,
): Org => ({
  id: idValue,
  name,
  type,
  parentId,
  rootId,
  joinBonusPoints: bonus,
});
const moratuwaOrgs: Org[] = [
  makeOrg(
    orgIds.uom,
    'University of Moratuwa',
    'UNIVERSITY',
    null,
    orgIds.uom,
    100,
  ),
  makeOrg(
    orgIds.engineering,
    'Faculty of Engineering',
    'FACULTY',
    orgIds.uom,
    orgIds.uom,
    50,
  ),
  makeOrg(
    orgIds.medicine,
    'Faculty of Medicine',
    'FACULTY',
    orgIds.uom,
    orgIds.uom,
    50,
  ),
  makeOrg(
    orgIds.business,
    'Faculty of Business',
    'FACULTY',
    orgIds.uom,
    orgIds.uom,
    50,
  ),
  makeOrg(
    orgIds.cse,
    'Department of Computer Science and Engineering (CSE)',
    'DEPARTMENT',
    orgIds.engineering,
    orgIds.uom,
    20,
  ),
  makeOrg(
    orgIds.entc,
    'Department of Electronic and Telecommunication Engineering (ENTC)',
    'DEPARTMENT',
    orgIds.engineering,
    orgIds.uom,
    20,
  ),
  makeOrg(
    orgIds.electrical,
    'Department of Electrical Engineering',
    'DEPARTMENT',
    orgIds.engineering,
    orgIds.uom,
    20,
  ),
  makeOrg(
    orgIds.medical,
    'Department of Medical Sciences',
    'DEPARTMENT',
    orgIds.medicine,
    orgIds.uom,
    20,
  ),
  makeOrg(
    orgIds.businessStudies,
    'Department of Business Studies',
    'DEPARTMENT',
    orgIds.business,
    orgIds.uom,
    20,
  ),
  makeOrg(orgIds.rotaract, 'Rotaract Club', 'CLUB', orgIds.uom, orgIds.uom, 10),
  makeOrg(orgIds.csess, 'CSESS', 'CLUB', orgIds.uom, orgIds.uom, 10),
  makeOrg(
    orgIds.electronic,
    'Electronic Club',
    'CLUB',
    orgIds.uom,
    orgIds.uom,
    10,
  ),
  makeOrg(orgIds.carrom, 'Carrom Club', 'CLUB', orgIds.uom, orgIds.uom, 10),
];
const sliitOrgs = [
  makeOrg(
    orgIds.sliit,
    'Sri Lanka Institute of Information Technology (SLIIT)',
    'UNIVERSITY',
    null,
    orgIds.sliit,
    100,
  ),
  makeOrg(
    orgIds.computing,
    'Faculty of Computing',
    'FACULTY',
    orgIds.sliit,
    orgIds.sliit,
    50,
  ),
  makeOrg(
    orgIds.software,
    'Department of Software Engineering',
    'DEPARTMENT',
    orgIds.computing,
    orgIds.sliit,
    20,
  ),
  makeOrg(
    orgIds.society,
    'Computing Society',
    'CLUB',
    orgIds.sliit,
    orgIds.sliit,
    10,
  ),
];
for (const organization of [...moratuwaOrgs, ...sliitOrgs])
  orgByName.set(organization.id, organization);

function namedAccount(index: number, domain: string) {
  const firstName = firstNames[index % firstNames.length];
  const lastName =
    lastNames[Math.floor(index / firstNames.length) % lastNames.length];
  return {
    email: `${firstName}.${lastName}${index + 1}@${domain}`.toLowerCase(),
    firstName,
    lastName,
  };
}

function localDate(
  base: Date,
  dayOffset: number,
  hour: number,
  minute = 0,
): Date {
  const shifted = new Date(base.getTime() + 330 * 60_000);
  return new Date(
    Date.UTC(
      shifted.getUTCFullYear(),
      shifted.getUTCMonth(),
      shifted.getUTCDate() + dayOffset,
      hour,
      minute,
    ) -
      330 * 60_000,
  );
}

function buildAccounts(): {
  students: Account[];
  lecturers: Account[];
  platform: Account;
  sliitStudents: Account[];
  sliitLecturers: Account[];
} {
  const students = uomStudents.map((account, index) => ({
    ...account,
    id: id('b1000000', index + 1),
    role: 'STUDENT' as const,
  }));
  const lecturers = lecturerNames.map((account, index) => ({
    ...account,
    id: id('b1000000', 101 + index),
    role: 'LECTURER' as const,
  }));
  const sliitStudents = Array.from({ length: 12 }, (_, index) => ({
    ...namedAccount(index + 160, 'sliit.lk'),
    group: 'Software Engineering',
    id: id('b2000000', index + 1),
    role: 'STUDENT' as const,
  }));
  const sliitLecturers = Array.from({ length: 3 }, (_, index) => ({
    ...namedAccount(index + 180, 'sliit.lk'),
    group: 'Software Engineering',
    id: id('b2000000', index + 101),
    role: 'LECTURER' as const,
  }));
  sliitLecturers[0] = {
    ...sliitLecturers[0],
    email: 'software.admin@sliit.lk',
  };
  const platform = {
    id: id('b3000000', 1),
    email: 'platform.admin@resourcehive.demo',
    firstName: 'Kavisha',
    lastName: 'Administrator',
    role: 'PLATFORM' as const,
  };
  return { students, lecturers, platform, sliitStudents, sliitLecturers };
}

async function removeLegacyDemo(
  transaction: Prisma.TransactionClient,
): Promise<void> {
  const legacyUsers = Array.from({ length: 10 }, (_, i) =>
    id('d1000000', i + 1),
  );
  const legacyRoot = 'd2000000-0000-4000-8000-000000000001';
  const users = Prisma.join(
    legacyUsers.map((value) => Prisma.sql`${value}::uuid`),
  );

  await transaction.$executeRaw`ALTER TABLE point_transactions DISABLE TRIGGER point_transactions_append_only`;
  await transaction.$executeRaw`DELETE FROM notification_deliveries WHERE user_id IN (${users}) OR root_organization_id = ${legacyRoot}::uuid`;
  await transaction.$executeRaw`DELETE FROM notifications WHERE user_id IN (${users}) OR root_organization_id = ${legacyRoot}::uuid`;
  await transaction.$executeRaw`DELETE FROM resource_ratings WHERE user_id IN (${users}) OR resource_id IN (SELECT id FROM resources WHERE root_organization_id = ${legacyRoot}::uuid)`;
  await transaction.$executeRaw`DELETE FROM booking_dispute_events WHERE root_organization_id = ${legacyRoot}::uuid`;
  await transaction.$executeRaw`DELETE FROM booking_disputes WHERE root_organization_id = ${legacyRoot}::uuid`;
  await transaction.$executeRaw`DELETE FROM point_transactions WHERE root_organization_id = ${legacyRoot}::uuid OR user_id IN (${users})`;
  await transaction.$executeRaw`DELETE FROM user_point_balances WHERE root_organization_id = ${legacyRoot}::uuid OR user_id IN (${users})`;
  await transaction.$executeRaw`DELETE FROM user_point_balances_legacy_quarantine WHERE user_id IN (${users})`;
  await transaction.$executeRaw`DELETE FROM bookings WHERE root_organization_id = ${legacyRoot}::uuid OR user_id IN (${users})`;
  await transaction.$executeRaw`DELETE FROM resource_slots WHERE root_organization_id = ${legacyRoot}::uuid`;
  await transaction.$executeRaw`DELETE FROM resource_allowed_organizations WHERE root_organization_id = ${legacyRoot}::uuid`;
  await transaction.$executeRaw`DELETE FROM resources WHERE root_organization_id = ${legacyRoot}::uuid`;
  await transaction.$executeRaw`ALTER TABLE point_transactions ENABLE TRIGGER point_transactions_append_only`;
  await transaction.$executeRaw`DELETE FROM web_push_subscriptions WHERE user_id IN (${users}) OR root_organization_id = ${legacyRoot}::uuid`;
  await transaction.$executeRaw`DELETE FROM refresh_tokens WHERE user_id IN (${users})`;
  await transaction.$executeRaw`DELETE FROM password_reset_tokens WHERE user_id IN (${users})`;
  await transaction.$executeRaw`DELETE FROM email_verification_tokens WHERE user_id IN (${users})`;
  await transaction.$executeRaw`DELETE FROM external_identities WHERE user_id IN (${users})`;
  await transaction.$executeRaw`DELETE FROM organization_email_allowlist WHERE organization_id IN (SELECT id FROM organizations WHERE root_organization_id = ${legacyRoot}::uuid)`;
  await transaction.$executeRaw`DELETE FROM organization_email_domains WHERE organization_id IN (SELECT id FROM organizations WHERE root_organization_id = ${legacyRoot}::uuid)`;
  await transaction.$executeRaw`DELETE FROM organization_memberships WHERE organization_id IN (SELECT id FROM organizations WHERE root_organization_id = ${legacyRoot}::uuid) OR user_id IN (${users})`;
  await transaction.$executeRaw`DELETE FROM organizations WHERE root_organization_id = ${legacyRoot}::uuid AND id <> ${legacyRoot}::uuid`;
  await transaction.$executeRaw`DELETE FROM organizations WHERE id = ${legacyRoot}::uuid`;
  await transaction.$executeRaw`DELETE FROM users WHERE id IN (${users})`;
}

const ADMIN_IDS = {
  uom: 'b1000000-0000-4000-8000-000000000101',
  engineering: 'b1000000-0000-4000-8000-000000000101',
  sliit: 'b2000000-0000-4000-8000-000000000101',
};

async function main(): Promise<void> {
  const accounts = buildAccounts();
  const hashByPassword = new Map<string, string>();
  for (const password of ['DemoPassword123!', 'Student123!', 'Admin123!'])
    hashByPassword.set(password, await bcrypt.hash(password, 12));
  const now = new Date();

  const result = await prisma.$transaction(
    async (tx) => {
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(${ADVISORY_LOCK_ID})`;
      const existing = await tx.universityDemoSeedRun.findUnique({
        where: { seedKey: SEED_KEY },
      });
      if (existing) return { seeded: false, summary: existing.summary };

      await removeLegacyDemo(tx);

      const users = [
        ...accounts.students,
        ...accounts.lecturers,
        ...accounts.sliitStudents,
        ...accounts.sliitLecturers,
        accounts.platform,
      ];
      await tx.user.createMany({
        data: users.map((user) => ({
          id: user.id,
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
          passwordHash: hashByPassword.get(
            user.email === 'engineering.student@uom.lk'
              ? 'Student123!'
              : user.email === 'engineering.admin@uom.lk'
                ? 'Admin123!'
                : 'DemoPassword123!',
          ),
          emailVerifiedAt: now,
          status: 'ACTIVE',
          platformRole: user.role === 'PLATFORM' ? 'PLATFORM_ADMIN' : 'USER',
          createdAt: new Date(now.getTime() - 70 * 86_400_000),
        })),
      });

      const organizations = [...moratuwaOrgs, ...sliitOrgs];
      for (const organization of organizations) {
        const creatorId =
          organization.rootId === orgIds.uom ? ADMIN_IDS.uom : ADMIN_IDS.sliit;
        await tx.organization.create({
          data: {
            id: organization.id,
            name: organization.name,
            type: organization.type,
            parentId: organization.parentId,
            rootOrganizationId: organization.rootId,
            joinBonusPoints: organization.joinBonusPoints,
            status: 'ACTIVE',
            createdBy: creatorId,
          },
        });
      }

      const emailDomains = [
        { organizationId: orgIds.uom, domain: 'uom.lk', autoJoin: true },
        { organizationId: orgIds.sliit, domain: 'sliit.lk', autoJoin: true },
      ];
      await tx.organizationEmailDomain.createMany({ data: emailDomains });

      const uomFacultyForDept: Record<string, string> = {
        CSE: orgIds.engineering,
        ENTC: orgIds.engineering,
        Electrical: orgIds.engineering,
        'Medical Sciences': orgIds.medicine,
        'Business Studies': orgIds.business,
      };
      const sliitLecturer = accounts.sliitLecturers[0].id;
      const adminForOrg = new Map<string, string>([
        [orgIds.uom, accounts.lecturers[0].id],
        [orgIds.engineering, accounts.lecturers[0].id],
        [orgIds.medicine, accounts.lecturers[12].id],
        [orgIds.business, accounts.lecturers[16].id],
        [orgIds.cse, accounts.lecturers[0].id],
        [orgIds.entc, accounts.lecturers[4].id],
        [orgIds.electrical, accounts.lecturers[8].id],
        [orgIds.medical, accounts.lecturers[12].id],
        [orgIds.businessStudies, accounts.lecturers[16].id],
        [orgIds.rotaract, accounts.students[3].id],
        [orgIds.csess, accounts.students[4].id],
        [orgIds.electronic, accounts.students[5].id],
        [orgIds.carrom, accounts.students[6].id],
        [orgIds.sliit, sliitLecturer],
        [orgIds.computing, sliitLecturer],
        [orgIds.software, sliitLecturer],
        [orgIds.society, accounts.sliitStudents[0].id],
      ]);

      const memberships: Array<Prisma.OrganizationMembershipCreateManyInput> =
        [];
      const addMembership = (
        user: Account,
        organizationId: string,
        options: {
          status?: string;
          role?: string;
          reviewer?: string;
          note?: string;
          day?: number;
        } = {},
      ) => {
        memberships.push({
          id: uuid('c1000000'),
          userId: user.id,
          organizationId,
          role: options.role ?? 'MEMBER',
          status: options.status ?? 'APPROVED',
          reviewedBy:
            options.status === 'PENDING'
              ? null
              : (options.reviewer ??
                adminForOrg.get(organizationId) ??
                ADMIN_IDS.uom),
          reviewedAt:
            options.status === 'PENDING'
              ? null
              : localDate(now, -(options.day ?? 35), 11),
          reviewNote:
            options.status === 'PENDING'
              ? null
              : (options.note ??
                'Reviewed during the University of Moratuwa demo setup.'),
          joinedAt: localDate(now, -(options.day ?? 40), 9),
        });
      };

      for (const student of accounts.students) {
        const faculty = uomFacultyForDept[student.group];
        addMembership(student, orgIds.uom);
        addMembership(student, faculty);
        addMembership(student, deptIds[student.group]);
      }
      for (const lecturer of accounts.lecturers) {
        const faculty = uomFacultyForDept[lecturer.group];
        addMembership(lecturer, orgIds.uom, {
          role:
            lecturer.id === accounts.lecturers[0].id ||
            lecturer.id === accounts.lecturers[3].id
              ? 'ADMIN'
              : 'MEMBER',
        });
        const facultyIndex = accounts.lecturers
          .filter((candidate) => uomFacultyForDept[candidate.group] === faculty)
          .indexOf(lecturer);
        addMembership(lecturer, faculty, {
          role: facultyIndex < 2 ? 'ADMIN' : 'MEMBER',
        });
        const inDept =
          accounts.lecturers
            .filter((candidate) => candidate.group === lecturer.group)
            .indexOf(lecturer) % 4;
        addMembership(lecturer, deptIds[lecturer.group], {
          role: inDept < 2 ? 'ADMIN' : 'MEMBER',
        });
      }
      for (const [index, student] of accounts.students.entries()) {
        if (index % 10 <= 2) continue;
        const count = 1 + (index % 3);
        for (let clubIndex = 0; clubIndex < count; clubIndex += 1)
          addMembership(
            student,
            [orgIds.rotaract, orgIds.csess, orgIds.electronic, orgIds.carrom][
              (index + clubIndex) % 4
            ],
            {
              role:
                [3, 4, 5, 6].includes(index) && clubIndex === 0
                  ? 'ADMIN'
                  : 'MEMBER',
            },
          );
      }
      for (const [index, student] of accounts.sliitStudents.entries()) {
        addMembership(student, orgIds.sliit);
        addMembership(student, orgIds.computing);
        addMembership(student, orgIds.software);
        if (index < 9)
          addMembership(student, orgIds.society, {
            role: index === 0 ? 'ADMIN' : 'MEMBER',
          });
      }
      for (const lecturer of accounts.sliitLecturers) {
        addMembership(lecturer, orgIds.sliit, { role: 'ADMIN' });
        addMembership(lecturer, orgIds.computing, {
          role: lecturer === accounts.sliitLecturers[0] ? 'ADMIN' : 'MEMBER',
        });
        addMembership(lecturer, orgIds.software, { role: 'ADMIN' });
      }
      for (const organizationId of [
        orgIds.sliit,
        orgIds.computing,
        orgIds.software,
      ])
        addMembership(accounts.students[0], organizationId);

      const studentsWithExtra = [
        ...accounts.students.slice(7, 100),
        ...accounts.sliitStudents.slice(3),
      ];
      const addNonDuplicateClubState = (
        user: Account,
        status: string,
        note?: string,
      ) => {
        const available = [
          orgIds.rotaract,
          orgIds.csess,
          orgIds.electronic,
          orgIds.carrom,
        ].find(
          (clubId) =>
            !memberships.some(
              (membership) =>
                membership.userId === user.id &&
                membership.organizationId === clubId,
            ),
        );
        if (!available)
          throw new Error(`No available club membership for ${user.email}`);
        addMembership(user, available, { status, note });
      };
      for (let i = 0; i < 24; i += 1)
        addNonDuplicateClubState(studentsWithExtra[i], 'PENDING');
      for (let i = 0; i < 8; i += 1)
        addNonDuplicateClubState(
          studentsWithExtra[30 + i],
          'REJECTED',
          'Please provide the requested club application details and reapply.',
        );
      for (let i = 0; i < 4; i += 1)
        addNonDuplicateClubState(
          studentsWithExtra[45 + i],
          'SUSPENDED',
          'Membership temporarily suspended for a sample review.',
        );

      await tx.organizationMembership.createMany({ data: memberships });
      const approvedMemberships = memberships.filter(
        (membership) => membership.status === 'APPROVED',
      );
      await tx.organizationMembershipAudit.createMany({
        data: approvedMemberships.slice(0, 72).map((membership) => ({
          id: uuid('c2000000'),
          membershipId: membership.id,
          actorUserId: membership.reviewedBy,
          action: 'APPROVED',
          note: 'Application checked and approved for this presentation dataset.',
          createdAt: membership.reviewedAt,
        })),
      });
      const rejectedMemberships = memberships.filter(
        (membership) => membership.status === 'REJECTED',
      );
      await tx.organizationMembershipAudit.createMany({
        data: rejectedMemberships.map((membership) => ({
          id: uuid('c2000000'),
          membershipId: membership.id,
          actorUserId: membership.reviewedBy,
          action: 'REJECTED',
          note: 'Please provide the requested club application details and reapply.',
          createdAt: membership.reviewedAt,
        })),
      });
      const adminMemberships = approvedMemberships.filter(
        (membership) => membership.role === 'ADMIN',
      );
      await tx.organizationMembershipAudit.createMany({
        data: adminMemberships.map((membership) => ({
          id: uuid('c2000000'),
          membershipId: membership.id,
          actorUserId: membership.reviewedBy,
          action: 'ADMIN_GRANTED',
          note: 'Administrator access assigned for the presentation dataset.',
          createdAt: membership.reviewedAt,
        })),
      });

      const emailsForAllowlist = [
        ...accounts.students.slice(0, 8),
        ...accounts.sliitStudents.slice(0, 4),
      ];
      await tx.organizationEmailAllowlist.createMany({
        data: emailsForAllowlist.map((student, index) => ({
          id: uuid('c3000000'),
          organizationId: student.email.endsWith('@sliit.lk')
            ? orgIds.sliit
            : orgIds.uom,
          email: student.email,
          addedBy: student.email.endsWith('@sliit.lk')
            ? sliitLecturer
            : ADMIN_IDS.uom,
          usedAt: index % 2 === 0 ? localDate(now, -8, 10) : null,
        })),
      });

      const tenants: DemoTenant[] = [
        {
          root: orgIds.uom,
          faculties: [orgIds.engineering, orgIds.medicine, orgIds.business],
          departments: [
            orgIds.cse,
            orgIds.entc,
            orgIds.electrical,
            orgIds.medical,
            orgIds.businessStudies,
          ],
          clubs: [
            orgIds.rotaract,
            orgIds.csess,
            orgIds.electronic,
            orgIds.carrom,
          ],
          students: accounts.students,
          lecturers: accounts.lecturers,
          orgAdmins: adminForOrg,
        },
        {
          root: orgIds.sliit,
          faculties: [orgIds.computing],
          departments: [orgIds.software],
          clubs: [orgIds.society],
          students: accounts.sliitStudents,
          lecturers: accounts.sliitLecturers,
          orgAdmins: adminForOrg,
        },
      ];
      const resourceNames = [
        'Central Lecture Theatre',
        'Department Seminar Room',
        'Digital Oscilloscope Kit',
        'Portable Projector',
        'Microcontroller Project Set',
        'Robotics Parts Kit',
        'Study Room',
        'Laboratory Bench Set',
        'Camera and Tripod',
        'PA System',
        'Carrom Board Set',
        'Electronics Tool Kit',
        '3D Printer Access',
        'Portable Screen',
        'Science Experiment Kit',
        'Event Table Kit',
        'Laptop Pool',
        'Engineering Design Kit',
        'Sound Mixer',
        'Workshop Safety Kit',
      ];
      const resources: Array<{
        id: string;
        name: string;
        description: string;
        owner: string;
        root: string;
        creator: string;
        pointCost: number;
        cancellationNoticeMinutes: number;
      }> = [];
      const resourceAllowed: Array<{
        resourceId: string;
        organizationId: string;
        rootOrganizationId: string;
      }> = [];
      for (const tenant of tenants) {
        const parents =
          tenant.root === orgIds.uom
            ? [
                tenant.root,
                ...tenant.faculties,
                ...tenant.departments,
                ...tenant.clubs,
              ]
            : [
                tenant.root,
                ...tenant.faculties,
                ...tenant.departments,
                ...tenant.clubs,
              ];
        const quantities =
          tenant.root === orgIds.uom
            ? [3, 3, 4, 5, 4, 4, 4, 2, 2, 2, 4, 2, 1]
            : [2, 1, 1, 2];
        for (const [ownerIndex, owner] of parents.entries()) {
          const count = quantities[ownerIndex] ?? 0;
          for (let index = 0; index < count; index += 1) {
            const resourceId = uuid('d1000000');
            const name = `${resourceNames[(resources.length + index) % resourceNames.length]} ${String(index + 1).padStart(2, '0')}`;
            const description = `Presentation inventory for ${orgByName.get(owner)?.name ?? 'the university'}; request it for study, teaching, laboratory, or campus-club use.`;
            resources.push({
              id: resourceId,
              name,
              description,
              owner,
              root: tenant.root,
              creator: tenant.orgAdmins.get(owner),
              pointCost: [0, 2, 5, 8, 12, 18][(resources.length + index) % 6],
              cancellationNoticeMinutes: 60,
            });
            const allowed = new Set([owner]);
            for (const candidate of parents) {
              let parentId = orgByName.get(candidate)?.parentId ?? null;
              while (parentId) {
                if (parentId === owner) allowed.add(candidate);
                parentId = orgByName.get(parentId)?.parentId ?? null;
              }
            }
            for (const organizationId of allowed)
              resourceAllowed.push({
                resourceId,
                organizationId,
                rootOrganizationId: tenant.root,
              });
          }
        }
      }
      await tx.resource.createMany({
        data: resources.map((resource) => ({
          id: resource.id,
          name: resource.name,
          description: resource.description,
          ownerOrganizationId: resource.owner,
          rootOrganizationId: resource.root,
          createdByUserId: resource.creator,
          pointCost: resource.pointCost,
          cancellationNoticeMinutes: resource.cancellationNoticeMinutes,
        })),
      });
      await tx.resourceAllowedOrganization.createMany({
        data: resourceAllowed,
      });

      const slots: Array<{
        id: string;
        resourceId: string;
        rootOrganizationId: string;
        startsAt: Date;
        endsAt: Date;
        status: string;
        withdrawnAt: Date | null;
      }> = [];
      for (const [resourceIndex, resource] of resources.entries()) {
        for (let slotIndex = 0; slotIndex < 20; slotIndex += 1) {
          const historicalDays = [
            -88, -78, -68, -58, -48, -38, -28, -18, -10, -6, -3, -1,
          ];
          const upcomingDays = [2, 5, 8, 11, 14, 17, 20, 21];
          const startsAt =
            slotIndex < 12
              ? localDate(
                  now,
                  historicalDays[slotIndex],
                  10 + (resourceIndex % 4) * 2,
                )
              : localDate(
                  now,
                  upcomingDays[slotIndex - 12],
                  10 + (resourceIndex % 4) * 2,
                );
          slots.push({
            id: uuid('d2000000'),
            resourceId: resource.id,
            rootOrganizationId: resource.root,
            startsAt,
            endsAt: new Date(startsAt.getTime() + 2 * 60 * 60_000),
            status: slotIndex === 19 ? 'WITHDRAWN' : 'PUBLISHED',
            withdrawnAt:
              slotIndex === 19 ? localDate(now, slotIndex - 10, 8) : null,
          });
        }
      }
      await tx.resourceSlot.createMany({ data: slots });

      const bookings: Array<{
        id: string;
        resourceSlotId: string;
        rootOrganizationId: string;
        userId: string;
        status: string;
        createdAt: Date;
        cancelledAt: Date | null;
        completedAt: Date | null;
        cancelledByUserId: string | null;
        cancellationReason: string | null;
        cancellationNoticeMinutes: number;
      }> = [];
      const appendBookings = (
        tenant: DemoTenant,
        completed: number,
        cancelled: number,
        confirmed: number,
      ) => {
        const tenantResources = resources.filter(
          (resource) => resource.root === tenant.root,
        );
        const tenantSlots = slots.filter(
          (slot) => slot.rootOrganizationId === tenant.root,
        );
        const users = tenant.students;
        let historicIndex = 0;
        let upcomingIndex = 0;
        const add = (
          status: 'COMPLETED' | 'CANCELLED' | 'CONFIRMED',
          bookingIndex: number,
        ) => {
          const slot =
            status === 'CONFIRMED'
              ? tenantSlots.filter(
                  (item) => item.startsAt > now && item.status === 'PUBLISHED',
                )[upcomingIndex++]
              : tenantSlots.filter(
                  (item) => item.startsAt < now && item.status === 'PUBLISHED',
                )[historicIndex++];
          if (!slot)
            throw new Error(
              `Not enough valid slots for ${tenant.root} ${status} bookings`,
            );
          const user =
            bookingIndex === 0
              ? accounts.students[0]
              : users[
                  (bookingIndex * 7 + (bookingIndex % users.length)) %
                    users.length
                ];
          const resource = tenantResources.find(
            (candidate) => candidate.id === slot.resourceId,
          );
          const bookingId = uuid('d3000000');
          const createdAt = new Date(slot.startsAt.getTime() - 8 * 86_400_000);
          bookings.push({
            id: bookingId,
            resourceSlotId: slot.id,
            rootOrganizationId: tenant.root,
            userId: user.id,
            status,
            createdAt,
            cancelledAt:
              status === 'CANCELLED'
                ? new Date(slot.startsAt.getTime() - 86_400_000)
                : null,
            completedAt:
              status === 'COMPLETED'
                ? new Date(slot.startsAt.getTime() + 3 * 60 * 60_000)
                : null,
            cancelledByUserId:
              status === 'CANCELLED'
                ? bookingIndex % 2 === 0
                  ? user.id
                  : tenant.orgAdmins.get(resource.owner)
                : null,
            cancellationReason:
              status === 'CANCELLED'
                ? bookingIndex % 2 === 0
                  ? 'Schedule changed; slot released after cancellation.'
                  : 'Equipment was withdrawn during routine maintenance.'
                : null,
            cancellationNoticeMinutes: 60,
          });
          return {
            bookingId,
            userId: user.id,
            root: tenant.root,
            resource,
            slot,
            status,
          };
        };
        const records = [
          ...Array.from({ length: completed }, (_, i) => add('COMPLETED', i)),
          ...Array.from({ length: cancelled }, (_, i) =>
            add('CANCELLED', completed + i),
          ),
          ...Array.from({ length: confirmed }, (_, i) =>
            add('CONFIRMED', completed + cancelled + i),
          ),
        ];
        return records;
      };
      const uomBookings = appendBookings(tenants[0], 120, 40, 40);
      const sliitBookings = appendBookings(tenants[1], 20, 5, 5);
      await tx.booking.createMany({ data: bookings });
      for (const booking of bookings) {
        if (
          booking.status === 'CANCELLED' &&
          booking.cancelledByUserId !== booking.userId
        ) {
          await tx.resourceSlot.update({
            where: { id: booking.resourceSlotId },
            data: { status: 'WITHDRAWN', withdrawnAt: booking.cancelledAt },
          });
        }
      }

      const pointTransactions: Array<{
        id: string;
        userId: string;
        rootOrganizationId: string;
        amount: number;
        transactionType: string;
        sourceOrganizationId: string | null;
        bookingId: string | null;
        description: string;
        createdAt: Date;
      }> = [];
      for (const booking of [...uomBookings, ...sliitBookings]) {
        const cost = booking.resource.pointCost;
        if (cost > 0)
          pointTransactions.push({
            id: uuid('d4000000'),
            userId: booking.userId,
            rootOrganizationId: booking.root,
            amount: -cost,
            transactionType: 'BOOKING',
            sourceOrganizationId: null,
            bookingId: booking.bookingId,
            description: `Resource booking: ${booking.resource.name}`,
            createdAt: bookings.find((item) => item.id === booking.bookingId)
              .createdAt,
          });
        if (booking.status === 'CANCELLED' && cost > 0) {
          const fullRefund =
            bookings.find((item) => item.id === booking.bookingId)
              .cancelledByUserId !== booking.userId;
          const refund = fullRefund ? cost : Math.ceil(cost / 2);
          pointTransactions.push({
            id: uuid('d4000000'),
            userId: booking.userId,
            rootOrganizationId: booking.root,
            amount: refund,
            transactionType: 'BOOKING_REFUND',
            sourceOrganizationId: null,
            bookingId: booking.bookingId,
            description: 'Refund for cancelled presentation booking',
            createdAt: bookings.find((item) => item.id === booking.bookingId)
              .cancelledAt,
          });
        }
      }
      for (const tenant of tenants) {
        const semesterRootUsers = [
          ...tenant.students,
          ...tenant.lecturers,
          ...(tenant.root === orgIds.sliit ? [accounts.students[0]] : []),
        ].filter((user) => user.role !== 'PLATFORM');
        for (const user of semesterRootUsers)
          pointTransactions.push({
            id: uuid('d4000000'),
            userId: user.id,
            rootOrganizationId: tenant.root,
            amount: 40,
            transactionType: 'SEMESTER_ALLOCATION',
            sourceOrganizationId: tenant.root,
            bookingId: null,
            description: 'Semester opening allocation for demo activities',
            createdAt: localDate(now, -60, 9),
          });
      }
      await tx.pointTransaction.createMany({ data: pointTransactions });
      const negativeBalances = await tx.$queryRaw<
        Array<{
          user_id: string;
          root_organization_id: string;
          available_points: number;
        }>
      >`SELECT user_id, root_organization_id, available_points FROM user_point_balances WHERE available_points < 0`;
      if (negativeBalances.length)
        throw new Error(
          `Point ledger produced ${negativeBalances.length} negative balances`,
        );
      const ledgerMismatches = await tx.$queryRaw<
        Array<{ mismatch_count: bigint }>
      >`
      SELECT COUNT(*) AS mismatch_count
      FROM user_point_balances AS balance
      FULL OUTER JOIN (
        SELECT user_id, root_organization_id, SUM(amount)::integer AS ledger_total
        FROM point_transactions
        GROUP BY user_id, root_organization_id
      ) AS ledger USING (user_id, root_organization_id)
      WHERE COALESCE(balance.available_points, 0) <> COALESCE(ledger.ledger_total, 0)
    `;
      if (ledgerMismatches[0]?.mismatch_count !== 0n)
        throw new Error(
          'University demo point balances do not reconcile with the append-only ledger',
        );

      const disputes = uomBookings
        .filter((booking) => booking.status === 'COMPLETED')
        .slice(0, 12);
      const disputeIds = disputes.map(() => uuid('d5000000'));
      const disputeStates = [
        'OPEN',
        'OPEN',
        'OPEN',
        'UNDER_REVIEW',
        'UNDER_REVIEW',
        'UNDER_REVIEW',
        'RESOLVED',
        'RESOLVED',
        'RESOLVED',
        'REJECTED',
        'REJECTED',
        'REJECTED',
      ];
      await tx.bookingDispute.createMany({
        data: disputes.map((booking, index) => {
          const status = disputeStates[index];
          const terminal = status === 'RESOLVED' || status === 'REJECTED';
          return {
            id: disputeIds[index],
            bookingId: booking.bookingId,
            rootOrganizationId: orgIds.uom,
            resolverOrganizationId: booking.resource.owner,
            submittedByUserId: booking.userId,
            reason: ['BROKEN', 'UNAVAILABLE', 'NOT_AS_DESCRIBED', 'OTHER'][
              index % 4
            ],
            description: `Demo case ${index + 1}: student reported a ${['damaged item', 'missing return', 'misplaced component', 'booking concern'][index % 4]} for ${booking.resource.name}.`,
            evidence: [
              {
                label: 'Presentation evidence',
                url: `https://example.invalid/demo-evidence/${index + 1}`,
              },
            ],
            status,
            resolutionNotes: terminal
              ? index % 2 === 0
                ? 'Replacement arranged and case closed for the presentation.'
                : 'Evidence reviewed; report was not substantiated.'
              : status === 'UNDER_REVIEW'
                ? 'Administrator is checking the handover details.'
                : null,
            reviewedByUserId:
              status === 'UNDER_REVIEW' || terminal
                ? tenantAdminForResource(booking.resource.owner, adminForOrg)
                : null,
            createdAt: new Date(
              booking.slot.startsAt.getTime() + 4 * 60 * 60_000,
            ),
            updatedAt: new Date(
              booking.slot.startsAt.getTime() +
                (terminal ? 48 : status === 'UNDER_REVIEW' ? 24 : 4) *
                  60 *
                  60_000,
            ),
            resolvedAt: terminal
              ? new Date(booking.slot.startsAt.getTime() + 48 * 60 * 60_000)
              : null,
          };
        }),
      });
      await tx.bookingDisputeEvent.createMany({
        data: disputes.flatMap((booking, index) => {
          const status = disputeStates[index];
          const first = {
            id: uuid('d6000000'),
            disputeId: disputeIds[index],
            rootOrganizationId: orgIds.uom,
            actorUserId: booking.userId,
            fromStatus: null,
            toStatus: 'OPEN',
            notes: 'Student submitted a dispute for review.',
            createdAt: new Date(
              booking.slot.startsAt.getTime() + 4 * 60 * 60_000,
            ),
          };
          if (status === 'OPEN') return [first];
          const reviewer = tenantAdminForResource(
            booking.resource.owner,
            adminForOrg,
          );
          const second = {
            id: uuid('d6000000'),
            disputeId: disputeIds[index],
            rootOrganizationId: orgIds.uom,
            actorUserId: reviewer,
            fromStatus: 'OPEN',
            toStatus: 'UNDER_REVIEW',
            notes: 'Administrator began reviewing the case.',
            createdAt: new Date(
              booking.slot.startsAt.getTime() + 24 * 60 * 60_000,
            ),
          };
          if (status === 'UNDER_REVIEW') return [first, second];
          return [
            first,
            second,
            {
              id: uuid('d6000000'),
              disputeId: disputeIds[index],
              rootOrganizationId: orgIds.uom,
              actorUserId: reviewer,
              fromStatus: 'UNDER_REVIEW',
              toStatus: status,
              notes:
                status === 'RESOLVED'
                  ? 'Resolution recorded after review.'
                  : 'Reviewed and rejected with an explanation for the student.',
              createdAt: new Date(
                booking.slot.startsAt.getTime() + 48 * 60 * 60_000,
              ),
            },
          ];
        }),
      });
      for (const index of [3, 4])
        await tx.resource.update({
          where: { id: disputes[index].resource.id },
          data: { status: 'INACTIVE', unavailableDisputeId: disputeIds[index] },
        });

      const ratings = [...uomBookings, ...sliitBookings]
        .filter((booking) => booking.status === 'COMPLETED')
        .slice(0, 36)
        .map((booking, index) => ({
          id: uuid('d7000000'),
          resourceId: booking.resource.id,
          userId: booking.userId,
          rating: index % 5 === 0 ? 4 : 5,
          comment: [
            'Worked well for our project.',
            'Easy to collect and return.',
            'Very useful for the lab session.',
          ][index % 3],
          createdAt: new Date(
            booking.slot.startsAt.getTime() + 4 * 60 * 60_000,
          ),
        }));
      await tx.resourceRating.createMany({
        data: ratings,
        skipDuplicates: true,
      });

      const notifications: Array<{
        id: string;
        userId: string;
        rootOrganizationId: string;
        type: string;
        title: string;
        message: string;
        data: Prisma.InputJsonValue;
        readAt: Date | null;
        createdAt: Date;
        updatedAt: Date;
      }> = [];
      for (const tenant of tenants) {
        const userBase = [
          ...tenant.students,
          ...tenant.lecturers,
          ...(tenant.root === orgIds.sliit ? [accounts.students[0]] : []),
        ];
        for (const [index, user] of userBase.entries()) {
          const notificationOrg =
            index % 4 === 0
              ? tenant.root
              : index % 4 === 1
                ? tenant.departments[index % tenant.departments.length]
                : tenant.root;
          notifications.push({
            id: uuid('d8000000'),
            userId: user.id,
            rootOrganizationId: tenant.root,
            type: index % 3 === 0 ? 'MEMBERSHIP_APPROVED' : 'BOOKING_CONFIRMED',
            title:
              index % 3 === 0 ? 'Membership approved' : 'Booking confirmed',
            message:
              index % 3 === 0
                ? `Your membership at ${orgByName.get(notificationOrg)?.name ?? 'your university'} has been approved.`
                : 'Your presentation resource booking is confirmed.',
            data: { organizationId: notificationOrg, demo: true },
            readAt: index % 2 === 0 ? localDate(now, -1, 14) : null,
            createdAt: localDate(now, -3 + (index % 3), 9),
            updatedAt: localDate(now, -2 + (index % 3), 9),
          });
        }
      }
      for (const tenantBookings of [uomBookings, sliitBookings])
        for (const booking of tenantBookings.slice(0, 30))
          notifications.push({
            id: uuid('d8000000'),
            userId: booking.userId,
            rootOrganizationId: booking.root,
            type:
              booking.status === 'COMPLETED'
                ? 'BOOKING_COMPLETED'
                : booking.status === 'CANCELLED'
                  ? 'BOOKING_CANCELLED'
                  : 'BOOKING_CONFIRMED',
            title:
              booking.status === 'COMPLETED'
                ? 'Booking completed'
                : booking.status === 'CANCELLED'
                  ? 'Booking cancelled'
                  : 'Booking confirmed',
            message: `${booking.resource.name}: presentation booking status is ${booking.status.toLowerCase()}.`,
            data: {
              bookingId: booking.bookingId,
              organizationId: booking.root,
              demo: true,
            },
            readAt:
              booking.status === 'COMPLETED' ? booking.slot.startsAt : null,
            createdAt: bookings.find((item) => item.id === booking.bookingId)
              .createdAt,
            updatedAt: bookings.find((item) => item.id === booking.bookingId)
              .createdAt,
          });
      await tx.notification.createMany({ data: notifications });

      const deliveries = notifications
        .slice(0, 12)
        .map((notification, index) => ({
          id: uuid('d9000000'),
          userId: notification.userId,
          rootOrganizationId: notification.rootOrganizationId,
          notificationId: notification.id,
          channel: index % 2 === 0 ? 'EMAIL' : 'PUSH',
          destination:
            index % 2 === 0
              ? 'presentation-no-send@example.invalid'
              : `demo-device-${index}`,
          subject: notification.title,
          body: notification.message,
          data: { demo: true, providerCalled: false },
          status: index % 3 === 0 ? 'FAILED' : 'SENT',
          attemptCount: index % 3 === 0 ? 3 : 1,
          providerMessageId: null,
          lastError:
            index % 3 === 0
              ? 'Presentation history fixture. No notification provider was called.'
              : null,
          nextAttemptAt: null,
          createdAt: localDate(now, -2, 15),
          updatedAt: localDate(now, -1, 15),
        }));
      await tx.notificationDelivery.createMany({ data: deliveries });

      const counts = await Promise.all([
        tx.user.count({ where: { id: { in: users.map((user) => user.id) } } }),
        tx.organization.count({
          where: {
            id: { in: organizations.map((organization) => organization.id) },
          },
        }),
        tx.organizationMembership.count({
          where: {
            userId: { in: users.map((user) => user.id) },
            status: 'PENDING',
          },
        }),
        tx.booking.count({
          where: { rootOrganizationId: orgIds.uom, status: 'COMPLETED' },
        }),
        tx.booking.count({
          where: { rootOrganizationId: orgIds.uom, status: 'CANCELLED' },
        }),
        tx.booking.count({
          where: { rootOrganizationId: orgIds.uom, status: 'CONFIRMED' },
        }),
        tx.booking.count({
          where: { rootOrganizationId: orgIds.sliit, status: 'COMPLETED' },
        }),
        tx.booking.count({
          where: { rootOrganizationId: orgIds.sliit, status: 'CANCELLED' },
        }),
        tx.booking.count({
          where: { rootOrganizationId: orgIds.sliit, status: 'CONFIRMED' },
        }),
        tx.resource.count({ where: { rootOrganizationId: orgIds.uom } }),
        tx.resource.count({ where: { rootOrganizationId: orgIds.sliit } }),
      ]);
      const [
        userCount,
        orgCount,
        pendingCount,
        uomCompleted,
        uomCancelled,
        uomConfirmed,
        sliitCompleted,
        sliitCancelled,
        sliitConfirmed,
        uomResources,
        sliitResources,
      ] = counts;
      if (
        accounts.students.length !== 100 ||
        accounts.lecturers.length !== 20 ||
        accounts.sliitStudents.length !== 12 ||
        userCount !== users.length ||
        orgCount !== 17 ||
        pendingCount !== 24 ||
        uomResources !== 40 ||
        sliitResources !== 6 ||
        [uomCompleted, uomCancelled, uomConfirmed].join(',') !== '120,40,40' ||
        [sliitCompleted, sliitCancelled, sliitConfirmed].join(',') !== '20,5,5'
      )
        throw new Error(
          `University demo integrity check failed (users=${userCount}/${users.length}, organizations=${orgCount}, pending=${pendingCount}, Moratuwa bookings=${uomCompleted}/${uomCancelled}/${uomConfirmed}, SLIIT bookings=${sliitCompleted}/${sliitCancelled}/${sliitConfirmed}, resources=${uomResources}/${sliitResources}, account groups=${accounts.students.length}/${accounts.lecturers.length}/${accounts.sliitStudents.length})`,
        );

      const summary = {
        moratuwa: {
          students: accounts.students.length,
          lecturers: accounts.lecturers.length,
          resources: uomResources,
          bookings: {
            completed: uomCompleted,
            cancelled: uomCancelled,
            confirmed: uomConfirmed,
          },
        },
        sliit: {
          students: accounts.sliitStudents.length,
          lecturers: accounts.sliitLecturers.length,
          sharedStudents: 1,
          resources: sliitResources,
          bookings: {
            completed: sliitCompleted,
            cancelled: sliitCancelled,
            confirmed: sliitConfirmed,
          },
        },
        pendingMemberships: pendingCount,
        notifications: notifications.length,
      };
      await tx.universityDemoSeedRun.create({
        data: { seedKey: SEED_KEY, summary },
      });
      return { seeded: true, summary };
    },
    {
      maxWait: 15_000,
      timeout: 120_000,
      isolationLevel: Prisma.TransactionIsolationLevel.ReadCommitted,
    },
  );

  console.log(
    result.seeded
      ? 'University demo dataset seeded.'
      : 'University demo seed already completed; existing data left unchanged.',
  );
  console.log(JSON.stringify(result.summary));
}

function tenantAdminForResource(
  ownerId: string,
  admins: Map<string, string>,
): string {
  return admins.get(ownerId) ?? admins.get(orgIds.engineering);
}

function safeErrorMessage(error: unknown): string {
  const message =
    error instanceof Error
      ? error.message
      : typeof error === 'string'
        ? error
        : (JSON.stringify(error) ?? 'Unknown error');
  return message
    .replace(/(postgres(?:ql)?:\/\/[^:\s/]+:)[^@\s/]+@/gi, '$1[redacted]@')
    .replace(/([?&](?:password|token|secret)=)[^&\s]+/gi, '$1[redacted]');
}

main()
  .catch((error: unknown) => {
    console.error(
      'University demo seed failed; its transaction was rolled back.',
    );
    console.error(safeErrorMessage(error));
    process.exitCode = 1;
  })
  .finally(async () => prisma.$disconnect());
