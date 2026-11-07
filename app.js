import { pipeline, env } from "https://cdn.jsdelivr.net/npm/@huggingface/transformers@3.7.2";

const MODEL = "onnx-community/SmolLM2-360M-Instruct";
const $ = (id) => document.getElementById(id);
const els = {
  prompt:$("prompt"), send:$("sendBtn"), messages:$("messages"), welcome:$("welcome"),
  loadRow:$("loadRow"), loadText:$("loadText"), progress:$("progressBar"),
  status:$("modelStatus"), chatList:$("chatList"), toast:$("toast"), sidebar:$("sidebar")
};
let generator = null, loading = false, busy = false, speakReplies = false;
let chats = JSON.parse(localStorage.getItem("sathi_chats") || "[]");
let activeId = null, deferredInstall = null;
const systemPrompt = "You are SATHI AI, a helpful, friendly assistant. Reply in the same language as the user. The user may write Bengali, English, or Hindi. Be accurate, clear, concise, and admit when unsure. Do not claim to have live internet access.";

function toast(message){els.toast.textContent=message;els.toast.classList.add("show");setTimeout(()=>els.toast.classList.remove("show"),2600)}
function save(){localStorage.setItem("sathi_chats",JSON.stringify(chats))}
function newChat(){const c={id:crypto.randomUUID(),title:"নতুন চ্যাট",messages:[]};chats.unshift(c);activeId=c.id;save();renderChats();renderMessages()}
function currentChat(){return chats.find(c=>c.id===activeId)}
function renderChats(){
  els.chatList.innerHTML="";
  chats.forEach(c=>{const b=document.createElement("button");b.className="chat-item"+(c.id===activeId?" active":"");b.textContent=c.title;b.onclick=()=>{activeId=c.id;renderChats();renderMessages();els.sidebar.classList.remove("open")};els.chatList.append(b)})
}
function renderMessages(){
  const c=currentChat();els.messages.innerHTML="";els.welcome.style.display=c&&c.messages.length?"none":"block";
  if(!c)return;
  c.messages.forEach(m=>addMessage(m.role,m.content,false));
  els.conversation.scrollTop=els.conversation.scrollHeight;
}
function addMessage(role,content,scroll=true){
  const row=document.createElement("div");row.className="message "+role;
  const avatar=document.createElement("div");avatar.className="avatar";avatar.textContent=role==="user"?"●":"✦";
  const wrap=document.createElement("div");wrap.style.minWidth="0";
  const bubble=document.createElement("div");bubble.className="bubble";bubble.textContent=content;
  wrap.append(bubble);
  if(role==="assistant"){const actions=document.createElement("div");actions.className="message-actions";const copy=document.createElement("button");copy.className="copy-btn";copy.textContent="▢ Copy";copy.onclick=()=>{navigator.clipboard?.writeText(content);toast("কপি হয়েছে")};actions.append(copy);wrap.append(actions)}
  row.append(avatar,wrap);els.messages.append(row);
  if(scroll)els.conversation.scrollTop=els.conversation.scrollHeight;
}
function setBusy(value){busy=value;els.send.disabled=value;els.send.textContent=value?"…":"➤"}
async function loadModel(){
  if(generator||loading)return generator;
  loading=true;els.loadRow.classList.add("visible");els.status.textContent="AI লোড হচ্ছে";els.loadText.textContent="Free AI মডেল ডাউনলোড/লোড হচ্ছে…";
  env.allowLocalModels=false;env.useBrowserCache=true;
  try{
    generator=await pipeline("text-generation",MODEL,{
      dtype:"q4",
      device:"webgpu",
      progress_callback:(p)=>{
        if(p.status==="progress"&&p.total){const n=Math.round(p.progress);els.progress.style.width=n+"%";els.loadText.textContent=`AI মডেল ডাউনলোড হচ্ছে… ${n}%`}
        else if(p.status==="initiate")els.loadText.textContent="AI ফাইল প্রস্তুত হচ্ছে…";
        else if(p.status==="done")els.progress.style.width="100%";
      }
    });
  }catch(webgpuError){
    console.warn("WebGPU unavailable; trying WASM",webgpuError);
    try{generator=await pipeline("text-generation",MODEL,{dtype:"q4",device:"wasm",progress_callback:(p)=>{if(p.status==="progress"&&p.total){const n=Math.round(p.progress);els.progress.style.width=n+"%";els.loadText.textContent=`AI ডাউনলোড হচ্ছে… ${n}%`}}})}
    catch(err){console.error(err);els.loadText.textContent="AI চালু করা যায়নি। অন্য ব্রাউজার বা শক্তিশালী ডিভাইসে চেষ্টা করুন।";els.status.textContent="AI unavailable";toast("AI মডেল লোড হয়নি");loading=false;return null}
  }
  loading=false;els.loadRow.classList.remove("visible");els.status.textContent="AI প্রস্তুত";toast("SATHI AI প্রস্তুত!");return generator;
}
async function sendMessage(text){
  text=text.trim();if(!text||busy)return;
  if(!activeId)newChat();
  const chat=currentChat();chat.messages.push({role:"user",content:text});
  if(chat.messages.length===1)chat.title=text.slice(0,28)+(text.length>28?"…":"");
  save();renderChats();els.welcome.style.display="none";addMessage("user",text);els.prompt.value="";els.prompt.style.height="auto";
  setBusy(true);
  try{
    const model=await loadModel();if(!model)throw new Error("AI model unavailable");
    const history=chat.messages.slice(-8).map(m=>({role:m.role==="assistant"?"assistant":"user",content:m.content}));
    const messages=[{role:"system",content:systemPrompt},...history];
    const result=await model(messages,{max_new_tokens:220,temperature:0.7,top_p:0.9,do_sample:true});
    let answer=result?.[0]?.generated_text;
    if(Array.isArray(answer)){const last=answer.filter(x=>x.role==="assistant").at(-1);answer=last?.content}
    if(typeof answer!=="string")answer=String(answer||"দুঃখিত, উত্তর তৈরি করতে পারিনি।");
    answer=answer.trim();
    chat.messages.push({role:"assistant",content:answer});save();addMessage("assistant",answer);
    if(speakReplies)speak(answer);
  }catch(err){console.error(err);const msg="দুঃখিত, AI উত্তর দিতে পারেনি। মডেল লোড হয়েছে কি না এবং ইন্টারনেট সংযোগ আছে কি না পরীক্ষা করুন।";addMessage("assistant",msg);toast("একটি সমস্যা হয়েছে")}
  finally{setBusy(false)}
}
function speak(text){if(!("speechSynthesis"in window))return;window.speechSynthesis.cancel();const u=new SpeechSynthesisUtterance(text);u.lang=/[\u0980-\u09FF]/.test(text)?"bn-IN":"en-US";window.speechSynthesis.speak(u)}
function startVoice(){
  const SR=window.SpeechRecognition||window.webkitSpeechRecognition;
  if(!SR){toast("এই ব্রাউজারে Voice Recognition নেই");return}
  const rec=new SR();rec.lang="bn-IN";rec.interimResults=false;rec.onstart=()=>toast("শুনছি… এখন কথা বলুন");rec.onerror=()=>toast("মাইক্রোফোন অনুমতি পরীক্ষা করুন");rec.onresult=e=>{els.prompt.value=e.results[0][0].transcript;els.prompt.focus()};rec.start();
}
els.send.onclick=()=>sendMessage(els.prompt.value);
els.prompt.addEventListener("keydown",e=>{if(e.key==="Enter"&&!e.shiftKey){e.preventDefault();sendMessage(els.prompt.value)}});
els.prompt.addEventListener("input",()=>{els.prompt.style.height="auto";els.prompt.style.height=Math.min(els.prompt.scrollHeight,150)+"px"});
$("newChat").onclick=newChat;$("micBtn").onclick=startVoice;
$("voiceToggle").onclick=()=>{speakReplies=!speakReplies;$("voiceToggle").textContent=speakReplies?"🔊":"🔇";toast(speakReplies?"Voice reply চালু":"Voice reply বন্ধ")};
$("menuBtn").onclick=()=>els.sidebar.classList.toggle("open");
$("clearAll").onclick=()=>{if(confirm("সব চ্যাট মুছে ফেলবেন?")){chats=[];activeId=null;save();renderChats();renderMessages();newChat()}};
document.querySelectorAll(".suggestion").forEach(b=>b.onclick=()=>sendMessage(b.dataset.prompt));
window.addEventListener("beforeinstallprompt",e=>{e.preventDefault();deferredInstall=e;$("installBtn").hidden=false});
$("installBtn").onclick=async()=>{if(!deferredInstall){toast("Chrome menu থেকে Add to Home Screen নির্বাচন করুন");return}deferredInstall.prompt();await deferredInstall.userChoice;deferredInstall=null};
if("serviceWorker"in navigator)window.addEventListener("load",()=>navigator.serviceWorker.register("./sw.js").catch(console.warn));
if(chats.length){activeId=chats[0].id;renderChats();renderMessages()}else newChat();
