import { PrismaClient, type DocumentKey, type DocumentStatus } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

type DocState = { s: DocumentStatus; f?: string };
type DocMap = Partial<Record<DocumentKey, DocState>>;
type Ref = { name: string; provider: string; passed?: boolean };

const DOC_KEYS: DocumentKey[] = ['REG', 'ASIC', 'ID', 'PIER'];

// A subset of the prototype's mock agents, with realistic document/reference
// states so the review workflow has something to show. Extend freely.
const agents: Array<{
  business: string;
  contactName: string;
  country: string;
  city: string;
  email: string;
  phone: string;
  type: 'EDUCATION' | 'DUAL';
  status: 'NEW_REQUEST' | 'IN_REVIEW' | 'PENDING_DOCUMENTS' | 'ACTIVE' | 'TERMINATED';
  onshore: boolean;
  rating?: 'A' | 'B' | 'C';
  abn?: string;
  acn?: string;
  stage?: number;
  daysAgo?: number; // backdate submittedAt so the work queue shows priority variety
  docs: DocMap;
  refs?: Ref[];
}> = [
  {
    business: 'Global Reach Education', contactName: 'Priya Sharma', country: 'India', city: 'Mumbai',
    email: 'priya@globalreach.in', phone: '+91 98200 11234', type: 'EDUCATION', status: 'NEW_REQUEST', onshore: false,
    abn: '53 100 200 300', acn: '100 200 300', daysAgo: 5,
    docs: { REG: { s: 'VERIFIED' }, ASIC: { s: 'VERIFIED' }, ID: { s: 'VERIFIED' }, PIER: { s: 'PENDING', f: 'qeac-certificate.pdf' } },
    refs: [{ name: 'Meera Iyer', provider: 'Bright CRICOS Institute' }, { name: 'David Chan', provider: 'Harbour College' }],
  },
  {
    business: 'Himalayan Pathways', contactName: 'Anish Gurung', country: 'Nepal', city: 'Kathmandu',
    email: 'anish@himalayanpath.np', phone: '+977 9841 552210', type: 'EDUCATION', status: 'IN_REVIEW', onshore: true,
    abn: '53 101 201 301', acn: '101 201 301',
    docs: { REG: { s: 'VERIFIED' }, ASIC: { s: 'PENDING', f: 'asic-extract.pdf' }, ID: { s: 'MISSING' } },
    refs: [{ name: 'S. Thapa', provider: 'Sydney Skills Academy', passed: true }, { name: 'R. Lama', provider: 'Coastline College' }],
  },
  {
    business: 'Dragon Gate Consultants', contactName: 'Li Wei', country: 'China', city: 'Beijing',
    email: 'liwei@dragongate.cn', phone: '+86 138 0011 8899', type: 'EDUCATION', status: 'ACTIVE', onshore: false, rating: 'A',
    abn: '53 100 200 300', acn: '100 200 300',
    docs: { REG: { s: 'VERIFIED' }, ASIC: { s: 'VERIFIED' }, ID: { s: 'VERIFIED' }, PIER: { s: 'VERIFIED' } },
    refs: [{ name: 'H. Zhang', provider: 'Anchor College', passed: true }, { name: 'M. Guo', provider: 'Vista Institute', passed: true }],
  },
  {
    business: 'Dhaka Global Ed', contactName: 'Rahim Ahmed', country: 'Bangladesh', city: 'Dhaka',
    email: 'rahim@dhakaglobal.bd', phone: '+880 171 234 5678', type: 'DUAL', status: 'PENDING_DOCUMENTS', onshore: false,
    abn: '53 103 203 303', acn: '103 203 303',
    docs: { REG: { s: 'VERIFIED' }, ASIC: { s: 'MISSING' }, ID: { s: 'VERIFIED' }, PIER: { s: 'PENDING' }, MARN: { s: 'MISSING' } },
    refs: [{ name: 'K. Islam', provider: 'Metro College', passed: true }],
  },
  {
    business: 'Karachi Edu Partners', contactName: 'Bilal Khan', country: 'Pakistan', city: 'Karachi',
    email: 'bilal@karachiedu.pk', phone: '+92 300 123 4567', type: 'EDUCATION', status: 'TERMINATED', onshore: false, rating: 'C',
    docs: {},
  },
];

function buildDocs(map: DocMap, dual: boolean) {
  const keys = dual ? [...DOC_KEYS, 'MARN' as DocumentKey] : DOC_KEYS;
  return keys.map((key) => ({
    key,
    status: map[key]?.s ?? ('MISSING' as DocumentStatus),
    fileName: map[key]?.f ?? null,
  }));
}

async function main() {
  // Delete in FK-safe order: audit events, then users (reference agents), then agents.
  await prisma.auditEvent.deleteMany();
  await prisma.user.deleteMany();
  await prisma.agent.deleteMany();

  await prisma.user.create({
    data: {
      username: 'robin.admin',
      email: 'robin.admin@australiancollege.edu.au',
      name: 'Robin Mercer',
      role: 'ADMIN',
      // Demo credentials — username: robin.admin / password: AgentPortal26
      passwordHash: await bcrypt.hash('AgentPortal26', 10),
    },
  });

  let i = 0;
  for (const a of agents) {
    const { docs, refs, daysAgo, ...rest } = a;
    await prisma.agent.create({
      data: {
        appId: `AMP-26-${1001 + i}`,
        ...rest,
        ...(daysAgo ? { submittedAt: new Date(Date.now() - daysAgo * 24 * 60 * 60 * 1000) } : {}),
        documents: { create: buildDocs(docs, a.type === 'DUAL') },
        references: {
          create: (refs ?? []).map((r) => ({
            refereeName: r.name,
            cricosProvider: r.provider,
            outcome: r.passed ? ('PASSED' as const) : ('PENDING' as const),
          })),
        },
      },
    });
    i += 1;
  }

  // ── Agent-portal demo accounts (AGENT) each with a DRAFT application to fill in ──
  const portalAgents = [
    { username: 'arunima', name: 'Arunima Sen', business: 'Arunima Overseas Education', city: 'Kolkata', email: 'arunima@example.com', phone: '+91 98300 55667' },
    { username: 'rohan', name: 'Rohan Mehta', business: 'Rohan Education Consultants', city: 'Pune', email: 'rohan@example.com', phone: '+91 98220 33445' },
    { username: 'priyanka', name: 'Priyanka Rao', business: 'Priyanka Global Studies', city: 'Bengaluru', email: 'priyanka@example.com', phone: '+91 98450 66778' },
    { username: 'sneha', name: 'Sneha Nair', business: 'Sneha Overseas Advisors', city: 'Kochi', email: 'sneha@example.com', phone: '+91 94470 88990' },
    { username: 'vikram', name: 'Vikram Malhotra', business: 'Vikram Study Abroad', city: 'Delhi', email: 'vikram@example.com', phone: '+91 98110 22334' },
    { username: 'ananya', name: 'Ananya Das', business: 'Ananya Education Services', city: 'Hyderabad', email: 'ananya@example.com', phone: '+91 99490 55667' },
    { username: 'kabir', name: 'Kabir Shah', business: 'Kabir Global Pathways', city: 'Ahmedabad', email: 'kabir@example.com', phone: '+91 99250 88990' },
  ];

  // Two pending referees per portal agent so Stage 3 (References) has something to approve.
  const portalRefs = [
    { name: 'Meera Iyer', provider: 'Bright CRICOS Institute' },
    { name: 'David Chan', provider: 'Harbour College' },
  ];

  let j = agents.length;
  for (const pa of portalAgents) {
    const rec = await prisma.agent.create({
      data: {
        appId: `AMP-26-${1001 + j}`,
        business: pa.business,
        contactName: pa.name,
        country: 'India',
        city: pa.city,
        email: pa.email,
        phone: pa.phone,
        type: 'EDUCATION',
        status: 'DRAFT',
        documents: { create: DOC_KEYS.map((key) => ({ key, status: 'MISSING' as const })) },
        references: { create: portalRefs.map((r) => ({ refereeName: r.name, cricosProvider: r.provider, outcome: 'PENDING' as const })) },
      },
    });
    await prisma.user.create({
      data: {
        username: pa.username,
        email: pa.email,
        name: pa.name,
        role: 'AGENT',
        passwordHash: await bcrypt.hash('AgentPortal26', 10),
        agentId: rec.id,
      },
    });
    j += 1;
  }

  console.log(`Seeded ${agents.length} agents + admin + ${portalAgents.length} portal-agent accounts.`);
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (err) => {
    console.error(err);
    await prisma.$disconnect();
    process.exit(1);
  });
