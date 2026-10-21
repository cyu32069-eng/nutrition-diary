import React,{useEffect,useState} from 'react';
import {View,Text,TextInput,Pressable,StyleSheet,Linking} from 'react-native';
const {validateProfile,estimateEnergy}=require('./energy');
const blank={height:'',weight:'',age:'',sex:''};
export default function BodyProfile({value,disabled,onSave,totals}){
 const [draft,setDraft]=useState(value||blank),[error,setError]=useState(''),[editing,setEditing]=useState(false);
 useEffect(()=>{setDraft(value||blank);setEditing(false);},[value]);
 const energy=value?estimateEnergy(value):null;
 const balance=energy?Math.round((energy.bmr-totals.calories)*10)/10:null;
 function change(key,val){setDraft(old=>({...old,[key]:val}));setError('');}
 async function save(){try{const p=validateProfile(draft);if(await onSave(p)){setEditing(false);setError('');}else setError('保存失败，请重试。');}catch(e){setError(e.message);}}
 return <View testID="top-overview" style={s.panel}>
   <View style={s.heading}><Text style={s.title}>身体数据</Text>{<Pressable accessibilityRole="button" accessibilityLabel={editing?'取消修改身体数据':value?'修改身体数据':'填写身体数据'} onPress={()=>{setEditing(!editing);setDraft(value||blank);setError('');}} style={s.toggle}><Text style={s.link}>{editing?'取消':value?'修改':'填写'}</Text></Pressable>}</View>
   {editing?<>
    <View style={s.fields}>{[['height','身高','厘米'],['weight','体重','千克'],['age','年龄','岁']].map(([key,label,unit])=><View key={key} style={s.field}><Text style={s.label}>{label} · {unit}</Text><TextInput accessibilityLabel={label+'，单位'+unit} value={String(draft[key])} onChangeText={v=>change(key,v)} keyboardType={key==='age'?'number-pad':'decimal-pad'} inputMode={key==='age'?'numeric':'decimal'} placeholder={key==='height'?'例如 175':key==='weight'?'例如 70':'例如 30'} style={s.input} editable={!disabled}/></View>)}</View>
    <Text style={s.label}>公式使用的性别</Text><View style={s.sexRow}>{[['male','男'],['female','女']].map(([key,label])=><Pressable key={key} accessibilityRole="button" accessibilityLabel={'公式性别：'+label} accessibilityState={{selected:draft.sex===key}} onPress={()=>change('sex',key)} style={[s.sex,draft.sex===key&&s.selected]}><Text style={[s.choice,draft.sex===key&&s.selectedText]}>{label}</Text></Pressable>)}</View>
    {!!error&&<Text accessibilityRole="alert" style={s.error}>{error}</Text>}
    <Pressable accessibilityRole="button" accessibilityLabel="保存身体数据" disabled={disabled} onPress={save} style={[s.save,disabled&&{opacity:.4}]}><Text style={s.saveText}>保存并计算</Text></Pressable>
    <Text style={s.note}>此公式用于 19–78 岁成人估算；数值不是实测消耗。</Text>
   </>:<Text style={s.details}>{value?`${value.height} 厘米 · ${value.weight} 千克 · ${value.age} 岁 · ${value.sex==='male'?'男':'女'}`:'填写身体数据，查看基础代谢'}</Text>}
   <Text accessibilityLabel="基础代谢估算结果" style={s.metabolism}>基础代谢估算 · {energy?energy.bmr.toLocaleString('zh-CN')+' 千卡／天':'—'}</Text>
   <View style={s.results}>
    <View style={s.recorded}><Text style={s.label}>已记录热量</Text><Text accessibilityLabel="已记录热量数值" style={s.intakeValue}>{totals.calories.toLocaleString('zh-CN',{maximumFractionDigits:1})}<Text style={s.unit}> 千卡</Text></Text></View>
    <View style={s.bmr}><Text style={s.label}>{balance!==null&&balance<0?'赤字':'盈余'}</Text><Text accessibilityLabel="盈余赤字数值" style={[s.resultValue,balance!==null&&balance<0&&s.deficit]}>{balance===null?'—':Math.abs(balance).toLocaleString('zh-CN',{maximumFractionDigits:1})}</Text><Text style={s.unit}>千卡 · 相对基础代谢</Text></View>
   </View>
   <View style={s.macros}>{[['蛋白质',totals.protein],['碳水',totals.carbs],['脂肪',totals.fat]].map(([label,n])=><View key={label} style={s.result}><Text style={s.label}>{label}</Text><Text style={s.macroValue}>{n.toLocaleString('zh-CN',{maximumFractionDigits:1})}<Text style={s.unit}> 克</Text></Text></View>)}</View>
   <Pressable accessibilityRole="link" onPress={()=>Linking.openURL('https://pubmed.ncbi.nlm.nih.gov/2305711/?dopt=Abstract')} style={s.source}><Text style={s.sourceText}>基础代谢计算依据：Mifflin–St Jeor</Text></Pressable>
 </View>;
}
const s=StyleSheet.create({
 metabolism:{fontSize:12,color:'#cfdbef',lineHeight:20,marginTop:-10,marginBottom:20},deficit:{color:'#ff8b91'},
 panel:{backgroundColor:'#183457',borderRadius:25,padding:24,marginBottom:4},heading:{flexDirection:'row',alignItems:'center',justifyContent:'space-between',marginTop:-6,marginBottom:2},title:{fontSize:12,color:'#cfdbef'},toggle:{minHeight:36,paddingHorizontal:8,justifyContent:'center'},link:{fontSize:12,color:'#aecbff'},details:{fontSize:12,color:'#cfdbef',lineHeight:21,marginBottom:18},
 results:{flexDirection:'row',gap:10,alignItems:'flex-start',marginBottom:22},recorded:{flex:1.2,minWidth:0},bmr:{flex:1,minWidth:0,borderLeftWidth:1,borderLeftColor:'#ffffff26',paddingLeft:14},label:{fontSize:12,color:'#cfdbef',lineHeight:18},intakeValue:{fontSize:38,fontWeight:'700',letterSpacing:-1,color:'#fff',marginTop:8,fontVariant:['tabular-nums']},resultValue:{fontSize:28,fontWeight:'600',color:'#fff',marginTop:10,fontVariant:['tabular-nums']},unit:{fontSize:10,color:'#c2d1e8',fontWeight:'400'},macros:{flexDirection:'row',gap:8,paddingTop:17,borderTopWidth:1,borderTopColor:'#ffffff26'},result:{flex:1,minWidth:0},macroValue:{fontSize:21,fontWeight:'600',color:'#fff',marginTop:8,fontVariant:['tabular-nums']},
 fields:{flexDirection:'row',gap:8,marginTop:8,marginBottom:14},field:{flex:1,minWidth:0},input:{fontSize:16,color:'#172d49',backgroundColor:'#f3f6fa',borderWidth:1,borderColor:'#cbd7e7',borderRadius:10,minHeight:46,paddingHorizontal:9,marginTop:7},sexRow:{flexDirection:'row',gap:8,marginTop:7},sex:{flex:1,alignItems:'center',justifyContent:'center',minHeight:44,borderRadius:10,backgroundColor:'#f3f6fa',borderWidth:1,borderColor:'transparent'},selected:{backgroundColor:'#dbe9ff',borderColor:'#91b4ed'},choice:{fontSize:13,color:'#172d49',fontWeight:'600'},selectedText:{color:'#245ed3'},save:{backgroundColor:'#245ed3',minHeight:46,borderRadius:12,alignItems:'center',justifyContent:'center',marginTop:14},saveText:{fontSize:15,color:'#fff',fontWeight:'600'},error:{fontSize:13,color:'#ffb5b5',marginTop:10,lineHeight:20},note:{fontSize:10,color:'#c2d1e8',lineHeight:17,marginTop:10,marginBottom:16},source:{alignSelf:'flex-start',minHeight:30,justifyContent:'center',marginTop:10,marginBottom:-10},sourceText:{fontSize:9,color:'#c2d1e8'}
});
