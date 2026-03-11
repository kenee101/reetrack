export const PLAN_FEATURES = {
  Free: {
    adminAccounts: 1,
    customEmailsPerMonth: 10,
    transactionFeePercent: 8,
    analyticsLevel: 'basic',
    memberPlanAccess: 1,
    checkIn: false,
    reportsGeneration: false,
    prioritySupport: false,
  },
  Starter: {
    adminAccounts: 3,
    customEmailsPerMonth: 60,
    transactionFeePercent: 7,
    analyticsLevel: 'advanced',
    memberPlanAccess: 3,
    checkIn: true,
    reportsGeneration: true,
    prioritySupport: true,
  },
  Growth: {
    adminAccounts: 5,
    customEmailsPerMonth: 100,
    transactionFeePercent: 6,
    analyticsLevel: 'advanced',
    memberPlanAccess: 5,
    checkIn: true,
    reportsGeneration: true,
    prioritySupport: true,
  },
  Pro: {
    adminAccounts: 10,
    customEmailsPerMonth: 200,
    transactionFeePercent: 5,
    analyticsLevel: 'advanced',
    memberPlanAccess: Infinity,
    checkIn: true,
    reportsGeneration: true,
    prioritySupport: true,
  },
} as const;

export type PlanTier = keyof typeof PLAN_FEATURES;
export type PlanFeatures = (typeof PLAN_FEATURES)[PlanTier];
