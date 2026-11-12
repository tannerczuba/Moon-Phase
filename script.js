// This self-running function keeps the page code together and avoids adding its variables to the browser’s global space.
(function(){
// Strict mode makes JavaScript catch some accidental mistakes, such as using an undeclared variable.
"use strict";
// If the page is embedded inside another page (a frame), clear it and stop; this limits unwanted embedding.
if(window.top!==window.self){document.documentElement.textContent="";return}
// SYN is the average synodic month: the time from one matching moon phase to the next. DAY is milliseconds per day; REF is a known new-moon reference time in UTC (the worldwide time standard).
var SYN=29.530588853, DAY=86400000, REF=Date.UTC(2000,0,6,18,14);
// $ is a short helper that finds an HTML element by its id, such as the element named "moon".
var $=function(id){return document.getElementById(id)};
// current holds the date currently being shown.
var current=new Date();

// Return the moon’s age in days at time t. The remainder operator (%) wraps the value into one lunar cycle; the adjustment keeps it nonnegative.
function age(t){var a=((t-REF)/DAY)%SYN;return a<0?a+SYN:a}
// Match the moon’s age to one of the eight familiar phase names. These cutoffs divide the cycle into approximate phase ranges.
function nameFor(a){
  if(a<1.84566||a>=27.68493)return"New Moon";
  if(a<5.53699)return"Waxing Crescent";
  if(a<9.22831)return"First Quarter";
  if(a<12.91963)return"Waxing Gibbous";
  if(a<16.61096)return"Full Moon";
  if(a<20.30228)return"Waning Gibbous";
  if(a<23.99361)return"Last Quarter";
  return"Waning Crescent";
}
// Build SVG shape outlines for the lit and shaded portions. SVG paths describe drawing commands; cosine determines how wide the lit side looks.
function draw(a){
  var r=100,f=a/SYN,k=Math.cos(2*Math.PI*f),rx=(Math.abs(k)*r).toFixed(2),d;
  if(f<0.5){d="M0,-100 A100,100 0 0 1 0,100 A"+rx+",100 0 0 "+(k>0?0:1)+" 0,-100 Z"}
  else{d="M0,-100 A100,100 0 0 0 0,100 A"+rx+",100 0 0 "+(k>0?1:0)+" 0,-100 Z"}
  $("litpath").setAttribute("d",d);
  $("shade").setAttribute("d","M-104,0 A104,104 0 1 0 104,0 A104,104 0 1 0 -104,0 Z "+d);
}
// Turn a time in milliseconds into a readable date using the visitor’s locale (their browser’s language and regional date style).
function fmt(ms){return new Date(ms).toLocaleDateString(undefined,{weekday:"short",month:"short",day:"numeric",year:"numeric"})}
// Format a date as YYYY-MM-DD, the format required by a date input.
function toInput(d){
  var m=("0"+(d.getMonth()+1)).slice(-2),day=("0"+d.getDate()).slice(-2);
  return d.getFullYear()+"-"+m+"-"+day;
}
// Update every displayed moon fact and redraw the illustration for the chosen date. Illumination is the estimated fraction of the visible disk lit by the Sun.
function render(d){
  var t=d.getTime(),a=age(t),ill=(1-Math.cos(2*Math.PI*a/SYN))/2;
  var nf=t+((SYN/2-a+SYN)%SYN)*DAY, nn=t+(SYN-a)*DAY;
  draw(a);
  $("name").textContent=nameFor(a);
  $("when").textContent=fmt(t);
  $("illum").textContent=Math.round(ill*100)+"%";
  $("age").textContent=a.toFixed(1)+" days into a "+SYN.toFixed(1)+"-day cycle";
  $("nfull").textContent=fmt(nf);
  $("nnew").textContent=fmt(nn);
  $("date").value=toInput(d);
  $("moon").setAttribute("aria-label","Moon phase: "+nameFor(a)+", "+Math.round(ill*100)+"% illuminated");
  $("err").textContent="";
}
// Move the chosen date by n days; using midday helps avoid date changes caused by time-zone clock shifts.
function shift(n){var d=new Date(current.getFullYear(),current.getMonth(),current.getDate()+n,12);setDate(d)}
// Accept a date only when it is valid and inside the page’s supported years.
function setDate(d){
  if(isNaN(d.getTime())||d.getFullYear()<1900||d.getFullYear()>2100){
    $("err").textContent="Choose a date between 1900 and 2100.";return;
  }
  current=d;render(d);
}
// A click listener runs a function when a visitor activates a button. These listeners connect the date controls to the date-changing functions.
$("prev").addEventListener("click",function(){shift(-1)});
$("next").addEventListener("click",function(){shift(1)});
$("today").addEventListener("click",function(){setDate(new Date())});
// When the date field changes, check its exact YYYY-MM-DD shape and make sure the calendar date really exists (for example, reject February 30).
$("date").addEventListener("change",function(){
  var m=/^(\d{4})-(\d{2})-(\d{2})$/.exec(this.value);
  if(!m){$("err").textContent="Enter a valid date.";return}
  var y=+m[1],mo=+m[2]-1,dd=+m[3],d=new Date(2000,0,1,12);
  d.setFullYear(y,mo,dd);
  if(d.getFullYear()!==y||d.getMonth()!==mo||d.getDate()!==dd){$("err").textContent="Enter a valid date.";return}
  setDate(d);
});
// Save the hemisphere choice and rotate the moon image when the checkbox changes.
$("south").addEventListener("change",function(){$("moon").classList.toggle("south",this.checked);prefs.south=this.checked;savePrefs()});
// localStorage is a small browser-only store that remembers choices on this device. KEY names this page’s stored settings; raw starts as an empty object.
var KEY="moonPhaseSettings",raw={};
// JSON is a text format for structured data. Parse saved text carefully because old, missing, or invalid data must not stop the page.
try{var parsed=JSON.parse(localStorage.getItem(KEY));if(parsed&&typeof parsed==="object"&&!Array.isArray(parsed))raw=parsed}catch(e){}
// prefs holds the usable settings. Type checks keep unexpected saved values from being used.
var prefs={region:typeof raw.region==="string"?raw.region:"",south:raw.south===true,photo:raw.photo!==false};
// Convert the settings back to JSON text and save them; try/catch handles browsers where storage is unavailable.
function savePrefs(){try{localStorage.setItem(KEY,JSON.stringify(prefs))}catch(e){}}
// Restore the saved hemisphere display when the page opens.
if(prefs.south){$("south").checked=true;$("moon").classList.add("south")}
// PHOTO is the image filename; photoOK tracks whether the browser successfully loaded it.
var PHOTO="moon.jpg",photoOK=false;
// Show the photo only if it was loaded successfully and the visitor wants it.
function setPhoto(on){$("moon").classList.toggle("photo",on&&photoOK)}
// Load a test image so the photo option is enabled only when moon.jpg is available.
var probe=new Image();
// onload runs after a successful image download; onerror handles a missing or unreadable image.
probe.onload=function(){
  photoOK=true;$("photo").setAttribute("href",PHOTO);
  $("usephoto").disabled=false;$("usephoto").checked=prefs.photo;setPhoto(prefs.photo);
};
probe.onerror=function(){$("photonote").textContent="Photo not found. Add moon.jpg next to index.html to show a real moon."};
probe.src=PHOTO;
// Remember the visitor’s choice when they turn the photo option on or off.
$("usephoto").addEventListener("change",function(){setPhoto(this.checked);prefs.photo=this.checked;savePrefs()});
// REG lists region codes and their display names. These short codes connect the menu to the eclipse visibility data below.
var REG=[["na","North America (US & Canada)"],["ca","Mexico, Central America & Caribbean"],["sa","South America"],["eu","Europe"],["af","Africa"],["me","Middle East"],["as","Asia (South, East & North)"],["se","Southeast Asia"],["oc","Australia, New Zealand & Pacific"],["an","Antarctica"]];
// Visibility codes: v means visible in the region, c means the central/full event path crosses it, and p means only a partial event is visible.
var ALL="na:v,ca:v,sa:v,eu:v,af:v,me:v,as:v,se:v,oc:v,an:v";
// Reusable plain-language descriptions keep eclipse notes consistent.
var SUB="Very subtle shading of the Moon. Hard to notice by eye.";
var RED="The Moon passes fully into Earth's shadow and can turn red. ";
var PAR="Part of the Moon enters Earth's dark shadow. ";
// EV contains the eclipse schedule. Each entry stores date, kind (s=solar or l=lunar), event type, region visibility codes, and a description. The final map step turns the compact region codes into a lookup object.
var EV=[
["2027-02-06","s","Annular","sa:c,af:c,an:p","Annular in Chile, Argentina, Uruguay, Brazil, and West Africa from Ivory Coast to Nigeria. Partial across much of South America, Africa, and Antarctica."],
["2027-02-20","l","Penumbral",ALL,SUB],
["2027-07-18","l","Penumbral","af:v,me:v,as:v,se:v,oc:v",SUB],
["2027-08-02","s","Total","eu:c,af:c,me:c,na:p,se:p","Totality crosses southern Spain, North Africa, Saudi Arabia, and Yemen. Partial across most of Europe, much of Africa, the Middle East, Southeast Asia, eastern Canada, and northern Maine."],
["2027-08-17","l","Penumbral","na:v,ca:v,sa:v,an:v,af:v,eu:v,as:v,se:v,oc:v",SUB+" Seen from the Americas, West Africa, parts of western Europe, Australia, New Zealand, eastern Russia, and Southeast Asia."],
["2028-01-12","l","Partial","na:v,ca:v,sa:v,eu:v,af:v",PAR+"Visible from the Americas, Europe, and Africa."],
["2028-01-26","s","Annular","sa:c,eu:c,ca:p,na:p,af:p","Annular in Ecuador, Peru, Brazil, Portugal, and Spain. Partial in surrounding areas of the Americas, western Europe, and northwest Africa."],
["2028-07-06","l","Partial","eu:v,af:v,me:v,as:v,se:v,oc:v",PAR+"Visible from Europe, Africa, Asia, and Australia."],
["2028-07-22","s","Total","oc:c,se:p","Totality crosses the Indian Ocean, Australia, New Zealand, and the South Pacific. Partial across Southeast Asia and Indonesia."],
["2028-12-31","l","Total","eu:v,af:v,me:v,as:v,se:v,oc:v",RED+"Visible from Europe, Africa, Asia, Australia, and the Pacific."],
["2029-01-14","s","Partial","na:p","Partial eclipse in northern North America, near the Arctic."],
["2029-06-12","s","Partial","na:p,eu:p,as:p","Small partial eclipse visible only in the far north: the Arctic, northern Europe, northern Asia, and northern Canada."],
["2029-06-26","l","Total","na:v,ca:v,sa:v,eu:v,af:v,me:v",RED+"Visible from the Americas, Europe, Africa, and the Middle East."],
["2029-07-11","s","Partial","sa:p,an:p","Small partial eclipse visible from Antarctica and the southern tip of South America."],
["2029-12-05","s","Partial","an:p","Partial eclipse visible mainly from Antarctica and the Southern Ocean."],
["2029-12-20","l","Total","na:v,ca:v,sa:v,eu:v,af:v,me:v,as:v",RED+"Visible from the Americas, Europe, Africa, and Asia."],
["2030-06-01","s","Annular","eu:c,af:c,as:c,me:p","The annular path crosses parts of North Africa, Europe, and Asia. Partial across a wide area of Europe, Asia, and northern Africa."],
["2030-06-15","l","Partial","eu:v,af:v,me:v,as:v,se:v,oc:v",PAR+"Visible from Europe, Africa, Asia, and Australia."],
["2030-11-25","s","Total","af:c,oc:c","Totality crosses Botswana, South Africa, Lesotho, the Indian Ocean, and Australia. Partial across southern Africa and Australia."],
["2030-12-09","l","Penumbral","na:v,ca:v,sa:v,eu:v,af:v,me:v,as:v",SUB]
].map(function(e){var m={};e[3].split(",").forEach(function(q){var z=q.split(":");m[z[0]]=z[1]});return{date:e[0],kind:e[1],type:e[2],map:m,note:e[4]}});
// Read a YYYY-MM-DD date as a local date at midday, avoiding most time-zone boundary problems.
function ld(x){var q=x.split("-");return new Date(+q[0],+q[1]-1,+q[2],12)}
// Create an HTML element (tag), optionally give it a CSS class, and optionally add safe plain text.
function el(tag,cls,txt){var n=document.createElement(tag);if(cls)n.className=cls;if(txt!==undefined)n.textContent=txt;return n}
// Calculate how many whole days remain until an eclipse and express the result in everyday words.
function until(x){var n=Math.round((ld(x)-ld(toInput(new Date())))/DAY);return n<=0?"today":n===1?"tomorrow":"in "+n+" days"}
// Build one eclipse summary card. If there is no matching event, show a clear empty-state message instead.
function card(label,ev,r){
  var c=el("div","card");c.appendChild(el("div","k",label));
  if(!ev){c.appendChild(el("div","d","None through 2030"));c.appendChild(el("p","w","No eclipse of this kind is visible from this region in the list."));return c}
  c.appendChild(el("div","d",fmt(ld(ev.date).getTime())));
  c.appendChild(el("div","t",ev.type+" eclipse, "+until(ev.date)));
  var here=ev.kind==="l"?"Visible from your region. ":ev.map[r]==="c"?ev.type+" eclipse visible in parts of your region. ":"Partial eclipse visible in your region. ";
  c.appendChild(el("p","w",here+ev.note));return c;
}
// Refresh the eclipse cards and list when the visitor selects a region. replaceChildren removes the old results before new ones are added.
function renderEcl(){
  var r=$("region").value,box=$("eclcards"),ul=$("ecllist");
  box.replaceChildren();ul.replaceChildren();
  if(!r){$("eclhead2").hidden=true;box.appendChild(el("p","note","Choose your region to see the next solar and lunar eclipses you can watch."));return}
  var today=toInput(new Date());
  var up=EV.filter(function(e){return e.date>=today&&e.map[r]});
  var s1=up.filter(function(e){return e.kind==="s"})[0],l1=up.filter(function(e){return e.kind==="l"})[0];
  box.appendChild(card("Next solar eclipse",s1,r));box.appendChild(card("Next lunar eclipse",l1,r));
  $("eclhead2").hidden=false;
  up.forEach(function(e){var li=el("li");li.appendChild(el("strong",null,fmt(ld(e.date).getTime())));
    li.appendChild(document.createTextNode(" "+e.type+" "+(e.kind==="s"?"solar":"lunar")+" eclipse"));ul.appendChild(li)});
}
// Fill the region menu from REG, then restore its saved selection if it is still a recognized region.
var sel=$("region");
var o0=el("option",null,"Choose a region…");o0.value="";sel.appendChild(o0);
REG.forEach(function(g){var o=el("option",null,g[1]);o.value=g[0];sel.appendChild(o)});
if(REG.some(function(g){return g[0]===prefs.region}))sel.value=prefs.region;
sel.addEventListener("change",function(){prefs.region=sel.value;savePrefs();renderEcl()});
// Reset removes saved preferences and returns the visible controls to their starting choices.
$("reset").addEventListener("click",function(){
  try{localStorage.removeItem(KEY)}catch(e){}
  prefs={region:"",south:false,photo:true};
  $("south").checked=false;$("moon").classList.remove("south");
  if(photoOK){$("usephoto").checked=true;setPhoto(true)}
  sel.value="";renderEcl();
});
// Draw eclipse information once when the page first opens.
renderEcl();
render(current);
})();
