// Run: node test.js  (extracts the pure-logic block from index.html)
const fs = require('fs'), assert = require('assert');
const html = fs.readFileSync(__dirname + '/index.html', 'utf8');
const src = html.match(/<script id="core">([\s\S]*?)<\/script>/)[1];
const m = { exports: {} };
new Function('module', src)(m);
const c = m.exports;

const me = { kg: 52, cm: 160, age: 33, activity: 1.45, deficitPct: 15, proteinPerKg: 1.9 };
assert.strictEqual(Math.round(c.bmr(me)), 1194);
const t = c.targets(me);
assert.strictEqual(t.tdee, 1731);
assert.strictEqual(t.kcal, 1470);
assert.strictEqual(t.protein, 99);
// calorie floor holds
assert.strictEqual(c.targets({ ...me, activity: 1.2, deficitPct: 25 }).kcal, 1200);

// 150 g cooked chicken breast (165/31) + 1 tsp oil
let n = c.entryNutrition({ kcal: 165, protein: 31 }, 150, 1);
assert.strictEqual(n.kcal, 287.5); assert.strictEqual(n.protein, 46.5);
// empty / bad input doesn't produce NaN
n = c.entryNutrition({ kcal: 165, protein: 31 }, '', undefined);
assert.deepStrictEqual(n, { kcal: 0, protein: 0, carbs: 0 });

// raw vs cooked of same food differ (guards against mixing them up)
const rice = c.FOODS.find(f => f.id === 'white-rice');
assert.ok(rice.forms[0][1] > 2 * rice.forms[1][1]);

// totals only count the requested date; date maths crosses month/year
const e = (date, kcal100, p100, grams, fatTsp) => ({ date, kcal100, p100, grams, fatTsp });
const entries = [e('2026-10-06', 100, 10, 100, 0), e('2026-10-06', 200, 20, 50, 1), e('2026-10-05', 999, 99, 100, 0)];
const tot = c.totalsFor(entries, '2026-10-06');
assert.strictEqual(tot.kcal, 240); assert.strictEqual(tot.protein, 20); assert.strictEqual(tot.count, 2);
assert.strictEqual(c.addDays('2026-12-31', 1), '2027-01-01');
assert.strictEqual(c.addDays('2026-03-01', -1), '2026-02-28');
const wk = c.lastDays(entries, '2026-10-06', 7);
assert.strictEqual(wk.length, 7); assert.strictEqual(wk[6].date, '2026-10-06'); assert.strictEqual(wk[5].kcal, 999);

// data sanity: unique ids, plausible values
const ids = new Set();
c.FOODS.forEach(f => { assert.ok(!ids.has(f.id), 'dup ' + f.id); ids.add(f.id);
  f.forms.forEach(([l, k, p]) => { assert.ok(k >= 0 && k <= 900 && p >= 0 && p * 4 <= k + 1 || k===0, f.id + ' ' + l); }); });
// every food category is in the display order; key new foods exist
c.FOODS.forEach(f => assert.ok(c.CATEGORIES.includes(f.cat), 'category missing: ' + f.cat));
['bok-choy', 'shake-rtd', 'shake-water', 'shake-milk'].forEach(id => assert.ok(c.FOODS.find(f => f.id === id), id));

// rangeDays: inclusive, ordered, capped at 366 days, picks up older entries beyond 7 days
const old = [e('2026-07-01', 100, 10, 100, 0)];
const r = c.rangeDays(old, '2026-06-30', '2026-07-03');
assert.strictEqual(r.length, 4); assert.strictEqual(r[1].kcal, 100); assert.strictEqual(r[0].count, 0);
assert.strictEqual(c.rangeDays(old, '2020-01-01', '2026-07-03').length, 366);
assert.strictEqual(c.rangeDays(old, '2026-07-03', '2026-07-01').length, 0);

// quantity parsing and display
const q = c.parseQty;
assert.strictEqual(q('1'), 1); assert.strictEqual(q('0.5'), 0.5); assert.strictEqual(q('1/2'), 0.5);
assert.strictEqual(q('1 1/2'), 1.5); assert.strictEqual(q('½'), 0.5); assert.strictEqual(q('1½'), 1.5);
assert.strictEqual(q(' 2,5 '), 2.5); assert.strictEqual(q('150'), 150);
['', 'abc', '0', '-1', '1/0', '1/2/3', '1 2 3', '1..2'].forEach(x => assert.ok(Number.isNaN(q(x)), 'should reject: ' + x));
assert.strictEqual(c.fmtQty(0.5), '½'); assert.strictEqual(c.fmtQty(1.5), '1½'); assert.strictEqual(c.fmtQty(2), '2');
assert.strictEqual(c.fmtQty(0.25), '¼'); assert.strictEqual(c.fmtQty(1/3), '⅓'); assert.strictEqual(c.fmtQty(0.7), '0.7');

// units: every key is a real food, form restrictions are valid, sizes are positive
Object.keys(c.UNITS).forEach(id => {
  const f = c.FOODS.find(x => x.id === id); assert.ok(f, 'unit for unknown food ' + id);
  c.UNITS[id].forEach(([label, g, form]) => { assert.ok(label && g > 0, id + ' ' + label);
    if (form !== undefined) assert.ok(f.forms[form], id + ' form ' + form); });
});
const bread = c.FOODS.find(f => f.id === 'bread-wholewheat');
assert.strictEqual(c.unitsFor(bread, 0)[0].label, 'slice, standard');
// 1 slice of wholewheat bread ~ 35 g -> 247 kcal/100 g -> about 86 kcal
assert.ok(Math.abs(c.entryNutrition({kcal: 247, protein: 13}, 1 * 35, 0).kcal - 86.45) < 0.01);
// half a medium orange (131 g) ~ 62 kcal at 47/100 g -> about 31 kcal
assert.ok(Math.abs(c.entryNutrition({kcal: 47, protein: 0.9}, 0.5 * 131, 0).kcal - 30.8) < 0.1);
// cooked-only units hide when the dry option is selected
const whiteRice = c.FOODS.find(f => f.id === 'white-rice');
assert.strictEqual(c.unitsFor(whiteRice, 0).length, 0); assert.strictEqual(c.unitsFor(whiteRice, 1).length, 1);
// custom food serving size
assert.strictEqual(c.unitsFor({custom: true, servingG: 60}, 0)[0].g, 60);
assert.strictEqual(c.unitsFor({custom: true}, 0).length, 0);

// meals
assert.deepStrictEqual(c.MEALS.map(m => m[0]), ['breakfast', 'lunch', 'dinner', 'snack']);
[[6, 'breakfast'], [10, 'breakfast'], [11, 'lunch'], [14, 'lunch'], [15, 'snack'], [17, 'dinner'], [20, 'dinner'], [21, 'snack'], [23, 'snack'], [2, 'breakfast']]
  .forEach(([h, m]) => assert.strictEqual(c.mealForHour(h), m, 'hour ' + h));

// frequent foods
const mk = (date, name, grams, extra) => Object.assign({ date, name, form: 'As is', kcal100: 100, p100: 10, grams, fatTsp: 0 }, extra);
const hist = [mk('2026-10-01', 'Egg', 100), mk('2026-10-02', 'Egg', 100), mk('2026-10-05', 'Egg', 100),
  mk('2026-10-03', 'Rice', 150), mk('2026-10-04', 'Rice', 150), mk('2026-10-04', 'Rice', 200),
  mk('2026-10-04', 'Once', 50), mk('2026-05-01', 'Old', 10), mk('2026-05-02', 'Old', 10), mk('2026-10-07', 'Future', 5), mk('2026-10-07', 'Future', 5)];
let fq = c.frequentFoods(hist, '2026-10-06', 60, 5, []);
assert.deepStrictEqual(fq.map(o => o.sample.name + ':' + o.count), ['Egg:3', 'Rice:2']);   // different amount = different item; old, future, single excluded
assert.deepStrictEqual(c.frequentFoods(hist, '2026-10-06', 60, 5, [c.entryKey(hist[0])]).map(o => o.sample.name), ['Rice']);
assert.strictEqual(c.frequentFoods(hist, '2026-10-06', 60, 1, []).length, 1);
assert.notStrictEqual(c.entryKey(mk('d', 'Egg', 100)), c.entryKey(mk('d', 'Egg', 100, { fatTsp: 1 })));
assert.notStrictEqual(c.entryKey(mk('d', 'Latte', 100, { manual: true, kcal100: 180 })), c.entryKey(mk('d', 'Latte', 100, { manual: true, kcal100: 200 })));

// Chinese greens exist and aliases are searchable
['gai-lan', 'yu-choy', 'ong-choy', 'yin-choy', 'gai-choy', 'gau-choy'].forEach(id => assert.ok(c.FOODS.find(f => f.id === id), id));
const hay = f => (f.name + ' ' + f.cat + ' ' + (f.aka || '')).toLowerCase();
const find = q => c.FOODS.filter(f => q.toLowerCase().split(/\s+/).every(w => hay(f).includes(w))).map(f => f.id);
assert.deepStrictEqual(find('kai lan'), ['gai-lan']); assert.deepStrictEqual(find('choy sum'), ['yu-choy']);
assert.ok(find('kangkong').includes('ong-choy')); assert.ok(find('baby bok').includes('bok-choy'));

// calorie meter thresholds
let cb = c.calorieBar(700, 1470); assert.strictEqual(cb.state, 'ok'); assert.ok(Math.abs(cb.withinPct - 100*700/1470) < 1e-9); assert.strictEqual(cb.overPct, 0); assert.strictEqual(cb.tickPct, 100);
assert.strictEqual(c.calorieBar(1322, 1470).state, 'ok'); assert.strictEqual(c.calorieBar(1323, 1470).state, 'near');
assert.strictEqual(c.calorieBar(1470, 1470).state, 'near');                       // exactly on target is not over
assert.strictEqual(c.calorieBar(1470.4, 1470).state, 'near');                      // rounds to 1,470
assert.strictEqual(c.calorieBar(1471, 1470).state, 'over');
cb = c.calorieBar(1764, 1470);                                                     // 20% over
assert.strictEqual(cb.state, 'over'); assert.ok(Math.abs(cb.tickPct - 100*1470/1764) < 1e-9);
assert.ok(Math.abs(cb.withinPct + cb.overPct - 100) < 1e-9);
assert.strictEqual(c.calorieBar(0, 1470).state, 'ok');

// workouts
assert.strictEqual(c.workoutKcal('boxing', 'moderate', 60, 52), 312);        // (7-1) x 52 x 1h
assert.strictEqual(c.workoutKcal('strength', 'moderate', 30, 52), 104);      // (5-1) x 52 x 0.5h
assert.strictEqual(c.workoutKcal('walk', 'easy', 60, 52), Math.round(1.8*52));
assert.ok(c.workoutKcal('boxing','hard',60,52) > c.workoutKcal('boxing','moderate',60,52));
assert.strictEqual(c.workoutKcal('nonsense', 'bogus', 60, 52), Math.round((4-1)*52));   // unknown -> other/easy
assert.strictEqual(c.workoutKcal('yoga', 'easy', 0, 52), 0);
Object.keys(c.WORKOUT_TYPES).forEach(k => { const m = c.WORKOUT_TYPES[k][1]; assert.ok(m.length === 3 && m[0] < m[1] && m[1] < m[2], k); });
// week runs Monday to Sunday (2026-10-07 is a Wednesday)
assert.strictEqual(c.weekStart('2026-10-07'), '2026-10-05'); assert.strictEqual(c.weekStart('2026-10-05'), '2026-10-05');
assert.strictEqual(c.weekStart('2026-10-11'), '2026-10-05'); assert.strictEqual(c.weekStart('2026-10-12'), '2026-10-12');
assert.strictEqual(c.weekStart('2026-01-01'), '2025-12-29');
const wo = [{ id: 'a', date: '2026-10-05', type: 'boxing', minutes: 60, kcal: 300 }, { id: 'b', date: '2026-10-07', type: 'strength', minutes: 45, kcal: 150 },
  { id: 'c', date: '2026-10-04', type: 'walk', minutes: 30, kcal: 50 }, { id: 'd', date: '2026-10-12', type: 'walk', minutes: 30, kcal: 50 }];
const ws = c.weekSummary(wo, '2026-10-09');
assert.deepStrictEqual([ws.start, ws.end, ws.sessions, ws.minutes, ws.kcal], ['2026-10-05', '2026-10-11', 2, 105, 450]);
// last-time lookup: most recent strictly earlier, case-insensitive, can exclude the one being edited
const lifts = [{ id: 'x1', date: '2026-09-23', exercises: [{ name: 'Squat', sets: 3, reps: 8, kg: 25 }] },
  { id: 'x2', date: '2026-09-30', exercises: [{ name: 'squat ', sets: 3, reps: 8, kg: 30 }, { name: 'Row', sets: 3, reps: 10, kg: 15 }] },
  { id: 'x3', date: '2026-10-07', exercises: [{ name: 'Squat', sets: 4, reps: 6, kg: 35 }] }];
assert.strictEqual(c.lastLift(lifts, 'Squat', '2026-10-07').kg, 30);
assert.strictEqual(c.lastLift(lifts, 'SQUAT', '2026-10-08').kg, 35);
assert.strictEqual(c.lastLift(lifts, 'Squat', '2026-10-08', 'x3').kg, 30);
assert.strictEqual(c.lastLift(lifts, 'Squat', '2026-09-23'), null);
assert.strictEqual(c.lastLift(lifts, '', '2026-10-08'), null); assert.strictEqual(c.lastLift(lifts, 'Deadlift', '2026-10-08'), null);

// day budget: food - workout vs target
assert.strictEqual(c.targets({ ...me, activity: 1.3 }).kcal, 1320);                   // day-to-day base used with net mode
assert.strictEqual(c.workoutKcalFor([{ date: 'd1', kcal: 300 }, { date: 'd1', kcal: 12.4 }, { date: 'd2', kcal: 99 }], 'd1'), 312.4);
let bd = c.dayBudget(1500, 312, 1320, true);
assert.deepStrictEqual([bd.food, bd.burn, bd.net, bd.left, bd.state], [1500, 312, 1188, 132, 'near']);
assert.ok(Math.abs(bd.solidPct + bd.burnPct - 100) < 1e-9 && Math.abs(bd.tickPct - 100*1320/1500) < 1e-9);   // bar spans food; target tick inside
assert.strictEqual(c.dayBudget(1500, 312, 1320, false).net, 1500);                    // subtraction off
assert.strictEqual(c.dayBudget(1500, 312, 1320, false).burnPct, 0);
assert.strictEqual(c.dayBudget(1700, 312, 1320, true).state, 'over');                  // 1388 net > 1320
assert.strictEqual(c.dayBudget(1632, 312, 1320, true).state, 'near');                  // net exactly on target is not over
assert.strictEqual(c.dayBudget(1633, 312, 1320, true).state, 'over');
assert.strictEqual(c.dayBudget(1250, 312, 1320, true).state, 'ok');                    // 938 net, under 90%
bd = c.dayBudget(200, 500, 1320, true);                                                // burn bigger than food
assert.strictEqual(bd.net, -300); assert.strictEqual(bd.solidPct, 0); assert.ok(bd.burnPct <= 100); assert.strictEqual(bd.state, 'ok');
assert.strictEqual(c.dayBudget(0, 0, 1320, true).state, 'ok');
const rd = c.rangeDays([e('2026-10-06', 100, 10, 100, 0)], '2026-10-05', '2026-10-06', [{ date: '2026-10-06', kcal: 40 }, { date: '2026-10-05', kcal: 70 }]);
assert.deepStrictEqual(rd.map(d => d.workout), [70, 40]);

// carbs data: every food/state has a value, and it is physically plausible (4 kcal/g protein + 4 kcal/g carbs, fibre and water give slack)
c.FOODS.forEach(f => {
  assert.ok(c.CARBS[f.id], 'no carbs for ' + f.id); assert.strictEqual(c.CARBS[f.id].length, f.forms.length, 'carb count ' + f.id);
  f.forms.forEach(([label, k, p, cb]) => { assert.ok(cb >= 0 && cb <= 100, f.id + ' ' + label);
    assert.ok(4*p + 4*cb <= k + 35, f.id + ' ' + label + ' macros exceed calories: ' + (4*p + 4*cb) + ' vs ' + k); });
});
Object.keys(c.CARBS).forEach(id => assert.ok(c.FOODS.find(f => f.id === id), 'carbs for unknown food ' + id));
assert.strictEqual(c.FOODS.find(f => f.id === 'white-rice').forms[1][3], 28);
assert.strictEqual(c.entryNutrition({ kcal: 130, protein: 2.7, carbs: 28 }, 200, 0).carbs, 56);
assert.strictEqual(c.entryNutrition({ kcal: 130, protein: 2.7 }, 200, 0).carbs, 0);     // unknown carbs -> 0
// totals carry carbs and flag entries with no carb data
const ce = [{ date: 'x', kcal100: 130, p100: 2.7, c100: 28, grams: 100, fatTsp: 0 }, { date: 'x', kcal100: 50, p100: 1, grams: 100, fatTsp: 0 }];
const ct = c.totalsFor(ce, 'x'); assert.strictEqual(ct.carbs, 28); assert.strictEqual(ct.carbsUnknown, 1); assert.strictEqual(ct.count, 2);
// targets: auto, manual, and linked carbs
let tg = c.targets(me);
assert.deepStrictEqual([tg.kcal, tg.protein, tg.carbs], [1470, 99, 147]);              // 40% of 1470 / 4
assert.deepStrictEqual([tg.auto.kcal, tg.auto.protein, tg.auto.carbs], [true, true, true]);
assert.strictEqual(tg.fat, Math.round((1470 - 4*99 - 4*147)/9));
tg = c.targets({ ...me, calTarget: 1600 });                                             // changing calories moves auto carbs
assert.deepStrictEqual([tg.kcal, tg.protein, tg.carbs, tg.auto.kcal], [1600, 99, 160, false]);
tg = c.targets({ ...me, calTarget: 1600, carbTarget: 120 });                            // manual carbs stays put
assert.deepStrictEqual([tg.kcal, tg.carbs, tg.auto.carbs], [1600, 120, false]);
tg = c.targets({ ...me, protTarget: 110, carbPct: 30 });
assert.deepStrictEqual([tg.protein, tg.carbs, tg.kcal], [110, 110, 1470]);
tg = c.targets({ ...me, calTarget: null, protTarget: 0, carbTarget: undefined }); assert.ok(tg.auto.kcal && tg.auto.protein && tg.auto.carbs);
assert.ok(c.targets({ ...me, protTarget: 200, carbTarget: 300, calTarget: 1300 }).fat === 0);   // fat never negative

// calorie KPIs: food vs target, and adjusted total vs target
let kp = c.calorieKpis(1500, 312, 1320, true);
assert.deepStrictEqual([kp.foodDelta, kp.foodState, kp.net, kp.netDelta, kp.netState, kp.left], [180, 'over', 1188, -132, 'near', 132]);
kp = c.calorieKpis(1000, 312, 1320, true); assert.deepStrictEqual([kp.foodDelta, kp.foodState, kp.net, kp.netState], [-320, 'ok', 688, 'ok']);
kp = c.calorieKpis(1700, 312, 1320, true); assert.deepStrictEqual([kp.foodState, kp.netState, kp.netDelta], ['over', 'over', 68]);
kp = c.calorieKpis(1400, 500, 1320, true); assert.deepStrictEqual([kp.foodState, kp.netState], ['over', 'ok']);   // workout brings an over day back under
kp = c.calorieKpis(1400, 500, 1320, false); assert.deepStrictEqual([kp.net, kp.netState, kp.burn], [1400, 'over', 0]);   // not subtracting
kp = c.calorieKpis(1320, 0, 1320, true); assert.deepStrictEqual([kp.foodDelta, kp.foodState, kp.netState], [0, 'near', 'near']);

console.log('all tests passed,', c.FOODS.length, 'foods');
