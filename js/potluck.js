(function(){
var API='/api/potluck/',KEY='eac.potluck.tokens',Q='';
var form=document.getElementById('pkForm'),list=document.getElementById('pkList'),err=document.getElementById('pkErr'),btn=document.getElementById('pkBtn'),cancel=document.getElementById('pkCancel'),editing=null,count=document.getElementById('pkCount');
if(!form)return;
Q=form.dataset.event?'?e='+form.dataset.event:'';KEY+=form.dataset.event?'.'+form.dataset.event:'';
function tokens(){try{return JSON.parse(localStorage.getItem(KEY))||{}}catch(e){return{}}}
function save(t){try{localStorage.setItem(KEY,JSON.stringify(t))}catch(e){}}
function el(tag,cls,text){var n=document.createElement(tag);if(cls)n.className=cls;if(text!=null)n.textContent=text;return n}
function render(items){
  var mine=tokens();list.textContent='';
  count.textContent=items.length?items.length+(items.length===1?' dish so far':' dishes so far'):'';
  if(!items.length){list.appendChild(el('p','pk-empty','Nothing here yet. Be the first to pick a dish.'));return}
  items.forEach(function(it){
    var row=el('div','pk-row');
    row.appendChild(el('span','pk-cat',it.category));
    var t=el('div','pk-t');t.appendChild(el('b',null,it.dish));t.appendChild(el('small',null,it.name));row.appendChild(t);
    if(mine[it.id]){var acts=el('div','pk-acts');var ed=el('button','pk-x','Edit');ed.type='button';ed.onclick=function(){startEdit(it)};var x=el('button','pk-x','Remove');x.type='button';x.onclick=function(){remove(it.id)};acts.appendChild(ed);acts.appendChild(x);row.appendChild(acts)}
    list.appendChild(row);
  });
}
function load(){fetch(API+'list'+Q).then(function(r){return r.json()}).then(function(d){render(d.items||[])}).catch(function(){list.textContent='';list.appendChild(el('p','pk-empty','We could not load the list. Refresh to try again.'))})}
function startEdit(it){editing=it.id;form.name.value=it.name;form.dish.value=it.dish;form.category.value=it.category;btn.textContent='Save changes';cancel.hidden=false;err.textContent='';form.dish.focus()}
function stopEdit(){editing=null;form.dish.value='';btn.textContent="I'm bringing this";cancel.hidden=true}
cancel.addEventListener('click',stopEdit);
function remove(id){if(editing===id)stopEdit();var t=tokens();fetch(API+'remove'+Q,{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({id:id,token:t[id]})}).then(function(){delete t[id];save(t);load()})}
form.addEventListener('submit',function(e){
  e.preventDefault();err.textContent='';btn.disabled=true;
  var body={name:form.name.value,dish:form.dish.value,category:form.category.value,website:form.website.value};
  var edit=editing!==null;if(edit){body.id=editing;body.token=tokens()[editing]}
  fetch(API+(edit?'edit':'add')+Q,{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify(body)}).then(function(r){return r.json().then(function(d){return{ok:r.ok,d:d}})}).then(function(x){
    btn.disabled=false;
    if(!x.ok){err.textContent=x.d.error||'Something did not save. Try again.';return}
    if(edit){stopEdit()}else{var t=tokens();t[x.d.id]=x.d.token;save(t);form.dish.value=''}load();
  }).catch(function(){btn.disabled=false;err.textContent='We could not save that. Check your connection and try again.'});
});
try{var n=localStorage.getItem('eac.potluck.name');if(n)form.name.value=n}catch(e){}
form.name.addEventListener('change',function(){try{localStorage.setItem('eac.potluck.name',form.name.value)}catch(e){}});
load();
})();
