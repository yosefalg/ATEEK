import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const cors={"Access-Control-Allow-Origin":"*","Access-Control-Allow-Headers":"authorization, x-client-info, apikey, content-type","Access-Control-Allow-Methods":"POST, OPTIONS"};
const json=(body:unknown,status=200)=>new Response(JSON.stringify(body),{status,headers:{...cors,"Content-Type":"application/json; charset=utf-8"}});

Deno.serve(async(req:Request)=>{
  if(req.method==="OPTIONS") return new Response("ok",{headers:cors});
  if(req.method!=="POST") return json({error:"method_not_allowed"},405);

  const apiKey=Deno.env.get("OPENAI_API_KEY");
  if(!apiKey){
    console.error("ATEEK_AI_CONFIG_ERROR", JSON.stringify({code:"missing_openai_api_key"}));
    return json({error:"ai_not_configured",code:"missing_openai_api_key",message:"مفتاح OpenAI غير موجود في Secrets الخاصة بـ Supabase."},503);
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

  const controller=new AbortController();
  const timeout=setTimeout(()=>controller.abort(),25000);
  try{
    const r=await fetch("https://api.openai.com/v1/responses",{
      method:"POST",signal:controller.signal,
      headers:{Authorization:`Bearer ${apiKey}`,"Content-Type":"application/json"},
      body:JSON.stringify({
        model:"gpt-5.6-luna",
        reasoning:{effort:"low"},
        max_output_tokens:900,
        instructions:"أنت مساعد عتيك، مساعد سوق عراقي عربي. أجب بالعربية بوضوح واختصار. حلل فقط بيانات السوق المرسلة والسؤال. لا تدّع معرفة بيانات غير موجودة. الأسعار بالدينار العراقي ما لم يذكر غير ذلك. لا تعتبر مؤشر الاشتباه دليلاً على الاحتيال، ولا تطلب كلمات مرور أو رموز تحقق أو بيانات حساسة. عند النصائح المالية أو الدفع وضّح المخاطر ولا تضمن صفقة أو بائعاً.",
        input:`بيانات سوق عتيك المتاحة لهذه الجلسة:\n${JSON.stringify(context)}\n\nسؤال المستخدم:\n${question}`
      })
    });

    let data:any=null;
    try{data=await r.json()}catch{data=null}
    if(!r.ok){
      const provider={
        status:r.status,
        code:String(data?.error?.code??"unknown"),
        type:String(data?.error?.type??"unknown"),
        param:data?.error?.param??null,
        message:String(data?.error?.message??"OpenAI returned an error"),
        requestId:r.headers.get("x-request-id")
      };
      console.error("ATEEK_OPENAI_ERROR",JSON.stringify(provider));
      const userMessage=r.status===401?"مفتاح OpenAI مرفوض أو غير صالح.":r.status===403?"مفتاح OpenAI لا يملك صلاحية استخدام هذا المورد أو النموذج.":r.status===429?"وصل حساب OpenAI إلى حد الاستخدام/الرصيد أو معدل الطلبات.":provider.message;
      return json({error:"provider_error",providerStatus:provider.status,providerCode:provider.code,providerType:provider.type,providerRequestId:provider.requestId,message:userMessage},r.status===429?429:502);
    }

    const answer=typeof data?.output_text==="string"?data.output_text.trim():(Array.isArray(data?.output)?data.output.flatMap((o:any)=>o?.content??[]).filter((c:any)=>c?.type==="output_text").map((c:any)=>c?.text??"").join("\n").trim():"");
    if(!answer){
      console.error("ATEEK_AI_EMPTY_RESPONSE",JSON.stringify({id:data?.id??null,model:data?.model??null,status:data?.status??null}));
      return json({error:"empty_provider_response",message:"وصل رد فارغ من خدمة الذكاء الاصطناعي."},502);
    }
    return json({answer,model:data?.model??"gpt-5.6-luna",requestId:data?.id??null,usage:data?.usage??null});
  }catch(e){
    if(e instanceof DOMException&&e.name==="AbortError") return json({error:"timeout",message:"استغرق الذكاء الاصطناعي وقتًا أطول من المتوقع. حاول مجددًا."},504);
    const msg=e instanceof Error?e.message:"unknown";
    console.error("ATEEK_AI_SERVER_ERROR",JSON.stringify({message:msg}));
    return json({error:"server_error",message:`حدث خطأ في خدمة مساعد عتيك: ${msg}`},500);
  }finally{clearTimeout(timeout)}
});
