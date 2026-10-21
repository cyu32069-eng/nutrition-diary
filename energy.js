// Mifflin–St Jeor simplified REE equation, PMID 2305711.
function numeric(value,label,min,max,integer=false){
 const text=String(value??'').trim();
 if(!/^\d+(\.\d+)?$/.test(text))throw new Error('请填写'+label+'。');
 const n=Number(text);
 if(!Number.isFinite(n)||n<min||n>max||(integer&&!Number.isInteger(n)))throw new Error(label+'应为 '+min+'–'+max+(integer?' 的整数。':'。'));
 return n;
}
function validateProfile(p){
 if(!p||!['male','female'].includes(p.sex))throw new Error('请选择公式使用的性别。');
 const height=numeric(p.height,'身高（厘米）',100,250),weight=numeric(p.weight,'体重（千克）',25,350),age=numeric(p.age,'年龄（岁）',19,78,true);
 return {height,weight,age,sex:p.sex};
}
function estimateEnergy(profile){
 const p=validateProfile(profile),bmr=10*p.weight+6.25*p.height-5*p.age+(p.sex==='male'?5:-161);
 return {bmr:Math.round(bmr)};
}
module.exports={validateProfile,estimateEnergy};
