(()=>{
  'use strict';
  const preference=matchMedia('(prefers-reduced-motion: reduce)');
  const root=document.documentElement;
  document.querySelectorAll('.possibility').forEach(scene=>{
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
