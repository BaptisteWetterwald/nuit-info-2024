import people from './guys.json';

let gun = document.querySelector('#gun');
let grid = document.querySelector('#grid-container');
let winningGuy;
let hint;

setUp();

function setUp(){
    winningGuy = people[Math.floor(Math.random() * people.length)];

    // refill the grid with all the guys
    grid.innerHTML = '';
    people.forEach(person => {
        let item = document.createElement('div');
        item.classList.add('grid-item');
        let img = document.createElement('img');
        img.src = `images/${person.nom}.png`;
        img.alt = `Photo ${person.nom}`;
        item.appendChild(img);
        grid.appendChild(item);
    });

    document.querySelectorAll('.grid-item').forEach(item => {
        item.addEventListener('click', event => {
            // Make the gun shoot by rotating it a bit from its actual position, then back to original position
            let angle = Math.atan2(event.clientY - gun.offsetTop, event.clientX - gun.offsetLeft);
            gun.style.transform = `rotate(${angle - 0.5}rad)`;
            // make the item unclickable
            item.style.pointerEvents = 'none';
            setTimeout(() => {
                gun.style.transform = `rotate(${angle}rad)`;
            }, 100);
    
            // Play the sound
            let audio = new Audio('pew.flac');
            audio.play();

            // Remove the clicked item after 0.5s
            setTimeout(() => {
                item.remove();
                // checkwin after 0.01s
                setTimeout(checkWin, 10);
            }, 400);
            
        });
    });

    document.addEventListener('mousemove', event => {
        let angle = Math.atan2(event.clientY - gun.offsetTop, event.clientX - gun.offsetLeft);
        gun.style.transform = `rotate(${angle}rad)`;
    });

    generateNewHint();

}

function checkWin() {
    let remaining = document.querySelectorAll('.grid-item');
    // check if the winning guy is still in the grid
    let stillIn = false;
    remaining.forEach(item => {
        if (item.querySelector('img').src.includes(winningGuy.nom)) {
            stillIn = true;
        }
    });

    if (!stillIn) {
        alert("Soit t'es un bot, soit t'es idiotte ! Bref, t'as perdu.");
        setUp();
    }
    else if (remaining.length === 1) {
        alert("Bravo, t'as gagné ! Je te présente " + winningGuy.nom + " !");
        // redirect to ../map.html after 3s
        setTimeout(() => {
            window.location.href = './map.html';
        }, 1000);
    }
    else if (shouldGenerateNewHint()){
        generateNewHint();
    }
}

function shouldGenerateNewHint(){
    let currentHint = hint;
    console.log("Current hint : " + currentHint.field + " - " + currentHint.value);
    
    // We should generate a new hint if the current one is the same value for both the winning guy and all the remaining guys
    
    let remaining = document.querySelectorAll('.grid-item');
    let sameValue = true;

    remaining.forEach(item => {
        let img = item.querySelector('img');
        let person = people.find(p => img.src.includes(p.nom));
        if (person.caracteristiques[currentHint.field] !== currentHint.value){
            sameValue = false;
        }
    });

    console.log("shouldGenerateNewHint : " + sameValue);

    return sameValue;
}

function generateNewHint(){
    let fields = Object.keys(winningGuy.caracteristiques);
    let chosenField = fields[Math.floor(Math.random() * fields.length)];
    let newHint = {
        field: chosenField,
        value: winningGuy.caracteristiques[chosenField]
    };

    hint = newHint;

    if (shouldGenerateNewHint()){
        generateNewHint();
    }

    else{
        let hintElement = document.querySelector('#hint');
        hintElement.innerHTML = getHint(hint.field, hint.value);
    }
    
    console.log("Generated new hint : " + hint.field + " - " + hint.value);
}

function getHint(field, value){
    let res = "Indice : ";
    switch(field){
        case "lunettes":
            res += value ? "Je porte des lunettes." : "Je ne porte pas de lunettes.";
            break;
        case "barbe":
            res += value ? "Je porte une barbe." : "Je ne porte pas de barbe.";
            break;
        case "tenue_foncee":
            res += value ? "Je porte une tenue foncée." : "Je porte une tenue claire.";
            break;
        case "calvitie":
            res += value ? "J'ai une calvasse." : "J'ai tous mes cheveux... pour l'instant.";
            break;
        case "bras_croises":
            res += value ? "Je croise les bras." : "Je ne croise pas les bras.";
            break;
        case "chemise":
            res += value ? "Je porte une chemise." : "Je porte un polo.";
            break;
        case "sourire_bien_marque":
            res += value ? "Je souris bien fort." : "Je ne souris pas vraiment.";
            break;
    };
    /*
            "lunettes": true,
            "barbe": true,
            "tenue_foncee": false,
            "calvitie": true,
            "bras_croises": true,
            "chemise": true,
            "sourire_bien_marque": true
    */
    return res;
}