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
    const cardImg = document.createElement("img");
    cardImg.src = card.image;
    cardImg.alt = `${card.rank} of ${card.suit}`;
    cardDiv.appendChild(cardImg);
    cardDiv.draggable = true;
    cardDiv.id = `${card.rank}-${card.suit}`;
    cardDiv.addEventListener('dragstart', dragStart);
    container.appendChild(cardDiv);

    cardImg.style.width = "100px";
    cardImg.style.height = "150px";

    cardImg.onload = () => {
        adjustCardSpacing(container);
    };

    cardDiv.style.marginRight = "0px"
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

    const gameArea = document.getElementById("game-area-cards");
    const instructionText = document.createElement("h2");
    instructionText.textContent = "Click/Select Cards and Drag/Drop HERE";
    gameArea.style.border = "2px dashed black";
    gameArea.style.justifyContent = "center";
    gameArea.style.alignItems = "center";
    instructionText.style.color = "rgba(0, 0, 0, 0.5)";

    gameArea.appendChild(instructionText);
}

function dragStart(event) {
    event.dataTransfer.setData("text/plain", event.target.id);
}

function allowDrop(event) {
    event.preventDefault();
    console.log("allowDrop triggered");
}

function drop(event) {
    event.preventDefault();
    const data = event.dataTransfer.getData("text/plain");
    const draggedCard = document.getElementById(data);
    if (draggedCard) {
        event.target.appendChild(draggedCard);
        console.log("drop: card dropped", draggedCard.id);
    } else {
        console.log("drop: card element not found");
    }
}

let gameOn = false;
let playerOneActive = false;

const startGameButton = document.getElementById('start-game');
const playerOneElement = document.getElementById('player-1');
const playerTwoElement = document.getElementById('player-2');

let player1Button;
let player2Button;

function restartGame() {
    // Reset game variables
    gameOn = false;
    playerOneActive = false;
    deck = createDeck(); // Reset the deck
    // Clear the cards from the player areas and game area
    document.getElementById('player1-cards').innerHTML = '';
    document.getElementById('player2-cards').innerHTML = '';
    document.getElementById('game-area-cards').innerHTML = '';

    // Reset the player elements to their original state
    playerOneElement.textContent = "Player 1";
    playerTwoElement.textContent = "Player 2";

    // Re-enable the start game button
    startGameButton.disabled = false;

    //reset the deck image
    document.getElementById('deck').innerHTML = `<img src="./cardImages/card-deck.jpg" alt="Deck" class="deck-image" draggable="false">`;

    //reset the discard pile image.
    document.getElementById('discard-pile').innerHTML = `<img src="./cardImages/card-pile.jpg" alt="Deck" class="deck-image" id="discard-pile" draggable="false">`;

    //reset the game area text.
    const gameArea = document.getElementById("game-area-cards");
    const instructionText = document.createElement("h2");
    instructionText.textContent = "Click/Select Cards and Drag/Drop HERE";
    gameArea.appendChild(instructionText);

    console.log("Game restarted.");
}

startGameButton.addEventListener('click', () => {
    shuffleDeck();
    dealCards();
    console.log('The game has started!');
    gameOn = true;
    playerOneActive = true;

    playerOneElement.outerHTML = `<button id="player-1-btn" class="player-button">Player 1 Turn / Press to Finish</button>`;
    playerTwoElement.outerHTML = `<button id="player-2-btn" class="player-button">Player 2</button>`;

    player1Button = document.getElementById('player-1-btn');
    player2Button = document.getElementById('player-2-btn');

    const player1Cards = document.getElementById('player1-cards');
    const player2Cards = document.getElementById('player2-cards');

    function updateTurn() {
        if (playerOneActive) {
            player1Button.textContent = "Player 1 Turn / Press to Finish";
            player1Button.disabled = false;
            player1Button.style.pointerEvents = 'auto';
            player2Button.textContent = "Player 2";
            player2Button.disabled = true;
            player2Button.style.pointerEvents = 'none';
            enableDragging(player1Cards);
            disableDragging(player2Cards);
        } else {
            player1Button.textContent = "Player 1";
            player1Button.disabled = true;
            player1Button.style.pointerEvents = 'none';
            player2Button.textContent = "Player 2 Turn / Press to Finish";
            player2Button.disabled = false;
            player2Button.style.pointerEvents = 'auto';
            enableDragging(player2Cards);
            disableDragging(player1Cards);
        }
    }

    function enableDragging(cardsElement) {
        if (cardsElement) {
            cardsElement.querySelectorAll('*').forEach(element => {
                element.draggable = true;
            });
        }
    }

    function disableDragging(cardsElement) {
        if (cardsElement) {
            cardsElement.querySelectorAll('*').forEach(element => {
                element.draggable = false;
            });
        }
    }

    player1Button.addEventListener('click', () => {
        playerOneActive = false;
        updateTurn();
    });

    player2Button.addEventListener('click', () => {
        playerOneActive = true;
        updateTurn();
    });

    updateTurn();
});



window.addEventListener('resize', () => {
    const player1Container = document.getElementById("player1-cards");
    const player2Container = document.getElementById("player2-cards");
    if (player1Container) adjustCardSpacing(player1Container);
    if (player2Container) adjustCardSpacing(player2Container);
});