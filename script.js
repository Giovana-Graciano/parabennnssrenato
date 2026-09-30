const $=s=>document.querySelector(s);
const intro=$("#intro"),site=$("#site"),startBtn=$("#startBtn"),grid=$("#cardsGrid"),modal=$("#modal"),cardWindow=$("#cardWindow"),cardContent=$("#cardContent"),closeCard=$("#closeCard"),musicBar=$("#musicBar"),musicName=$("#musicName"),musicPause=$("#musicPause"),playlistContent=$("#playlistContent");
let cards=[];
let audio=null;
let currentTrackIndex=0;
let currentCard=null;
let opened=new Set();
let specialCard={id:"final",nome:"GIOVANA",titulo:"THE LOVE FILE",icon:"💚",tipoDeAnimacao:"secret",mensagem:"Você chegou até o final. Este site inteiro foi feito para você, Renato — por todos os amigos que deixaram uma memória aqui e por quem transformou tudo isso em uma pequena cápsula do tempo. Feliz aniversário.",assinatura:"Com amor, Giovana ♥",musica:"",musicaNome:""};
async function loadLoveFile(){try{const r=await fetch("love-file.json?v=1",{cache:"no-store"});if(r.ok){const x=await r.json();specialCard={...specialCard,...x};}}catch(e){}}
let musicLibrary=[];
async function loadMusicLibrary(){try{const r=await fetch("music-library.json?v=1",{cache:"no-store"});if(r.ok){const x=await r.json();musicLibrary=Array.isArray(x.tracks)?x.tracks:[];}}catch(e){musicLibrary=[];}}
async function loadCards(){await Promise.all([loadLoveFile(),loadMusicLibrary()]);try{const r=await fetch("cards.json?v=1",{cache:"no-store"});cards=r.ok?(await r.json()):[];if(!Array.isArray(cards))cards=[];}catch(e){cards=[];}renderCards();renderPlaylist();window.__renatinhoLoadedCards=cards.map(c=>c.id);window.dispatchEvent(new CustomEvent("renatinho:cards-loaded"));if(window.__refreshPhotoBooth)window.__refreshPhotoBooth();updateFinal();}

function esc(v){return String(v??"").replace(/[&<>"']/g,m=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[m]))}


function safeAudioSource(url){
  try{return new URL(String(url||""),document.baseURI).href}catch(e){return ""}
}

function normalizeSpotify(raw){
  const value=String(raw||"").trim();
  if(!value) return "";
  const clean=value.split("#")[0].split("?")[0];
  const uri=clean.match(/^spotify:(track|album|playlist|episode):([A-Za-z0-9]+)$/i);
  if(uri) return `spotify:${uri[1]}:${uri[2]}`;
  const m=clean.match(/open\.spotify\.com\/(?:intl-[a-z]{2}\/)?(track|album|playlist|episode)\/([A-Za-z0-9]+)/i);
  return m ? `spotify:${m[1]}:${m[2]}` : "";
}

function renderCards(){
  grid.innerHTML=cards.map(c=>`
    <article class="memory-card card-${esc(c.tipoDeAnimacao)}" data-id="${esc(c.id)}">
      <div class="shine"></div><div class="corner">NEW!!!</div>
      <div class="icon">${esc(c.icon||"★")}</div>
      <h4>${esc(c.titulo||"MEMORY CARD")}</h4>
      <p>${esc(c.hint||"CLICK TO OPEN")}</p>
      <div class="open-label">▶ OPEN CARD ◀</div>
    </article>`).join("");
  grid.querySelectorAll(".memory-card").forEach(el=>el.addEventListener("click",()=>openCard(el.dataset.id)));
}
function renderPlaylist(){
  const tracks=cards.filter(c=>c.musica);
  if(!tracks.length)return;
  playlistContent.innerHTML=`<div class="playlist-disc">💿</div><div class="playlist-info"><b id="trackTitle">BIRTHDAY MIX</b><p id="trackMeta">Escolha uma faixa para controlar a trilha sonora.</p></div><div class="playlist-controls"><button id="prevTrack">◀◀</button><button id="playTrack">▶ PLAY</button><button id="nextTrack">▶▶</button></div>`;
  window.__tracks=tracks;
  $("#prevTrack")?.addEventListener("click",()=>cycleTrack(-1));
  $("#nextTrack")?.addEventListener("click",()=>cycleTrack(1));
  $("#playTrack")?.addEventListener("click",()=>{if(window.__tracks?.length){openCard(window.__tracks[currentTrackIndex%window.__tracks.length].id)}});
}
function initAudio(){
  try{
    const C=window.AudioContext||window.webkitAudioContext;
    if(!C)return;
    if(!window._ctx)window._ctx=new C();
    if(window._ctx.state==="suspended")window._ctx.resume();
  }catch(e){}
}
function tone(freq=440,d=.05){
  try{
    initAudio();const ctx=window._ctx;if(!ctx)return;
    const o=ctx.createOscillator(),g=ctx.createGain();o.type="square";o.frequency.value=freq;o.connect(g);g.connect(ctx.destination);
    g.gain.setValueAtTime(.035,ctx.currentTime);g.gain.exponentialRampToValueAtTime(.0001,ctx.currentTime+d);o.start();o.stop(ctx.currentTime+d);
  }catch(e){}
}
function parseSpotifyRef(value){
  const raw=String(value||"").trim();
  if(!raw)return null;
  try{
    if(/^spotify:(track|album|playlist|episode|show):[A-Za-z0-9]+$/i.test(raw)){
      const m=raw.match(/^spotify:(track|album|playlist|episode|show):([A-Za-z0-9]+)$/i);
      return {type:m[1].toLowerCase(),id:m[2]};
    }
    const u=new URL(raw);
    if(!/(^|\.)spotify\.com$/i.test(u.hostname))return null;
    const m=u.pathname.match(/\/(track|album|playlist|episode|show)\/([A-Za-z0-9]+)(?:\/)?$/i);
    return m?{type:m[1].toLowerCase(),id:m[2]}:null;
  }catch(e){return null}
}
function startMusic(c){
  stopMusic();
  const m=c.music||c.cardConfig?.musica||{};
  const declared=m.type||"";
  const spotifyUrl=c.spotify?.enabled?c.spotify.url:(declared==="spotify"?m.url:c.musica);
  if(declared==="spotify"||c.spotify?.enabled||parseSpotifyRef(spotifyUrl)){
    const ref=parseSpotifyRef(spotifyUrl);if(!ref){musicName.textContent="♫ LINK SPOTIFY INVÁLIDO";musicBar.classList.remove("hidden");musicPause.textContent="▶";return;}
    musicName.textContent=`♫ ${c.musicaNome||"SPOTIFY"}`;musicBar.classList.remove("hidden");const iframe=document.createElement("iframe");iframe.id="externalMusic";iframe.src=`https://open.spotify.com/embed/${ref.type}/${ref.id}?utm_source=generator&autoplay=0`;iframe.allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture";iframe.loading="eager";iframe.referrerPolicy="strict-origin-when-cross-origin";iframe.className="spotify-player";cardWindow.appendChild(iframe);musicPause.textContent="▶ SPOTIFY";return;
  }
  const siteId=m.id||(declared==="site"?m.id:(typeof c.musica==="string"&&!/^data:audio\//i.test(c.musica)?c.musica:""));const track=musicLibrary.find(t=>t.id===siteId);if(!track)return;
  musicName.textContent=`♫ ${c.musicaNome||track.name}`;musicBar.classList.remove("hidden");audio=new Audio(track.src);audio.loop=true;audio.preload="auto";audio.addEventListener("error",()=>{musicPause.textContent="▶";musicName.textContent=`♫ ${c.musicaNome||"AUDIO NÃO DISPONÍVEL"}`});audio.load();audio.play().catch(()=>{});musicPause.textContent="❚❚";
}
function stopMusic(){
  if(audio){audio.pause();audio.currentTime=0;audio=null}
  document.querySelector("#externalMusic")?.remove();
  musicBar.classList.add("hidden");
}
function openCard(id){
  const c=cards.find(x=>x.id===id); if(!c)return;
  currentCard=c;
  currentTrackIndex=Math.max(0,cards.findIndex(x=>x.id===id));
  opened.add(id); saveOpened();
  initAudio(); tone(520,.04); setTimeout(()=>tone(780,.07),35);
  startMusic(c);

  const cfg=c.cardConfig||{};
  const theme=cfg.theme||"y2k";
  const themes={
    y2k:{bg:"linear-gradient(135deg,#fff8ff 0%,#d8f3ff 28%,#ffd7eb 65%,#fff5a6 100%)",accent:"#c90068",stamp:"★ Y2K MEMORY ★"},
    fluminense:{bg:"linear-gradient(135deg,#f7fff9 0%,#d6f2df 34%,#f4c8d1 68%,#0c6b3b 100%)",accent:"#0b7040",stamp:"★ TRICOLOR MODE ★"},
    dino:{bg:"linear-gradient(135deg,#f0ffd9 0%,#bfe89c 38%,#fff0a8 72%,#d7f6b7 100%)",accent:"#3d6d19",stamp:"★ DINO ZONE ★"},
    pirate:{bg:"linear-gradient(135deg,#fff4bd 0%,#e3c37c 40%,#a87945 72%,#50351f 100%)",accent:"#6d3e14",stamp:"★ PIRATE MAIL ★"},
    music:{bg:"linear-gradient(135deg,#f5e8ff 0%,#bceaff 34%,#ffd6ef 68%,#e8d7ff 100%)",accent:"#7b2ba8",stamp:"★ MUSIC MODE ★"},
    books:{bg:"linear-gradient(135deg,#fff8e8 0%,#eadbc0 40%,#d1b78f 72%,#fff0cf 100%)",accent:"#79521e",stamp:"★ BOOKWORM FILE ★"}
  };
  const t=themes[theme]||themes.y2k;
  const emojis=Array.isArray(cfg.emojis)?cfg.emojis.filter(Boolean):[];
  const font=cfg.font||"inherit";
  /* Selected card font override */
  const textColor=cfg.textColor||"#111";
  const photoStyle=cfg.photoStyle||"classic";

  const emojiHTML=emojis.map((e,i)=>`<span class="v33-emoji v33-e${i%10}" aria-hidden="true">${esc(e)}</span>`).join("");
  const photosHTML=Array.isArray(c.fotos)&&c.fotos.length?`
    <div class="v33-photo-wall ${esc(photoStyle)}">
      ${c.fotos.map((f,i)=>`<div class="v33-photo v33-p${i%4}">
        <img src="${esc(f.data||f)}" alt="Foto da memória">
        ${photoStyle==="polaroid"?`<small>${esc(c.nome||"MEMORY")}</small>`:""}
      </div>`).join("")}
    </div>`:"";

  cardWindow.className=`card-window anim-${c.tipoDeAnimacao||"secret"} opening`;
  $("#modalFile").textContent=`${String(c.id).toUpperCase()}.EXE`;
  cardContent.style.color=textColor;
  cardContent.style.fontFamily=font;

  cardContent.innerHTML=`
    <div class="v33-card" style="--v33-bg:${t.bg};--v33-accent:${t.accent};--v33-text:${esc(textColor)};--card-font:${esc(font)};font-family:${esc(font)}">
      <div class="v33-scanlines"></div>
      <div class="v33-emoji-layer">${emojiHTML}</div>

      <div class="v33-topbar">
        <span>${esc(t.stamp)}</span><span>FRIEND CARD.EXE</span><span>${esc(String(theme).toUpperCase())}</span>
      </div>

      <div class="v33-header">
        <div class="v33-icon">${esc(c.icon||"★")}</div>
        <div class="v33-title-block">
          <div class="v33-classified">★ CLASSIFIED FRIEND MESSAGE ★</div>
          <h3>${esc(c.titulo||"FELIZ ANIVERSÁRIO")}</h3>
          <div class="v33-from">DE: ${esc(c.nome||"UM AMIGO")}</div>
        </div>
        <div class="v33-sticker">${esc(t.stamp)}</div>
      </div>

      <div class="v33-message" style="color:${esc(textColor)};font-family:${esc(font)}">
        <div class="v34-message-label">★ ${esc(String(c.nome||"FRIEND").toUpperCase())}'S MESSAGE ★</div>
        <div class="v34-message-text">${esc(c.mensagem||"Feliz aniversário, Renato!").replace(/\n/g,"<br>")}</div>
      </div>

      ${photosHTML}
      <div class="v34-theme-stickers" aria-hidden="true">
        ${theme==="pirate" ? '<span>☠</span><span>★</span><span>AHOY!</span>' :
          theme==="fluminense" ? '<span>★</span><span>TRI</span><span>♥</span>' :
          theme==="dino" ? '<span>★</span><span>RAWR!</span><span>☘</span>' :
          theme==="music" ? '<span>♪</span><span>★</span><span>♫</span>' :
          theme==="books" ? '<span>★</span><span>READ!</span><span>✎</span>' :
          '<span>★</span><span>Y2K!</span><span>♥</span>'}
      </div>

      <div class="v33-footer">
        <span>♥ MEMORY SAVED</span><span>2004 // FRIENDS.NET</span>
        <span>★ ${esc(String(c.nome||"FRIEND").toUpperCase())} ★</span>
      </div>
    </div>`;

  modal.classList.remove("hidden");
  modal.setAttribute("aria-hidden","false");
  document.body.style.overflow="hidden";
}

function close(){
  stopMusic();modal.classList.add("hidden");modal.setAttribute("aria-hidden","true");document.body.style.overflow="";
}
startBtn.addEventListener("click",()=>{tone(320,.05);setTimeout(()=>tone(520,.09),55);intro.classList.add("intro-exit");setTimeout(()=>{intro.classList.add("hidden");site.classList.remove("hidden");window.scrollTo(0,0)},550)});
closeCard.addEventListener("click",close);
$("#finalBtn")?.addEventListener("click",openFinal);
modal.addEventListener("click",e=>{if(e.target.classList.contains("modal-backdrop"))close()});
musicPause.addEventListener("click",()=>{if(audio){if(audio.paused){audio.play();musicPause.textContent="❚❚"}else{audio.pause();musicPause.textContent="▶"}}else{const frame=document.querySelector("#externalMusic");if(frame){frame.scrollIntoView({behavior:"smooth",block:"center"});}}});
document.querySelectorAll(".nav-btn").forEach(b=>b.addEventListener("click",()=>document.getElementById(b.dataset.scroll)?.scrollIntoView({behavior:"smooth"}) ));
if(!window.matchMedia?.("(hover: none), (pointer: coarse)").matches) document.addEventListener("pointermove",e=>{const s=document.createElement("span");s.textContent=["✦","·","★","✧"][Math.floor(Math.random()*4)];s.style.cssText=`position:fixed;left:${e.clientX}px;top:${e.clientY}px;color:#ffe04a;pointer-events:none;z-index:9998;font-weight:bold;animation:cursorFade .5s forwards`;document.body.appendChild(s);setTimeout(()=>s.remove(),500)});
const style=document.createElement("style");style.textContent="@keyframes cursorFade{to{transform:translateY(-15px) scale(.2);opacity:0}}.intro-exit{animation:introExit .55s forwards}@keyframes introExit{to{transform:scale(1.04);filter:brightness(2);opacity:0}}";document.head.appendChild(style);
loadOpened();

function updateFinal(){
  const total=cards.length;
  const count=opened.size;
  const status=$("#finalStatus");
  const btn=$("#finalBtn");
  if(status) status.innerHTML=`MEMORY FILES OPENED: <b>${Math.min(count,total)} / ${total}</b>`;
  if(btn){
    btn.disabled=false;
    btn.textContent="♥ OPEN THE LOVE FILE ♥";
    btn.classList.add("ready");
  }
}
function loadOpened(){
  try{opened=new Set(JSON.parse(localStorage.getItem("renatinho-opened-v9")||"[]"))}catch(e){opened=new Set()}
}
function saveOpened(){localStorage.setItem("renatinho-opened-v9",JSON.stringify([...opened]));updateFinal()}
function openFinal(){
  tone(260,.08);setTimeout(()=>tone(520,.08),80);setTimeout(()=>tone(880,.12),160);
  const love=document.querySelector("#love-file");
  if(love){
    love.classList.remove("hidden");
    love.scrollIntoView({behavior:"smooth",block:"start"});
  }
}

loadCards();
updateFinal();

function cycleTrack(dir){
  const tracks=window.__tracks||[];if(!tracks.length)return;
  currentTrackIndex=(currentTrackIndex+dir+tracks.length)%tracks.length;
  const c=tracks[currentTrackIndex];
  $("#trackTitle").textContent=`♫ ${c.nome}`;
  $("#trackMeta").textContent=c.musicaNome||"TRACK";
  startMusic(c);
  tone(dir>0?660:420,.07);
}

/* V14 FINAL RETRO MODULES */
(function(){
  const q=s=>document.querySelector(s);
  const toast=(title,msg)=>{const x=document.createElement('div');x.className='secret-toast';x.innerHTML='<b>'+title+'</b><br><br>'+msg;document.body.appendChild(x);setTimeout(()=>x.remove(),2600)};
  const esc2=v=>String(v??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));

  /* Friends Photo Booth: uses the photos already attached to published cards. */
  let photos=[], photoIndex=0, photoTimer=null;
  function collectPhotos(){
    photos=[];
    cards.forEach(c=>(c.fotos||[]).forEach(f=>photos.push({src:f.data||f,nome:c.nome||'AMIGO',titulo:c.titulo||'MEMORY'})));
    renderPhoto();
  }
  function renderPhoto(){
    const img=q('#photoSlide'), empty=q('#photoSlideEmpty'), cap=q('#photoCaption');
    if(!img||!empty||!cap)return;
    if(!photos.length){img.hidden=true;empty.hidden=false;cap.textContent='As fotos dos cartões aparecerão aqui.';return}
    const p=photos[photoIndex%photos.length];img.src=p.src;img.hidden=false;empty.hidden=true;cap.textContent='★ '+p.nome+' — '+p.titulo+' ★';
  }
  function movePhoto(dir){if(!photos.length)return;photoIndex=(photoIndex+dir+photos.length)%photos.length;renderPhoto();tone(dir>0?760:460,.05)}
  function togglePhotoShow(){
    if(photoTimer){clearInterval(photoTimer);photoTimer=null;q('#photoPlay').textContent='▶ SLIDESHOW';return}
    if(!photos.length){toast('📸 PHOTO BOOTH','Ainda não existem fotos nos cartões publicados.');return}
    q('#photoPlay').textContent='❚❚ STOP';photoTimer=setInterval(()=>movePhoto(1),2800);
  }
  q('#photoPrev')?.addEventListener('click',()=>movePhoto(-1));
  q('#photoNext')?.addEventListener('click',()=>movePhoto(1));
  q('#photoPlay')?.addEventListener('click',togglePhotoShow);
  const originalRenderCards=window.renderCards;
  /* renderCards is lexical in the main script, so refresh the booth after the cards load below. */
  window.__refreshPhotoBooth=collectPhotos;
  collectPhotos();
  window.addEventListener('renatinho:cards-loaded',collectPhotos);

  /* Save a small, real archive snapshot to a .FLP file. */
  q('#saveFloppy')?.addEventListener('click',()=>{
    const payload={savedAt:new Date().toISOString(),site:'Renatinho Birthday Y2K Memory',cards:cards.map(c=>({id:c.id,nome:c.nome,titulo:c.titulo,musicaNome:c.musicaNome,photos:(c.fotos||[]).length}))};
    const blob=new Blob([JSON.stringify(payload,null,2)],{type:'application/json'});const a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download='RENATINHO_MEMORY.FLP';a.click();q('#floppyStatus').textContent='MEMORY SAVED ✓';toast('💾 FLOPPY SAVED','A snapshot das memórias foi salvo.');
  });

  /* Time Capsule = a downloadable snapshot of the birthday site at this moment. */
  function updateCapsule(){
    const photoCount=cards.reduce((n,c)=>n+(c.fotos||[]).length,0),musicCount=cards.filter(c=>c.musica).length;
    const stats=q('#capsuleStats');if(stats)stats.innerHTML=`CARDS: <b>${cards.length}</b><br>PHOTOS: <b>${photoCount}</b><br>MUSIC TRACKS: <b>${musicCount}</b><br>STATUS: <b>READY TO BE SEALED</b>`;
  }
  updateCapsule();setTimeout(updateCapsule,700);
  q('#sealCapsule')?.addEventListener('click',()=>{
    const stamp=new Date();const snapshot={sealedAt:stamp.toISOString(),label:'RENATINHO TIME CAPSULE',cards:cards.map(c=>({id:c.id,nome:c.nome,titulo:c.titulo,musicaNome:c.musicaNome,photos:(c.fotos||[]).length})),note:'This is a snapshot of the published birthday memories at the moment the capsule was sealed.'};
    localStorage.setItem('renatinho-time-capsule',JSON.stringify(snapshot));
    const blob=new Blob([JSON.stringify(snapshot,null,2)],{type:'application/json'});const a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download='RENATINHO_TIME_CAPSULE.json';a.click();
    const box=q('#capsuleContent');box.classList.remove('hidden');box.innerHTML='<b>📦 CAPSULE SEALED</b><br><br>Snapshot created on '+stamp.toLocaleString('pt-BR')+'<br>It contains '+cards.length+' cards, '+cards.reduce((n,c)=>n+(c.fotos||[]).length,0)+' photos and '+cards.filter(c=>c.musica).length+' music tracks.';q('#sealCapsule').textContent='📦 CAPSULE SEALED';tone(360,.08);setTimeout(()=>tone(720,.12),100);
  });

  /* Renatinho's posterity message remains his personal local letter. */
  q('#saveFuture')?.addEventListener('click',()=>{const v=q('#futureMessage')?.value.trim();if(!v)return;localStorage.setItem('renatinho-future-message',v);q('#futureStatus').textContent='SEALED ✓';q('#futureMessage').disabled=true;q('#futureMessage').classList.add('future-sealed');q('#saveFuture').textContent='🔒 SEALED';tone(520,.06)});
  const saved=localStorage.getItem('renatinho-future-message');if(saved&&q('#futureMessage')){q('#futureMessage').value=saved;q('#futureMessage').disabled=true;q('#futureMessage').classList.add('future-sealed');q('#futureStatus').textContent='SEALED ✓';q('#saveFuture').textContent='🔒 SEALED'}

  const GUEST_KEY='renatinho-guestbook-v14';
  function guestEntries(){try{return JSON.parse(localStorage.getItem(GUEST_KEY)||'[]')}catch(e){return []}}
  function renderGuestbook(){const root=q('#guestEntries');if(!root)return;const entries=guestEntries();root.innerHTML='<div class=\"guest-entry\"><b>★ INTERNET EXPLORER</b><p>Esta página contém muitas memórias.</p><small>posted from Windows XP • 56k connection</small></div>'+entries.map(x=>'<div class=\"guest-entry\"><b>★ '+esc2(x.name)+'</b><p>'+esc2(x.message).replace(/\n/g,'<br>')+'</p><small>'+new Date(x.createdAt).toLocaleString('pt-BR')+'</small></div>').join('')}
  renderGuestbook();
  q('#guestForm')?.addEventListener('submit',e=>{e.preventDefault();const n=q('#guestName')?.value.trim(),m=q('#guestMsg')?.value.trim();if(!n||!m)return;const entries=guestEntries();entries.unshift({name:n,message:m,createdAt:new Date().toISOString()});localStorage.setItem(GUEST_KEY,JSON.stringify(entries.slice(0,100)));q('#guestName').value='';q('#guestMsg').value='';renderGuestbook();tone(700,.05);toast('✎ GUESTBOOK UPDATED','Recado salvo neste navegador.')});

  /* Easter eggs. */
  let dinoClicks=0;document.querySelector('.floating-emojis')?.addEventListener('click',e=>{if(e.target.textContent.includes('🦖')){dinoClicks++;if(dinoClicks>=3){toast('🦖 SECRET DINO MODE','RAWRSOME! You found a hidden memory.');dinoClicks=0}}});
  let avatarClicks=0;q('#renatinhoAvatar')?.addEventListener('click',()=>{avatarClicks++;if(avatarClicks>=5){toast('💚 RENATINHO.EXE','CHEAT CODE ACTIVATED: BIRTHDAY GOD MODE');avatarClicks=0}});
})();
