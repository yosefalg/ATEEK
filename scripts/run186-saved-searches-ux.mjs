import fs from 'node:fs';

const file = 'src/screens/SearchScreen.tsx';
let s = fs.readFileSync(file, 'utf8');

const replace = (from, to, label) => {
  if (!s.includes(from)) throw new Error(`Run186 search anchor missing: ${label}`);
  s = s.replace(from, to);
};

replace(
  '  const nearest=async()=>{',
  `  const applySavedSearch=(item:Saved)=>{\n    changeQuery(item.q);\n    setCategory(item.category);\n  };\n  const removeSavedSearch=async(item:Saved)=>{\n    const next=saved.filter(v=>v.q!==item.q||v.category!==item.category);\n    setSaved(next);\n    try{await AsyncStorage.setItem(SAVED,JSON.stringify(next))}catch{Alert.alert('تعذر التحديث','تعذر تحديث عمليات البحث المحفوظة على هذا الجهاز الآن.')}\n  };\n  const nearest=async()=>{`,
  'saved search actions',
);

replace(
  '    {!!history.length&&<View style={styles.history}><Text style={[styles.smallTitle,{color:colors.muted}]}>بحثت مؤخرًا</Text><FlatList horizontal inverted data={history}',
  `    {!!saved.length&&<View style={styles.history}><Text style={[styles.smallTitle,{color:colors.muted}]}>عمليات البحث المحفوظة</Text><FlatList horizontal inverted data={saved} keyExtractor={(item,index)=>\`${'${item.category}'}:${'${item.q}'}:${'${index}'}\`} showsHorizontalScrollIndicator={false} renderItem={({item})=>{const label=categoryOptions.find(x=>x.id===item.category)?.label??'الكل';const title=item.q||label;return <Pressable accessibilityRole="button" accessibilityLabel={\`فتح البحث المحفوظ ${'${title}'}، قسم ${'${label}'}\`} accessibilityHint="ضغط مطول يحذف هذا البحث المحفوظ" onPress={()=>applySavedSearch(item)} onLongPress={()=>void removeSavedSearch(item)} delayLongPress={500} style={[styles.historyChip,{backgroundColor:colors.glass,borderColor:colors.gold}]}><Ionicons name="bookmark" size={15} color={colors.gold}/><Text numberOfLines={1} style={[styles.chipText,{color:colors.ink}]}>{title}</Text>{item.category!=='all'&&item.q?<Text style={[styles.savedCategory,{color:colors.muted}]}>{label}</Text>:null}</Pressable>}}/></View>}\n    {!!history.length&&<View style={styles.history}><Text style={[styles.smallTitle,{color:colors.muted}]}>بحثت مؤخرًا</Text><FlatList horizontal inverted data={history}`,
  'saved search shortcuts UI',
);

replace(
  "  historyChip:{minHeight:44,",
  "  savedCategory:{fontSize:10,fontWeight:'800'},historyChip:{minHeight:44,",
  'saved search category style',
);

fs.writeFileSync(file, s);

for (const needle of [
  'const applySavedSearch=(item:Saved)=>',
  'const removeSavedSearch=async(item:Saved)=>',
  '>عمليات البحث المحفوظة</Text>',
  'onPress={()=>applySavedSearch(item)}',
  'onLongPress={()=>void removeSavedSearch(item)}',
  'AsyncStorage.setItem(SAVED,JSON.stringify(next))',
  "savedCategory:{fontSize:10,fontWeight:'800'}",
]) {
  if (!s.includes(needle)) throw new Error(`Run186 saved-search contract missing: ${needle}`);
}

console.log('Run #186 saved-search UX applied: saved searches are visible, reusable, category-aware, and removable via long press.');
