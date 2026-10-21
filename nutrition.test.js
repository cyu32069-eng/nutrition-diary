const test = require('node:test');
const assert = require('node:assert/strict');
const n = require('./nutrition');
const db = require('./food-database');
const ids = {'鸡胸肉':'usda-171077','米饭':'usda-169757','燕麦':'usda-173904'};
function record(foodName, weightText, id = foodName) {
  return n.makeRecord({id,date:'2026-10-18',meal:'午餐',foodId:ids[foodName],weightText});
}
test('local calendar dates remain correct across month and year boundaries',()=>{
  assert.equal(n.dateKey(new Date(2026,9,18,0,1)),'2026-10-18');
  assert.equal(n.shiftDate('2026-01-01',-1),'2025-12-31');
  assert.equal(n.shiftDate('2024-02-28',1),'2024-02-29');
  assert.equal(n.shiftDate('2026-02-28',1),'2026-03-01');
});
test('adding, editing, and deleting give the expected nutrition totals',()=>{
  const a=record('鸡胸肉','100'), b=record('米饭','200');
  assert.equal(n.totals([a,b]).calories,380);
  assert.equal(n.totals([n.editRecord(a,'150'),b]).calories,440);
  assert.equal(n.totals([b]).calories,260);
  assert.equal(a.weight,100);
});
test('reject invalid input instead of silently interpreting it',()=>{
  for(const value of ['', '0', '-1', 'Infinity', '1e3', '1,5', 'abc', '100001']) assert.throws(()=>record('米饭',value));
  assert.equal(record('米饭','.5').weight,.5);
  assert.throws(()=>record('不存在的食物','100'));
  assert.throws(()=>n.makeRecord({id:'a',date:'2026-02-31',meal:'午餐',foodId:ids['米饭'],weightText:'100'}));
});
test('offline source records and Chinese aliases select the right edible portion',()=>{
  assert.equal(db.DATABASE_INFO.count,69);
  assert.equal(db.DATABASE_INFO.chineseCount,69);
  const seeds=db.searchFoods('南瓜子').foods;
  assert.equal(seeds.length,1);
  assert(seeds.every(f=>f.name.includes('仁')&&!f.nameEn.includes('whole')));
  assert.equal(db.searchFoods('去壳南瓜子').foods.length,1);
  assert.equal(db.searchFoods('琵琶腿').foods.length,1);
  assert(db.searchFoods('琵琶腿').foods.every(f=>f.nameEn.includes('meat only')));
  assert.equal(db.searchFoods('chicken drumstick').total,1);
  assert.equal(db.searchFoods('绝对不存在的菜肴').total,0);
  assert.equal(new Set(db.FOODS.map(f=>f.id)).size,db.FOODS.length);
  for(const f of db.FOODS) for(const k of ['calories','protein','carbs','fat']) assert(Number.isFinite(f[k])&&f[k]>=0);
});
test('new records use raw meat; historic cooked foods remain readable but not selectable',()=>{
  const make=foodId=>n.makeRecord({id:foodId,date:'2026-10-18',meal:'晚餐',foodId,weightText:'100'});
  assert.equal(make('usda-170556').calories,559);
  assert.equal(make('usda-173614').calories,116);
  assert.throws(()=>make('usda-172377'));
  assert.throws(()=>make('usda-172376'));
  assert.equal(db.getFood('usda-172377').calories,169);
  const r=make('usda-173614');
  assert.equal(r.source.fdcId,173614);
  assert.equal(r.source.basis,'每 100 克可食部分');
  assert.deepEqual(n.editRecord(r,'200').source,r.source);
});
test('historical bone calculations survive the smaller raw-weight catalog',()=>{
  const r={id:'leg',date:'2026-10-18',meal:'晚餐',foodId:'usda-172377',name:'去皮琵琶腿（炖熟）',weight:160,
    weighing:{mode:'bone',gross:200,waste:40},calories:270.4,protein:44,carbs:0,fat:9.136,
    source:{provider:'USDA FoodData Central',fdcId:172377,detail:'熟 · 去皮去骨肉；炖制'}};
  assert.equal(r.weight,160);
  assert(Math.abs(r.calories-270.4)<0.000001);
  assert.deepEqual(r.weighing,{mode:'bone',gross:200,waste:40});
  const edited=n.editRecord(r,'250','bone','50');
  assert.equal(edited.weight,200);
  assert(Math.abs(edited.calories-338)<0.000001);
  for(const wasteText of ['','-1','0','200','201','NaN']) assert.throws(()=>n.editRecord(r,'200','bone',wasteText));
  assert.throws(()=>n.makeRecord({id:'new',date:'2026-10-18',meal:'晚餐',foodId:'usda-173614',weightText:'200',mode:'bone',wasteText:'40'}));
  assert.deepEqual(n.decode(n.encode([r])),[r]);
});
test('Chinese fitness categories cover cuts, greens and oils without recipe variants',()=>{
  assert.equal(db.searchFoods('牛肉').total,9);
  assert.equal(db.searchFoods('猪肉').total,10);
  assert.equal(db.searchFoods('绿色蔬菜').total,17);
  assert.equal(db.searchFoods('食用油').total,10);
  for(const q of ['牛里脊','牛腱子','牛腩','五花肉','猪里脊','猪排骨','空心菜','上海青','西兰花','花生油','菜籽油','香油'])assert(db.searchFoods(q).total>0,q);
  for(const food of db.FOODS){
    assert(/[\u4e00-\u9fff]/.test(food.name));
    assert(!/烹|炖|炸|烤/.test(food.name));
    if(db.MEAT_CATEGORIES.includes(food.category))assert(/\braw\b/i.test(food.nameEn),food.nameEn);
  }
  assert(db.searchFoods('',[],20,'oil').foods.every(f=>f.category==='oil'));
  assert(db.searchFoods('',[],20,'greens').foods.every(f=>f.category==='greens'));
  assert(db.searchFoods('', ['usda-172377']).foods.every(f=>db.isSelectable(f.id)));
  assert.equal(db.searchFoods('烤鸡胸').total,0);
  const oil=n.makeRecord({id:'oil',date:'2026-10-18',meal:'午餐',foodId:'usda-171413',weightText:'10'});
  assert.equal(oil.fat,10);
  assert(Math.abs(oil.calories-88.4)<.000001);
});
test('legacy records keep their original numbers and are labelled as examples',()=>{
  const legacy={id:'old',date:'2026-10-18',meal:'午餐',name:'鸡胸肉',weight:100,calories:120,protein:23,carbs:0,fat:3};
  const [migrated]=n.decode(JSON.stringify({version:1,records:[legacy]}));
  assert.equal(migrated.calories,120);
  assert.equal(migrated.source.provider,'legacy-example');
  assert.equal(n.editRecord(migrated,'200').calories,240);
  assert.deepEqual(n.decode(n.encode([migrated])),[migrated]);
});
test('daily and meal filtering keeps previous records separate',()=>{
  const a=record('米饭','100'),b={...record('燕麦','50'),date:'2026-10-17',meal:'早餐'};
  assert.equal(n.totals([a,b].filter(r=>r.date==='2026-10-18')).calories,130);
});
test('storage round trip and rejection of corrupt or duplicate data',()=>{
  const records=[record('米饭','100')];
  assert.deepEqual(n.decode(n.encode(records)),records);
  assert.deepEqual(n.decode(null),[]);
  for(const text of ['broken','{}','null',JSON.stringify({version:1,records:[{...records[0],weight:-1}]}),n.encode([...records,...records])]) assert.throws(()=>n.decode(text));
});
