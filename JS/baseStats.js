let pokemonData = {};
let cpMultiplierTable = {};
let pokemonNames = [];
let chart = null;

// Load both JSON files on page load
window.onload = () => {
    Promise.all([
        fetch('/PokemonStats/pokemon.json').then(res => res.json()),
        fetch('/PokemonStats/cp_multiplier_table.json').then(res => res.json())
    ])
    .then(([pokemonList, cpTable]) => {
        // Build Pokémon lookup table
        pokemonList.forEach(entry => {
            pokemonData[entry["Pokémon"]] = {
                hp: Number(entry["HP"]),
                attack: Number(entry["Attack"]),
                defense: Number(entry["Defense"])
            };
        });
        pokemonNames = Object.keys(pokemonData);

        // Store CP multiplier table
        cpMultiplierTable = cpTable;
    })
    .catch(err => {
        console.error("Failed to load JSON data:", err);
        alert("Error loading data files.");
    });
};

function searchPokemon() {
    const nameInput = document.getElementById("searchBar").value.trim();
    const baseStats = pokemonData[nameInput];

    if (!baseStats) {
        alert("Pokémon not found!");
        return;
    }

    const IV_ATTACK = 15;
    const IV_DEFENSE = 15;
    const IV_STAMINA = 15;

    const levels = Array.from({ length: 50 }, (_, i) => i + 1);
    const attackStats = [];
    const defenseStats = [];
    const hpStats = [];

    for (let level of levels) {
        const cpm = cpMultiplierTable[level.toString()] || 0;

        const atk = (baseStats.attack + IV_ATTACK) * cpm;
        const def = (baseStats.defense + IV_DEFENSE) * cpm;
        const hp = Math.floor((baseStats.hp + IV_STAMINA) * cpm);

        attackStats.push(Math.round(atk));
        defenseStats.push(Math.round(def));
        hpStats.push(hp);
    }

    drawChart(levels, attackStats, defenseStats, hpStats);
    document.getElementById("suggestions").innerHTML = '';
}

function drawChart(labels, attack, defense, hp) {
    const ctx = document.getElementById('statChart').getContext('2d');

    if (chart) chart.destroy();

    chart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: labels,
            datasets: [
                {
                    label: 'Attack',
                    data: attack,
                    borderColor: 'red',
                    fill: false
                },
                {
                    label: 'Defense',
                    data: defense,
                    borderColor: 'blue',
                    fill: false
                },
                {
                    label: 'HP',
                    data: hp,
                    borderColor: 'green',
                    fill: false
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                x: {
                    title: { display: true, text: 'Level' }
                },
                y: {
                    title: { display: true, text: 'Stat Value' }
                }
            }
        }
    });
}

function showSuggestions() {
    const input = document.getElementById("searchBar").value.toLowerCase();
    const suggestionsBox = document.getElementById("suggestions");
    suggestionsBox.innerHTML = '';

    if (input.length === 0) return;

    const matches = pokemonNames.filter(name =>
        name.toLowerCase().startsWith(input)
    ).slice(0, 5);

    matches.forEach(name => {
        const div = document.createElement("div");
        div.classList.add("suggestionItem");
        div.innerText = name;
        div.onclick = () => {
            document.getElementById("searchBar").value = name;
            suggestionsBox.innerHTML = '';
        };
        suggestionsBox.appendChild(div);
    });
}

document.addEventListener("click", function (e) {
    if (!e.target.closest("#searchBar") && !e.target.closest(".suggestionsBox")) {
        document.getElementById("suggestions").innerHTML = '';
    }
});
