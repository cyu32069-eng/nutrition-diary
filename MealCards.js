import React,{useEffect,useRef,useState} from 'react';
import {ScrollView,View,Text,Pressable,StyleSheet} from 'react-native';
const {MEALS,totals}=require('./nutrition');
const fmt=n=>n.toLocaleString('zh-CN',{maximumFractionDigits:1});
export default function MealCards({date,records,canWrite,onAdd,onEdit,onRemove}) {
  const [active,setActive]=useState(0),[width,setWidth]=useState(0),[heights,setHeights]=useState({});
  const rail=useRef(null);
  function go(index){setActive(index);rail.current?.scrollTo({x:index*width,animated:false});}
  useEffect(()=>{setActive(0);rail.current?.scrollTo({x:0,animated:false});},[date]);
  useEffect(()=>{rail.current?.scrollTo({x:active*width,animated:false});},[width]);
  const Action=({title,label,onPress,danger=false})=><Pressable accessibilityRole="button" accessibilityLabel={label||title} disabled={!canWrite} onPress={onPress} style={({pressed})=>[s.action,pressed&&{opacity:.6},!canWrite&&{opacity:.4}]}><Text style={[s.actionText,danger&&{color:'#a83246'}]}>{title}</Text></Pressable>;
  return <View>
    <View style={s.tabs} accessibilityRole="tablist">{MEALS.map((meal,i)=><Pressable key={meal} accessibilityRole="tab" accessibilityLabel={'查看'+meal} accessibilityState={{selected:active===i}} aria-selected={active===i} onPress={()=>go(i)} style={[s.tab,active===i&&s.selectedTab]}><Text style={[s.tabText,active===i&&s.selectedText]}>{meal}</Text><Text style={[s.tabCount,active===i&&s.selectedText]}>{records.filter(r=>r.meal===meal).length} 项</Text></Pressable>)}</View>
    <View onLayout={e=>setWidth(e.nativeEvent.layout.width)}>
      <ScrollView ref={rail} testID="meal-carousel" horizontal pagingEnabled snapToInterval={width||undefined} decelerationRate="fast" showsHorizontalScrollIndicator={false} scrollEventThrottle={32}
        style={width?{height:heights[active]||320}:undefined} contentContainerStyle={{alignItems:'flex-start'}}
        onScroll={e=>{if(width)setActive(Math.max(0,Math.min(3,Math.round(e.nativeEvent.contentOffset.x/width))));}}>
        {MEALS.map((meal,i)=>{const items=records.filter(r=>r.meal===meal);return <View key={meal} style={{width:width||300,paddingHorizontal:1}} accessibilityElementsHidden={i!==active} importantForAccessibility={i===active?'auto':'no-hide-descendants'} aria-hidden={i!==active}>
          <View style={s.card} onLayout={e=>{const h=Math.ceil(e.nativeEvent.layout.height);setHeights(old=>old[i]===h?old:{...old,[i]:h});}}>
            <View style={s.heading}><View><Text style={s.meal}>{meal}</Text><Text style={s.count}>{items.length} 条记录</Text></View><Text style={s.total}>{fmt(totals(items).calories)}<Text style={s.unit}> 千卡</Text></Text></View>
            {items.length===0?<View style={s.empty}><Text style={s.emptyTitle}>{meal}还没有记录</Text><Text style={s.hint}>记下食物和重量，营养会自动汇总。</Text></View>:items.map((r,index)=><View key={r.id} style={[s.record,index>0&&s.border]}>
              <View style={s.top}><View style={{flex:1}}><Text style={s.name}>{r.name}</Text><Text style={s.weight}>{fmt(r.weight)} 克</Text></View><Text style={s.calories}>{fmt(r.calories)}<Text style={s.unit}> 千卡</Text></Text></View>
              {r.weighing?.mode==='bone'&&<Text style={s.detail}>去皮带骨 {fmt(r.weighing.gross)} 克 − 骨头 {fmt(r.weighing.waste)} 克；净肉 {fmt(r.weight)} 克</Text>}
              <Text style={s.detail}>蛋白质 {fmt(r.protein)} · 碳水 {fmt(r.carbs)} · 脂肪 {fmt(r.fat)} 克</Text>
              <Text style={s.source}>{r.source?.provider==='USDA FoodData Central'?'USDA SR Legacy · FDC '+r.source.fdcId:'旧版示例数据，数值保留'}</Text>
              <View style={s.actions}><Action title="修改重量" label={'修改'+r.name+'的重量'} onPress={()=>onEdit(r)}/><Action title="删除" label={'删除'+r.name} danger onPress={()=>onRemove(r)}/></View>
            </View>)}
            <Action title={'＋ 记录'+meal} onPress={()=>onAdd(meal)}/>
          </View>
        </View>;})}
      </ScrollView>
    </View>
    <View style={s.navigation}><Pressable accessibilityRole="button" accessibilityLabel="上一餐" disabled={active===0} onPress={()=>go(active-1)} style={[s.navButton,active===0&&{opacity:.3}]}><Text style={s.navText}>‹ 上一餐</Text></Pressable><Text style={s.hint}>左右滑动 · {active+1} / 4</Text><Pressable accessibilityRole="button" accessibilityLabel="下一餐" disabled={active===3} onPress={()=>go(active+1)} style={[s.navButton,active===3&&{opacity:.3}]}><Text style={s.navText}>下一餐 ›</Text></Pressable></View>
  </View>;
}
const s=StyleSheet.create({
 tabs:{flexDirection:'row',gap:6,marginBottom:12},tab:{flex:1,minHeight:60,borderRadius:14,backgroundColor:'#e8eef6',alignItems:'center',justifyContent:'center'},selectedTab:{backgroundColor:'#183457'},tabText:{fontSize:15,color:'#526781',fontWeight:'600'},tabCount:{fontSize:11,color:'#526781',marginTop:5},selectedText:{color:'#fff'},
 card:{backgroundColor:'#fff',borderWidth:1,borderColor:'#dfe7f1',borderRadius:22,overflow:'hidden'},heading:{padding:20,flexDirection:'row',justifyContent:'space-between',alignItems:'center',backgroundColor:'#edf3fb'},meal:{fontSize:21,fontWeight:'700',color:'#172d49'},count:{fontSize:12,color:'#526781',marginTop:6},total:{fontSize:25,fontWeight:'700',color:'#172d49'},unit:{fontSize:11,fontWeight:'400',color:'#526781'},
 record:{paddingHorizontal:18,paddingTop:18,paddingBottom:8},border:{borderTopWidth:1,borderTopColor:'#edf1f7'},top:{flexDirection:'row',gap:10,alignItems:'center'},name:{fontSize:17,fontWeight:'600',color:'#172d49'},weight:{fontSize:13,color:'#526781',marginTop:7},calories:{fontSize:21,fontWeight:'600',color:'#172d49'},detail:{fontSize:11,lineHeight:19,color:'#526781',marginTop:10},source:{fontSize:10,lineHeight:17,color:'#526781',marginTop:5},actions:{flexDirection:'row',gap:10,marginTop:8},action:{minHeight:46,paddingHorizontal:16,justifyContent:'center'},actionText:{fontSize:14,fontWeight:'600',color:'#245ed3'},empty:{paddingHorizontal:20,paddingVertical:30},emptyTitle:{fontSize:17,fontWeight:'600',color:'#172d49',marginBottom:10},hint:{fontSize:12,color:'#526781',lineHeight:20},navigation:{flexDirection:'row',alignItems:'center',justifyContent:'space-between',marginTop:6},navButton:{minHeight:44,justifyContent:'center',paddingHorizontal:4},navText:{fontSize:13,color:'#245ed3'},
});
