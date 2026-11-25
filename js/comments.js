(function(){
var API='/api/potluck/',KEY='eac.comments',Q='';
var form=document.getElementById('cmForm');
if(!form)return;
var list=document.getElementById('cmList'),err=document.getElementById('cmErr'),btn=document.getElementById('cmBtn'),rep=document.getElementById('cmRep'),top=document.getElementById('cmOpen');
var replyTo=null,admin='';
Q=form.dataset.event?'?e='+form.dataset.event:'';KEY+=form.dataset.event?'.'+form.dataset.event:'';
try{admin=localStorage.getItem('eac.adminkey')||''}catch(e){}
function tokens(){try{return JSON.parse(localStorage.getItem(KEY))||{}}catch(e){return{}}}
function save(t){try{localStorage.setItem(KEY,JSON.stringify(t))}catch(e){}}
function el(t,c,x){var n=document.createElement(t);if(c)n.className=c;if(x!=null)n.textContent=x;return n}
function ago(ms){var s=Math.max(1,Math.floor((Date.now()-ms)/1000));if(s<60)return 'just now';var m=Math.floor(s/60);if(m<60)return m+' min ago';var h=Math.floor(m/60);if(h<24)return h+' hr ago';var d=Math.floor(h/24);return d+(d===1?' day ago':' days ago')}
function item(c,top){
  var mine=tokens(),row=el('div','cm-item'+(top?'':' cm-reply'));
  row.appendChild(el('span','cm-av',(c.name.trim().charAt(0)||'?').toUpperCase()));
  var main=el('div','cm-main');
  var h=el('div','cm-h');h.appendChild(el('b',null,c.name));if(c.kind){h.appendChild(el('span','cm-s cm-'+c.kind,c.body))}h.appendChild(el('small',null,ago(c.created_at)));main.appendChild(h);
  if(!c.kind)main.appendChild(el('p','cm-b',c.body));
  var a=el('div','cm-a');
  var r=el('button','cm-reply-btn','Reply');r.type='button';r.onclick=function(){startReply(c)};a.appendChild(r);
  if((mine[c.id]&&!c.kind)||admin){var x=el('button','cm-x','Delete');x.type='button';x.onclick=function(){del(c.id)};a.appendChild(x)}
  main.appendChild(a);row.appendChild(main);return row;
}
function render(items){
  list.textContent='';
  var tops=items.filter(function(i){return i.parent_id===null});
  if(!tops.length){list.appendChild(el('p','cm-empty','No comments yet. Say hi.'));return}
  var threads=tops.map(function(t){var rs=items.filter(function(i){return i.parent_id===t.id}).sort(function(a,b){return b.created_at-a.created_at});return{t:t,rs:rs,at:Math.max(t.created_at,rs.length?rs[0].created_at:0)}}).sort(function(a,b){return b.at-a.at});
  threads.forEach(function(th){
    var box=el('div','cm-thread');box.appendChild(item(th.t,true));
    th.rs.forEach(function(r){box.appendChild(item(r,false))});
    list.appendChild(box);
  });
}
function load(){fetch(API+'comments'+Q).then(function(r){return r.json()}).then(function(d){render(d.items||[])}).catch(function(){list.textContent='';list.appendChild(el('p','cm-empty','We could not load comments. Refresh to try again.'))})}
function openForm(){form.hidden=false;top.textContent='Cancel'}
function closeForm(){stopReply();form.hidden=true;err.textContent='';top.textContent='Post comment'}
top.addEventListener('click',function(){if(form.hidden){openForm();form.scrollIntoView({behavior:'smooth',block:'center'});(form.name.value?form.body:form.name).focus()}else closeForm()});
function startReply(c){openForm();replyTo=c.id;rep.textContent='';rep.appendChild(document.createTextNode('Replying to '+c.name+' '));var x=el('button','cm-x','Cancel');x.type='button';x.onclick=stopReply;rep.appendChild(x);rep.hidden=false;btn.textContent='Post reply';form.scrollIntoView({behavior:'smooth',block:'center'});form.body.focus()}
function stopReply(){replyTo=null;rep.hidden=true;btn.textContent='Post'}
function del(id){
  var t=tokens(),h={'content-type':'application/json'};if(admin&&!t[id])h.authorization='Bearer '+admin;
  fetch(API+'comment-remove'+Q,{method:'POST',headers:h,body:JSON.stringify({id:id,token:t[id]})}).then(function(){delete t[id];save(t);if(replyTo===id)stopReply();load()});
}
form.addEventListener('submit',function(e){
  e.preventDefault();err.textContent='';btn.disabled=true;
  var body={name:form.name.value,body:form.body.value,website:form.website.value};if(replyTo!==null)body.parent_id=replyTo;
  fetch(API+'comment'+Q,{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify(body)}).then(function(r){return r.json().then(function(d){return{ok:r.ok,d:d}})}).then(function(x){
    btn.disabled=false;
    if(!x.ok){err.textContent=x.d.error||'That did not post. Try again.';return}
    var t=tokens();t[x.d.id]=x.d.token;save(t);form.body.value='';closeForm();
    try{localStorage.setItem('eac.potluck.name',form.name.value)}catch(e){}
    load();
  }).catch(function(){btn.disabled=false;err.textContent='We could not post that. Check your connection and try again.'});
});
try{var n=localStorage.getItem('eac.potluck.name');if(n)form.name.value=n}catch(e){}
load();
setInterval(function(){if(!document.hidden&&document.activeElement!==form.body)load()},20000);
})();
