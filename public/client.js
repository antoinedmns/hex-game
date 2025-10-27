// ===============================
// Connexion au serveur Socket.IO
// ===============================
let socket = io();

// ===============================
// Gestion de l'interface utilisateur
// ===============================
const inputPseudo = document.getElementById('nom');
const buttonRegister = document.getElementById('entree-partie-btn');
const inputChatMessage = document.getElementById('messageChat');
const registerInput = document.getElementById('register-input');
const registerButton = document.getElementById('entree-partie-btn');
const modalErrInscription = document.getElementById('inscriptionErr');
const modalMessageVictoire = document.getElementById('messageVictoire');
const relancerPartieBtn = document.getElementById('relancerPartieBtn');
const abandonPartieBtn = document.getElementById('abandonPartieButton');
const modalAbandonPartie = new bootstrap.Modal(document.getElementById('AbandonPartieModal'), { backdrop: 'static' });

let couleurAuteurMessage;

// Affichage du modal d'inscription
const modalInscription = new bootstrap.Modal(document.getElementById('registerModal'), { backdrop: 'static' });
modalInscription.show();

const modalFinPartie = new bootstrap.Modal(document.getElementById('finPartieModal'), { backdrop: 'static' });

// Gestion des événements du DOM
buttonRegister.addEventListener('click', function() {
    entrerDansLaPartie();
});

relancerPartieBtn.addEventListener('click', function() {
    location.reload();
})

inputChatMessage.addEventListener('keypress', function (event) {
    if (event.key === 'Enter') {
        envoyerMessage();
    }
});

// Fonctions des évènements du DOM
function displayPseudo() {
    const infoLogged = document.getElementById('container-info-logged');
    if(infoLogged.classList.contains("hidden")){
        infoLogged.classList.remove("hidden");
    }
}

// Ajoute un message d'erreur dans le body du modal d'inscription
function modalInscriptionErr(raison){

    // Si le message est caché (état de base) alors on l'affiche
    if(modalErrInscription.classList.contains('hidden')){
        modalErrInscription.classList.remove('hidden');
    }
    // Raison de l'erreur
    modalErrInscription.innerText = raison;
}

// Gère la création et l'ajout de message dans la zone du chat
function creerMessage(auteur, contenu, type){
    let div = document.createElement('div');
    let span = document.createElement('span');
    span.textContent = auteur;
    if(type == 'joueur'){
        span.style.color = couleurAuteurMessage;
        div.appendChild(span);
        div.appendChild(document.createTextNode(' : ' + contenu));
    } else if(type == 'systeme'){
        span.textContent = "Message système: " + contenu;
        span.style.fontStyle = "italic";
        div.appendChild(span);
    } else if(type == 'spectateur'){
        span.style.color = "#ababab";
        div.appendChild(span);
        div.appendChild(document.createTextNode(' : ' + contenu));
    }
    document.getElementById('zone-chat').appendChild(div);
}

// ===============================
// Interaction avec le serveur
// ===============================

// Envoi le pseudo au serveur pour rejoindre la partie
function entrerDansLaPartie() {
    socket.emit('entree', inputPseudo.value);
}

// Envoi un message au serveur
function envoyerMessage() {
    socket.emit('message', inputChatMessage.value);
    inputChatMessage.value = "";
}


/* FONCTIONNALITES AVANCER, RECULER (EN DEVELOPPEMENT)
function reculer() {
    socket.emit('revenirArriere');
}

function avancer() {
    socket.emit('avancer');
}
*/

// Mise à jour de la partie ( pour les boutons du spectateurs avancer et reculer en développement)
/*socket.on('majPartie', (data) => {
    const { etatPartie, tour } = data;
    console.log('Mise à jour partie : ', etatPartie, 'Tour : ', tour);
});*/

// ===============================
// Gestion des événements Socket.IO
// ===============================

// Reçoit la confirmation de connexion à la partie
socket.on('entree', data => {
    numJoueur = data.numJoueur;
    nomJoueur = data.nomJoueur;
    couleurJoueur = data.couleurJoueur;

    modalInscription.hide();
    displayPseudo();
    
    let div = document.createElement('div');
    let span = document.createElement('span');
    div.classList.add('messageBienvenu');
    span.classList.add('pseudoBienvenu');
    span.textContent = nomJoueur;
    span.style.color = couleurJoueur;
    div.appendChild(document.createTextNode('Bienvenue, vous êtes connecté en tant que '));
    div.appendChild(span);

    document.getElementById('container-info-logged').appendChild(div);
});


// Met à jour la liste des joueurs et spectateurs
socket.on('miseAJourJoueurs', data => {
    let nomsJoueurs = data.nomsJoueurs;
    let spectateurs = data.spectateurs;

    const listeJoueursConteneur = document.getElementById("joueursL");
    const listeSpectateursConteneur = document.getElementById("spectateursL");

    listeJoueursConteneur.innerHTML = "";
    listeSpectateursConteneur.innerHTML = "";

    if (nomsJoueurs && nomsJoueurs.length > 0) {
        listeJoueursConteneur.innerHTML = "<h3>Joueurs :</h3>";
        for (let joueur of nomsJoueurs) {
            listeJoueursConteneur.innerHTML += `<p>${joueur}</p>`;
        }
        listeJoueursConteneur.style.display = "block";
    } else {
        listeJoueursConteneur.style.display = "none";
    }

    if (spectateurs && spectateurs.length > 0) {
        listeSpectateursConteneur.innerHTML = "<h3>Spectateurs :</h3>";
        for (let spectateur of spectateurs) {
            listeSpectateursConteneur.innerHTML += `<p>${spectateur}</p>`;
        }
        listeSpectateursConteneur.style.display = "block";
    } else {
        listeSpectateursConteneur.style.display = "none";
    }
});

// Gère l'affichage pour un spectateur
socket.on('spectateur', data => {
    nomSpectateur = data.nomSpectateur;
    etatPartie = data.etatPartie;
    tour = data.tour;

    modalInscription.hide();

    let statusJoueur = document.getElementById('statusJoueurConteneur');
    statusJoueur.classList.add("status", "status-spectateurs");
    statusJoueur.innerText = "Status : Spectateur";
});

// Gère les erreurs d'inscription (pseudo)
socket.on('err', data => {
    let raison = data
    modalInscriptionErr(raison);
});

// Gère la mise à jour du tour
socket.on('majTour', nouveauTour => {
    if (nouveauTour === numJoueur) {
        console.log("C'est votre tour !");
        d3.selectAll("path[numeroHexagone]").on("click", function() {
            const idHex = d3.select(this).attr("numeroHexagone");
            socket.emit("hexClique", { id: idHex, couleur: couleurJoueur});
        });
    } else {
        console.log("C'est le tour de l'autre joueur.");
        d3.selectAll("path[numeroHexagone]").on("click", null);
    }
});

// Gestion de l'abandon de la partie
socket.on('abandonPartie', () => {
    modalAbandonPartie.show();
});

abandonPartieBtn.addEventListener("click", () => {
    location.reload();
});

// Réception et affichage des messages du chat
socket.on('message', data => {
    let type = data.type;
    let contenuMessage = data.contenuMessage;
    let auteurDuMessage = data.auteurDuMessage;
    couleurAuteurMessage = data.couleurAuteurMessage;

    creerMessage(auteurDuMessage, contenuMessage, type);
});


// Fin de la partie et affichage du gagnant
socket.on('finPartie', data => {
    const gagnant = data.gagnant;
    const couleur = data.couleur;
    modalMessageVictoire.innerHTML = `Le gagnant de la partie est <span style="color: ${couleur}; font-weight: bold;">${gagnant}</span>`;
    modalFinPartie.show();
    d3.selectAll("path[numeroHexagone]").attr("fill", "rgb(31, 32, 35)");
});

// ===============================
// Gestion des Hexagones et Plateau
// ===============================

// Mise à jour de l'état des hexagones
socket.on('majHexagone', data => {
    d3.select(`[numeroHexagone='${data.id}']`)
        .attr("fill", data.couleur)
        .attr("stroke", "white");
});

// Réinitialisation du plateau de jeu
socket.on('reinitialiserHexagones', () => {
    d3.selectAll("path[numeroHexagone]").attr("fill", "rgb(31, 32, 35)");
    colorierBordures(11, 11);
    console.log("La partie a été réinitialisée.");
});

// Crée les coordonnées d'un hexagone
function creeHexagone(rayon) {
    let points = [];
    for (let i = 0; i < 6; ++i) {
        let angle = i * Math.PI / 3;
        let x = Math.sin(angle) * rayon; let y = -Math.cos(angle) * rayon;
        points.push([Math.round(x * 100) / 100, Math.round(y * 100) / 100]);
    }
    return points;
}

// Génère un damier hexagonal
function genereDamier(rayon, nbLignes, nbColonnes) {
    let distance = rayon - (Math.sin(1 * Math.PI / 3) * rayon);
    distance = distance * 1.5;
    rayon = rayon * 1.5;
    let hexagone = creeHexagone(rayon);

    d3.select("#tablier").append("svg").attr("width", (nbLignes * 2) * 1.3 * rayon).attr("height", (nbLignes * 2) * 0.80 * rayon);   
    for (let ligne = 0; ligne < nbLignes; ligne++) {
        for (let colonne = 0; colonne < nbColonnes; colonne++) {
            let d = "";
            let x, y;
            for (let h in hexagone) {
                x = hexagone[h][0] + (rayon - distance) * (2 + 2 * colonne) + ligne * (rayon - distance);
                y = hexagone[h][1] + (rayon - distance * 2) * (1 + 2 * ligne) + rayon;
                d += (d === "" ? "M" : "L") + x + "," + y;
            }
            d += "Z";
            d3.select("svg")
                .append("path")
                .attr("d", d)
                .attr("stroke", "white")
                .attr("fill", "rgb(31, 32, 35)")
                .attr("numeroHexagone", "h" + (ligne * nbLignes + colonne))
                .on("click", function() {
                    const hexId = d3.select(this).attr("numeroHexagone");
                    socket.emit('hexClique', { id: hexId, couleur: couleurJoueur });
                });
        }
    }
}

// Colore les bordures du damier selon leur position
function colorierBordures(nbLignes, nbColonnes) {
    for (let ligne = 0; ligne < nbLignes; ligne++) {
        for (let colonne = 0; colonne < nbColonnes; colonne++) {
            const idHexagone = `h${ligne * nbColonnes + colonne}`;
            const hex = d3.select(`[numeroHexagone='${idHexagone}']`);
            if (ligne === 0 && colonne === 0) {
                hex.attr("stroke", "blue").attr("stroke-width", 1).raise();
            } else if (ligne === 0 && colonne === nbColonnes - 1) {
                hex.attr("stroke", "red").attr("stroke-width", 1).raise();
            } else if (ligne === nbLignes - 1 && colonne === 0) {
                hex.attr("stroke", "red").attr("stroke-width", 1).raise();
            } else if (ligne === nbLignes - 1 && colonne === nbColonnes - 1) {
                hex.attr("stroke", "blue").attr("stroke-width", 1).raise();
            }
            else if (ligne === 0 || ligne === nbLignes - 1) {
                hex.attr("stroke", "blue").attr("stroke-width", 1).raise();
            }
            else if (colonne === 0 || colonne === nbColonnes - 1) {
                hex.attr("stroke", "red").attr("stroke-width", 1).raise();
            }
        }
    }
}

// ===============================
// Initialisation du damier
// ===============================
genereDamier(20, 11, 11);
colorierBordures(11, 11);