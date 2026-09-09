import { Ionicons } from '@expo/vector-icons';
import { useEffect, useMemo, useRef, useState } from 'react';
import {
  Alert,
  FlatList,
  Image,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  useWindowDimensions,
} from 'react-native';
import Animated, {
  Extrapolation,
  interpolate,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated';
import * as Location from 'expo-location';
import { Cloud } from '../cloud/useCloud';
import { supabase } from '../cloud/client';
import { Listing } from '../types';
import { formatPrice } from '../data/seed';
import { parsePrice } from '../utils/money';
import { haptics } from '../system/haptics';
import { openSpatialProfile } from '../social/spatialSocialBus';
import { ShareListingCard, SimilarListings, useRealDailyView } from './Build2Tools';

const OBSIDIAN = '#090A0F';
const TITANIUM = '#151922';
const TITANIUM_SOFT = 'rgba(255,255,255,0.06)';
const LINE = '#2B313D';
const INK = '#F6F8FB';
const MUTED = '#8A94A6';
const CYAN = '#73F0CF';
const GOLD = '#E2B469';
const DANGER = '#FF7B86';

type AnyRow = Record<string, any>;

function ProfileAvatar({ uri, size = 48 }: { uri?: string | null; size?: number }) {
  return (
    <View style={[styles.avatarShell, { width: size, height: size, borderRadius: size / 2 }]}> 
      {uri ? (
        <Image source={{ uri }} style={{ width: '100%', height: '100%' }} />
      ) : (
        <Ionicons name="person" size={Math.round(size * 0.48)} color="#B6BECC" />
      )}
    </View>
  );
}

function PresenceText({ typing, online, lastSeen }: { typing: boolean; online: boolean; lastSeen?: string | null }) {
  if (typing) return <Text style={[styles.presenceText, { color: CYAN }]}>جاري الكتابة…</Text>;
  if (online) return <Text style={[styles.presenceText, { color: CYAN }]}>متصل الآن</Text>;
  if (!lastSeen) return <Text style={styles.presenceText}>آخر ظهور غير متاح</Text>;
  return <Text style={styles.presenceText}>آخر ظهور {new Date(lastSeen).toLocaleString('ar-IQ')}</Text>;
}

export function SpatialDMHub({ m, thread, setThread }: { m: Cloud; thread: string | null; setThread: (id: string | null) => void }) {
  const [body, setBody] = useState('');
  const [price, setPrice] = useState('');
  const [busy, setBusy] = useState(false);
  const [online, setOnline] = useState(false);
  const [typing, setTyping] = useState(false);
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);
  const t = m.threads.find((x) => x.id === thread);
  const listing = m.listings.find((x) => x.id === t?.listing_id);
  const counterpartId = t ? (t.buyer_id === m.user.id ? t.seller_id : t.buyer_id) : null;
  const counterpart = m.profiles.find((x) => x.id === counterpartId);
  const threadMessages = useMemo(
    () => m.messages.filter((x) => x.thread_id === thread),
    [m.messages, thread],
  );

  useEffect(() => {
    if (!thread) return;
    const channel = supabase.channel(`ateek-deal-dm-${thread}`, {
      config: { presence: { key: m.user.id }, broadcast: { self: true } },
    });
    channelRef.current = channel;
    channel
      .on('presence', { event: 'sync' }, () => {
        const state = channel.presenceState();
        setOnline(Object.keys(state).some((key) => key !== m.user.id));
      })
      .on('broadcast', { event: 'typing' }, ({ payload }) => {
        if (payload?.user_id !== m.user.id) {
          setTyping(Boolean(payload?.typing));
          if (payload?.typing) setTimeout(() => setTyping(false), 1800);
        }
      })
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') void channel.track({ user_id: m.user.id, at: new Date().toISOString() });
      });
    return () => {
      channelRef.current = null;
      void supabase.removeChannel(channel);
    };
  }, [thread, m.user.id]);

  const onType = (text: string) => {
    setBody(text);
    if (channelRef.current) {
      void channelRef.current.send({
        type: 'broadcast',
        event: 'typing',
        payload: { user_id: m.user.id, typing: text.trim().length > 0 },
      });
    }
  };

  const run = async (name: string, payload: Record<string, unknown>) => {
    if (busy) return;
    setBusy(true);
    try {
      await m.mutate(name, payload);
      if (name === 'message') setBody('');
      if (name === 'offer') setPrice('');
    } catch (error: any) {
      Alert.alert('تعذّر إكمال العملية', String(error?.message ?? error));
    } finally {
      setBusy(false);
    }
  };

  const sendMessage = () => {
    if (!thread || !body.trim() || busy) return;
    haptics.medium();
    void run('message', { thread_id: thread, body: body.trim() });
  };

  const sendOffer = () => {
    if (!thread || busy) return;
    const value = parsePrice(price);
    if (!value) {
      Alert.alert('أدخل سعرًا صحيحًا');
      return;
    }
    haptics.medium();
    void run('offer', { thread_id: thread, amount: value });
  };

  if (!thread) {
    return (
      <FlatList
        style={styles.screen}
        contentContainerStyle={styles.threadList}
        data={m.threads}
        keyExtractor={(item) => item.id}
        ListHeaderComponent={
          <View style={styles.threadHero}>
            <Text style={styles.eyebrow}>SPATIAL DM HUB</Text>
            <Text style={styles.screenTitle}>المحادثات</Text>
            <Text style={styles.screenSub}>تفاوض مباشر مرتبط بالإعلانات الحقيقية فقط.</Text>
          </View>
        }
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Ionicons name="chatbubble-ellipses-outline" size={36} color="#667083" />
            <Text style={styles.emptyTitle}>لا توجد محادثات</Text>
            <Text style={styles.emptyBody}>افتح إعلانًا وابدأ التفاوض مع البائع.</Text>
          </View>
        }
        renderItem={({ item }) => {
          const itemListing = m.listings.find((x) => x.id === item.listing_id);
          const otherId = item.buyer_id === m.user.id ? item.seller_id : item.buyer_id;
          const other = m.profiles.find((x) => x.id === otherId);
          const last = [...m.messages].reverse().find((x) => x.thread_id === item.id);
          return (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={`فتح محادثة ${other?.name ?? itemListing?.title ?? ''}`}
              onPress={() => {
                haptics.tap();
                setThread(item.id);
              }}
              style={({ pressed }) => [styles.threadCard, pressed && styles.pressed]}
            >
              <ProfileAvatar uri={other?.avatar_url} size={52} />
              <View style={styles.threadInfo}>
                <View style={styles.threadNameRow}>
                  <Text numberOfLines={1} style={styles.threadName}>{other?.name ?? 'مستخدم عتيك'}</Text>
                  {other?.verified ? <Ionicons name="shield-checkmark" size={15} color={CYAN} /> : null}
                </View>
                {!!other?.username && <Text style={styles.handle}>@{other.username}</Text>}
                <Text numberOfLines={1} style={styles.threadPreview}>{last?.body ?? itemListing?.title ?? 'محادثة عتيك'}</Text>
              </View>
              <Ionicons name="chevron-back" size={18} color="#727C8D" />
            </Pressable>
          );
        }}
      />
    );
  }

  return (
    <KeyboardAvoidingView style={styles.screen} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <View style={styles.dmHeader}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="رجوع للمحادثات"
          onPress={() => {
            haptics.light();
            setThread(null);
          }}
          style={styles.headerIcon}
        >
          <Ionicons name="arrow-forward" size={20} color={INK} />
        </Pressable>
        <ProfileAvatar uri={counterpart?.avatar_url} size={44} />
        <View style={styles.dmIdentity}>
          <View style={styles.dmNameRow}>
            <Text numberOfLines={1} style={styles.dmName}>{counterpart?.name ?? 'محادثة عتيك'}</Text>
            {counterpart?.verified ? <Ionicons name="shield-checkmark" size={15} color={CYAN} /> : null}
          </View>
          {!!counterpart?.username && <Text style={styles.dmHandle}>@{counterpart.username}</Text>}
          <View style={styles.presenceRow}>
            {online && <View style={styles.onlineDot} />}
            <PresenceText typing={typing} online={online} lastSeen={counterpart?.last_seen_at} />
          </View>
        </View>
      </View>

      {listing ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="عرض الإعلان المرتبط بالمحادثة"
          onPress={() => haptics.light()}
          style={styles.contextBanner}
        >
          {listing.image ? <Image source={{ uri: listing.image }} style={styles.contextImage} /> : <View style={styles.contextImagePlaceholder}><Ionicons name="cube-outline" size={22} color="#778192" /></View>}
          <View style={styles.contextText}>
            <Text numberOfLines={1} style={styles.contextTitle}>{listing.title}</Text>
            <Text style={styles.contextPrice}>{formatPrice(listing.price)}</Text>
          </View>
          <View style={styles.contextAction}><Text style={styles.contextActionText}>عرض الإعلان</Text></View>
        </Pressable>
      ) : null}

      <FlatList
        data={threadMessages}
        keyExtractor={(item) => item.id}
        style={styles.messagesList}
        contentContainerStyle={styles.messagesContent}
        keyboardShouldPersistTaps="handled"
        renderItem={({ item }) => {
          const mine = item.sender_id === m.user.id;
          const sent = !String(item.id).startsWith('offline-');
          const time = item.created_at ? new Date(item.created_at).toLocaleTimeString('ar-IQ', { hour: '2-digit', minute: '2-digit' }) : '';
          const stateText = !sent
            ? 'قيد الإرسال'
            : item.read_at
              ? 'تمت القراءة'
              : item.delivered_at
                ? 'تم التسليم'
                : 'تم الإرسال';
          const stateIcon = item.read_at ? 'checkmark-done' : item.delivered_at ? 'checkmark-done' : 'checkmark';
          return (
            <View style={[styles.bubble, mine ? styles.bubbleMine : styles.bubbleTheirs]}>
              <Text style={styles.bubbleText}>{item.body}</Text>
              <View style={styles.bubbleMeta}>
                <Text style={styles.bubbleTime}>{time}</Text>
                {mine ? (
                  <View style={styles.receiptRow}>
                    <Ionicons name={stateIcon} size={13} color={item.read_at ? '#6FB5FF' : '#8D97A8'} />
                    <Text style={[styles.receiptText, item.read_at && { color: '#6FB5FF' }]}>{stateText}</Text>
                  </View>
                ) : null}
              </View>
            </View>
          );
        }}
      />

      <View style={styles.offerStrip}>
        <TextInput
          accessibilityLabel="عرضك بالدينار العراقي"
          value={price}
          onChangeText={setPrice}
          keyboardType="number-pad"
          placeholder="عرضك بالدينار"
          placeholderTextColor="#697386"
          style={styles.offerInput}
        />
        <Pressable disabled={busy} onPress={sendOffer} style={({ pressed }) => [styles.offerButton, pressed && styles.pressed, busy && styles.disabled]}>
          <Ionicons name="pricetag-outline" size={16} color={OBSIDIAN} />
          <Text style={styles.offerButtonText}>تقديم عرض</Text>
        </Pressable>
      </View>

      <View style={styles.offersStack}>
        {m.offers.filter((x) => x.thread_id === thread).map((offer) => (
          <View key={offer.id} style={styles.offerCard}>
            <View style={{ flex: 1 }}>
              <Text style={styles.offerValue}>{formatPrice(Number(offer.amount))}</Text>
              <Text style={styles.offerStatus}>{({ pending: 'بانتظار الرد', accepted: 'متفق عليه', rejected: 'مرفوض', superseded: 'استُبدل بعرض جديد', completed: 'صفقة مكتملة' } as Record<string, string>)[offer.status] ?? offer.status}</Text>
            </View>
            {offer.status === 'pending' && offer.author_id !== m.user.id ? (
              <View style={styles.offerActions}>
                <Pressable
                  disabled={busy}
                  onPress={() => Alert.alert('تأكيد الاتفاق؟', 'سيصبح الإعلان غير متاح للعروض الجديدة.', [
                    { text: 'إلغاء' },
                    { text: 'قبول', onPress: () => { haptics.success(); void run('respond', { offer_id: offer.id, status: 'accepted' }); } },
                  ])}
                  style={styles.miniAccept}
                >
                  <Text style={styles.miniAcceptText}>قبول</Text>
                </Pressable>
                <Pressable disabled={busy} onPress={() => void run('respond', { offer_id: offer.id, status: 'rejected' })} style={styles.miniReject}>
                  <Text style={styles.miniRejectText}>رفض</Text>
                </Pressable>
              </View>
            ) : null}
            {offer.status === 'accepted' && t?.buyer_id === m.user.id ? (
              <Pressable
                disabled={busy}
                onPress={() => Alert.alert('استلمت السلعة؟', 'أكّد فقط بعد استلامها وفحصها.', [
                  { text: 'إلغاء' },
                  { text: 'نعم، استلمتها', onPress: () => { haptics.success(); void run('complete', { offer_id: offer.id }); } },
                ])}
                style={styles.completeButton}
              >
                <Text style={styles.completeButtonText}>تأكيد الاستلام</Text>
              </Pressable>
            ) : null}
          </View>
        ))}
      </View>

      <View style={styles.composerDock}>
        <Pressable accessibilityRole="button" accessibilityLabel="المرفقات غير مفعلة لهذه المحادثة" disabled style={styles.composerIconDisabled}>
          <Ionicons name="add" size={23} color="#566071" />
        </Pressable>
        <TextInput
          accessibilityLabel="اكتب رسالة"
          value={body}
          onChangeText={onType}
          multiline
          maxLength={2000}
          placeholder="اكتب رسالة…"
          placeholderTextColor="#687284"
          style={styles.composerInput}
        />
        <Pressable accessibilityRole="button" accessibilityLabel="الملاحظات الصوتية غير مفعلة لهذه المحادثة" disabled style={styles.composerIconDisabled}>
          <Ionicons name="mic-outline" size={20} color="#566071" />
        </Pressable>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="إرسال الرسالة"
          disabled={busy || !body.trim()}
          onPress={sendMessage}
          style={({ pressed }) => [styles.sendButton, pressed && styles.pressed, (busy || !body.trim()) && styles.disabled]}
        >
          <Ionicons name="send" size={18} color={OBSIDIAN} />
        </Pressable>
      </View>
    </KeyboardAvoidingView>
  );
}

function MetricCard({ icon, label, value, accent }: { icon: keyof typeof Ionicons.glyphMap; label: string; value: string; accent?: string }) {
  return (
    <View style={styles.metricCard}>
      <Ionicons name={icon} size={18} color={accent ?? CYAN} />
      <Text style={styles.metricLabel}>{label}</Text>
      <Text numberOfLines={2} style={styles.metricValue}>{value}</Text>
    </View>
  );
}

function ListingHero({ item }: { item: Listing }) {
  const { width } = useWindowDimensions();
  const [zoom, setZoom] = useState(false);
  const tilt = useSharedValue(0);
  const animated = useAnimatedStyle(() => ({
    transform: [
      { perspective: 900 },
      { rotateY: `${interpolate(tilt.value, [-1, 1], [-5, 5], Extrapolation.CLAMP)}deg` },
      { scale: 0.985 + Math.abs(tilt.value) * 0.015 },
    ],
  }));
  const images = item.image ? [item.image] : [];
  if (!images.length) {
    return (
      <View style={[styles.heroMedia, { width: width - 28 }]}>
        <Ionicons name="image-outline" size={44} color="#5D6676" />
        <Text style={styles.emptyBody}>لا توجد صورة لهذا الإعلان.</Text>
      </View>
    );
  }
  return (
    <>
      <Animated.View style={[styles.heroMedia, { width: width - 28 }, animated]}>
        <Pressable
          style={StyleSheet.absoluteFill}
          onPressIn={() => { tilt.value = withSpring(0.6); }}
          onPressOut={() => { tilt.value = withSpring(0); }}
          onPress={() => { haptics.light(); setZoom(true); }}
        >
          <Image source={{ uri: images[0] }} style={StyleSheet.absoluteFill} resizeMode="cover" />
          <View style={styles.heroShade} />
          <View style={styles.zoomBadge}><Ionicons name="expand-outline" size={16} color={INK} /><Text style={styles.zoomText}>تكبير</Text></View>
          <View style={styles.carouselDots}><View style={styles.carouselDotActive} /></View>
        </Pressable>
      </Animated.View>
      <Modal visible={zoom} transparent animationType="fade" onRequestClose={() => setZoom(false)}>
        <View style={styles.zoomModal}>
          <Pressable accessibilityLabel="إغلاق الصورة" onPress={() => setZoom(false)} style={styles.zoomClose}>
            <Ionicons name="close" size={24} color={INK} />
          </Pressable>
          <Image source={{ uri: images[0] }} style={styles.zoomImage} resizeMode="contain" />
        </View>
      </Modal>
    </>
  );
}

export function SpatialListingDetails({
  item,
  m,
  close,
  start,
  onOpen,
}: {
  item: Listing;
  m: Cloud;
  close: () => void;
  start: (x: Listing) => Promise<void>;
  onOpen: (x: Listing) => void;
}) {
  const [distance, setDistance] = useState<number | null>(null);
  const [report, setReport] = useState('');
  const [reporting, setReporting] = useState(false);
  const [busy, setBusy] = useState(false);
  const [aiOpen, setAiOpen] = useState(false);
  const [aiBusy, setAiBusy] = useState(false);
  const [aiAnswer, setAiAnswer] = useState('');
  const [followed, setFollowed] = useState(false);
  const seller = m.profiles.find((x) => x.id === item.sellerId);
  const reviews = m.reviews.filter((x) => x.target_id === item.sellerId);
  const average = reviews.length ? (reviews.reduce((sum, x) => sum + Number(x.stars), 0) / reviews.length).toFixed(1) : null;
  const responseSeconds = Number(seller?.response_seconds_avg ?? 0);
  const activeSeller = m.listings.some((x) => x.sellerId === item.sellerId && x.status === 'active');
  useRealDailyView(item.id, m.refresh);

  useEffect(() => {
    let alive = true;
    if (item.latitude == null || item.longitude == null) return;
    void (async () => {
      const perm = await Location.getForegroundPermissionsAsync();
      if (perm.status !== 'granted') return;
      const position = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
      if (!alive) return;
      const km = haversine(position.coords.latitude, position.coords.longitude, Number(item.latitude), Number(item.longitude));
      setDistance(km);
    })();
    return () => { alive = false; };
  }, [item.latitude, item.longitude]);

  useEffect(() => {
    if (!item.sellerId || item.owner) return;
    let alive = true;
    void supabase
      .from('ateek_follows')
      .select('followed_id')
      .eq('follower_id', m.user.id)
      .eq('followed_id', item.sellerId)
      .maybeSingle()
      .then(({ data }) => { if (alive) setFollowed(Boolean(data)); });
    return () => { alive = false; };
  }, [item.sellerId, item.owner, m.user.id]);

  const toggleFollow = async () => {
    if (!item.sellerId || item.owner) return;
    const next = !followed;
    setFollowed(next);
    haptics.tap();
    const { error } = await supabase.rpc('ateek_follow_toggle', { p_target: item.sellerId, p_follow: next });
    if (error) {
      setFollowed(!next);
      Alert.alert('تعذّر تحديث المتابعة', error.message);
    }
  };

  const askGemini = async () => {
    if (aiBusy) return;
    setAiBusy(true);
    setAiAnswer('');
    haptics.medium();
    try {
      const question = `قيّم سعر هذا الإعلان في السوق العراقي واقترح نطاقًا عادلًا ووصفًا مختصرًا محسّنًا. العنوان: ${item.title}. السعر: ${item.price} دينار. الحالة: ${item.condition}. الموقع: ${item.location}. الوصف: ${item.description}`;
      const market = m.listings
        .filter((x) => x.status !== 'removed')
        .slice(0, 60)
        .map((x) => ({ title: x.title, price: x.price, category: x.category, location: x.location, condition: x.condition, status: x.status, description: x.description, verified: x.verified, owner: x.owner }));
      const { data, error } = await supabase.functions.invoke('ateek-assistant', {
        body: {
          question,
          listings: market,
          favoritesCount: m.favorites.length,
          messagesCount: m.messages.length,
          offersCount: m.offers.length,
          marketSummary: { activeListings: m.listings.filter((x) => x.status === 'active').length },
        },
      });
      if (error) throw error;
      if (!data?.answer) throw new Error(data?.message || 'لم يصل رد من مساعد عتيك');
      setAiAnswer(String(data.answer));
    } catch (error: any) {
      setAiAnswer(`تعذر إكمال التقييم الآن: ${String(error?.message ?? error)}`);
    } finally {
      setAiBusy(false);
    }
  };

  const openChat = async () => {
    if (busy) return;
    setBusy(true);
    haptics.medium();
    try { await start(item); } finally { setBusy(false); }
  };

  return (
    <View style={styles.screen}>
      <ScrollView contentContainerStyle={styles.detailsScroll} showsVerticalScrollIndicator={false}>
        <View style={styles.detailsTopbar}>
          <Pressable accessibilityLabel="رجوع" onPress={() => { haptics.light(); close(); }} style={styles.headerIcon}>
            <Ionicons name="arrow-forward" size={20} color={INK} />
          </Pressable>
          <View style={{ flex: 1 }}>
            <Text style={styles.eyebrow}>SPATIAL LISTING</Text>
            <Text numberOfLines={1} style={styles.detailsTopTitle}>{item.title}</Text>
          </View>
          <Pressable
            accessibilityLabel={m.favorites.includes(item.id) ? 'إزالة من المفضلة' : 'إضافة إلى المفضلة'}
            onPress={() => { haptics.tap(); void m.mutate('favorite', { id: item.id, saved: !m.favorites.includes(item.id) }); }}
            style={styles.headerIcon}
          >
            <Ionicons name={m.favorites.includes(item.id) ? 'heart' : 'heart-outline'} size={20} color={m.favorites.includes(item.id) ? DANGER : INK} />
          </Pressable>
        </View>

        <ListingHero item={item} />

        <View style={styles.detailsTitleBlock}>
          <Text style={styles.detailsTitle}>{item.title}</Text>
          <Text style={styles.detailsLocation}>{item.location}</Text>
        </View>

        <View style={styles.metricsGrid}>
          <MetricCard icon="cash-outline" label="السعر" value={formatPrice(item.price)} accent={GOLD} />
          <MetricCard icon="logo-usd" label="الدولار" value="غير متاح دون سعر صرف حي" accent="#B9C5D6" />
          <MetricCard icon="navigate-outline" label="المسافة" value={distance == null ? 'غير متاحة' : `${distance.toFixed(distance < 10 ? 1 : 0)} كم`} />
          <MetricCard icon="cube-outline" label="الحالة" value={item.condition} />
          <MetricCard icon="eye-outline" label="المشاهدات اليوم" value={String(item.viewsToday ?? 0)} accent="#6FB5FF" />
        </View>

        <View style={styles.descriptionCard}>
          <Text style={styles.sectionEyebrow}>الوصف</Text>
          <Text style={styles.descriptionText}>{item.description || 'لم يضف البائع وصفًا لهذا الإعلان.'}</Text>
        </View>

        <View style={styles.sellerCard}>
          <View style={styles.sellerIdentityRow}>
            <ProfileAvatar uri={seller?.avatar_url} size={58} />
            <View style={{ flex: 1, alignItems: 'flex-end' }}>
              <View style={styles.sellerNameRow}>
                <Text style={styles.sellerName}>{seller?.name ?? item.seller}</Text>
                {(seller?.verified || item.verified) ? <Ionicons name="shield-checkmark" size={17} color={CYAN} /> : null}
              </View>
              {!!seller?.username && <Text style={styles.handle}>@{seller.username}</Text>}
              <View style={styles.sellerBadges}>
                {activeSeller && <View style={styles.activeBadge}><View style={styles.activeDot} /><Text style={styles.activeBadgeText}>بائع نشط</Text></View>}
                <Text style={styles.responseText}>{responseSeconds > 0 ? `متوسط الرد ${Math.max(1, Math.round(responseSeconds / 60))} د` : 'سرعة الرد غير متاحة'}</Text>
              </View>
            </View>
          </View>
          <View style={styles.sellerStats}>
            <View style={styles.sellerStat}><Text style={styles.sellerStatValue}>{average ?? '—'}</Text><Text style={styles.sellerStatLabel}>التقييم</Text></View>
            <View style={styles.sellerStat}><Text style={styles.sellerStatValue}>{reviews.length}</Text><Text style={styles.sellerStatLabel}>تقييم حقيقي</Text></View>
          </View>
          {!item.owner ? (
            <View style={styles.sellerActions}>
              <Pressable onPress={() => { haptics.light(); openSpatialProfile(item.sellerId); }} style={styles.sellerActionButton}>
                <Ionicons name="person-circle-outline" size={18} color={CYAN} />
                <Text style={styles.sellerActionText}>عرض البروفايل</Text>
              </Pressable>
              <Pressable onPress={() => void toggleFollow()} style={[styles.sellerActionButton, followed && styles.sellerActionActive]}>
                <Ionicons name={followed ? 'notifications' : 'notifications-outline'} size={18} color={followed ? OBSIDIAN : CYAN} />
                <Text style={[styles.sellerActionText, followed && { color: OBSIDIAN }]}>{followed ? 'متابَع' : 'متابعة'}</Text>
              </Pressable>
            </View>
          ) : null}
        </View>

        <ShareListingCard item={item} />

        {!item.owner ? (
          <View style={styles.safetyCard}>
            <Pressable onPress={() => setReporting((x) => !x)} style={styles.safetyAction}>
              <Ionicons name="flag-outline" size={17} color={DANGER} />
              <Text style={styles.safetyActionText}>الإبلاغ عن الإعلان</Text>
            </Pressable>
            <Pressable
              onPress={() => Alert.alert('حظر هذا المستخدم؟', 'ستُمنع الرسائل والعروض بينكما.', [
                { text: 'إلغاء' },
                { text: 'حظر', style: 'destructive', onPress: () => void m.mutate('block', { id: item.sellerId, blocked: true }).then(close) },
              ])}
              style={styles.safetyAction}
            >
              <Ionicons name="ban-outline" size={17} color={DANGER} />
              <Text style={styles.safetyActionText}>حظر البائع</Text>
            </Pressable>
            {reporting ? (
              <View style={styles.reportPanel}>
                <TextInput value={report} onChangeText={setReport} maxLength={1000} placeholder="سبب الإبلاغ" placeholderTextColor="#6E788A" style={styles.reportInput} />
                <Pressable
                  disabled={!report.trim()}
                  onPress={() => void m.mutate('report', { id: item.id, reason: report.trim() }).then(() => { haptics.success(); setReporting(false); setReport(''); })}
                  style={[styles.reportSend, !report.trim() && styles.disabled]}
                >
                  <Text style={styles.reportSendText}>إرسال البلاغ</Text>
                </Pressable>
              </View>
            ) : null}
          </View>
        ) : null}

        <SimilarListings item={item} listings={m.listings} onOpen={onOpen} />

        {reviews.length ? (
          <View style={styles.reviewsBlock}>
            <Text style={styles.sectionEyebrow}>التقييمات</Text>
            {reviews.map((review) => (
              <View key={review.id} style={styles.reviewCard}>
                <Text style={styles.reviewStars}>{'★'.repeat(Number(review.stars))}</Text>
                <Text style={styles.reviewText}>{review.body || 'تقييم بدون تعليق'}</Text>
              </View>
            ))}
          </View>
        ) : null}

        <View style={{ height: 130 }} />
      </ScrollView>

      <Pressable
        accessibilityRole="button"
        accessibilityLabel="فحص السعر بمساعد عتيك"
        onPress={() => { haptics.medium(); setAiOpen(true); if (!aiAnswer) void askGemini(); }}
        style={styles.aiCapsule}
      >
        <Ionicons name="sparkles" size={18} color={OBSIDIAN} />
        <Text style={styles.aiCapsuleText}>Gemini Price Check</Text>
      </Pressable>

      {!item.owner && item.status === 'active' ? (
        <View style={styles.actionDock}>
          <Pressable disabled={busy} onPress={() => void openChat()} style={({ pressed }) => [styles.dockSecondary, pressed && styles.pressed, busy && styles.disabled]}>
            <Ionicons name="chatbubble-ellipses-outline" size={19} color={INK} />
            <Text style={styles.dockSecondaryText}>مراسلة البائع</Text>
          </Pressable>
          <Pressable disabled={busy} onPress={() => void openChat()} style={({ pressed }) => [styles.dockPrimary, pressed && styles.pressed, busy && styles.disabled]}>
            <Ionicons name="pricetag-outline" size={19} color={OBSIDIAN} />
            <Text style={styles.dockPrimaryText}>تقديم عرض/مزايدة</Text>
          </Pressable>
        </View>
      ) : null}

      <Modal visible={aiOpen} transparent animationType="slide" onRequestClose={() => setAiOpen(false)}>
        <View style={styles.sheetBackdrop}>
          <Pressable style={StyleSheet.absoluteFill} onPress={() => setAiOpen(false)} />
          <View style={styles.aiSheet}>
            <View style={styles.sheetGrabber} />
            <View style={styles.sheetHeader}>
              <View style={styles.aiOrb}><Ionicons name="sparkles" size={20} color={OBSIDIAN} /></View>
              <View style={{ flex: 1, alignItems: 'flex-end' }}>
                <Text style={styles.sheetTitle}>فحص السعر الذكي</Text>
                <Text style={styles.sheetSub}>Gemini عبر Edge Function الحالية</Text>
              </View>
            </View>
            <ScrollView style={{ maxHeight: 360 }} contentContainerStyle={{ paddingBottom: 16 }}>
              <Text style={styles.aiAnswer}>{aiBusy ? 'مساعد عتيك يحلل الإعلان والسوق الحالي…' : aiAnswer || 'لم يتم إجراء تحليل بعد.'}</Text>
            </ScrollView>
            <Pressable disabled={aiBusy} onPress={() => void askGemini()} style={[styles.retryAi, aiBusy && styles.disabled]}>
              <Text style={styles.retryAiText}>{aiBusy ? 'جارٍ التحليل…' : 'إعادة التحليل'}</Text>
            </Pressable>
          </View>
        </View>
      </Modal>
    </View>
  );
}

function haversine(lat1: number, lon1: number, lat2: number, lon2: number) {
  const toRad = (value: number) => (value * Math.PI) / 180;
  const r = 6371;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  return 2 * r * Math.asin(Math.sqrt(a));
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: OBSIDIAN },
  pressed: { opacity: 0.82, transform: [{ scale: 0.99 }] },
  disabled: { opacity: 0.42 },
  threadList: { padding: 14, paddingBottom: 110, gap: 10 },
  threadHero: { marginBottom: 8, padding: 18, borderRadius: 24, backgroundColor: TITANIUM, borderWidth: 1, borderColor: LINE },
  eyebrow: { color: CYAN, fontSize: 10, fontWeight: '900', letterSpacing: 1.1, textAlign: 'right' },
  screenTitle: { color: INK, fontSize: 28, fontWeight: '900', textAlign: 'right', marginTop: 3 },
  screenSub: { color: MUTED, fontSize: 12, lineHeight: 20, textAlign: 'right', marginTop: 6 },
  emptyState: { minHeight: 210, borderRadius: 24, borderWidth: 1, borderColor: LINE, backgroundColor: TITANIUM_SOFT, alignItems: 'center', justifyContent: 'center', gap: 8, padding: 22 },
  emptyTitle: { color: INK, fontSize: 18, fontWeight: '900' },
  emptyBody: { color: MUTED, fontSize: 12, lineHeight: 20, textAlign: 'center' },
  threadCard: { minHeight: 82, borderRadius: 22, backgroundColor: TITANIUM, borderWidth: 1, borderColor: LINE, padding: 12, flexDirection: 'row-reverse', alignItems: 'center', gap: 11 },
  avatarShell: { overflow: 'hidden', borderWidth: 1, borderColor: '#3A4352', backgroundColor: '#1B202A', alignItems: 'center', justifyContent: 'center' },
  threadInfo: { flex: 1, alignItems: 'flex-end' },
  threadNameRow: { flexDirection: 'row-reverse', alignItems: 'center', gap: 6, maxWidth: '100%' },
  threadName: { color: INK, fontSize: 15, fontWeight: '900', maxWidth: '90%' },
  handle: { color: CYAN, fontSize: 10, fontWeight: '800', marginTop: 2 },
  threadPreview: { color: MUTED, fontSize: 11, marginTop: 5, maxWidth: '100%' },
  dmHeader: { margin: 10, marginBottom: 6, minHeight: 72, borderRadius: 24, backgroundColor: 'rgba(21,25,34,0.96)', borderWidth: 1, borderColor: '#353D49', paddingHorizontal: 10, flexDirection: 'row', alignItems: 'center', gap: 10 },
  headerIcon: { width: 42, height: 42, borderRadius: 15, borderWidth: 1, borderColor: LINE, backgroundColor: '#11151D', alignItems: 'center', justifyContent: 'center' },
  dmIdentity: { flex: 1, alignItems: 'flex-end' },
  dmNameRow: { flexDirection: 'row-reverse', alignItems: 'center', gap: 6 },
  dmName: { color: INK, fontWeight: '900', fontSize: 16 },
  dmHandle: { color: CYAN, fontSize: 10, fontWeight: '800', marginTop: 1 },
  presenceRow: { flexDirection: 'row-reverse', alignItems: 'center', gap: 5, marginTop: 3 },
  onlineDot: { width: 7, height: 7, borderRadius: 4, backgroundColor: CYAN, shadowColor: CYAN, shadowOpacity: 0.9, shadowRadius: 7, elevation: 3 },
  presenceText: { color: '#7F8999', fontSize: 9, fontWeight: '700' },
  contextBanner: { marginHorizontal: 10, marginBottom: 5, borderRadius: 18, borderWidth: 1, borderColor: LINE, backgroundColor: '#11151D', padding: 9, flexDirection: 'row-reverse', alignItems: 'center', gap: 10 },
  contextImage: { width: 54, height: 54, borderRadius: 14, backgroundColor: TITANIUM },
  contextImagePlaceholder: { width: 54, height: 54, borderRadius: 14, backgroundColor: TITANIUM, alignItems: 'center', justifyContent: 'center' },
  contextText: { flex: 1, alignItems: 'flex-end' },
  contextTitle: { color: INK, fontSize: 12, fontWeight: '900' },
  contextPrice: { color: GOLD, fontSize: 12, fontWeight: '900', marginTop: 4 },
  contextAction: { paddingHorizontal: 10, paddingVertical: 7, borderRadius: 11, backgroundColor: TITANIUM },
  contextActionText: { color: CYAN, fontSize: 9, fontWeight: '900' },
  messagesList: { flex: 1 },
  messagesContent: { paddingHorizontal: 12, paddingVertical: 14, gap: 8 },
  bubble: { maxWidth: '84%', minWidth: 94, borderRadius: 20, borderWidth: 1, paddingHorizontal: 13, paddingTop: 10, paddingBottom: 8 },
  bubbleMine: { alignSelf: 'flex-end', backgroundColor: '#12362F', borderColor: '#245D50', borderBottomRightRadius: 6 },
  bubbleTheirs: { alignSelf: 'flex-start', backgroundColor: 'rgba(255,255,255,0.075)', borderColor: '#2B313D', borderBottomLeftRadius: 6 },
  bubbleText: { color: INK, fontSize: 14, lineHeight: 22, textAlign: 'right' },
  bubbleMeta: { marginTop: 5, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 8 },
  bubbleTime: { color: '#6F798A', fontSize: 8 },
  receiptRow: { flexDirection: 'row-reverse', alignItems: 'center', gap: 3 },
  receiptText: { color: '#8791A1', fontSize: 8, fontWeight: '700' },
  offerStrip: { marginHorizontal: 10, marginBottom: 6, flexDirection: 'row-reverse', gap: 8 },
  offerInput: { flex: 1, height: 46, borderRadius: 15, borderWidth: 1, borderColor: LINE, backgroundColor: '#11151D', color: INK, paddingHorizontal: 12, textAlign: 'right' },
  offerButton: { height: 46, borderRadius: 15, paddingHorizontal: 14, backgroundColor: CYAN, flexDirection: 'row-reverse', alignItems: 'center', justifyContent: 'center', gap: 6 },
  offerButtonText: { color: OBSIDIAN, fontWeight: '900', fontSize: 11 },
  offersStack: { maxHeight: 160, marginHorizontal: 10, gap: 6 },
  offerCard: { borderRadius: 15, borderWidth: 1, borderColor: LINE, backgroundColor: '#11151D', padding: 10, flexDirection: 'row-reverse', alignItems: 'center', gap: 8 },
  offerValue: { color: GOLD, fontWeight: '900', fontSize: 13, textAlign: 'right' },
  offerStatus: { color: MUTED, fontSize: 9, textAlign: 'right', marginTop: 2 },
  offerActions: { flexDirection: 'row-reverse', gap: 5 },
  miniAccept: { borderRadius: 10, backgroundColor: CYAN, paddingHorizontal: 10, paddingVertical: 7 },
  miniAcceptText: { color: OBSIDIAN, fontSize: 9, fontWeight: '900' },
  miniReject: { borderRadius: 10, borderWidth: 1, borderColor: '#66303A', paddingHorizontal: 10, paddingVertical: 7 },
  miniRejectText: { color: DANGER, fontSize: 9, fontWeight: '900' },
  completeButton: { borderRadius: 10, backgroundColor: GOLD, paddingHorizontal: 10, paddingVertical: 8 },
  completeButtonText: { color: OBSIDIAN, fontSize: 9, fontWeight: '900' },
  composerDock: { margin: 10, marginTop: 6, padding: 8, borderRadius: 22, borderWidth: 1, borderColor: '#343C49', backgroundColor: '#11151D', flexDirection: 'row', alignItems: 'flex-end', gap: 6, paddingBottom: Platform.OS === 'android' ? 10 : 8 },
  composerIconDisabled: { width: 38, height: 38, borderRadius: 13, backgroundColor: TITANIUM, alignItems: 'center', justifyContent: 'center' },
  composerInput: { flex: 1, minHeight: 40, maxHeight: 110, borderRadius: 14, color: INK, paddingHorizontal: 10, paddingTop: 10, paddingBottom: 9, textAlign: 'right' },
  sendButton: { width: 42, height: 42, borderRadius: 14, backgroundColor: CYAN, alignItems: 'center', justifyContent: 'center' },
  detailsScroll: { padding: 14, paddingBottom: 30, gap: 14 },
  detailsTopbar: { flexDirection: 'row-reverse', alignItems: 'center', gap: 10 },
  detailsTopTitle: { color: INK, fontSize: 16, fontWeight: '900', textAlign: 'right', marginTop: 2 },
  heroMedia: { alignSelf: 'center', height: 350, borderRadius: 28, backgroundColor: TITANIUM, overflow: 'hidden', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: '#343D4A' },
  heroShade: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.08)' },
  zoomBadge: { position: 'absolute', top: 14, left: 14, borderRadius: 13, backgroundColor: 'rgba(9,10,15,0.76)', borderWidth: 1, borderColor: '#39414E', flexDirection: 'row-reverse', alignItems: 'center', gap: 5, paddingHorizontal: 9, paddingVertical: 7 },
  zoomText: { color: INK, fontSize: 9, fontWeight: '900' },
  carouselDots: { position: 'absolute', bottom: 14, alignSelf: 'center', flexDirection: 'row', gap: 5 },
  carouselDotActive: { width: 22, height: 5, borderRadius: 3, backgroundColor: CYAN },
  zoomModal: { flex: 1, backgroundColor: '#000', alignItems: 'center', justifyContent: 'center' },
  zoomClose: { position: 'absolute', top: 50, right: 18, zIndex: 3, width: 44, height: 44, borderRadius: 15, backgroundColor: 'rgba(20,24,31,.85)', alignItems: 'center', justifyContent: 'center' },
  zoomImage: { width: '100%', height: '84%' },
  detailsTitleBlock: { alignItems: 'flex-end' },
  detailsTitle: { color: INK, fontSize: 27, fontWeight: '900', textAlign: 'right' },
  detailsLocation: { color: MUTED, fontSize: 11, marginTop: 5, textAlign: 'right' },
  metricsGrid: { flexDirection: 'row-reverse', flexWrap: 'wrap', gap: 9 },
  metricCard: { width: '48.5%', minHeight: 108, borderRadius: 20, borderWidth: 1, borderColor: LINE, backgroundColor: TITANIUM, padding: 13, alignItems: 'flex-end' },
  metricLabel: { color: MUTED, fontSize: 9, marginTop: 7 },
  metricValue: { color: INK, fontSize: 13, fontWeight: '900', textAlign: 'right', marginTop: 4 },
  descriptionCard: { borderRadius: 22, borderWidth: 1, borderColor: LINE, backgroundColor: TITANIUM, padding: 16 },
  sectionEyebrow: { color: CYAN, fontSize: 10, fontWeight: '900', letterSpacing: 0.6, textAlign: 'right', marginBottom: 8 },
  descriptionText: { color: '#D7DCE4', fontSize: 14, lineHeight: 24, textAlign: 'right' },
  sellerCard: { borderRadius: 24, borderWidth: 1, borderColor: '#34403E', backgroundColor: '#10161A', padding: 14, gap: 12 },
  sellerIdentityRow: { flexDirection: 'row-reverse', alignItems: 'center', gap: 11 },
  sellerNameRow: { flexDirection: 'row-reverse', alignItems: 'center', gap: 6 },
  sellerName: { color: INK, fontSize: 17, fontWeight: '900' },
  sellerBadges: { flexDirection: 'row-reverse', flexWrap: 'wrap', alignItems: 'center', gap: 7, marginTop: 7 },
  activeBadge: { flexDirection: 'row-reverse', alignItems: 'center', gap: 5, paddingHorizontal: 8, paddingVertical: 5, borderRadius: 999, backgroundColor: '#10201D', borderWidth: 1, borderColor: '#235147' },
  activeDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: CYAN },
  activeBadgeText: { color: '#BFF8E8', fontSize: 9, fontWeight: '900' },
  responseText: { color: MUTED, fontSize: 9 },
  sellerStats: { flexDirection: 'row-reverse', borderRadius: 16, backgroundColor: TITANIUM_SOFT, paddingVertical: 10 },
  sellerStat: { flex: 1, alignItems: 'center' },
  sellerStatValue: { color: INK, fontSize: 16, fontWeight: '900' },
  sellerStatLabel: { color: MUTED, fontSize: 9, marginTop: 2 },
  sellerActions: { flexDirection: 'row-reverse', gap: 8 },
  sellerActionButton: { flex: 1, minHeight: 45, borderRadius: 14, borderWidth: 1, borderColor: LINE, backgroundColor: TITANIUM, flexDirection: 'row-reverse', alignItems: 'center', justifyContent: 'center', gap: 6 },
  sellerActionActive: { backgroundColor: CYAN, borderColor: CYAN },
  sellerActionText: { color: '#E6EAF0', fontSize: 10, fontWeight: '900' },
  safetyCard: { borderRadius: 20, borderWidth: 1, borderColor: '#4D2D34', backgroundColor: '#151014', padding: 12, gap: 8 },
  safetyAction: { minHeight: 42, flexDirection: 'row-reverse', alignItems: 'center', justifyContent: 'center', gap: 7 },
  safetyActionText: { color: '#FF9AA4', fontSize: 11, fontWeight: '900' },
  reportPanel: { gap: 8 },
  reportInput: { minHeight: 48, borderRadius: 14, borderWidth: 1, borderColor: '#4D3036', color: INK, textAlign: 'right', paddingHorizontal: 12 },
  reportSend: { height: 43, borderRadius: 13, backgroundColor: DANGER, alignItems: 'center', justifyContent: 'center' },
  reportSendText: { color: '#15080B', fontWeight: '900' },
  reviewsBlock: { gap: 8 },
  reviewCard: { borderRadius: 17, borderWidth: 1, borderColor: LINE, backgroundColor: TITANIUM, padding: 12 },
  reviewStars: { color: GOLD, textAlign: 'right' },
  reviewText: { color: '#D6DBE3', fontSize: 12, lineHeight: 20, textAlign: 'right', marginTop: 5 },
  aiCapsule: { position: 'absolute', right: 16, bottom: 92, minHeight: 48, borderRadius: 999, backgroundColor: CYAN, paddingHorizontal: 16, flexDirection: 'row-reverse', alignItems: 'center', gap: 7, shadowColor: CYAN, shadowOpacity: 0.35, shadowRadius: 16, elevation: 8 },
  aiCapsuleText: { color: OBSIDIAN, fontSize: 11, fontWeight: '900' },
  actionDock: { position: 'absolute', left: 12, right: 12, bottom: 12, minHeight: 68, borderRadius: 23, backgroundColor: 'rgba(17,21,29,0.97)', borderWidth: 1, borderColor: '#343D49', padding: 8, flexDirection: 'row-reverse', gap: 8 },
  dockSecondary: { flex: 1, borderRadius: 16, borderWidth: 1, borderColor: LINE, backgroundColor: TITANIUM, flexDirection: 'row-reverse', alignItems: 'center', justifyContent: 'center', gap: 7 },
  dockSecondaryText: { color: INK, fontSize: 11, fontWeight: '900' },
  dockPrimary: { flex: 1.1, borderRadius: 16, backgroundColor: CYAN, flexDirection: 'row-reverse', alignItems: 'center', justifyContent: 'center', gap: 7 },
  dockPrimaryText: { color: OBSIDIAN, fontSize: 11, fontWeight: '900' },
  sheetBackdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.56)', justifyContent: 'flex-end' },
  aiSheet: { borderTopLeftRadius: 30, borderTopRightRadius: 30, backgroundColor: '#10131A', borderWidth: 1, borderColor: '#323A46', padding: 18, paddingBottom: Platform.OS === 'ios' ? 34 : 22 },
  sheetGrabber: { width: 44, height: 5, borderRadius: 3, backgroundColor: '#454E5C', alignSelf: 'center', marginBottom: 14 },
  sheetHeader: { flexDirection: 'row-reverse', alignItems: 'center', gap: 10, marginBottom: 14 },
  aiOrb: { width: 44, height: 44, borderRadius: 15, backgroundColor: CYAN, alignItems: 'center', justifyContent: 'center' },
  sheetTitle: { color: INK, fontSize: 18, fontWeight: '900', textAlign: 'right' },
  sheetSub: { color: MUTED, fontSize: 10, textAlign: 'right', marginTop: 3 },
  aiAnswer: { color: '#DCE1E8', fontSize: 14, lineHeight: 23, textAlign: 'right' },
  retryAi: { height: 48, borderRadius: 15, backgroundColor: CYAN, alignItems: 'center', justifyContent: 'center' },
  retryAiText: { color: OBSIDIAN, fontWeight: '900' },
});
