const database = require('./data/foods.json');
const chineseIndex = require('./data/chinese-index.json');
const fitnessIndex = require('./data/fitness-index.json');
const translations = new Map([...chineseIndex,...fitnessIndex].map(([fdcId,name,aliases,detail,category,weighing])=>
  [fdcId,{name,aliases,detail,category,weighing}]));
const allFoods = database.foods.map(food => ({
  ...food, name:food.nameEn, aliases:[], detail:food.nameEn, category:'other',
  ...translations.get(food.fdcId),
}));
const byId = new Map(allFoods.map(f=>[f.id,f]));
const FOODS = fitnessIndex.map(([id])=>byId.get('usda-'+id));
const selectable = new Set(FOODS.map(f=>f.id));
const CATEGORIES = [
  ['all','全部'],['beef','牛肉'],['pork','猪肉'],['poultry','鸡羊肉'],
  ['fish','鱼虾'],['greens','绿色蔬菜'],['oil','食用油'],['staples','主食'],['other','其他'],
];
const MEAT_CATEGORIES = ['beef','pork','poultry','fish'];
const commonIds = [171077,171765,168249,173614,168462,171413,170556,169757].map(id=>'usda-'+id);
function getFood(id) { return byId.get(id) || null; }
function isSelectable(id) { return selectable.has(id); }
function searchFoods(query='', recentIds=[], limit=20,category='all') {
  const q=query.trim().toLocaleLowerCase().replace(/\s+/g,' ');
  const candidates=FOODS.filter(f=>category==='all'||f.category===category);
  if(!q&&category==='all') {
    const ids=[...new Set([...recentIds,...commonIds])].filter(id=>selectable.has(id)).slice(0,8);
    return {foods:ids.map(id=>byId.get(id)),total:ids.length};
  }
  const terms=q.split(' ');
  const matches=candidates.map(food=>{
    const aliases=[...food.aliases,...(MEAT_CATEGORIES.includes(food.category)?['肉','肉类']:[])].join(' ').toLocaleLowerCase();
    const name=food.name.toLocaleLowerCase();
    const searchable=[name,aliases,food.nameEn.toLocaleLowerCase()].join(' ');
    if(!terms.every(term=>searchable.includes(term)))return null;
    const rank=name===q?0:food.aliases.some(a=>a.toLocaleLowerCase()===q)?1:name.startsWith(q)?2:name.includes(q)?3:4;
    return {food,rank};
  }).filter(Boolean).sort((a,b)=>a.rank-b.rank||Number(!!b.food.aliases.length)-Number(!!a.food.aliases.length));
  return {foods:matches.slice(0,limit).map(m=>m.food),total:matches.length};
}
function foodSource(food) {
  return {provider:'USDA FoodData Central',dataType:database.dataType,release:database.release,
    fdcId:food.fdcId,url:'https://fdc.nal.usda.gov/food-details/'+food.fdcId+'/nutrients',
    description:food.nameEn,basis:'每 100 克可食部分',detail:food.detail};
}
module.exports={FOODS,getFood,isSelectable,searchFoods,foodSource,CATEGORIES,MEAT_CATEGORIES,DATABASE_INFO:{
  count:FOODS.length,chineseCount:FOODS.length,source:database.source,
  release:database.release,license:database.license,
}};
