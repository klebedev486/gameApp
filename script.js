/* ======================================
 * Durak — array-driven game logic
 * ====================================== */

/* ---------- card constants ---------- */
const RANKS = ["6","7","8","9","10","11","12","13","14"]; // 11=J,12=Q,13=K,14=A
const SUITS = ["clubs","diamonds","hearts","spades"];

/* ---------- build & shuffle deck ---------- */
function createDeck(){
  const d=[];
  for(const s of SUITS) for(const r of RANKS)
    d.push({rank:r,suit:s,image:`./cardImages/${s}${r}.png`});
  return d;
}
let deck=createDeck();
function shuffleDeck(){
  for(let i=deck.length-1;i>0;i--){
    const j=Math.floor(Math.random()*(i+1));
    [deck[i],deck[j]]=[deck[j],deck[i]];
  }
}

/* ---------- game-state arrays ---------- */
let player1Cards=[],player2Cards=[];
let gameAreaCards=[];              // [{attacker:{}, defender:{|null}}, …]
let discardPile=[];

/* ---------- other state ---------- */
let trumpSuit=null,trumpCardData=null;
let playerOneActive=false,gameOn=false;

/* ---------- drag helper vars ---------- */
let dragGhost=null,pointerCard=null;

/* ======================================
 * Utility / UI helpers
 * ====================================== */
function updateTurn(){
  const p1=document.getElementById('player-1-btn')||document.getElementById('player-1');
  const p2=document.getElementById('player-2-btn')||document.getElementById('player-2');
  if(playerOneActive){p1.textContent='Player 1 Turn';p2.textContent='Player 2';}
  else{p1.textContent='Player 1';p2.textContent='Player 2 Turn';}
}
const isCardFromPlayer1=el=>!!el.closest('#player1-cards');
const isCardFromPlayer2=el=>!!el.closest('#player2-cards');

function hideDeckBack(){
  const back=document.getElementById("deck-back-image");
  if(back && !back.classList.contains("invisible")) back.classList.add("invisible");
}

function adjustCardSpacing(c){
  if(!c||!c.children.length) return;
  const w=c.children[0].offsetWidth, cnt=c.children.length, mid=c.parentElement.clientWidth,maxGap=15;
  const natural=w*cnt;
  let gap;
  if(natural+maxGap*(cnt-1)<=mid) gap=maxGap;
  else if(natural<=mid) gap=(mid-natural)/(cnt-1);
  else gap=-40;
  Array.from(c.children).forEach((el,i)=>el.style.marginRight=i===cnt-1?'0px':gap+'px');
}

/* ======================================
 * Card DOM creation
 * ====================================== */
function createCardDiv(card,targetId){
  const target=document.getElementById(targetId);
  const div=document.createElement("div");
  div.className="card-div";
  div.id=card.id||`${card.rank}-${card.suit}`;
  div.draggable=true;
  div.dataset.rank=card.rank;
  div.dataset.suit=card.suit;
  div.addEventListener('dragstart',dragStart);
  div.addEventListener('pointerdown',pointerDown);

  const img=document.createElement("img");
  Object.assign(img.style,{width:"100px",height:"150px"});
  img.src=card.image; img.alt=`${card.rank} of ${card.suit}`;
  div.appendChild(img);

  if(targetId==="game-area-cards"){
    div.addEventListener('dragover',allowDrop);
    div.addEventListener('drop',beatCard);
  }
  target.appendChild(div);
  img.onload=()=>adjustCardSpacing(target);
}

/* ======================================
 * Initial deal
 * ====================================== */
function dealCards(){
  const p1=deck.splice(0,6),p2=deck.splice(0,6);
  p1.forEach(c=>{player1Cards.push(c);createCardDiv(c,"player1-cards");});
  p2.forEach(c=>{player2Cards.push(c);createCardDiv(c,"player2-cards");});

  const trump=deck.shift(); trumpCardData=trump; trumpSuit=trump.suit;

  const tc=document.createElement("div");tc.id="trump-card-container";
  Object.assign(tc.style,{position:"absolute",top:"60%",left:"60%",pointerEvents:"none"});
  const ti=document.createElement("img");
  Object.assign(ti.style,{width:"90px",height:"140px",border:"2px solid gold",borderRadius:"5px"});
  ti.src=trump.image; tc.appendChild(ti);
  document.getElementById("deck").appendChild(tc);

  const ga=document.getElementById("game-area-cards");
  const ph=document.createElement("h2");
  ph.textContent="Click/Select Cards and Drag/Drop HERE";
  Object.assign(ph.style,{color:"rgba(0,0,0,0.5)",pointerEvents:"none"});
  Object.assign(ga.style,{justifyContent:"center",alignItems:"center"});
  ga.appendChild(ph);
}

/* ======================================
 * Drag & Drop
 * ====================================== */
function dragStart(e){e.dataTransfer.setData("text/plain",e.currentTarget.id);}
function allowDrop(e){e.preventDefault();}

function createDragGhost(card){
  dragGhost=card.cloneNode(true);
  Object.assign(dragGhost.style,{position:'fixed',pointerEvents:'none',opacity:'0.8',zIndex:'9999'});
  document.body.appendChild(dragGhost);
}
const moveGhost=(x,y)=>dragGhost&&(dragGhost.style.left=x-50+'px',dragGhost.style.top=y-75+'px');
const removeGhost=()=>{if(dragGhost){dragGhost.remove();dragGhost=null;}};

function pointerDown(e){
  if(e.pointerType==='mouse')return;
  e.preventDefault();
  pointerCard=e.currentTarget;
  pointerCard.setPointerCapture(e.pointerId);
  createDragGhost(pointerCard); moveGhost(e.clientX,e.clientY);
  pointerCard.addEventListener('pointermove',pmove);
  pointerCard.addEventListener('pointerup',pup);
}
const pmove=e=>moveGhost(e.clientX,e.clientY);
function pup(e){
  moveGhost(e.clientX,e.clientY); removeGhost();
  pointerCard.style.visibility='hidden';
  const elt=document.elementFromPoint(e.clientX,e.clientY);
  pointerCard.style.visibility='visible';

  if(elt){
    const atk=elt.closest('#game-area-cards .card-div');
    if(atk && atk!==pointerCard){
      beatCard({preventDefault(){},dataTransfer:{getData:()=>pointerCard.id},currentTarget:atk});
    }else{
      const tbl=elt.closest('#game-area-cards');
      if(tbl) drop({preventDefault(){},dataTransfer:{getData:()=>pointerCard.id},target:tbl});
    }
  }
  pointerCard.releasePointerCapture(e.pointerId);
  pointerCard.removeEventListener('pointermove',pmove);
  pointerCard.removeEventListener('pointerup',pup);
  pointerCard=null;
}

/* ---------- rank helper ---------- */
const isValidAttackRank=r=>gameAreaCards.some(s=>s.attacker.rank===r||(s.defender&&s.defender.rank===r));

/* ======================================
 * drop() — attacker plays
 * ====================================== */
function drop(e){
  e.preventDefault();
  const id=e.dataTransfer.getData("text/plain");
  const el=document.getElementById(id); if(!el) return;
  if(playerOneActive && !isCardFromPlayer1(el)) return;
  if(!playerOneActive && !isCardFromPlayer2(el)) return;

  const rank=el.dataset.rank,suit=el.dataset.suit,img=el.querySelector("img").src;
  if(gameAreaCards.length && !isValidAttackRank(rank)) return;

  const ph=document.querySelector("#game-area-cards h2"); if(ph) ph.remove();
  e.target.appendChild(el);
  el.addEventListener('dragover',allowDrop); el.addEventListener('drop',beatCard);

  gameAreaCards.push({attacker:{rank,suit,id,image:img},defender:null});
  adjustCardSpacing(document.getElementById("game-area-cards"));
  /* spacing for hand after removal */
  adjustCardSpacing(isCardFromPlayer1(el)?document.getElementById("player1-cards"):document.getElementById("player2-cards"));
}

/* ======================================
 * beatCard() — defender covers
 * ====================================== */
function beatCard(e){
  e.preventDefault();
  const defId=e.dataTransfer.getData("text/plain");
  const defEl=document.getElementById(defId);
  const atkEl=e.currentTarget;
  if(!defEl||atkEl.children.length>1) return;

  if(playerOneActive && isCardFromPlayer1(defEl)) return;
  if(!playerOneActive && isCardFromPlayer2(defEl)) return;

  const defRank=+defEl.dataset.rank,defSuit=defEl.dataset.suit;
  const attRank=+atkEl.dataset.rank,attSuit=atkEl.dataset.suit;
  const ok=(defSuit===attSuit&&defRank>attRank)||
           (defSuit===trumpSuit&&attSuit!==trumpSuit)||
           (defSuit===trumpSuit&&attSuit===trumpSuit&&defRank>attRank);
  if(!ok) return;

  const oldHandId=isCardFromPlayer1(defEl)?'player1-cards':'player2-cards';
  atkEl.appendChild(defEl);
  Object.assign(defEl.style,{position:"absolute",top:"20px",left:"20px"});

  const img=defEl.querySelector("img").src;
  const stk=gameAreaCards.find(s=>s.attacker.id===atkEl.id);
  if(stk) stk.defender={rank:defRank.toString(),suit:defSuit,id:defId,image:img};

  adjustCardSpacing(document.getElementById(oldHandId));
}

/* ======================================
 * finishRound()
 * ====================================== */
function finishRound(){
  const defenderFailed=gameAreaCards.some(s=>!s.defender);
  const defenderHandId=playerOneActive?"player2-cards":"player1-cards";
  const defenderHandEl=document.getElementById(defenderHandId);
  const destArr=defenderHandId==='player1-cards'?player1Cards:player2Cards;
  const srcArr=defenderHandId==='player1-cards'?player2Cards:player1Cards;

  const moveCard=(cObj)=>{
    /* remove from previous owner array */
    const idx=srcArr.findIndex(k=>k.id===cObj.id);
    if(idx!==-1) srcArr.splice(idx,1);
    /* avoid duplicates in dest array */
    if(!destArr.some(k=>k.id===cObj.id)) destArr.push(cObj);

    let el=document.getElementById(cObj.id);
    if(el){
      el.style.position="";el.style.top=el.style.left="";
      defenderHandEl.appendChild(el);
    }else if(!document.getElementById(cObj.id)){
      createCardDiv(cObj,defenderHandId);
    }
  };

  if(defenderFailed){
    gameAreaCards.forEach(stk=>[stk.attacker,stk.defender].filter(Boolean).forEach(moveCard));
    console.log("Defender takes all cards – attacker keeps turn.");
  }else{
    gameAreaCards.forEach(stk=>{
      [stk.attacker,stk.defender].filter(Boolean).forEach(c=>{
        const ownerArr=player1Cards.find(k=>k.id===c.id)?player1Cards:player2Cards;
        const idx=ownerArr.findIndex(k=>k.id===c.id);
        if(idx!==-1) ownerArr.splice(idx,1);
        discardPile.push({rank:c.rank,suit:c.suit});
        const el=document.getElementById(c.id);
        if(el && el.parentElement) el.parentElement.removeChild(el);
      });
    });
    console.log("All cards beaten – defender becomes attacker.");
    playerOneActive=!playerOneActive;
  }

  adjustCardSpacing(defenderHandEl);
  gameAreaCards=[]; refillPlayerHands(); updateTurn(); checkGameEnd();
}

/* ======================================
 * Refill hands
 * ====================================== */
function refillPlayerHands(){
  const MAX=6;
  const order=playerOneActive
    ?[{id:'player1-cards',arr:player1Cards},{id:'player2-cards',arr:player2Cards}]
    :[{id:'player2-cards',arr:player2Cards},{id:'player1-cards',arr:player1Cards}];

  order.forEach(p=>{
    let need=MAX-document.querySelectorAll(`#${p.id} .card-div`).length;
    while(need>0){
      let card=null;
      if(deck.length) card=deck.shift();
      else if(trumpCardData){card=trumpCardData;trumpCardData=null;
        const t=document.getElementById('trump-card-container');if(t)t.remove();}
      else break;
      p.arr.push(card); createCardDiv(card,p.id); need--;
    }
    adjustCardSpacing(document.getElementById(p.id));
  });
  if(!deck.length) hideDeckBack();
}

/* ======================================
 * End-of-game detection
 * ====================================== */
function checkGameEnd(){
  const deckEmpty=deck.length===0 && !trumpCardData;
  const p1Left=document.querySelectorAll('#player1-cards .card-div').length;
  const p2Left=document.querySelectorAll('#player2-cards .card-div').length;
  if(!deckEmpty||gameAreaCards.length) return;

  let msg='';
  if(p1Left===0&&p2Left===0) msg="It's a draw!";
  else if(p1Left===0)        msg="Player 1 wins!";
  else if(p2Left===0)        msg="Player 2 wins!";
  else return;

  const m=document.getElementById('gameover-modal');
  document.getElementById('gameover-text').textContent=msg+'  Start a new game?';
  m.style.display='block';
}
document.getElementById('gameover-yes').onclick=()=>location.reload();
document.getElementById('gameover-no').onclick =()=>document.getElementById('gameover-modal').style.display='none';

/* ======================================
 * Game start / UI
 * ====================================== */
const startBtn=document.getElementById('start-game');
const p1Lbl=document.getElementById('player-1');
const p2Lbl=document.getElementById('player-2');

startBtn.addEventListener('click',()=>{
  if(gameOn){
    const c=document.getElementById("confirmation-modal");
    c.style.display="block";
    document.getElementById("confirm-yes").onclick=()=>location.reload();
    document.getElementById("confirm-no").onclick =()=>c.style.display="none";
    return;
  }
  shuffleDeck(); dealCards(); gameOn=true; playerOneActive=true;

  p1Lbl.outerHTML='<div id="player-1-btn" class="player-static">Player 1 Turn / Press to Finish</div>';
  p2Lbl.outerHTML='<div id="player-2-btn" class="player-static">Player 2</div>'; updateTurn();

  const fc=document.getElementById('finish-round-container'); fc.innerHTML='';
  const btn=document.createElement('button'); btn.className='player-button';btn.id='finish-round';btn.textContent='Press to Finish Round';
  fc.appendChild(btn); btn.addEventListener('click',finishRound);
});

/* ---------- keep spacing on window resize ---------- */
window.addEventListener('resize',()=>{
  adjustCardSpacing(document.getElementById("player1-cards"));
  adjustCardSpacing(document.getElementById("player2-cards"));
});
