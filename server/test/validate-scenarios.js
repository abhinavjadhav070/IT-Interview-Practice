const RoadmapEngine = require('../services/roadmapEngine');

console.log('=== RUNNING PHASE 5 ROADMAP VALIDATION MATRIX ===\n');

// 1. Scenario 1: Microsoft, SWE, Europe (Germany), 6 months, 10 h/week, intermediate
const s1 = RoadmapEngine.generate({
  company: 'microsoft',
  targetRole: 'backend',
  region: 'europe',
  country: 'Germany',
  timelineMonths: 6,
  hoursPerWeek: 10,
  currentLevel: 'intermediate'
});

// 2. Scenario 2: Startup, Full-stack, India, 3 months, 15 h/week, intermediate
const s2 = RoadmapEngine.generate({
  targetType: 'startup',
  targetRole: 'fullstack',
  region: 'india',
  timelineMonths: 3,
  hoursPerWeek: 15,
  currentLevel: 'intermediate'
});

// 3. Scenario 3: Scenario 1 with region changed to India
const s3 = RoadmapEngine.generate({
  company: 'microsoft',
  targetRole: 'backend',
  region: 'india',
  country: 'India',
  timelineMonths: 6,
  hoursPerWeek: 10,
  currentLevel: 'intermediate'
});

// 4. Scenario 4: Scenario 1 with target changed to startup
const s4 = RoadmapEngine.generate({
  targetType: 'startup',
  targetRole: 'backend',
  region: 'europe',
  country: 'Germany',
  timelineMonths: 6,
  hoursPerWeek: 10,
  currentLevel: 'intermediate'
});

// 5. Scenario 5: Big tech, India, campus hiring
const s5 = RoadmapEngine.generate({
  targetType: 'big_tech',
  targetRole: 'backend',
  region: 'india',
  timelineMonths: 6,
  hoursPerWeek: 12,
  currentLevel: 'intermediate'
});

// 6. Scenario 6: IT services (TCS), India, 2 months, 15 h/week
const s6 = RoadmapEngine.generate({
  company: 'tcs',
  targetType: 'it_services',
  targetRole: 'backend',
  region: 'india',
  timelineMonths: 2,
  hoursPerWeek: 15,
  currentLevel: 'intermediate'
});

// 7. Scenario 7: Scenario 2 with role changed: backend, frontend, data
const s7_backend = RoadmapEngine.generate({
  targetType: 'startup',
  targetRole: 'backend',
  region: 'india',
  timelineMonths: 3,
  hoursPerWeek: 15,
  currentLevel: 'intermediate'
});
const s7_frontend = RoadmapEngine.generate({
  targetType: 'startup',
  targetRole: 'frontend',
  region: 'india',
  timelineMonths: 3,
  hoursPerWeek: 15,
  currentLevel: 'intermediate'
});
const s7_data = RoadmapEngine.generate({
  targetType: 'startup',
  targetRole: 'data_ml',
  region: 'india',
  timelineMonths: 3,
  hoursPerWeek: 15,
  currentLevel: 'intermediate'
});

// 8. Scenario 8: Scenario 1 beginner vs advanced
const s8_beg = RoadmapEngine.generate({
  company: 'microsoft',
  targetRole: 'backend',
  region: 'europe',
  country: 'Germany',
  timelineMonths: 6,
  hoursPerWeek: 10,
  currentLevel: 'beginner'
});
const s8_adv = RoadmapEngine.generate({
  company: 'microsoft',
  targetRole: 'backend',
  region: 'europe',
  country: 'Germany',
  timelineMonths: 6,
  hoursPerWeek: 10,
  currentLevel: 'advanced'
});

// 9. Scenario 9: Scenario 1 at 4 weeks vs 12 months
const s9_4w = RoadmapEngine.generate({
  company: 'microsoft',
  targetRole: 'backend',
  region: 'europe',
  country: 'Germany',
  timelineMonths: 1, // 4 weeks
  hoursPerWeek: 10,
  currentLevel: 'intermediate'
});
const s9_12m = RoadmapEngine.generate({
  company: 'microsoft',
  targetRole: 'backend',
  region: 'europe',
  country: 'Germany',
  timelineMonths: 12,
  hoursPerWeek: 10,
  currentLevel: 'intermediate'
});

// 10. Scenario 10: Free text parsing
const s10_parsed = RoadmapEngine.parseFreeTextGoal('I want to work at a fintech startup in Berlin');
console.log('Scenario 10 Parsed:', s10_parsed);

// Check differences
console.log('\n--- Checking Difference Thresholds ---');
const diff1_2 = RoadmapEngine.diff(s1, s2);
console.log('S1 vs S2 Diff:', diff1_2);
console.log('S1 vs S2 Module Diff >= 40%?', diff1_2.moduleDiffShare >= 0.40, `(${diff1_2.moduleDiffShare * 100}%)`);
console.log('S1 vs S2 Hours Reallocated >= 25%?', diff1_2.hoursReallocatedShare >= 0.25, `(${diff1_2.hoursReallocatedShare * 100}%)`);
console.log('S1 vs S2 Phases Differ?', diff1_2.phasesDiffer);
console.log('S1 vs S2 Milestones Differ?', diff1_2.milestonesDiffer);

const diff1_4 = RoadmapEngine.diff(s1, s4);
console.log('\nS1 vs S4 Diff:', diff1_4);
console.log('S1 vs S4 Module Diff >= 40%?', diff1_4.moduleDiffShare >= 0.40, `(${diff1_4.moduleDiffShare * 100}%)`);
console.log('S1 vs S4 Hours Reallocated >= 25%?', diff1_4.hoursReallocatedShare >= 0.25, `(${diff1_4.hoursReallocatedShare * 100}%)`);
console.log('S1 vs S4 Phases Differ?', diff1_4.phasesDiffer);
console.log('S1 vs S4 Milestones Differ?', diff1_4.milestonesDiffer);

// Top 3 skills by hours for S1, S2, S6
function getTop3(plan) {
  return Object.entries(plan.stats.hoursByArea || {})
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([k, v]) => `${k}: ${v}h`);
}
console.log('\n--- Top 3 Skill Areas by Hours ---');
console.log('Scenario 1 (Microsoft Big Tech):', getTop3(s1));
console.log('Scenario 2 (Startup Fullstack):', getTop3(s2));
console.log('Scenario 6 (TCS IT Services):', getTop3(s6));

console.log('\n--- Scenario 1 vs 3 (Region Change Only) ---');
const s1_mods = s1.phases.flatMap(p => p.tasks.filter(t => t.startsWith('Master ')));
const s3_mods = s3.phases.flatMap(p => p.tasks.filter(t => t.startsWith('Master ')));
console.log('S1 has Europe extra track:', s1_mods.some(m => m.includes('European Tech Career Track')));
console.log('S3 has Europe extra track:', s3_mods.some(m => m.includes('European Tech Career Track')));

console.log('\n--- Scenario 8 (Beginner vs Advanced) ---');
const s8_beg_mods = s8_beg.phases.flatMap(p => p.tasks.filter(t => t.startsWith('Master ')));
const s8_adv_mods = s8_adv.phases.flatMap(p => p.tasks.filter(t => t.startsWith('Master ')));
console.log('Beginner module count:', s8_beg_mods.length, 'Advanced module count:', s8_adv_mods.length);
console.log('Beginner has foundations:', s8_beg_mods.some(m => m.includes('Linear Data Structures')));
console.log('Advanced prioritizes advanced:', s8_adv_mods.some(m => m.includes('Dynamic Programming')));

console.log('\n--- Scenario 9 (4 Weeks vs 12 Months) ---');
console.log('4 weeks module count:', s9_4w.stats.modules, 'total hours:', s9_4w.stats.totalHours);
console.log('12 months module count:', s9_12m.stats.modules, 'total hours:', s9_12m.stats.totalHours);
