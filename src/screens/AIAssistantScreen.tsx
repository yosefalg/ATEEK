import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';
import { useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, FlatList, KeyboardAvoidingView, Platform, Pressable, Share, StyleSheet, Text, TextInput, View } from 'react-native';
import { streamAiReply, type AiMode, type AiStreamEvent } from '../ai/aiClient';
import { supabase } from '../cloud/client';
import { useAteekTheme } from '../theme/ThemeProvider';

type ChatMessage = { id: string; role: 'user' | 'assistant'; body: string; created_at?: string };
const CACHE_PREFIX = 'ateek.ai.chat.snapshot.v1.';
const modes: Array<{ id: AiMode; label: string; icon: keyof typeof Ionicons.glyphMap }> = [
  { id: 'chat', label: 'عام', icon: 'sparkles-outline' },
  { id: 'antique_expert', label: 'خبير تحف', icon: 'diamond-outline' },
  { id: 'marketplace', label: 'سوق وتفاوض', icon: 'storefront-outline' },
  { id: 'iraq_guide', label: 'دليل العراق', icon: 'map-outline' },
];

function uid(prefix = 'm') { return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`; }

export function AIAssistantScreen() {
  const { colors } = useAteekTheme();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [threadId, setThreadId] = useState<string | null>(null);
  const [mode, setMode] = useState<AiMode>('chat');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [remaining, setRemaining] = useState<number | null>(null);
  const [model, setModel] = useState('OpenAI');
  const [userId, setUserId] = useState<string | null>(null);
  const listRef = useRef<FlatList<ChatMessage>>(null);
  const cancelRef = useRef<null | (() => void)>(null);
  const streamGeneration = useRef(0);
  const pendingDelta = useRef('');
  const assistantId = useRef<string | null>(null);
  const frame = useRef<number | null>(null);

  useEffect(() => {
    let alive = true;
    void (async () => {
      const { data } = await supabase.auth.getUser();
      const id = data.user?.id ?? null;
      if (!alive || !id) return;
      setUserId(id);
      try {
        const raw = await AsyncStorage.getItem(CACHE_PREFIX + id);
        if (raw) {
          const cached = JSON.parse(raw) as { threadId?: string | null; messages?: ChatMessage[] };
          if (Array.isArray(cached.messages)) setMessages(cached.messages.slice(-50));
          if (cached.threadId) setThreadId(String(cached.threadId));
        }
      } catch {}
      const { data: threads } = await supabase.from('ateek_ai_threads').select('id').eq('user_id', id).order('updated_at', { ascending: false }).limit(1);
      const latest = threads?.[0]?.id ? String(threads[0].id) : null;
      if (!alive || !latest) return;
      const { data: rows } = await supabase.from('ateek_ai_messages').select('id,role,body,created_at').eq('thread_id', latest).eq('user_id', id).order('created_at', { ascending: true }).limit(80);
      if (!alive) return;
      setThreadId(latest);
      if (Array.isArray(rows)) setMessages(rows.map((row: any) => ({ id: String(row.id), role: row.role === 'assistant' ? 'assistant' : 'user', body: String(row.body ?? ''), created_at: row.created_at ? String(row.created_at) : undefined })));
    })().catch(() => {});
    return () => {
      alive = false;
      streamGeneration.current += 1;
      cancelRef.current?.();
      if (frame.current != null) cancelAnimationFrame(frame.current);
    };
  }, []);

  useEffect(() => {
    if (!userId) return;
    const timer = setTimeout(() => {
      void AsyncStorage.setItem(CACHE_PREFIX + userId, JSON.stringify({ threadId, messages: messages.slice(-50) })).catch(() => {});
    }, 250);
    return () => clearTimeout(timer);
  }, [messages, threadId, userId]);

  const flushDelta = () => {
    frame.current = null;
    const id = assistantId.current;
    const delta = pendingDelta.current;
    pendingDelta.current = '';
    if (!id || !delta) return;
    setMessages(prev => prev.map(item => item.id === id ? { ...item, body: item.body + delta } : item));
  };
  const queueDelta = (delta: string) => {
    pendingDelta.current += delta;
    if (frame.current == null) frame.current = requestAnimationFrame(flushDelta);
  };

  const handleEvent = (event: AiStreamEvent) => {
    if (event.type === 'meta') {
      if (event.threadId) setThreadId(event.threadId);
      if (typeof event.remaining === 'number') setRemaining(event.remaining);
      if (event.model) setModel(event.model);
      return;
    }
    if (event.type === 'delta') { queueDelta(event.delta); return; }
    if (event.type === 'done') {
      flushDelta();
      setBusy(false);
      cancelRef.current = null;
      return;
    }
    if (event.type === 'error') {
      flushDelta();
      const message = event.message || 'تعذّر إكمال الرد الآن.';
      setError(message);
      const id = assistantId.current;
      if (id) setMessages(prev => prev.map(item => item.id === id && !item.body ? { ...item, body: message } : item));
      setBusy(false);
      cancelRef.current?.();
      cancelRef.current = null;
    }
  };

  const send = async () => {
    const text = input.trim();
    if (!text || busy) return;
    const generation = ++streamGeneration.current;
    setError('');
    setInput('');
    const userMessage: ChatMessage = { id: uid('u'), role: 'user', body: text };
    const aiMessage: ChatMessage = { id: uid('a'), role: 'assistant', body: '' };
    assistantId.current = aiMessage.id;
    setMessages(prev => [...prev, userMessage, aiMessage]);
    setBusy(true);
    try {
      const cancel = await streamAiReply({
        message: text,
        threadId,
        mode,
        onEvent: event => {
          if (streamGeneration.current !== generation) return;
          handleEvent(event);
        },
      });
      if (streamGeneration.current !== generation) {
        cancel();
        return;
      }
      cancelRef.current = cancel;
    } catch (e) {
      if (streamGeneration.current !== generation) return;
      handleEvent({ type: 'error', message: e instanceof Error ? e.message : 'تعذّر بدء المحادثة.' });
    }
  };

  const newChat = () => {
    streamGeneration.current += 1;
    cancelRef.current?.();
    cancelRef.current = null;
    pendingDelta.current = '';
    assistantId.current = null;
    if (frame.current != null) {
      cancelAnimationFrame(frame.current);
      frame.current = null;
    }
    setBusy(false);
    setError('');
    setThreadId(null);
    setMessages([]);
  };

  const modeLabel = useMemo(() => modes.find(item => item.id === mode)?.label ?? 'عام', [mode]);

  return <KeyboardAvoidingView style={s.root} behavior={Platform.OS === 'ios' ? 'padding' : 'height'} keyboardVerticalOffset={0}>
    <View style={[s.header, { borderBottomColor: colors.line, backgroundColor: colors.glassStrong }]}> 
      <View style={s.headerText}>
        <Text style={[s.title, { color: colors.ink }]}>ATEEK AI</Text>
        <Text style={[s.subtitle, { color: colors.muted }]}>{model} • {modeLabel}{remaining != null ? ` • متبقي ${remaining}` : ''}</Text>
      </View>
      <Pressable accessibilityRole="button" accessibilityLabel="محادثة جديدة" onPress={newChat} style={[s.newButton, { borderColor: colors.line, backgroundColor: colors.glass }]}>
        <Ionicons accessible={false} name="create-outline" size={21} color={colors.gold}/>
      </Pressable>
    </View>

    <FlatList horizontal inverted data={modes} keyExtractor={item => item.id} showsHorizontalScrollIndicator={false} contentContainerStyle={s.modes} style={s.modeList} renderItem={({ item }) => {
      const active = item.id === mode;
      return <Pressable accessibilityRole="button" accessibilityState={{ selected: active, disabled: busy }} accessibilityLabel={`وضع ${item.label}`} disabled={busy} onPress={() => setMode(item.id)} style={[s.modeChip, { borderColor: active ? colors.gold : colors.line, backgroundColor: active ? colors.forestSoft : colors.glass }]}>
        <Ionicons accessible={false} name={item.icon} size={16} color={active ? colors.gold : colors.muted}/><Text style={[s.modeText, { color: active ? colors.ink : colors.muted }]}>{item.label}</Text>
      </Pressable>;
    }}/>

    <FlatList ref={listRef} data={messages} keyExtractor={item => item.id} contentContainerStyle={messages.length ? s.messages : s.emptyMessages} keyboardShouldPersistTaps="handled" onContentSizeChange={() => listRef.current?.scrollToEnd({ animated: true })} renderItem={({ item }) => {
      const mine = item.role === 'user';
      return <View style={[s.bubble, mine ? s.userBubble : s.aiBubble, { backgroundColor: mine ? colors.gold : colors.glassStrong, borderColor: mine ? colors.gold : colors.line }]}>
        {!mine && <View style={s.aiLabel}><Ionicons accessible={false} name="sparkles" size={14} color={colors.gold}/><Text style={[s.aiLabelText, { color: colors.gold }]}>ATEEK AI</Text></View>}
        {item.body ? <Text selectable style={[s.body, { color: mine ? colors.forest : colors.ink }]}>{item.body}</Text> : <View accessibilityLiveRegion="polite" accessibilityLabel="ATEEK AI يفكر" style={s.typing}><ActivityIndicator accessibilityElementsHidden size="small" color={colors.gold}/><Text style={[s.typingText, { color: colors.muted }]}>يفكر…</Text></View>}
        {!mine && !!item.body && <Pressable accessibilityRole="button" accessibilityLabel="مشاركة الرد" onPress={() => void Share.share({ message: item.body }).catch(() => {})} style={s.share}><Ionicons accessible={false} name="share-social-outline" size={17} color={colors.muted}/><Text style={[s.shareText, { color: colors.muted }]}>مشاركة</Text></Pressable>}
      </View>;
    }} ListEmptyComponent={<View style={s.welcome}><View style={[s.logo, { backgroundColor: colors.forestSoft, borderColor: colors.line }]}><Ionicons accessible={false} name="sparkles" size={34} color={colors.gold}/></View><Text style={[s.welcomeTitle, { color: colors.ink }]}>مساعد عتيك الذكي</Text><Text style={[s.welcomeBody, { color: colors.muted }]}>اسأل عن التحف، البيع والشراء، تحسين إعلانك، أو أي سؤال عام. لا ترسل كلمات مرور أو بيانات دفع.</Text></View>}/>

    {!!error && <Text accessibilityRole="alert" style={[s.error, { color: colors.danger }]}>{error}</Text>}
    <View style={[s.composer, { borderTopColor: colors.line, backgroundColor: colors.glassStrong }]}>
      <Pressable accessibilityRole="button" accessibilityLabel={busy ? 'المساعد يجيب الآن' : 'إرسال'} accessibilityState={{ disabled: busy || !input.trim(), busy }} disabled={busy || !input.trim()} onPress={() => void send()} style={[s.send, { backgroundColor: colors.gold }, (busy || !input.trim()) && s.disabled]}>
        {busy ? <ActivityIndicator accessibilityElementsHidden size="small" color={colors.forest}/> : <Ionicons accessible={false} name="arrow-up" size={21} color={colors.forest}/>} 
      </Pressable>
      <TextInput value={input} onChangeText={setInput} editable={!busy} multiline maxLength={8000} placeholder="اكتب رسالتك إلى ATEEK AI…" placeholderTextColor={colors.muted} onSubmitEditing={() => { if (!input.includes('\n')) void send(); }} accessibilityLabel="رسالة إلى ATEEK AI" accessibilityState={{ disabled: busy }} style={[s.input, { color: colors.ink, backgroundColor: colors.glass, borderColor: colors.line }]}/>
    </View>
  </KeyboardAvoidingView>;
}

const s = StyleSheet.create({
  root:{flex:1,backgroundColor:'transparent'},header:{minHeight:68,borderBottomWidth:1,paddingHorizontal:16,paddingVertical:10,flexDirection:'row-reverse',alignItems:'center',gap:12},headerText:{flex:1,alignItems:'flex-end'},title:{fontSize:21,fontWeight:'900',textAlign:'right'},subtitle:{fontSize:10,fontWeight:'700',marginTop:3,textAlign:'right'},newButton:{width:44,height:44,borderRadius:16,borderWidth:1,alignItems:'center',justifyContent:'center'},
  modeList:{flexGrow:0,maxHeight:58},modes:{paddingHorizontal:12,paddingVertical:9,gap:8},modeChip:{minHeight:40,borderRadius:14,borderWidth:1,paddingHorizontal:12,flexDirection:'row-reverse',alignItems:'center',gap:6},modeText:{fontSize:11,fontWeight:'800'},
  messages:{padding:14,paddingBottom:20,gap:10},emptyMessages:{flexGrow:1,justifyContent:'center',padding:24},bubble:{maxWidth:'89%',borderRadius:20,borderWidth:1,padding:13,gap:7},userBubble:{alignSelf:'flex-end',borderBottomRightRadius:7},aiBubble:{alignSelf:'flex-start',borderBottomLeftRadius:7},aiLabel:{flexDirection:'row-reverse',alignItems:'center',alignSelf:'flex-end',gap:5},aiLabelText:{fontSize:10,fontWeight:'900'},body:{fontSize:14,lineHeight:22,textAlign:'right',writingDirection:'rtl'},typing:{minHeight:28,flexDirection:'row-reverse',alignItems:'center',gap:8},typingText:{fontSize:11,fontWeight:'700'},share:{minHeight:32,alignSelf:'flex-start',flexDirection:'row-reverse',alignItems:'center',gap:5,paddingHorizontal:4},shareText:{fontSize:10,fontWeight:'700'},
  welcome:{alignItems:'center',paddingHorizontal:18,gap:10},logo:{width:70,height:70,borderRadius:25,borderWidth:1,alignItems:'center',justifyContent:'center'},welcomeTitle:{fontSize:23,fontWeight:'900',textAlign:'center'},welcomeBody:{fontSize:12,lineHeight:21,textAlign:'center',maxWidth:330},
  error:{paddingHorizontal:16,paddingVertical:6,fontSize:11,fontWeight:'700',textAlign:'right'},composer:{borderTopWidth:1,padding:10,paddingBottom:12,flexDirection:'row',alignItems:'flex-end',gap:8},input:{flex:1,minHeight:48,maxHeight:132,borderRadius:17,borderWidth:1,paddingHorizontal:13,paddingVertical:11,fontSize:14,textAlign:'right',writingDirection:'rtl'},send:{width:46,height:46,borderRadius:16,alignItems:'center',justifyContent:'center'},disabled:{opacity:.42}
});
