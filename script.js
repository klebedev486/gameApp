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

function collectCards(card) {
    const collectedCards = [card];
    Array.from(card.children).forEach(child => {
        if (child.classList.contains("card-div")) {
            collectedCards.push(...collectCards(child));
        }
    });
    return collectedCards;
}


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

    // Check if it's the attack phase
    if (turnPhase !== "attack") {
        console.log("Cannot drop card at this phase.");
        return;
    }

    const cardId = event.dataTransfer.getData("text/plain");
    const draggedCard = document.getElementById(cardId);

    // Check if the card is being dropped in the game area
    if (draggedCard && event.target.id === "game-area-cards") {
        const rank = draggedCard.getAttribute("data-rank");

        // Check if it's the first attack or a valid follow-up attack
        if (gameAreaCards.length === 0) {
            currentTurnRank = rank; // First attack can be any rank
        } else if (!isValidAttackRank(rank)) {
            console.log("Invalid card rank for attack. Must match rank already on the table.");
            return;
        }

        // Remove any instructional text if present
        const instruction = document.querySelector("#game-area-cards h2");
        if (instruction) {
            instruction.remove();
        }

        // Append the dragged card to the game area
        event.target.appendChild(draggedCard);

        // Make the card droppable for defense
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
    const cards = Array.from(gameArea.children);

    // Move each top-level card to the discard pile
    cards.forEach(card => {
        const allCards = collectCards(card);  // Collect all nested cards

        allCards.forEach(nestedCard => {
            const rank = nestedCard.getAttribute("data-rank");
            const suit = nestedCard.getAttribute("data-suit");

            if (rank && suit) {
                console.log(`Discarding card: ${rank} of ${suit}`);
                discardPile.push({ rank, suit });
            }

            // Safely remove the card from the game area
            try {
                if (gameArea.contains(nestedCard)) {
                    gameArea.removeChild(nestedCard);
                    console.log(`Removed ${rank} of ${suit} from game area`);
                }
            } catch (error) {
                console.error("Error while removing card from game area during discard:", error);
            }
        });
    });

    // Clear the game area data array after moving all cards
    gameAreaCards.length = 0;

    // Log the updated discard pile count
    console.log("Discard Pile Count After Discarding: ", discardPile.length);
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
    const gameArea = document.getElementById("game-area-cards");
    const cards = Array.from(gameArea.children);
    let unbeatenCards = [];

    // Identify unbeaten cards (those without a nested defender)
    cards.forEach(card => {
        const nestedCards = Array.from(card.children).filter(child => child.classList.contains("card-div"));
        if (nestedCards.length === 0) {
            unbeatenCards.push(card);
        }
    });

    if (unbeatenCards.length > 0) {
        console.log("Unbeaten cards found. Defender must take them.");
        // Defender is the NON-active player (if playerOne is attacking, playerTwo is defending)
        const defenderContainerId = playerOneActive ? "player2-cards" : "player1-cards";
        const defenderContainer = document.getElementById(defenderContainerId);

        // Move all unbeaten cards to defender's hand
        unbeatenCards.forEach(card => {
            // Get card data from DOM element
            const rank = card.getAttribute("data-rank");
            const suit = card.getAttribute("data-suit");
            const image = card.querySelector("img").src;
            const cardId = card.id;
            
            // Create new card object
            const cardData = { rank, suit, image, id: cardId };
            
            // Add to appropriate player's cards array
            if (defenderContainerId === "player1-cards") {
                player1Cards.push(cardData);
            } else {
                player2Cards.push(cardData);
            }
            
            // Create the card in defender's hand
            createCardDiv(cardData, defenderContainerId);
            
            // Remove from game area
            if (gameArea.contains(card)) {
                gameArea.removeChild(card);
            }
            
            // Remove from gameAreaCards array
            gameAreaCards = gameAreaCards.filter(c => c.id !== cardId);
            
            console.log(`Defender takes: ${rank} of ${suit}`);
        });
    }

    // Always process beaten pairs (cards with nested defenders)
    const beatenCards = Array.from(gameArea.children).filter(card => 
        Array.from(card.children).some(child => child.classList.contains("card-div"))
    );
    
    if (beatenCards.length > 0) {
        console.log("Processing beaten cards...");
        discardGameAreaCards();
    } else if (unbeatenCards.length === 0) {
        console.log("No cards to process in game area");
    }
    
    // Refill hands
    refillPlayerHands();
    
    // Switch active player
    playerOneActive = !playerOneActive;
    updateTurn();
    
    // Clear current turn rank
    currentTurnRank = null;
}



// On Resize
window.addEventListener('resize', () => {
    const player1Container = document.getElementById("player1-cards");
    const player2Container = document.getElementById("player2-cards");
    if (player1Container) adjustCardSpacing(player1Container);
    if (player2Container) adjustCardSpacing(player2Container);
});