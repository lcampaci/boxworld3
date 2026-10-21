(() => {
"use strict";
const LEVELS=window.BOXWORLD_LEVELS;
const board=document.getElementById("board"),movesEl=document.getElementById("moves"),pushesEl=document.getElementById("pushes");
const levelNum=document.getElementById("levelNum"),statusLevel=document.getElementById("statusLevel"),message=document.getElementById("message");
const solutionDialog=document.getElementById("solutionDialog"),solutionBoard=document.getElementById("solutionBoard"),levelDialog=document.getElementById("levelDialog"),helpDialog=document.getElementById("helpDialog"),winDialog=document.getElementById("winDialog"),gameDialog=document.getElementById("gameDialog"),passwordDialog=document.getElementById("passwordDialog"),aboutDialog=document.getElementById("aboutDialog");
const PROGRESS_KEY="boxworld_completed_levels_v1";
const UNLOCK_ALL_KEY="boxworld_all_levels_unlocked_v1";
const secretDialog=document.getElementById("secretDialog");
const cheatDialog=document.getElementById("cheatDialog");
let wallCheatEnabled=false,wallModifierHeld=false;
let teleportCheatEnabled=false,teleportClickArmed=false;
let allLevelsUnlocked=localStorage.getItem(UNLOCK_ALL_KEY)==="1";
// Altere esta senha para outra de sua preferência.
const SOLUTION_PASSWORD="5847";
function loadProgress(){try{const a=JSON.parse(localStorage.getItem(PROGRESS_KEY)||"[]");return new Set(a.filter(n=>Number.isInteger(n)&&n>=0&&n<LEVELS.length));}catch(_){return new Set();}}
let current=0,state=null,history=[],moves=0,pushes=0,completed=loadProgress(),won=false,playTimer=null,solutionState=null,solutionMoves=[],solutionIndex=0;
const TILE=30, WIDTH=16, HEIGHT=14;
const dirs={ArrowUp:[0,-1],ArrowDown:[0,1],ArrowLeft:[-1,0],ArrowRight:[1,0],w:[0,-1],a:[-1,0],s:[0,1],d:[1,0],W:[0,-1],A:[-1,0],S:[0,1],D:[1,0]};
function parseLevel(level){
 const original=level.tiles.slice(),terrain=original.map(v=>v===4||v===6||v===7?7:(v===3||v===5?2:v));
 const boxes=new Set(),goals=new Set();let player=-1;
 original.forEach((v,i)=>{if(v===3||v===4)boxes.add(i);if(v===5||v===6)player=i;if(v===4||v===6||v===7)goals.add(i);});
 return {terrain,boxes,goals,player};
}
function clone(s){return{terrain:s.terrain.slice(),boxes:new Set(s.boxes),goals:new Set(s.goals),player:s.player};}
function stopSolution(){if(playTimer!==null){clearTimeout(playTimer);playTimer=null;}}
function highestUnlocked(){return allLevelsUnlocked?LEVELS.length-1:Math.min(LEVELS.length-1,completed.size?Math.max(...completed)+1:0);}
function loadLevel(n){stopSolution();n=Math.max(0,Math.min(LEVELS.length-1,n));if(n>highestUnlocked()){message.textContent="Fase bloqueada! Conclua a fase "+(highestUnlocked()+1)+" para desbloqueá-la.";return false;}current=n;state=parseLevel(LEVELS[current]);history=[];moves=0;pushes=0;won=false;
 levelNum.textContent=current+1;statusLevel.textContent="Fase "+(current+1);message.textContent="Empurre todas as caixas para os alvos.";render();renderLevels();updateNavigation();return true;}
function tileSprite(v){return "./imagens/"+v+".gif";}
function drawBoard(target,source,clickable=false){
 target.innerHTML="";const fragment=document.createDocumentFragment();
 for(let i=0;i<WIDTH*HEIGHT;i++){
  let v=source.terrain[i];if(source.player===i)v=source.goals.has(i)?6:5;else if(source.boxes.has(i))v=source.goals.has(i)?4:3;
  const img=document.createElement("img");img.className="tile";img.alt="";img.draggable=false;img.src=tileSprite(v);img.dataset.index=i;
  if(clickable)img.addEventListener("click",()=>{
   if(teleportCheatEnabled&&teleportClickArmed){
    teleportClickArmed=false;
    if(i!==state.player){save();state.player=i;moves++;won=false;if(winDialog.open)winDialog.close();render();checkWin();message.textContent="Bonequinho teleportado para a posição escolhida.";}
    return;
   }
   const d=i-state.player;if(d===-WIDTH)step(0,-1);else if(d===WIDTH)step(0,1);else if(d===-1&&Math.floor(i/WIDTH)===Math.floor(state.player/WIDTH))step(-1,0);else if(d===1&&Math.floor(i/WIDTH)===Math.floor(state.player/WIDTH))step(1,0);
  });
  fragment.appendChild(img);
 }target.appendChild(fragment);
}
function render(){drawBoard(board,state,true);movesEl.textContent=moves;pushesEl.textContent=pushes;}
function save(){history.push({state:clone(state),moves,pushes});if(history.length>1000)history.shift();}
function step(dx,dy,fromSolution=false,throughWall=false){
 if(won)return false;
 if(!fromSolution)stopSolution();
 const x=state.player%WIDTH,y=Math.floor(state.player/WIDTH),nx=x+dx,ny=y+dy;
 if(nx<0||nx>=WIDTH||ny<0||ny>=HEIGHT)return false;
 const next=ny*WIDTH+nx;
 if(!throughWall&&(state.terrain[next]===1||state.terrain[next]===0))return false;
 const box=state.boxes.has(next),after=(ny+dy)*WIDTH+(nx+dx);
 // Na trapaça, atravessa caixas sem empurrá-las; a caixa permanece no lugar.
 if(box&&throughWall){save();state.player=next;moves++;render();return true;}
 if(box){
  if(nx+dx<0||nx+dx>=WIDTH||ny+dy<0||ny+dy>=HEIGHT)return false;
  if(state.terrain[after]===0||state.terrain[after]===1||state.boxes.has(after))return false;
 }
 save();state.player=next;moves++;
 if(box){state.boxes.delete(next);state.boxes.add(after);pushes++;}
 render();checkWin();return true;
}
function undo(){stopSolution();if(!history.length)return;won=false;if(winDialog.open)winDialog.close();const h=history.pop();state=h.state;moves=h.moves;pushes=h.pushes;message.textContent="Último movimento desfeito.";render();updateNavigation();}
function restart(){loadLevel(current);}
function checkWin(){if(state.boxes.size===state.goals.size&&[...state.goals].every(g=>state.boxes.has(g))){won=true;completed.add(current);try{localStorage.setItem(PROGRESS_KEY,JSON.stringify([...completed].sort((a,b)=>a-b)));}catch(_){}message.textContent="Fase concluída! A próxima fase foi desbloqueada.";renderLevels();updateNavigation();stopSolution();setTimeout(()=>{if(won&&!winDialog.open)winDialog.showModal();},120);}}
function updateNavigation(){document.getElementById("winNext").disabled=current>=LEVELS.length-1;}
function renderLevels(){const grid=document.getElementById("levelGrid");grid.innerHTML="";const unlocked=highestUnlocked();LEVELS.forEach((l,i)=>{const b=document.createElement("button");const isLocked=i>unlocked;b.textContent=isLocked?"🔒":""+(i+1);if(i===current)b.classList.add("current");if(completed.has(i))b.classList.add("done");if(isLocked){b.classList.add("locked");b.disabled=true;b.title="Bloqueada — conclua a fase "+i+" para liberar.";}else{b.title="Fase "+(i+1)+" · empurrões de referência: "+l.pushes;b.onclick=()=>{if(loadLevel(i))levelDialog.close();};}grid.appendChild(b);});}
function playSolution(){
 stopSolution();document.getElementById("passwordError").textContent="";document.getElementById("solutionPasswordInput").value="";passwordDialog.showModal();document.getElementById("solutionPasswordInput").focus();
}
function applySolutionMove(source,code){
 const dirsByCode={1:[0,1],2:[0,-1],3:[1,0],4:[-1,0]};const d=dirsByCode[code];if(!d)return;
 const [dx,dy]=d,x=source.player%WIDTH,y=Math.floor(source.player/WIDTH),nx=x+dx,ny=y+dy;if(nx<0||nx>=WIDTH||ny<0||ny>=HEIGHT)return;
 const next=ny*WIDTH+nx,after=(ny+dy)*WIDTH+(nx+dx);if(source.terrain[next]===0||source.terrain[next]===1)return;
 if(source.boxes.has(next)){if(nx+dx<0||nx+dx>=WIDTH||ny+dy<0||ny+dy>=HEIGHT||source.terrain[after]===0||source.terrain[after]===1||source.boxes.has(after))return;source.boxes.delete(next);source.boxes.add(after);}source.player=next;
}
function renderSolutionPreview(){drawBoard(solutionBoard,solutionState,false);document.getElementById("solutionStepLabel").textContent="Passo "+solutionIndex+" / "+solutionMoves.length;document.getElementById("solutionPrevBtn").disabled=solutionIndex<=0;document.getElementById("solutionNextBtn").disabled=solutionIndex>=solutionMoves.length;}
function stopSolution(){if(playTimer!==null){clearTimeout(playTimer);playTimer=null;}const b=document.getElementById("solutionPlayBtn");if(b)b.textContent="▶ Reproduzir";}
function startSolution(){
 const sol=LEVELS[current].solution;if(!sol||!sol.length){message.textContent="Não há solução guardada para esta fase.";return;}
 solutionMoves=sol.filter(code=>code>=1&&code<=4);solutionIndex=0;solutionState=parseLevel(LEVELS[current]);document.getElementById("solutionLevelLabel").textContent=current+1;renderSolutionPreview();solutionDialog.showModal();
}
function advanceSolution(){if(solutionIndex>=solutionMoves.length)return;applySolutionMove(solutionState,solutionMoves[solutionIndex++]);renderSolutionPreview();}
function playSolutionPreview(){if(playTimer!==null){stopSolution();return;}if(solutionIndex>=solutionMoves.length){solutionIndex=0;solutionState=parseLevel(LEVELS[current]);renderSolutionPreview();}document.getElementById("solutionPlayBtn").textContent="■ Pausar";const tick=()=>{if(!solutionDialog.open||solutionIndex>=solutionMoves.length){stopSolution();return;}advanceSolution();playTimer=setTimeout(tick,220);};tick();}

function showCheatDialog(){
 if(document.querySelector("dialog[open]"))return;
 document.getElementById("cheatError").textContent="";
 document.getElementById("cheatCodeInput").value="";
 cheatDialog.showModal();
 document.getElementById("cheatCodeInput").focus();
}
function applyCheat(code){
 const normalized=code.trim().toLowerCase();
 if(normalized==="#bw01"){
  cheatDialog.close(); startSolution(); return;
 }
 if(normalized==="#bw02"){
  allLevelsUnlocked=true;
  try{localStorage.setItem(UNLOCK_ALL_KEY,"1");}catch(_){}
  renderLevels(); updateNavigation();
  document.getElementById("cheatError").textContent="";
  cheatDialog.close(); message.textContent="Todas as fases foram desbloqueadas."; return;
 }
 if(normalized==="#bw03"){
  allLevelsUnlocked=false;
  try{localStorage.setItem(UNLOCK_ALL_KEY,"0");}catch(_){}
  renderLevels(); updateNavigation();
  if(current>highestUnlocked())loadLevel(highestUnlocked());
  cheatDialog.close(); message.textContent="Fases bloqueadas novamente. Seu progresso concluído foi mantido."; return;
 }
 if(normalized==="#bw04"){
  wallCheatEnabled=!wallCheatEnabled;
  wallModifierHeld=false;
  cheatDialog.close();
  message.textContent=wallCheatEnabled
   ? "Trapaça de atravessar paredes ativada. Digite #bw04 novamente para desativar."
   : "Trapaça de atravessar paredes desativada.";
  return;
 }
 if(normalized==="#bw05"){
  teleportCheatEnabled=!teleportCheatEnabled;
  teleportClickArmed=false;
  cheatDialog.close();
  message.textContent=teleportCheatEnabled
   ? "Trapaça #bw05 ativada. Pressione ESC e clique no tabuleiro para teleportar o bonequinho. Digite #bw05 novamente para desativar."
   : "Trapaça #bw05 desativada.";
  return;
 }
 document.getElementById("cheatError").textContent="Código inválido.";
 document.getElementById("cheatCodeInput").select();
}
function exportProgress(){
 const data={format:"boxworld-save",version:1,savedAt:new Date().toISOString(),completed:[...completed].sort((a,b)=>a-b),allLevelsUnlocked,currentLevel:current};
 const blob=new Blob([JSON.stringify(data,null,2)],{type:"application/json"});
 const url=URL.createObjectURL(blob);const a=document.createElement("a");
 a.href=url;a.download="boxworld-salvamento.json";document.body.appendChild(a);a.click();a.remove();URL.revokeObjectURL(url);
 message.textContent="Arquivo JSON de progresso salvo.";
}
function importProgressFile(file){
 if(!file)return;
 const reader=new FileReader();
 reader.onload=()=>{
  try{
   const data=JSON.parse(String(reader.result||""));
   if(!data||data.format!=="boxworld-save"||!Array.isArray(data.completed))throw new Error("Formato inválido");
   const imported=new Set(data.completed.filter(n=>Number.isInteger(n)&&n>=0&&n<LEVELS.length));
   completed=imported;
   allLevelsUnlocked=data.allLevelsUnlocked===true;
   localStorage.setItem(PROGRESS_KEY,JSON.stringify([...completed].sort((a,b)=>a-b)));
   localStorage.setItem(UNLOCK_ALL_KEY,allLevelsUnlocked?"1":"0");
   const target=Number.isInteger(data.currentLevel)?Math.max(0,Math.min(LEVELS.length-1,data.currentLevel)):highestUnlocked();
   renderLevels();
   if(!loadLevel(Math.min(target,highestUnlocked())))loadLevel(highestUnlocked());
   message.textContent="Progresso importado com sucesso.";
  }catch(_){message.textContent="Não foi possível importar. Selecione um arquivo JSON de salvamento do BoxWorld.";}
  document.getElementById("importSaveInput").value="";
 };
 reader.onerror=()=>{message.textContent="Erro ao ler o arquivo JSON.";document.getElementById("importSaveInput").value="";};
 reader.readAsText(file);
}
document.getElementById("importSaveInput").addEventListener("change",e=>importProgressFile(e.target.files[0]));
// O atalho secreto é capturado na fase de captura para funcionar mesmo quando
// o foco está em um elemento do jogo. Usa e.code para não depender do layout do teclado.
window.addEventListener("keydown",e=>{
 const key=e.key.toLowerCase();
 if(e.ctrlKey && e.altKey && (e.code==="KeyC" || key==="c" || e.keyCode===67)){
  e.preventDefault(); e.stopPropagation(); e.stopImmediatePropagation();
  if(!e.repeat)showCheatDialog();
  return;
 }

 if(teleportCheatEnabled && e.key==="Escape" && !document.querySelector("dialog[open]")){
  teleportClickArmed=true;e.preventDefault();e.stopPropagation();return;
 }
 if(e.altKey && key==="z"){wallModifierHeld=true;e.preventDefault();return;}
 if(wallCheatEnabled && e.altKey && wallModifierHeld && dirs[e.key]){
  e.preventDefault(); e.stopPropagation(); if(!e.repeat)step(...dirs[e.key],false,true); return;
 }
 if(e.ctrlKey && ["r","z","b","m","s","i","a"].includes(key)){
  e.preventDefault();e.stopPropagation();
  if(e.repeat)return;
  if(key==="a"){
   if(!document.querySelector("dialog[open]"))helpDialog.showModal();
   return;
  }
  if(key==="i"){
   if(!document.querySelector("dialog[open]"))document.getElementById("importSaveInput").click();
   return;
  }
  if(document.querySelector("dialog[open]"))return;
  if(key==="r")restart();
  else if(key==="z")undo();
  else if(key==="b"){if(current>0)loadLevel(current-1);}
  else if(key==="m"){if(current<highestUnlocked())loadLevel(current+1);}
  else if(key==="s")exportProgress();
  return;
 }
 if(winDialog.open && (e.key === "Enter" || e.key === " ")){
  e.preventDefault();winDialog.close();
  if(current < LEVELS.length - 1) loadLevel(current + 1);
  else message.textContent = "Parabéns! Você concluiu todas as fases.";
  return;
 }
 if(document.querySelector("dialog[open]"))return;
 if(dirs[e.key]){e.preventDefault();step(...dirs[e.key]);}
 }, true);
document.addEventListener("keyup",e=>{if(e.key.toLowerCase()==="z")wallModifierHeld=false;});
document.getElementById("levelsMenu").onclick=()=>levelDialog.showModal();
document.getElementById("helpMenu").onclick=()=>helpDialog.showModal();
const gameMenuWrap=document.getElementById("gameMenuWrap");
const gameMenuButton=document.getElementById("gameMenu");
const gameDropdown=document.getElementById("gameDropdown");
function closeGameMenu(){gameDropdown.classList.remove("open");gameMenuButton.setAttribute("aria-expanded","false");}
gameMenuWrap.addEventListener("mouseenter",()=>{gameDropdown.classList.add("open");gameMenuButton.setAttribute("aria-expanded","true");});
gameMenuWrap.addEventListener("mouseleave",closeGameMenu);
gameMenuButton.addEventListener("click",()=>{const open=!gameDropdown.classList.contains("open");gameDropdown.classList.toggle("open",open);gameMenuButton.setAttribute("aria-expanded",String(open));});
document.addEventListener("click",e=>{if(!gameMenuWrap.contains(e.target))closeGameMenu();});
document.getElementById("menuSaveProgress").onclick=()=>{closeGameMenu();exportProgress();};
document.getElementById("menuImportProgress").onclick=()=>{closeGameMenu();document.getElementById("importSaveInput").click();};
document.getElementById("aboutMenu").onclick=()=>aboutDialog.showModal();
document.getElementById("menuRestart").onclick=()=>{closeGameMenu();if(confirm("Reiniciar a fase "+(current+1)+"?"))restart();};
document.getElementById("menuUndo").onclick=()=>{closeGameMenu();undo();};
document.getElementById("secretForm").addEventListener("submit",e=>{
 e.preventDefault();
 const input=document.getElementById("secretPasswordInput");
 if(input.value.trim()!=="5847"){
  document.getElementById("secretError").textContent="Senha incorreta.";input.select();return;
 }
 const mode=document.getElementById("secretMode").value;
 allLevelsUnlocked=mode==="unlock";
 try{localStorage.setItem(UNLOCK_ALL_KEY,allLevelsUnlocked?"1":"0");}catch(_){}
 secretDialog.close();renderLevels();updateNavigation();
 if(current>highestUnlocked())loadLevel(highestUnlocked());
 message.textContent=allLevelsUnlocked?"Todas as fases foram desbloqueadas.":"Desbloqueio por senha desativado. Seu progresso normal foi mantido.";
});
document.getElementById("cheatForm").addEventListener("submit",e=>{
 e.preventDefault(); applyCheat(document.getElementById("cheatCodeInput").value);
});
document.getElementById("passwordForm").addEventListener("submit",e=>{
 e.preventDefault();
 const input=document.getElementById("solutionPasswordInput");
 if(input.value.trim().toUpperCase() !== SOLUTION_PASSWORD){document.getElementById("passwordError").textContent="Senha incorreta. A solução continua bloqueada.";input.select();return;}
 passwordDialog.close();startSolution();
});
document.getElementById("solutionPlayBtn").onclick=playSolutionPreview;document.getElementById("solutionPrevBtn").onclick=()=>{stopSolution();if(solutionIndex>0){solutionIndex--;solutionState=parseLevel(LEVELS[current]);for(let i=0;i<solutionIndex;i++)applySolutionMove(solutionState,solutionMoves[i]);renderSolutionPreview();}};document.getElementById("solutionNextBtn").onclick=()=>{stopSolution();advanceSolution();};
document.getElementById("winNext").onclick=()=>{winDialog.close();if(current<LEVELS.length-1)loadLevel(current+1);};
document.querySelectorAll("[data-close]").forEach(b=>b.onclick=()=>{const dlg=document.getElementById(b.dataset.close);if(dlg.id==="solutionDialog")stopSolution();dlg.close();});
solutionDialog.addEventListener("close",stopSolution);
let installPrompt=null;
const installBtn=document.getElementById("installBtn");
window.addEventListener("beforeinstallprompt",e=>{e.preventDefault();installPrompt=e;installBtn.hidden=false;});
installBtn.addEventListener("click",async()=>{
 if(!installPrompt)return;
 installPrompt.prompt();
 await installPrompt.userChoice;
 installPrompt=null;installBtn.hidden=true;
});
window.addEventListener("appinstalled",()=>{installBtn.hidden=true;installPrompt=null;message.textContent="BoxWorld instalado com sucesso!";});
if("serviceWorker" in navigator && (location.protocol==="https:" || location.hostname==="localhost" || location.hostname==="127.0.0.1")){
 window.addEventListener("load",()=>navigator.serviceWorker.register("./service-worker.js").catch(err=>console.error("Falha ao registrar o modo offline:",err)));
}
// Ao reabrir o jogo, retoma a primeira fase ainda não concluída.
// Se todas estiverem concluídas, abre a última fase.
const resumeLevel = highestUnlocked();
loadLevel(completed.size === LEVELS.length ? LEVELS.length - 1 : resumeLevel);
})();
