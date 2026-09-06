import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as FileSystem from 'expo-file-system/legacy';
import * as ImageManipulator from 'expo-image-manipulator';
import * as ImagePicker from 'expo-image-picker';
import { useEffect,useRef,useState } from 'react';
import { Alert, Image, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { supabase } from '../cloud/client';
import { parsePrice } from '../utils/money';
import { categories } from '../data/seed';
import { colors } from '../theme/colors';
import { CategoryId, Listing, ListingCondition } from '../types';

const DRAFT_KEY='draft_ad';
type Draft={title:string;price:string;description:string;location:string;category:CategoryId;image:string};

export function AddListingScreen({ onAdd, onDone }: { onAdd: (item: Listing) => Promise<void>; onDone: () => void }) {
  const [title, setTitle] = useState('');
  const [price, setPrice] = useState('');
  const [description, setDescription] = useState('');
  const [location, setLocation] = useState('النجف');
  const [category, setCategory] = useState<CategoryId>('antiques');
  const [image, setImage] = useState('');
  const [publishing, setPublishing] = useState(false);
  const [analyzing,setAnalyzing]=useState(false);
  const restored=useRef(false);

  useEffect(()=>{void AsyncStorage.getItem(DRAFT_KEY).then(raw=>{if(!raw||restored.current)return;let d:Draft|null=null;try{d=JSON.parse(raw)}catch{};if(!d)return;Alert.alert('استكمال الإعلان السابق','وجدنا مسودة محفوظة على هذا الجهاز.',[{text:'حذف',style:'destructive',onPress:()=>void AsyncStorage.removeItem(DRAFT_KEY)},{text:'استكمال',onPress:()=>{restored.current=true;setTitle(d!.title||'');setPrice(d!.price||'');setDescription(d!.description||'');setLocation(d!.location||'النجف');setCategory(d!.category||'antiques');setImage(d!.image||'')}}])}).catch(()=>{});},[]);
  useEffect(()=>{const t=setTimeout(()=>{const d:Draft={title,price,description,location,category,image};if(title||price||description||image)void AsyncStorage.setItem(DRAFT_KEY,JSON.stringify(d));},5000);return()=>clearTimeout(t)},[title,price,description,location,category,image]);

  const pickImage = async () => {
    try {
      const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permission.granted) { Alert.alert('صلاحية الصور', 'اسمح بالوصول للصور من إعدادات الهاتف لاختيار صورة.'); return; }
      const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 0.75, allowsEditing: true });
      if (!result.canceled && result.assets[0]) setImage(result.assets[0].uri);
    } catch { Alert.alert('تعذّر فتح الصور', 'أعد المحاولة أو اختر صورة أخرى.'); }
  };

  const analyzeImage=async()=>{if(!image||analyzing)return;setAnalyzing(true);try{const compressed=await ImageManipulator.manipulateAsync(image,[{resize:{width:900}}],{compress:.58,format:ImageManipulator.SaveFormat.JPEG});const base64=await FileSystem.readAsStringAsync(compressed.uri,{encoding:FileSystem.EncodingType.Base64});const{data,error}=await supabase.functions.invoke('ai-classify',{body:{imageBase64:base64,mimeType:'image/jpeg',categories:categories.map(x=>({id:x.id,label:x.label}))}});if(error)throw error;if(data?.title)setTitle(String(data.title));if(data?.estimated_price)setPrice(String(data.estimated_price));if(data?.category&&categories.some(x=>x.id===data.category))setCategory(data.category as CategoryId);Alert.alert('اكتمل التحليل','تم ملء الاقتراحات ويمكنك تعديلها قبل النشر.')}catch(e:any){Alert.alert('تعذّر تحليل الصورة',e?.message||'حاول بصورة أخرى أو لاحقاً.')}finally{setAnalyzing(false)}};

  const publish = async () => {
    if (publishing) return;
    const amount = parsePrice(price);
    if (!title.trim() || !amount || !image) { Alert.alert('أكمل بيانات الإعلان', 'أضف صورة وعنوانًا وسعرًا صحيحًا.'); return; }
    setPublishing(true);
    try {
      await onAdd({ id: Date.now().toString(), title: title.trim(), price: amount, category, location: location.trim() || 'العراق', condition: 'مستعمل' as ListingCondition, age: 'الآن', image, seller: '', verified: false, description: description.trim() || 'لا يوجد وصف إضافي.', createdAt: Date.now() });
      await AsyncStorage.removeItem(DRAFT_KEY);
      Alert.alert('تم النشر', 'تم نشر إعلانك في سوق عتيك وأصبح ظاهرًا للمستخدمين المسجلين في التطبيق.');
      onDone();
    } catch (error: any) { Alert.alert('تعذّر نشر الإعلان', error?.message || 'تحقق من اتصال الإنترنت ثم أعد المحاولة.'); }
    finally { setPublishing(false); }
  };

  return <KeyboardAvoidingView style={styles.root} behavior={Platform.OS === 'ios' ? 'padding' : undefined}><ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
    <View style={styles.heading}><Text style={styles.title}>أضف إعلانًا جديدًا</Text><Text style={styles.subtitle}>سيُنشر الإعلان في سوق عتيك بعد رفع الصورة وحفظ البيانات بنجاح</Text></View>
    <Pressable style={styles.imagePicker} onPress={pickImage}>{image ? <Image source={{ uri: image }} style={styles.preview} /> : <><View style={styles.camera}><Ionicons name="camera" size={27} color={colors.gold} /></View><Text style={styles.imageTitle}>أضف صورة السلعة</Text><Text style={styles.imageHint}>اضغط لاختيار صورة من الهاتف</Text></>}</Pressable>
    {!!image&&<Pressable disabled={analyzing} style={[styles.aiAnalyze,analyzing&&{opacity:.5}]} onPress={()=>void analyzeImage()}><Ionicons name="sparkles" size={21} color={colors.gold}/><Text style={styles.aiAnalyzeText}>{analyzing?'جارٍ تحليل الصورة…':'تحليل بالذكاء الاصطناعي'}</Text></Pressable>}
    <Field label="عنوان الإعلان" value={title} onChangeText={setTitle} placeholder="مثال: ساعة جيب عتيقة" />
    <Field label="السعر بالدينار العراقي" value={price} onChangeText={setPrice} placeholder="مثال: 150000" keyboardType="number-pad" />
    <Text style={styles.label}>القسم</Text><ScrollView horizontal showsHorizontalScrollIndicator={false} style={[styles.categoryScroll, styles.rtlScroll]}>{categories.map(item => <Pressable key={item.id} onPress={() => setCategory(item.id)} style={[styles.category, styles.rtlItem, category === item.id && styles.categoryActive]}><Text style={[styles.categoryText, category === item.id && styles.categoryTextActive]}>{item.label}</Text></Pressable>)}</ScrollView>
    <Field label="المحافظة" value={location} onChangeText={setLocation} placeholder="النجف" />
    <Field label="وصف السلعة" value={description} onChangeText={setDescription} placeholder="اذكر الحالة والعمر وأهم التفاصيل..." multiline />
    <Pressable style={[styles.publish, publishing && { opacity: 0.5 }]} disabled={publishing} onPress={publish}><Ionicons name="paper-plane" size={19} color={colors.forest} /><Text style={styles.publishText}>{publishing ? 'جارٍ رفع الصورة ونشر الإعلان…' : 'نشر الإعلان في سوق عتيك'}</Text></Pressable>
  </ScrollView></KeyboardAvoidingView>;
}

function Field(props: { label: string; value: string; onChangeText: (v: string) => void; placeholder: string; multiline?: boolean; keyboardType?: 'default' | 'number-pad' }) { return <View style={styles.field}><Text style={styles.label}>{props.label}</Text><TextInput maxLength={props.multiline ? 2000 : 120} {...props} style={[styles.input, props.multiline && styles.multiline]} placeholderTextColor={colors.muted} textAlign="right" /></View>; }
const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.cream }, content: { padding: 18, paddingBottom: 35 }, heading: { alignItems: 'flex-end', marginBottom: 18 }, title: { fontSize: 25, fontWeight: '900', color: colors.ink }, subtitle: { fontSize: 12, color: colors.muted, marginTop: 4, textAlign: 'right' },
  imagePicker: { height: 190, borderRadius: 23, borderWidth: 1.5, borderStyle: 'dashed', borderColor: colors.gold, backgroundColor: colors.paper, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }, preview: { width: '100%', height: '100%' }, camera: { width: 54, height: 54, borderRadius: 20, backgroundColor: colors.forest, alignItems: 'center', justifyContent: 'center' }, imageTitle: { fontWeight: '800', color: colors.ink, marginTop: 9 }, imageHint: { color: colors.muted, fontSize: 11, marginTop: 3 }, aiAnalyze:{height:48,marginTop:10,borderRadius:16,borderWidth:1,borderColor:colors.gold,backgroundColor:colors.paper,flexDirection:'row-reverse',alignItems:'center',justifyContent:'center',gap:8},aiAnalyzeText:{color:colors.ink,fontWeight:'900'},
  field: { marginTop: 16 }, label: { textAlign: 'right', color: colors.ink, fontWeight: '800', fontSize: 13, marginBottom: 7 }, input: { minHeight: 50, borderRadius: 15, borderWidth: 1, borderColor: colors.line, backgroundColor: colors.paper, paddingHorizontal: 14, color: colors.ink, writingDirection: 'rtl' }, multiline: { height: 105, paddingTop: 13, textAlignVertical: 'top' },
  categoryScroll: { marginHorizontal: -4 }, rtlScroll: { transform: [{ scaleX: -1 }] }, rtlItem: { transform: [{ scaleX: -1 }] }, category: { paddingHorizontal: 15, height: 39, justifyContent: 'center', borderRadius: 13, backgroundColor: colors.paper, borderWidth: 1, borderColor: colors.line, marginHorizontal: 4 }, categoryActive: { backgroundColor: colors.forest, borderColor: colors.forest }, categoryText: { fontSize: 11, fontWeight: '700', color: colors.muted }, categoryTextActive: { color: colors.goldSoft },
  publish: { height: 56, marginTop: 23, borderRadius: 18, backgroundColor: colors.gold, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 9 }, publishText: { color: colors.forest, fontSize: 16, fontWeight: '900' }
});
