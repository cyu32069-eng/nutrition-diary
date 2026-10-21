const {FOODS,getFood,isSelectable,foodSource} = require('./food-database');
const MEALS = ['早餐', '午餐', '晚餐', '加餐'];
const NUTRIENTS = ['calories', 'protein', 'carbs', 'fat'];
function dateKey(date = new Date()) {
  return [date.getFullYear(), String(date.getMonth()+1).padStart(2,'0'), String(date.getDate()).padStart(2,'0')].join('-');
}
function shiftDate(key, amount) {
  const [y,m,d] = key.split('-').map(Number);
  return dateKey(new Date(y,m-1,d+amount,12));
}
function validDate(key) {
  if (typeof key !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(key)) return false;
  const [y,m,d] = key.split('-').map(Number);
  return dateKey(new Date(y,m-1,d,12)) === key;
}
function parseWeight(text) {
  const clean = String(text).trim();
  if (!/^(?:\d+(?:\.\d*)?|\.\d+)$/.test(clean)) throw new Error('请输入有效重量，例如 150。');
  const n = Number(clean);
  if (!Number.isFinite(n) || n <= 0 || n > 100000) throw new Error('重量须大于 0，且不超过 100,000 克。');
  return n;
}
function calculate(food, weight) {
  const result = {};
  NUTRIENTS.forEach(k => { result[k] = food[k] * (weight / 100); });
  return result;
}
function readWeighing({weightText, mode='net', wasteText=''}) {
  const gross = parseWeight(weightText);
  if(mode==='net') return {weight:gross,weighing:{mode:'net',gross,waste:0}};
  if(mode!=='bone') throw new Error('请选择称重方式。');
  if(String(wasteText).trim()==='') throw new Error('请填写吃剩的骨重；不能直接把骨头计入营养。');
  const clean=String(wasteText).trim();
  if(!/^(?:\d+(?:\.\d*)?|\.\d+)$/.test(clean)) throw new Error('请输入有效骨重。');
  const waste=Number(clean);
  if(!Number.isFinite(waste)||waste<=0||waste>=gross) throw new Error('骨重须大于 0，且小于带骨总重；无骨请选净肉重。');
  return {weight:gross-waste,weighing:{mode:'bone',gross,waste}};
}
function makeRecord({id, date, meal, foodId, weightText, mode='net', wasteText=''}) {
  const food = getFood(foodId);
  if (!food||!isSelectable(foodId)) throw new Error('请先在常用食物库中选择条目。');
  if (!validDate(date) || !MEALS.includes(meal) || typeof id !== 'string' || !id) throw new Error('记录日期或餐次无效。');
  const {weight,weighing}=readWeighing({weightText,mode,wasteText});
  if(mode==='bone'&&food.weighing!=='bone') throw new Error('该条目按可食部分称重，请选择净重。');
  return {id,date,meal,name:food.name,foodId:food.id,source:foodSource(food),weight,weighing,...calculate(food,weight)};
}
function editRecord(record, weightText, mode='net', wasteText='') {
  const {weight,weighing}=readWeighing({weightText,mode,wasteText});
  const ratio = weight / record.weight;
  return {...record,weight,weighing,...Object.fromEntries(NUTRIENTS.map(k => [k,record[k]*ratio]))};
}
function totals(records) {
  return records.reduce((a,r) => { NUTRIENTS.forEach(k => { a[k] += r[k]; }); return a; }, {calories:0,protein:0,carbs:0,fat:0});
}
function validRecord(r) {
  return r && typeof r === 'object' && typeof r.id === 'string' && r.id !== '' &&
    validDate(r.date) && MEALS.includes(r.meal) && typeof r.name === 'string' && r.name.trim() !== '' &&
    Number.isFinite(r.weight) && r.weight > 0 && r.weight <= 100000 &&
    NUTRIENTS.every(k => Number.isFinite(r[k]) && r[k] >= 0) &&
    (!r.weighing || (['net','bone'].includes(r.weighing.mode)&&
      Number.isFinite(r.weighing.gross)&&Number.isFinite(r.weighing.waste)&&
      r.weighing.gross>0&&r.weighing.gross<=100000&&r.weighing.waste>=0&&
      (r.weighing.mode==='net'?r.weighing.waste===0:r.weighing.waste>0)&&
      Math.abs(r.weighing.gross-r.weighing.waste-r.weight)<0.000001));
}
function decode(text) {
  if (text === null) return [];
  const data = JSON.parse(text);
  if (!data || ![1,2].includes(data.version) || !Array.isArray(data.records) || !data.records.every(validRecord) ||
      new Set(data.records.map(r=>r.id)).size !== data.records.length ||
      !NUTRIENTS.every(k=>Number.isFinite(totals(data.records)[k]))) throw new Error('保存的记录格式无法读取。');
  return data.records.map(r=>r.source?r:{...r,source:{provider:'legacy-example',detail:'旧版示例数据，未重新计算'}});
}
function encode(records) { return JSON.stringify({version:2,records}); }
module.exports = {FOODS,MEALS,dateKey,shiftDate,parseWeight,readWeighing,makeRecord,editRecord,totals,decode,encode};
