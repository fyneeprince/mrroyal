(() => {
  const $ = (s, p = document) => p.querySelector(s);
  const $$ = (s, p = document) => [...p.querySelectorAll(s)];
  const clamp = (n, a = 0, b = 1) => Math.min(b, Math.max(a, n));
  const lerp = (a,b,t) => a + (b-a)*t;

  window.addEventListener('load', () => setTimeout(() => $('.loader')?.classList.add('done'), 550));

  // Cursor
  const cursor = $('.cursor');
  if (cursor && matchMedia('(pointer:fine)').matches) {
    window.addEventListener('pointermove', e => { cursor.style.left = e.clientX+'px'; cursor.style.top = e.clientY+'px'; });
    $$('a,button,.piece-image,.space-card').forEach(el => {
      el.addEventListener('mouseenter', () => cursor.classList.add('hover'));
      el.addEventListener('mouseleave', () => cursor.classList.remove('hover'));
    });
  }

  // Nav state
  const nav = $('#site-nav');
  const navUpdate = () => nav?.classList.toggle('scrolled', scrollY > 40);
  addEventListener('scroll', navUpdate, {passive:true}); navUpdate();

  // Small parallax on hero image
  const heroImg = $('.hero-media img');
  let ticking = false;
  const visualUpdate = () => {
    ticking = false;
    const y = scrollY;
    if (heroImg) heroImg.style.transform = `translate3d(0,${Math.min(y*.12,100)}px,0) scale(${1 + Math.min(y/8000,.035)})`;
    updateSpaces();
  };
  addEventListener('scroll', () => { if(!ticking){requestAnimationFrame(visualUpdate); ticking=true;} }, {passive:true});

  // Mobile menu: intentionally lightweight overlay built from the existing nav links.
  const menu = $('.menu-toggle');
  menu?.addEventListener('click', () => {
    const open = document.body.classList.toggle('menu-open');
    if (open) {
      nav.insertAdjacentHTML('beforeend', '<div class="mobile-menu">'+$('.nav-links').innerHTML+'</div>');
      const panel = $('.mobile-menu');
      Object.assign(panel.style,{position:'fixed',top:'72px',left:'0',right:'0',padding:'28px 20px',background:'var(--dark-brown)',borderTop:'1px solid rgba(255,255,255,.12)',display:'grid',gap:'20px',zIndex:'101',color:'var(--cream)'});
      $$('.mobile-menu a').forEach(a=>{a.style.fontSize='11px';a.style.letterSpacing='.15em';a.style.textTransform='uppercase';a.addEventListener('click',()=>{document.body.classList.remove('menu-open');panel.remove()})});
    } else $('.mobile-menu')?.remove();
  });

  // VERSION 006 — Scroll-controlled MP4 wardrobe reveal.
  // The supplied 1280x720 MP4 replaces the 240-image JPG sequence.
  // The video is muted because scrolling controls its timeline directly.
  const wardrobeVideo = document.getElementById('hero-wardrobe-video');
  const heroSequence = document.querySelector('.hero-sequence-section');
  const sequenceLoading = document.getElementById('hero-sequence-loading');
  const sequenceStatus = document.getElementById('hero-sequence-status');
  const sequenceProgressBar = document.querySelector('.hero-sequence-progress span');

  let sequenceTarget = 0;
  let sequenceCurrent = 0;
  let sequenceRaf = 0;
  let videoReady = false;
  let lastVideoTime = -1;

  function sequenceProgress() {
    if (!heroSequence) return 0;
    const r = heroSequence.getBoundingClientRect();
    const travel = Math.max(1, heroSequence.offsetHeight - innerHeight);
    return clamp(-r.top / travel);
  }

  function drawVideoAtProgress(p) {
    if (!wardrobeVideo || !videoReady || !Number.isFinite(wardrobeVideo.duration)) return;
    const duration = wardrobeVideo.duration;
    const t = clamp(p) * Math.max(0, duration - 0.001);
    if (Math.abs(t - lastVideoTime) > 0.001) {
      wardrobeVideo.currentTime = t;
      lastVideoTime = t;
    }

    const pct = Math.round(clamp(p) * 100);
    if (sequenceStatus) {
      sequenceStatus.textContent = pct < 100 ? 'SCROLL / EXPLORE' : 'SCROLL / REPLAY';
    }
    if (sequenceProgressBar) sequenceProgressBar.style.width = pct + '%';
    if (sequenceLoading) {
      sequenceLoading.innerHTML = pct < 100
        ? `VIDEO <b>${String(pct).padStart(2,'0')}</b>%`
        : 'VIDEO <b>100</b>%';
    }
  }

  function renderSequence() {
    sequenceRaf = 0;
    sequenceCurrent += (sequenceTarget - sequenceCurrent) * 0.22;

    if (Math.abs(sequenceTarget - sequenceCurrent) < 0.00025) {
      sequenceCurrent = sequenceTarget;
    }

    drawVideoAtProgress(sequenceCurrent);

    if (Math.abs(sequenceTarget - sequenceCurrent) > 0.00025) {
      sequenceRaf = requestAnimationFrame(renderSequence);
    }
  }

  function updateHeroSequence() {
    sequenceTarget = sequenceProgress();
    if (!sequenceRaf) sequenceRaf = requestAnimationFrame(renderSequence);
  }

  if (wardrobeVideo && heroSequence) {
    heroSequence.style.minHeight = '320vh';

    wardrobeVideo.muted = true;
    wardrobeVideo.defaultMuted = true;
    wardrobeVideo.playsInline = true;
    wardrobeVideo.preload = 'auto';

    const markReady = () => {
      if (!Number.isFinite(wardrobeVideo.duration) || wardrobeVideo.duration <= 0) return;
      videoReady = true;
      sequenceLoading?.classList.add('loaded');
      drawVideoAtProgress(sequenceProgress());
    };

    wardrobeVideo.addEventListener('loadedmetadata', markReady, {once:false});
    wardrobeVideo.addEventListener('canplay', markReady, {once:false});
    wardrobeVideo.addEventListener('error', () => {
      if (sequenceLoading) sequenceLoading.textContent = 'VIDEO / LOAD ERROR';
    });

    // Prime the first frame without autoplaying.
    wardrobeVideo.load();

    addEventListener('scroll', updateHeroSequence, {passive:true});
    addEventListener('resize', updateHeroSequence);
    sequenceTarget = sequenceProgress();
    sequenceCurrent = sequenceTarget;

    if (wardrobeVideo.readyState >= 1) markReady();
    requestAnimationFrame(() => drawVideoAtProgress(sequenceCurrent));
  }

  // Horizontal room section controlled by vertical scroll.
  const spaces=$('.spaces'), track=$('#spaces-track'), cards=$$('.space-card',track);
  function updateSpaces(){
    if(!spaces||!track) return;
    const r=spaces.getBoundingClientRect();
    const max=Math.max(1,spaces.offsetHeight-innerHeight);
    const p=clamp(-r.top/max);
    const x=-(cards.length-1)*innerWidth*p;
    track.style.transform=`translate3d(${x}px,0,0)`;
    $('#space-bar').style.width=(25+75*p)+'%';
    const n=Math.min(cards.length,Math.floor(p*cards.length)+1);
    $('#space-count').textContent=String(n).padStart(2,'0')+' / '+String(cards.length).padStart(2,'0');
  }
  addEventListener('resize',()=>{updateCraft();updateSpaces()});

  // Sofa builder
  const builder = $('.builder');
  const state={material:'velvet',colour:'sand',shape:'three'};
  const palette={sand:'#d5c7b5',cocoa:'#4b3427',charcoal:'#262629',olive:'#505648'};
  const basePrice={velvet:1850000,linen:1720000,leather:2350000};
  const shapeMult={three:1,lshape:1.28,lounger:1.16};
  function money(n){return '₦'+Math.round(n).toLocaleString('en-NG')}
  function renderBuilder(){
    const sofa=$('#preview-sofa');
    sofa?.style.setProperty('--sofa',palette[state.colour]);
    if(state.material==='leather') sofa?.style.setProperty('filter','drop-shadow(0 20px 24px rgba(0,0,0,.42)) saturate(.8)');
    else sofa?.style.removeProperty('filter');
    sofa?.classList.toggle('lshape',state.shape==='lshape'); sofa?.classList.toggle('lounger',state.shape==='lounger');
    const price=basePrice[state.material]*shapeMult[state.shape];
    $('#builder-price').textContent=money(price);
    $('#preview-state').textContent=`${state.material.toUpperCase()} / ${state.colour.toUpperCase()} / ${state.shape==='three'?'3-SEATER':state.shape==='lshape'?'L-SHAPE':'LOUNGER'}`;
  }
  $$('.control').forEach(control=>{
    control.querySelectorAll('button').forEach(btn=>btn.addEventListener('click',()=>{
      const wrap=btn.closest('[data-control]'); if(!wrap) return;
      wrap.querySelectorAll('button').forEach(b=>b.classList.remove('active'));btn.classList.add('active');
      state[wrap.dataset.control]=btn.dataset.value;renderBuilder();
    }));
  });
  renderBuilder();

  // Intro reveal for key headings.
  const revealEls=$$('.manifesto-main h2,.section-heading h2,.craft-copy h2,.reveal-word,.builder-head h2,.standard-copy h2,.story-copy h2,.contact-intro h2');
  const observer=new IntersectionObserver(entries=>entries.forEach(e=>{if(e.isIntersecting)e.target.classList.add('is-visible')}),{threshold:.18});
  revealEls.forEach(el=>observer.observe(el));

  // Anchor links: a touch of intentional smoothness without hijacking the browser.
  $$('a[href^="#"]').forEach(a=>a.addEventListener('click',e=>{
    const target=$(a.getAttribute('href')); if(!target) return; e.preventDefault(); target.scrollIntoView({behavior:matchMedia('(prefers-reduced-motion: reduce)').matches?'auto':'smooth'});
  }));

  updateSpaces();
})();
