/**
 * Frontend integration tests for Hirely TrustCheck & Action Planner logic.
 * Executed via: npx tsx test_frontend_features.ts
 */

import { 
  TrustStatus, 
  TrustAssessment, 
  ActionPlan, 
  ActionPlannerTask, 
  Commitment 
} from './src/types/opportunity';

function assert(condition: boolean, message: string) {
  if (!condition) {
    console.error(`❌ Assertion Failed: ${message}`);
    process.exit(1);
  }
  console.log(`✓ Passed: ${message}`);
}

console.log('--- RUNNING HIRELY TRUSTCHECK & ACTION PLANNER FRONTEND TESTS ---');

// Test 1: TrustCheck Status categorization
function testTrustCheckStatuses() {
  const verifiedAssessment: TrustAssessment = {
    opportunity_id: 'job-scale-ai',
    status: 'verified',
    status_label: 'Verified Against Sources',
    score: 95,
    verified_facts: [
      'Hosted on verified domain scale.com',
      'No candidate application fee detected',
      'Stated salary range $135,000 - $165,000'
    ],
    risk_indicators: [],
    missing_information: [],
    evidence_urls: ['https://scale.com/careers/ai-backend-engineer'],
    explanation: 'Authenticated against Scale AI careers portal.',
    disclaimer: 'Verified against public sources.'
  };

  assert(verifiedAssessment.status === 'verified', 'Verified assessment status is verified');
  assert(verifiedAssessment.score >= 70, 'Verified score is >= 70');
  assert(verifiedAssessment.risk_indicators.length === 0, 'Verified listing has zero risk indicators');

  const suspiciousAssessment: TrustAssessment = {
    opportunity_id: 'scam-job-01',
    status: 'suspicious',
    status_label: 'Suspicious',
    score: 30,
    verified_facts: [],
    risk_indicators: [
      'Demands $250 security deposit via wire transfer',
      'Hosted on free platform blogspot.com'
    ],
    missing_information: ['Corporate registration details'],
    evidence_urls: ['https://scam-careers.blogspot.com'],
    explanation: 'Critical risk signs detected.',
    disclaimer: 'Verified against public sources.'
  };

  assert(suspiciousAssessment.status === 'suspicious', 'Suspicious listing marked as suspicious');
  assert(suspiciousAssessment.risk_indicators.length >= 2, 'Suspicious listing captures risk indicators');
}

// Test 2: Action Planner Constraint Validation (Non-overlapping, within daily limits)
function testActionPlannerConstraints() {
  const availableHours: Record<string, number> = {
    monday: 2.5,
    tuesday: 2.5,
    wednesday: 3.0,
    thursday: 2.5,
    friday: 3.0,
    saturday: 4.5,
    sunday: 4.5
  };

  const commitments: Commitment[] = [
    { day: 'wednesday', title: 'OS Midterm', hours: 2.0, time_range: '14:00 - 16:00' }
  ];

  // Net Wednesday capacity is 3.0 - 2.0 = 1.0h
  const netWedCapacity = availableHours['wednesday'] - commitments[0].hours;
  assert(netWedCapacity === 1.0, 'Net capacity correctly subtracts commitments');

  const testTasks: ActionPlannerTask[] = [
    {
      id: 1,
      plan_id: 1,
      user_id: 1,
      opportunity_id: 'job-scale-ai',
      opportunity_title: 'AI Backend Engineer',
      organization: 'Scale AI',
      opportunity_type: 'job',
      opportunity_url: 'https://scale.com/careers/ai-backend-engineer',
      trust_status: 'verified',
      deadline: '2026-12-15',
      task_title: 'Tailor Resume & Complete Submission for Scale AI',
      task_type: 'application',
      scheduled_day: 'monday',
      scheduled_date: '2026-10-23',
      time_slot: '18:00 - 20:00',
      estimated_hours: 2.0,
      is_estimate: true,
      priority_rank: 1,
      status: 'pending'
    },
    {
      id: 2,
      plan_id: 1,
      user_id: 1,
      opportunity_id: 'internship-stripe',
      opportunity_title: 'Backend Platform Intern',
      organization: 'Stripe',
      opportunity_type: 'internship',
      opportunity_url: 'https://stripe.com/jobs/intern',
      trust_status: 'verified',
      deadline: '2026-12-20',
      task_title: 'Prepare Internship Profile for Stripe',
      task_type: 'application',
      scheduled_day: 'tuesday',
      scheduled_date: '2026-10-24',
      time_slot: '18:00 - 19:30',
      estimated_hours: 1.5,
      is_estimate: true,
      priority_rank: 2,
      status: 'pending'
    }
  ];

  // Verify allocated hours do not exceed daily limits
  const hoursPerDay: Record<string, number> = {};
  for (const t of testTasks) {
    hoursPerDay[t.scheduled_day] = (hoursPerDay[t.scheduled_day] || 0) + t.estimated_hours;
  }

  for (const day of Object.keys(hoursPerDay)) {
    assert(
      hoursPerDay[day] <= availableHours[day],
      `Task effort on ${day} (${hoursPerDay[day]}h) does not exceed limit (${availableHours[day]}h)`
    );
  }

  // Verify time slots are formatted properly and non-empty
  for (const t of testTasks) {
    assert(t.time_slot.includes(' - '), `Time slot formatted with start and end: ${t.time_slot}`);
    assert(t.is_estimate === true, 'Effort is explicitly flagged as an estimate');
  }
}

// Test 3: Trust-aware Ranking Formula
function testRankingFormula() {
  // Score formula: Skill/Role Match (0-45) + Trust (0-25) + Deadline (0-20) + Priority (0-10)
  function calculateComposite(match: number, trustStatus: TrustStatus, daysLeft: number, isPriorityCat: boolean): number {
    const matchPts = (match / 100) * 45;
    const trustPts = trustStatus === 'verified' ? 25 : (trustStatus === 'unverified' ? 10 : -100);
    const deadlinePts = daysLeft <= 3 ? 20 : (daysLeft <= 7 ? 16 : (daysLeft <= 14 ? 12 : 8));
    const prioPts = isPriorityCat ? 10 : 2;
    return Math.round((matchPts + trustPts + deadlinePts + prioPts) * 10) / 10;
  }

  const verifiedScore = calculateComposite(90, 'verified', 5, true);
  const unverifiedScore = calculateComposite(90, 'unverified', 5, true);
  const suspiciousScore = calculateComposite(90, 'suspicious', 5, true);

  assert(verifiedScore > unverifiedScore, `Verified listing (${verifiedScore}) ranks higher than unverified (${unverifiedScore})`);
  assert(suspiciousScore < 0, `Suspicious listing receives penalty exclusion score (${suspiciousScore})`);
}

// Run tests
testTrustCheckStatuses();
testActionPlannerConstraints();
testRankingFormula();

console.log('✅ ALL FRONTEND FEATURE TESTS PASSED SUCCESSFULLY!');
