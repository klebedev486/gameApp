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

function adjustCardSpacing(container) {
    if (!container || !container.children || container.children.length === 0) return;

    const cards = container.children;
    const containerWidth = container.clientWidth;
    const cardWidth = cards[0].offsetWidth;
    const totalCards = cards.length;

    const spacing = totalCards > 1 ? (containerWidth - totalCards * cardWidth) / (totalCards - 1) : 0;

    for (let i = 0; i < totalCards; i++) {
        cards[i].style.marginRight = i < totalCards - 1 ? `${Math.max(-50, spacing)}px` : 0;
    }
}

function createCardDiv(card, containerId) {
    const container = document.getElementById(containerId);
    const cardDiv = document.createElement("div");
    cardDiv.className = "card-div";
    cardDiv.id = `${card.rank}-${card.suit}`;
    cardDiv.draggable = true;
    cardDiv.setAttribute('data-rank', card.rank);
    cardDiv.setAttribute('data-suit', card.suit);
    cardDiv.addEventListener('dragstart', dragStart);

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
    let player1 = deck.splice(0, 6);
    let player2 = deck.splice(0, 6);
    let trumpCard = deck.shift();

    player1.forEach(card => createCardDiv(card, "player1-cards"));
    player2.forEach(card => createCardDiv(card, "player2-cards"));

    const deckContainer = document.getElementById("deck");
    const trumpDiv = document.createElement("div");
    const trumpImg = document.createElement("img");

    trumpImg.src = trumpCard.image;
    trumpImg.alt = `${trumpCard.rank} of ${trumpCard.suit}`;
    trumpImg.style.width = "90px";
    trumpImg.style.height = "140px";
    trumpImg.style.border = "2px solid gold";
    trumpImg.style.borderRadius = "5px";

    trumpDiv.style.position = "absolute";
    trumpDiv.style.top = "60%";
    trumpDiv.style.left = "60%";

    trumpImg.draggable = false;

    trumpDiv.appendChild(trumpImg);
    deckContainer.appendChild(trumpDiv);
    trumpSuit = trumpCard.suit;
    console.log("Trump suit is:", trumpSuit);

    const gameArea = document.getElementById("game-area-cards");    
    const instructionText = document.createElement("h2");
    instructionText.textContent = "Click/Select Cards and Drag/Drop HERE";
    gameArea.style.border = "2px dashed black";
    gameArea.style.justifyContent = "center";
    gameArea.style.alignItems = "center";
    instructionText.style.color = "rgba(0, 0, 0, 0.5)";
    instructionText.style.pointerEvents = "none";

    gameArea.appendChild(instructionText);
}

function dragStart(event) {
    event.dataTransfer.setData("text/plain", event.currentTarget.id);
}

function allowDrop(event) {
    event.preventDefault();
    console.log("allowDrop triggered");
}

function isValidAttackRank(rank) {
    const allRanks = [...document.querySelectorAll("#game-area-cards .card-div")]
        .map(card => card.getAttribute("data-rank"));
    return allRanks.includes(rank);
}



function drop(event) {
    event.preventDefault();
    
    if (!playerOneActive || (turnPhase !== "attack" && turnPhase !== "second-attack")) {
        console.log("Cannot drop card at this phase.");
        return;
    }

    const cardId = event.dataTransfer.getData("text/plain");
    const draggedCard = document.getElementById(cardId);

    if (draggedCard && event.target.id === "game-area-cards") {
        const rank = draggedCard.getAttribute("data-rank");

        
        if (document.querySelectorAll("#game-area-cards .card-div").length === 0) {
            currentTurnRank = rank; // First attack can be any rank
        } else if (!isValidAttackRank(rank)) {
            console.log("Invalid card rank for attack. Must match rank already on the table.");
            return;
        }

        const instruction = document.querySelector("#game-area-cards h2");
        if (instruction) {
            instruction.remove();
        }

        event.target.appendChild(draggedCard);

        draggedCard.addEventListener("dragover", allowDrop);
        draggedCard.addEventListener("drop", beatCard);

        const suit = draggedCard.getAttribute("data-suit");
        gameAreaCards.push({ rank, suit, id: cardId });

        console.log(`Card moved to game area: ${cardId}`);
    }
}



function beatCard(event) {
    event.preventDefault();

    // REMOVE this check to allow both players to beat during any turn
    // if (playerOneActive) {
    //     console.log("Attacker cannot beat their own cards.");
    //     return;
    // }

    const defenderCardId = event.dataTransfer.getData("text/plain");
    const defenderCard = document.getElementById(defenderCardId);
    const attackerCard = event.currentTarget;

    // Prevent beating the same card more than once
    if (attackerCard.children.length > 1) {
        console.log("This card has already been defended. Cannot beat it again.");
        return;
    }

    const defRank = parseInt(defenderCard.getAttribute("data-rank"));
    const defSuit = defenderCard.getAttribute("data-suit");
    const attRank = parseInt(attackerCard.getAttribute("data-rank"));
    const attSuit = attackerCard.getAttribute("data-suit");

    let validDefense = false;

    if (defSuit === attSuit && defRank > attRank) {
        validDefense = true;
    } else if (defSuit === trumpSuit && attSuit !== trumpSuit) {
        validDefense = true;
    } else if (defSuit === trumpSuit && attSuit === trumpSuit && defRank > attRank) {
        validDefense = true;
    }

    if (validDefense) {
        attackerCard.appendChild(defenderCard);
        defenderCard.style.position = "absolute";
        defenderCard.style.top = "20px";
        defenderCard.style.left = "20px";
        console.log(`${defenderCardId} successfully beat ${attackerCard.id}`);
    } else {
        console.log(`Invalid move. Must beat by higher rank or trump rules.`);
    }
}

function discardGameAreaCards() {
    const gameArea = document.getElementById("game-area-cards");

    // Get all card elements from the game area
    const cards = Array.from(gameArea.children);

    // Move each card to the discard pile (data and visual)
    cards.forEach(card => {
        const rank = card.getAttribute("data-rank");
        const suit = card.getAttribute("data-suit");

        // Add to discard pile array
        discardPile.push({ rank, suit });

        // Visually remove the card from the game area
        gameArea.removeChild(card);
    });

    // Clear the game area data array
    gameAreaCards.length = 0;

    // Log the discard action for verification
    console.log("All cards from game area moved to discard pile.");
}

function refillPlayerHands() {
    const maxCards = 6;

    // Get the actual number of cards from the DOM for Player 1
    const player1CardCount = document.querySelectorAll("#player1-cards .card-div").length;
    const cardsToAddP1 = maxCards - player1CardCount;

    if (cardsToAddP1 > 0) {
        for (let i = 0; i < cardsToAddP1 && deck.length > 0; i++) {
            const newCard = deck.shift();
            player1Cards.push(newCard);
            createCardDiv(newCard, "player1-cards");
            console.log(`Added ${newCard.rank} of ${newCard.suit} to Player 1's hand`);
        }
    }

    // Get the actual number of cards from the DOM for Player 2
    const player2CardCount = document.querySelectorAll("#player2-cards .card-div").length;
    const cardsToAddP2 = maxCards - player2CardCount;

    if (cardsToAddP2 > 0) {
        for (let i = 0; i < cardsToAddP2 && deck.length > 0; i++) {
            const newCard = deck.shift();
            player2Cards.push(newCard);
            createCardDiv(newCard, "player2-cards");
            console.log(`Added ${newCard.rank} of ${newCard.suit} to Player 2's hand`);
        }
    }
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

        // Update turn indicator function
        function updateTurn() {
            if (playerOneActive) {
                player1Button.textContent = "Player 1 (Attacker)";
                player2Button.textContent = "Player 2 (Defender)";
            } else {
                player1Button.textContent = "Player 1 (Defender)";
                player2Button.textContent = "Player 2 (Attacker)";
            }
        }

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

        // Dynamically create the Finish Round button after game starts
        const finishRoundContainer = document.getElementById('finish-round-container');
        if (!document.getElementById('finish-round')) {
            const finishRoundButton = document.createElement('button');
            finishRoundButton.className = 'player-button';
            finishRoundButton.id = 'finish-round';
            finishRoundButton.textContent = 'Press to Finish Round';
            finishRoundContainer.appendChild(finishRoundButton);

            finishRoundButton.addEventListener('click', () => {
                console.log("Finishing the round, discarding game area cards...");
                discardGameAreaCards();  // Discard the cards in the game area
                refillPlayerHands();      // Refill both players' hands
                playerOneActive = !playerOneActive;  // Switch active player
                updateTurn();             // Update the turn indicators
            });
        }

        updateTurn();
    }
});


const finishRoundButton = document.getElementById('finish-round');
finishRoundButton.addEventListener('click', () => {
    console.log("Finishing the round, discarding game area cards...");
    discardGameAreaCards();  // Discard the cards in the game area
    refillPlayerHands();      // Refill both players' hands
    playerOneActive = !playerOneActive;  // Switch active player
    updateTurn();             // Update the turn indicators
});


// On Resize
window.addEventListener('resize', () => {
    const player1Container = document.getElementById("player1-cards");
    const player2Container = document.getElementById("player2-cards");
    if (player1Container) adjustCardSpacing(player1Container);
    if (player2Container) adjustCardSpacing(player2Container);
});