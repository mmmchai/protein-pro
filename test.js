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

console.log('all tests passed,', c.FOODS.length, 'foods');
