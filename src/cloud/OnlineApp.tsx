import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  BackHandler,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  SafeAreaView,
  ScrollView,
  StatusBar as NativeStatusBar,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { Session } from '@supabase/supabase-js';
import * as FileSystem from 'expo-file-system/legacy';
import * as ImageManipulator from 'expo-image-manipulator';
import * as Location from 'expo-location';
import { decode } from 'base64-arraybuffer';
import { supabase } from './client';
import { Cloud, useCloud } from './useCloud';
import { Listing, TabId } from '../types';
import { HomeScreen } from '../screens/HomeScreen';
import { SearchScreen } from '../screens/SearchScreen';
import { AddListingScreen } from '../screens/AddListingScreen';
import { AIAssistantScreen } from '../screens/AIAssistantScreen';
import { BottomNav } from '../components/BottomNav';
import { EmptyState } from '../components/EmptyState';
import { OwnerListingTools } from '../components/Build2Tools';
import { SpatialDMHub, SpatialListingDetails } from '../components/SpatialDealScreens';
import { colors } from '../theme/colors';
import { formatPrice } from '../data/seed';
import { BUILD_INFO } from '../config/buildInfo';

function Button({ title, onPress, disabled = false }: { title: string; onPress: () => void; disabled?: boolean }) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={title}
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPress={onPress}
      style={[s.button, disabled && { opacity: 0.45 }]}
    >
      <Text style={s.buttonText}>{title}</Text>
    </Pressable>
  );
}

function Input(props: React.ComponentProps<typeof TextInput>) {
  return (
    <TextInput
      placeholderTextColor={colors.muted}
      accessibilityLabel={props.accessibilityLabel ?? String(props.placeholder ?? 'حقل إدخال')}
      {...props}
      style={[s.input, props.style]}
    />
  );
}

async function attempt(fn: () => Promise<unknown>) {
  try {
    await fn();
  } catch (error: any) {
    Alert.alert('تعذّر إكمال العملية', error.message || 'تحقق من اتصال الإنترنت.');
  }
}

export default function OnlineApp() {
  const [session, setSession] = useState<Session | null>(null);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    let alive = true;
    supabase.auth
      .getSession()
      .then(({ data, error }) => {
        if (!alive) return;
        if (error) setError(error.message);
        setSession(data.session);
        setReady(true);
      })
      .catch(() => {
        if (alive) {
          setError('تعذّر قراءة الجلسة. أغلق التطبيق وافتحه مجددًا.');
          setReady(true);
        }
      });
    const { data } = supabase.auth.onAuthStateChange((_event, next) => {
      if (alive) setSession(next);
    });
    return () => {
      alive = false;
      data.subscription.unsubscribe();
    };
  }, []);

  return (
    <SafeAreaView style={s.root}>
      <StatusBar style="light" />
      {!ready ? (
        <ActivityIndicator color={colors.gold} style={{ flex: 1 }} />
      ) : session ? (
        <Market key={session.user.id} session={session} />
      ) : (
        <Auth initialError={error} />
      )}
    </SafeAreaView>
  );
}

function Auth({ initialError }: { initialError: string }) {
  const [register, setRegister] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(initialError);

  const submit = async () => {
    if (busy) return;
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim()) || password.length < 10 || (register && !name.trim())) {
      setError('أدخل بريدًا صحيحًا وكلمة مرور من 10 أحرف واسمًا عند التسجيل.');
      return;
    }
    setBusy(true);
    setError('');
    try {
      if (register) {
        const { data, error } = await supabase.auth.signUp({
          email: email.trim(),
          password,
          options: { data: { name: name.trim() } },
        });
        if (error) throw error;
        if (!data.session) {
          setRegister(false);
          setError('تحقق من بريدك وافتح رسالة التأكيد، ثم عد وسجّل الدخول.');
        }
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
        if (error) throw error;
      }
    } catch (error: any) {
      setError(error.message || 'تعذّر الاتصال');
    } finally {
      setBusy(false);
    }
  };

  return (
    <KeyboardAvoidingView style={s.surface} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={[s.page, { paddingTop: 45 }]} keyboardShouldPersistTaps="handled">
        <View style={s.brand}>
          <Text style={{ fontSize: 64, color: colors.gold, fontWeight: '900' }}>عتيك</Text>
          <Text style={{ color: colors.goldSoft }}>كل شيء له قيمة</Text>
        </View>
        <Text style={s.title}>{register ? 'أهلًا بك في عتيك' : 'سوقك يبدأ من هنا'}</Text>
        <Text style={s.note}>بيع وشراء • تفاوض مباشر • حسابك معك</Text>
        {register && <Input placeholder="اسمك" value={name} onChangeText={setName} maxLength={60} />}
        <Input
          placeholder="البريد الإلكتروني"
          value={email}
          onChangeText={setEmail}
          keyboardType="email-address"
          autoCapitalize="none"
          autoCorrect={false}
          maxLength={254}
        />
        <Input
          placeholder="كلمة المرور"
          value={password}
          onChangeText={setPassword}
          secureTextEntry
          autoCapitalize="none"
          maxLength={128}
        />
        {!!error && <Text accessibilityRole="alert" style={s.error}>{error}</Text>}
        <Button title={busy ? 'جارٍ الاتصال…' : register ? 'إنشاء حساب' : 'دخول'} onPress={() => void submit()} disabled={busy} />
        <Button
          title={register ? 'عندي حساب بالفعل' : 'إنشاء حساب جديد'}
          onPress={() => {
            setRegister(!register);
            setError('');
          }}
          disabled={busy}
        />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

function Market({ session }: { session: Session }) {
  const m = useCloud(session);
  const [tab, setTab] = useState<TabId>('home');
  const [selected, setSelected] = useState<Listing | null>(null);
  const [category, setCategory] = useState('all');
  const [thread, setThread] = useState<string | null>(null);
  const [notice, setNotice] = useState(false);
  const [profileName, setProfileName] = useState(String(session.user.user_metadata.name || ''));
  const [initializing, setInitializing] = useState(false);
  const mine = m.profiles.find((x) => x.id === session.user.id);

  useEffect(() => {
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      if (notice) {
        setNotice(false);
        return true;
      }
      if (selected) {
        setSelected(null);
        return true;
      }
      if (thread) {
        setThread(null);
        return true;
      }
      if (tab !== 'home') {
        setTab('home');
        return true;
      }
      return false;
    });
    return () => sub.remove();
  }, [selected, notice, thread, tab]);

  const toggle = (id: string) => void attempt(() => m.mutate('favorite', { id, saved: !m.favorites.includes(id) }));

  const start = async (item: Listing) => {
    const result = await m.mutate('thread', { listing_id: item.id });
    setThread(result.id!);
    setSelected(null);
    setTab('chats');
  };

  const add = async (item: Listing) => {
    const compressed = await ImageManipulator.manipulateAsync(
      item.image,
      [{ resize: { width: 1400 } }],
      { compress: 0.75, format: ImageManipulator.SaveFormat.JPEG },
    );
    const base64 = await FileSystem.readAsStringAsync(compressed.uri, { encoding: FileSystem.EncodingType.Base64 });
    const image = `${session.user.id}/${Date.now()}-${Math.random().toString(36).slice(2)}.jpg`;
    const { error } = await supabase.storage
      .from('ateek-images')
      .upload(image, decode(base64), { contentType: 'image/jpeg', upsert: false });
    if (error) throw error;
    const result = await m.mutate('listing', { ...item, image });
    if (result.id) {
      const perm = await Location.getForegroundPermissionsAsync();
      if (perm.status === 'granted') {
        const pos = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
        await supabase.rpc('ateek_listing_set_geo', {
          p_listing_id: result.id,
          p_lat: pos.coords.latitude,
          p_lon: pos.coords.longitude,
        });
        await m.refresh();
      }
    }
  };

  if (m.loading) {
    return <View style={s.surface}><ActivityIndicator color={colors.gold} style={{ flex: 1 }} /></View>;
  }

  if (!mine && !m.error) {
    return (
      <ScrollView style={s.surface} contentContainerStyle={s.page}>
        <Text style={s.title}>أكمل ملفك</Text>
        <Input value={profileName} onChangeText={setProfileName} placeholder="اسم العرض" maxLength={60} />
        <Button
          title="حفظ ومتابعة"
          disabled={initializing}
          onPress={() => void attempt(async () => {
            setInitializing(true);
            try {
              await m.mutate('profile', { name: profileName });
            } finally {
              setInitializing(false);
            }
          })}
        />
        <Button title="تسجيل خروج" onPress={() => void attempt(() => supabase.auth.signOut())} />
      </ScrollView>
    );
  }

  const visible = m.listings.filter(
    (x) => x.status === 'active' && !m.blocks.some((block) => block.blocked_id === x.sellerId),
  );

  return (
    <View style={s.surface}>
      {!!m.error && (
        <Pressable accessibilityRole="button" accessibilityLabel="إعادة محاولة الاتصال" onPress={() => void m.refresh()}>
          <Text style={s.error}>{m.error} — اضغط لإعادة المحاولة</Text>
        </Pressable>
      )}
      <View style={{ flex: 1 }}>
        {tab === 'home' ? (
          <HomeScreen
            listings={visible}
            favorites={m.favorites}
            onFavorite={toggle}
            onOpen={setSelected}
            onSearch={(nextCategory) => {
              setCategory(nextCategory ?? 'all');
              setTab('search');
            }}
            onNotifications={() => setNotice(true)}
          />
        ) : tab === 'search' ? (
          <SearchScreen
            key={category}
            initialCategory={category}
            listings={visible}
            favorites={m.favorites}
            onFavorite={toggle}
            onOpen={setSelected}
          />
        ) : tab === 'add' ? (
          <AddListingScreen onAdd={add} onDone={() => setTab('home')} />
        ) : tab === 'chats' ? (
          <SpatialDMHub m={m} thread={thread} setThread={setThread} />
        ) : tab === 'ai' ? (
          <AIAssistantScreen
            listings={m.listings}
            favorites={m.favorites}
            messagesCount={m.messages.length}
            offersCount={m.offers.length}
          />
        ) : (
          <Account m={m} onOpen={setSelected} />
        )}
      </View>

      <BottomNav active={tab} onChange={setTab} />

      <Modal visible={!!selected} animationType="slide" onRequestClose={() => setSelected(null)}>
        {selected && (
          <SpatialListingDetails
            key={selected.id}
            item={m.listings.find((x) => x.id === selected.id) ?? selected}
            m={m}
            close={() => setSelected(null)}
            start={start}
            onOpen={setSelected}
          />
        )}
      </Modal>

      <Modal visible={notice} animationType="slide" onRequestClose={() => setNotice(false)}>
        <SafeAreaView style={s.surface}>
          <ScrollView contentContainerStyle={s.page}>
            <Text style={s.title}>الإشعارات</Text>
            <Button title="رجوع" onPress={() => setNotice(false)} />
            <Button title="تحديد الكل كمقروء" onPress={() => void attempt(() => m.mutate('read', {}))} />
            {m.notifications.map((notification) => (
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={notification.title}
                key={notification.id}
                style={s.card}
                onPress={() => {
                  setThread(notification.thread_id);
                  setTab('chats');
                  setNotice(false);
                }}
              >
                <Text style={s.heading}>{notification.is_read ? '' : '● '}{notification.title}</Text>
              </Pressable>
            ))}
          </ScrollView>
        </SafeAreaView>
      </Modal>
    </View>
  );
}

function Account({ m, onOpen }: { m: Cloud; onOpen: (x: Listing) => void }) {
  const profile = m.profiles.find((x) => x.id === m.user.id);
  const [section, setSection] = useState('إعلاناتي');
  const [name, setName] = useState(profile?.name ?? '');
  const items = section === 'المفضلة'
    ? m.listings.filter((x) => m.favorites.includes(x.id))
    : m.listings.filter((x) => x.owner && x.status !== 'removed');

  return (
    <ScrollView contentContainerStyle={s.page}>
      <Text style={s.title}>{profile?.name || 'حسابي'} {profile?.verified ? '✓' : ''}</Text>
      {profile?.is_founder && (
        <View style={s.founder}>
          <Text style={s.founderTitle}>مؤسس تطبيق عتيك</Text>
          <Text style={s.founderText}>حساب رسمي موثّق</Text>
        </View>
      )}
      <View style={{ flexDirection: 'row-reverse', gap: 8, flexWrap: 'wrap' }}>
        {['إعلاناتي', 'المفضلة', 'الإعدادات'].map((item) => (
          <Button key={item} title={item} onPress={() => setSection(item)} />
        ))}
      </View>
      {section === 'الإعدادات' ? (
        <>
          <View style={s.buildInfo}>
            <Text style={s.buildInfoTitle}>عن عتيك</Text>
            <Text style={s.buildInfoText}>ATEEK {BUILD_INFO.versionName} • #{BUILD_INFO.versionCode} • {BUILD_INFO.shortSha}</Text>
          </View>
          <Input value={name} onChangeText={setName} maxLength={60} placeholder="اسم العرض" />
          <Button title="حفظ الاسم" onPress={() => void attempt(() => m.mutate('profile', { name }))} />
          <Button
            title="تسجيل الخروج"
            onPress={() => void attempt(async () => {
              const { error } = await supabase.auth.signOut();
              if (error) throw error;
            })}
          />
        </>
      ) : (
        <>
          {!items.length && <EmptyState icon="cube-outline" title="لا توجد عناصر" body="أضف إعلانًا أو احفظ سلعة في المفضلة." />}
          {items.map((item) => (
            <View key={item.id} style={s.card}>
              <Pressable accessibilityRole="button" accessibilityLabel={`فتح ${item.title}`} onPress={() => onOpen(item)}>
                <Text style={s.heading}>{item.title}</Text>
                <Text style={s.price}>{formatPrice(item.price)}</Text>
              </Pressable>
              {section === 'إعلاناتي' && (
                <>
                  <OwnerListingTools item={item} refresh={m.refresh} />
                  <Button
                    title="حذف الإعلان"
                    onPress={() => Alert.alert('حذف الإعلان؟', 'سيختفي من السوق.', [
                      { text: 'إلغاء' },
                      {
                        text: 'حذف',
                        style: 'destructive',
                        onPress: () => void attempt(() => m.mutate('remove', { id: item.id })),
                      },
                    ])}
                  />
                </>
              )}
            </View>
          ))}
        </>
      )}
    </ScrollView>
  );
}

const s = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: 'transparent',
    paddingTop: Platform.OS === 'android' ? NativeStatusBar.currentHeight : 0,
  },
  surface: { flex: 1, backgroundColor: 'transparent' },
  page: { padding: 18, gap: 14, paddingBottom: 35 },
  title: { fontSize: 26, fontWeight: '900', textAlign: 'right', color: colors.ink },
  heading: { fontSize: 17, fontWeight: '800', textAlign: 'right', color: colors.ink },
  note: { fontSize: 12, color: colors.muted, textAlign: 'right', lineHeight: 22 },
  input: {
    backgroundColor: colors.glass,
    borderRadius: 15,
    borderWidth: 1,
    borderColor: colors.line,
    padding: 14,
    textAlign: 'right',
    minHeight: 52,
    color: colors.ink,
  },
  button: {
    backgroundColor: colors.gold,
    borderRadius: 16,
    padding: 14,
    alignItems: 'center',
    minHeight: 48,
  },
  buttonText: { fontWeight: '800', color: colors.forest },
  price: { fontSize: 21, fontWeight: '900', color: colors.gold, textAlign: 'right' },
  card: {
    backgroundColor: colors.glass,
    borderRadius: 19,
    padding: 16,
    gap: 10,
    borderWidth: 1,
    borderColor: colors.line,
    marginVertical: 5,
  },
  brand: {
    backgroundColor: colors.glassStrong,
    borderRadius: 30,
    alignItems: 'center',
    padding: 22,
    marginBottom: 15,
  },
  error: {
    backgroundColor: 'rgba(139,39,26,.82)',
    color: '#fff',
    padding: 12,
    textAlign: 'right',
    lineHeight: 22,
  },
  founder: {
    backgroundColor: colors.glassStrong,
    borderRadius: 20,
    padding: 16,
    borderWidth: 1,
    borderColor: colors.gold,
  },
  founderTitle: { color: colors.gold, fontSize: 18, fontWeight: '900', textAlign: 'right' },
  founderText: { color: colors.goldSoft, fontSize: 11, lineHeight: 20, textAlign: 'right' },
  buildInfo: {
    backgroundColor: colors.glassStrong,
    borderRadius: 20,
    padding: 18,
    borderWidth: 1,
    borderColor: colors.gold,
    gap: 7,
  },
  buildInfoTitle: { color: colors.gold, fontSize: 18, fontWeight: '900', textAlign: 'right' },
  buildInfoText: { color: colors.goldSoft, fontSize: 16, fontWeight: '900', textAlign: 'center' },
});
