(function(){
  function track(name,params){if(typeof gtag==='function')gtag('event',name,params||{})}
  var page=location.pathname;
  document.addEventListener('click',function(e){
    var el=e.target.closest('a,button');if(!el)return;
    var href=el.getAttribute('href')||'';
    if(href.indexOf('tel:')===0)track('click_to_call',{page_path:page});
    else if(href.indexOf('mailto:')===0)track('click_email',{page_path:page});
    else if((el.getAttribute('onclick')||'').indexOf('openQuote')!==-1)track('quote_open',{page_path:page,label:(el.textContent||'').trim().slice(0,40)});
  });
  if(!document.getElementById('quote'))return;
  var s=document.createElement('style');
  s.textContent='.cta-bar{display:none}@media(max-width:767px){.cta-bar{display:flex;position:fixed;left:0;right:0;bottom:0;z-index:40;gap:8px;padding:10px 12px calc(10px + env(safe-area-inset-bottom));background:rgba(10,10,10,.92);backdrop-filter:blur(12px);border-top:1px solid rgba(255,255,255,.1)}.cta-bar a,.cta-bar button{flex:1;text-align:center;padding:12px 0;border-radius:14px;font-weight:600;font-size:14px}.cta-bar a{border:1px solid rgba(255,255,255,.25);color:#fff}body{padding-bottom:72px}}';
  document.head.appendChild(s);
  var b=document.createElement('div');b.className='cta-bar';
  b.innerHTML='<a href="tel:+15107097097">Call</a><button type="button" class="btn" onclick="openQuote()">Request a quote</button>';
  document.body.appendChild(b);
})();
