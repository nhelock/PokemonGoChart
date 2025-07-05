let pokemonData = {};
let cpMultiplierTable = {};
let pokemonNames = [];
let chart = null;
let dynamaxChart = null;
let dynamaxMode = 'attack'; // default
let gmaxMode = 'dmax'; // 'dmax' or 'gmax'



// Load data on page load
window.onload = () => {
    Promise.all([
        fetch('./PokemonStats/pokemon.json').then(res => res.json()),
        fetch('./PokemonStats/cp_multiplier_table.json').then(res => res.json())
    ])
    .then(([pokemonList, cpTable]) => {
        // Load Pokémon stats
        pokemonList.forEach(entry => {
            pokemonData[entry["Pokémon"]] = {
                hp: Number(entry["HP"]),
                attack: Number(entry["Attack"]),
                defense: Number(entry["Defense"])
            };
        });
        pokemonNames = Object.keys(pokemonData);

        // Load CpM table
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
    drawDynamaxChart(); // trigger Dynamax chart update
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

function drawDynamaxChart() {
    const nameInput = document.getElementById("searchBar").value.trim();
    const baseStats = pokemonData[nameInput];
    if (!baseStats) return;

    const IV_ATTACK = 15;
    const IV_STAMINA = 15;
    const levels = Array.from({ length: 36 }, (_, i) => i + 15);
    const ctx = document.getElementById('dynamaxChart').getContext('2d');

    if (dynamaxChart) dynamaxChart.destroy();

    if (dynamaxMode === 'attack') {
        const defenseBaseline = parseInt(document.getElementById("defenseBaseline").value);
        const movePowers = gmaxMode === 'gmax' ? [350, 400, 450] : [250, 300, 350];


        const datasets = movePowers.map((power, idx) => {
            const data = levels.map(level => {
                const cpm = cpMultiplierTable[level.toString()] || 0;
                const atk = (baseStats.attack + IV_ATTACK) * cpm;
                const damage = Math.floor(0.5 * power * (atk / defenseBaseline)) + 1;
                return damage;
            });

            return {
                label: `Move Level ${idx + 1} (${power} Power)`,
                data: data,
                borderColor: idx === 0 ? 'pink' : idx === 1 ? 'fuchsia' : 'purple',
                fill: false,
            };
        });

        dynamaxChart = new Chart(ctx, {
            type: 'line',
            data: {
                labels: levels,
                datasets: datasets
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                    x: {
                        title: { display: true, text: 'Level' }
                    },
                    y: {
                        title: { display: true, text: 'Approx. Damage' }
                    }
                },
                plugins: {
                    title: {
                        display: true,
                        text: 'Dynamax Move Damage by Level'
                    }
                }
            }
        });
    } else {
        const percentReturns = [0.08, 0.12, 0.16];

        const datasets = percentReturns.map((pct, idx) => {
            const data = levels.map(level => {
                const cpm = cpMultiplierTable[level.toString()] || 0;
                const hp = Math.floor((baseStats.hp + IV_STAMINA) * cpm);
                return Math.floor(hp * pct);
            });

            return {
                label: `Move Level ${idx + 1} (${Math.round(pct * 100)}% HP)`,
                data: data,
                borderColor: idx === 0 ? 'purple' : idx === 1 ? 'orange' : 'gold',
                fill: false,
            };
        });

        dynamaxChart = new Chart(ctx, {
            type: 'line',
            data: {
                labels: levels,
                datasets: datasets
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                    x: {
                        title: { display: true, text: 'Level' }
                    },
                    y: {
                        title: { display: true, text: 'Health Returned' }
                    }
                },
                plugins: {
                    title: {
                        display: true,
                        text: 'Max Spirit HP Return by Level'
                    }
                }
            }
        });
    }
}


function setDynamaxMode(mode) {
    dynamaxMode = mode;
    drawDynamaxChart();

    document.getElementById("attackBtn").classList.remove("activeMode");
    document.getElementById("spiritBtn").classList.remove("activeMode");

    if (mode === 'attack') {
        document.getElementById("attackBtn").classList.add("activeMode");
        document.querySelector(".dynamaxNote").innerText = "This chart shows how Dynamax move damage scales with level and move strength, using the selected opponent defense.";
        document.getElementById("defenseSection").style.display = "block";
        document.getElementById("gmaxToggle").style.display = "block";
    } else {
        document.getElementById("spiritBtn").classList.add("activeMode");
        document.querySelector(".dynamaxNote").innerText = "This chart shows how much HP is returned from Max Spirit, based on your Pokémon’s HP at each level.";
        document.getElementById("defenseSection").style.display = "none";
        document.getElementById("gmaxToggle").style.display = "none";
    }

}

function setGmaxMode(mode) {
    gmaxMode = mode;
    drawDynamaxChart();

    document.getElementById("dmaxBtn").classList.remove("activeMode");
    document.getElementById("gmaxBtn").classList.remove("activeMode");

    if (mode === 'dmax') {
        document.getElementById("dmaxBtn").classList.add("activeMode");
    } else {
        document.getElementById("gmaxBtn").classList.add("activeMode");
    }
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

document.getElementById("searchBar").addEventListener("keydown", function (event) {
    if (event.key === "Enter") {
        const input = document.getElementById("searchBar");
        const suggestions = document.querySelectorAll(".suggestionItem");

        // If suggestions are shown, use the first one
        if (suggestions.length > 0) {
            input.value = suggestions[0].innerText;
        }

        document.getElementById("suggestions").innerHTML = '';
        searchPokemon();
    }
});