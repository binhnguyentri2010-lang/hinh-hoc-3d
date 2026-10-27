/* ĐÃ ĐÓNG BĂNG — KHÔNG SỬA FILE NÀY.

   Trích nguyên văn legacy/index.html dòng 68–549 bằng tools/freeze_reference.py.
   Đây là phần lõi của bản prototype đầu tiên: toán vector, định dạng số, đọc đề,
   dựng hình, giải toán. Không phụ thuộc three.js.

   Vai trò: máy chấm. Bộ test chạy song song bản này với bản mới trong src/ và so
   từng con số, từng câu lập luận. Bản mới lệch đi ở đâu là biết ngay ở đó.

   Muốn đổi hành vi (ví dụ siết surd() ở Giai đoạn 1) thì sửa bên src/ rồi cập nhật
   danh sách sai lệch có chủ ý trong tests/cases.js — tuyệt đối không sửa file này. */

/* ================= vector math ================= */
const sub=(a,b)=>[a[0]-b[0],a[1]-b[1],a[2]-b[2]], add=(a,b)=>[a[0]+b[0],a[1]+b[1],a[2]+b[2]];
const mul=(a,k)=>[a[0]*k,a[1]*k,a[2]*k], dot=(a,b)=>a[0]*b[0]+a[1]*b[1]+a[2]*b[2];
const cross=(a,b)=>[a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]];
const len=a=>Math.hypot(a[0],a[1],a[2]), mid=(a,b)=>mul(add(a,b),.5);
const avg=ps=>mul(ps.reduce(add,[0,0,0]),1/ps.length);
const normal=(p,q,r)=>cross(sub(q,p),sub(r,p));
const projPlane=(x,p,n)=>sub(x,mul(n,dot(n,sub(x,p))/dot(n,n)));
const projLine=(x,p,d)=>add(p,mul(d,dot(d,sub(x,p))/dot(d,d)));
function closest(p1,p2,p3,p4){ // closest points of two lines
  const d1=sub(p2,p1),d2=sub(p4,p3),r=sub(p1,p3),a=dot(d1,d1),e=dot(d2,d2),f=dot(d2,r),c=dot(d1,r),b=dot(d1,d2),den=a*e-b*b;
  if(Math.abs(den)<1e-12) return [p1,projLine(p1,p3,d2)];
  const s=(b*f-c*e)/den,t=(a*f-b*c)/den; return [add(p1,mul(d1,s)),add(p3,mul(d2,t))];
}
function circum(A,B,C){const a=sub(A,C),b=sub(B,C),axb=cross(a,b);return add(C,mul(cross(sub(mul(b,dot(a,a)),mul(a,dot(b,b))),axb),1/(2*dot(axb,axb))));}
function incenter(A,B,C){const a=len(sub(B,C)),b=len(sub(C,A)),c=len(sub(A,B));return mul(add(add(mul(A,a),mul(B,b)),mul(C,c)),1/(a+b+c));}
function polyArea(ps){let s=[0,0,0];for(let i=0;i<ps.length;i++)s=add(s,cross(ps[i],ps[(i+1)%ps.length]));return len(s)/2;}

/* ================= number formatting ================= */
const gcd=(a,b)=>b?gcd(b,a%b):a;
function surd(v){
  v=Math.abs(v); if(v<1e-9) return {s:0,k:1,q:1};
  for(let q=1;q<=36;q++){const n=v*v*q*q,r=Math.round(n);
    if(r>0&&r<200000&&Math.abs(n-r)<1e-7*Math.max(1,n)){let s=1,k=r;for(let i=2;i*i<=k;i++)while(k%(i*i)===0){k/=i*i;s*=i;}const g=gcd(s,q);return {s:s/g,k,q:q/g};}}
  return null;
}
function fmt(v,pow=1){
  const u=['','a','a²','a³'][pow], r=surd(v), ap=`${+v.toFixed(4)}${u}`;
  if(!r) return '≈ '+ap; if(r.s===0) return '0';
  let str=(r.s===1&&(r.k>1||u)?'':r.s)+u+(r.k>1?'√'+r.k:''); if(!str) str='1'; if(r.q>1) str+='/'+r.q;
  return (r.k>1||r.q>1)? `${str}  (≈ ${ap})` : str;
}
function fmtAng(rad){
  const d=rad*180/Math.PI, rd=Math.round(d);
  if(Math.abs(d-rd)<1e-6) return rd+'°';
  const tn=surd(Math.tan(rad)); let extra='';
  if(tn&&tn.q<=12){let s=(tn.s===1&&tn.k>1?'':tn.s)+(tn.k>1?'√'+tn.k:'');if(tn.q>1)s+='/'+tn.q;extra=` (tan = ${s})`;}
  return `≈ ${d.toFixed(2)}°${extra}`;
}

/* ================= parsing ================= */
const LEN="((?:\\d+(?:[.,]\\d+)?\\s*)?a|\\d+(?:[.,]\\d+)?)(?:\\s*√\\s*(\\d+))?(?:\\s*\\/\\s*(\\d+))?(?![\\w°√]|\\s*độ)";
const DEG="(\\d+(?:[.,]\\d+)?)";
function lenVal(c,r,d){c=c.replace(/\s/g,'').replace(',','.');let v=c.endsWith('a')?(c.length>1?parseFloat(c):1):parseFloat(c);if(r)v*=Math.sqrt(+r);if(d)v/=+d;return v;}
function norm(s){
  return s.replace(/[’‘`´′]/g,"'")
    .replace(/([A-ZĐ])(?=[a-zđà-ỹ])/g,c=>c.toLowerCase())
    .replace(/([ÀÁÂÃÈÉÊÌÍÒÓÔÕÙÚĂƠƯẠ-Ỹ])/g,c=>c.toLowerCase())
    .replace(/căn\s*(?:bậc\s*hai\s*(?:của\s*)?)?\(?\s*(\d+)\s*\)?/g,'√$1')
    .replace(/sqrt\s*\(?\s*(\d+)\s*\)?/g,'√$1')
    .replace(/(\d*)\s*√(\d+)\s*a(?![a-zà-ỹđ])/g,'$1a√$2')
    .replace(/(?:mặt phẳng|mp)\s*\(/g,'(')
    .replace(/\s+/g,' ');
}
const toks=s=>(s||'').match(/[A-Z]'?/g)||[];

function solve(raw){
  const t=norm(raw), W=[], lens={}, K=(p,q)=>[p,q].sort().join('|'), L=(p,q)=>lens[K(p,q)];
  for(const m of t.matchAll(new RegExp(`((?:(?<![A-Z'])[A-Z]'?[A-Z]'?\\s*(?:=|bằng)\\s*)+)${LEN}`,'g'))){
    const v=lenVal(m[2],m[3],m[4]);
    for(const q of m[1].matchAll(/([A-Z]'?)([A-Z]'?)\s*(?:=|bằng)/g)) lens[K(q[1],q[2])]=v;
  }
  const num1=re=>{const m=t.match(new RegExp(re+LEN));return m?lenVal(m[1],m[2],m[3]):undefined;};
  const baseSide=num1("cạnh\\s*(?:đáy\\s*)?(?:đều\\s*)?(?:bằng|là|=|có độ dài(?:\\s*bằng)?)?\\s*");
  const lateral=num1("cạnh bên\\s*(?:đều\\s*)?(?:bằng|là|=|có độ dài(?:\\s*bằng)?)?\\s*");
  const heightV=num1("(?:chiều cao|đường cao)[^.;,=]{0,25}?(?:bằng|là|=)?\\s*");

  const pts={}, faces=[], S={kind:null,apex:null,base:[],top:[]};
  let m;

  /* ---------- base polygon in plane z=0 ---------- */
  function base2D(names){
    const n=names.length, s=baseSide ?? L(names[0],names[1]) ?? 1, P={};
    const set=(nm,x,y)=>P[nm]=[x,y,0];
    if(n===3){
      const [A,B,C]=names;
      const tm=t.match(new RegExp(`tam giác\\s*(?:${names.join('')})?\\s*(đều|vuông cân|vuông|cân)(?:\\s*tại\\s*([A-Z]))?`));
      const kind=/tứ diện đều|tam giác đều/.test(t)&&!(tm&&tm[1]!=='đều')?'đều':tm?tm[1]:null;
      if(kind==='đều'){set(A,0,0);set(B,s,0);set(C,s/2,s*Math.sqrt(3)/2);}
      else if(kind&&kind.startsWith('vuông')&&tm[2]&&names.includes(tm[2])){
        const X=tm[2],[o1,o2]=names.filter(v=>v!==X),h=L(o1,o2);
        let a1=L(X,o1),a2=L(X,o2);
        if(kind==='vuông cân'){a1=a1??a2??(h?h/Math.SQRT2:s);a2=a1;}
        if(a1==null&&a2!=null&&h)a1=Math.sqrt(h*h-a2*a2); if(a2==null&&a1!=null&&h)a2=Math.sqrt(h*h-a1*a1);
        a1=a1??s;a2=a2??a1; set(X,0,0);set(o1,a1,0);set(o2,0,a2);
      } else if(kind==='cân'&&tm[2]&&names.includes(tm[2])){
        const X=tm[2],[o1,o2]=names.filter(v=>v!==X),b=L(o1,o2)??s,l=L(X,o1)??L(X,o2);
        const h=l&&l>b/2?Math.sqrt(l*l-b*b/4):b; set(o1,0,0);set(o2,b,0);set(X,b/2,h);
      } else {
        const a=L(B,C),b=L(C,A),c=L(A,B)??s;
        if(a&&b){const x=(b*b+c*c-a*a)/(2*c);set(A,0,0);set(B,c,0);set(C,x,Math.sqrt(Math.max(b*b-x*x,1e-6)));}
        else{set(A,0,0);set(B,c,0);set(C,c*.3,c*.85);}
      }
    } else if(n===4){
      const [A,B,C,D]=names;
      if(/thang/.test(t)){
        let Q=[A,B,C,D];
        const pm=t.match(/([A-Z])([A-Z])\s*(?:\/\/|∥|song song(?:\s*với)?)\s*([A-Z])([A-Z])/);
        const rm=t.match(/vuông\s*tại\s*([A-Z])\s*(?:và|,)\s*([A-Z])/);
        const pair=pm?[pm[1],pm[2]]:rm?null:[A,B];
        if(pair){const st=new Set(pair);if((st.has(B)&&st.has(C))||(st.has(D)&&st.has(A)))Q=[B,C,D,A];}
        else{const st=new Set([rm[1],rm[2]]);if((st.has(A)&&st.has(B))||(st.has(C)&&st.has(D)))Q=[B,C,D,A];}
        const L1=L(Q[0],Q[1])??2*s/(L(Q[0],Q[1])?1:1), L2=L(Q[2],Q[3])??L1/2;
        const r1=t.match(/vuông\s*tại\s*([A-Z])/), rv=r1?r1[1]:null;
        let h;
        if(rv&&(rv===Q[0]||rv===Q[3])){h=L(Q[0],Q[3])??L1/2;set(Q[0],0,0);set(Q[1],L1,0);set(Q[2],L2,h);set(Q[3],0,h);}
        else if(rv&&(rv===Q[1]||rv===Q[2])){h=L(Q[1],Q[2])??L1/2;set(Q[0],0,0);set(Q[1],L1,0);set(Q[2],L1,h);set(Q[3],L1-L2,h);}
        else{const leg=L(Q[0],Q[3])??L(Q[1],Q[2]),dx=(L1-L2)/2;h=leg&&leg>Math.abs(dx)?Math.sqrt(leg*leg-dx*dx):L1/2;
          set(Q[0],0,0);set(Q[1],L1,0);set(Q[3],dx,h);set(Q[2],dx+L2,h);}
      } else if(/thoi|bình hành/.test(t)){
        const s2=/thoi/.test(t)?s:(L(A,D)??L(B,C)??s*1.5);
        const am=t.match(/góc\s*([A-Z])([A-Z])([A-Z])\s*(?:=|bằng)\s*(\d+)/);
        let ang=60; if(am){ang=+am[4]; if(am[2]===B||am[2]===D) ang=180-ang;}
        const r=ang*Math.PI/180; set(A,0,0);set(B,s,0);set(D,s2*Math.cos(r),s2*Math.sin(r));set(C,s+s2*Math.cos(r),s2*Math.sin(r));
      } else if(/tứ giác/.test(t)&&!/tứ giác đều/.test(t)){
        const k=baseSide??1; set(A,0,0);set(B,2.4*k,0);set(C,1.9*k,1.8*k);set(D,.5*k,1.2*k);
      } else {
        const sq=/hình vuông|tứ giác đều|lập phương/.test(t)||!/chữ nhật|hình hộp/.test(t);
        let s1=L(A,B)??L(C,D)??baseSide??1, s2=L(B,C)??L(A,D);
        const dg=L(A,C)??L(B,D);
        if(sq){ if(!L(A,B)&&!baseSide&&dg) s1=dg/Math.SQRT2; s2=s1; }
        else s2=s2??(dg&&dg>s1?Math.sqrt(dg*dg-s1*s1):s1*1.6);
        set(A,0,0);set(B,s1,0);set(C,s1,s2);set(D,0,s2);
      }
    } else {
      const R=s/(2*Math.sin(Math.PI/n));
      names.forEach((nm,i)=>{const a=2*Math.PI*i/n-Math.PI/2-Math.PI/n;set(nm,R*Math.cos(a),R*Math.sin(a));});
    }
    return P;
  }

  /* ---------- derived points ---------- */
  const derived=[]; let structNames=new Set();
  function refPoint(kind,letters){
    const ns=toks(letters);
    if(!ns.every(n=>pts[n]))return null;
    if(/trung điểm/.test(kind)&&ns.length===2) return mid(pts[ns[0]],pts[ns[1]]);
    if(/tâm|giao điểm|trọng tâm/.test(kind)){
      const use=ns.length>=3?ns:S.base; if(!use.length)return null;
      if(/ngoại tiếp/.test(kind)&&use.length===3) return circum(...use.map(n=>pts[n]));
      if(/nội tiếp/.test(kind)&&use.length===3) return incenter(...use.map(n=>pts[n]));
      if(/giao điểm/.test(kind)&&use.length===4&&!/trọng tâm/.test(kind)){const [a,b,c,d]=use.map(n=>pts[n]);const [x,y]=closest(a,c,b,d);return mid(x,y);}
      return avg(use.map(n=>pts[n]));
    }
    if(ns.length===1) return pts[ns[0]];
    return null;
  }
  function planeOf(str){ if(!str) return null; if(/đáy/.test(str)) return S.base; const ns=toks(str); return ns.length>=3?ns:null; }
  let frI=0;
  function runDefs(){
    for(let o=0;o<6;o++){ runDefs0();
      let any=false; const fr=[.4,.6,.35,.55,.45];
      const put=(n,p,q)=>{if(!pts[n]&&!structNames.has(n)&&pts[p]&&pts[q]){pts[n]=add(pts[p],mul(sub(pts[q],pts[p]),fr[frI++%fr.length]));derived.push(n);any=true;}};
      for(const m of t.matchAll(/((?:[A-Z]'?\s*(?:,|và)\s*)*[A-Z]'?)\s*(?:lần lượt\s*)?(?:là\s*)?(?:(?:ba|hai|các|một)\s*)?(?:điểm\s*)?(?:(?:di động|bất kì|bất kỳ|tùy ý)\s*)?(?:lần lượt\s*)?(?:nằm\s*)?(?:trên|thuộc)\s*(?:(?:ba|hai|các)\s*)?(?:cạnh|đoạn(?:\s*thẳng)?)\s*((?:[A-Z]'?[A-Z]'?\s*(?:,|và)\s*)*[A-Z]'?[A-Z]'?)(?![A-Z'])/g)){
        const ns=toks(m[1]).filter(n=>!structNames.has(n)), segs=m[2].split(/\s*(?:,|và)\s*/).map(toks);
        ns.forEach((n,i)=>{const sg=segs[Math.min(i,segs.length-1)];if(sg&&sg.length===2)put(n,sg[0],sg[1]);});
      }
      for(const m of t.matchAll(/trên\s*(?:cạnh|đoạn(?:\s*thẳng)?)\s*([A-Z]'?)([A-Z]'?)\s*(?:lấy|có)\s*(?:điểm\s*)?([A-Z]'?)/g)){
        put(m[3],m[1],m[2]); // ratio pass already ran; this only fills points still undefined
      }
      if(!any)break;
    }
  }
  function runDefs0(){
    let changed=true,guard=0;
    const setP=(n,v)=>{if(!pts[n]&&v&&v.every(Number.isFinite)){pts[n]=v;derived.push(n);changed=true;}};
    const ok=ns=>ns.every(n=>pts[n]);
    while(changed&&guard++<8){changed=false;
      for(const m of t.matchAll(/((?:[A-Z]'?\s*(?:,|và)\s*)*[A-Z]'?)\s*(?:lần lượt\s*)?là\s*(?:các\s*)?trung điểm\s*(?:của\s*)?(?:các\s*)?(?:cạnh\s*|đoạn(?:\s*thẳng)?\s*)?((?:[A-Z]'?[A-Z]'?\s*(?:,|và)\s*)*[A-Z]'?[A-Z]'?)(?![A-Z'])/g)){
        const ns=toks(m[1]).filter(n=>!structNames.has(n)), segs=m[2].split(/\s*(?:,|và)\s*/).map(toks);
        ns.forEach((n,i)=>{const sg=segs[Math.min(i,segs.length-1)];if(sg&&sg.length===2&&ok(sg))setP(n,mid(pts[sg[0]],pts[sg[1]]));});
      }
      for(const m of t.matchAll(/trung điểm\s*([A-Z]'?)\s*(?:của\s*)?(?:cạnh\s*|đoạn(?:\s*thẳng)?\s*)?([A-Z]'?)([A-Z]'?)(?![A-Z'])/g))
        if(!structNames.has(m[1])&&ok([m[2],m[3]]))setP(m[1],mid(pts[m[2]],pts[m[3]]));
      for(const m of t.matchAll(/([A-Z]'?)\s*là\s*trọng tâm\s*(?:của\s*)?(?:tam giác|tứ diện)?\s*((?:[A-Z]'?){3,4})/g)) setP(m[1],refPoint('trọng tâm',m[2]));
      for(const m of t.matchAll(/trọng tâm\s*([A-Z]'?)\s*(?:của\s*)?(?:tam giác|tứ diện)\s*((?:[A-Z]'?){3,4})/g)) setP(m[1],refPoint('trọng tâm',m[2]));
      for(const m of t.matchAll(/([A-Z]'?)\s*là\s*(tâm|giao điểm)\s*([^.;,]*)/g)){
        const rest=m[3], lm=rest.match(/^(?:của\s*)?(?:hai\s*)?(?:đường\s*(?:thẳng|chéo)\s*)?([A-Z]'?)([A-Z]'?)\s*(?:và|với)\s*([A-Z]'?)([A-Z]'?)/);
        if(lm){if(ok([lm[1],lm[2],lm[3],lm[4]])){const [x,y]=closest(pts[lm[1]],pts[lm[2]],pts[lm[3]],pts[lm[4]]);setP(m[1],mid(x,y));}}
        else setP(m[1],refPoint(m[2]+' '+rest,rest.match(/(?:[A-Z]'?){3,}/)?.[0]||''));
      }
      for(const m of t.matchAll(/(?:hình vuông|hình chữ nhật|hình thoi|hình bình hành|đáy|tâm)\s*(?:[A-Z]{3,4}\s*)?(?:có\s*)?tâm\s*(?:là\s*)?([A-Z])(?![A-Z'])/g)) setP(m[1],refPoint('tâm',''));
      for(const m of t.matchAll(/([A-Z]'?)([A-Z]'?)\s*(?:cắt|∩)\s*([A-Z]'?)([A-Z]'?)\s*tại\s*([A-Z]'?)/g))
        if(ok([m[1],m[2],m[3],m[4]])){const [x,y]=closest(pts[m[1]],pts[m[2]],pts[m[3]],pts[m[4]]);setP(m[5],mid(x,y));}
      const proj=(H,X,target)=>{
        if(!pts[X])return; const pl=/^\(|đáy/.test(target)?planeOf(target):null;
        if(pl){if(ok(pl)){const [a,b,c]=pl.map(n=>pts[n]);setP(H,projPlane(pts[X],a,normal(a,b,c)));aux.push([X,H]);}}
        else{const ln=toks(target);if(ln.length===2&&ok(ln)){setP(H,projLine(pts[X],pts[ln[0]],sub(pts[ln[1]],pts[ln[0]])));aux.push([X,H]);if(!ok([H]))return;auxExt.push([H,ln[0],ln[1]]);}}
      };
      for(const m of t.matchAll(/([A-Z]'?)\s*là\s*hình chiếu\s*(?:vuông góc\s*)?(?:của\s*)?(?:điểm\s*)?([A-Z]'?)\s*(?:lên|trên|xuống)\s*(?:đường thẳng\s*|cạnh\s*|mặt phẳng\s*)?(\(\s*(?:[A-Z]'?)+\s*\)|(?:mặt\s*)?đáy|[A-Z]'?[A-Z]'?)/g)) proj(m[1],m[2],m[3]);
      for(const m of t.matchAll(/([A-Z]'?)([A-Z]'?)\s*(?:⊥|vuông góc(?:\s*với)?)\s*(\(\s*(?:[A-Z]'?)+\s*\)|[A-Z]'?[A-Z]'?)\s*(?:\(\s*\2\s*(?:∈|thuộc)|tại\s*\2)/g)) if(pts[m[1]]&&!pts[m[2]]) proj(m[2],m[1],m[3]);
      for(const m of t.matchAll(/(?<![A-Z'])([A-Z]'?)([A-Z]'?)\s*=\s*(\d+(?:[.,]\d+)?(?:\s*\/\s*\d+)?)?\s*([A-Z]'?)([A-Z]'?)(?![A-Z'])/g)){
        const all=[m[1],m[2],m[4],m[5]], unk=[...new Set(all.filter(n=>!pts[n]))], kn=[...new Set(all.filter(n=>pts[n]))];
        if(unk.length!==1||kn.length!==2)continue;
        const X=unk[0],[Y,Z]=kn, k=m[3]?m[3].split('/').map(v=>parseFloat(v.replace(',','.'))).reduce((a,b)=>a/b):1;
        const coef=(p,q)=>{const st=new Set([p,q]);if(st.has(Y)&&st.has(X))return[1,0];if(st.has(X)&&st.has(Z))return[-1,1];if(st.has(Y)&&st.has(Z))return[0,1];return null;};
        const c1=coef(m[1],m[2]),c2=coef(m[4],m[5]); if(!c1||!c2)continue;
        const den=c1[0]-k*c2[0]; if(Math.abs(den)<1e-9)continue;
        const u=(k*c2[1]-c1[1])/den; setP(X,add(pts[Y],mul(sub(pts[Z],pts[Y]),u)));
      }
    }
  }
  const aux=[], auxExt=[], planesHi=[], feet=[];

  /* ---------- foot of a vertex on the base plane ---------- */
  function footOf(X){
    const B=S.base, bl=`[${[...new Set(B.map(n=>n[0]))].join('')}']{3,8}`, baseRe=`(?:(?:mặt\\s*)?đáy|\\(\\s*${bl}\\s*\\))`, Xe=X.replace("'","'");
    let m;
    if(m=t.match(new RegExp(`(?<![A-Z'])${Xe}([A-Z]'?)\\s*(?:⊥|vuông góc)\\s*(?:với\\s*)?${baseRe}`))){ if(pts[m[1]]) return {p:pts[m[1]],name:m[1]}; }
    if(m=t.match(new RegExp(`\\(\\s*${Xe}([A-Z]'?)([A-Z]'?)\\s*\\)\\s*(?:và|,)\\s*\\(\\s*${Xe}([A-Z]'?)([A-Z]'?)\\s*\\)[^.;]{0,30}?vuông góc`))){
      const c=[m[1],m[2]].find(v=>v===m[3]||v===m[4]); if(c&&pts[c]) return {p:pts[c],name:c};
    }
    if(m=t.match(new RegExp(`\\(\\s*${Xe}([A-Z]'?)([A-Z]'?)\\s*\\)[^.;]{0,45}?(?:⊥|vuông góc)\\s*(?:với\\s*)?${baseRe}`))){
      if(pts[m[1]]&&pts[m[2]]) return {p:mid(pts[m[1]],pts[m[2]]),mid:[m[1],m[2]]};
    }
    if(m=t.match(new RegExp(`hình chiếu\\s*(?:vuông góc\\s*)?(?:của\\s*)?(?:điểm\\s*)?${Xe}\\s*(?:lên|trên|xuống)[^.;]*?(?:là|trùng với)\\s*(?:điểm\\s*)?(?:(trung điểm|trọng tâm|tâm|giao điểm)\\s*(?:([A-Z]'?)(?![A-Z'])\\s*)?(?:của\\s*)?(?:cạnh\\s*|đoạn\\s*|tam giác\\s*|hình \\S+\\s*)?((?:[A-Z]'?)*)|([A-Z]'?))`))){
      if(m[4]){ if(pts[m[4]]) return {p:pts[m[4]],name:m[4]}; }
      else { const p=refPoint(m[1],m[3]); if(p){ if(m[2]&&!pts[m[2]]){pts[m[2]]=p;derived.push(m[2]);} return {p,name:m[2]}; } }
    }
    if(m=t.match(new RegExp(`(?<![A-Z'])${Xe}([A-Z]'?)\\s*(?:⊥|vuông góc)\\s*(?:với\\s*)?${baseRe}`))){ return {pending:m[1]}; }
    return null;
  }
  function heightFor(X,f,d0){
    const foot=Object.assign([...f.p],{name:f.name});
    const B=S.base, bl=`[${[...new Set(B.map(n=>n[0]))].join('')}']{3,8}`, baseRe=`(?:(?:mặt\\s*)?đáy|\\(\\s*${bl}\\s*\\))`;
    const hd=v=>{const d=len(sub(foot,pts[v]));return d;};
    let m;
    if(foot.name&&L(X,foot.name)) return L(X,foot.name);
    if(heightV) return heightV;
    for(const v of B){const e=L(X,v);if(e&&e>hd(v)+1e-9)return Math.sqrt(e*e-hd(v)**2);}
    if(lateral&&lateral>hd(B[0])) return Math.sqrt(lateral**2-hd(B[0])**2);
    const angE=[new RegExp(`góc\\s*(?:giữa\\s*)?(?:đường thẳng\\s*|cạnh bên\\s*)?(?<![A-Z'])${X}([A-Z]'?)\\s*(?:và|với)\\s*${baseRe}\\s*(?:bằng|=|là)\\s*${DEG}`),
                new RegExp(`(?<![A-Z'])${X}([A-Z]'?)\\s*tạo với\\s*${baseRe}\\s*(?:một\\s*)?góc\\s*(?:bằng\\s*)?${DEG}`)];
    for(const re of angE) if((m=t.match(re))&&pts[m[1]]) return hd(m[1])*Math.tan(+m[2].replace(',','.')*Math.PI/180);
    const angF=[new RegExp(`góc\\s*giữa\\s*(?:hai\\s*)?(?:mặt phẳng\\s*|mặt bên\\s*)?\\(\\s*${X}([A-Z]'?)([A-Z]'?)\\s*\\)\\s*(?:và|với)\\s*${baseRe}\\s*(?:bằng|=|là)\\s*${DEG}`),
                new RegExp(`\\(\\s*${X}([A-Z]'?)([A-Z]'?)\\s*\\)\\s*tạo với\\s*${baseRe}\\s*(?:một\\s*)?góc\\s*(?:bằng\\s*)?${DEG}`)];
    for(const re of angF) if((m=t.match(re))&&pts[m[1]]&&pts[m[2]]){
      const d=len(sub(foot,projLine(foot,pts[m[1]],sub(pts[m[2]],pts[m[1]]))));
      return d*Math.tan(+m[3].replace(',','.')*Math.PI/180);
    }
    if((m=t.match(new RegExp(`(?<![A-Z'.])${X}([A-Z]'?)([A-Z]'?)\\s*\\)?\\s*(?:là\\s*)?(?:tam giác\\s*)?(đều|vuông cân)`)))&&pts[m[1]]&&pts[m[2]]){
      const e=len(sub(pts[m[1]],pts[m[2]]))/(m[3]==='đều'?1:Math.SQRT2), d=hd(m[1]); if(e>d) return Math.sqrt(e*e-d*d);
    }
    return d0;
  }
  const extent=()=>{let e=0;for(const a of S.base)for(const b of S.base)e=Math.max(e,len(sub(pts[a],pts[b])));return e||1;};

  /* ---------- detect solid ---------- */
  if(m=t.match(/(lập phương|hộp chữ nhật|hình hộp|lăng trụ)[^A-Z.]*?((?:[A-Z]){3,6})\s*\.\s*((?:[A-Z]'?){3,6})/)){
    S.kind='prism'; S.base=toks(m[2]); let top=toks(m[3]); if(top.length!==S.base.length) top=S.base.map(n=>n+"'"); S.top=top;
    Object.assign(pts,base2D(S.base)); structNames=new Set([...S.base,...top]); runDefs();
    let off=[0,0,0], h;
    const s0=len(sub(pts[S.base[0]],pts[S.base[1]]));
    if(/lập phương/.test(m[1])) h=s0;
    else{
      let f=null,i=0; for(;i<top.length;i++){f=footOf(top[i]);if(f&&f.p)break;f=null;}
      if(f){off=sub(f.p,pts[S.base[i]]);off[2]=0;
        const e=L(S.base[i],top[i])??lateral, d=len(off);
        h=e&&e>d?Math.sqrt(e*e-d*d):heightV;
        if(!h){const am=t.match(new RegExp(`góc\\s*(?:giữa\\s*)?(?:cạnh bên\\s*|${S.base[i]}${top[i]}\\s*)(?:và|với)\\s*(?:mặt\\s*)?(?:đáy|\\([^)]*\\))\\s*(?:bằng|=|là)\\s*${DEG}`));
          h=am?d*Math.tan(+am[1]*Math.PI/180):(d>1e-9?d*1.5:extent());}
      } else { h=heightV??lateral; for(let j=0;j<top.length&&!h;j++) h=L(S.base[j],top[j]); h=h??(/hộp/.test(m[1])?s0*1.2:extent()); }
    }
    S.base.forEach((b,j)=>pts[top[j]]=add(add(pts[b],off),[0,0,h]));
    faces.push(S.base,[...top]); S.base.forEach((b,j)=>{const k=(j+1)%S.base.length;faces.push([b,S.base[k],top[k],top[j]]);});
    S.label=(/lập phương/.test(m[1])?'Hình lập phương ':/hộp/.test(m[1])?'Hình hộp ':'Lăng trụ ')+S.base.join('')+'.'+top.join('');
  } else if((m=t.match(/chóp[^A-Z.]*?([A-Z])\s*\.\s*((?:[A-Z]){3,6})(?![A-Z'])/))||(m=t.match(/tứ diện[^A-Z.]*?([A-Z]{4})(?![A-Z'])/))){
    let apex,base;
    if(m[2]){apex=m[1];base=toks(m[2]);S.label='Hình chóp '+apex+'.'+base.join('');}
    else{const ns=toks(m[1]);
      const om=t.match(/([A-Z])[A-Z]\s*,\s*\1[A-Z]\s*(?:,|và)\s*\1[A-Z][^.;]{0,20}đôi một vuông góc/);
      if(om&&ns.includes(om[1])){apex=om[1];}else apex=['S','O'].includes(ns[0])?ns[0]:ns[3];
      base=ns.filter(n=>n!==apex); S.label='Tứ diện '+ns.join('');}
    S.kind='pyr';S.apex=apex;S.base=base; structNames=new Set([apex,...base]);
    const om=t.match(new RegExp(`${apex}[A-Z]\\s*,\\s*${apex}[A-Z]\\s*(?:,|và)\\s*${apex}[A-Z][^.;]{0,20}đôi một vuông góc`));
    if(om&&base.length===3){
      const s=baseSide??1; pts[apex]=[0,0,0];
      const ax=[[1,0,0],[0,1,0],[0,0,1]]; base.forEach((b,i)=>pts[b]=mul(ax[i],L(apex,b)??s));
      runDefs();
    } else {
      Object.assign(pts,base2D(base)); runDefs();
      let f=footOf(apex);
      if(f&&f.pending){runDefs();f=footOf(apex);}
      if(!f||!f.p) f={p:avg(base.map(n=>pts[n])),center:true};
      if(/tứ diện đều/.test(t)){const s=len(sub(pts[base[0]],pts[base[1]]));pts[apex]=add(f.p,[0,0,s*Math.sqrt(2/3)]);}
      else pts[apex]=add(f.p,[0,0,heightFor(apex,f,extent()*1.1)]);
      if(f.mid){ /* show foot line */ const nm=Object.keys(pts).find(k=>derived.includes(k)&&len(sub(pts[k],f.p))<1e-9); if(nm) aux.push([apex,nm]); }
      if(f.center){const nm=Object.keys(pts).find(k=>derived.includes(k)&&len(sub(pts[k],f.p))<1e-9); if(nm) aux.push([apex,nm]);}
      if(f.name&&derived.includes(f.name)) aux.push([apex,f.name]);
    }
    faces.push(base); base.forEach((b,i)=>faces.push([apex,b,base[(i+1)%base.length]]));
  } else {
    return {error:'Không nhận dạng được khối hình. Hãy ghi rõ, ví dụ: "hình chóp S.ABCD", "lăng trụ ABC.A\'B\'C\'", "hình lập phương ABCD.A\'B\'C\'D\'", "tứ diện ABCD".'};
  }
  runDefs();

  /* ---------- questions ---------- */
  const R=[], edges=new Set();
  faces.forEach(f=>f.forEach((v,i)=>edges.add(K(v,f[(i+1)%f.length]))));
  const has=ns=>ns.every(n=>pts[n]);
  const given=(m)=>/^\s*(?:bằng|=|là)\s*\d/.test(t.slice(m.index+m[0].length));
  const addLine=(p,q)=>{if(!edges.has(K(p,q)))aux.push([p,q]);};
  const planeRe="(\\(\\s*(?:[A-Z]'?){3,8}\\s*\\)|(?:mặt\\s*)?đáy)";
  const lineRe="([A-Z]'?[A-Z]'?)(?![A-Z'(])";
  const addFoot=(p,from)=>{feet.push(p);if(from)aux.push([from,p]);};
  const volMain=()=>{
    const bp=S.base.map(n=>pts[n]), n=normal(...bp.slice(0,3)), A=polyArea(bp);
    if(S.kind==='prism') return A*Math.abs(dot(n,sub(pts[S.top[0]],bp[0])))/len(n);
    return A*Math.abs(dot(n,sub(pts[S.apex],bp[0])))/len(n)/3;
  };
  for(const m of t.matchAll(/thể tích\s*(?:của\s*)?(?:khối\s*)?(?:đa diện|chóp|tứ diện|lăng trụ|hộp(?:\s*chữ nhật)?|lập phương)?\s*((?:[A-Z]'?)(?:\s*\.\s*)?(?:[A-Z]'?){2,})?/g)){
    let v,label='Thể tích '+(m[1]?m[1].replace(/\s/g,''):'khối '+S.label.replace(/^\S/,c=>c.toLowerCase()));
    if(m[1]){const [l,r]=m[1].split('.').map(toks);
      if(r&&l.length===1&&has([...l,...r])&&r.length>=3){const bp=r.map(n=>pts[n]),n=normal(...bp.slice(0,3));v=polyArea(bp)*Math.abs(dot(n,sub(pts[l[0]],bp[0])))/len(n)/3;}
      else if(!r&&l.length===4&&has(l)){const [a,b,c,d]=l.map(n=>pts[n]);v=Math.abs(dot(sub(b,a),cross(sub(c,a),sub(d,a))))/6;}
      else v=volMain();
    } else v=volMain();
    if(!R.some(x=>x.q===label)) R.push({q:label,a:'V = '+fmt(v,3)});
  }
  for(const m of t.matchAll(new RegExp(`khoảng cách\\s*từ\\s*(?:điểm\\s*)?([A-Z]'?)\\s*(?:đến|tới)\\s*(?:mặt phẳng\\s*)?${planeRe}`,'g'))){
    const pl=planeOf(m[2]); if(!pts[m[1]]||!pl||!has(pl))continue;
    const [a,b,c]=pl.map(n=>pts[n]),n=normal(a,b,c),F=projPlane(pts[m[1]],a,n);
    planesHi.push(pl); addFoot(F,m[1]);
    R.push({q:`d(${m[1]}, (${pl.join('')}))`,a:fmt(len(sub(pts[m[1]],F)))});
  }
  for(const m of t.matchAll(new RegExp(`khoảng cách\\s*từ\\s*(?:điểm\\s*)?([A-Z]'?)\\s*(?:đến|tới)\\s*(?:đường thẳng\\s*|cạnh\\s*)?${lineRe}`,'g'))){
    const ln=toks(m[2]); if(ln.length!==2||!has([m[1],...ln]))continue;
    const F=projLine(pts[m[1]],pts[ln[0]],sub(pts[ln[1]],pts[ln[0]])); addFoot(F,m[1]); addLine(...ln);
    R.push({q:`d(${m[1]}, ${m[2]})`,a:fmt(len(sub(pts[m[1]],F)))});
  }
  for(const m of t.matchAll(new RegExp(`khoảng cách\\s*giữa\\s*(?:hai\\s*)?(?:đường thẳng\\s*)?([A-Z]'?[A-Z]'?)\\s*(?:và|với)\\s*(?:đường thẳng\\s*)?${lineRe}`,'g'))){
    const l1=toks(m[1]),l2=toks(m[2]); if(l1.length!==2||l2.length!==2||!has([...l1,...l2]))continue;
    const [x,y]=closest(pts[l1[0]],pts[l1[1]],pts[l2[0]],pts[l2[1]]); addLine(...l1);addLine(...l2);feet.push(x,y);aux.push([x,y]);
    R.push({q:`d(${m[1]}, ${m[2]})`,a:fmt(len(sub(x,y)))});
  }
  for(const m of t.matchAll(new RegExp(`góc\\s*(?:giữa|tạo bởi)?\\s*(?:đường thẳng\\s*|cạnh\\s*)?([A-Z]'?[A-Z]'?)\\s*(?:và|với)\\s*(?:mặt phẳng\\s*)?${planeRe}`,'g'))){
    if(given(m))continue; const ln=toks(m[1]),pl=planeOf(m[2]); if(ln.length!==2||!pl||!has([...ln,...pl]))continue;
    const [a,b,c]=pl.map(n=>pts[n]),n=normal(a,b,c),d=sub(pts[ln[1]],pts[ln[0]]);
    const ang=Math.asin(Math.min(1,Math.abs(dot(d,n))/(len(d)*len(n)))); planesHi.push(pl); addLine(...ln);
    const p0=projPlane(pts[ln[0]],a,n),p1=projPlane(pts[ln[1]],a,n);
    if(len(sub(p0,pts[ln[0]]))>1e-9){feet.push(p0);aux.push([pts[ln[0]],p0]);} if(len(sub(p1,pts[ln[1]]))>1e-9){feet.push(p1);aux.push([pts[ln[1]],p1]);}
    aux.push([p0,p1]);
    R.push({q:`Góc (${m[1]}, (${pl.join('')}))`,a:fmtAng(ang)});
  }
  for(const m of t.matchAll(new RegExp(`góc\\s*giữa\\s*(?:hai\\s*)?(?:mặt phẳng\\s*|mặt bên\\s*)?${planeRe}\\s*(?:và|với)\\s*(?:mặt phẳng\\s*)?${planeRe}`,'g'))){
    if(given(m))continue; const p1=planeOf(m[1]),p2=planeOf(m[2]); if(!p1||!p2||!has([...p1,...p2]))continue;
    const n1=normal(...p1.slice(0,3).map(n=>pts[n])),n2=normal(...p2.slice(0,3).map(n=>pts[n]));
    planesHi.push(p1,p2); R.push({q:`Góc ((${p1.join('')}), (${p2.join('')}))`,a:fmtAng(Math.acos(Math.min(1,Math.abs(dot(n1,n2))/(len(n1)*len(n2)))))});
  }
  for(const m of t.matchAll(new RegExp(`góc\\s*giữa\\s*(?:hai\\s*)?(?:đường thẳng\\s*)?([A-Z]'?[A-Z]'?)\\s*(?:và|với)\\s*(?:đường thẳng\\s*)?${lineRe}`,'g'))){
    if(given(m))continue; const l1=toks(m[1]),l2=toks(m[2]); if(l1.length!==2||l2.length!==2||!has([...l1,...l2]))continue;
    const d1=sub(pts[l1[1]],pts[l1[0]]),d2=sub(pts[l2[1]],pts[l2[0]]); addLine(...l1);addLine(...l2);
    R.push({q:`Góc (${m[1]}, ${m[2]})`,a:fmtAng(Math.acos(Math.min(1,Math.abs(dot(d1,d2))/(len(d1)*len(d2)))))});
  }
  for(const m of t.matchAll(/diện tích\s*(?:của\s*)?(?:tam giác|tứ giác|hình|thiết diện|mặt)?[^A-Z.;]*?((?:[A-Z]'?){3,})/g)){
    const ns=toks(m[1]); if(!has(ns))continue; planesHi.push(ns);
    R.push({q:`Diện tích ${m[1]}`,a:'S = '+fmt(polyArea(ns.map(n=>pts[n])),2)});
  }
  for(const m of t.matchAll(/độ dài\s*(?:của\s*)?(?:đoạn\s*(?:thẳng\s*)?|cạnh\s*)?([A-Z]'?[A-Z]'?)(?![A-Z'])/g)){
    const ln=toks(m[1]); if(ln.length!==2||!has(ln))continue; addLine(...ln);
    R.push({q:`Độ dài ${m[1]}`,a:fmt(len(sub(pts[ln[0]],pts[ln[1]])))});
  }
  /* ---------- giao tuyến / giao điểm ---------- */
  const allP=Object.values(pts); let Usc=0; for(const a of allP)for(const b of allP)Usc=Math.max(Usc,len(sub(a,b)));
  const E=1e-6*Usc, cen0=avg(allP), usedNames=new Set(Object.keys(pts));
  const newName=()=>{for(const c of 'IJKEFHGOPQRTXYZUVW') if(!usedNames.has(c)){usedNames.add(c);return c;} return '?';};
  const plInfo=ns=>{const [a,b,c]=ns.map(n=>pts[n]);const n=normal(a,b,c);const nn=mul(n,1/len(n));return {ns,a,n:nn,on:x=>Math.abs(dot(nn,sub(x,a)))<E};};
  const findName=x=>Object.keys(pts).find(k=>len(sub(pts[k],x))<E);
  function lineCands(pl,other){
    const ns=Object.keys(pts).filter(k=>pl.on(pts[k])), out=[];
    for(let i=0;i<ns.length;i++)for(let j=i+1;j<ns.length;j++){const p=ns[i],q=ns[j];
      if(other&&other.on(pts[p])&&other.on(pts[q]))continue;
      out.push({p,q,sc:(edges.has(K(p,q))?2:0)+(pl.ns.includes(p)?1:0)+(pl.ns.includes(q)?1:0)});}
    return out;
  }
  function meet(A,B,C,D){
    const cr=cross(sub(B,A),sub(D,C)); if(len(cr)<1e-9*Usc*Usc) return null;
    if(Math.abs(dot(sub(C,A),cr))/len(cr)>E) return null;
    const [x]=closest(A,B,C,D); return len(sub(x,cen0))>4*Usc?null:x;
  }
  const inter=(a,b)=>{const d=sub(b,a);return [sub(a,mul(d,.3)),add(b,mul(d,.3)),'inter'];};
  function interPlanes(n1,n2){
    const A1=`(${n1.join('')})`,A2=`(${n2.join('')})`;
    const P1=plInfo(n1),P2=plInfo(n2),ov={planes:[n1,n2],segs:[],names:{}},dir=cross(P1.n,P2.n);
    if(len(dir)<1e-9) return {ans:P1.on(P2.a)?'Hai mặt phẳng trùng nhau':'Hai mặt phẳng song song',steps:[],ov,common:[]};
    const common=[],steps=[];
    const addC=(name,pos,why)=>{if(common.length<2&&!common.some(c=>len(sub(c.pos,pos))<E))common.push({name,pos,why});};
    // named points of the two plane names lying on both planes
    for(const k of [...new Set([...n1,...n2])]){
      if(!(P1.on(pts[k])&&P2.on(pts[k])))continue;
      let why=`${k} ∈ ${A1} và ${k} ∈ ${A2}`;
      if(!(n1.includes(k)&&n2.includes(k))){
        const [PP,AA,nn]=n1.includes(k)?[P2,A2,n2]:[P1,A1,n1];
        const l=lineCands(PP).find(l=>l.p!==k&&l.q!==k&&nn.includes(l.p)&&nn.includes(l.q)&&len(cross(sub(pts[l.q],pts[l.p]),sub(pts[k],pts[l.p])))<E*Usc);
        if(l) why=`${k} ∈ ${n1.includes(k)?A1:A2} và ${k} ∈ ${l.p}${l.q} ⊂ ${AA}`;
      }
      addC(k,pts[k],why);
    }
    if(common.length<2){
      const c1=lineCands(P1,P2),c2=lineCands(P2,P1),found=[];
      for(const a of c1)for(const b of c2){
        const x=meet(pts[a.p],pts[a.q],pts[b.p],pts[b.q]); if(!x)continue;
        const nm=findName(x),atEnd=[a.p,a.q,b.p,b.q].some(v=>len(sub(pts[v],x))<E),l1=a.p+a.q,l2=b.p+b.q;
        found.push({x,nm,sc:a.sc+b.sc+(nm?3:0)-(atEnd?4:0)-len(sub(x,cen0))/Usc,
          why:n=>`${n} = ${l1} ∩ ${l2}  (${l1} ⊂ ${A1}, ${l2} ⊂ ${A2})`,from:[a.p,a.q,b.p,b.q]});
      }
      // textbook trick: through a point of one plane draw a parallel to a line of that plane
      for(const [PA,PB,AA,BB,cB] of [[P1,P2,A1,A2,c2],[P2,P1,A2,A1,c1]]){
        for(const X of Object.keys(pts).filter(k=>PA.on(pts[k])&&!PB.on(pts[k])))
          for(const l of lineCands(PA)){
            if(l.p===X||l.q===X)continue;
            const d=sub(pts[l.q],pts[l.p]); if(len(cross(d,sub(pts[X],pts[l.p])))<E*Usc)continue;
            for(const b of cB){
              const x=meet(pts[X],add(pts[X],d),pts[b.p],pts[b.q]); if(!x||len(sub(x,pts[X]))<E)continue;
              const nm=findName(x),lb=b.p+b.q;
              found.push({x,nm,sc:l.sc+b.sc-3+(nm?3:0)-len(sub(x,cen0))/Usc,
                why:n=>`Trong ${AA}, qua ${X} kẻ đường thẳng ∥ ${l.p}${l.q}, cắt ${lb} tại ${n}  (${lb} ⊂ ${BB})`,from:[X,b.p,b.q]});
            }
          }
      }
      found.sort((u,v)=>v.sc-u.sc);
      for(const f of found){
        if(common.length>=2)break; if(common.some(c=>len(sub(c.pos,f.x))<E))continue;
        const name=f.nm||newName(); if(!f.nm) ov.names[name]=f.x;
        addC(name,f.x,f.why(name)); f.from.forEach(p=>ov.segs.push([pts[p],f.x]));
      }
    }
    common.forEach((c,i)=>steps.push(`Điểm chung thứ ${i+1}: ${c.why}`));
    let ans;
    if(common.length>=2){ans=`${A1} ∩ ${A2} = ${common[0].name}${common[1].name}`;ov.segs.push(inter(common[0].pos,common[1].pos));}
    else if(common.length===1){
      const c=common[0]; let par=null;
      const pl=(l,d)=>{const v=sub(pts[l.q],pts[l.p]);return len(cross(v,d))<1e-6*len(v)*len(d);};
      for(const a of lineCands(P1)){ if(!pl(a,dir))continue; const b=lineCands(P2).find(b=>pl(b,dir)); if(b){par=[a,b];break;} }
      const d=mul(dir,Usc*.6/len(dir)); ov.segs.push([sub(c.pos,d),add(c.pos,d),'inter']);
      if(par){const l1=par[0].p+par[0].q,l2=par[1].p+par[1].q;
        steps.push(`${l1} ⊂ ${A1}, ${l2} ⊂ ${A2} và ${l1} ∥ ${l2}`);
        ans=`Giao tuyến là đường thẳng d qua ${c.name} và song song với ${l1} (và ${l2})`;}
      else ans=`Giao tuyến là đường thẳng qua ${c.name}`;
    } else ans='Không tìm được điểm chung — có thể đề thiếu dữ kiện';
    return {ans,steps,ov,common};
  }
  if(/giao tuyến/.test(t)) for(const m of t.matchAll(/\(\s*((?:[A-Z]'?){3,})\s*\)\s*(?:và|,|với)\s*\(\s*((?:[A-Z]'?){3,})\s*\)/g)){
    const n1=toks(m[1]),n2=toks(m[2]),label=`Giao tuyến (${m[1]}) và (${m[2]})`;
    if(!has(n1)||!has(n2)){R.push({q:label,a:'Chưa xác định được: '+[...n1,...n2].filter(n=>!pts[n]).join(', ')});continue;}
    const r=interPlanes(n1,n2); R.push({q:label,a:r.ans,steps:r.steps,ov:r.ov});
  }
  for(const m of t.matchAll(/giao điểm\s*(?:của\s*)?(?:đường thẳng\s*)?([A-Z]'?)([A-Z]'?)\s*(?:và|với)\s*\(\s*((?:[A-Z]'?){3,})\s*\)/g)){
    const ln=[m[1],m[2]],lnS=m[1]+m[2],ns=toks(m[3]),A1=`(${m[3]})`,label=`Giao điểm ${lnS} và ${A1}`;
    if(!has([...ln,...ns])){R.push({q:label,a:'Chưa xác định được: '+[...ln,...ns].filter(n=>!pts[n]).join(', ')});continue;}
    const P=plInfo(ns),X=pts[ln[0]],Y=pts[ln[1]],d=sub(Y,X),dn=dot(d,P.n),ov={planes:[ns],segs:[],names:{}};
    if(Math.abs(dn)<1e-9*len(d)){R.push({q:label,a:P.on(X)?`${lnS} nằm trong ${A1}`:`${lnS} ∥ ${A1}`,ov});continue;}
    const x=add(X,mul(d,dot(P.n,sub(P.a,X))/dn)), steps=[];
    let best=null;
    for(const b of lineCands(P)){const y=meet(X,Y,pts[b.p],pts[b.q]); if(y&&len(sub(y,x))<E*10&&(!best||b.sc>best.sc))best=b;}
    let name=findName(x);
    if(best){
      name=name||newName(); const l2=best.p+best.q;
      steps.push(`${lnS} và ${l2} cùng nằm trong một mặt phẳng, ${l2} ⊂ ${A1}`,`${name} = ${lnS} ∩ ${l2}`);
      ov.segs.push([pts[best.p],x],[pts[best.q],x]);
    } else {
      const zs=Object.keys(pts).filter(k=>len(cross(d,sub(pts[k],X)))>E*Usc).sort((u,v)=>(structNames.has(v)?1:0)-(structNames.has(u)?1:0));
      for(const Z of zs){
        const snap=new Set(usedNames), aux=[...ln,Z], r=interPlanes(aux,ns);
        if(r.common.length<2||!meet(X,Y,r.common[0].pos,r.common[1].pos)){usedNames.clear();snap.forEach(v=>usedNames.add(v));continue;}
        const g=r.common[0].name+r.common[1].name, A2=`(${aux.join('')})`;
        name=name||newName();
        steps.push(`Chọn mặt phẳng phụ ${A2} chứa ${lnS}`,...r.steps,`⇒ ${A2} ∩ ${A1} = ${g}`,`Trong ${A2}: ${name} = ${lnS} ∩ ${g}, mà ${g} ⊂ ${A1}`);
        Object.assign(ov.names,r.ov.names); ov.segs.push(...r.ov.segs); ov.planes.push(aux);
        break;
      }
      name=name||newName();
    }
    if(!findName(x)) ov.names[name]=x;
    ov.segs.push([X,x],[Y,x]);
    R.push({q:label,a:`${lnS} ∩ ${A1} = ${name}`,steps,ov});
  }

  const unresolved=[...new Set([...t.matchAll(/(?:gọi|lấy|cho)\s*(?:điểm\s*)?([A-Z]'?)(?![A-Z'])/g)].map(x=>x[1]))].filter(n=>!pts[n]);
  if(unresolved.length) W.push('Chưa xác định được điểm: '+unresolved.join(', '));
  return {pts,faces,edges:[...edges].map(k=>k.split('|')),aux,planesHi,feet,derived,R,W,S};
}

export { solve, norm, toks, fmt, fmtAng, surd };
