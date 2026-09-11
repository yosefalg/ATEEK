import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as FileSystem from 'expo-file-system/legacy';
import * as ImageManipulator from 'expo-image-manipulator';
import * as ImagePicker from 'expo-image-picker';
import { useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Alert, Image, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { supabase } from '../cloud/client';
import { categories } from '../data/seed';
import { colors } from '../theme/colors';
import { CategoryId, Listing, ListingCondition } from '../types';
import { parsePrice } from '../utils/money';

const DRAFT_KEY = 'draft_ad';
type Draft = { title: string; price: string; description: string; location: string; category: CategoryId; image: string };

const isDraft = (value: unknown): value is Draft => {
  if (!value || typeof value !== 'object') return false;
  const draft = value as Partial<Draft>;
  return typeof draft.title === 'string'
    && typeof draft.price === 'string'
    && typeof draft.description === 'string'
    && typeof draft.location === 'string'
    && typeof draft.image === 'string'
    && typeof draft.category === 'string'
    && categories.some(item => item.id === draft.category);
};

export function AddListingScreen({ onAdd, onDone }: { onAdd: (item: Listing) => Promise<void>; onDone: () => void }) {
  const [title, setTitle] = useState('');
  const [price, setPrice] = useState('');
  const [description, setDescription] = useState('');
  const [location, setLocation] = useState('النجف');
  const [category, setCategory] = useState<CategoryId>('antiques');
  const [image, setImage] = useState('');
  const [publishing, setPublishing] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [draftReady, setDraftReady] = useState(false);
  const draftWriteChainRef = useRef<Promise<void>>(Promise.resolve());
  const draftGenerationRef = useRef(0);
  const publishedRef = useRef(false);
  const publishInFlightRef = useRef(false);
  const analyzeInFlightRef = useRef(false);

  useEffect(() => {
    let active = true;
    void AsyncStorage.getItem(DRAFT_KEY).then(raw => {
      if (!active) return;
      if (!raw) {
        setDraftReady(true);
        return;
      }
      let parsed: unknown;
      try {
        parsed = JSON.parse(raw);
      } catch {
        void AsyncStorage.removeItem(DRAFT_KEY).catch(() => {});
        setDraftReady(true);
        return;
      }
      if (!isDraft(parsed)) {
        void AsyncStorage.removeItem(DRAFT_KEY).catch(() => {});
        setDraftReady(true);
        return;
      }
      Alert.alert('استكمال الإعلان السابق', 'وجدنا مسودة محفوظة على هذا الجهاز.', [
        {
          text: 'حذف',
          style: 'destructive',
          onPress: () => {
            if (!active) return;
            void AsyncStorage.removeItem(DRAFT_KEY).catch(() => {});
            setDraftReady(true);
          },
        },
        {
          text: 'استكمال',
          onPress: () => {
            if (!active) return;
            setTitle(parsed.title);
            setPrice(parsed.price);
            setDescription(parsed.description);
            setLocation(parsed.location || 'النجف');
            setCategory(parsed.category);
            setImage(parsed.image);
            setDraftReady(true);
          },
        },
      ]);
    }).catch(() => {
      if (active) setDraftReady(true);
    });
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (!draftReady || publishedRef.current) return;
    const generation = ++draftGenerationRef.current;
    const timer = setTimeout(() => {
      const draft: Draft = { title, price, description, location, category, image };
      const hasDraft = Boolean(title.trim() || price.trim() || description.trim() || image);
      draftWriteChainRef.current = draftWriteChainRef.current
        .catch(() => {})
        .then(async () => {
          if (publishedRef.current || generation !== draftGenerationRef.current) return;
          if (hasDraft) {
            await AsyncStorage.setItem(DRAFT_KEY, JSON.stringify(draft));
          } else {
            await AsyncStorage.removeItem(DRAFT_KEY);
          }
        })
        .catch(() => {});
    }, 1200);
    return () => {
      clearTimeout(timer);
      if (draftGenerationRef.current === generation) draftGenerationRef.current += 1;
    };
  }, [draftReady, title, price, description, location, category, image]);

  const amount = useMemo(() => parsePrice(price), [price]);
  const canPublish = Boolean(title.trim() && amount && image && !publishing && !analyzing);

  const pickImage = async () => {
    if (publishing || analyzing) return;
    try {
      const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permission.granted) {
        Alert.alert('صلاحية الصور', 'اسمح بالوصول للصور من إعدادات الهاتف لاختيار صورة.');
        return;
      }
      const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 0.75, allowsEditing: true });
      if (!result.canceled && result.assets[0]) setImage(result.assets[0].uri);
    } catch {
      Alert.alert('تعذّر فتح الصور', 'أعد المحاولة أو اختر صورة أخرى.');
    }
  };

  const analyzeImage = async () => {
    if (!image || analyzeInFlightRef.current || analyzing || publishing) return;
    analyzeInFlightRef.current = true;
    setAnalyzing(true);
    try {
      const compressed = await ImageManipulator.manipulateAsync(image, [{ resize: { width: 900 } }], { compress: 0.58, format: ImageManipulator.SaveFormat.JPEG });
      const base64 = await FileSystem.readAsStringAsync(compressed.uri, { encoding: FileSystem.EncodingType.Base64 });
      const { data, error } = await supabase.functions.invoke('ai-classify', {
        body: { imageBase64: base64, mimeType: 'image/jpeg', categories: categories.map(item => ({ id: item.id, label: item.label })) },
      });
      if (error) throw error;
      if (data?.title) setTitle(String(data.title).slice(0, 120));
      if (data?.estimated_price) setPrice(String(data.estimated_price));
      if (data?.category && categories.some(item => item.id === data.category)) setCategory(data.category as CategoryId);
      Alert.alert('اكتمل التحليل', 'تم ملء الاقتراحات ويمكنك تعديلها قبل النشر.');
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'حاول بصورة أخرى أو لاحقاً.';
      Alert.alert('تعذّر تحليل الصورة', message);
    } finally {
      analyzeInFlightRef.current = false;
      setAnalyzing(false);
    }
  };

  const publish = async () => {
    if (publishInFlightRef.current || publishing || analyzing) return;
    if (!title.trim() || !amount || !image) {
      Alert.alert('أكمل بيانات الإعلان', 'أضف صورة وعنوانًا وسعرًا صحيحًا أكبر من صفر.');
      return;
    }
    publishInFlightRef.current = true;
    setPublishing(true);
    try {
      await onAdd({
        id: Date.now().toString(),
        title: title.trim(),
        price: amount,
        category,
        location: location.trim() || 'العراق',
        condition: 'مستعمل' as ListingCondition,
        age: 'الآن',
        image,
        seller: '',
        verified: false,
        description: description.trim() || 'لا يوجد وصف إضافي.',
        createdAt: Date.now(),
      });
      publishedRef.current = true;
      draftGenerationRef.current += 1;
      await draftWriteChainRef.current.catch(() => {});
      await AsyncStorage.removeItem(DRAFT_KEY).catch(() => {});
      Alert.alert('تم النشر', 'تم نشر إعلانك في سوق عتيك وأصبح ظاهرًا للمستخدمين المسجلين في التطبيق.');
      onDone();
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'تحقق من اتصال الإنترنت ثم أعد المحاولة.';
      Alert.alert('تعذّر نشر الإعلان', message);
    } finally {
      publishInFlightRef.current = false;
      setPublishing(false);
    }
  };

  const busy = publishing || analyzing;
  const statusText = analyzing ? 'مساعد عتيك يحلل الصورة…' : publishing ? 'يتم ضغط الصورة ورفع الإعلان بأمان…' : '';

  return (
    <KeyboardAvoidingView style={styles.root} behavior={Platform.OS === 'ios' ? 'padding' : 'height'} keyboardVerticalOffset={0}>
      <ScrollView
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode={Platform.OS === 'ios' ? 'interactive' : 'on-drag'}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.heading} accessible accessibilityRole="header">
          <Text style={styles.title}>أضف إعلانًا جديدًا</Text>
          <Text style={styles.subtitle}>سيُنشر الإعلان في سوق عتيك بعد رفع الصورة وحفظ البيانات بنجاح</Text>
        </View>

        <Pressable
          style={[styles.imagePicker, busy && styles.disabled]}
          disabled={busy}
          onPress={pickImage}
          accessibilityRole="button"
          accessibilityLabel={image ? 'تغيير صورة السلعة' : 'اختيار صورة للسلعة'}
          accessibilityHint="يفتح مكتبة الصور على الهاتف"
        >
          {image ? <>
            <Image source={{ uri: image }} style={styles.preview} accessibilityIgnoresInvertColors />
            <View style={styles.changeImageBadge} importantForAccessibility="no-hide-descendants">
              <Ionicons name="images-outline" size={16} color={colors.ink} />
              <Text style={styles.changeImageText}>تغيير الصورة</Text>
            </View>
          </> : <>
            <View style={styles.camera} importantForAccessibility="no-hide-descendants"><Ionicons name="camera" size={27} color={colors.gold} /></View>
            <Text style={styles.imageTitle}>أضف صورة السلعة</Text>
            <Text style={styles.imageHint}>اضغط لاختيار صورة من الهاتف</Text>
          </>}
        </Pressable>

        {!!image && <Pressable
          disabled={busy}
          style={[styles.aiAnalyze, busy && styles.disabled]}
          onPress={() => void analyzeImage()}
          accessibilityRole="button"
          accessibilityLabel={analyzing ? 'جارٍ تحليل الصورة بالذكاء الاصطناعي' : 'تحليل الصورة بالذكاء الاصطناعي'}
          accessibilityState={{ disabled: busy, busy: analyzing }}
        >
          {analyzing ? <ActivityIndicator size="small" color={colors.gold} /> : <Ionicons name="sparkles" size={21} color={colors.gold} importantForAccessibility="no" />}
          <Text style={styles.aiAnalyzeText}>{analyzing ? 'جارٍ تحليل الصورة…' : 'تحليل بالذكاء الاصطناعي'}</Text>
        </Pressable>}

        {!!statusText && <View style={styles.statusCard} accessibilityRole="text" accessibilityLiveRegion="polite">
          <ActivityIndicator size="small" color={colors.success} />
          <Text style={styles.statusText}>{statusText}</Text>
        </View>}

        <Field label="عنوان الإعلان" value={title} onChangeText={setTitle} placeholder="مثال: ساعة جيب عتيقة" />
        <Field label="السعر بالدينار العراقي" value={price} onChangeText={setPrice} placeholder="مثال: 150000" keyboardType="number-pad" />
        {!!price.trim() && !amount && <Text style={styles.validationText} accessibilityRole="alert">أدخل سعرًا صحيحًا أكبر من صفر</Text>}

        <Text style={styles.label} accessibilityRole="header">القسم</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={[styles.categoryScroll, styles.rtlScroll]}>
          {categories.map(item => {
            const selected = category === item.id;
            return <Pressable
              key={item.id}
              onPress={() => setCategory(item.id)}
              style={[styles.category, styles.rtlItem, selected && styles.categoryActive]}
              accessibilityRole="radio"
              accessibilityLabel={item.label}
              accessibilityState={{ selected }}
            >
              <Text style={[styles.categoryText, selected && styles.categoryTextActive]}>{item.label}</Text>
            </Pressable>;
          })}
        </ScrollView>

        <Field label="المحافظة" value={location} onChangeText={setLocation} placeholder="النجف" />
        <Field label="وصف السلعة" value={description} onChangeText={setDescription} placeholder="اذكر الحالة والعمر وأهم التفاصيل..." multiline />

        <Pressable
          style={[styles.publish, !canPublish && styles.disabled]}
          disabled={!canPublish}
          onPress={() => void publish()}
          accessibilityRole="button"
          accessibilityLabel={publishing ? 'جارٍ نشر الإعلان' : 'نشر الإعلان في سوق عتيك'}
          accessibilityHint={!image ? 'اختر صورة أولاً' : !title.trim() ? 'أدخل عنوان الإعلان أولاً' : !amount ? 'أدخل سعرًا صحيحًا أولاً' : undefined}
          accessibilityState={{ disabled: !canPublish, busy: publishing }}
        >
          {publishing ? <ActivityIndicator size="small" color={colors.forest} /> : <Ionicons name="paper-plane" size={19} color={colors.forest} importantForAccessibility="no" />}
          <Text style={styles.publishText}>{publishing ? 'جارٍ رفع الصورة ونشر الإعلان…' : 'نشر الإعلان في سوق عتيك'}</Text>
        </Pressable>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

function Field(props: { label: string; value: string; onChangeText: (value: string) => void; placeholder: string; multiline?: boolean; keyboardType?: 'default' | 'number-pad' }) {
  const { label, ...inputProps } = props;
  return <View style={styles.field}>
    <Text style={styles.label}>{label}</Text>
    <TextInput
      maxLength={props.multiline ? 2000 : 120}
      {...inputProps}
      style={[styles.input, props.multiline && styles.multiline]}
      placeholderTextColor={colors.muted}
      textAlign="right"
      accessibilityLabel={label}
    />
  </View>;
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.cream },
  content: { padding: 18, paddingBottom: 48 },
  heading: { alignItems: 'flex-end', marginBottom: 18 },
  title: { fontSize: 25, fontWeight: '900', color: colors.ink },
  subtitle: { fontSize: 12, color: '#AEB6C5', marginTop: 4, textAlign: 'right', lineHeight: 20 },
  imagePicker: { height: 190, borderRadius: 23, borderWidth: 1.5, borderStyle: 'dashed', borderColor: colors.gold, backgroundColor: colors.paper, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  preview: { width: '100%', height: '100%' },
  changeImageBadge: { position: 'absolute', left: 12, bottom: 12, minHeight: 38, borderRadius: 13, paddingHorizontal: 12, backgroundColor: 'rgba(9,10,15,0.88)', borderWidth: 1, borderColor: colors.line, flexDirection: 'row-reverse', alignItems: 'center', gap: 6 },
  changeImageText: { color: colors.ink, fontSize: 11, fontWeight: '900' },
  camera: { width: 54, height: 54, borderRadius: 20, backgroundColor: colors.forest, alignItems: 'center', justifyContent: 'center' },
  imageTitle: { fontWeight: '800', color: colors.ink, marginTop: 9 },
  imageHint: { color: '#AEB6C5', fontSize: 11, marginTop: 3 },
  aiAnalyze: { minHeight: 48, marginTop: 10, borderRadius: 16, borderWidth: 1, borderColor: colors.gold, backgroundColor: colors.paper, flexDirection: 'row-reverse', alignItems: 'center', justifyContent: 'center', gap: 8, paddingHorizontal: 14 },
  aiAnalyzeText: { color: colors.ink, fontWeight: '900' },
  statusCard: { minHeight: 46, marginTop: 10, borderRadius: 15, borderWidth: 1, borderColor: 'rgba(115,240,207,0.28)', backgroundColor: 'rgba(115,240,207,0.07)', paddingHorizontal: 13, flexDirection: 'row-reverse', alignItems: 'center', gap: 9 },
  statusText: { flex: 1, color: '#DCE9E5', fontSize: 11, fontWeight: '700', textAlign: 'right' },
  field: { marginTop: 16 },
  label: { textAlign: 'right', color: colors.ink, fontWeight: '800', fontSize: 13, marginBottom: 7 },
  input: { minHeight: 50, borderRadius: 15, borderWidth: 1, borderColor: colors.line, backgroundColor: colors.paper, paddingHorizontal: 14, color: colors.ink, writingDirection: 'rtl' },
  multiline: { height: 105, paddingTop: 13, textAlignVertical: 'top' },
  validationText: { marginTop: 6, color: colors.danger, fontSize: 11, fontWeight: '700', textAlign: 'right' },
  categoryScroll: { marginHorizontal: -4 },
  rtlScroll: { transform: [{ scaleX: -1 }] },
  rtlItem: { transform: [{ scaleX: -1 }] },
  category: { paddingHorizontal: 15, minHeight: 44, justifyContent: 'center', borderRadius: 13, backgroundColor: colors.paper, borderWidth: 1, borderColor: colors.line, marginHorizontal: 4 },
  categoryActive: { backgroundColor: colors.forest, borderColor: colors.gold },
  categoryText: { fontSize: 11, fontWeight: '700', color: '#AEB6C5' },
  categoryTextActive: { color: colors.goldSoft },
  publish: { minHeight: 56, marginTop: 23, borderRadius: 18, backgroundColor: colors.gold, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 9, paddingHorizontal: 14 },
  publishText: { color: colors.forest, fontSize: 16, fontWeight: '900', textAlign: 'center' },
  disabled: { opacity: 0.48 },
});