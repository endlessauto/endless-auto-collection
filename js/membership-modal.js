(function(){
var P={coupe:{n:'Coupe',a:[270,280]},sedan:{n:'Sedan',a:[300,310]},suv:{n:'SUV',a:[360,370]}};
var css='.mm{position:fixed;inset:0;z-index:200;display:none;align-items:center;justify-content:center;padding:1rem;background:rgba(0,0,0,.85)}.mm.open{display:flex}'
+'.mm-box{position:relative;width:100%;max-width:32rem;max-height:92vh;overflow:auto;background:radial-gradient(circle at 15% 0%,rgba(212,175,55,.14),transparent 55%),#0b0b0b;border:1px solid rgba(212,175,55,.45);border-radius:1.4rem;padding:1.6rem;color:#e4e4e7;text-align:left}'
+'.mm-x{position:absolute;top:.6rem;right:.9rem;background:none;border:0;color:#fff;font-size:2rem;line-height:1;cursor:pointer}'
+'.mm-eye{font-size:.75rem;letter-spacing:3px;font-weight:600;color:#f0c869;text-transform:uppercase;margin:0}'
+'.mm-h{font-family:"Space Grotesk",Inter,sans-serif;font-size:1.5rem;line-height:1.15;color:#fff;margin:.5rem 2rem 1.1rem 0;font-weight:700}'
+'.mm-pick{display:flex;gap:.4rem;margin-bottom:1rem}.mm-pick button{flex:1;background:#101010;border:1px solid #2a2a2a;border-radius:.7rem;color:#a1a1aa;font:inherit;font-weight:600;font-size:.9rem;padding:.6rem;cursor:pointer}.mm-pick button[aria-pressed=true]{border-color:#d4af37;color:#f0c869;background:rgba(212,175,55,.1)}'
+'.mm-opt{background:#101010;border:1px solid #232323;border-radius:1rem;padding:1rem 1.1rem;margin-bottom:.6rem}.mm-opt.best{border-color:rgba(212,175,55,.55)}'
+'.mm-n{color:#fff;font-weight:600;margin:0}.mm-tag{display:inline-block;margin-left:.4rem;font-size:.65rem;letter-spacing:1.5px;padding:.15rem .5rem;border-radius:9999px;background:linear-gradient(145deg,#f5dfa0,#d4af37 50%,#9c7a22);color:#140f00;vertical-align:middle}'
+'.mm-p{display:flex;align-items:baseline;gap:.9rem;font-family:"Space Grotesk",Inter,sans-serif;font-weight:700;line-height:1;margin:.5rem 0 .4rem}.mm-p s{font-size:1.9rem;color:#777;text-decoration-thickness:3px;text-decoration-color:#e5453d}.mm-free{font-size:2.6rem;background:linear-gradient(145deg,#f5dfa0,#d4af37 50%,#b08a2a);-webkit-background-clip:text;background-clip:text;color:transparent}'
+'.mm-s{color:#8a8a93;font-size:.85rem;margin:0}.mm-fine{color:#777;font-size:.8rem;line-height:1.5;margin:.9rem 0 0}'
+'.mm-go{display:block;text-align:center;text-decoration:none;margin-top:1rem;border-radius:.9rem;padding:.9rem 1rem;font-weight:600;color:#140f00;background:linear-gradient(145deg,#f5dfa0 0%,#d4af37 45%,#9c7a22 100%)}'
+'[data-membership]{cursor:pointer}';
var st=document.createElement('style');st.textContent=css;document.head.appendChild(st);
var m=document.createElement('div');m.className='mm';m.setAttribute('role','dialog');m.setAttribute('aria-modal','true');m.setAttribute('aria-labelledby','mmH');
m.innerHTML='<div class="mm-box"><button class="mm-x" type="button" aria-label="Close">&times;</button><p class="mm-eye">Monthly package</p><h2 class="mm-h" id="mmH">Detail it on a schedule and pay less per visit.</h2><div class="mm-pick" role="group" aria-label="Choose your vehicle type"></div><div id="mmBody"></div><p class="mm-fine">Final price confirmed after we inspect the car. Prices updated November 2026. Wax is not part of a full detail.</p><a class="mm-go" href="/detailing">See all detailing prices</a></div>';
document.body.appendChild(m);
var pick=m.querySelector('.mm-pick'),body=m.querySelector('#mmBody'),cur='sedan',last;
Object.keys(P).forEach(function(k){var b=document.createElement('button');b.type='button';b.textContent=P[k].n;b.dataset.v=k;b.onclick=function(){cur=k;draw()};pick.appendChild(b)});
function opt(t,x,best,cnt){return '<div class="mm-opt best"><p class="mm-n">'+cnt+' full details in a month</p><p class="mm-p"><s>$'+x[0]+'</s><span class="mm-free">Free</span></p><p class="mm-s">'+t.n+': '+cnt+' single full details cost $'+x[1]+'.</p></div>'}
function draw(){var t=P[cur];body.innerHTML=opt(t,t.a,0,2);[].forEach.call(pick.children,function(b){b.setAttribute('aria-pressed',b.dataset.v===cur?'true':'false')})}
function open(){last=document.activeElement;draw();m.classList.add('open');document.body.style.overflow='hidden';m.querySelector('.mm-x').focus()}
function close(){m.classList.remove('open');document.body.style.overflow='';if(last)last.focus()}
m.addEventListener('click',function(e){if(e.target===m||e.target.closest('.mm-x'))close()});
document.addEventListener('keydown',function(e){if(e.key==='Escape'&&m.classList.contains('open'))close()});
document.addEventListener('click',function(e){var t=e.target.closest('[data-membership]');if(t){e.preventDefault();open()}});
})();
