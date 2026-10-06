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
assert.deepStrictEqual(n, { kcal: 0, protein: 0 });

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

console.log('all tests passed,', c.FOODS.length, 'foods');
