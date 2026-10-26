(()=>{
  'use strict';
  const preference=matchMedia('(prefers-reduced-motion: reduce)');
  const root=document.documentElement;
  document.querySelectorAll('.possibility:not([data-vision-story])').forEach(scene=>{
    const buttons=[...scene.querySelectorAll('[data-story-step]')];
    const caption=scene.querySelector('.possibility-caption');
    const messages=buttons.map(button=>button.dataset.description);
    let step=2,visible=false,timer=null,manual=false;
    const staticMode=()=>preference.matches||root.classList.contains('motion-paused');
    function stop(){clearTimeout(timer);timer=null;}
    function paint(next){step=next;scene.dataset.step=String(step);buttons.forEach((b,i)=>b.setAttribute('aria-pressed',String(i===step)));caption.textContent=messages[step];}
    function schedule(){
      stop();
      const quiet=staticMode();scene.toggleAttribute('data-static',quiet);
      if(quiet){if(!manual)paint(2);return;}
      if(visible&&!document.hidden&&!manual)timer=setTimeout(()=>{paint((step+1)%3);schedule();},5200);
    }
    buttons.forEach((button,i)=>button.addEventListener('click',()=>{manual=true;paint(i);schedule();}));
    if('IntersectionObserver' in window)new IntersectionObserver(entries=>{
      visible=entries[0].isIntersecting;scene.classList.toggle('in-view',visible);
      if(visible&&!manual&&!staticMode())paint(0);
      schedule();
    },{threshold:.18}).observe(scene);
    else{visible=true;scene.classList.add('in-view');}
    new MutationObserver(schedule).observe(root,{attributes:true,attributeFilter:['class']});
    preference.addEventListener('change',schedule);
    document.addEventListener('visibilitychange',schedule);
    paint(2);schedule();
  });
})();


/* One idea becomes a shared place. */
(function visionController(){
  'use strict';
  const scene=document.querySelector('[data-vision-story]');
  if(!scene)return;
  const root=document.documentElement;
  const preference=matchMedia('(prefers-reduced-motion: reduce)');
  const nodes=[...scene.querySelectorAll('[data-node]')];
  const links=[...scene.querySelectorAll('[data-link]')];
  const ribs=[...scene.querySelectorAll('[data-rib]')];
  const births=[...scene.querySelectorAll('[data-birth]')];
  const traveller=scene.querySelector('.vision-traveller');
  const world=scene.querySelector('.vision-world');
  const life=[...scene.querySelectorAll('.vision-life')];
  const ignition=scene.querySelector('.vision-ignition');
  const ignitionGlow=scene.querySelector('.vision-ignition-glow');
  const filaments=[...scene.querySelectorAll('[data-ignition-filament]')];
  const guideOrbit=scene.querySelector('.vision-guide-orbit');
  const field=scene.querySelector('.vision-field');
  const word=scene.querySelector('.vision-art-word');
  const buttons=[...scene.querySelectorAll('[data-story-step]')];
  const caption=scene.querySelector('.possibility-caption');
  const replay=scene.querySelector('.vision-replay');
  const dots=nodes.map(n=>n.querySelector('.vision-dot'));
  const rest=[[400,230],[270,248],[346,135],[505,178],[545,300],[386,345],[245,316],
    [180,270],[235,150],[290,65],[420,80],[555,100],[625,190],[665,300],[585,378],
    [475,405],[345,410],[240,390],[150,335]];
  const form=[[400,260],[210,225],[300,125],[490,115],[590,230],[490,325],[295,330],
    [180,285],[215,160],[270,88],[370,65],[445,70],[550,135],[620,210],[620,285],
    [555,345],[450,380],[355,380],[240,345]];
  const tour=[0,1,2,3,4,5,6,0];
  const edges=tour.slice(1).map((to,i)=>[tour[i],to]);
  for(let i=7;i<19;i++)edges.push([1+Math.floor((i-7)/2),i]);
  const ribNodes=[[7,8,9,10,11,12,13,14,15,16,17,18,7],
    [7,1,2,10],[18,6,0,3,11],[17,0,2,9],[16,5,3,12],
    [8,2,3,12],[7,1,0,4,14]];
  const milestones=[2.4,12.0,19.0,26.8];
  const words=['ひとつの思い。','出会いが、つながりになる。','つながった先に、可能性が育つ。','思いが、人の動く場になる。'];
  const clamp=x=>Math.max(0,Math.min(1,x));
  const ease=x=>{x=clamp(x);return x*x*(3-2*x);};
  const mix=(a,b,t)=>a+(b-a)*t;
  const point=(a,b,t)=>[mix(a[0],b[0],t),mix(a[1],b[1],t)];
  const attr=(el,key,value)=>el.setAttribute(key,String(value));
  function curve(a,b,index){
    const dx=b[0]-a[0],dy=b[1]-a[1],length=Math.hypot(dx,dy)||1;
    const bend=(index%2?1:-1)*Math.min(24,length*.15),nx=-dy/length*bend,ny=dx/length*bend;
    return [a,[a[0]+dx*.34+nx,a[1]+dy*.34+ny],[a[0]+dx*.72+nx,a[1]+dy*.72+ny],b];
  }
  function bezier(c,t){const u=1-t;return [0,1].map(k=>u*u*u*c[0][k]+3*u*u*t*c[1][k]+3*u*t*t*c[2][k]+t*t*t*c[3][k]);}
  const curvePath=c=>`M${c[0]} C${c[1]} ${c[2]} ${c[3]}`;
  function spline(points){
    let d=`M${points[0]}`;
    for(let i=0;i<points.length-1;i++){
      const a=points[Math.max(0,i-1)],b=points[i],c=points[i+1],z=points[Math.min(points.length-1,i+2)];
      d+=` C${b[0]+(c[0]-a[0])/6},${b[1]+(c[1]-a[1])/6} ${c[0]-(z[0]-b[0])/6},${c[1]-(z[1]-b[1])/6} ${c}`;
    }
    return d;
  }
  function closedCurve(points,index){
    const length=points.length,a=points[(index+length-1)%length],b=points[index%length],c=points[(index+1)%length],d=points[(index+2)%length];
    return [b,[b[0]+(c[0]-a[0])/6,b[1]+(c[1]-a[1])/6],[c[0]-(d[0]-b[0])/6,c[1]-(d[1]-b[1])/6],c];
  }
  function closedPath(points){
    let d=`M${points[0]}`;
    for(let i=0;i<points.length;i++){const c=closedCurve(points,i);d+=` C${c[1]} ${c[2]} ${c[3]}`;}
    return d;
  }
  function orbitPoint(points,u){
    const segment=((u%1)+1)%1*points.length,index=Math.floor(segment);
    return bezier(closedCurve(points,index),segment-index);
  }
  let time=26.8,motionTime=0,phase=-1,frameId=null,last=null,visible=false,started=false,manual=false;
  function paint(clock,ambient=motionTime){
    // The opening gets enough time to gather light; the remaining story retains its pacing.
    const t=clock<4.2?clock*(2.4/4.2):clock-1.8;
    const stage=t<2.4?0:t<10.4?1:t<17.4?2:3;
    if(stage!==phase){
      phase=stage;scene.dataset.step=String(stage);
      buttons.forEach((button,i)=>attr(button,'aria-pressed',i===stage));
      caption.textContent=buttons[stage].dataset.description;word.textContent=words[stage];
    }
    const settle=ease((t-17.4)/6);
    const fade=1-ease((t-30.4)/1);
    attr(world,'opacity',fade);
    attr(field,'opacity',settle);
    const positions=rest.map((p,i)=>{
      if(i<7)return point(p,form[i],settle);
      const parent=1+Math.floor((i-7)/2),birth=10.4+(parent-1)*.65+((i-7)%2)*.3;
      const position=point(point(rest[parent],p,ease((t-birth)/2.2)),form[i],settle);
      // Each new light develops a small orbit of its own, within the shared structure.
      const autonomy=ease((t-birth-1.8)/1.2)*mix(1,.6,settle);
      const angle=ambient*(.6+(i-7)*.021)+i*1.43;
      return [position[0]+Math.cos(angle)*(4+(i%3)*2)*autonomy,position[1]+Math.sin(angle)*(3+(i%4)*.8)*autonomy];
    });
    nodes.forEach((node,i)=>{
      let amount=1;
      if(i>0&&i<7)amount=ease((t-(2.4+(i-1)*1.1+.78))/.32);
      if(i>=7){const parent=1+Math.floor((i-7)/2);amount=ease((t-(10.4+(parent-1)*.65+((i-7)%2)*.3))/1.2);}
      attr(node,'transform',`translate(${positions[i]})`);attr(node,'opacity',amount*(i===0&&stage===1?.38:1));
      const radius=i===0?(stage===0?7.2:5.5-mix(0,1,settle)):4.3;
      const breath=stage===0&&i===0?1+Math.sin(ambient*2.1-.7)*.3:1;
      attr(dots[i],'r',radius*amount*breath);
    });
    edges.forEach(([from,to],i)=>{
      let progress;
      if(i<7)progress=ease((t-(2.4+i*1.1))/1.1);
      else{const parent=from;progress=ease((t-(10.4+(parent-1)*.65+((to-7)%2)*.3))/1.8);}
      const c=curve(positions[from],positions[to],i);
      attr(links[i],'d',curvePath(c));attr(links[i],'stroke-dashoffset',1-progress);
      attr(links[i],'opacity',progress>0?mix(.62,.38,settle):0);
    });
    ribs.forEach((rib,i)=>{attr(rib,'d',spline(ribNodes[i].map(n=>positions[n])));attr(rib,'opacity',settle*(i===0?.62:.48));});
    births.forEach((ring,i)=>{
      const b=clamp((t-(10.4+i*.65))/1.8),p=positions[i+1];
      attr(ring,'cx',p[0]);attr(ring,'cy',p[1]);attr(ring,'r',8+b*27);
      attr(ring,'opacity',b>0&&b<1?Math.sin(b*Math.PI)*.35:0);
    });
    // The original light keeps making the rounds while the other lights become autonomous.
    const tourClock=manual&&stage===1?2.4+(ambient%7.7):t;
    const tourTime=(tourClock-2.4)/1.1,segment=Math.max(0,Math.min(6,Math.floor(tourTime)));
    let at=bezier(curve(positions[tour[segment]],positions[tour[segment+1]],segment),ease(tourTime-segment));
    const guidePoints=positions.slice(1,7);
    attr(guideOrbit,'d',closedPath(guidePoints));
    attr(guideOrbit,'opacity',stage>=2?.24:0);
    if(stage>=2){
      if(!manual&&t<11.1)at=bezier(curve(positions[0],positions[1],0),ease((t-10.1)));
      else at=orbitPoint(guidePoints,(manual?ambient:t-11.1)/9);
    }
    attr(traveller,'transform',`translate(${at})`);
    attr(traveller,'opacity',stage>=2||stage===1&&(manual||t<10.1)?1:0);
    const opening=stage===0?1:1-ease((t-2.4)/.8);
    attr(ignition,'opacity',opening);
    attr(ignition,'transform',`translate(${positions[0]})`);
    attr(ignitionGlow,'r',42+Math.sin(ambient*2.1-.7)*12);
    attr(ignitionGlow,'opacity',.7+Math.sin(ambient*2.1-.7)*.2);
    filaments.forEach((filament,i)=>{
      const pulse=(ambient/3.8+i/3)%1,angle=i*Math.PI*2/3+ambient*.48+pulse*1.6;
      const radius=70*(1-ease(pulse))+12,inner=radius*.28;
      const polar=(r,a)=>[Math.cos(a)*r,Math.sin(a)*r];
      const a=polar(radius,angle-1.25),b=polar(radius*.85,angle-.35),c=polar(inner*1.7,angle+.4),d=polar(inner,angle+.85);
      attr(filament,'d',`M${a} C${b} ${c} ${d}`);
      attr(filament,'opacity',Math.sin(pulse*Math.PI)*.62);
    });
    life.forEach((light,i)=>{
      const route=ribNodes[i+1],p=(ambient/8+i*.31)%1;
      const scaled=Math.max(0,p)*(route.length-1),a=Math.min(route.length-2,Math.floor(scaled));
      const location=point(positions[route[a]],positions[route[a+1]],scaled-a);
      attr(light,'cx',location[0]);attr(light,'cy',location[1]);
      attr(light,'opacity',t>23.4?ease((t-23.4)/1.5)*.7:0);
    });
  }
  const mayRun=()=>visible&&!document.hidden&&!preference.matches&&!root.classList.contains('motion-paused');
  function tick(now){
    frameId=null;if(!mayRun()){last=null;return;}
    if(last!==null){const delta=Math.min((now-last)/1000,.1);motionTime+=delta;if(!manual)time=(time+delta)%33.2;}
    last=now;paint(time);frameId=requestAnimationFrame(tick);
  }
  function sync(){
    scene.toggleAttribute('data-static',preference.matches||root.classList.contains('motion-paused'));
    replay.hidden=preference.matches;
    if(!mayRun()){if(frameId!==null)cancelAnimationFrame(frameId);frameId=null;last=null;}
    else if(frameId===null)frameId=requestAnimationFrame(tick);
  }
  buttons.forEach((button,i)=>{
    button.disabled=false;
    button.addEventListener('click',()=>{manual=true;time=milestones[i];paint(time);sync();});
  });
  replay.addEventListener('click',()=>{manual=false;started=true;time=0;motionTime=0;last=null;paint(time);sync();});
  if('IntersectionObserver' in window)new IntersectionObserver(entries=>{
    visible=entries[0].isIntersecting;scene.classList.toggle('in-view',visible);
    if(visible&&!started&&!manual&&!preference.matches&&!root.classList.contains('motion-paused')){started=true;time=0;motionTime=0;paint(time);}
    sync();
  },{threshold:.16}).observe(scene);
  else{visible=true;started=true;time=preference.matches?26.8:0;}
  new MutationObserver(sync).observe(root,{attributes:true,attributeFilter:['class']});
  document.addEventListener('visibilitychange',sync);
  preference.addEventListener('change',()=>{if(preference.matches&&!manual){time=26.8;paint(time);}sync();});
  paint(time);sync();
})();
