import React, {useEffect, useMemo, useRef, useState} from 'react';
import {ActivityIndicator, Alert, AppState, Keyboard, KeyboardAvoidingView, Modal, Platform,
  Pressable, ScrollView, Share, StyleSheet, Text, TextInput, View} from 'react-native';
import {SafeAreaProvider, SafeAreaView} from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {StatusBar} from 'expo-status-bar';
import MealCards from './MealCards';
import BodyProfile from './BodyProfile';
const {validateProfile}=require('./energy');
const {MEALS,dateKey,shiftDate,readWeighing,makeRecord,editRecord,totals,decode,encode} = require('./nutrition');
const {getFood,searchFoods,DATABASE_INFO,CATEGORIES,MEAT_CATEGORIES} = require('./food-database');

const STORAGE_KEY = 'nutrition-diary-prototype-v1';
const C = {bg:'#f3f6fa',ink:'#172d49',muted:'#526781',blue:'#245ed3',line:'#dfe7f1',white:'#ffffff',red:'#a83246'};
const fmt = n => n.toLocaleString('zh-CN',{maximumFractionDigits:1});
function defaultMeal() { const h = new Date().getHours(); return h<10?'早餐':h<15?'午餐':h<21?'晚餐':'加餐'; }
function Button({title,onPress,style,textStyle,disabled=false,label,selected=false}) {
  return <Pressable accessibilityRole="button" accessibilityLabel={label||title}
    accessibilityState={{disabled,selected}} disabled={disabled} onPress={onPress}
    style={({pressed})=>[s.button,style,pressed&&s.pressed,disabled&&s.disabled]}>
    <Text style={[s.buttonText,textStyle]}>{title}</Text>
  </Pressable>;
}
export default function App() {return <SafeAreaProvider><Diary/></SafeAreaProvider>;}
function Diary() {
  const [records,setRecords]=useState([]),[ready,setReady]=useState(false),[loadError,setLoadError]=useState(false);
  const [storageError,setStorageError]=useState(''),[saving,setSaving]=useState(false);
  const [bodyProfile,setBodyProfile]=useState(null);
  const [today,setToday]=useState(dateKey()),[selectedDate,setSelectedDate]=useState(dateKey());
  const [editor,setEditor]=useState(null),[foodName,setFoodName]=useState(''),[weight,setWeight]=useState('');
  const [foodId,setFoodId]=useState(''),[search,setSearch]=useState(''),[choosing,setChoosing]=useState(true);
  const [weighMode,setWeighMode]=useState('net'),[waste,setWaste]=useState('');
  const [category,setCategory]=useState('all'),[showSource,setShowSource]=useState(false);
  const [meal,setMeal]=useState(defaultMeal()),[error,setError]=useState('');
  const weightRef=useRef(null),snapshot=useRef([]),busy=useRef(false),profileRef=useRef(null);

  async function load() {
    setReady(false);
    try {
      const text=await AsyncStorage.getItem(STORAGE_KEY),loaded=decode(text);
      const savedProfile=text?JSON.parse(text).bodyProfile:null;
      if(!savedProfile){profileRef.current=null;setBodyProfile(null);}
      if(savedProfile){try{profileRef.current=validateProfile(savedProfile);setBodyProfile(profileRef.current);}catch(e){profileRef.current=null;setBodyProfile(null);setStorageError('身体数据无法读取，请重新填写；饮食记录已保留。');}}
      snapshot.current=loaded;setRecords(loaded);setLoadError(false);
    }catch(e){setLoadError(true);}
    finally{setReady(true);}
  }
  useEffect(()=>{load();},[]);
  useEffect(()=>{
    const check=()=>setToday(dateKey());
    const sub=AppState.addEventListener('change',state=>{if(state==='active')check();});
    const interval=setInterval(check,30000);
    return ()=>{sub.remove();clearInterval(interval);};
  },[]);
  async function commit(next,nextProfile=profileRef.current) {
    if(busy.current||loadError)return false;
    busy.current=true;setSaving(true);
    try {
      // Show a success only after persistent storage succeeds.
      await AsyncStorage.setItem(STORAGE_KEY,JSON.stringify({...JSON.parse(encode(next)),...(nextProfile?{bodyProfile:nextProfile}:{})}));
      snapshot.current=next;setRecords(next);profileRef.current=nextProfile;setBodyProfile(nextProfile);setStorageError('');return true;
    }catch(e){setStorageError('保存失败，记录未更改。请检查设备存储空间后重试。');return false;}
    finally{busy.current=false;setSaving(false);}
  }
  function openAdd(selectedMeal) {
    setFoodName('');setWeight('');setMeal(typeof selectedMeal==='string'?selectedMeal:defaultMeal());setError('');
    setFoodId('');setSearch('');setChoosing(true);setWeighMode('net');setWaste('');
    setCategory('all');setShowSource(false);
    setEditor({kind:'add',date:selectedDate});
  }
  function openEdit(record) {
    setFoodName(record.name);setWeight(String(record.weight));setMeal(record.meal);setError('');
    setFoodId(record.foodId||'');setChoosing(false);setSearch('');
    setShowSource(false);
    setWeighMode(record.weighing?.mode||'net');
    setWeight(String(record.weighing?.gross??record.weight));
    setWaste(record.weighing?.mode==='bone'?String(record.weighing.waste):'');
    setEditor({kind:'edit',record,date:record.date});
  }
  async function save() {
    if(busy.current||!editor)return;
    try{
      const record=editor.kind==='edit'?editRecord(editor.record,weight,weighMode,waste):makeRecord({
        id:Date.now().toString(36)+'-'+Math.random().toString(36).slice(2,10),
        date:editor.date,meal,foodId,weightText:weight,mode:weighMode,wasteText:waste,
      });
      const next=editor.kind==='edit'?snapshot.current.map(r=>r.id===record.id?record:r):[...snapshot.current,record];
      if(await commit(next)){Keyboard.dismiss();setEditor(null);}
      else setError('未能保存。请检查设备存储空间，再点一次保存。');
    }catch(e){setError(e.message);}
  }
  function remove(record) {
    if(Platform.OS==='web') {
      if(window.confirm('删除这条记录？\n'+record.name+' · '+fmt(record.weight)+' 克'))commit(snapshot.current.filter(r=>r.id!==record.id));
      return;
    }
    Alert.alert('删除这条记录？',record.name+' · '+fmt(record.weight)+' 克',[
      {text:'取消',style:'cancel'},
      {text:'删除',style:'destructive',onPress:()=>commit(snapshot.current.filter(r=>r.id!==record.id))},
    ]);
  }
  async function exportRecords() {
    try {
      const text=JSON.stringify({...JSON.parse(encode(snapshot.current)),...(profileRef.current?{bodyProfile:profileRef.current}:{})});
      if(Platform.OS!=='web'){await Share.share({message:text,title:'饮食记录备份'});return;}
      const url=URL.createObjectURL(new Blob([text],{type:'application/json'}));
      const a=document.createElement('a');a.href=url;a.download='饮食记录-'+dateKey()+'.json';a.click();
      setTimeout(()=>URL.revokeObjectURL(url),1000);
    } catch(e){setStorageError('备份未导出，请重试。');}
  }
  function importRecords() {
    const input=document.createElement('input');input.type='file';input.accept='.json,application/json';
    input.onchange=async()=>{
      try {
        const file=input.files?.[0];if(!file)return;
        if(file.size>10*1024*1024)throw new Error('备份文件不能超过 10 MB。');
        const text=await file.text(),incoming=decode(text),data=JSON.parse(text);
        const incomingProfile=data.bodyProfile?validateProfile(data.bodyProfile):profileRef.current;
        if(!incoming.length&&!data.bodyProfile)throw new Error('备份中没有记录。');
        if(!window.confirm('导入 '+incoming.length+' 条记录？现有记录会保留，相同编号以备份为准。'+(data.bodyProfile?'备份中的身体数据也会恢复。':'')+'建议先导出当前备份。'))return;
        const merged=new Map(snapshot.current.map(r=>[r.id,r]));incoming.forEach(r=>merged.set(r.id,r));
        if(await commit([...merged.values()],incomingProfile))setStorageError('');
      }catch(e){setStorageError('导入失败：'+(e.message||'文件无法读取')+' 当前记录未更改。');}
    };
    input.click();
  }
  const daily=records.filter(r=>r.date===selectedDate),sum=totals(daily);
  const selectedFood=getFood(foodId);
  const found=useMemo(()=>searchFoods(search,[...records].reverse().map(r=>r.foodId).filter(Boolean),20,category),[search,records,category]);
  const historicalBone=editor?.kind==='edit'&&editor.record.weighing?.mode==='bone';
  const rawMeat=selectedFood&&MEAT_CATEGORIES.includes(selectedFood.category)&&selectedFood.detail.startsWith('生重');
  const isOil=selectedFood?.category==='oil';
  let edibleWeight=null;
  try {edibleWeight=readWeighing({weightText:weight,mode:weighMode,wasteText:waste}).weight;} catch(e){}
  function selectFood(food) {
    setFoodId(food.id);setFoodName(food.name);setChoosing(false);setError('');
    setWeighMode('net');setWaste('');setShowSource(false);
  }
  const title=selectedDate===today?'今天':selectedDate===shiftDate(today,-1)?'昨天':selectedDate.slice(5).replace('-','月')+'日';
  const dateLabel=selectedDate.replaceAll('-','.');
  const canWrite=ready&&!loadError&&!saving;
  return <SafeAreaView style={s.safe} edges={['top','left','right']}>
    <StatusBar style="dark"/>
    <View style={s.header}><View><Text style={s.appTitle}>饮食记录</Text><Text style={s.subtitle}>让每一餐，都有迹可循。</Text></View>
      <View style={s.prototype}><Text style={s.prototypeText}>体验版</Text></View></View>
    <ScrollView contentContainerStyle={s.page} keyboardShouldPersistTaps="handled">
      <View style={s.dateRow}>
        <Button title="‹" label="查看前一天" onPress={()=>setSelectedDate(d=>shiftDate(d,-1))} style={s.dateArrow} textStyle={s.arrowText}/>
        <View style={s.dateCenter}><Text style={s.dateTitle}>{title}</Text><Text style={s.dateCaption}>{dateLabel}</Text></View>
        <Button title="›" label="查看后一天" disabled={selectedDate>=today} onPress={()=>setSelectedDate(d=>shiftDate(d,1))} style={s.dateArrow} textStyle={s.arrowText}/>
      </View>
      {selectedDate!==today&&<Button title="回到今天" style={s.returnToday} textStyle={s.returnText} onPress={()=>setSelectedDate(today)}/>}
      {loadError?<View style={s.problem}><Text style={s.problemTitle}>暂时无法读取记录</Text><Text style={s.problemText}>原有数据未改动。为避免覆盖，已暂停添加；请重试读取。</Text><Button title="重新读取" onPress={load} style={s.retry}/></View>:<>
      {ready&&<BodyProfile value={bodyProfile} totals={sum} disabled={!canWrite} onSave={p=>commit(snapshot.current,p)}/>}
      <Text style={s.notice}>肉和蔬菜记生重 · 食用油单独记录</Text>
      {!ready?<ActivityIndicator style={{marginTop:40}} size="large" color={C.blue}/>:<>
      <View style={s.listHeading}><Text style={s.sectionTitle}>每一餐</Text><Text style={s.count}>{daily.length} 条记录</Text></View>
      <MealCards date={selectedDate} records={daily} canWrite={canWrite} onAdd={openAdd} onEdit={openEdit} onRemove={remove}/>
      <View style={s.localInfo}><Text style={s.localInfoTitle}>保存在你的设备</Text><Text style={s.localInfoText}>{Platform.OS==='web'?'记录保存在当前浏览器，不会上传。清理网站数据或更换浏览器不会保留原记录，请定期导出备份。Expo Go 的记录需手动导入。':'记录保存在当前 Expo 项目中。切换到网页前，请导出备份并保存为 JSON 文件。'}按日期保存，不会跨天混在一起。</Text>
        <View style={s.actions}><Button title="导出备份" disabled={!canWrite} onPress={exportRecords} textStyle={s.editText}/>{Platform.OS==='web'&&<Button title="导入备份" disabled={!canWrite} onPress={importRecords} textStyle={s.editText}/>}</View>
        {Platform.OS==='web'&&<Text style={s.localInfoText}>iPhone：在 Safari 分享菜单中选择「添加到主屏幕」。首次联网打开并缓存完成后，可离线记录。</Text>}
      </View>
      </>}</>}
      {!!storageError&&<Text accessibilityRole="alert" style={s.error}>{storageError}</Text>}
    </ScrollView>
    <SafeAreaView edges={['bottom']} style={s.bottom}>
      <Button title={saving?'正在保存…':'＋ 记录食物'} disabled={!canWrite} onPress={openAdd} style={s.primary} textStyle={s.primaryText}/>
    </SafeAreaView>
    <Modal visible={!!editor} animationType="slide" transparent onRequestClose={()=>{if(!saving)setEditor(null);}}>
      <View style={s.modalBackdrop}><KeyboardAvoidingView behavior={Platform.OS==='ios'?'padding':'height'} style={s.keyboard}>
        <SafeAreaView edges={['bottom']} style={s.sheet}>
          <View style={s.handle}/><View style={s.sheetHeader}><View><Text style={s.sheetTitle}>{editor?.kind==='edit'?'修改重量':choosing?'查找食物':'记下这一餐'}</Text><Text style={s.sheetDate}>{editor?.date}</Text></View><Button title="关闭" disabled={saving} onPress={()=>setEditor(null)} style={s.close} textStyle={s.closeText}/></View>
          <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={s.sheetContent}>
            {editor?.kind==='add'&&choosing?<>
              <TextInput style={s.searchInput} value={search} onChangeText={text=>{setSearch(text);setCategory('all');}} placeholder="搜索中文，如牛肉、菠菜、花生油" placeholderTextColor="#8290a2" accessibilityLabel="搜索食物" autoCorrect={false} returnKeyType="search"/>
              <View style={s.categoryList}>{CATEGORIES.map(([id,label])=><Button key={id} title={label} label={'分类：'+label} selected={category===id} onPress={()=>{setCategory(id);setSearch('');Keyboard.dismiss();}} style={[s.categoryChip,category===id&&s.choiceSelected]} textStyle={[s.choiceText,category===id&&s.choiceSelectedText]}/>)}</View>
              <Text style={s.searchCaption}>{search.trim()||category!=='all'?'找到 '+found.total+' 项'+(found.total>20?'，显示前 20 项':''):'最近使用与常见食物'}</Text>
              {found.foods.map(f=><Pressable key={f.id} accessibilityRole="button" accessibilityLabel={'选择'+f.name} onPress={()=>{Keyboard.dismiss();selectFood(f);}} style={({pressed})=>[s.foodResult,pressed&&s.pressed]}>
                <View style={{flex:1}}><Text style={s.resultName}>{f.name}</Text><Text style={s.resultDetail}>{f.detail}</Text></View><Text style={s.resultCalories}>{fmt(f.calories)}<Text style={s.resultUnit}> 千卡{ '\n' }/100克</Text></Text>
              </Pressable>)}
              {found.total===0&&<Text style={s.noResults}>常用库中暂时没有这项食物。试试其他中文别名，或告诉我需要补充的食材。</Text>}
              <Text style={s.databaseInfo}>常用中文食物 {DATABASE_INFO.count} 项。肉和蔬菜记生重，食用油另记；按实际部位和肥瘦选择。营养值为基础食材参考值。</Text>
            </>:<>
            <View style={s.selectedFood}>
              <Text style={s.selectedName}>{foodName}</Text>
              <Text style={s.resultDetail}>{selectedFood?.detail||'旧版示例数据；本次修改沿用原记录的营养比例'}</Text>
              {!!selectedFood&&<Text style={s.sourceDetail}>每 100 克：{fmt(selectedFood.calories)} 千卡 · 蛋白质 {fmt(selectedFood.protein)} 克 · 碳水 {fmt(selectedFood.carbs)} 克 · 脂肪 {fmt(selectedFood.fat)} 克</Text>}
              {!!selectedFood&&<Button title={showSource?'收起数据来源':'查看数据来源'} onPress={()=>setShowSource(v=>!v)} style={s.changeFood} textStyle={s.editText}/>}
              {showSource&&!!selectedFood&&<Text style={s.sourceDetail}>{selectedFood.nameEn}{ '\n' }USDA SR Legacy（2018）· FDC {selectedFood.fdcId}</Text>}
              {editor?.kind==='add'&&<Button title="更换食物" onPress={()=>{setChoosing(true);setSearch('');setCategory('all');}} style={s.changeFood} textStyle={s.editText}/>}
            </View>
            {editor?.kind==='add'&&<><Text style={s.fieldLabel}>餐次</Text><View style={s.choices}>{MEALS.map(m=><Button key={m} title={m} selected={meal===m} onPress={()=>setMeal(m)} style={[s.choice,meal===m&&s.choiceSelected]} textStyle={[s.choiceText,meal===m&&s.choiceSelectedText]}/>)}</View></>}
            {historicalBone&&<><Text style={s.fieldLabel}>历史记录的称重方式</Text><View style={s.choices}><Button title="去皮带骨总重" selected={weighMode==='bone'} onPress={()=>{setWeighMode('bone');setError('');}} style={[s.choice,weighMode==='bone'&&s.choiceSelected]} textStyle={s.choiceText}/><Button title="去皮去骨净肉重" selected={weighMode==='net'} onPress={()=>{setWeighMode('net');setError('');}} style={[s.choice,weighMode==='net'&&s.choiceSelected]} textStyle={s.choiceText}/></View><Text style={s.fixtureHint}>沿用原记录的生熟状态和营养比例，不重新换算成生肉。</Text></>}
            <Text style={s.fieldLabel}>{weighMode==='bone'?'去皮带骨总重（克）':isOil?'食用油重量（克）':rawMeat?'生重（克，去骨可食部分）':selectedFood?.category==='greens'?'生重（克，可食部分）':'可食部分净重（克）'}</Text>
            <TextInput ref={weightRef} style={s.weightInput} value={weight} onChangeText={text=>{setWeight(text);setError('');}} placeholder="例如 150" placeholderTextColor="#8290a2" keyboardType="decimal-pad" inputMode="decimal" returnKeyType="done" accessibilityLabel={weighMode==='bone'?'去皮带骨总重，单位克':'食用重量，单位克'} editable={!saving} onSubmitEditing={weighMode==='net'?save:undefined}/>
            {weighMode==='bone'&&<><Text style={s.fieldLabel}>吃剩骨重（克）</Text><TextInput style={s.weightInput} value={waste} onChangeText={text=>{setWaste(text);setError('');}} placeholder="例如 30" placeholderTextColor="#8290a2" keyboardType="decimal-pad" inputMode="decimal" accessibilityLabel="吃剩骨重，单位克" editable={!saving}/><Text style={s.edibleHint}>{edibleWeight===null?'填写总重和骨重后计算净肉重':'将按净肉 '+fmt(edibleWeight)+' 克计算营养'}</Text></>}
            {weighMode==='net'&&<Text style={s.fixtureHint}>{isOil?'按克记录，不按毫升或勺数直接换算。':rawMeat?'烹饪前称去骨肉重；标注去皮的条目还需去皮，不填熟肉重量。':'按上方称重说明填写；只计可食部分，瓜子不含壳。'}</Text>}
            <View style={s.portions}>{(isOil?['5','10','15']:['50','100','200']).map(w=><Button key={w} title={w+' 克'} onPress={()=>setWeight(w)} style={s.portion} textStyle={s.portionText}/>)}</View>
            {!!error&&<Text accessibilityRole="alert" style={s.error}>{error}</Text>}
            <Button title={saving?'正在保存…':editor?.kind==='edit'?'保存修改':'添加这条记录'} disabled={saving} onPress={save} style={s.primary} textStyle={s.primaryText}/>
            </>}
          </ScrollView>
        </SafeAreaView>
      </KeyboardAvoidingView></View>
    </Modal>
  </SafeAreaView>;
}
const s=StyleSheet.create({
  categoryList:{flexDirection:'row',flexWrap:'wrap',gap:8,paddingTop:14,paddingBottom:2},categoryChip:{borderRadius:12,minHeight:44,paddingHorizontal:13,backgroundColor:'#f0f4fa',borderWidth:1,borderColor:'transparent'},
  searchInput:{borderWidth:1,borderColor:'#cbd7e7',borderRadius:13,minHeight:52,paddingHorizontal:14,paddingVertical:12,fontSize:16,color:C.ink,marginTop:8},
  searchCaption:{fontSize:12,color:C.muted,marginTop:18,marginBottom:6},
  foodResult:{flexDirection:'row',alignItems:'center',gap:12,paddingVertical:16,borderBottomWidth:1,borderBottomColor:'#e6edf5',minHeight:74},
  resultName:{fontSize:15,fontWeight:'600',color:C.ink},resultDetail:{fontSize:12,lineHeight:19,color:C.muted,marginTop:5},
  resultCalories:{fontSize:17,color:C.ink,fontWeight:'600',textAlign:'right',minWidth:62},resultUnit:{fontSize:10,color:C.muted,fontWeight:'400'},
  noResults:{fontSize:14,color:C.muted,lineHeight:23,paddingVertical:24},databaseInfo:{fontSize:11,lineHeight:19,color:C.muted,marginTop:22,marginBottom:10},
  selectedFood:{backgroundColor:'#f2f6fc',padding:16,borderRadius:14,marginTop:8},selectedName:{fontSize:18,color:C.ink,fontWeight:'600'},
  sourceDetail:{fontSize:11,color:C.muted,lineHeight:18,marginTop:10},changeFood:{alignSelf:'flex-start',paddingHorizontal:0,minHeight:44,marginBottom:-8},
  edibleHint:{fontSize:13,color:'#245f4c',marginTop:10,lineHeight:20},sourceNote:{fontSize:10,color:C.muted,marginTop:7,lineHeight:17},
  safe:{flex:1,backgroundColor:C.bg,...(Platform.OS==='web'?{width:'100%',maxWidth:640,alignSelf:'center'}:{})},page:{paddingHorizontal:20,paddingBottom:28},
  header:{paddingHorizontal:24,paddingTop:16,paddingBottom:20,flexDirection:'row',alignItems:'center',justifyContent:'space-between'},
  appTitle:{fontSize:27,fontWeight:'800',color:C.ink,letterSpacing:-.8},subtitle:{fontSize:12,color:C.muted,marginTop:6},
  prototype:{backgroundColor:'#e4ecfb',borderRadius:9,paddingHorizontal:10,paddingVertical:7},prototypeText:{color:'#315eaa',fontSize:11,fontWeight:'600'},
  button:{minHeight:48,alignItems:'center',justifyContent:'center',paddingHorizontal:14},buttonText:{fontSize:15,color:C.ink},pressed:{opacity:.7},disabled:{opacity:.4},
  dateRow:{flexDirection:'row',alignItems:'center',justifyContent:'space-between',marginBottom:18},dateArrow:{width:48,borderRadius:15,backgroundColor:'#e8eef6'},arrowText:{fontSize:30,color:'#385879'},
  dateCenter:{alignItems:'center'},dateTitle:{fontSize:18,fontWeight:'700',color:C.ink},dateCaption:{fontSize:11,color:C.muted,marginTop:5,fontVariant:['tabular-nums']},
  returnToday:{alignSelf:'center',minHeight:44,marginTop:-12,marginBottom:10},returnText:{fontSize:13,color:C.blue},
  summary:{backgroundColor:'#183457',borderRadius:25,padding:24},summaryLabel:{color:'#d2def1',fontSize:13},
  energyOverview:{flexDirection:'row',gap:10,alignItems:'flex-start'},energyColumn:{flex:1.05,minWidth:0},balanceColumn:{flex:1,minWidth:0,borderLeftWidth:1,borderLeftColor:'#ffffff26',paddingLeft:12},
  energyRow:{flexDirection:'row',flexWrap:'wrap',alignItems:'baseline',gap:5,marginTop:10,marginBottom:16},energy:{fontSize:34,fontWeight:'700',letterSpacing:-1,color:C.white,fontVariant:['tabular-nums']},kcal:{fontSize:10,color:'#c2d1e8'},
  balanceRow:{flexDirection:'row',flexWrap:'wrap',alignItems:'baseline',gap:4,marginTop:10},balanceValue:{fontSize:30,fontWeight:'700',color:C.white,fontVariant:['tabular-nums']},balanceNote:{fontSize:9,color:'#c2d1e8',marginTop:6,lineHeight:15},overColor:{color:'#ffabab'},estimateNote:{fontSize:10,lineHeight:17,color:'#c2d1e8',marginBottom:14},
  macroRow:{flexDirection:'row',paddingTop:17,borderTopWidth:1,borderTopColor:'#ffffff26'},macro:{flex:1},macroHeading:{flexDirection:'row',alignItems:'center',gap:6},dot:{width:6,height:6,borderRadius:3},macroLabel:{fontSize:11,color:'#cfdbef'},macroValue:{color:C.white,fontSize:21,fontWeight:'600',marginTop:8,fontVariant:['tabular-nums']},grams:{fontSize:11,color:'#c2d1e8',fontWeight:'400'},
  notice:{fontSize:11,color:C.muted,textAlign:'center',marginTop:12,marginBottom:26},
  listHeading:{flexDirection:'row',justifyContent:'space-between',alignItems:'center',marginBottom:18},sectionTitle:{fontSize:19,fontWeight:'700',color:C.ink},count:{fontSize:12,color:C.muted},
  empty:{backgroundColor:C.white,borderRadius:22,padding:26,alignItems:'center',borderWidth:1,borderColor:'#e4ebf3'},
  emptyPlate:{width:62,height:62,borderRadius:31,borderWidth:2,borderColor:'#bdcce1',alignItems:'center',justifyContent:'center',marginBottom:20,backgroundColor:'#f4f7fc'},plateInner:{width:36,height:36,borderRadius:18,borderWidth:1,borderColor:'#bdcce1'},
  emptyTitle:{fontSize:17,fontWeight:'600',color:C.ink},emptyText:{fontSize:13,lineHeight:23,color:C.muted,textAlign:'center',marginTop:9},
  emptyButton:{marginTop:14},emptyButtonText:{fontSize:14,color:C.blue,fontWeight:'600'},
  mealSection:{marginBottom:22},mealHeading:{flexDirection:'row',justifyContent:'space-between',alignItems:'center',marginBottom:10,paddingHorizontal:4},mealTitle:{fontSize:14,fontWeight:'600',color:C.ink},mealCalories:{fontSize:12,color:C.muted},
  mealCard:{backgroundColor:C.white,borderRadius:20,borderWidth:1,borderColor:'#e4ebf3',overflow:'hidden'},record:{padding:18},recordBorder:{borderTopWidth:1,borderTopColor:'#edf1f7'},
  recordTop:{flexDirection:'row',gap:10,alignItems:'center'},foodName:{fontSize:17,fontWeight:'600',color:C.ink},weight:{fontSize:12,color:C.muted,marginTop:6},recordCalories:{fontSize:21,fontWeight:'600',color:C.ink,fontVariant:['tabular-nums']},smallUnit:{fontSize:11,fontWeight:'400',color:C.muted},recordMacros:{color:C.muted,fontSize:11,lineHeight:19,marginTop:12},
  actions:{flexDirection:'row',gap:8,marginTop:7,marginBottom:-8,marginLeft:-10},actionButton:{minHeight:44,paddingHorizontal:10},editText:{fontSize:12,color:'#315d9e'},deleteText:{fontSize:12,color:C.red},
  localInfo:{marginTop:22,paddingHorizontal:4},localInfoTitle:{fontSize:12,fontWeight:'600',color:C.muted},localInfoText:{fontSize:11,lineHeight:19,color:C.muted,marginTop:6},
  bottom:{backgroundColor:C.bg,paddingTop:10,paddingHorizontal:20,borderTopWidth:1,borderTopColor:C.line},
  primary:{backgroundColor:C.blue,borderRadius:15,minHeight:54,marginBottom:8},primaryText:{color:C.white,fontSize:16,fontWeight:'700'},
  modalBackdrop:{flex:1,backgroundColor:'#0e203a66',justifyContent:'flex-end',alignItems:'center'},keyboard:{width:'100%',maxWidth:640,maxHeight:'94%'},sheet:{backgroundColor:C.white,borderTopLeftRadius:27,borderTopRightRadius:27,paddingTop:10,maxHeight:'100%'},
  handle:{width:38,height:4,borderRadius:2,backgroundColor:'#ccd6e5',alignSelf:'center',marginBottom:12},
  sheetHeader:{flexDirection:'row',justifyContent:'space-between',alignItems:'center',paddingHorizontal:24,paddingBottom:12},sheetTitle:{fontSize:22,fontWeight:'700',color:C.ink},sheetDate:{fontSize:12,color:C.muted,marginTop:5},
  close:{paddingHorizontal:8},closeText:{fontSize:14,color:C.muted},sheetContent:{paddingHorizontal:24,paddingBottom:20},
  fieldLabel:{fontSize:13,fontWeight:'600',color:C.ink,marginBottom:10,marginTop:16},choices:{flexDirection:'row',gap:7},choice:{flex:1,paddingHorizontal:0,borderRadius:11,backgroundColor:'#f0f4fa',borderWidth:1,borderColor:'transparent'},choiceText:{fontSize:13,color:'#465e7b'},choiceSelected:{backgroundColor:'#eaf1ff',borderColor:'#9db9eb'},choiceSelectedText:{color:'#1c55b9',fontWeight:'600'},
  foodChoices:{flexDirection:'row',flexWrap:'wrap',gap:8},foodChoice:{width:'48%',borderRadius:12,backgroundColor:'#f0f4fa',borderWidth:1,borderColor:'transparent',minHeight:52},fixtureHint:{fontSize:11,color:C.muted,marginTop:10,lineHeight:18},
  weightInput:{minHeight:58,borderWidth:1,borderColor:'#becde0',borderRadius:13,fontSize:22,color:C.ink,paddingHorizontal:16,paddingVertical:12},
  portions:{flexDirection:'row',gap:8,marginTop:8,marginBottom:20},portion:{flex:1,backgroundColor:'#f0f4fa',borderRadius:10},portionText:{color:'#42618b',fontSize:13},
  editingFood:{fontSize:20,fontWeight:'600',color:C.ink,marginTop:10,marginBottom:4},editingMeal:{fontSize:13,color:C.muted,fontWeight:'400'},
  error:{fontSize:13,lineHeight:21,color:C.red,marginBottom:12,marginTop:8},problem:{padding:22,backgroundColor:'#fff0f1',borderRadius:18},problemTitle:{fontSize:17,color:C.red,fontWeight:'600'},problemText:{fontSize:13,lineHeight:22,color:C.red,marginTop:8},retry:{marginTop:12,backgroundColor:C.white,borderRadius:12},
});
