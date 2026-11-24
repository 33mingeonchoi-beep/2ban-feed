// 2반피드 - Supabase 연결 설정
// 아래 두 값은 Supabase Project Settings > API Keys에서 확인한 값으로 채워 주세요.
const SUPABASE_URL = "https://fiagrhzcvxpqwguyneck.supabase.co";
const SUPABASE_PUBLISHABLE_KEY = sb_publishable_8iVmLY91WEQ8bhQD3PyJIA_4sutyeYw Publishable_key";

const supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY);
const BUCKET = "2ban-images";
let currentUser = null;
let authMode = "login";
let myProfile = null;
const $ = (id) => document.getElementById(id);
const escapeHtml = (value="") => String(value).replace(/[&<>"']/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const dateText = (value) => new Date(value).toLocaleString("ko-KR",{month:"short",day:"numeric",hour:"2-digit",minute:"2-digit"});
function toast(msg){const el=$("toast");el.textContent=msg;el.classList.add("show");setTimeout(()=>el.classList.remove("show"),2400)}
function message(id,msg){$(id).textContent=msg}
function setMode(mode){authMode=mode;document.querySelectorAll(".tab").forEach(b=>b.classList.toggle("active",b.dataset.tab===mode));$("nicknameLabel").classList.toggle("hidden",mode!=="signup");$("authSubmit").textContent=mode==="login"?"로그인":"회원가입";$("password").autocomplete=mode==="login"?"current-password":"new-password";message("authMessage","")}
document.querySelectorAll(".tab").forEach(b=>b.addEventListener("click",()=>setMode(b.dataset.tab)));
document.querySelectorAll(".nav-btn").forEach(b=>b.addEventListener("click",()=>showView(b.dataset.view)));
function showView(view){document.querySelectorAll(".nav-btn").forEach(b=>b.classList.toggle("active",b.dataset.view===view));document.querySelectorAll(".view").forEach(v=>v.classList.add("hidden"));$(view+"View").classList.remove("hidden");}
async function getProfile(userId){const {data,error}=await supabaseClient.from("profiles").select("*").eq("id",userId).maybeSingle();if(error)throw error;return data}
async function refreshAuth(){
  const {data:{session}}=await supabaseClient.auth.getSession();
  currentUser=session?.user||null;
  $("authPanel").classList.toggle("hidden",!!currentUser);
  $("appPanel").classList.toggle("hidden",!currentUser);
  $("logoutBtn").classList.toggle("hidden",!currentUser);
  if(currentUser){try{myProfile=await getProfile(currentUser.id);$("welcomeText").textContent="안녕하세요, "+(myProfile?.nickname||currentUser.email)+"님!";$("myAvatar").textContent=(myProfile?.nickname||"2").slice(0,1);$("profileNickname").value=myProfile?.nickname||"";await loadAll()}catch(e){console.error(e);toast("프로필을 불러오지 못했어요: "+e.message)}}
}
$("authForm").addEventListener("submit",async e=>{
  e.preventDefault();message("authMessage","처리 중...");
  const email=$("email").value.trim(),password=$("password").value;
  try{
    if(authMode==="signup"){
      const nickname=$("nickname").value.trim();if(!nickname)throw new Error("닉네임을 입력해 주세요.");
      const {data,error}=await supabaseClient.auth.signUp({email,password,options:{data:{nickname}}});if(error)throw error;
      message("authMessage",data.session?"가입 완료!":"가입 확인 메일을 확인한 뒤 로그인해 주세요.");
    }else{const {error}=await supabaseClient.auth.signInWithPassword({email,password});if(error)throw error;message("authMessage","로그인 성공!");}
    await refreshAuth();
  }catch(err){message("authMessage",err.message)}
});
$("logoutBtn").addEventListener("click",async()=>{await supabaseClient.auth.signOut();myProfile=null;refreshAuth()});
$("refreshBtn").addEventListener("click",()=>currentUser?loadAll():refreshAuth());

async function uploadImage(file,folder){
  if(!file) return null;
  if(file.size>8*1024*1024)throw new Error("이미지는 8MB 이하만 업로드할 수 있어요.");
  if(!["image/jpeg","image/png","image/webp","image/gif"].includes(file.type))throw new Error("JPG, PNG, WEBP, GIF 이미지만 올릴 수 있어요.");
  const ext=file.name.split(".").pop().toLowerCase().replace(/[^a-z0-9]/g,"")||"jpg";
  const path=`${currentUser.id}/${folder}/${crypto.randomUUID()}.${ext}`;
  const {error}=await supabaseClient.storage.from(BUCKET).upload(path,file,{cacheControl:"3600",upsert:false,contentType:file.type});
  if(error)throw error;
  return supabaseClient.storage.from(BUCKET).getPublicUrl(path).data.publicUrl;
}
$("postForm").addEventListener("submit",async e=>{
  e.preventDefault();message("postMessage","업로드 중...");
  try{
    const file=$("postImage").files[0];const image_url=await uploadImage(file,"posts");
    if(!image_url&&!$("caption").value.trim())throw new Error("글이나 사진 중 하나는 입력해 주세요.");
    const {error}=await supabaseClient.from("posts").insert({user_id:currentUser.id,image_url,caption:$("caption").value.trim()});
    if(error)throw error;$("caption").value="";$("postImage").value="";message("postMessage","게시물을 올렸어요!");await loadPosts();
  }catch(err){message("postMessage",err.message)}
});
$("storyForm").addEventListener("submit",async e=>{
  e.preventDefault();
  try{const file=$("storyImage").files[0];if(!file)throw new Error("사진을 선택해 주세요.");const image_url=await uploadImage(file,"stories");
    const expires_at=new Date(Date.now()+24*60*60*1000).toISOString();
    const {error}=await supabaseClient.from("stories").insert({user_id:currentUser.id,image_url,expires_at});if(error)throw error;
    $("storyImage").value="";toast("스토리를 올렸어요!");await loadStories();
  }catch(err){toast(err.message)}
});
async function loadPosts(){
  const {data:posts,error}=await supabaseClient.from("posts").select("*, profiles(nickname)").order("created_at",{ascending:false}).limit(50);if(error)throw error;
  const ids=posts.map(p=>p.id);let likes=[],comments=[];
  if(ids.length){const [l,c]=await Promise.all([supabaseClient.from("likes").select("post_id,user_id").in("post_id",ids),supabaseClient.from("comments").select("*,profiles(nickname)").in("post_id",ids).order("created_at")]);if(l.error)throw l.error;if(c.error)throw c.error;likes=l.data;comments=c.data}
  $("postsList").innerHTML=posts.length?posts.map(p=>{
    const postLikes=likes.filter(l=>l.post_id===p.id),postComments=comments.filter(c=>c.post_id===p.id),liked=postLikes.some(l=>l.user_id===currentUser.id);
    return `<article class="post-card"><div class="post-head"><div class="mini-avatar">${escapeHtml((p.profiles?.nickname||"2").slice(0,1))}</div><div><div class="post-author">${escapeHtml(p.profiles?.nickname||"2반 친구")}</div><div class="post-date">${dateText(p.created_at)}</div></div></div>${p.image_url?`<img class="post-image" src="${escapeHtml(p.image_url)}" alt="게시물 사진" loading="lazy">`:""}${p.caption?`<div class="post-caption">${escapeHtml(p.caption)}</div>`:""}<div class="post-actions"><button class="like-btn ${liked?"liked":""}" data-like="${p.id}">${liked?"♥ 좋아요 취소":"♡ 좋아요"} · ${postLikes.length}</button></div><div class="comments"><div class="comment-list">${postComments.map(c=>`<div><b>${escapeHtml(c.profiles?.nickname||"친구")}</b> ${escapeHtml(c.content)}</div>`).join("")}</div><form class="comment-form" data-comment="${p.id}"><input name="content" maxlength="300" placeholder="댓글을 남겨 보세요" required><button class="secondary">댓글</button></form></div></article>`;
  }).join(""):"<div class='panel muted'>아직 게시물이 없어요. 첫 게시물을 올려 보세요!</div>";
  document.querySelectorAll("[data-like]").forEach(b=>b.addEventListener("click",()=>toggleLike(b.dataset.like)));
  document.querySelectorAll("[data-comment]").forEach(f=>f.addEventListener("submit",addComment));
}
async function toggleLike(postId){
  const {data,error}=await supabaseClient.from("likes").select("id").eq("post_id",postId).eq("user_id",currentUser.id).maybeSingle();if(error){toast(error.message);return}
  const result=data?await supabaseClient.from("likes").delete().eq("id",data.id):await supabaseClient.from("likes").insert({post_id:postId,user_id:currentUser.id});
  if(result.error)toast(result.error.message);else loadPosts();
}
async function addComment(e){e.preventDefault();const form=e.currentTarget,content=new FormData(form).get("content").toString().trim();if(!content)return;const {error}=await supabaseClient.from("comments").insert({post_id:form.dataset.comment,user_id:currentUser.id,content});if(error)toast(error.message);else loadPosts()}
async function loadStories(){
  const {data,error}=await supabaseClient.from("stories").select("*,profiles(nickname)").gt("expires_at",new Date().toISOString()).order("created_at",{ascending:false}).limit(30);if(error)throw error;
  $("storiesList").innerHTML=data.length?data.map(s=>`<div class="story-item"><a href="${escapeHtml(s.image_url)}" target="_blank" rel="noopener"><img src="${escapeHtml(s.image_url)}" alt="스토리"></a><div>${escapeHtml(s.profiles?.nickname||"친구")}</div></div>`).join(""):"<span class='hint'>아직 스토리가 없어요.</span>";
}
$("boardForm").addEventListener("submit",async e=>{
  e.preventDefault();message("boardMessage","등록 중...");
  const row={user_id:currentUser.id,category:$("boardCategory").value,title:$("boardTitle").value.trim(),content:$("boardContent").value.trim(),due_date:$("boardDate").value||null};
  try{const {error}=await supabaseClient.from("class_board").insert(row);if(error)throw error;$("boardTitle").value="";$("boardContent").value="";$("boardDate").value="";message("boardMessage","등록했어요!");await loadBoard()}catch(err){message("boardMessage",err.message)}
});
async function loadBoard(){
  const {data,error}=await supabaseClient.from("class_board").select("*,profiles(nickname)").order("created_at",{ascending:false}).limit(100);if(error)throw error;
  $("boardList").innerHTML=data.length?data.map(b=>`<article class="board-card"><div class="board-meta"><span class="category">${escapeHtml(b.category)}</span><span>${escapeHtml(b.profiles?.nickname||"친구")}</span><span>${dateText(b.created_at)}</span></div><h3>${escapeHtml(b.title)}</h3><p>${escapeHtml(b.content)}</p>${b.due_date?`<div class="board-date">날짜: ${escapeHtml(b.due_date)}</div>`:""}</article>`).join(""):"<div class='panel muted'>게시판 글이 아직 없어요.</div>";
}
$("profileForm").addEventListener("submit",async e=>{
  e.preventDefault();const nickname=$("profileNickname").value.trim();if(!nickname)return;
  const {error}=await supabaseClient.from("profiles").update({nickname}).eq("id",currentUser.id);
  if(error)message("profileMessage",error.message);else{message("profileMessage","프로필을 저장했어요!");myProfile=await getProfile(currentUser.id);$("welcomeText").textContent="안녕하세요, "+nickname+"님!";$("myAvatar").textContent=nickname.slice(0,1);await loadPosts()}
});
async function loadAll(){await Promise.all([loadPosts(),loadStories(),loadBoard()])}

supabaseClient.auth.onAuthStateChange(()=>{setTimeout(refreshAuth,0)});
(async()=>{
  if(SUPABASE_URL.includes("YOUR_PROJECT_ID")||SUPABASE_PUBLISHABLE_KEY.includes("YOUR_")){
    $("authPanel").classList.remove("hidden");
    message("authMessage","app.js에 Supabase URL과 Publishable key를 먼저 입력해 주세요.");
  }else await refreshAuth();
})();
