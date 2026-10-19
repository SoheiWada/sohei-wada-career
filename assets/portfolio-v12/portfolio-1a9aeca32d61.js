(() => {
  'use strict';
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  let paused = reduced.matches;
  const motionButton = document.querySelector('.motion-toggle');
  const motionIcon = motionButton.querySelector('.motion-icon');
  function setMotion(value) {
    paused = value || reduced.matches;
    document.documentElement.classList.toggle('motion-paused', paused);
    motionButton.setAttribute('aria-pressed', String(paused));
    motionButton.setAttribute('aria-label', paused ? '動きを再開する' : '動きを止める');
    motionIcon.textContent = paused ? '▷' : 'Ⅱ';
    scheduleRibbon();
  }
  motionButton.addEventListener('click', () => setMotion(!paused));
  reduced.addEventListener('change', () => setMotion(reduced.matches));

  // Native scrolling, passive listeners and a single frame per update.
  const progress = document.querySelector('.read-progress');
  let scrollFrame = 0;
  function updateProgress() {
    const extent = document.documentElement.scrollHeight - innerHeight;
    progress.style.transform = `scaleX(${extent > 0 ? scrollY / extent : 0})`;
    scrollFrame = 0;
  }
  addEventListener('scroll', () => { if (!scrollFrame) scrollFrame = requestAnimationFrame(updateProgress); }, {passive:true});
  addEventListener('resize', updateProgress, {passive:true});
  updateProgress();

  // Gentle entrances; never hold body copy behind a loader.
  if ('IntersectionObserver' in window) {
    const entrance = new IntersectionObserver(entries => {
      entries.forEach(entry => { if (entry.isIntersecting) { entry.target.classList.add('is-visible'); entrance.unobserve(entry.target); } });
    }, {threshold:0.08,rootMargin:'0px 0px 25px 0px'});
    document.querySelectorAll('.section-heading,.project-intro h3,.story-summary,.minor-heading,.approach h2,.profile-grid h2').forEach(el => {
      el.dataset.enter = '';
      entrance.observe(el);
    });
    document.documentElement.classList.add('enter-ready');
    const navObserver = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          document.querySelectorAll('[data-nav]').forEach(a => a.removeAttribute('aria-current'));
          const link = document.querySelector(`[data-nav="${entry.target.id}"]`);
          if(link) link.setAttribute('aria-current', 'location');
        }
      });
    }, {rootMargin:'-15% 0px -60% 0px',threshold:0});
    ['work','approach','profile'].forEach(id=>navObserver.observe(document.getElementById(id)));
    document.querySelectorAll('.project[id]').forEach(el=>new IntersectionObserver(entries=>{
      if(entries.some(e=>e.isIntersecting)){
        document.querySelectorAll('[data-nav]').forEach(a=>a.removeAttribute('aria-current'));
        document.querySelector('[data-nav="work"]').setAttribute('aria-current','location');
      }
    },{rootMargin:'-15% 0px -60% 0px'}).observe(el));
  }

  const surface = document.querySelector('.systems-surface');
  const before = document.getElementById('flow-before');
  const after = document.getElementById('flow-after');
  const flowDescription = document.getElementById('flow-description');
  const flowButtons = [...document.querySelectorAll('[data-flow]')];
  flowButtons.forEach(button => button.addEventListener('click', () => {
    const mode = button.dataset.flow;
    surface.dataset.mode = mode;
    before.hidden = mode !== 'before';
    after.hidden = mode !== 'after';
    flowButtons.forEach(b => b.setAttribute('aria-pressed',String(b===button)));
    flowDescription.textContent = mode === 'after'
      ? '情報をSalesforceへ集約。期限・タスクの可視化と抽選グループ作成の自動化で、二重入力や確認の手間を減らしました。'
      : '案件ごとに手作業。情報と作業が分散し、入力や確認に時間を使っていました。';
  }));

  // A continuous, depth-tested gold surface. The geometry itself changes shape;
  // highlights follow its normals instead of being painted onto a flat image.
  const canvas = document.getElementById('light-ribbon');
  const hero = document.querySelector('.hero-art');
  const phaseButtons=[...document.querySelectorAll('[data-hero-phase]')];
  const heroCaption=document.querySelector('.art-caption');
  const gl=canvas.getContext('webgl',{alpha:true,antialias:true,powerPreference:'low-power'});
  let ribbonFrame=0, visible=true, lastDraw=0, lastStamp=0, elapsed=12;
  let manualPhase=-1, manualUntil=0, phaseCurrent=-1;
  let px=0,py=0,targetX=0,targetY=0,w=0,h=0;
  let morph=1,scatter=0,goalMorph=1,goalScatter=0;
  let program,meshes=[],attribute=0,locations={};
  const phaseCopy=['一人ひとりの声を、受けとめる。','異なる力を、一つの流れへ。','つながりが、人の可能性をひらく。'];
  const vertexSource=`
    precision highp float;
    attribute vec2 aUV;
    uniform float uMorph,uScatter,uTime,uAspect,uObject;
    uniform vec2 uPointer;
    varying vec3 vNormal,vPosition;
    varying float vT;
    const float PI=3.14159265359;
    vec3 center(float t){
      vec3 ring=vec3(cos(t)*.85,sin(t)*.76,sin(2.0*t)*.09);
      ring+=uScatter*vec3(cos(3.*t)*.13,sin(3.*t)*.10,sin(2.*t+uTime*.2)*.15);
      vec3 loop=vec3(cos(t),sin(2.0*t)*.43,sin(t)*.29);
      return mix(ring,loop,uMorph);
    }
    vec3 rotate(vec3 p){
      float ay=-.3+sin(uTime*.19)*.46+uPointer.x*.35;
      float ax=.30+sin(uTime*.23)*.12+uPointer.y*.24;
      float az=-.26+sin(uTime*.13)*.12;
      p=vec3(p.x*cos(ay)+p.z*sin(ay),p.y,-p.x*sin(ay)+p.z*cos(ay));
      p=vec3(p.x,p.y*cos(ax)-p.z*sin(ax),p.y*sin(ax)+p.z*cos(ax));
      return vec3(p.x*cos(az)-p.y*sin(az),p.x*sin(az)+p.y*cos(az),p.z);
    }
    vec3 surface(float t,float a){
      vec3 c=center(t);
      vec3 tangent=normalize(center(t+.003)-center(t-.003));
      vec3 n=normalize(cross(tangent,vec3(0.,0.,1.)));
      vec3 b=normalize(cross(tangent,n));
      float twist=t*.5+sin(uTime*.3)*.1;
      vec3 nn=n*cos(twist)+b*sin(twist);
      vec3 bb=-n*sin(twist)+b*cos(twist);
      vec3 p=c+nn*cos(a)*.115+bb*sin(a)*.048;
      return p;
    }
    void main(){
      float t=aUV.x*2.*PI;
      float a=aUV.y*2.*PI;
      vec3 p,n;
      if(uObject<.5){
        p=surface(t,a);
        vec3 dt=surface(t+.0015,a)-surface(t-.0015,a);
        vec3 da=surface(t,a+.0015)-surface(t,a-.0015);
        n=normalize(cross(da,dt));
      }else{
        float orbit=(uObject<1.5?2.65:.55)+sin(uTime*.23)*.13;
        vec3 c=center(orbit)*.90+vec3(0.,.40,0.);
        vec3 sphere=vec3(sin(aUV.y*PI)*cos(t),cos(aUV.y*PI),sin(aUV.y*PI)*sin(t));
        p=c+sphere*.062;n=sphere;
      }
      p=rotate(p);n=rotate(n);
      float perspective=3.7/(3.7-p.z);
      float scale=min(1.0,uAspect)*.85;
      gl_Position=vec4(p.x*scale/uAspect*perspective,p.y*scale*perspective,-p.z*.18,1.);
      vNormal=n;vPosition=p;vT=t;
    }`;
  const fragmentSource=`
    precision highp float;
    uniform float uTime,uScatter,uObject;
    varying vec3 vNormal,vPosition;
    varying float vT;
    void main(){
      vec3 N=normalize(vNormal);if(!gl_FrontFacing && uObject<.5)N=-N;
      vec3 V=normalize(vec3(0.,0.,3.7)-vPosition);
      vec3 L=normalize(vec3(-.45,.85,1.2));
      vec3 H=normalize(V+L);
      float diff=max(dot(N,L),0.);
      float fres=pow(1.-max(dot(N,V),0.),3.);
      float spec=pow(max(dot(N,H),0.),48.);
      float stripe=pow(max(0.,sin(N.y*4.1+N.x*2.7+uTime*.16)),12.);
      float secondary=pow(max(dot(reflect(-V,N),normalize(vec3(.8,.2,.7))),0.),18.);
      vec3 gold=mix(vec3(.65,.29,.045),vec3(1.,.76,.25),diff*.73+.22);
      vec3 color=gold*(.66+diff*.40)+vec3(1.,.94,.73)*(spec*.85+stripe*.32+secondary*.25);
      color=mix(color,vec3(1.,.92,.61),fres*.42);
      float occlusion=1.-.10*exp(-length(vPosition.xy)*5.);
      gl_FragColor=vec4(pow(clamp(color*occlusion,0.,1.),vec3(.87)),1.);
    }`;
  function shader(type,source){const s=gl.createShader(type);gl.shaderSource(s,source);gl.compileShader(s);if(!gl.getShaderParameter(s,gl.COMPILE_STATUS))throw Error('shader');return s;}
  function initGL(){
    if(!gl)return false;
    try{
      program=gl.createProgram();gl.attachShader(program,shader(gl.VERTEX_SHADER,vertexSource));gl.attachShader(program,shader(gl.FRAGMENT_SHADER,fragmentSource));gl.linkProgram(program);
      if(!gl.getProgramParameter(program,gl.LINK_STATUS))return false;
      function grid(along,around){
        const data=[],indices=[];
        for(let i=0;i<=along;i++)for(let j=0;j<=around;j++)data.push(i/along,j/around);
        for(let i=0;i<along;i++)for(let j=0;j<around;j++){const k=i*(around+1)+j;indices.push(k,k+1,k+around+1,k+1,k+around+2,k+around+1);}
        const vertices=gl.createBuffer(),elements=gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER,vertices);gl.bufferData(gl.ARRAY_BUFFER,new Float32Array(data),gl.STATIC_DRAW);
        gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER,elements);gl.bufferData(gl.ELEMENT_ARRAY_BUFFER,new Uint16Array(indices),gl.STATIC_DRAW);
        return{vertices,elements,count:indices.length};
      }
      // Small spheres need far fewer vertices than the continuous ribbon.
      meshes=[grid(240,24),grid(32,16)];
      gl.useProgram(program);attribute=gl.getAttribLocation(program,'aUV');gl.enableVertexAttribArray(attribute);
      ['uMorph','uScatter','uTime','uAspect','uObject','uPointer'].forEach(k=>locations[k]=gl.getUniformLocation(program,k));
      gl.enable(gl.DEPTH_TEST);gl.depthFunc(gl.LEQUAL);gl.clearColor(0,0,0,0);
      return true;
    }catch(_){return false;}
  }
  let hasGL=initGL();
  hero.classList.toggle('ribbon-fallback',!hasGL);
  function showPhase(phase){
    if(phase===phaseCurrent)return;phaseCurrent=phase;
    phaseButtons.forEach(b=>b.setAttribute('aria-pressed',String(Number(b.dataset.heroPhase)===phase)));
    heroCaption.textContent=phaseCopy[phase];
    hero.dataset.phase=String(phase);
  }
  phaseButtons.forEach(button=>button.addEventListener('click',()=>{
    manualPhase=Number(button.dataset.heroPhase);manualUntil=elapsed+9;
    if(paused){morph=manualPhase===2?1:0;scatter=manualPhase===0?1:0;}
    showPhase(manualPhase);scheduleRibbon();
  }));
  function drawRibbon(time){
    const phase=manualPhase>=0&&time<manualUntil?manualPhase:(time%18<4?0:time%18<8?1:2);
    showPhase(phase);goalMorph=phase===2?1:0;goalScatter=phase===0?1:0;
    morph+=(goalMorph-morph)*.048;scatter+=(goalScatter-scatter)*.06;
    if(!hasGL||!w||!h)return;
    gl.viewport(0,0,canvas.width,canvas.height);gl.clear(gl.COLOR_BUFFER_BIT|gl.DEPTH_BUFFER_BIT);gl.useProgram(program);
    gl.uniform1f(locations.uMorph,morph);gl.uniform1f(locations.uScatter,scatter);gl.uniform1f(locations.uTime,time);gl.uniform1f(locations.uAspect,w/h);gl.uniform2f(locations.uPointer,px,py);
    for(let object=0;object<3;object++){
      const mesh=meshes[object===0?0:1];
      gl.bindBuffer(gl.ARRAY_BUFFER,mesh.vertices);gl.vertexAttribPointer(attribute,2,gl.FLOAT,false,0,0);
      gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER,mesh.elements);
      gl.uniform1f(locations.uObject,object);gl.drawElements(gl.TRIANGLES,mesh.count,gl.UNSIGNED_SHORT,0);
    }
  }
  function tick(stamp){
    ribbonFrame=0;if(document.hidden||!visible)return;
    if(!paused&&stamp-lastDraw<30){ribbonFrame=requestAnimationFrame(tick);return;}
    elapsed+=!paused&&lastStamp?Math.min(stamp-lastStamp,80)/1000:0;lastStamp=stamp;lastDraw=stamp;
    px+=(targetX-px)*.08;py+=(targetY-py)*.08;drawRibbon(elapsed);
    if(!paused&&hasGL)ribbonFrame=requestAnimationFrame(tick);
  }
  function scheduleRibbon(){if(!ribbonFrame&&visible&&!document.hidden)ribbonFrame=requestAnimationFrame(tick);}
  function sizeRibbon(){const r=canvas.getBoundingClientRect();w=r.width;h=r.height;const dpr=Math.min(devicePixelRatio||1,innerWidth<=600?1.5:1.7);canvas.width=Math.round(w*dpr);canvas.height=Math.round(h*dpr);scheduleRibbon();}
  if(matchMedia('(pointer:fine)').matches){
    hero.addEventListener('pointermove',e=>{if(paused)return;const r=hero.getBoundingClientRect();targetX=(e.clientX-r.left)/r.width-.5;targetY=(e.clientY-r.top)/r.height-.5;},{passive:true});
    hero.addEventListener('pointerleave',()=>{targetX=targetY=0;},{passive:true});
  }
  if('IntersectionObserver' in window)new IntersectionObserver(entries=>{visible=entries[0].isIntersecting;if(!visible){cancelAnimationFrame(ribbonFrame);ribbonFrame=0;lastStamp=0;}else scheduleRibbon();},{rootMargin:'40px'}).observe(hero);
  document.addEventListener('visibilitychange',()=>{if(document.hidden){cancelAnimationFrame(ribbonFrame);ribbonFrame=0;lastStamp=0;}else scheduleRibbon();});
  canvas.addEventListener('webglcontextlost',event=>{event.preventDefault();hasGL=false;hero.classList.add('ribbon-fallback');cancelAnimationFrame(ribbonFrame);ribbonFrame=0;});
  canvas.addEventListener('webglcontextrestored',()=>{hasGL=initGL();hero.classList.toggle('ribbon-fallback',!hasGL);sizeRibbon();});
  if('ResizeObserver' in window)new ResizeObserver(sizeRibbon).observe(canvas);else addEventListener('resize',sizeRibbon,{passive:true});
  sizeRibbon();setMotion(paused);

  // Preserve the reader's expanded state while making every detail available on paper.
  let printState=[];
  addEventListener('beforeprint',()=>{printState=[...document.querySelectorAll('details')].map(d=>[d,d.open]);printState.forEach(([d])=>d.open=true);});
  addEventListener('afterprint',()=>printState.forEach(([d,open])=>d.open=open));
  const labCopy={
    wedding:{
      paper:['手渡していた<br>一枚の案内から。','印刷した資料で商品をご案内。魅力の伝え方と、資料を補充する手間に課題がありました。'],
      web:['光と音の魅力を、<br>Webの体験へ。','写真や動画の選びやすさを、スタッフの声と実際の打ち合わせでの使用感をもとに改善しました。'],
      operation:['紹介から申込、<br>その先の運用まで。','ホテルからの追加要望を受け、GASで申込フォーム、自動応答・通知、在庫・日程管理までつなぎました。']
    },
    theater:{
      space:['演目の要件から、空間を考える。','天井高・素材・照明配置。新しい演目を成立させる条件を、設計段階から検討しました。','01 / SPACE DESIGN'],
      show:['光と音で、体験を立ち上げる。','演目選定と音響・照明のクリエイションを通じて、体験の独自性を追求しました。','02 / CREATIVE DIRECTION'],
      team:['専門職をつなぎ、本番へ。','テクニカル部門の責任者として、表現を支える運営体制とスタッフの勤務負荷にも向き合いました。','03 / TECHNICAL LEAD']
    }
  };
  document.querySelectorAll('[data-lab]').forEach(lab=>{
    const buttons=[...lab.querySelectorAll('[data-lab-step]')];
    buttons.forEach(button=>button.addEventListener('click',()=>{
      const step=button.dataset.labStep;
      lab.dataset.step=step;
      buttons.forEach(b=>b.setAttribute('aria-pressed',String(b===button)));
      lab.querySelectorAll('[data-lab-panel]').forEach(p=>p.hidden=p.dataset.labPanel!==step);
      const copy=labCopy[lab.dataset.lab][step];
      lab.querySelector('.lab-heading').innerHTML=copy[0];
      lab.querySelector('.lab-description').textContent=copy[1];
      const mode=lab.querySelector('.stage-mode');if(mode)mode.textContent=copy[2];
      updateProgress();
    }));
  });
  if('IntersectionObserver' in window){
    const animationObserver=new IntersectionObserver(entries=>entries.forEach(e=>e.target.classList.toggle('animation-visible',e.isIntersecting)),{rootMargin:'40px'});
    document.querySelectorAll('.animated-lab,.project-portals').forEach(el=>animationObserver.observe(el));
  }else document.querySelectorAll('.animated-lab,.project-portals').forEach(el=>el.classList.add('animation-visible'));

  (()=>{
    const section=document.getElementById('approach');
    const layout=section.querySelector('.room-layout');
    const sticky=section.querySelector('.room-sticky');
    const art=section.querySelector('.room-art');
    const canvas=document.getElementById('room-weave');
    const ctx=canvas.getContext('2d');
    if(!ctx){section.classList.add('room-no-canvas');return;}
    const steps=[...section.querySelectorAll('[data-room-step]')];
    const links=[...section.querySelectorAll('[data-room-go]')];
    const wordSpace=section.querySelector('.room-word-space');
    const wordGrow=section.querySelector('.room-word-grow');
    const stateLabel=section.querySelector('.room-state-name');
    const headingWord=section.querySelector('.room-possibility');
    const thread=section.querySelector('.room-heading-thread');
    const threadBase=section.querySelector('.room-thread-base');
    const threadTravel=section.querySelector('.room-thread-travel');
    const sparks=[...section.querySelectorAll('.room-thread-spark')];
    let width=0,height=0,dpr=1,frame=0,last=0,time=0;
    let visible=false,measuring=true,progress=.08,target=.08,active=-1,manual=null;
    let threadLength=1,mobile=innerWidth<=600;
    const clamp=(x,a=0,b=1)=>Math.min(b,Math.max(a,x));
    const smooth=(a,b,x)=>{const u=clamp((x-a)/(b-a));return u*u*(3-2*u);};
    const mix=(a,b,t)=>a+(b-a)*t;
    const names=['01 / ALIGN','02 / MAKE ROOM','03 / GROW'];
    function activate(index){
      if(index===active)return;
      active=index;section.dataset.roomPhase=String(index);
      steps.forEach((el,i)=>el.classList.toggle('is-current',i===index));
      links.forEach((el,i)=>{if(i===index)el.setAttribute('aria-current','step');else el.removeAttribute('aria-current');});
      stateLabel.textContent=names[index];
    }
    function measure(){
      mobile=innerWidth<=600;
      const visual=sticky.getBoundingClientRect();
      // On a phone the story is read directly below the sticky visual.
      const readLine=mobile?Math.min(innerHeight-96,visual.bottom+61):innerHeight*.48;
      const rects=steps.map(el=>el.getBoundingClientRect());
      let index=0;
      for(let i=0;i<rects.length;i++)if(rects[i].top<=readLine)index=i;
      const r=rects[index];
      const local=clamp((readLine-r.top)/Math.max(r.height,1));
      if(manual!==null){
        target=[.27,.62,.98][manual];
      }else{const ranges=[[.025,.29],[.48,.65],[.87,1]];target=mix(ranges[index][0],ranges[index][1],local);}
      activate(manual===null?index:manual);
      const selected=manual===null?index:manual;
      steps[selected].style.setProperty('--room-step-fill',String(manual===null?local:.95));
      measuring=false;
    }
    function resize(){
      const r=art.getBoundingClientRect();width=r.width;height=r.height;
      dpr=Math.min(devicePixelRatio||1,1.7);canvas.width=Math.round(width*dpr);canvas.height=Math.round(height*dpr);
      layout.style.setProperty('--room-cover',`${sticky.offsetHeight}px`);
      // Both ends live in the same sticky panel, so the connector never jumps.
      const bounds=sticky.getBoundingClientRect(),a=art.getBoundingClientRect(),end=headingWord.getBoundingClientRect();
      const sx=a.left-bounds.left+a.width*.53,sy=a.top-bounds.top+a.height*.49;
      const ex=end.left-bounds.left+end.width*.65,ey=end.bottom-bounds.top+3;
      const outer=Math.min(bounds.width-7,sx+width*.36);
      const path=`M${sx.toFixed(2)} ${sy.toFixed(2)} C${outer.toFixed(2)} ${sy.toFixed(2)},${outer.toFixed(2)} ${(ey+60).toFixed(2)},${ex.toFixed(2)} ${ey.toFixed(2)}`;
      threadBase.setAttribute('d',path);threadTravel.setAttribute('d',path);
      threadLength=threadBase.getTotalLength();threadBase.style.strokeDasharray=`${threadLength} ${threadLength}`;
      threadTravel.style.strokeDasharray=`14 ${threadLength+35}`;
      measuring=true;schedule();
    }
    // Each strand shares the same structure. Disorder resolves into alignment;
    // then the controls peel apart, leaving a literal unpainted space.
    function strand(i,p,clock){
      const n=(i-12.5)/13,sign=n<0?-1:1;
      const align=smooth(.02,.29,p),open=smooth(.32,.63,p),grow=smooth(.66,.96,p);
      const wave=(paused||reduced.matches)?0:Math.sin(clock*.34+i*.7)*.009;
      const disorder=Math.sin(i*2.13)*.19;
      const startY=mix(.5+Math.sin(i*1.32)*.16,.5+n*.18,align);
      const endY=mix(.5+Math.cos(i*1.87)*.19,.5+n*.18,align);
      const peeled=sign*(.17+Math.abs(n)*.22);
      let c1Y=mix(.5+disorder,.5+n*.18,align);
      let c2Y=mix(.5-disorder*.9,.5+n*.18,align);
      c1Y=mix(c1Y,.5+peeled+wave,open);c2Y=mix(c2Y,.5+peeled-wave,open);
      const group=i%3,targets=[.20,.50,.80];
      const endpoint=mix(endY,targets[group]+Math.sin(i*2.3)*.015,grow);
      c2Y=mix(c2Y,mix(.5+peeled,targets[group],.36),grow);
      return {a:{x:.08,y:startY},b:{x:.35,y:c1Y},c:{x:.67,y:c2Y},d:{x:mix(.92,.87,grow),y:endpoint},alpha:mix(.70,.29+((i%3===0)? .39:0),grow),group};
    }
    function cubic(s,t){const q=1-t;return{x:q*q*q*s.a.x+3*q*q*t*s.b.x+3*q*t*t*s.c.x+t*t*t*s.d.x,y:q*q*q*s.a.y+3*q*q*t*s.b.y+3*q*t*t*s.c.y+t*t*t*s.d.y};}
    function stroke(s,offset){
      ctx.beginPath();ctx.moveTo(s.a.x*width,s.a.y*height+offset);
      ctx.bezierCurveTo(s.b.x*width,s.b.y*height+offset,s.c.x*width,s.c.y*height+offset,s.d.x*width,s.d.y*height+offset);ctx.stroke();
    }
    function draw(p,clock){
      ctx.setTransform(dpr,0,0,dpr,0,0);ctx.clearRect(0,0,width,height);
      const open=smooth(.32,.63,p),grow=smooth(.66,.96,p);
      // Delicate registration marks create an open page, not another card.
      ctx.strokeStyle='#e7dfce';ctx.lineWidth=.6;
      for(const [x,y,dx,dy] of [[.055,.14,1,1],[.945,.14,-1,1],[.055,.85,1,-1],[.945,.85,-1,-1]]){
        ctx.beginPath();ctx.moveTo(x*width+dx*7,y*height);ctx.lineTo(x*width,y*height);ctx.lineTo(x*width,y*height+dy*7);ctx.stroke();
      }
      for(let i=0;i<26;i++){
        const s=strand(i,p,clock);
        const gradient=ctx.createLinearGradient(s.a.x*width,0,s.d.x*width,0);
        gradient.addColorStop(0,`rgba(229,193,105,${s.alpha*.35})`);
        gradient.addColorStop(.4,`rgba(240,186,70,${s.alpha})`);
        gradient.addColorStop(.7,`rgba(249,186,76,${s.alpha*.94})`);
        gradient.addColorStop(1,`rgba(239,172,66,${s.alpha*.32})`);
        ctx.strokeStyle=gradient;ctx.lineWidth=i%4===0?1.15:.85;stroke(s,0);
        ctx.lineWidth=.3;ctx.globalAlpha=.35;stroke(s,-1.3);stroke(s,1.3);ctx.globalAlpha=1;
        if(i%4===0){
          const t=(clock*.075+i*.137)%1;
          const dot=cubic(s,t),radius=1.1+open*.3;
          ctx.fillStyle=`rgba(237,177,63,${.22+open*.28})`;
          ctx.beginPath();ctx.arc(dot.x*width,dot.y*height,radius,0,Math.PI*2);ctx.fill();
        }
      }
      const align=smooth(.02,.29,p);
      // The labels become spacious and legible as purposes align.
      ctx.font=`600 ${Math.max(8,width*.018)}px -apple-system,BlinkMacSystemFont,"Hiragino Sans",sans-serif`;
      ctx.textAlign='left';ctx.textBaseline='middle';
      for(let i=0;i<3;i++){
        const base=.32+i*.18;
        const y=mix(.4+i*.07,base,align)*height;
        const x=mix(.25+i*.11,.08,align)*width;
        ctx.fillStyle=`rgba(145,135,114,${mix(.62,.90,align)*(1-grow*.35)})`;
        ctx.fillText(['顧客','制作','運営'][i],x,y-12);
      }
      if(grow>.01){
        for(let i=0;i<3;i++){
          const x=.87*width,y=[.20,.50,.80][i]*height;
          const breath=paused||reduced.matches?0:Math.sin(clock*.8+i*2)*1.1;
          const glow=ctx.createRadialGradient(x,y,0,x,y,17+breath);
          glow.addColorStop(0,`rgba(255,205,103,${grow*.26})`);glow.addColorStop(1,'rgba(255,222,149,0)');
          ctx.fillStyle=glow;ctx.beginPath();ctx.arc(x,y,19,0,Math.PI*2);ctx.fill();
          ctx.fillStyle=`rgba(241,183,65,${grow*.85})`;ctx.beginPath();ctx.arc(x,y,2.7+breath*.15,0,Math.PI*2);ctx.fill();
          ctx.font=`500 ${Math.max(7,width*.016)}px -apple-system,BlinkMacSystemFont,"Hiragino Sans",sans-serif`;
          ctx.fillStyle=`rgba(164,139,81,${grow*.78})`;ctx.textAlign='right';ctx.fillText(['考える','学ぶ','挑戦する'][i],x-8,y+15);
        }
      }
      const roomOpacity=open*(1-smooth(.67,.81,p));
      wordSpace.style.opacity=String(roomOpacity);wordSpace.style.transform=`translateY(${(1-open)*9}px)`;
      wordGrow.style.opacity=String(grow*.9);wordGrow.style.transform=`translateY(${(1-grow)*9}px)`;
      sticky.style.setProperty('--room-reveal',String(smooth(.78,.97,p)));
      const reveal=smooth(.73,.93,p);thread.style.opacity=String(reveal*.8);
      threadBase.style.strokeDashoffset=String(threadLength*(1-reveal));
      const travel=(clock*.17)%1;
      threadTravel.style.strokeDashoffset=String(-travel*threadLength);
      sparks.forEach((spark,i)=>{
        const t=(travel+i*.47)%1;
        const pt=threadBase.getPointAtLength(t*threadLength);
        spark.setAttribute('cx',pt.x.toFixed(2));spark.setAttribute('cy',pt.y.toFixed(2));
        spark.style.opacity=String(t<reveal?1:0);
      });
    }
    function tick(stamp){
      frame=0;if(!visible||document.hidden)return;
      if(!paused&&!reduced.matches&&stamp-last<32){schedule();return;}
      const delta=last?Math.min((stamp-last)/1000,.08):0;last=stamp;
      if(measuring)measure();
      const sectionRect=section.getBoundingClientRect();
      if(sectionRect.top<innerHeight*.45&&sectionRect.bottom>innerHeight*.45){
        const currentNav=document.querySelector('[data-nav="approach"]');
        if(currentNav&&currentNav.getAttribute('aria-current')!=='location'){
          document.querySelectorAll('[data-nav]').forEach(a=>a.removeAttribute('aria-current'));
          currentNav.setAttribute('aria-current','location');
        }
      }
      if(paused||reduced.matches)progress=target;else{progress+=(target-progress)*.095;time+=delta;}
      draw(progress,time);
      if(!paused&&!reduced.matches)schedule();
    }
    function schedule(){if(!frame&&visible&&!document.hidden)frame=requestAnimationFrame(tick);}
    addEventListener('scroll',()=>{measuring=true;schedule();},{passive:true});
    addEventListener('resize',()=>{resize();measuring=true;},{passive:true});
    links.forEach((link,index)=>link.addEventListener('click',()=>{manual=index;target=[.27,.62,.98][index];activate(index);schedule();}));
    const release=()=>{manual=null;measuring=true;schedule();};
    document.addEventListener('click',event=>{
      const link=event.target.closest('a[href]');
      if(link&&!link.closest('.room-navigation'))release();
    });
    addEventListener('wheel',release,{passive:true});addEventListener('touchstart',release,{passive:true});
    addEventListener('keydown',event=>{if(['ArrowDown','ArrowUp','PageDown','PageUp','Home','End',' '].includes(event.key))release();});
    motionButton.addEventListener('click',()=>{last=0;measuring=true;schedule();});
    reduced.addEventListener('change',()=>{last=0;measuring=true;schedule();});
    document.addEventListener('visibilitychange',()=>{if(document.hidden){cancelAnimationFrame(frame);frame=0;last=0;}else schedule();});
    if('IntersectionObserver' in window)new IntersectionObserver(entries=>{
      visible=entries[0].isIntersecting;
      if(!visible){cancelAnimationFrame(frame);frame=0;last=0;}else{measuring=true;schedule();}
    },{rootMargin:'80px'}).observe(section);else visible=true;
    if('ResizeObserver' in window)new ResizeObserver(resize).observe(sticky);
    resize();schedule();
  })();

})();

(()=>{
  'use strict';
  // CSS motion follows the same offscreen/background policy as the canvases.
  const root=document.documentElement;
  const syncVisibility=()=>root.classList.toggle('page-inactive',document.hidden);
  document.addEventListener('visibilitychange',syncVisibility);
  syncVisibility();
  if('IntersectionObserver' in window){
    const observer=new IntersectionObserver(entries=>{
      entries.forEach(entry=>entry.target.classList.toggle('animation-visible',entry.isIntersecting));
    },{rootMargin:'0px',threshold:0});
    document.querySelectorAll('.systems-surface,.project-portal').forEach(el=>observer.observe(el));
  }else document.querySelectorAll('.systems-surface,.project-portal').forEach(el=>el.classList.add('animation-visible'));

  // Local QA only: no telemetry is sent or persisted, and this is absent in ordinary use.
  if(new URLSearchParams(location.search).has('qa')){
    const report=document.createElement('script');
    report.id='portfolio-qa';report.type='application/json';document.body.appendChild(report);
    const stats={paints:[],longTasks:[],largestPaint:null,layoutShifts:0,frameGaps:[]};
    const publish=()=>{
      const nav=performance.getEntriesByType('navigation')[0];
      report.textContent=JSON.stringify({...stats,navigation:nav?{
        transferSize:nav.transferSize,decodedBodySize:nav.decodedBodySize,
        domContentLoaded:nav.domContentLoadedEventEnd,load:nav.loadEventEnd
      }:null,resources:performance.getEntriesByType('resource').map(e=>({name:e.name.split('/').pop(),bytes:e.transferSize,duration:e.duration})),
      viewport:{width:innerWidth,height:innerHeight},overflow:document.documentElement.scrollWidth>innerWidth});
    };
    if('PerformanceObserver' in window){
      for(const type of ['paint','largest-contentful-paint','longtask','layout-shift']){
        try{new PerformanceObserver(list=>{
          for(const e of list.getEntries()){
            if(type==='paint')stats.paints.push({name:e.name,time:e.startTime});
            if(type==='largest-contentful-paint')stats.largestPaint={time:e.startTime,tag:e.element?.tagName};
            if(type==='longtask')stats.longTasks.push({time:e.startTime,duration:e.duration});
            if(type==='layout-shift'&&!e.hadRecentInput)stats.layoutShifts+=e.value;
          }
          publish();
        }).observe({type,buffered:true});}catch(_){/* Not every engine exposes all metrics. */}
      }
    }
    let last=0,count=0;
    const sample=stamp=>{
      if(last&&stats.frameGaps.length<600)stats.frameGaps.push(stamp-last);
      last=stamp;count++;
      if(count<601)requestAnimationFrame(sample);else publish();
    };
    requestAnimationFrame(sample);
    addEventListener('load',publish,{once:true});
    addEventListener('resize',publish,{passive:true});
    addEventListener('click',()=>requestAnimationFrame(publish));
    publish();
  }
})();

(()=>{
  'use strict';
  const root=document.documentElement;
  const reduced=matchMedia('(prefers-reduced-motion:reduce)');
  const hero=document.querySelector('.hero');
  const art=document.querySelector('.hero-art');
  const syncSpace=()=>hero.dataset.spacePhase=art.dataset.phase||'2';
  new MutationObserver(syncSpace).observe(art,{attributes:true,attributeFilter:['data-phase']});
  syncSpace();

  const route=document.querySelector('.case-route');
  const routeLinks=[...route.querySelectorAll('[data-case-go]')];
  const cases=routeLinks.map(link=>document.querySelector(link.getAttribute('href')));
  const header=document.querySelector('.site-header');
  let routeFrame=0,headerHeight=90,lastCase=-2;
  function updateRoute(){
    routeFrame=0;
    const line=headerHeight+innerHeight*.3;
    let current=-1;
    cases.forEach((item,index)=>{
      const r=item.getBoundingClientRect();
      if(r.top<=line&&r.bottom>headerHeight+50)current=index;
    });
    if(current===lastCase)return;
    lastCase=current;
    route.classList.toggle('is-visible',current>=0);
    route.setAttribute('aria-hidden',String(current<0));
    route.inert=current<0;
    routeLinks.forEach((link,index)=>{
      if(index===current)link.setAttribute('aria-current','location');
      else link.removeAttribute('aria-current');
    });
  }
  const scheduleRoute=()=>{if(!routeFrame)routeFrame=requestAnimationFrame(updateRoute);};
  const measureHeader=()=>{
    headerHeight=header.offsetHeight;
    root.style.setProperty('--portfolio-header-height',headerHeight+'px');
    scheduleRoute();
  };
  addEventListener('scroll',scheduleRoute,{passive:true});
  addEventListener('resize',measureHeader,{passive:true});
  if('ResizeObserver' in window)new ResizeObserver(measureHeader).observe(header);
  measureHeader();

  const chapters=[...document.querySelectorAll('[data-chapter-reveal]')];
  if('IntersectionObserver' in window){
    const observer=new IntersectionObserver(entries=>entries.forEach(entry=>{
      if(entry.isIntersecting){entry.target.classList.add('chapter-seen');observer.unobserve(entry.target);}
    }),{threshold:.12});
    chapters.forEach(chapter=>observer.observe(chapter));
  }else chapters.forEach(chapter=>chapter.classList.add('chapter-seen'));

  if(matchMedia('(pointer:fine)').matches&&!reduced.matches){
    document.querySelectorAll('.project-portal').forEach(card=>{
      let frame=0,x=50,y=30;
      const paint=()=>{frame=0;card.style.setProperty('--portal-x',x+'%');card.style.setProperty('--portal-y',y+'%');};
      card.addEventListener('pointermove',event=>{
        if(root.classList.contains('motion-paused'))return;
        const bounds=card.getBoundingClientRect();
        x=(event.clientX-bounds.left)/bounds.width*100;y=(event.clientY-bounds.top)/bounds.height*100;
        if(!frame)frame=requestAnimationFrame(paint);
      },{passive:true});
      card.addEventListener('pointerleave',()=>{x=50;y=30;if(!frame)frame=requestAnimationFrame(paint);},{passive:true});
    });
  }

  const photoButton=document.querySelector('.evidence-photo');
  const dialog=document.querySelector('.evidence-dialog');
  const fullImage=dialog.querySelector('.evidence-full');
  const close=dialog.querySelector('.evidence-close');
  let previousOverflow='';
  photoButton.addEventListener('click',()=>{
    if(dialog.open)return;
    const thumbnail=photoButton.querySelector('img');
    fullImage.src=thumbnail.currentSrc||thumbnail.src;
    previousOverflow=document.body.style.overflow;
    dialog.showModal();document.body.style.overflow='hidden';close.focus();
  });
  close.addEventListener('click',()=>dialog.close());
  dialog.addEventListener('click',event=>{
    if(event.target!==dialog)return;
    const r=dialog.getBoundingClientRect();
    if(event.clientX<r.left||event.clientX>r.right||event.clientY<r.top||event.clientY>r.bottom)dialog.close();
  });
  dialog.addEventListener('close',()=>{
    document.body.style.overflow=previousOverflow;
    photoButton.focus({preventScroll:true});
  });
})();
