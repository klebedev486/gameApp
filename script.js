/* ======================================
 * Durak — array-driven logic (human + bot)
 *   – HUMAN = Player 1
 *   – BOT   = Player 2   (handled in botAI.js)
 * ====================================== */

/* ---------- card constants ---------- */
const RANKS = ["6","7","8","9","10","11","12","13","14"];   // 11=J…
const SUITS = ["clubs","diamonds","hearts","spades"];

/* ---------- deck helpers ---------- */
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

/* ---------- game state ---------- */
let player1Cards=[], player2Cards=[];
let gameAreaCards=[];                      // [{attacker:{…}, defender:{…}|null}]
let discardPile=[];

let trumpSuit=null, trumpCardData=null;
let playerOneActive=false;                 // true = P1 attacking
let gameOn=false;

/* ---------- drag helpers ---------- */
let dragGhost=null, pointerCard=null;

/* ======================================
 * UI helpers
 * ====================================== */
function updateTurn(){
  const p1=document.getElementById('player-1-btn')||document.getElementById('player-1');
  const p2=document.getElementById('player-2-btn')||document.getElementById('player-2');
  if(playerOneActive){ p1.textContent='Player 1 Turn'; p2.textContent='Player 2'; }
  else                { p1.textContent='Player 1';    p2.textContent='Player 2 Turn'; }
}
const isCardFromPlayer1 = el => !!el.closest('#player1-cards');
const isCardFromPlayer2 = el => !!el.closest('#player2-cards');

function hideDeckBack(){
  const back=document.getElementById("deck-back-image");
  if(back && !back.classList.contains("invisible")) back.classList.add("invisible");
}

function adjustCardSpacing(row){
  if(!row||!row.children.length) return;
  const cardW=row.children[0].offsetWidth;
  const cnt  =row.children.length;
  const mid  =row.parentElement.clientWidth;
  const max  =15;
  const natural=cardW*cnt;
  let gap;
  if(natural+max*(cnt-1)<=mid) gap=max;
  else if(natural<=mid)        gap=(mid-natural)/(cnt-1);
  else                         gap=-40;
  Array.from(row.children).forEach((c,i)=>c.style.marginRight=i===cnt-1?'0':' '+gap+'px');
}

/* ======================================
 * Card creation
 * ====================================== */
function createCardDiv(card,targetId){
  if(document.getElementById(card.id||`${card.rank}-${card.suit}`)) return; // prevent dup
  const row=document.getElementById(targetId);
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
  row.appendChild(div);
  img.onload=()=>adjustCardSpacing(row);
}

/* ======================================
 * Deal
 * ====================================== */
function dealCards(){
  const p1=deck.splice(0,6), p2=deck.splice(0,6);
  p1.forEach(c=>{player1Cards.push(c);createCardDiv(c,"player1-cards");});
  p2.forEach(c=>{player2Cards.push(c);createCardDiv(c,"player2-cards");});

  const trump=deck.shift(); trumpCardData=trump; trumpSuit=trump.suit;
  const tc=document.createElement("div"); tc.id="trump-card-container";
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
 * Drag logic
 * ====================================== */
function dragStart(e){e.dataTransfer.setData("text/plain",e.currentTarget.id);}
function allowDrop(e){e.preventDefault();}

function createGhost(c){
  dragGhost=c.cloneNode(true);
  Object.assign(dragGhost.style,{position:'fixed',pointerEvents:'none',opacity:'0.8',zIndex:'9999'});
  document.body.appendChild(dragGhost);
}
const moveGhost=(x,y)=>dragGhost&&(dragGhost.style.left=x-50+'px',dragGhost.style.top=y-75+'px');
const removeGhost=()=>{if(dragGhost){dragGhost.remove();dragGhost=null;}};

function pointerDown(e){
  if(e.pointerType==='mouse') return;
  e.preventDefault();
  pointerCard=e.currentTarget;
  pointerCard.setPointerCapture(e.pointerId);
  createGhost(pointerCard); moveGhost(e.clientX,e.clientY);
  pointerCard.addEventListener('pointermove',pMove);
  pointerCard.addEventListener('pointerup',pUp);
}
const pMove=e=>moveGhost(e.clientX,e.clientY);
function pUp(e){
  moveGhost(e.clientX,e.clientY); removeGhost();
  pointerCard.style.visibility='hidden';
  const tgt=document.elementFromPoint(e.clientX,e.clientY);
  pointerCard.style.visibility='visible';

  if(tgt){
    const atk=tgt.closest('#game-area-cards .card-div');
    if(atk && atk!==pointerCard){
      beatCard({preventDefault(){},dataTransfer:{getData:()=>pointerCard.id},currentTarget:atk});
    }else{
      const tbl=tgt.closest('#game-area-cards');
      if(tbl) drop({preventDefault(){},dataTransfer:{getData:()=>pointerCard.id},target:tbl});
    }
  }
  pointerCard.releasePointerCapture(e.pointerId);
  pointerCard.removeEventListener('pointermove',pMove);
  pointerCard.removeEventListener('pointerup',pUp);
  pointerCard=null;
}

/* ---------- helpers ---------- */
const validAttack=r=>gameAreaCards.some(s=>s.attacker.rank===r||(s.defender&&s.defender.rank===r));

/* ======================================
 * drop() — human or bot attacker
 * ====================================== */
function drop(e){
  e.preventDefault();
  const id=e.dataTransfer.getData("text/plain");
  const el=document.getElementById(id); if(!el) return;

  if(playerOneActive && !isCardFromPlayer1(el)) return;
  if(!playerOneActive && !isCardFromPlayer2(el)) return;

  const rank=el.dataset.rank, suit=el.dataset.suit, img=el.querySelector("img").src;
  if(gameAreaCards.length && !validAttack(rank)) return;

  document.querySelector("#game-area-cards h2")?.remove();
  e.target.appendChild(el);
  el.addEventListener('dragover',allowDrop);
  el.addEventListener('drop',beatCard);

  gameAreaCards.push({attacker:{rank,suit,id,image:img},defender:null});
  adjustCardSpacing(document.getElementById("game-area-cards"));
  adjustCardSpacing(isCardFromPlayer1(el)?document.getElementById("player1-cards")
                                         :document.getElementById("player2-cards"));

  /* Bot responds if it is defender */
  if( (botAI.HUMAN_IS_P1 &&  playerOneActive) ||
      (!botAI.HUMAN_IS_P1 && !playerOneActive) ){
      botAI.botDefend();
  }
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

  const defRank=+defEl.dataset.rank, defSuit=defEl.dataset.suit;
  const attRank=+atkEl.dataset.rank, attSuit=atkEl.dataset.suit;
  const legal=(defSuit===attSuit&&defRank>attRank)||
              (defSuit===trumpSuit&&attSuit!==trumpSuit)||
              (defSuit===trumpSuit&&attSuit===trumpSuit&&defRank>attRank);
  if(!legal) return;

  const srcRow=isCardFromPlayer1(defEl)?'player1-cards':'player2-cards';
  atkEl.appendChild(defEl);
  Object.assign(defEl.style,{position:"absolute",top:"20px",left:"20px"});

  const img=defEl.querySelector("img").src;
  const stk=gameAreaCards.find(s=>s.attacker.id===atkEl.id);
  if(stk) stk.defender={rank:defRank.toString(),suit:defSuit,id:defId,image:img};
  adjustCardSpacing(document.getElementById(srcRow));

  /* Bot may add more attack cards after human defends */
  if( (botAI.HUMAN_IS_P1 && !playerOneActive) ||
      (!botAI.HUMAN_IS_P1 &&  playerOneActive) ){
      botAI.botAddAttack();
  }
}

/* ======================================
 * finishRound()
 * ====================================== */
function finishRound(){
  const failed=gameAreaCards.some(s=>!s.defender);
  const defHandId=playerOneActive?"player2-cards":"player1-cards";
  const defArr   =defHandId==='player1-cards'?player1Cards:player2Cards;
  const atkArr   =defHandId==='player1-cards'?player2Cards:player1Cards;
  const defRow   =document.getElementById(defHandId);

  const moveCard=c=>{
    const idx=atkArr.findIndex(k=>k.id===c.id);
    if(idx!==-1) atkArr.splice(idx,1);
    if(!defArr.some(k=>k.id===c.id)) defArr.push(c);

    let el=document.getElementById(c.id);
    if(el){
      el.style.position=""; el.style.top=el.style.left="";
      defRow.appendChild(el);
    }else if(!document.getElementById(c.id)){
      createCardDiv(c,defHandId);
    }
  };

  if(failed){
    gameAreaCards.forEach(s=>[s.attacker,s.defender].filter(Boolean).forEach(moveCard));
  }else{
    gameAreaCards.forEach(s=>{
      [s.attacker,s.defender].filter(Boolean).forEach(c=>{
        const owner=player1Cards.find(k=>k.id===c.id)?player1Cards:player2Cards;
        const idx=owner.findIndex(k=>k.id===c.id);
        if(idx!==-1) owner.splice(idx,1);
        discardPile.push({rank:c.rank,suit:c.suit});
        const el=document.getElementById(c.id);
        el?.parentElement?.removeChild(el);
      });
    });
    playerOneActive=!playerOneActive;
  }

  adjustCardSpacing(defRow);
  gameAreaCards=[]; refillHands(); updateTurn(); checkGameEnd();

  /* If bot becomes attacker, start its attack */
  if(!botAI.HUMAN_IS_P1 && playerOneActive)  botAI.botAddAttack();
  if( botAI.HUMAN_IS_P1 && !playerOneActive) botAI.botAddAttack();
}

/* ======================================
 * refillHands()
 * ====================================== */
function refillHands(){
  const MAX=6;
  const seq=playerOneActive
    ?[{id:'player1-cards',arr:player1Cards},{id:'player2-cards',arr:player2Cards}]
    :[{id:'player2-cards',arr:player2Cards},{id:'player1-cards',arr:player1Cards}];

  seq.forEach(p=>{
    let need=MAX-document.querySelectorAll(`#${p.id} .card-div`).length;
    while(need>0){
      let card=null;
      if(deck.length) card=deck.shift();
      else if(trumpCardData){card=trumpCardData;trumpCardData=null;
        document.getElementById('trump-card-container')?.remove();}
      else break;
      p.arr.push(card); createCardDiv(card,p.id); need--;
    }
    adjustCardSpacing(document.getElementById(p.id));
  });
  if(!deck.length) hideDeckBack();
}

/* ======================================
 * end-game
 * ====================================== */
function checkGameEnd(){
  const deckEmpty=deck.length===0 && !trumpCardData;
  if(!deckEmpty||gameAreaCards.length) return;
  const p1=document.querySelectorAll('#player1-cards .card-div').length;
  const p2=document.querySelectorAll('#player2-cards .card-div').length;
  let msg='';
  if(p1===0&&p2===0) msg="It's a draw!";
  else if(p1===0)    msg="Player 1 wins!";
  else if(p2===0)    msg="Player 2 wins!";
  else return;
  document.getElementById('gameover-text').textContent=msg+'  Start a new game?';
  document.getElementById('gameover-modal').style.display='block';
}
document.getElementById('gameover-yes').onclick=()=>location.reload();
document.getElementById('gameover-no').onclick =()=>document.getElementById('gameover-modal').style.display='none';

/* ======================================
 * start / UI
 * ====================================== */
const startBtn=document.getElementById('start-game');
const p1Lbl=document.getElementById('player-1');
const p2Lbl=document.getElementById('player-2');

startBtn.addEventListener('click',()=>{
  if(gameOn){
    const cm=document.getElementById("confirmation-modal");
    cm.style.display="block";
    document.getElementById("confirm-yes").onclick =()=>location.reload();
    document.getElementById("confirm-no").onclick  =()=>cm.style.display="none";
    return;
  }
  shuffleDeck(); dealCards(); gameOn=true; playerOneActive=true;

  p1Lbl.outerHTML='<div id="player-1-btn" class="player-static">Player 1 Turn / Press to Finish</div>';
  p2Lbl.outerHTML='<div id="player-2-btn" class="player-static">Player 2</div>';
  updateTurn();

  const fc=document.getElementById('finish-round-container'); fc.innerHTML='';
  const btn=document.createElement('button');
  btn.className='player-button'; btn.id='finish-round'; btn.textContent='Press to Finish Round';
  fc.appendChild(btn); btn.addEventListener('click',finishRound);
});

/* keep spacing on resize */
window.addEventListener('resize',()=>{
  adjustCardSpacing(document.getElementById("player1-cards"));
  adjustCardSpacing(document.getElementById("player2-cards"));
});
