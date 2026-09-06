import { Ionicons } from '@expo/vector-icons';
import { useEffect, useRef, useState } from 'react';
import {
  Alert,
  Image,
  Modal,
  Pressable,
  ScrollView,
  Share,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated';
import { action, supabase } from '../cloud/client';
import { formatPrice } from '../data/seed';
import { haptics } from '../system/haptics';
import { useAteekTheme } from '../theme/ThemeProvider';
import { subscribeSpatialProfile } from './spatialSocialBus';

type Profile = {
  id: string;
  name: string;
  username: string | null;
  verified: boolean;
  bio: string | null;
  avatar_url: string | null;
  cover_url: string | null;
  badge_label: string | null;
  is_founder: boolean;
  last_seen_at: string | null;
  followers?: number;
  following?: number;
  completed_deals?: number;
  avg_rating?: number;
  reviews_count?: number;
  response_seconds_avg?: number;
};

type ListingRow = {
  id: string;
  title: string;
  price: number;
  image: string;
  status: string;
  created_at: string;
};

type ReviewRow = { id: string; stars: number; body: string; created_at: string };
type MessageRow = {
  id: string;
  thread_id: string;
  sender_id: string;
  body: string;
  delivered_at: string | null;
  read_at: string | null;
  created_at: string;
};
type AuctionRow = {
  id: string;
  listing_id: string;
  seller_id: string;
  starts_at: string;
  ends_at: string;
  starting_price: number;
  min_increment: number;
  status: string;
  listing?: { title?: string; image?: string } | null;
};
type BidRow = { id: string; auction_id: string; bidder_id: string; amount: number; created_at: string };

const USERNAME_RE = /^[a-z0-9_]{3,24}$/;

export function SpatialSocialHub() {
  const { colors } = useAteekTheme();
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  const [forced, setForced] = useState(false);
  const [query, setQuery] = useState('');
  const [profile, setProfile] = useState<Profile | null>(null);
  const [own, setOwn] = useState<Profile | null>(null);
  const [tab, setTab] = useState<'listings' | 'reviews' | 'about'>('listings');
  const [listings, setListings] = useState<ListingRow[]>([]);
  const [reviews, setReviews] = useState<ReviewRow[]>([]);
  const [followed, setFollowed] = useState(false);
  const [username, setUsername] = useState('');
  const [availability, setAvailability] = useState<boolean | null>(null);
  const [checking, setChecking] = useState(false);
  const [thread, setThread] = useState<string | null>(null);
  const [messages, setMessages] = useState<MessageRow[]>([]);
  const [body, setBody] = useState('');
  const [online, setOnline] = useState(false);
  const [typing, setTyping] = useState(false);
  const [report, setReport] = useState('');
  const [auctions, setAuctions] = useState<AuctionRow[]>([]);
  const [bids, setBids] = useState<BidRow[]>([]);
  const [bidText, setBidText] = useState<Record<string, string>>({});
  const scale = useSharedValue(1);
  const fabStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));
  const dmChannel = useRef<ReturnType<typeof supabase.channel> | null>(null);

  const loadOwn = async (uid: string) => {
    const { data, error } = await supabase
      .from('ateek_profiles')
      .select('id,name,username,verified,bio,avatar_url,cover_url,badge_label,is_founder,last_seen_at')
      .eq('id', uid)
      .maybeSingle();
    if (error) return;
    if (data) {
      const next = data as Profile;
      setOwn(next);
      if (!next.username) {
        setForced(true);
        setOpen(true);
      }
    }
  };

  const loadProfileData = async (uid: string) => {
    const [listingResult, reviewResult] = await Promise.all([
      supabase
        .from('ateek_listings')
        .select('id,title,price,image,status,created_at')
        .eq('seller_id', uid)
        .order('created_at', { ascending: false })
        .limit(100),
      supabase
        .from('ateek_reviews')
        .select('id,stars,body,created_at')
        .eq('target_id', uid)
        .order('created_at', { ascending: false })
        .limit(100),
    ]);
    setListings(
      (listingResult.data ?? []).map((x: any) => ({ ...x, price: Number(x.price) })) as ListingRow[],
    );
    setReviews((reviewResult.data ?? []) as ReviewRow[]);
  };

  const loadFollow = async (uid: string) => {
    if (!sessionId) return;
    const { data } = await supabase
      .from('ateek_follows')
      .select('followed_id')
      .eq('follower_id', sessionId)
      .eq('followed_id', uid)
      .maybeSingle();
    setFollowed(Boolean(data));
  };

  const loadProfile = async (input: string) => {
    const normalized = input.replace(/^@/, '').trim().toLowerCase();
    if (!USERNAME_RE.test(normalized)) {
      Alert.alert('المعرف غير صالح', 'استخدم أحرفًا إنجليزية وأرقامًا وشرطة سفلية فقط.');
      return;
    }
    const { data, error } = await supabase.rpc('ateek_profile_by_username', { p_username: normalized });
    if (error) {
      Alert.alert('تعذر فتح البروفايل', error.message);
      return;
    }
    const row = Array.isArray(data) ? data[0] : data;
    if (!row) {
      Alert.alert('غير موجود', 'لم يتم العثور على هذا المعرف.');
      return;
    }
    const next = row as Profile;
    setProfile(next);
    setTab('listings');
    setOpen(true);
    await Promise.all([loadProfileData(next.id), loadFollow(next.id)]);
  };

  const loadProfileById = async (id: string) => {
    const { data, error } = await supabase.from('ateek_profiles').select('username').eq('id', id).maybeSingle();
    if (error) {
      Alert.alert('تعذر فتح البروفايل', error.message);
      return;
    }
    if (!data?.username) {
      Alert.alert('البروفايل غير مكتمل', 'هذا المستخدم لم يحدد @username بعد.');
      return;
    }
    await loadProfile(data.username);
  };

  const loadAuctions = async () => {
    const { data, error } = await supabase
      .from('ateek_auctions')
      .select('id,listing_id,seller_id,starts_at,ends_at,starting_price,min_increment,status,listing:ateek_listings(title,image)')
      .eq('status', 'active')
      .gt('ends_at', new Date().toISOString())
      .order('ends_at', { ascending: true })
      .limit(30);
    if (error) return;
    const rows = ((data ?? []) as any[]).map((x) => ({
      ...x,
      starting_price: Number(x.starting_price),
      min_increment: Number(x.min_increment),
    })) as AuctionRow[];
    setAuctions(rows);
    if (!rows.length) {
      setBids([]);
      return;
    }
    const { data: bidRows } = await supabase
      .from('ateek_bids')
      .select('id,auction_id,bidder_id,amount,created_at')
      .in('auction_id', rows.map((x) => x.id))
      .order('created_at', { ascending: false })
      .limit(300);
    setBids(((bidRows ?? []) as any[]).map((x) => ({ ...x, amount: Number(x.amount) })) as BidRow[]);
  };

  useEffect(() => {
    let alive = true;
    void supabase.auth.getSession().then(({ data }) => {
      const uid = data.session?.user.id ?? null;
      if (!alive) return;
      setSessionId(uid);
      if (uid) {
        void loadOwn(uid);
        void supabase.rpc('ateek_touch_presence');
      }
    });
    const off = subscribeSpatialProfile((id) => {
      if (id) void loadProfileById(id);
      else {
        setOpen(true);
        if (own?.username) void loadProfile(own.username);
      }
    });
    void loadAuctions();
    const market = supabase
      .channel('ateek-spatial-auctions')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'ateek_auctions' }, () => void loadAuctions())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'ateek_bids' }, () => void loadAuctions())
      .subscribe();
    const presenceTimer = setInterval(() => void supabase.rpc('ateek_touch_presence'), 60_000);
    return () => {
      alive = false;
      off();
      clearInterval(presenceTimer);
      void supabase.removeChannel(market);
    };
  }, [own?.username]);

  useEffect(() => {
    const clean = username.toLowerCase().trim();
    if (!clean) {
      setAvailability(null);
      return;
    }
    if (!USERNAME_RE.test(clean)) {
      setAvailability(false);
      return;
    }
    setChecking(true);
    const timer = setTimeout(() => {
      void supabase.rpc('ateek_username_available', { p_username: clean }).then(({ data, error }) => {
        setAvailability(!error && Boolean(data));
        setChecking(false);
      });
    }, 350);
    return () => clearTimeout(timer);
  }, [username]);

  useEffect(
    () => () => {
      if (dmChannel.current) void supabase.removeChannel(dmChannel.current);
    },
    [],
  );

  const saveUsername = async () => {
    const clean = username.toLowerCase().trim();
    if (!availability || !USERNAME_RE.test(clean)) return;
    const { data, error } = await supabase.rpc('ateek_set_username', { p_username: clean });
    if (error) {
      Alert.alert('تعذر الحفظ', error.message);
      return;
    }
    haptics.success();
    setOwn((value) => (value ? { ...value, username: String(data) } : value));
    setForced(false);
    setUsername('');
  };

  const toggleFollow = async () => {
    if (!profile || !sessionId || profile.id === sessionId) return;
    const next = !followed;
    setFollowed(next);
    haptics.tap();
    const { error } = await supabase.rpc('ateek_follow_toggle', { p_target: profile.id, p_follow: next });
    if (error) {
      setFollowed(!next);
      Alert.alert('تعذر المتابعة', error.message);
    } else {
      await loadProfile(profile.username ?? '');
    }
  };

  const shareProfile = async () => {
    if (!profile?.username) return;
    haptics.light();
    await Share.share({ message: `ateek://user/${profile.username}` });
  };

  const loadMessages = async (id: string) => {
    const { data, error } = await supabase
      .from('ateek_social_messages')
      .select('*')
      .eq('thread_id', id)
      .order('created_at', { ascending: true })
      .limit(300);
    if (error) return;
    setMessages((data ?? []) as MessageRow[]);
    await supabase.rpc('ateek_social_mark', { p_thread: id, p_state: 'read' });
  };

  const setupDmChannel = (id: string) => {
    if (!sessionId) return;
    if (dmChannel.current) void supabase.removeChannel(dmChannel.current);
    const channel = supabase.channel(`social-dm-${id}`, {
      config: { presence: { key: sessionId }, broadcast: { self: true } },
    });
    dmChannel.current = channel;
    channel
      .on('presence', { event: 'sync' }, () => {
        const state = channel.presenceState();
        setOnline(Object.keys(state).some((key) => key !== sessionId));
      })
      .on('broadcast', { event: 'typing' }, ({ payload }) => {
        if (payload?.user_id !== sessionId) {
          setTyping(Boolean(payload?.typing));
          if (payload?.typing) setTimeout(() => setTyping(false), 1800);
        }
      })
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'ateek_social_messages', filter: `thread_id=eq.${id}` },
        () => void loadMessages(id),
      )
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          void channel.track({ user_id: sessionId, at: new Date().toISOString() });
          void supabase.rpc('ateek_social_deliver_visible', { p_thread: id });
        }
      });
  };

  const startDM = async () => {
    if (!profile || profile.id === sessionId) return;
    const { data, error } = await supabase.rpc('ateek_social_thread', { p_target: profile.id });
    if (error) {
      Alert.alert('تعذر فتح المحادثة', error.message);
      return;
    }
    const id = String(data);
    setThread(id);
    await loadMessages(id);
    setupDmChannel(id);
  };

  const send = async () => {
    if (!thread || !body.trim() || !sessionId) return;
    const text = body.trim();
    setBody('');
    haptics.medium();
    const optimistic: MessageRow = {
      id: `local-${Date.now()}`,
      thread_id: thread,
      sender_id: sessionId,
      body: text,
      delivered_at: null,
      read_at: null,
      created_at: new Date().toISOString(),
    };
    setMessages((value) => [...value, optimistic]);
    const { error } = await supabase.rpc('ateek_social_send', { p_thread: thread, p_body: text });
    if (error) {
      setMessages((value) => value.filter((x) => x.id !== optimistic.id));
      Alert.alert('تعذر الإرسال', error.message);
    } else {
      await loadMessages(thread);
    }
  };

  const onType = (text: string) => {
    setBody(text);
    if (dmChannel.current && sessionId) {
      void dmChannel.current.send({
        type: 'broadcast',
        event: 'typing',
        payload: { user_id: sessionId, typing: text.length > 0 },
      });
    }
  };

  const block = async () => {
    if (!profile) return;
    Alert.alert('حظر المستخدم؟', 'سيتم تطبيق نظام الحظر الحالي في عتيك.', [
      { text: 'إلغاء' },
      {
        text: 'حظر',
        style: 'destructive',
        onPress: () =>
          void action('block', { id: profile.id, blocked: true })
            .then(() => {
              haptics.success();
              setProfile(null);
              setOpen(false);
            })
            .catch((error: any) => Alert.alert('تعذر الحظر', String(error?.message ?? error))),
      },
    ]);
  };

  const sendReport = async () => {
    if (!profile || report.trim().length < 3) return;
    const { error } = await supabase.rpc('ateek_user_report', {
      p_target: profile.id,
      p_reason: report.trim(),
    });
    if (error) Alert.alert('تعذر الإبلاغ', error.message);
    else {
      haptics.success();
      setReport('');
      Alert.alert('تم الإرسال', 'وصل البلاغ إلى نظام عتيك.');
    }
  };

  const createAuction = async (item: ListingRow) => {
    const endsAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
    const { error } = await supabase.rpc('ateek_auction_create', {
      p_listing: item.id,
      p_ends_at: endsAt,
      p_starting_price: Math.max(1, item.price),
      p_min_increment: 1000,
    });
    if (error) Alert.alert('تعذر إنشاء المزاد', error.message);
    else {
      haptics.success();
      await loadAuctions();
    }
  };

  const placeBid = async (auction: AuctionRow) => {
    const amount = Number((bidText[auction.id] ?? '').replace(/[^0-9]/g, ''));
    if (!amount) return;
    const { error } = await supabase.rpc('ateek_bid_place', {
      p_auction: auction.id,
      p_amount: amount,
    });
    if (error) Alert.alert('لم تُقبل المزايدة', error.message);
    else {
      haptics.success();
      setBidText((value) => ({ ...value, [auction.id]: '' }));
      await loadAuctions();
    }
  };

  const currentProfile = profile ?? own;
  const myProfile = currentProfile?.id === sessionId;
  const activeSeller = listings.some((x) => x.status === 'active');

  return (
    <>
      <Animated.View style={[styles.fab, { borderColor: colors.cyan, backgroundColor: '#11141D' }, fabStyle]}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="المجتمع والبروفايلات"
          onPress={() => {
            haptics.medium();
            scale.value = 0.84;
            scale.value = withSpring(1);
            setOpen(true);
            if (own?.username) void loadProfile(own.username);
          }}
          style={styles.fabPress}
        >
          <Ionicons name="people" size={21} color={colors.cyan} />
        </Pressable>
      </Animated.View>

      <Modal
        visible={open}
        animationType="fade"
        transparent={false}
        onRequestClose={() => {
          if (!forced) {
            setOpen(false);
            setThread(null);
          }
        }}
      >
        <View style={styles.root}>
          <View style={styles.top}>
            <Pressable
              disabled={forced}
              accessibilityLabel="إغلاق المجتمع"
              onPress={() => {
                setOpen(false);
                setThread(null);
              }}
              style={[styles.iconButton, forced && { opacity: 0.25 }]}
            >
              <Ionicons name="close" size={22} color="#F5F7FA" />
            </Pressable>
            <Text style={styles.topTitle}>ATEEK SOCIAL • Spatial</Text>
            <Pressable accessibilityLabel="تحديث المجتمع" onPress={() => void loadAuctions()} style={styles.iconButton}>
              <Ionicons name="refresh" size={20} color="#8CF5D7" />
            </Pressable>
          </View>

          {!sessionId ? (
            <View style={styles.center}>
              <Text style={styles.emptyTitle}>سجّل الدخول أولاً</Text>
              <Text style={styles.muted}>نظام البروفايلات الاجتماعية مرتبط بحساب عتيك الحالي فقط.</Text>
            </View>
          ) : forced ? (
            <UsernameGate
              username={username}
              setUsername={setUsername}
              availability={availability}
              checking={checking}
              save={saveUsername}
            />
          ) : thread ? (
            <DMView
              profile={profile}
              messages={messages}
              sessionId={sessionId}
              body={body}
              onType={onType}
              send={send}
              online={online}
              typing={typing}
              close={() => {
                setThread(null);
                setMessages([]);
              }}
            />
          ) : (
            <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
              <View style={styles.searchWrap}>
                <Ionicons name="search" size={18} color="#7E8798" />
                <TextInput
                  value={query}
                  onChangeText={setQuery}
                  onSubmitEditing={() => void loadProfile(query)}
                  placeholder="ابحث بـ @username"
                  placeholderTextColor="#697285"
                  autoCapitalize="none"
                  autoCorrect={false}
                  style={styles.searchInput}
                />
                <Pressable onPress={() => void loadProfile(query)} style={styles.searchGo}>
                  <Text style={styles.searchGoText}>فتح</Text>
                </Pressable>
              </View>

              {currentProfile ? (
                <>
                  <View style={styles.profileCard}>
                    <View style={styles.cover}>
                      {currentProfile.cover_url ? (
                        <Image source={{ uri: currentProfile.cover_url }} style={StyleSheet.absoluteFill} />
                      ) : (
                        <View style={styles.coverPattern} />
                      )}
                      <View style={styles.coverShade} />
                    </View>
                    <View style={styles.identityRow}>
                      <View style={styles.avatarWrap}>
                        {currentProfile.avatar_url ? (
                          <Image source={{ uri: currentProfile.avatar_url }} style={styles.avatar} />
                        ) : (
                          <Ionicons name="person" size={38} color="#B9C1CF" />
                        )}
                      </View>
                      <View style={styles.identityText}>
                        <Text style={styles.name}>{currentProfile.name}</Text>
                        <Text style={styles.username}>@{currentProfile.username}</Text>
                        <View style={styles.badges}>
                          {currentProfile.verified && <Badge text="حساب موثق" icon="shield-checkmark" />}
                          {activeSeller && <Badge text="بائع نشط" icon="flash" />}
                        </View>
                      </View>
                    </View>
                    {!!currentProfile.bio && <Text style={styles.bio}>{currentProfile.bio}</Text>}
                    <View style={styles.stats}>
                      <Stat value={Number(currentProfile.completed_deals ?? 0)} label="صفقة مكتملة" />
                      <Stat value={Number(currentProfile.followers ?? 0)} label="متابع" />
                      <Stat value={Number(currentProfile.avg_rating ?? 0).toFixed(1)} label="التقييم" />
                    </View>
                    {!myProfile && (
                      <View style={styles.actions}>
                        <Action icon="chatbubble-ellipses" text="مراسلة" onPress={() => void startDM()} />
                        <Action
                          icon={followed ? 'checkmark-circle' : 'add-circle'}
                          text={followed ? 'متابَع' : 'متابعة'}
                          onPress={() => void toggleFollow()}
                        />
                        <Action icon="share-social" text="مشاركة" onPress={() => void shareProfile()} />
                      </View>
                    )}
                  </View>

                  <View style={styles.tabs}>
                    {(['listings', 'reviews', 'about'] as const).map((item) => (
                      <Pressable
                        key={item}
                        onPress={() => setTab(item)}
                        style={[styles.tab, tab === item && styles.tabActive]}
                      >
                        <Text style={[styles.tabText, tab === item && styles.tabTextActive]}>
                          {item === 'listings' ? 'الإعلانات' : item === 'reviews' ? 'التقييمات' : 'حول'}
                        </Text>
                      </Pressable>
                    ))}
                  </View>

                  {tab === 'listings' ? (
                    <View style={styles.bento}>
                      {listings.length ? (
                        listings.map((item, index) => (
                          <View key={item.id} style={[styles.bentoCard, index % 5 === 0 && styles.bentoWide]}>
                            <View style={styles.listingImage}>
                              {!!item.image && (
                                <Image
                                  source={{ uri: supabase.storage.from('ateek-images').getPublicUrl(item.image).data.publicUrl }}
                                  style={StyleSheet.absoluteFill}
                                />
                              )}
                              <View style={styles.imageShade} />
                            </View>
                            <Text numberOfLines={2} style={styles.listingTitle}>{item.title}</Text>
                            <Text style={styles.listingPrice}>{formatPrice(item.price)}</Text>
                            <Text style={styles.listingStatus}>{item.status === 'active' ? 'نشط' : 'مباع/مغلق'}</Text>
                            {myProfile && item.status === 'active' && (
                              <Pressable onPress={() => void createAuction(item)} style={styles.auctionCreate}>
                                <Ionicons name="timer" size={14} color="#0B0D12" />
                                <Text style={styles.auctionCreateText}>مزاد 24س</Text>
                              </Pressable>
                            )}
                          </View>
                        ))
                      ) : (
                        <Empty text="لا توجد إعلانات لهذا الحساب." />
                      )}
                    </View>
                  ) : tab === 'reviews' ? (
                    <View style={styles.stack}>
                      {reviews.length ? (
                        reviews.map((review) => (
                          <View key={review.id} style={styles.review}>
                            <Text style={styles.stars}>{'★'.repeat(review.stars)}{'☆'.repeat(5 - review.stars)}</Text>
                            <Text style={styles.reviewBody}>{review.body || 'تقييم بدون تعليق'}</Text>
                          </View>
                        ))
                      ) : (
                        <Empty text="لا توجد تقييمات بعد." />
                      )}
                    </View>
                  ) : (
                    <View style={styles.about}>
                      <Info
                        icon="time"
                        text={`آخر ظهور: ${currentProfile.last_seen_at ? new Date(currentProfile.last_seen_at).toLocaleString('ar-IQ') : 'غير متاح'}`}
                      />
                      <Info
                        icon="speedometer"
                        text={`متوسط سرعة الرد: ${Number(currentProfile.response_seconds_avg ?? 0) > 0 ? `${Math.round(Number(currentProfile.response_seconds_avg) / 60)} دقيقة` : 'لا توجد بيانات كافية'}`}
                      />
                      <Info icon="star" text={`${Number(currentProfile.reviews_count ?? 0)} تقييم حقيقي`} />
                      {!myProfile && (
                        <>
                          <Pressable onPress={() => void block()} style={styles.dangerButton}>
                            <Ionicons name="ban" size={17} color="#FF7B86" />
                            <Text style={styles.dangerText}>حظر المستخدم</Text>
                          </Pressable>
                          <View style={styles.reportBox}>
                            <TextInput
                              value={report}
                              onChangeText={setReport}
                              placeholder="سبب الإبلاغ عن المستخدم"
                              placeholderTextColor="#70798B"
                              style={styles.reportInput}
                            />
                            <Pressable onPress={() => void sendReport()} style={styles.reportSend}>
                              <Text style={styles.reportSendText}>إرسال البلاغ</Text>
                            </Pressable>
                          </View>
                        </>
                      )}
                    </View>
                  )}
                </>
              ) : (
                <Empty text="ابحث عن مستخدم أو افتح بروفايلك." />
              )}

              <Text style={styles.sectionTitle}>المزادات الحية</Text>
              {auctions.length ? (
                auctions.map((auction) => {
                  const auctionBids = bids.filter((x) => x.auction_id === auction.id);
                  const highest = Math.max(auction.starting_price, ...auctionBids.map((x) => x.amount));
                  const left = Math.max(0, new Date(auction.ends_at).getTime() - Date.now());
                  const seconds = Math.floor(left / 1000);
                  return (
                    <View key={auction.id} style={styles.auction}>
                      <View style={styles.auctionText}>
                        <Text style={styles.auctionTitle}>{auction.listing?.title ?? 'إعلان'}</Text>
                        <Text style={styles.auctionMeta}>
                          أعلى مزايدة: {formatPrice(highest)} • متبقٍ {Math.floor(seconds / 3600)}س {Math.floor((seconds % 3600) / 60)}د
                        </Text>
                      </View>
                      {auction.seller_id !== sessionId && (
                        <View style={styles.bidRow}>
                          <TextInput
                            value={bidText[auction.id] ?? ''}
                            onChangeText={(value) => setBidText((old) => ({ ...old, [auction.id]: value }))}
                            keyboardType="number-pad"
                            placeholder="مبلغ المزايدة"
                            placeholderTextColor="#6D7585"
                            style={styles.bidInput}
                          />
                          <Pressable onPress={() => void placeBid(auction)} style={styles.bidButton}>
                            <Text style={styles.bidButtonText}>زايد</Text>
                          </Pressable>
                        </View>
                      )}
                    </View>
                  );
                })
              ) : (
                <Empty text="لا توجد مزادات نشطة حالياً." />
              )}
            </ScrollView>
          )}
        </View>
      </Modal>
    </>
  );
}

function UsernameGate({
  username,
  setUsername,
  availability,
  checking,
  save,
}: {
  username: string;
  setUsername: (value: string) => void;
  availability: boolean | null;
  checking: boolean;
  save: () => Promise<void>;
}) {
  return (
    <View style={styles.center}>
      <Ionicons name="at-circle" size={58} color="#73F0CF" />
      <Text style={styles.gateTitle}>اختر معرفك الفريد</Text>
      <Text style={styles.muted}>مطلوب لإكمال البروفايل الاجتماعي. أحرف إنجليزية وأرقام وشرطة سفلية فقط، من 3 إلى 24 حرفًا.</Text>
      <View style={styles.usernameField}>
        <Text style={styles.at}>@</Text>
        <TextInput
          value={username}
          onChangeText={(value) => setUsername(value.toLowerCase().replace(/[^a-z0-9_]/g, ''))}
          autoCapitalize="none"
          maxLength={24}
          placeholder="yosef_trade"
          placeholderTextColor="#616A7A"
          style={styles.usernameInput}
        />
      </View>
      <Text style={[styles.availability, { color: checking ? '#AEB6C4' : availability ? '#73F0CF' : '#FF7B86' }]}>
        {checking ? 'جارٍ فحص التوفر…' : availability === null ? 'اكتب المعرف المطلوب' : availability ? 'المعرف متاح ✓' : 'المعرف غير صالح أو مستخدم'}
      </Text>
      <Pressable
        disabled={!availability || checking}
        onPress={() => void save()}
        style={[styles.saveUsername, (!availability || checking) && { opacity: 0.35 }]}
      >
        <Text style={styles.saveUsernameText}>تأكيد المعرف والمتابعة</Text>
      </Pressable>
    </View>
  );
}

function DMView({
  profile,
  messages,
  sessionId,
  body,
  onType,
  send,
  online,
  typing,
  close,
}: {
  profile: Profile | null;
  messages: MessageRow[];
  sessionId: string;
  body: string;
  onType: (value: string) => void;
  send: () => Promise<void>;
  online: boolean;
  typing: boolean;
  close: () => void;
}) {
  return (
    <View style={styles.flex}>
      <View style={styles.dmHead}>
        <Pressable onPress={close} style={styles.iconButton}>
          <Ionicons name="arrow-forward" size={20} color="#F5F7FA" />
        </Pressable>
        <View style={styles.dmIdentity}>
          <Text style={styles.dmName}>{profile?.name ?? 'محادثة'}</Text>
          <Text style={[styles.dmStatus, { color: online ? '#73F0CF' : '#7C8595' }]}>
            {typing ? 'جاري الكتابة…' : online ? 'متصل الآن' : 'غير متصل الآن'}
          </Text>
        </View>
      </View>
      <ScrollView contentContainerStyle={styles.messages}>
        {messages.map((message) => {
          const mine = message.sender_id === sessionId;
          return (
            <View key={message.id} style={[styles.message, mine ? styles.mine : styles.theirs]}>
              <Text style={styles.messageText}>{message.body}</Text>
              {mine && (
                <Text style={styles.receipt}>
                  {message.read_at ? '✓✓ تمت القراءة' : message.delivered_at ? '✓✓ تم التسليم' : '✓ تم الإرسال'}
                </Text>
              )}
            </View>
          );
        })}
      </ScrollView>
      <View style={styles.composer}>
        <TextInput
          value={body}
          onChangeText={onType}
          multiline
          maxLength={2000}
          placeholder="اكتب رسالة…"
          placeholderTextColor="#6F7888"
          style={styles.composerInput}
        />
        <Pressable onPress={() => void send()} style={styles.sendButton}>
          <Ionicons name="send" size={18} color="#07090D" />
        </Pressable>
      </View>
    </View>
  );
}

function Badge({ text, icon }: { text: string; icon: keyof typeof Ionicons.glyphMap }) {
  return <View style={styles.badge}><Ionicons name={icon} size={12} color="#73F0CF" /><Text style={styles.badgeText}>{text}</Text></View>;
}
function Stat({ value, label }: { value: string | number; label: string }) {
  return <View style={styles.stat}><Text style={styles.statValue}>{value}</Text><Text style={styles.statLabel}>{label}</Text></View>;
}
function Action({ icon, text, onPress }: { icon: keyof typeof Ionicons.glyphMap; text: string; onPress: () => void }) {
  return <Pressable onPress={onPress} style={styles.action}><Ionicons name={icon} size={18} color="#73F0CF" /><Text style={styles.actionText}>{text}</Text></Pressable>;
}
function Info({ icon, text }: { icon: keyof typeof Ionicons.glyphMap; text: string }) {
  return <View style={styles.info}><Ionicons name={icon} size={18} color="#73F0CF" /><Text style={styles.infoText}>{text}</Text></View>;
}
function Empty({ text }: { text: string }) {
  return <View style={styles.empty}><Ionicons name="planet-outline" size={30} color="#596272" /><Text style={styles.muted}>{text}</Text></View>;
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  stack: { gap: 10 },
  fab: { position: 'absolute', left: 12, top: 98, width: 44, height: 44, borderRadius: 15, borderWidth: 1, zIndex: 40, elevation: 12, shadowColor: '#73F0CF', shadowOpacity: 0.24, shadowRadius: 12 },
  fabPress: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  root: { flex: 1, backgroundColor: '#090A0F' },
  top: { height: 62, paddingHorizontal: 14, paddingTop: 10, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderBottomWidth: 1, borderBottomColor: '#242934' },
  topTitle: { color: '#F6F8FB', fontWeight: '900', fontSize: 14, letterSpacing: 0.6 },
  iconButton: { width: 40, height: 40, borderRadius: 14, borderWidth: 1, borderColor: '#2A303C', backgroundColor: '#12151D', alignItems: 'center', justifyContent: 'center' },
  scroll: { padding: 16, paddingBottom: 60, gap: 14 },
  searchWrap: { height: 54, borderRadius: 18, borderWidth: 1, borderColor: '#2A303C', backgroundColor: '#11141B', paddingHorizontal: 14, flexDirection: 'row-reverse', alignItems: 'center', gap: 9 },
  searchInput: { flex: 1, color: '#F5F7FA', textAlign: 'right', fontSize: 14 },
  searchGo: { backgroundColor: '#73F0CF', borderRadius: 12, paddingHorizontal: 13, paddingVertical: 8 },
  searchGoText: { color: '#090A0F', fontWeight: '900' },
  profileCard: { borderWidth: 1, borderColor: '#303644', backgroundColor: '#0E1118', borderRadius: 28, overflow: 'hidden', shadowColor: '#73F0CF', shadowOpacity: 0.08, shadowRadius: 22, elevation: 6 },
  cover: { height: 132, backgroundColor: '#151922', overflow: 'hidden' },
  coverPattern: { ...StyleSheet.absoluteFillObject, backgroundColor: '#161A23' },
  coverShade: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(9,10,15,.22)' },
  identityRow: { marginTop: -28, paddingHorizontal: 16, flexDirection: 'row', alignItems: 'flex-end', gap: 14 },
  identityText: { flex: 1, alignItems: 'flex-end' },
  avatarWrap: { width: 78, height: 78, borderRadius: 25, borderWidth: 3, borderColor: '#727B8C', backgroundColor: '#151923', overflow: 'hidden', alignItems: 'center', justifyContent: 'center' },
  avatar: { width: '100%', height: '100%' },
  name: { fontSize: 22, fontWeight: '900', color: '#F6F8FB', textAlign: 'right' },
  username: { fontSize: 13, fontWeight: '800', color: '#73F0CF', marginTop: 3 },
  badges: { flexDirection: 'row-reverse', gap: 7, marginTop: 8, flexWrap: 'wrap' },
  badge: { flexDirection: 'row-reverse', alignItems: 'center', gap: 4, borderRadius: 999, borderWidth: 1, borderColor: '#295146', backgroundColor: '#101B1A', paddingHorizontal: 9, paddingVertical: 5 },
  badgeText: { color: '#BDF8E7', fontSize: 9, fontWeight: '900' },
  bio: { color: '#C7CDD7', fontSize: 13, lineHeight: 21, textAlign: 'right', paddingHorizontal: 16, marginTop: 13 },
  stats: { margin: 16, flexDirection: 'row-reverse', borderRadius: 20, borderWidth: 1, borderColor: '#2A303C', backgroundColor: '#12151D', paddingVertical: 13 },
  stat: { flex: 1, alignItems: 'center' },
  statValue: { color: '#F7F8FA', fontSize: 18, fontWeight: '900' },
  statLabel: { color: '#7F8999', fontSize: 9, marginTop: 3 },
  actions: { flexDirection: 'row-reverse', gap: 8, paddingHorizontal: 16, paddingBottom: 16 },
  action: { flex: 1, minHeight: 46, borderRadius: 15, borderWidth: 1, borderColor: '#2A303C', backgroundColor: '#151922', alignItems: 'center', justifyContent: 'center', flexDirection: 'row-reverse', gap: 6 },
  actionText: { color: '#E9EDF3', fontSize: 11, fontWeight: '900' },
  tabs: { flexDirection: 'row-reverse', borderRadius: 18, borderWidth: 1, borderColor: '#252B36', backgroundColor: '#0E1117', padding: 5 },
  tab: { flex: 1, minHeight: 42, borderRadius: 13, alignItems: 'center', justifyContent: 'center' },
  tabActive: { backgroundColor: '#1B202A' },
  tabText: { color: '#737D8D', fontWeight: '800', fontSize: 11 },
  tabTextActive: { color: '#73F0CF' },
  bento: { flexDirection: 'row-reverse', flexWrap: 'wrap', gap: 10 },
  bentoCard: { width: '48.4%', minHeight: 212, borderWidth: 1, borderColor: '#292F3B', backgroundColor: '#10131A', borderRadius: 22, padding: 10, overflow: 'hidden' },
  bentoWide: { width: '100%' },
  listingImage: { height: 112, borderRadius: 15, backgroundColor: '#171B24', overflow: 'hidden' },
  imageShade: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,.08)' },
  listingTitle: { color: '#F1F4F8', fontSize: 13, fontWeight: '900', textAlign: 'right', marginTop: 8 },
  listingPrice: { color: '#E0B66C', fontSize: 14, fontWeight: '900', textAlign: 'right', marginTop: 5 },
  listingStatus: { color: '#778293', fontSize: 9, textAlign: 'right', marginTop: 3 },
  auctionCreate: { marginTop: 9, borderRadius: 11, backgroundColor: '#73F0CF', minHeight: 34, flexDirection: 'row-reverse', alignItems: 'center', justifyContent: 'center', gap: 5 },
  auctionCreateText: { color: '#090A0F', fontWeight: '900', fontSize: 10 },
  review: { borderRadius: 18, borderWidth: 1, borderColor: '#292F3B', backgroundColor: '#11151D', padding: 14 },
  stars: { color: '#E4BA70', fontSize: 15, textAlign: 'right' },
  reviewBody: { color: '#D6DBE3', fontSize: 12, lineHeight: 20, textAlign: 'right', marginTop: 7 },
  about: { gap: 10 },
  info: { minHeight: 52, borderRadius: 16, borderWidth: 1, borderColor: '#292F3B', backgroundColor: '#11151D', paddingHorizontal: 14, flexDirection: 'row-reverse', alignItems: 'center', gap: 9 },
  infoText: { flex: 1, color: '#D5DAE3', fontSize: 12, textAlign: 'right' },
  dangerButton: { minHeight: 48, borderRadius: 16, borderWidth: 1, borderColor: '#5A2930', backgroundColor: '#1A1115', flexDirection: 'row-reverse', alignItems: 'center', justifyContent: 'center', gap: 7 },
  dangerText: { color: '#FF7B86', fontWeight: '900' },
  reportBox: { borderRadius: 18, borderWidth: 1, borderColor: '#2A303C', backgroundColor: '#11151D', padding: 10, gap: 8 },
  reportInput: { minHeight: 48, borderRadius: 13, borderWidth: 1, borderColor: '#2A303C', paddingHorizontal: 12, color: '#EDF1F5', textAlign: 'right' },
  reportSend: { height: 42, borderRadius: 13, backgroundColor: '#222833', alignItems: 'center', justifyContent: 'center' },
  reportSendText: { color: '#F3F5F8', fontWeight: '900' },
  sectionTitle: { color: '#F7F8FA', fontSize: 17, fontWeight: '900', textAlign: 'right', marginTop: 8 },
  auction: { borderRadius: 20, borderWidth: 1, borderColor: '#32403F', backgroundColor: '#10161A', padding: 14, gap: 10 },
  auctionText: { flex: 1, alignItems: 'flex-end' },
  auctionTitle: { color: '#F4F6F8', fontSize: 14, fontWeight: '900', textAlign: 'right' },
  auctionMeta: { color: '#8D98A8', fontSize: 10, textAlign: 'right', marginTop: 4 },
  bidRow: { flexDirection: 'row-reverse', gap: 8 },
  bidInput: { flex: 1, height: 44, borderRadius: 13, borderWidth: 1, borderColor: '#303744', color: '#F4F6F8', paddingHorizontal: 11, textAlign: 'right' },
  bidButton: { width: 76, borderRadius: 13, backgroundColor: '#73F0CF', alignItems: 'center', justifyContent: 'center' },
  bidButtonText: { color: '#090A0F', fontWeight: '900' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 28, gap: 13 },
  gateTitle: { color: '#F6F8FA', fontSize: 24, fontWeight: '900', textAlign: 'center' },
  emptyTitle: { color: '#F6F8FA', fontSize: 20, fontWeight: '900' },
  muted: { color: '#818B9B', fontSize: 12, lineHeight: 20, textAlign: 'center' },
  usernameField: { width: '100%', height: 56, borderRadius: 17, borderWidth: 1, borderColor: '#303846', backgroundColor: '#11151D', flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14 },
  at: { color: '#73F0CF', fontSize: 22, fontWeight: '900' },
  usernameInput: { flex: 1, color: '#F5F7FA', fontSize: 16, letterSpacing: 0.3 },
  availability: { fontSize: 11, fontWeight: '800' },
  saveUsername: { width: '100%', height: 54, borderRadius: 17, backgroundColor: '#73F0CF', alignItems: 'center', justifyContent: 'center' },
  saveUsernameText: { color: '#080A0E', fontWeight: '900' },
  empty: { minHeight: 120, borderRadius: 20, borderWidth: 1, borderColor: '#252B36', backgroundColor: '#0E1117', alignItems: 'center', justifyContent: 'center', padding: 18, gap: 10 },
  dmHead: { height: 68, paddingHorizontal: 14, flexDirection: 'row', alignItems: 'center', gap: 12, borderBottomWidth: 1, borderBottomColor: '#252B36' },
  dmIdentity: { flex: 1, alignItems: 'flex-end' },
  dmName: { color: '#F5F7FA', fontWeight: '900', fontSize: 16 },
  dmStatus: { fontSize: 10, fontWeight: '800', marginTop: 2 },
  messages: { padding: 14, paddingBottom: 24, gap: 8 },
  message: { maxWidth: '82%', borderRadius: 18, paddingHorizontal: 13, paddingVertical: 10 },
  mine: { alignSelf: 'flex-end', backgroundColor: '#174B40', borderBottomRightRadius: 6 },
  theirs: { alignSelf: 'flex-start', backgroundColor: '#171B24', borderBottomLeftRadius: 6 },
  messageText: { color: '#F4F7F8', fontSize: 13, lineHeight: 20 },
  receipt: { color: '#8FDCC8', fontSize: 8, marginTop: 5, textAlign: 'right' },
  composer: { padding: 12, borderTopWidth: 1, borderTopColor: '#242A35', flexDirection: 'row', alignItems: 'flex-end', gap: 8, backgroundColor: '#0D1016' },
  composerInput: { flex: 1, maxHeight: 120, minHeight: 48, borderRadius: 16, borderWidth: 1, borderColor: '#2D3440', backgroundColor: '#151922', color: '#F5F7FA', paddingHorizontal: 13, paddingVertical: 11, textAlign: 'right' },
  sendButton: { width: 48, height: 48, borderRadius: 16, backgroundColor: '#73F0CF', alignItems: 'center', justifyContent: 'center' },
});
