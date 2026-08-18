export const demoCustomer = {
  customerId: "47291836",
  displayName: "Max Mustermann",
  balanceCents: 428750,
  airBalance: 12500,
  festgeldCents: 750000,
  loanDebtCents: 382500,
};

export const demoTransactions = [
  {
    id: "t1",
    description: "Gehalt",
    type: "INCOMING" as const,
    amount: 245000,
    currency: "EUR" as const,
    source: "ADMIN" as const,
    date: "2026-08-01",
  },
  {
    id: "t2",
    description: "Latte Macchiato & Croissant",
    type: "OUTGOING" as const,
    amount: 690,
    currency: "EUR" as const,
    source: "CHECKOUT" as const,
    date: "2026-08-12",
  },
  {
    id: "t3",
    description: "Spende Tierheim Hoffnung",
    type: "OUTGOING" as const,
    amount: 2500,
    currency: "EUR" as const,
    source: "DONATION" as const,
    date: "2026-08-10",
  },
  {
    id: "t4",
    description: "Max -> Lisa Schmidt",
    type: "OUTGOING" as const,
    amount: 5000,
    currency: "EUR" as const,
    source: "TRANSFER" as const,
    date: "2026-08-08",
  },
  {
    id: "t5",
    description: "Community AirCoin Prämie",
    type: "INCOMING" as const,
    amount: 2500,
    currency: "AIR" as const,
    source: "ADMIN" as const,
    date: "2026-08-05",
  },
  {
    id: "t6",
    description: "Rückerstattung Kaffeehaus Central",
    type: "INCOMING" as const,
    amount: 690,
    currency: "EUR" as const,
    source: "REFUND" as const,
    date: "2026-08-03",
  },
];

export const demoFestgeldAccounts = [
  {
    id: "fg1",
    label: "Festgeld 12 Monate",
    amount: 500000,
    interestRate: 3.0,
    status: "ACTIVE" as const,
    startDate: "2026-02-01",
    endDate: "2027-02-01",
  },
  {
    id: "fg2",
    label: "Festgeld 6 Monate",
    amount: 250000,
    interestRate: 2.4,
    status: "UNLOCKED" as const,
    startDate: "2026-01-15",
    endDate: "2026-07-15",
  },
];

export const demoLoans = [
  {
    id: "l1",
    name: "Privatkredit",
    status: "ACTIVE" as const,
    amount: 500000,
    remainingAmount: 382500,
    termMonths: 48,
    interestRate: 6.5,
    createdAt: "2026-03-12",
    monthlyPayment: 11862,
  },
  {
    id: "l2",
    name: "Konsumkredit",
    status: "PENDING" as const,
    amount: 150000,
    remainingAmount: 150000,
    termMonths: 12,
    interestRate: 4.2,
    createdAt: "2026-08-14",
    monthlyPayment: 12800,
  },
  {
    id: "l3",
    name: "Autokredit",
    status: "COMPLETED" as const,
    amount: 1200000,
    remainingAmount: 0,
    termMonths: 60,
    interestRate: 5.9,
    createdAt: "2024-06-20",
    monthlyPayment: 23100,
  },
];

export const demoLoanPayments = [
  { id: "p1", installment: 1, date: "2026-04-12", amount: 11862, principal: 10256, interest: 1606, remaining: 489744, status: "PAID" as const },
  { id: "p2", installment: 2, date: "2026-05-12", amount: 11862, principal: 10311, interest: 1551, remaining: 479433, status: "PAID" as const },
  { id: "p3", installment: 3, date: "2026-06-12", amount: 11862, principal: 10367, interest: 1495, remaining: 469066, status: "PAID" as const },
  { id: "p4", installment: 4, date: "2026-07-12", amount: 11862, principal: 10423, interest: 1439, remaining: 458643, status: "PAID" as const },
  { id: "p5", installment: 5, date: "2026-08-12", amount: 11862, principal: 10480, interest: 1382, remaining: 448163, status: "PAID" as const },
  { id: "p6", installment: 6, date: "2026-09-12", amount: 11862, principal: 10537, interest: 1325, remaining: 437626, status: "SCHEDULED" as const },
];

export const demoLoanProducts = [
  {
    id: "pr1",
    name: "Privatkredit",
    description: "Flexibel einsetzbar – für alles, was du brauchst.",
    minAmount: 100000,
    maxAmount: 5000000,
    minTermMonths: 6,
    maxTermMonths: 84,
    interestRate: 6.5,
  },
  {
    id: "pr2",
    name: "Konsumkredit",
    description: "Kleine Beträge, kurze Laufzeit, schnelle Bewilligung.",
    minAmount: 50000,
    maxAmount: 1000000,
    minTermMonths: 3,
    maxTermMonths: 24,
    interestRate: 4.2,
  },
  {
    id: "pr3",
    name: "Autokredit",
    description: "Attraktive Konditionen für dein neues Fahrzeug.",
    minAmount: 200000,
    maxAmount: 8000000,
    minTermMonths: 12,
    maxTermMonths: 84,
    interestRate: 5.9,
  },
];

export const demoMerchants = [
  {
    merchantId: "mch_a1b2c3d4e5f6",
    name: "Kaffeehaus Central",
    totalVolumeCents: 128450,
    volumeTodayCents: 2740,
    volumeMonthCents: 38900,
    sessions: [
      { token: "tok_aaaa1111", status: "COMPLETED" as const, description: "Latte Macchiato & Croissant", amount: 690, customerName: "Max Mustermann", date: "2026-08-12" },
      { token: "tok_aaaa2222", status: "COMPLETED" as const, description: "Espresso doppio", amount: 420, customerName: "Lisa Schmidt", date: "2026-08-11" },
      { token: "tok_aaaa3333", status: "REFUNDED" as const, description: "Cappuccino", amount: 480, customerName: "Tom Fischer", date: "2026-08-10" },
      { token: "tok_aaaa4444", status: "PENDING" as const, description: "Kuchen & Filterkaffee", amount: 1150, customerName: null, date: "2026-08-14" },
    ],
  },
  {
    merchantId: "mch_9z8y7x6w5v4u",
    name: "TechStore 24",
    totalVolumeCents: 892300,
    volumeTodayCents: 0,
    volumeMonthCents: 210400,
    sessions: [
      { token: "tok_bbbb1111", status: "COMPLETED" as const, description: "USB-C Kabel", amount: 2499, customerName: "Max Mustermann", date: "2026-08-06" },
      { token: "tok_bbbb2222", status: "COMPLETED" as const, description: "Mauspad XL", amount: 1999, customerName: "Anna Weber", date: "2026-08-02" },
    ],
  },
];

export const demoDonationBoxes = [
  {
    id: "db1",
    name: "Klassenfahrt 2026",
    slug: "klassenfahrt-2026",
    link: "https://rbank.sdtoll.de/spendenbox/klassenfahrt-2026",
    createdAt: "2026-05-10",
    ownerName: "Max Mustermann",
    ownerCustomerId: "47291836",
  },
  {
    id: "db2",
    name: "Tierheim Hoffnung",
    slug: "tierheim-hoffnung",
    link: "https://rbank.sdtoll.de/spendenbox/tierheim-hoffnung",
    createdAt: "2026-06-02",
    ownerName: "Lisa Schmidt",
    ownerCustomerId: "10928374",
  },
  {
    id: "db3",
    name: "Klima-Rettung e.V.",
    slug: "klima-rettung",
    link: "https://rbank.sdtoll.de/spendenbox/klima-rettung",
    createdAt: "2026-07-21",
    ownerName: "Tom Fischer",
    ownerCustomerId: "88572019",
  },
];

export const demoCheckoutSession = {
  token: "tok_demo000000",
  status: "PENDING" as const,
  amount: 690,
  currency: "EUR",
  description: "Latte Macchiato & Croissant",
  redirectUrl: "/demos",
  cancelUrl: "/demos",
  merchant: {
    name: "Kaffeehaus Central",
    merchantId: "mch_a1b2c3d4e5f6",
  },
  donationBoxName: null,
  transactionId: null,
  expiresAt: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
  paidAt: null,
  customerId: "47291836",
  customerName: "Max Mustermann",
  metadata: null,
  recipientCustomerId: null,
  recipientName: null,
  refundedAt: null,
};

export const demoCheckoutUser = {
  id: "u_demo001",
  customerId: "47291836",
  displayName: "Max Mustermann",
  balanceCents: 428750,
};

export const demoEmbeddedUsers = [
  { id: "u_demo001", customerId: "47291836", displayName: "Max Mustermann" },
  { id: "u_demo002", customerId: "10928374", displayName: "Lisa Schmidt" },
  { id: "u_demo003", customerId: "88572019", displayName: "Tom Fischer" },
];

export const demoAdminUsers = [
  { customerId: "47291836", displayName: "Max Mustermann", stackUserId: "usr_demo001", balanceCents: 428750, computedBalanceCents: 428750, airBalance: 12500 },
  { customerId: "10928374", displayName: "Lisa Schmidt", stackUserId: "usr_demo002", balanceCents: 315240, computedBalanceCents: 315240, airBalance: 8000 },
  { customerId: "88572019", displayName: "Tom Fischer", stackUserId: "usr_demo003", balanceCents: 90250, computedBalanceCents: 90250, airBalance: 3500 },
  { customerId: "33117755", displayName: "Anna Weber", stackUserId: "usr_demo004", balanceCents: 1825000, computedBalanceCents: 1825000, airBalance: 15000 },
];

export const demoAdminTransactions = [
  { id: "at1", date: "2026-08-12", description: "Latte Macchiato & Croissant", type: "OUTGOING" as const, amount: 690, currency: "EUR" as const, source: "CHECKOUT" as const },
  { id: "at2", date: "2026-08-10", description: "Spende Tierheim Hoffnung", type: "OUTGOING" as const, amount: 2500, currency: "EUR" as const, source: "DONATION" as const },
  { id: "at3", date: "2026-08-08", description: "Max -> Lisa Schmidt", type: "OUTGOING" as const, amount: 5000, currency: "EUR" as const, source: "TRANSFER" as const },
  { id: "at4", date: "2026-08-01", description: "Gehalt", type: "INCOMING" as const, amount: 245000, currency: "EUR" as const, source: "ADMIN" as const },
  { id: "at5", date: "2026-08-05", description: "Community AirCoin Prämie", type: "INCOMING" as const, amount: 2500, currency: "AIR" as const, source: "ADMIN" as const },
];

export const demoAdminMerchants = [
  {
    id: "m1",
    name: "Kaffeehaus Central",
    merchantId: "mch_a1b2c3d4e5f6",
    webhookUrl: "https://kaffeehaus.example/webhook",
    isActive: true,
    ownerName: null,
    ownerCustomerId: null,
    totalVolumeCents: 128450,
    volumeTodayCents: 2740,
    volumeMonthCents: 38900,
    sessions: [
      { token: "tok_aaaa1111", status: "COMPLETED" as const, description: "Latte Macchiato & Croissant", amount: 690, customerName: "Max Mustermann", createdAt: "2026-08-12" },
      { token: "tok_aaaa3333", status: "REFUNDED" as const, description: "Cappuccino", amount: 480, customerName: "Tom Fischer", createdAt: "2026-08-10" },
      { token: "tok_aaaa4444", status: "PENDING" as const, description: "Kuchen & Filterkaffee", amount: 1150, customerName: null, createdAt: "2026-08-14" },
    ],
  },
  {
    id: "m2",
    name: "TechStore 24",
    merchantId: "mch_9z8y7x6w5v4u",
    webhookUrl: null,
    isActive: true,
    ownerName: "Max Mustermann",
    ownerCustomerId: "47291836",
    totalVolumeCents: 892300,
    volumeTodayCents: 0,
    volumeMonthCents: 210400,
    sessions: [
      { token: "tok_bbbb1111", status: "COMPLETED" as const, description: "USB-C Kabel", amount: 2499, customerName: "Max Mustermann", createdAt: "2026-08-06" },
      { token: "tok_bbbb2222", status: "CANCELLED" as const, description: "Headset Pro", amount: 59900, customerName: "Anna Weber", createdAt: "2026-07-29" },
    ],
  },
];

export const demoAdminLoanProducts = [
  {
    id: "pr1",
    name: "Privatkredit",
    description: "Flexibel einsetzbar – für alles, was du brauchst.",
    minAmount: 100000,
    maxAmount: 5000000,
    minTermMonths: 6,
    maxTermMonths: 84,
    interestRate: 6.5,
    oneTimeFeeCents: 5000,
    isActive: true,
  },
  {
    id: "pr2",
    name: "Konsumkredit",
    description: "Kleine Beträge, kurze Laufzeit.",
    minAmount: 50000,
    maxAmount: 1000000,
    minTermMonths: 3,
    maxTermMonths: 24,
    interestRate: 4.2,
    oneTimeFeeCents: 0,
    isActive: true,
  },
  {
    id: "pr3",
    name: "Autokredit",
    description: "Attraktive Konditionen für dein neues Fahrzeug.",
    minAmount: 200000,
    maxAmount: 8000000,
    minTermMonths: 12,
    maxTermMonths: 84,
    interestRate: 5.9,
    oneTimeFeeCents: 15000,
    isActive: false,
  },
];

export const demoAdminPendingLoans = [
  {
    id: "pl1",
    user: { customerId: "10928374", displayName: "Lisa Schmidt" },
    loanProduct: { name: "Konsumkredit" },
    amount: 150000,
    interestRate: 4.2,
    termMonths: 12,
    monthlyPayment: 12800,
    createdAt: "2026-08-14",
  },
];

export const demoAdminActiveLoans = [
  {
    id: "al1",
    user: { customerId: "47291836", displayName: "Max Mustermann" },
    loanProduct: { name: "Privatkredit" },
    amount: 500000,
    remainingAmount: 382500,
    interestRate: 6.5,
    monthlyPayment: 11862,
  },
  {
    id: "al2",
    user: { customerId: "33117755", displayName: "Anna Weber" },
    loanProduct: { name: "Autokredit" },
    amount: 1200000,
    remainingAmount: 640000,
    interestRate: 5.9,
    monthlyPayment: 23100,
  },
];

export const demoAdminFestgeldAccounts = [
  {
    id: "fg1",
    user: { customerId: "47291836", displayName: "Max Mustermann", stackUserId: "usr_demo001" },
    label: "Festgeld 12 Monate",
    amount: 500000,
    interestRate: 3.0,
    status: "ACTIVE" as const,
    startDate: "2026-02-01",
    endDate: "2027-02-01",
  },
  {
    id: "fg2",
    user: { customerId: "47291836", displayName: "Max Mustermann", stackUserId: "usr_demo001" },
    label: "Festgeld 6 Monate",
    amount: 250000,
    interestRate: 2.4,
    status: "UNLOCKED" as const,
    startDate: "2026-01-15",
    endDate: "2026-07-15",
  },
  {
    id: "fg3",
    user: { customerId: "33117755", displayName: "Anna Weber", stackUserId: "usr_demo004" },
    label: "Festgeld 24 Monate",
    amount: 1000000,
    interestRate: 3.4,
    status: "ACTIVE" as const,
    startDate: "2025-11-01",
    endDate: "2027-11-01",
  },
];

export const demoAdminAirTransactions = [
  { id: "air1", date: "2026-08-05", customerId: "47291836", customerName: "Max Mustermann", description: "Community Prämie", type: "INCOMING" as const, amount: 2500, source: "ADMIN" as const },
  { id: "air2", date: "2026-08-02", customerId: "10928374", customerName: "Lisa Schmidt", description: "Umfrage belohnt", type: "INCOMING" as const, amount: 1000, source: "ADMIN" as const },
  { id: "air3", date: "2026-07-28", customerId: "88572019", customerName: "Tom Fischer", description: "Überweisung an Anna", type: "OUTGOING" as const, amount: 500, source: "TRANSFER" as const },
];
