(()=>{'use strict';
const N=6, DX=[1,0,-1,0], DY=[0,1,0,-1], dirName=['east','south','west','north'];
const STAGES=[
 {name:'First delivery',source:{edge:'left',n:4},path:[[2,4]],target:[2,1]},
 {name:'Down the hall',source:{edge:'left',n:1},path:[[1,1],[1,4]],target:[5,4]},
 {name:'Return address',source:{edge:'left',n:5},path:[[4,5],[4,2]],target:[0,2]},
 {name:'Southern express',source:{edge:'bottom',n:1},path:[[1,4],[4,4]],target:[4,0]},
 {name:'Through the middle',source:{edge:'left',n:0},path:[[5,0],[5,4],[2,4]],target:[2,1]},
 {name:'Detour district',source:{edge:'top',n:4},path:[[4,2],[1,2],[1,5]],target:[5,5]},
 {name:'The long way home',source:{edge:'right',n:4},path:[[3,4],[3,1],[0,1]],target:[0,5]},
 {name:'Up, then over',source:{edge:'bottom',n:5},path:[[5,3],[2,3],[2,0]],target:[0,0]},
 {name:'Corners and contracts',source:{edge:'left',n:2},path:[[1,2],[1,0],[4,0],[4,5]],target:[0,5]},
 {name:'Grand delivery',source:{edge:'right',n:0},path:[[5,0],[5,5],[0,5],[0,3]],target:[4,3]}
];
const $=id=>document.getElementById(id), els={grid:$('grid'),beam:$('beam'),glow:$('glow'),emitter:$('emitter'),levelPick:$('levelPick'),stageStat:$('stageStat'),turnStat:$('turnStat'),litStat:$('litStat'),status:$('status'),stageName:$('stageName'),next:$('next'),undo:$('undo'),hint:$('hint')};
let stageIndex=0,tiles=new Map(),history=[],turns=0,completed=false,hasHinted=false;
const key=(x,y)=>`${x},${y}`;
function fromEdge(s){if(s.edge==='left')return{x:-1,y:s.n,dir:0};if(s.edge==='right')return{x:N,y:s.n,dir:2};if(s.edge==='top')return{x:s.n,y:-1,dir:1};return{x:s.n,y:N,dir:3};}
function direction(a,b){if(a.x===b.x&&a.y!==b.y)return b.y>a.y?1:3;if(a.y===b.y&&a.x!==b.x)return b.x>a.x?0:2;throw new Error('Non-orthogonal route '+JSON.stringify({a,b}));}
function mirrorFor(incoming,outgoing){const slash=[3,2,1,0],backslash=[1,0,3,2];if(slash[incoming]===outgoing)return'/';if(backslash[incoming]===outgoing)return'\\';throw new Error('No mirror for '+incoming+','+outgoing);}
function flip(o){return o==='/'?'\\':'/';}
function stageSetup(i){const spec=STAGES[i],p=spec.path.map(([x,y])=>({x,y})),target={x:spec.target[0],y:spec.target[1]},s=fromEdge(spec.source),t=new Map(),routeCells=new Set(),waypoints=[{x:s.x,y:s.y},...p,target];
 for(let j=0;j<waypoints.length-1;j++){let a=waypoints[j],b=waypoints[j+1],d=direction(a,b),xx=a.x,yy=a.y;while(xx!==b.x||yy!==b.y){xx+=DX[d];yy+=DY[d];if(xx>=0&&xx<N&&yy>=0&&yy<N)routeCells.add(key(xx,yy));}}
 p.forEach((pt,j)=>{let prev=j?p[j-1]:s, next=j+1<p.length?p[j+1]:target,orientation=mirrorFor(direction(prev,pt),direction(pt,next));t.set(key(pt.x,pt.y),{type:'mirror',orientation:(j+i)%3===0?orientation:flip(orientation),solution:orientation,primary:true});});
 const candidate=[];for(let y=0;y<N;y++)for(let x=0;x<N;x++){if(!routeCells.has(key(x,y))&&key(x,y)!==key(target.x,target.y))candidate.push([x,y]);}
 candidate.sort((a,b)=>(((a[0]*23+a[1]*17+i*31)%37)-((b[0]*23+b[1]*17+i*31)%37))||a[1]-b[1]||a[0]-b[0]);
 candidate.slice(0,Math.min(2+Math.floor(i/2),5)).forEach(([x,y],j)=>t.set(key(x,y),{type:'mirror',orientation:j%2?'/':'\\',solution:null,primary:false}));
 candidate.slice(5,7).forEach(([x,y])=>{if(!t.has(key(x,y)))t.set(key(x,y),{type:'blocker'});});
 t.set(key(target.x,target.y),{type:'target'});
 // Guarantee each stage needs an intentional interaction, not an accidental solved start.
 if(p.every(pt=>t.get(key(pt.x,pt.y)).orientation===t.get(key(pt.x,pt.y)).solution))t.get(key(p[0].x,p[0].y)).orientation=flip(t.get(key(p[0].x,p[0].y)).orientation);
 return{spec,tiles:t,source:s,target};}
function trace(setup,overrideSolution=false){const s=setup.source,points=[entryPoint(s)],visited=new Set(),hit=new Set();let x=s.x,y=s.y,dir=s.dir,stop='boundary';for(let n=0;n<75;n++){x+=DX[dir];y+=DY[dir];if(x<0||y<0||x>=N||y>=N){const prev=points.at(-1);points.push({x:Math.max(0,Math.min(600,prev.x+DX[dir]*50)),y:Math.max(0,Math.min(600,prev.y+DY[dir]*50))});break;}points.push({x:(x+.5)*100,y:(y+.5)*100});const k=key(x,y),seen=k+','+dir;if(visited.has(seen)){stop='loop';break;}visited.add(seen);const tile=setup.tiles.get(k);if(tile?.type==='target'){hit.add(k);stop='target';break;}if(tile?.type==='blocker'){stop='rock';break;}if(tile?.type==='mirror'){const orientation=overrideSolution&&tile.solution?tile.solution:tile.orientation;dir=orientation==='/'?[3,2,1,0][dir]:[1,0,3,2][dir];}}return{points,hit,stop,solved:hit.has(key(setup.target.x,setup.target.y))};}
function entryPoint(s){if(s.x<0)return{x:0,y:(s.y+.5)*100};if(s.x>=N)return{x:600,y:(s.y+.5)*100};if(s.y<0)return{x:(s.x+.5)*100,y:0};return{x:(s.x+.5)*100,y:600};}
let setup=null;
function resetStage(i){stageIndex=i;setup=stageSetup(i);tiles=setup.tiles;history=[];turns=0;completed=false;hasHinted=false;els.levelPick.value=String(i);els.stageName.textContent=STAGES[i].name;els.stageStat.textContent=`${i+1} / ${STAGES.length}`;drawGrid();update('Tap the golden mirrors to route the light.');}
function drawGrid(){els.grid.replaceChildren();for(let y=0;y<N;y++)for(let x=0;x<N;x++){const k=key(x,y),tile=tiles.get(k),node=document.createElement(tile?.type==='mirror'?'button':'div');node.className='prism-tile '+(tile?.type||'empty');if(tile?.type==='mirror'){node.type='button';node.dataset.pos=k;node.innerHTML='<b aria-hidden="true"></b>';node.addEventListener('click',()=>rotate(k));}else if(tile?.type==='target'){node.innerHTML='<i class="crystal" aria-hidden="true"></i>';}els.grid.appendChild(node);}updateTiles();}
function updateTiles(){els.grid.querySelectorAll('.mirror').forEach(n=>{const t=tiles.get(n.dataset.pos);n.querySelector('b').textContent=t.orientation;n.setAttribute('aria-label',`Mirror at row ${Number(n.dataset.pos.split(',')[1])+1}, column ${Number(n.dataset.pos.split(',')[0])+1}, currently ${t.orientation==='/'?'slash':'backslash'}. Activate to rotate.`);});}
function rotate(k,isHint=false){const t=tiles.get(k);if(!t||t.type!=='mirror')return;history.push({k,orientation:t.orientation});t.orientation=flip(t.orientation);turns++;els.grid.querySelectorAll('.mirror').forEach(n=>{if(n.dataset.pos===k){n.classList.remove('touched');void n.offsetWidth;n.classList.add('touched');}});updateTiles();update(isHint?'Hint applied. Find the rest of the route.':undefined);}
function update(message){const result=trace(setup),joined=result.points.map(p=>`${p.x},${p.y}`).join(' ');els.beam.setAttribute('points',joined);els.glow.setAttribute('points',joined);const entry=entryPoint(setup.source);els.emitter.setAttribute('cx',entry.x);els.emitter.setAttribute('cy',entry.y);els.grid.querySelector('.crystal').classList.toggle('lit',result.solved);els.litStat.textContent=result.solved?'1 / 1':'0 / 1';els.turnStat.textContent=String(turns);els.undo.disabled=history.length===0;els.hint.disabled=result.solved||hasHinted;els.next.disabled=!result.solved||stageIndex===STAGES.length-1;const justWon=result.solved&&!completed;completed=result.solved;els.status.className='status'+(result.solved?' good':'');if(result.solved&&stageIndex===STAGES.length-1)els.status.textContent='Delivered! All ten stages complete. The postal service thanks you.';else if(result.solved)els.status.textContent=`Delivered in ${turns} turn${turns===1?'':'s'}! Ready for the next stage?`;else els.status.textContent=message||(result.stop==='rock'?'The beam hit a stone. Try another angle.':'The beam missed the crystal. Turn a mirror and try again.');if(justWon){try{const p=JSON.parse(localStorage.getItem('oreniq-prism-progress')||'{}');p[stageIndex]=Math.min(p[stageIndex]??9999,turns);localStorage.setItem('oreniq-prism-progress',JSON.stringify(p));}catch{}}}
$('undo').addEventListener('click',()=>{const u=history.pop();if(!u)return;tiles.get(u.k).orientation=u.orientation;turns=Math.max(0,turns-1);updateTiles();update('Last turn undone.');});$('reset').addEventListener('click',()=>resetStage(stageIndex));$('hint').addEventListener('click',()=>{if(hasHinted)return;const item=[...tiles.entries()].find(([,t])=>t.primary&&t.orientation!==t.solution);if(item){hasHinted=true;rotate(item[0],true);update('One mirror has been corrected.');}});$('next').addEventListener('click',()=>{if(completed&&stageIndex<STAGES.length-1)resetStage(stageIndex+1);});els.levelPick.addEventListener('change',()=>resetStage(Number(els.levelPick.value)));
STAGES.forEach((s,i)=>{const o=document.createElement('option');o.value=String(i);o.textContent=`${i+1}. ${s.name}`;els.levelPick.appendChild(o);});
// Validation is read-only; used by the local browser test suite.
window.__oreniqPrismDiagnostics=Object.freeze({routeForStage:i=>{const s=stageSetup(i);return[...s.tiles.entries()].filter(([,t])=>t.primary).map(([pos,t])=>({pos,current:t.orientation,solution:t.solution}));},checkSolutions:()=>STAGES.map((_,i)=>{let s=stageSetup(i);return{stage:i+1,solvable:trace(s,true).solved,initiallySolved:trace(s,false).solved,mirrorCount:[...s.tiles.values()].filter(t=>t.primary).length};})});
resetStage(0);
})();
