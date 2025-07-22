/* ======================================
 * Durak — full array-driven game logic
 * ====================================== */

/* ---------- card constants ---------- */
const RANKS = ["6", "7", "8", "9", "10", "11", "12", "13", "14"]; // 11=J,12=Q,13=K,14=A
const SUITS = ["clubs", "diamonds", "hearts", "spades"];

/* ---------- build & shuffle deck ---------- */
function createDeck() {
    const deck = [];
    for (const suit of SUITS) {
        for (const rank of RANKS) {
            deck.push({
                rank,
                suit,
                image: `./cardImages/${suit}${rank}.png`
            });
        }
    }
    return deck;
}
let deck = createDeck();

function shuffleDeck() {
    for (let i = deck.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [deck[i], deck[j]] = [deck[j], deck[i]];
    }
}

/* ---------- game-state arrays ---------- */
let player1Cards   = [];          // purely data, not DOM nodes
let player2Cards   = [];
let gameAreaCards  = [];          // [{ attacker:{…}, defender:{…}|null }, …]
let discardPile    = [];

/* ---------- other state ---------- */
let trumpSuit       = null;
let trumpCardData   = null;
let playerOneActive = false;      // true = P1 attacking
let gameOn          = false;

/* ---------- drag-helper vars ---------- */
let dragGhost   = null;
let pointerCard = null;

/* ======================================
 * Utility / UI helpers
 * ====================================== */

function updateTurn() {
    const p1Label = document.getElementById('player-1-btn') || document.getElementById('player-1');
    const p2Label = document.getElementById('player-2-btn') || document.getElementById('player-2');

    if (playerOneActive) {
        p1Label.textContent = 'Player 1 Turn';
        p2Label.textContent = 'Player 2';
    } else {
        p1Label.textContent = 'Player 1';
        p2Label.textContent = 'Player 2 Turn';
    }
}

function isCardFromPlayer1(el) { return el.closest('#player1-cards'); }
function isCardFromPlayer2(el) { return el.closest('#player2-cards'); }

function hideDeckBack() {
    const back = document.getElementById("deck-back-image");
    if (back && !back.classList.contains("invisible")) back.classList.add("invisible");
}

function adjustCardSpacing(container) {
    if (!container || !container.children.length) return;

    const cardW  = container.children[0].offsetWidth;  // 100px
    const count  = container.children.length;
    const midW   = container.parentElement.clientWidth;
    const maxGap = 15;

    const natural = cardW * count;
    let gap;
    if (natural + maxGap * (count - 1) <= midW)       gap = maxGap;
    else if (natural <= midW)                         gap = (midW - natural) / (count - 1);
    else                                              gap = -40;

    Array.from(container.children).forEach((c, i) => {
        c.style.marginRight = i === count - 1 ? '0px' : gap + 'px';
    });
}

/* ======================================
 * Card DOM creation
 * ====================================== */
function createCardDiv(card, containerId) {
    const container = document.getElementById(containerId);

    const cardDiv = document.createElement("div");
    cardDiv.className  = "card-div";
    cardDiv.id         = card.id || `${card.rank}-${card.suit}`;
    cardDiv.draggable  = true;
    cardDiv.dataset.rank = card.rank;
    cardDiv.dataset.suit = card.suit;
    cardDiv.addEventListener('dragstart', dragStart);
    cardDiv.addEventListener('pointerdown', pointerDown); // touch / pen

    const img = document.createElement("img");
    img.src   = card.image;
    img.alt   = `${card.rank} of ${card.suit}`;
    img.style.width  = "100px";
    img.style.height = "150px";
    cardDiv.appendChild(img);

    if (containerId === "game-area-cards") {
        cardDiv.addEventListener("dragover", allowDrop);
        cardDiv.addEventListener("drop", beatCard);
    }

    container.appendChild(cardDiv);
    img.onload = () => adjustCardSpacing(container);
}

/* ======================================
 * Initial deal
 * ====================================== */
function dealCards() {
    const p1 = deck.splice(0, 6);
    const p2 = deck.splice(0, 6);

    p1.forEach(c => { player1Cards.push(c); createCardDiv(c, "player1-cards"); });
    p2.forEach(c => { player2Cards.push(c); createCardDiv(c, "player2-cards"); });

    const trump = deck.shift();
    trumpCardData = trump;
    trumpSuit     = trump.suit;

    /* show face-up trump */
    const tc = document.createElement("div");
    tc.id = "trump-card-container";
    tc.style.position = "absolute"; tc.style.top = "60%"; tc.style.left = "60%";
    tc.style.pointerEvents = "none";
    const ti = document.createElement("img");
    ti.src = trump.image; ti.alt = "";
    ti.style.width="90px";ti.style.height="140px";ti.style.border="2px solid gold";ti.style.borderRadius="5px";
    tc.appendChild(ti);
    document.getElementById("deck").appendChild(tc);

    /* placeholder */
    const ga = document.getElementById("game-area-cards");
    const txt = document.createElement("h2");
    txt.textContent = "Click/Select Cards and Drag/Drop HERE";
    txt.style.color="rgba(0,0,0,0.5)";txt.style.pointerEvents="none";
    ga.style.justifyContent="center";ga.style.alignItems="center";
    ga.appendChild(txt);
}

/* ======================================
 * Drag & Drop
 * ====================================== */
function dragStart(e){ e.dataTransfer.setData("text/plain", e.currentTarget.id); }
function allowDrop(e){ e.preventDefault(); }

/* Ghost helpers for touch */
function createDragGhost(card){
    dragGhost = card.cloneNode(true);
    Object.assign(dragGhost.style,{position:'fixed',pointerEvents:'none',opacity:'0.8',zIndex:'9999'});
    document.body.appendChild(dragGhost);
}
function moveDragGhost(x,y){ if(dragGhost){dragGhost.style.left=x-50+'px';dragGhost.style.top=y-75+'px';}}
function removeDragGhost(){ if(dragGhost){dragGhost.remove();dragGhost=null;} }

function pointerDown(e){
    if(e.pointerType==='mouse')return;
    e.preventDefault();
    pointerCard = e.currentTarget;
    pointerCard.setPointerCapture(e.pointerId);
    createDragGhost(pointerCard); moveDragGhost(e.clientX,e.clientY);
    pointerCard.addEventListener('pointermove',pointerMove);
    pointerCard.addEventListener('pointerup',pointerUp);
}
function pointerMove(e){ moveDragGhost(e.clientX,e.clientY); }
function pointerUp(e){
    moveDragGhost(e.clientX,e.clientY); removeDragGhost();
    pointerCard.style.visibility='hidden';
    const elem = document.elementFromPoint(e.clientX,e.clientY);
    pointerCard.style.visibility='visible';

    if(elem){
        const atk = elem.closest('#game-area-cards .card-div');
        if(atk && atk!==pointerCard){
            beatCard({preventDefault(){},dataTransfer:{getData:()=>pointerCard.id},currentTarget:atk});
        }else{
            const table = elem.closest('#game-area-cards');
            if(table){
                drop({preventDefault(){},dataTransfer:{getData:()=>pointerCard.id},target:table});
            }
        }
    }
    pointerCard.releasePointerCapture(e.pointerId);
    pointerCard.removeEventListener('pointermove',pointerMove);
    pointerCard.removeEventListener('pointerup',pointerUp);
    pointerCard=null;
}

/* ---------- rank helper (array-based) ---------- */
function isValidAttackRank(rank){
    return gameAreaCards.some(s =>
        s.attacker.rank === rank ||
        (s.defender && s.defender.rank === rank)
    );
}

/* ======================================
 * drop() — attacker plays a card
 * ====================================== */
function drop(e){
    e.preventDefault();
    const id = e.dataTransfer.getData("text/plain");
    const cardEl = document.getElementById(id);
    if(!cardEl) return;

    /* turn guards */
    if(playerOneActive && !isCardFromPlayer1(cardEl)) return;
    if(!playerOneActive && !isCardFromPlayer2(cardEl)) return;

    const rank = cardEl.dataset.rank;
    const suit = cardEl.dataset.suit;
    const img  = cardEl.querySelector("img").src;

    if(gameAreaCards.length && !isValidAttackRank(rank)) return;

    const placeholder = document.querySelector("#game-area-cards h2");
    if(placeholder) placeholder.remove();

    e.target.appendChild(cardEl);
    cardEl.addEventListener("dragover",allowDrop);
    cardEl.addEventListener("drop",beatCard);

    gameAreaCards.push({
        attacker:{rank,suit,id,image:img},
        defender:null
    });
    adjustCardSpacing(document.getElementById('game-area-cards'));
}

/* ======================================
 * beatCard() — defender covers attacker
 * ====================================== */
function beatCard(e){
    e.preventDefault();
    const defId = e.dataTransfer.getData("text/plain");
    const defEl = document.getElementById(defId);
    const atkEl = e.currentTarget;
    if(!defEl || atkEl.children.length>1) return;

    if(playerOneActive && isCardFromPlayer1(defEl)) return;
    if(!playerOneActive && isCardFromPlayer2(defEl)) return;

    const defRank=+defEl.dataset.rank, defSuit=defEl.dataset.suit;
    const attRank=+atkEl.dataset.rank, attSuit=atkEl.dataset.suit;

    const ok =
        (defSuit===attSuit && defRank>attRank) ||
        (defSuit===trumpSuit && attSuit!==trumpSuit) ||
        (defSuit===trumpSuit && attSuit===trumpSuit && defRank>attRank);
    if(!ok) return;

    atkEl.appendChild(defEl);
    Object.assign(defEl.style,{position:"absolute",top:"20px",left:"20px"});

    const img = defEl.querySelector("img").src;
    const stack = gameAreaCards.find(s => s.attacker.id===atkEl.id);
    if(stack){
        stack.defender={rank:defRank.toString(),suit:defSuit,id:defId,image:img};
    }
}

/* ======================================
 * finishRound() — resolve table
 * ====================================== */
function finishRound(){
    const defenderFailed = gameAreaCards.some(s => !s.defender);
    const defenderHandId = playerOneActive ? "player2-cards" : "player1-cards";
    const defenderHandEl = document.getElementById(defenderHandId);

    function moveOrRecreate(cardObj, destEl){
        let el = document.getElementById(cardObj.id);
        if(el){
            el.style.position=""; el.style.top=el.style.left="";
            destEl.appendChild(el);
        }else{
            createCardDiv(cardObj,destEl.id);
        }
    }

    if(defenderFailed){
        gameAreaCards.forEach(stk => [stk.attacker, stk.defender].filter(Boolean)
            .forEach(c => moveOrRecreate(c, defenderHandEl)));
        console.log("Defender takes all cards – attacker keeps turn.");
    }else{
        gameAreaCards.forEach(stk => [stk.attacker, stk.defender].filter(Boolean)
            .forEach(c =>{
                discardPile.push({rank:c.rank,suit:c.suit});
                const el=document.getElementById(c.id);
                if(el && el.parentElement) el.parentElement.removeChild(el);
            }));
        console.log("All cards beaten – defender becomes attacker.");
        playerOneActive = !playerOneActive;
    }

    adjustCardSpacing(defenderHandEl);
    gameAreaCards = [];
    refillPlayerHands();
    updateTurn();
    checkGameEnd();
}

/* ======================================
 * Refill hands after round
 * ====================================== */
function refillPlayerHands(){
    const MAX = 6;
    const order = playerOneActive
        ? [{id:'player1-cards',arr:player1Cards},
           {id:'player2-cards',arr:player2Cards}]
        : [{id:'player2-cards',arr:player2Cards},
           {id:'player1-cards',arr:player1Cards}];

    order.forEach(p=>{
        let need = MAX - document.querySelectorAll('#'+p.id+' .card-div').length;
        while(need>0){
            let card=null;
            if(deck.length) card=deck.shift();
            else if(trumpCardData){ card=trumpCardData; trumpCardData=null;
                const t=document.getElementById('trump-card-container'); if(t)t.remove();
            }else break;

            p.arr.push(card); createCardDiv(card,p.id); need--;
        }
        adjustCardSpacing(document.getElementById(p.id));
    });
    if(!deck.length) hideDeckBack();
}

/* ======================================
 * Game start / UI buttons
 * ====================================== */
const startBtn = document.getElementById('start-game');
const p1Label  = document.getElementById('player-1');
const p2Label  = document.getElementById('player-2');

startBtn.addEventListener('click',()=>{
    if(gameOn){
        document.getElementById("confirmation-modal").style.display="block";
        document.getElementById("confirm-yes").onclick = ()=>location.reload();
        document.getElementById("confirm-no").onclick  = ()=>{document.getElementById("confirmation-modal").style.display="none";};
        return;
    }
    shuffleDeck(); dealCards();
    gameOn=true; playerOneActive=true;

    p1Label.outerHTML=`<div id="player-1-btn" class="player-static">Player 1 Turn / Press to Finish</div>`;
    p2Label.outerHTML=`<div id="player-2-btn" class="player-static">Player 2</div>`;
    updateTurn();

    const finishCont = document.getElementById('finish-round-container');
    finishCont.innerHTML='';
    const frBtn = document.createElement('button');
    frBtn.className='player-button';frBtn.id='finish-round';frBtn.textContent='Press to Finish Round';
    finishCont.appendChild(frBtn);
    frBtn.addEventListener('click',finishRound);
});

/* ---------- resize adjust ---------- */
window.addEventListener('resize',()=>{
    adjustCardSpacing(document.getElementById("player1-cards"));
    adjustCardSpacing(document.getElementById("player2-cards"));
});
