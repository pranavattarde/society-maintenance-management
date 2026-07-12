require('dotenv').config({ path: '../.env' });

const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcrypt');
const { BCRYPT_SALT_ROUNDS, STATUS, PRIORITY, CATEGORY } = require('../src/utils/constants');

const prisma = new PrismaClient();

async function seed() {
  console.log('Clearing existing database records...');
  // Delete in order of dependency
  await prisma.complaintHistory.deleteMany({});
  await prisma.complaint.deleteMany({});
  await prisma.notice.deleteMany({});
  await prisma.user.deleteMany({});

  console.log('Generating password hashes...');
  const adminPassword = await bcrypt.hash('admin@123', BCRYPT_SALT_ROUNDS);
  const residentPassword = await bcrypt.hash('resident@123', BCRYPT_SALT_ROUNDS);

  console.log('Seeding Admins...');
  const admin1 = await prisma.user.create({
    data: {
      name: 'Society Admin (Operations)',
      email: 'admin@society.com',
      password: adminPassword,
      role: 'ADMIN',
      flatNumber: 'OFFICE-01',
      phone: '9888877777',
    },
  });

  const admin2 = await prisma.user.create({
    data: {
      name: 'Committee President',
      email: 'admin2@society.com',
      password: adminPassword,
      role: 'ADMIN',
      flatNumber: 'OFFICE-02',
      phone: '9888866666',
    },
  });

  console.log('Seeding Residents...');
  const residentsData = [
    { name: 'Test Resident', email: 'resident@society.com', flatNumber: 'A-101', phone: '9876543210' },
    { name: 'Aravind Sharma', email: 'aravind@society.com', flatNumber: 'B-304', phone: '9876543211' },
    { name: 'Meera Nair', email: 'meera@society.com', flatNumber: 'C-502', phone: '9876543212' },
    { name: 'Rahul Verma', email: 'rahul@society.com', flatNumber: 'A-708', phone: '9876543213' },
    { name: 'Priya Patel', email: 'priya@society.com', flatNumber: 'D-102', phone: '9876543214' },
    { name: 'Vikram Malhotra', email: 'vikram@society.com', flatNumber: 'B-605', phone: '9876543215' },
  ];

  const residents = [];
  for (const r of residentsData) {
    const created = await prisma.user.create({
      data: {
        name: r.name,
        email: r.email,
        password: residentPassword,
        role: 'RESIDENT',
        flatNumber: r.flatNumber,
        phone: r.phone,
      },
    });
    residents.push(created);
  }

  console.log('Seeding Pinned and Active Notices...');
  await prisma.notice.createMany({
    data: [
      {
        title: 'Annual Water Tank Cleaning Schedule - Towers A to D',
        content: 'Please note that the main overhead water tanks for all towers will undergo professional cleaning this Wednesday, 15th July, from 9:00 AM to 5:00 PM. Water supply will be suspended during this window. Residents are requested to store sufficient water in advance. We apologize for the inconvenience.',
        isPinned: true,
        authorId: admin1.id,
        createdAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
        updatedAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
      },
      {
        title: 'Visitor Management & Vehicle Parking Guidelines',
        content: 'To enhance society security, all visitors must register at the gate via the visitor portal. P1 levels are strictly reserved for resident vehicle stickers. Visitors must park only in the designated "V" marked bays on Level P2. Vehicles parked in incorrect slots will be clamped with a penalty fee of Rs. 500.',
        isPinned: true,
        authorId: admin2.id,
        createdAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000),
        updatedAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000),
      },
      {
        title: 'Upcoming Scheduled Power Interruption for DG Testing',
        content: 'Our diesel generator backup system is scheduled for its quarterly load testing on Friday, 17th July, between 2:00 PM and 4:00 PM. Expect temporary power fluctuations of 1-2 minutes during switchovers. Heavy appliances should be kept switched off during this timeframe.',
        isPinned: false,
        authorId: admin1.id,
        createdAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000),
        updatedAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000),
      },
    ],
  });

  console.log('Seeding 25 Realistic Complaints & Timelines...');
  
  const complaintsDraft = [
    // --- LIFT ---
    {
      title: 'Lift A-2 elevator buttons not registering floor numbers',
      description: 'The lift A-2 in Tower A has an issue where pressing floors 4, 7, and 9 does not light up or trigger. The elevator bypasses these floors entirely. This is causing significant inconvenience to the residents of these floors.',
      category: CATEGORY.LIFT,
      priority: PRIORITY.HIGH,
      status: STATUS.IN_PROGRESS,
      daysAgo: 3,
      historySteps: [
        { from: STATUS.OPEN, to: STATUS.IN_PROGRESS, remark: 'Elevator technician dispatch scheduled for Wednesday morning.', byAdmin: true },
      ],
    },
    {
      title: 'Strange scraping noise from Lift B-1 during movement',
      description: 'There is a loud metal scraping sound whenever Lift B-1 crosses the 5th floor. It vibrates slightly too. Seems like a cable or guide rail issue. Needs urgent inspection before it stops completely.',
      category: CATEGORY.LIFT,
      priority: PRIORITY.HIGH,
      status: STATUS.OPEN,
      daysAgo: 1,
      historySteps: [],
    },
    {
      title: 'Lift cabin fan and lights not operational in C-2',
      description: 'The ventilation fan and the main tube lights are dead inside the C-2 lift car. It gets very suffocating and dark inside, making it uncomfortable for senior citizens and children.',
      category: CATEGORY.LIFT,
      priority: PRIORITY.MEDIUM,
      status: STATUS.RESOLVED,
      daysAgo: 10,
      historySteps: [
        { from: STATUS.OPEN, to: STATUS.IN_PROGRESS, remark: 'Assigned to vendor electric crew.', byAdmin: true },
        { from: STATUS.IN_PROGRESS, to: STATUS.RESOLVED, remark: 'Replaced dead LED panel and cabin exhaust fan motor. Checked and verified.', byAdmin: true },
      ],
    },
    // --- PLUMBING ---
    {
      title: 'Main pipeline water leak in basement level P1',
      description: 'There is a heavy water leak near column B-12 in basement P1. Clean water is continuously leaking onto the floor, causing flooding and slippery parking spots. Looks like a joint fracture on the main riser pipe.',
      category: CATEGORY.PLUMBING,
      priority: PRIORITY.HIGH,
      status: STATUS.IN_PROGRESS,
      daysAgo: 2,
      historySteps: [
        { from: STATUS.OPEN, to: STATUS.IN_PROGRESS, remark: 'Emergency plumbing contractor is on-site attempting to seal the joint.', byAdmin: true },
      ],
    },
    {
      title: 'Severe drainage blockage in B-block kitchen line',
      description: 'The main drain stack in the B-block shaft seems blocked as kitchen sink waste water is back-flowing into flat B-304. Plumber needs to clear the shaft riser immediately.',
      category: CATEGORY.PLUMBING,
      priority: PRIORITY.HIGH,
      status: STATUS.RESOLVED,
      daysAgo: 8,
      historySteps: [
        { from: STATUS.OPEN, to: STATUS.IN_PROGRESS, remark: 'External drainage snake tool ordered.', byAdmin: true },
        { from: STATUS.IN_PROGRESS, to: STATUS.RESOLVED, remark: 'Cleared mass of grease and debris using pressure jet. Stack flow restored to normal.', byAdmin: true },
      ],
    },
    {
      title: 'Dripping water valve on terrace feeding C-502',
      description: 'The overhead supply valve for C-block terrace has a slow drip that pools on the roof directly above C-502 bedroom, starting to cause damp patches on our plaster.',
      category: CATEGORY.PLUMBING,
      priority: PRIORITY.MEDIUM,
      status: STATUS.OPEN,
      daysAgo: 4,
      historySteps: [],
    },
    {
      title: 'Low water pressure in flush lines of Tower A units',
      description: 'For the past two days, the pressure in the toilets of Tower A (specifically 7th and 8th floors) is extremely low. Flushes take 15-20 minutes to refill the cisterns.',
      category: CATEGORY.PLUMBING,
      priority: PRIORITY.MEDIUM,
      status: STATUS.RESOLVED,
      daysAgo: 14,
      historySteps: [
        { from: STATUS.OPEN, to: STATUS.IN_PROGRESS, remark: 'Pneumatic pressure pump system inspected.', byAdmin: true },
        { from: STATUS.IN_PROGRESS, to: STATUS.RESOLVED, remark: 'Air pocket cleared from the A-line booster manifold. Pressure has normalized.', byAdmin: true },
      ],
    },
    // --- ELECTRICAL ---
    {
      title: 'Common corridor lights blinking and fused on 3rd floor',
      description: 'Three tube lights in the B-block 3rd floor corridor are fused and the remaining one is blinking rapidly, causing a strobe effect. It makes the hallway very dark at night.',
      category: CATEGORY.ELECTRICAL,
      priority: PRIORITY.LOW,
      status: STATUS.OPEN,
      daysAgo: 1,
      historySteps: [],
    },
    {
      title: 'Electric vehicle charging station EV-3 not powering up',
      description: 'The shared EV charging dock number EV-3 in the parking lot has no display/power. Tried tapping RFID tag but it is dead. Requesting maintenance.',
      category: CATEGORY.ELECTRICAL,
      priority: PRIORITY.MEDIUM,
      status: STATUS.IN_PROGRESS,
      daysAgo: 5,
      historySteps: [
        { from: STATUS.OPEN, to: STATUS.IN_PROGRESS, remark: 'Referred to EV servicing provider. Technician visiting tomorrow.', byAdmin: true },
      ],
    },
    {
      title: 'Exposed cable wire near kids play zone sandbox',
      description: 'There is a thick black power cable sticking out of the lawn near the sandbox in the kids park. It looks live as the garden light nearby is active. This is extremely hazardous.',
      category: CATEGORY.ELECTRICAL,
      priority: PRIORITY.HIGH,
      status: STATUS.RESOLVED,
      daysAgo: 6,
      historySteps: [
        { from: STATUS.OPEN, to: STATUS.IN_PROGRESS, remark: 'Isolated the electric feed line immediately for kids safety.', byAdmin: true },
        { from: STATUS.IN_PROGRESS, to: STATUS.RESOLVED, remark: 'Trenched the wire, encased it in conduits, and buried it safely underground.', byAdmin: true },
      ],
    },
    {
      title: 'Tripping MCB breaker in Tower D main lobby',
      description: 'The lobby air conditioner breaker keeps tripping every 30 minutes, turning off the reception lighting and security monitors. Circuit load test needed.',
      category: CATEGORY.ELECTRICAL,
      priority: PRIORITY.MEDIUM,
      status: STATUS.RESOLVED,
      daysAgo: 12,
      historySteps: [
        { from: STATUS.OPEN, to: STATUS.IN_PROGRESS, remark: 'Electrician inspecting the distribution board.', byAdmin: true },
        { from: STATUS.IN_PROGRESS, to: STATUS.RESOLVED, remark: 'Replaced a faulty 32A breaker which had worn contacts.', byAdmin: true },
      ],
    },
    // --- CLEANING ---
    {
      title: 'Garbage accumulation in common chute area of Tower C',
      description: 'Residents are dumping heavy cartons near the garbage chute mouth on the 5th floor instead of pushing them down. The chute room smells terrible and is attracting flies.',
      category: CATEGORY.CLEANING,
      priority: PRIORITY.MEDIUM,
      status: STATUS.OPEN,
      daysAgo: 2,
      historySteps: [],
    },
    {
      title: 'Dog litter consistently left in the children park walkway',
      description: 'Despite notices, pet owners are letting dogs relieve themselves in the kids play area. The walkway has dog waste that needs thorough cleaning and sanitizing.',
      category: CATEGORY.CLEANING,
      priority: PRIORITY.LOW,
      status: STATUS.IN_PROGRESS,
      daysAgo: 4,
      historySteps: [
        { from: STATUS.OPEN, to: STATUS.IN_PROGRESS, remark: 'Instructed housekeeping supervisor to increase park patrol.', byAdmin: true },
      ],
    },
    {
      title: 'Stagnant water and moss on swimming pool deck area',
      description: 'The deck tiles next to the kids pool have thick green moss buildup due to stagnant splash-back water. It is very slippery; someone might slip and fall.',
      category: CATEGORY.CLEANING,
      priority: PRIORITY.HIGH,
      status: STATUS.RESOLVED,
      daysAgo: 9,
      historySteps: [
        { from: STATUS.OPEN, to: STATUS.IN_PROGRESS, remark: 'Housekeeping cleaning crew assigned.', byAdmin: true },
        { from: STATUS.IN_PROGRESS, to: STATUS.RESOLVED, remark: 'Deep scrubbed pool deck using high-pressure wash and bleaching powder.', byAdmin: true },
      ],
    },
    // --- SECURITY ---
    {
      title: 'Main entry gate boom barrier malfunctioning',
      description: 'The automatic boom barrier at Entrance Gate 1 remains stuck in the upright position, allowing unregistered vehicles to enter the complex without scanning RFID tags.',
      category: CATEGORY.SECURITY,
      priority: PRIORITY.HIGH,
      status: STATUS.OPEN,
      daysAgo: 1,
      historySteps: [],
    },
    {
      title: 'Broken security CCTV camera on terrace entrance',
      description: 'The security camera covering the terrace entry door in Tower B is broken (lens shattered). This door is a vulnerable point as anyone can bypass the fire exit stairs.',
      category: CATEGORY.SECURITY,
      priority: PRIORITY.MEDIUM,
      status: STATUS.IN_PROGRESS,
      daysAgo: 3,
      historySteps: [
        { from: STATUS.OPEN, to: STATUS.IN_PROGRESS, remark: 'Security vendor is checking stock for replacement dome camera.', byAdmin: true },
      ],
    },
    {
      title: 'Lobby intercom system not connecting to security gate',
      description: 'Flats on the D-block 1st floor cannot receive calls from Entrance Gate guard. The intercom is dead, making visitor verification impossible for these apartments.',
      category: CATEGORY.SECURITY,
      priority: PRIORITY.MEDIUM,
      status: STATUS.RESOLVED,
      daysAgo: 15,
      historySteps: [
        { from: STATUS.OPEN, to: STATUS.IN_PROGRESS, remark: 'Intercom network specialist scheduled.', byAdmin: true },
        { from: STATUS.IN_PROGRESS, to: STATUS.RESOLVED, remark: 'Repaired broken fiber cable in the basement switch box. Intercom verified working.', byAdmin: true },
      ],
    },
    // --- PARKING ---
    {
      title: 'Unidentified car repeatedly parked in flat B-304 reserved slot',
      description: 'A black SUV with registration MH-12-XX-9999 has been parked in my dedicated slot B-304 for the last 3 days. Guard has not taken action. Please clamp it.',
      category: CATEGORY.PARKING,
      priority: PRIORITY.LOW,
      status: STATUS.OPEN,
      daysAgo: 2,
      historySteps: [],
    },
    {
      title: 'Water pooling under parking slot C-112',
      description: 'There is a heavy puddle of water forming under slot C-112. Looks like condensation or leakage from the ceiling overhead pipes. Car is getting stained.',
      category: CATEGORY.PARKING,
      priority: PRIORITY.MEDIUM,
      status: STATUS.IN_PROGRESS,
      daysAgo: 6,
      historySteps: [
        { from: STATUS.OPEN, to: STATUS.IN_PROGRESS, remark: 'Identified source as AC condensation line. Diverting the pipe outlet.', byAdmin: true },
      ],
    },
    {
      title: 'Broken mirror at the basement parking hairpin ramp curves',
      description: 'The convex safety mirror installed at the sharp turn of the basement parking ramp is completely smashed. This blind corner is very dangerous for oncoming cars.',
      category: CATEGORY.PARKING,
      priority: PRIORITY.HIGH,
      status: STATUS.RESOLVED,
      daysAgo: 11,
      historySteps: [
        { from: STATUS.OPEN, to: STATUS.IN_PROGRESS, remark: 'New 24-inch convex safety mirror ordered.', byAdmin: true },
        { from: STATUS.IN_PROGRESS, to: STATUS.RESOLVED, remark: 'Installed new acrylic convex mirror. Verified visibility.', byAdmin: true },
      ],
    },
    // --- OTHER ---
    {
      title: 'Kids play zone swing chain links are broken',
      description: 'The metal chain link on the red swing in the kids garden is partially rusted and has broken open. If a child swings high, it might break completely and cause injury.',
      category: CATEGORY.OTHER,
      priority: PRIORITY.HIGH,
      status: STATUS.OPEN,
      daysAgo: 1,
      historySteps: [],
    },
    {
      title: 'Clubhouse gym treadmill screen displaying system error',
      description: 'The main commercial treadmill in the gym has its touchscreen frozen on bootloader screen error. It is unusable for residents. Needs technician.',
      category: CATEGORY.OTHER,
      priority: PRIORITY.LOW,
      status: STATUS.IN_PROGRESS,
      daysAgo: 7,
      historySteps: [
        { from: STATUS.OPEN, to: STATUS.IN_PROGRESS, remark: 'Contacted gym equipment dealer for warranty check.', byAdmin: true },
      ],
    },
    {
      title: 'Loud party music post midnight in D-102 flat',
      description: 'There was extremely loud bass music and screaming from flat D-102 on Friday night going up to 3 AM. Request security guards to enforce society bylaws.',
      category: CATEGORY.OTHER,
      priority: PRIORITY.LOW,
      status: STATUS.RESOLVED,
      daysAgo: 5,
      historySteps: [
        { from: STATUS.OPEN, to: STATUS.IN_PROGRESS, remark: 'Spoke with flat D-102 resident over phone warning about guidelines.', byAdmin: true },
        { from: STATUS.IN_PROGRESS, to: STATUS.RESOLVED, remark: 'Resident submitted written apology. Noise stopped.', byAdmin: true },
      ],
    },
    {
      title: 'Feral cat feeding issues in the Tower A open lobby lobby',
      description: 'Some visitors are feeding feral cats directly in the elevator lobby, leaving plastic dishes with wet food. It attracts rodents and bugs.',
      category: CATEGORY.OTHER,
      priority: PRIORITY.LOW,
      status: STATUS.RESOLVED,
      daysAgo: 16,
      historySteps: [
        { from: STATUS.OPEN, to: STATUS.IN_PROGRESS, remark: 'Housekeeping requested to clear feed dishes.', byAdmin: true },
        { from: STATUS.IN_PROGRESS, to: STATUS.RESOLVED, remark: 'No-feeding boards placed. Feed dishes removed. Flow monitored.', byAdmin: true },
      ],
    },
    {
      title: 'Clubhouse library sliding door channel stuck',
      description: 'The sliding glass partition door of the reading room is jammed in the rails. Needs grease alignment as it takes huge force to slide it open.',
      category: CATEGORY.OTHER,
      priority: PRIORITY.LOW,
      status: STATUS.RESOLVED,
      daysAgo: 20,
      historySteps: [
        { from: STATUS.OPEN, to: STATUS.IN_PROGRESS, remark: 'Carpentry crew assigned.', byAdmin: true },
        { from: STATUS.IN_PROGRESS, to: STATUS.RESOLVED, remark: 'Cleaned sliding channel rails of dust, adjusted rollers, and oiled track.', byAdmin: true },
      ],
    },
  ];

  // Distribute complaints evenly among the 6 residents
  for (let idx = 0; idx < complaintsDraft.length; idx++) {
    const draft = complaintsDraft[idx];
    const resident = residents[idx % residents.length];

    const complaintDate = new Date(Date.now() - draft.daysAgo * 24 * 60 * 60 * 1000);

    const createdComplaint = await prisma.complaint.create({
      data: {
        title:       draft.title,
        description: draft.description,
        category:    draft.category,
        priority:    draft.priority,
        status:      draft.status,
        residentId:  resident.id,
        createdAt:   complaintDate,
        updatedAt:   complaintDate,
      },
    });

    // Seed history if draft contains transition steps
    let currentStatus = STATUS.OPEN;
    for (const step of draft.historySteps) {
      const stepDate = new Date(complaintDate.getTime() + 12 * 60 * 60 * 1000); // 12 hours later
      await prisma.complaintHistory.create({
        data: {
          complaintId: createdComplaint.id,
          changedById: step.byAdmin ? admin1.id : resident.id,
          fromStatus:  step.from,
          toStatus:    step.to,
          remark:      step.remark,
          createdAt:   stepDate,
        },
      });
      currentStatus = step.to;
    }
  }

  console.log('Seed complete.');
  console.log('--- DEMO LOGINS ---');
  console.log(`  Admin 1 (Ops):     admin@society.com    / admin@123`);
  console.log(`  Admin 2 (President): admin2@society.com   / admin@123`);
  console.log(`  Resident (Primary):  resident@society.com / resident@123`);
  console.log('  Additional Residents:');
  console.log('    aravind@society.com, meera@society.com, rahul@society.com, priya@society.com, vikram@society.com');
}

seed()
  .catch((err) => {
    console.error('Seed failed:', err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
