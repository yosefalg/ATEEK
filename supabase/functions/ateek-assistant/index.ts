import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const cors={"Access-Control-Allow-Origin":"*","Access-Control-Allow-Headers":"authorization, x-client-info, apikey, content-type","Access-Control-Allow-Methods":"POST, OPTIONS"};
const json=(body:unknown,status=200)=>new Response(JSON.stringify(body),{status,headers:{...cors,"Content-Type":"application/json; charset=utf-8"}});
const GEMINI_MODEL="gemini-2.5-flash";

Deno.serve(async(req:Request)=>{
  if(req.method==="OPTIONS") return new Response("ok",{headers:cors});
  if(req.method!=="POST") return json({error:"method_not_allowed"},405);

  const apiKey=Deno.env.get("GEMINI_API_KEY");
  if(!apiKey){
    console.error("ATEEK_AI_CONFIG_ERROR",JSON.stringify({code:"missing_gemini_api_key"}));
    return json({error:"ai_not_configured",code:"missing_gemini_api_key",message:"مفتاح Gemini غير موجود في Secrets الخاصة بـ Supabase."},503);
  }

  let body:any;
  try{body=await req.json()}catch{return json({error:"invalid_json",message:"صيغة الطلب غير صالحة."},400)}
  const question=typeof body?.question==="string"?body.question.trim().slice(0,1200):"";
  if(!question) return json({error:"empty_question",message:"اكتب سؤالك أولاً."},400);

  const listings=Array.isArray(body?.listings)?body.listings.slice(0,80).map((x:any)=>({
    title:String(x?.title??"").slice(0,120),price:Number(x?.price??0),category:String(x?.category??"").slice(0,50),
    location:String(x?.location??"").slice(0,80),condition:String(x?.condition??"").slice(0,60),status:String(x?.status??"").slice(0,30),
    description:String(x?.description??"").slice(0,300),verified:Boolean(x?.verified)
  })):[];
  const context={listings,favoritesCount:Number(body?.favoritesCount??0),messagesCount:Number(body?.messagesCount??0),offersCount:Number(body?.offersCount??0)};

  const systemInstruction="أنت مساعد عتيك، مساعد سوق عراقي عربي. أجب بالعربية بوضوح واختصار. حلل فقط بيانات السوق المرسلة والسؤال. لا تدّع معرفة بيانات غير موجودة. الأسعار بالدينار العراقي ما لم يذكر غير ذلك. لا تعتبر مؤشر الاشتباه دليلاً على الاحتيال، ولا تطلب كلمات مرور أو رموز تحقق أو بيانات حساسة. عند النصائح المالية أو الدفع وضّح المخاطر ولا تضمن صفقة أو بائعاً.";
  const prompt=`بيانات سوق عتيك المتاحة لهذه الجلسة:\n${JSON.stringify(context)}\n\nسؤال المستخدم:\n${question}`;

  const controller=new AbortController();
  const timeout=setTimeout(()=>controller.abort(),25000);
  try{
    const r=await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`,{
      method:"POST",signal:controller.signal,
      headers:{"x-goog-api-key":apiKey,"Content-Type":"application/json"},
      body:JSON.stringify({
        systemInstruction:{parts:[{text:systemInstruction}]},
        contents:[{role:"user",parts:[{text:prompt}]}],
        generationConfig:{temperature:0.35,maxOutputTokens:900}
      })
    });

    let data:any=null;
    try{data=await r.json()}catch{data=null}
    if(!r.ok){
      const provider={
        status:r.status,
        code:String(data?.error?.status??data?.error?.code??"unknown"),
        type:String(data?.error?.details?.[0]?.reason??data?.error?.status??"unknown"),
        message:String(data?.error?.message??"Gemini returned an error"),
        requestId:r.headers.get("x-request-id")??r.headers.get("x-guploader-uploadid")
      };
      console.error("ATEEK_GEMINI_ERROR",JSON.stringify(provider));
      let userMessage=provider.message;
      if(r.status===400) userMessage=`رفض Gemini الطلب: ${provider.message}`;
      else if(r.status===401) userMessage="مفتاح Gemini مرفوض أو غير صالح.";
      else if(r.status===403) userMessage=`مفتاح Gemini لا يملك الصلاحية المطلوبة: ${provider.message}`;
      else if(r.status===429) userMessage=`تم الوصول إلى حد استخدام Gemini أو الحصة المتاحة: ${provider.message}`;
      return json({error:"provider_error",providerStatus:provider.status,providerCode:provider.code,providerType:provider.type,providerRequestId:provider.requestId,message:userMessage},r.status===429?429:502);
    }

    const answer=Array.isArray(data?.candidates)?data.candidates.flatMap((c:any)=>c?.content?.parts??[]).map((p:any)=>typeof p?.text==="string"?p.text:"").filter(Boolean).join("\n").trim():"";
    if(!answer){
      const finishReason=data?.candidates?.[0]?.finishReason??null;
      const blockReason=data?.promptFeedback?.blockReason??null;
      console.error("ATEEK_AI_EMPTY_RESPONSE",JSON.stringify({model:GEMINI_MODEL,finishReason,blockReason}));
      const detail=blockReason?` تم حظر الطلب بواسطة Gemini: ${blockReason}.`:finishReason?` انتهى الرد بدون نص: ${finishReason}.`:"";
      return json({error:"empty_provider_response",message:`وصل رد فارغ من Gemini.${detail}`,finishReason,blockReason},502);
    }

    return json({answer,model:GEMINI_MODEL,requestId:r.headers.get("x-request-id")??null,usage:data?.usageMetadata??null});
  }catch(e){
    if(e instanceof DOMException&&e.name==="AbortError") return json({error:"timeout",message:"استغرق Gemini وقتًا أطول من المتوقع. حاول مجددًا."},504);
    const msg=e instanceof Error?e.message:"unknown";
    console.error("ATEEK_AI_SERVER_ERROR",JSON.stringify({message:msg}));
    return json({error:"server_error",message:`حدث خطأ في خدمة مساعد عتيك: ${msg}`},500);
  }finally{clearTimeout(timeout)}
});
