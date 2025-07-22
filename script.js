const RANKS = ["6", "7", "8", "9", "10", "11", "12", "13", "14"]; 
// 11=Jack, 12=Queen, 13=King, 14=Ace
const SUITS = ["clubs", "diamonds", "hearts", "spades"];

function createDeck() {
    const deck = [];
    for (const suit of SUITS) {
        for (const rank of RANKS) {
            const image = `./cardImages/${suit}${rank}.png`;
            deck.push({ rank: rank, suit: suit, image: image });
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

// Four key game state arrays
let player1Cards = [];
let player2Cards = [];
let gameAreaCards = [];
let discardPile = [];
let currentTurnRank = null;
let trumpSuit = null;
let trumpCardData = null;

/* ---------- mobile-drag helpers ---------- */
let dragGhost = null;          // the floating image
let pointerCard = null;        // the original card being dragged

function updateTurn() {
    const p1Label = document.getElementById('player-1-btn') || document.getElementById('player-1');
    const p2Label = document.getElementById('player-2-btn') || document.getElementById('player-2');

        if (playerOneActive) {           // Player 1 is attacking
            p1Label.textContent = 'Player 1 Turn';
            p2Label.textContent = 'Player 2';
        } else {                         // Player 2 is attacking
            p1Label.textContent = 'Player 1';
            p2Label.textContent = 'Player 2 Turn';
        }
} 

/* ------------  PLAYER-OF-CARD HELPERS  ------------ */
function isCardFromPlayer1(cardEl) {
    return cardEl.closest('#player1-cards') !== null;
}
function isCardFromPlayer2(cardEl) {
    return cardEl.closest('#player2-cards') !== null;
}

function collectCards(card) {
    const collectedCards = [card];
    Array.from(card.children).forEach(child => {
        if (child.classList.contains("card-div")) {
            collectedCards.push(...collectCards(child));
        }
    });
    return collectedCards;
}

function hideDeckBack() {
    const back = document.getElementById("deck-back-image");
    if (back && !back.classList.contains("invisible")) {
        back.classList.add("invisible");   // layout stays intact
    }
}

function adjustCardSpacing(container) {
    if (!container || !container.children.length) return;

    const cardW  = container.children[0].offsetWidth;            // 100px
    const count  = container.children.length;
    const midW   = container.parentElement.clientWidth;          // .cards-area
    const maxGap = 15;

    const natural = cardW * count;                               // no gaps
    let gap;

    /* Fit comfortably with 15-px gaps */
    if (natural + maxGap * (count - 1) <= midW) {
        gap = maxGap;
    }
    /* Fit only with a smaller positive gap */
    else if (natural <= midW) {
        gap = (midW - natural) / (count - 1);
    }
    /* Won’t fit — switch to fixed overlap */
    else {
        gap = -40;
    }

    Array.from(container.children).forEach((c, i) => {
        c.style.marginRight = i === count - 1 ? '0px' : gap + 'px';
    });
}

function checkGameEnd() {
    const p1Count = document.querySelectorAll('#player1-cards .card-div').length;
    const p2Count = document.querySelectorAll('#player2-cards .card-div').length;
    const deckEmpty = deck.length === 0 && !trumpCardData;   // no face-down cards, no trump left

    if (!deckEmpty) return;                                  // can’t finish while pile exists

    let resultText = '';
    if (p1Count === 0 && p2Count === 0) {
        resultText = "It's a draw!";
    } else if (p1Count === 0) {
        resultText = "Player 1 wins!";
    } else if (p2Count === 0) {
        resultText = "Player 2 wins!";
    } else {
        return; // no one is empty yet
    }

    // Show the modal
    const modal = document.getElementById('gameover-modal');
    document.getElementById('gameover-text').textContent = resultText + '  Start a new game?';
    modal.style.display = 'block';
}

/* ----------  Game-over modal buttons  ---------- */
document.getElementById('gameover-yes').onclick = function () {
    location.reload();                         // quick way to reset everything
};
document.getElementById('gameover-no').onclick = function () {
    document.getElementById('gameover-modal').style.display = 'none';
};

function createCardDiv(card, containerId) {
    const container = document.getElementById(containerId);
    const cardDiv = document.createElement("div");
    cardDiv.className = "card-div";
    cardDiv.id = `${card.rank}-${card.suit}`;
    cardDiv.draggable = true;
    cardDiv.setAttribute('data-rank', card.rank);
    cardDiv.setAttribute('data-suit', card.suit);
    cardDiv.addEventListener('dragstart', dragStart);

    /* NEW: touch / pen / universal pointer support */
    cardDiv.addEventListener('pointerdown', pointerDown);

    const cardImg = document.createElement("img");
    cardImg.src = card.image;
    cardImg.alt = `${card.rank} of ${card.suit}`;
    cardImg.style.width = "100px";
    cardImg.style.height = "150px";

    cardDiv.appendChild(cardImg);
    if (containerId === "game-area-cards") {
        cardDiv.addEventListener("dragover", allowDrop);
        cardDiv.addEventListener("drop", beatCard); // We will define beatCard() next
    }
    container.appendChild(cardDiv);

    cardImg.onload = () => {
        adjustCardSpacing(container);
    };
    cardDiv.style.marginRight = "0px";
}

function dealCards() {
    /* --------  Deal 6 cards each from the top of the deck  -------- */
    const player1 = deck.splice(0, 6);     // first 6 → Player 1
    const player2 = deck.splice(0, 6);     // next 6 → Player 2

    /* --------  Take the next card as the face-up trump  -------- */
    const trumpCard = deck.shift();        // remove from deck
    trumpCardData   = trumpCard;           // **save** for late draw
    trumpSuit       = trumpCard.suit;      // global suit for rules

    /* --------  Render both players’ hands  -------- */
    player1.forEach(card => createCardDiv(card, "player1-cards"));
    player2.forEach(card => createCardDiv(card, "player2-cards"));

    /* --------  Render the face-up trump image  -------- */
    const deckContainer = document.getElementById("deck");

    const trumpDiv       = document.createElement("div");
    trumpDiv.id          = "trump-card-container";   // so we can remove it later
    trumpDiv.style.position = "absolute";
    trumpDiv.style.top      = "60%";
    trumpDiv.style.left     = "60%";
    trumpDiv.style.pointerEvents = "none";           // prevent dragging

    const trumpImg = document.createElement("img");
    trumpImg.src   = trumpCard.image;
    trumpImg.alt   = `${trumpCard.rank} of ${trumpCard.suit}`;
    trumpImg.style.width        = "90px";
    trumpImg.style.height       = "140px";
    trumpImg.style.border       = "2px solid gold";
    trumpImg.style.borderRadius = "5px";
    trumpImg.draggable = false;

    trumpDiv.appendChild(trumpImg);
    deckContainer.appendChild(trumpDiv);

    console.log("Trump suit is:", trumpSuit);

    /* --------  Placeholder text in the game area  -------- */
    const gameArea       = document.getElementById("game-area-cards");
    const instructionTxt = document.createElement("h2");
    instructionTxt.textContent      = "Click/Select Cards and Drag/Drop HERE";
    instructionTxt.style.color      = "rgba(0,0,0,0.5)";
    instructionTxt.style.pointerEvents = "none";

    // gameArea.style.border        = "2px dashed black";
    gameArea.style.justifyContent = "center";
    gameArea.style.alignItems    = "center";
    gameArea.appendChild(instructionTxt);
}

function dragStart(event) {
    event.dataTransfer.setData("text/plain", event.currentTarget.id);
}

function allowDrop(event) {
    event.preventDefault();
    console.log("allowDrop triggered");
}

/* ========= GHOST SETUP ========= */
function createDragGhost(card) {
    dragGhost = card.cloneNode(true);
    dragGhost.style.position = 'fixed';
    dragGhost.style.pointerEvents = 'none';
    dragGhost.style.opacity = '0.8';
    dragGhost.style.zIndex = '9999';
    document.body.appendChild(dragGhost);
}

function moveDragGhost(x, y) {
    if (dragGhost) {
        dragGhost.style.left = x - 50 + 'px';   // centers 100×150 card
        dragGhost.style.top  = y - 75 + 'px';
    }
}

function removeDragGhost() {
    if (dragGhost) {
        dragGhost.remove();
        dragGhost = null;
    }
}

/* ========= POINTER EVENTS (touch + pen + mouse) ========= */
function pointerDown(e) {
    /* 1️⃣  Ignore desktop mouse drags—native HTML-drag handles those */
    if (e.pointerType === 'mouse') return;

    /* 2️⃣  Prevent the page itself from scrolling while dragging */
    e.preventDefault();

    /* 3️⃣  Record the card being dragged and capture the pointer */
    pointerCard = e.currentTarget;
    pointerCard.setPointerCapture(e.pointerId);

    /* 4️⃣  Create a semi-transparent “ghost” that follows the finger */
    createDragGhost(pointerCard);
    moveDragGhost(e.clientX, e.clientY);

    /* 5️⃣  Listen for movement and lift-off */
    pointerCard.addEventListener('pointermove', pointerMove);
    pointerCard.addEventListener('pointerup',   pointerUp);
}

function pointerMove(e) {
    moveDragGhost(e.clientX, e.clientY);
}

function pointerUp(e) {
    /*  keep ghost aligned until lift-off  */
    moveDragGhost(e.clientX, e.clientY);
    removeDragGhost();

    /* ---- detect what’s underneath ---- */
    pointerCard.style.visibility = 'hidden';                   // hide source
    const rawElem  = document.elementFromPoint(e.clientX, e.clientY);
    pointerCard.style.visibility = 'visible';

    let handled = false;

    if (rawElem) {
        /* 1️⃣  DEFENSE: attacker card under finger? */
        const attackerCard = rawElem.closest &&
                             rawElem.closest('#game-area-cards .card-div');

        if (attackerCard && attackerCard !== pointerCard) {    // not self
            beatCard({
                preventDefault() {},
                dataTransfer: { getData: () => pointerCard.id },
                currentTarget: attackerCard
            });
            handled = true;
        }

        /* 2️⃣  ATTACK: finger over empty table area */
        if (!handled) {
            const table = rawElem.closest &&
                          rawElem.closest('#game-area-cards');
            if (table) {
                drop({
                    preventDefault() {},
                    dataTransfer: { getData: () => pointerCard.id },
                    target: table
                });
            }
        }
    }

    /* ----- clean up pointer capture & listeners ----- */
    pointerCard.releasePointerCapture(e.pointerId);
    pointerCard.removeEventListener('pointermove', pointerMove);
    pointerCard.removeEventListener('pointerup',   pointerUp);
    pointerCard = null;
}




function isValidAttackRank(rank) {
    const allRanks = [...document.querySelectorAll("#game-area-cards .card-div")]
        .map(card => card.getAttribute("data-rank"));
    return allRanks.includes(rank);
}


function drop(event) {
    event.preventDefault();
    if (turnPhase !== "attack") return;

    const cardId      = event.dataTransfer.getData("text/plain");
    const draggedCard = document.getElementById(cardId);
    if (!draggedCard) return;

    if (playerOneActive && !isCardFromPlayer1(draggedCard)) return;
    if (!playerOneActive && !isCardFromPlayer2(draggedCard)) return;

    const rank = draggedCard.getAttribute("data-rank");
    const suit = draggedCard.getAttribute("data-suit");
    const img  = draggedCard.querySelector("img").src;

    if (gameAreaCards.length !== 0 && !isValidAttackRank(rank)) return;

    // first card sets the working rank
    if (gameAreaCards.length === 0) currentTurnRank = rank;

    // ⬇️ render
    const instruction = document.querySelector("#game-area-cards h2");
    if (instruction) instruction.remove();
    event.target.appendChild(draggedCard);
    draggedCard.addEventListener("dragover", allowDrop);
    draggedCard.addEventListener("drop", beatCard);

    // ⬇️ array
    gameAreaCards.push({
        attacker: { rank, suit, id: cardId, image: img },
        defender: null
    });
}


function beatCard(event) {
    event.preventDefault();

    const defenderId  = event.dataTransfer.getData("text/plain");
    const defenderEl  = document.getElementById(defenderId);
    const attackerEl  = event.currentTarget;

    if (!defenderEl || attackerEl.children.length > 1) return;

    if (playerOneActive && isCardFromPlayer1(defenderEl)) return;
    if (!playerOneActive && isCardFromPlayer2(defenderEl)) return;

    const defRank = +defenderEl.dataset.rank;
    const defSuit = defenderEl.dataset.suit;
    const attRank = +attackerEl.dataset.rank;
    const attSuit = attackerEl.dataset.suit;

    const ok =
        (defSuit === attSuit && defRank > attRank) ||
        (defSuit === trumpSuit && attSuit !== trumpSuit) ||
        (defSuit === trumpSuit && attSuit === trumpSuit && defRank > attRank);

    if (!ok) return;

    // --- UI ---
    attackerEl.appendChild(defenderEl);
    defenderEl.style.position = "absolute";
    defenderEl.style.top  = "20px";
    defenderEl.style.left = "20px";

    // --- array ---
    const img = defenderEl.querySelector("img").src;
    const stack = gameAreaCards.find(s => s.attacker.id === attackerEl.id);
    if (stack) {
        stack.defender = { rank: defRank.toString(), suit: defSuit, id: defenderId, image: img };
    }
}

function discardGameAreaCards() {
    const gameArea = document.getElementById("game-area-cards");

    gameAreaCards.forEach(stack => {
        /* attacker is always present */
        discardPile.push({ rank: stack.attacker.rank, suit: stack.attacker.suit });
        const attackerEl = document.getElementById(stack.attacker.id);
        if (attackerEl && gameArea.contains(attackerEl)) gameArea.removeChild(attackerEl);

        /* defender may be null */
        if (stack.defender) {
            discardPile.push({ rank: stack.defender.rank, suit: stack.defender.suit });
            // defender element is nested inside attacker; attacker removal already handled it
        }
    });

    gameAreaCards = [];                                   // reset for next round
    console.log("Discard Pile Count:", discardPile.length);
}



function refillPlayerHands() {
    var MAX_HAND = 6;

    /* -------- Decide draw order (next attacker first) -------- */
    var sequence = playerOneActive
        ? [                                     // Player 1 attacks next
            { id: 'player1-cards', arr: player1Cards },
            { id: 'player2-cards', arr: player2Cards }
          ]
        : [                                     // Player 2 attacks next
            { id: 'player2-cards', arr: player2Cards },
            { id: 'player1-cards', arr: player1Cards }
          ];

    /* -------- Deal cards in that order -------- */
    sequence.forEach(function (player) {
        var currentCount = document.querySelectorAll(
            '#' + player.id + ' .card-div'
        ).length;
        var need = MAX_HAND - currentCount;

        while (need > 0) {
            var newCard = null;

            if (deck.length > 0) {              /* draw from face-down pile */
                newCard = deck.shift();
            } else if (trumpCardData) {         /* pile empty → take trump */
                newCard       = trumpCardData;
                trumpCardData = null;           /* trump is now gone */

                var trumpImg = document.getElementById('trump-card-container');
                if (trumpImg) trumpImg.remove();
            } else {
                break;                          /* no cards left anywhere */
            }

            player.arr.push(newCard);           /* track in player array   */
            createCardDiv(newCard, player.id);  /* render to DOM           */
            need--;
        }
    });

    /* -------- Hide deck back once pile is empty -------- */
    if (deck.length === 0) hideDeckBack();
}


let gameOn = false;
let playerOneActive = false;
let turnPhase = "attack";

const startGameButton = document.getElementById('start-game');
const playerOneElement = document.getElementById('player-1');
const playerTwoElement = document.getElementById('player-2');

let player1Button;
let player2Button;

function restartUi() {
    if (gameOn) {
        const modal = document.getElementById("confirmation-modal");
        modal.style.display = "block"; // Show modal

        // Handle the "Yes" button click
        document.getElementById("confirm-yes").onclick = function () {
            modal.style.display = "none";
            location.reload(); // Restart game
        };

        // Handle the "No" button click
        document.getElementById("confirm-no").onclick = function () {
            modal.style.display = "none"; // Close modal
        };
    }
}

startGameButton.addEventListener('click', () => {
    if (gameOn) {
        restartUi(); // Only show confirmation modal if game is already running
    } else {
        shuffleDeck();
        dealCards();
        console.log('The game has started!');
        gameOn = true;
        playerOneActive = true;

        // Update player elements to buttons after the game starts
        playerOneElement.outerHTML = `<div id="player-1-btn" class="player-static">Player 1 Turn / Press to Finish</div>`;
        playerTwoElement.outerHTML = `<div id="player-2-btn" class="player-static">Player 2</div>`;

        player1Button = document.getElementById('player-1-btn');
        player2Button = document.getElementById('player-2-btn');

        const player1Cards = document.getElementById('player1-cards');
        const player2Cards = document.getElementById('player2-cards');
        

        // Enable dragging for player cards
        function enableDragging(cardsElement) {
            if (cardsElement) {
                cardsElement.querySelectorAll('*').forEach(element => {
                    element.draggable = true;
                });
            }
        }

        enableDragging(player1Cards);
        enableDragging(player2Cards);

        const finishRoundContainer = document.getElementById('finish-round-container');
        // Clear any existing button first (to avoid duplicates)
        finishRoundContainer.innerHTML = '';

        const finishRoundButton = document.createElement('button');
        finishRoundButton.className = 'player-button';
        finishRoundButton.id = 'finish-round';
        finishRoundButton.textContent = 'Press to Finish Round';
        finishRoundContainer.appendChild(finishRoundButton);

        // Use the unified finishRound function
        finishRoundButton.addEventListener('click', () => {
            finishRound(); // This now calls the complete function we created
        });

            updateTurn();
        }
});


function finishRound() {
    /* ── 1. Success or failure? ────────────────────────────── */
    const defenderFailed = gameAreaCards.some(s => s.defender === null);

    /* Helper: move existing element or recreate it */
    function transferCard(cardObj, targetId) {
        const target = document.getElementById(targetId);
        let el       = document.getElementById(cardObj.id);

        if (el) {
            // scrub inline coords left over from defense
            el.style.position = "";
            el.style.top = el.style.left = "";
            target.appendChild(el);           // physical move, no clone
        } else {
            // (shouldn’t happen, but safe fallback)
            createCardDiv(
                { rank: cardObj.rank, suit: cardObj.suit, image: cardObj.image, id: cardObj.id },
                targetId
            );
        }
    }

    /* ── 2A. Defender fails → pick up everything ───────────── */
    if (defenderFailed) {
        const defenderId = playerOneActive ? "player2-cards" : "player1-cards";

        gameAreaCards.forEach(stack => {
            [stack.attacker, stack.defender]
              .filter(Boolean)
              .forEach(c => transferCard(c, defenderId));
        });

        console.log("Defender takes all cards – attacker keeps the turn.");
    }

    /* ── 2B. All beaten → discard & swap roles ─────────────── */
    else {
        gameAreaCards.forEach(stack => {
            [stack.attacker, stack.defender]
              .filter(Boolean)
              .forEach(c => {
                  discardPile.push({ rank: c.rank, suit: c.suit });
                  const el = document.getElementById(c.id);
                  if (el && el.parentElement) el.parentElement.removeChild(el);
              });
        });

        console.log("All cards beaten – defender becomes attacker.");
        playerOneActive = !playerOneActive;
    }

    /* ── 3. Common cleanup ─────────────────────────────────── */
    gameAreaCards = [];
    currentTurnRank = null;

    refillPlayerHands();
    updateTurn();
    checkGameEnd();
}




// On Resize
window.addEventListener('resize', () => {
    const player1Container = document.getElementById("player1-cards");
    const player2Container = document.getElementById("player2-cards");
    if (player1Container) adjustCardSpacing(player1Container);
    if (player2Container) adjustCardSpacing(player2Container);
});
