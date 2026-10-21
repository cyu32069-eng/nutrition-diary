const test=require('node:test'),assert=require('node:assert/strict');
const {estimateEnergy,validateProfile}=require('./energy');
const p={height:175,weight:70,age:30,sex:'male'};
test('BMR only, without activity input or expenditure output',()=>{assert.deepEqual(estimateEnergy(p),{bmr:1649});assert.deepEqual(estimateEnergy({height:162,weight:60,age:30,sex:'female'}),{bmr:1302});assert.deepEqual(validateProfile({...p,activity:'high'}),p);});
test('invalid body inputs rejected',()=>{for(const patch of [{sex:''},{height:''},{height:'175oops'},{weight:0},{age:17},{age:79},{age:25.5}])assert.throws(()=>validateProfile({...p,...patch}));});
