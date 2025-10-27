// Importation des modules nécessaires
const express = require('express');
const app = express();
const http = require('http');
const server = http.createServer(app);
const io = new require("socket.io")(server);

// Port sur lequel le serveur est lancé
const PORT = 8888;

// Variables globales

let nomsJoueurs = []; // Liste des joueurs
let couleurJoueurs = [];
let etatHexagones = {};
let tour = 0; 
let demarerPartie = false;
let spectateurs = [];  // Liste des spectateurs

// Fonction pour réinitialiser la partie, elle est appelée soit lorsque l'un des 2 joueurs gagne, soit lorsqu'un des 2 quitte ou bien les 2 ont quittés
function resetPartie() {
    nomsJoueurs = [];
    couleurJoueurs = [];
    etatHexagones = {};
    tour = 0;
    demarerPartie = false;
    console.log("La partie a été réinitialisée.");
    io.emit('reinitialiserHexagones');  
}

// Fonction pour vérifier la victoire
function verifierVictoire(joueur, etatHexagones) {
    const couleur = couleurJoueurs[joueur];
    const taille = 11;

    const bordsDepart = [];
    const bordsArrivee = new Set();

    for (let id in etatHexagones) {
        const indice = parseInt(id.slice(1));
        const ligne = Math.floor(indice / taille);
        const colonne = indice % taille;

        if (etatHexagones[id] === couleur) {
            if (joueur === 0 && colonne === 0) bordsDepart.push(id); // Joueur 0 : colonne gauche
            if (joueur === 1 && ligne === 0) bordsDepart.push(id);   // Joueur 1 : ligne haute
            if (joueur === 0 && colonne === taille - 1) bordsArrivee.add(id); // Joueur 0 : colonne droite
            if (joueur === 1 && ligne === taille - 1) bordsArrivee.add(id);   // Joueur 1 : ligne basse
        }
    }

    function explorerChemin(idCourant, visites) {
        if (bordsArrivee.has(idCourant)) return true; // Atteint la destination
        visites.add(idCourant);

        const voisins = obtenirVoisins(idCourant, taille);
        for (let i = 0; i < voisins.length; i++) {
            const voisin = voisins[i];
            if (!visites.has(voisin) && etatHexagones[voisin] === couleur) {
                if (explorerChemin(voisin, visites)) return true;
            }
        }
        return false;
    }

    for (let i = 0; i < bordsDepart.length; i++) {
        const idDepart = bordsDepart[i];
        if (explorerChemin(idDepart, new Set())) return true;
    }

    return false;
}

// Fonction pour obtenir les voisins d'un hexagone
function obtenirVoisins(idHexagone, taille) {
    const indice = parseInt(idHexagone.slice(1));
    const ligne = Math.floor(indice / taille);
    const colonne = indice % taille;

    const directions = [
        [-1, 0], [1, 0], [0, -1], [0, 1], [-1, 1], [1, -1]
    ];

    const voisins = [];
    for (let i = 0; i < directions.length; i++) {
        const [dx, dy] = directions[i];
        const newLigne = ligne + dx;
        const newColonne = colonne + dy;

        if (newLigne >= 0 && newLigne < taille && newColonne >= 0 && newColonne < taille) {
            voisins.push(`h${newLigne * taille + newColonne}`);
        }
    }

    return voisins;
}

// Serveur et gestion des routes
server.listen(PORT, () => {
    console.log('Écoute sur le port ' + PORT);
});

app.use('/public', express.static("./public"));
app.get('/', (req, res) => {
    res.sendFile('index.html', { root: __dirname });
});

// Gestion des connexions WebSocket avec Socket.IO
io.on('connection', (socket) => {
    let idJoueur = null;
    let pseudo;
    let couleurJoueur = null;
    let login = false;
    let status = 'joueur';

    socket.on('entree', (nomJoueur) => {
        nomJoueur = nomJoueur.trim();
    
        // Vérification si le nom est déjà pris
        if (nomsJoueurs.includes(nomJoueur) || spectateurs.includes(nomJoueur)) {
            socket.emit('err', "Nom d'utilisateur déjà existant !");
            return;
        }
    
        pseudo = nomJoueur;

        if(pseudo.length < 3 || pseudo.length > 30 || pseudo.includes(' ')){
            socket.emit('err', "Nom d'utilisateur invalide !");
            return;
        }
    
        if (nomsJoueurs.length < 2) {
            // Attribuer le rôle de joueur
            idJoueur = nomsJoueurs.length;
            // 1 couleur disponible pour chaque joueur
            couleurJoueur = idJoueur % 2 === 0 ? 'red' : 'blue';

            // On ajoute le joueur à la liste et sa couleur également
            nomsJoueurs.push(pseudo);
            couleurJoueurs.push(couleurJoueur);

            // Il obtient donc le status de joueur est son login est validé
            status = "joueur";
            login = true;
    
            // Emission de l'entrée du joueur à tout les autres clients
            socket.emit('entree', {
                nomJoueur: pseudo,
                numJoueur: idJoueur,
                nomsJoueurs: nomsJoueurs,
                couleurJoueur: couleurJoueur
            });
    
            console.log(`Joueur connecté : ${pseudo} (id: ${idJoueur}, couleur: ${couleurJoueur})`);
            const messageConnexion = `${pseudo} a rejoint le jeu en tant que ${status}`;
            io.emit('message', { contenuMessage: messageConnexion, type: 'systeme', auteurDuMessage: 'Systeme', couleurAuteurMessage: '#ffffff'});
    
            // Démarrer la partie si deux joueurs sont présents
            if (nomsJoueurs.length === 2) {
                demarerPartie = true;
                io.emit('demarrerPartie');
            }
    
        } else {
            // Attribuer le rôle de spectateur
            status = "spectateur";
            login = true;
            spectateurs.push(pseudo);
    
            socket.emit('spectateur', {
                nomSpectateur: pseudo,
                etatPartie: etatHexagones,
                tour: tour
            });
    
            console.log(`${pseudo} est en mode spectateur.`);
        }
    
        io.emit('miseAJourJoueurs', { nomsJoueurs, spectateurs });
    });    

    // Peut envoyer des messages uniquement si l'utilisateur est login
    socket.on('message', contenuMessage => {
        if (login) {

            console.log(`Message reçu de ${status} ${pseudo} : ${contenuMessage}`);

            io.emit('message', {
                'auteurDuMessage': pseudo,
                'contenuMessage': contenuMessage,
                'couleurAuteurMessage': couleurJoueur,
                'type': status
            });
        } else {
            socket.emit('err', 'Utilisateur non connecté');
        }
    });

    socket.on('disconnect', () => {

        console.log(`Déconnexion : ${pseudo} (id: ${idJoueur})`);
        
        if (status === "joueur" && pseudo !== null) {
            let index = nomsJoueurs.indexOf(pseudo);
            if (index > -1) {
                nomsJoueurs.splice(index, 1);
                couleurJoueurs.splice(index, 1);
                io.emit('miseAJourJoueurs', { nomsJoueurs, spectateurs });
                io.emit('abandonPartie');
            }
    
            if (nomsJoueurs.length === 0) {
                resetPartie();
            }
        } else if (status === "spectateur") {
            let index = spectateurs.indexOf(pseudo);
            if (index > -1) spectateurs.splice(index, 1);
            io.emit('miseAJourJoueurs', { nomsJoueurs, spectateurs });
        }
    
        const messageDeconnexion = `Le ${status} ${pseudo} a quitté le jeu.`;
        io.emit('message', { contenuMessage: messageDeconnexion, type: 'systeme', auteurDuMessage: 'Systeme', couleurAuteurMessage: '#ffffff'});
    });
    

    // Gestion des commandes du/des spectateur(s) (En développement)
    /*socket.on('revenirArriere', () => {
        if (indexHistorique > 0) {
            indexHistorique--;
            etatHexagones = JSON.parse(JSON.stringify(historiquePartie[indexHistorique]));
            io.emit('majPartie', { etatPartie: etatHexagones, tour: tour });
        }
    });

    socket.on('avancer', () => {
        if (indexHistorique < historiquePartie.length - 1) {
            indexHistorique++;
            etatHexagones = JSON.parse(JSON.stringify(historiquePartie[indexHistorique]));
            io.emit('majPartie', { etatPartie: etatHexagones, tour: tour });
        }
    });*/

    // Gestion des clics sur les hexagones
    let historiquePartie = [JSON.parse(JSON.stringify(etatHexagones))];
    let indexHistorique = 0;

    socket.on('hexClique', (data) => {
        const { id, couleur } = data;
        if (demarerPartie && idJoueur === tour) {
            if (!etatHexagones[id]) {
                historiquePartie = historiquePartie.slice(0, indexHistorique + 1);
                historiquePartie.push(JSON.parse(JSON.stringify(etatHexagones)));
                indexHistorique++;

                etatHexagones[id] = couleur;
                io.emit('majHexagone', { id: id, couleur: couleur });

                if (verifierVictoire(idJoueur, etatHexagones)) {
                    io.emit('finPartie', {
                        gagnant: pseudo,
                        couleur: couleur
                    });
                    resetPartie();
                } else {
                    tour = (tour + 1) % 2;
                    io.emit('majTour', tour);
                }
            }
        }
    });
    
});