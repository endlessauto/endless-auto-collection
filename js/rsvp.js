(function(){
var API='/api/potluck/',KEY='eac.rsvp',Q='';
var form=document.getElementById('rvForm');
if(!form)return;
var card=form.closest('.rv'),list=document.getElementById('rvList'),err=document.getElementById('rvErr'),sum=document.getElementById('rvSum'),me=document.getElementById('rvMe'),btns=form.querySelectorAll('[data-s]');
Q=form.dataset.event?'?e='+form.dataset.event:'';KEY+=form.dataset.event?'.'+form.dataset.event:'';
var LABEL={going:'Going',maybe:'Maybe',cant:"Can't"};
function mine(){try{return JSON.parse(localStorage.getItem(KEY))}catch(e){return null}}
function save(v){try{v?localStorage.setItem(KEY,JSON.stringify(v)):localStorage.removeItem(KEY)}catch(e){}}
function el(t,c,x){var n=document.createElement(t);if(c)n.className=c;if(x!=null)n.textContent=x;return n}
var view='going',last=[];
function render(items){
  last=items;
  var by={going:[],maybe:[],cant:[]};items.forEach(function(i){if(by[i.status])by[i.status].push(i)});
  sum.textContent='';
  ['going','maybe','cant'].forEach(function(s){var b=el('button','rv-tab rv-tab-'+s+(view===s?' on':''));b.type='button';b.appendChild(el('b',null,by[s].length));b.appendChild(document.createTextNode(' '+LABEL[s].toLowerCase()));b.onclick=function(){view=s;render(last)};sum.appendChild(b)});
  list.textContent='';
  if(!by[view].length)list.appendChild(el('p','rv-empty','No one yet.'));
  by[view].forEach(function(i){var c=el('span','rv-chip');c.appendChild(el('i',null,i.name.charAt(0).toUpperCase()));c.appendChild(document.createTextNode(i.name));list.appendChild(c)});
  var m=mine();me.textContent='';
  if(m){var cur=items.filter(function(i){return i.id===m.id})[0];
    if(cur){me.appendChild(document.createTextNode('You: '+cur.name+', '+LABEL[cur.status]+'. Tap another answer to change it. '));var x=el('button','rv-x','Remove');x.type='button';x.onclick=remove;me.appendChild(x);
      btns.forEach(function(b){b.classList.toggle('on',b.dataset.s===cur.status)});tint(cur.status)}
    else{save(null);btns.forEach(function(b){b.classList.remove('on')});tint('')}}else tint('')
}
function tint(s){card.className='card rv'+(s?' rv-t-'+s:'')}
function load(){fetch(API+'rsvp-list'+Q).then(function(r){return r.json()}).then(function(d){render(d.items||[])}).catch(function(){})}
function remove(){var m=mine();if(!m)return;fetch(API+'rsvp-remove'+Q,{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify(m)}).then(function(){save(null);btns.forEach(function(b){b.classList.remove('on')});tint('');load()})}
btns.forEach(function(b){b.addEventListener('click',function(){
  err.textContent='';
  var name=form.name.value.trim();
  if(name.length<2){err.textContent='Enter your first name first.';form.name.focus();return}
  var email=form.email.value.trim();
  if(!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)){err.textContent='Enter a valid email so we can send updates.';form.email.focus();return}
  var body={name:name,email:email,status:b.dataset.s,website:form.website.value},m=mine();
  if(m){body.id=m.id;body.token=m.token}
  btns.forEach(function(x){x.disabled=true});
  fetch(API+'rsvp'+Q,{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify(body)}).then(function(r){return r.json().then(function(d){return{ok:r.ok,d:d}})}).then(function(x){
    btns.forEach(function(y){y.disabled=false});
    if(!x.ok){err.textContent=x.d.error||'That did not save. Try again.';return}
    if(!m)save({id:x.d.id,token:x.d.token});
    try{localStorage.setItem('eac.potluck.name',name);localStorage.setItem('eac.potluck.email',email)}catch(e){}
    load();
  }).catch(function(){btns.forEach(function(y){y.disabled=false});err.textContent='We could not save that. Check your connection and try again.'});
})});
try{var n=localStorage.getItem('eac.potluck.name');if(n)form.name.value=n;var em=localStorage.getItem('eac.potluck.email');if(em)form.email.value=em}catch(e){}
load();
})();
