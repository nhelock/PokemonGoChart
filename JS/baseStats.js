// baseStats.js - corrected and improved
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
        pokemonList.forEach(entry => {
            pokemonData[entry["Pokémon"]] = {
                hp: Number(entry["HP"]),
                attack: Number(entry["Attack"]),
                defense: Number(entry["Defense"])
            };
        });
        pokemonNames = Object.keys(pokemonData);
        cpMultiplierTable = cpTable;

        // Attach Enter key event listener AFTER DOM is ready
        const input = document.getElementById("searchBar");
        input.addEventListener("keydown", function (event) {
            if (event.key === "Enter") {
                const suggestions = document.querySelectorAll(".suggestionItem");
                if (suggestions.length > 0) {
                    input.value = suggestions[0].innerText;
                }
                document.getElementById("suggestions").innerHTML = '';
                searchPokemon();
            }
        });
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
    drawDynamaxChart();
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
                { label: 'Attack', data: attack, borderColor: 'red', fill: false },
                { label: 'Defense', data: defense, borderColor: 'blue', fill: false },
                { label: 'HP', data: hp, borderColor: 'green', fill: false }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                x: { title: { display: true, text: 'Level' } },
                y: { title: { display: true, text: 'Stat Value' } }
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
                borderColor: ['pink', 'fuchsia', 'purple'][idx],
                fill: false
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
                    x: { title: { display: true, text: 'Level' } },
                    y: { title: { display: true, text: 'Approx. Damage' } }
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
                borderColor: ['purple', 'orange', 'gold'][idx],
                fill: false
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
                    x: { title: { display: true, text: 'Level' } },
                    y: { title: { display: true, text: 'Health Returned' } }
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
    document.getElementById("attackBtn").classList.toggle("activeMode", mode === 'attack');
    document.getElementById("spiritBtn").classList.toggle("activeMode", mode === 'spirit');
    document.querySelector(".dynamaxNote").innerText =
        mode === 'attack'
            ? "This chart shows how Dynamax move damage scales with level and move strength, using the selected opponent defense."
            : "This chart shows how much HP is returned from Max Spirit, based on your Pokémon’s HP at each level.";
    document.getElementById("defenseSection").style.display = mode === 'attack' ? "block" : "none";
    document.getElementById("gmaxToggle").style.display = mode === 'attack' ? "block" : "none";
}

function setGmaxMode(mode) {
    gmaxMode = mode;
    drawDynamaxChart();
    document.getElementById("dmaxBtn").classList.toggle("activeMode", mode === 'dmax');
    document.getElementById("gmaxBtn").classList.toggle("activeMode", mode === 'gmax');
}

function showSuggestions() {
    const input = document.getElementById("searchBar").value.toLowerCase();
    const suggestionsBox = document.getElementById("suggestions");
    suggestionsBox.innerHTML = '';
    if (!input || pokemonNames.length === 0) return;

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
function showDynamaxSuggestions() {
    const input = document.getElementById("searchBar").value.toLowerCase();
    const suggestionsBox = document.getElementById("suggestions");
    suggestionsBox.innerHTML = '';

    if (input.length === 0) return;

    const matches = dynamaxNames.filter(name =>
        name.toLowerCase().startsWith(input)
    ).slice(0, 5);

    matches.forEach(name => {
        const div = document.createElement("div");
        div.classList.add("suggestionItem");
        div.innerText = name;
        div.onclick = () => {
            document.getElementById("searchBar").value = name;
            suggestionsBox.innerHTML = '';
            displayPokemonRanking(); // Instant search after click
        };
        suggestionsBox.appendChild(div);
    });
}


document.addEventListener("click", function (e) {
    if (!e.target.closest("#searchBar") && !e.target.closest(".suggestionsBox")) {
        document.getElementById("suggestions").innerHTML = '';
    }
});



//Dynamax Page Section

let dynamaxEntries = [];
let dynamaxNames = [];
let allDynamaxInstances = [];
let typeRankings = {};
let maxGuardRanking = [];
let maxSpiritRanking = [];

function loadDynamaxData() {
    fetch('./PokemonStats/dynamax_pokemon.json')
        .then(res => res.json())
        .then(data => {
            dynamaxData = data;
            computeAllRankings();
        })
        .catch(err => {
            console.error("Failed to load dynamax data:", err);
        });
}

function computeAllRankings() {
    const attackerList = [];
    const cpm = 0.7903; // High level CPM approximation
    const defenseBaseline = 150;

    for (let entry of dynamaxData) {
        const baseAtk = pokemonData[entry.Name]?.attack || 0;
        const atkStat = (baseAtk + 15) * cpm;

        // D-Max entry
        if (entry["D-max"]) {
            let attackerTypes = [];
            let bestDamage = 0;
            for (let type in entry) {
                if (!["Name", "D-max", "G-max", "Type1", "Type2"].includes(type) && entry[type]) {
                    const isSTAB = type === entry.Type1 || type === entry.Type2;
                    const damage = Math.floor(0.5 * 350 * (atkStat / defenseBaseline) * (isSTAB ? 1.2 : 1)) + 1;
                    attackerTypes.push({ type, damage });
                    if (damage > bestDamage) bestDamage = damage;
                }
            }
            attackerList.push({
                name: entry.Name,
                form: "D-Max",
                type1: entry.Type1,
                type2: entry.Type2,
                isDmax: true,
                isGmax: false,
                bestDamage,
                attackerTypes
            });
        }

        // G-Max entry
        if (entry["G-max"]) {
            const type = entry.Type1;
            const damage = Math.floor(0.5 * 450 * (atkStat / defenseBaseline) * 1.2) + 1;
            attackerList.push({
                name: entry.Name,
                form: "G-Max",
                type1: entry.Type1,
                type2: entry.Type2,
                isDmax: false,
                isGmax: true,
                bestDamage: damage,
                attackerTypes: [{ type, damage }]
            });
        }
    }

    // Sort by overall damage
    overallRanking = attackerList.sort((a, b) => b.bestDamage - a.bestDamage);

    // Per-type rankings
    rankingsByType = {};
    for (let type of [
        "Bug", "Dark", "Dragon", "Electric", "Fairy", "Fighting", "Fire", "Flying",
        "Ghost", "Grass", "Ground", "Ice", "Normal", "Poison", "Psychic", "Rock", "Steel", "Water"
    ]) {
        rankingsByType[type] = [...attackerList]
            .filter(p => p.attackerTypes.some(t => t.type === type))
            .sort((a, b) =>
                (b.attackerTypes.find(t => t.type === type)?.damage || 0) -
                (a.attackerTypes.find(t => t.type === type)?.damage || 0)
            );
    }
}

function displayPokemonRanking() {
    const input = document.getElementById("searchBar").value.trim();
    const resultBox = document.getElementById("resultBox");
    const typeBox = document.getElementById("typeRankingsContainer");
    resultBox.innerHTML = '';
    typeBox.innerHTML = '';

    const matches = allDynamaxInstances.filter(p => p.name.toLowerCase() === input.toLowerCase());

    if (matches.length === 0) {
        resultBox.innerHTML = `<p>No Dynamax data found for "${input}".</p>`;
        return;
    }

    matches.forEach(pkmn => {
        const typeDisplay = [pkmn.type1, pkmn.type2].filter(Boolean).join(" / ");
        const rankings = [];

        for (const type of pkmn.types) {
            const rank = typeRankings[type].findIndex(p => p.label === pkmn.label) + 1;
            rankings.push(`<li>${type} Attacker Rank: ${rank}</li>`);
        }

        const overallRank = typeRankings["Overall"].findIndex(p => p.label === pkmn.label) + 1;
        const guardRank = maxGuardRanking.findIndex(p => p.label === pkmn.label) + 1;
        const spiritRank = maxSpiritRanking.findIndex(p => p.label === pkmn.label) + 1;

        const section = `
            <div class="pkmnResultBox">
                <h3>${pkmn.label}</h3>
                <p>Type: ${typeDisplay}</p>
                <ul>
                    ${rankings.join("")}
                    <li>Overall Attacker Rank: ${overallRank}</li>
                    <li>Max Guard Rank (Defense): ${guardRank}</li>
                    <li>Max Spirit Rank (HP): ${spiritRank}</li>
                </ul>
            </div>
        `;

        resultBox.innerHTML += section;
    });
}


function buildDynamaxInstances() {
    const IV_ATTACK = 15;
    const IV_DEFENSE = 15;
    const IV_STAMINA = 15;
    const level = 50;
    const cpm = cpMultiplierTable[level.toString()] || 1;

    allDynamaxInstances = [];

    for (const entry of dynamaxEntries) {
        const baseStats = pokemonData[entry.Name];
        if (!baseStats) continue;

        const fullStats = {
            name: entry.Name,
            attack: (baseStats.attack + IV_ATTACK) * cpm,
            defense: (baseStats.defense + IV_DEFENSE) * cpm,
            hp: Math.floor((baseStats.hp + IV_STAMINA) * cpm),
            type1: entry.Type1,
            type2: entry.Type2,
            types: Object.keys(entry).filter(t => t !== "Name" && t !== "Type1" && t !== "Type2" && t !== "D-max" && t !== "G-max" && entry[t])
        };

        if (entry["D-max"]) {
            allDynamaxInstances.push({
                ...fullStats,
                form: "D-Max",
                label: `${entry.Name} (D-Max)`,
                movePower: 350,
                stabTypes: [entry.Type1, entry.Type2].filter(t => t)
            });
        }

        if (entry["G-max"]) {
            allDynamaxInstances.push({
                ...fullStats,
                form: "G-Max",
                label: `${entry.Name} (G-Max)`,
                movePower: 450,
                types: [entry.Type1], // G-Max only uses Type1
                stabTypes: [entry.Type1]
            });
        }
    }
}


function buildTypeRankings() {
    typeRankings = {};
    maxGuardRanking = [];
    maxSpiritRanking = [];

    for (const pkmn of allDynamaxInstances) {
        let bestDamage = 0;

        for (const type of pkmn.types) {
            const hasSTAB = pkmn.stabTypes.includes(type);
            const stabBonus = hasSTAB ? 1.2 : 1;
            const damage = Math.floor(0.5 * pkmn.movePower * (pkmn.attack / 150) * stabBonus) + 1;

            if (!typeRankings[type]) typeRankings[type] = [];
            typeRankings[type].push({ ...pkmn, damage });

            if (damage > bestDamage) bestDamage = damage;
        }

        // Add to overall damage ranking
        if (!typeRankings["Overall"]) typeRankings["Overall"] = [];
        typeRankings["Overall"].push({ ...pkmn, damage: bestDamage });

        maxGuardRanking.push({ ...pkmn });
        maxSpiritRanking.push({ ...pkmn });
    }

    for (const type in typeRankings) {
        typeRankings[type].sort((a, b) => b.damage - a.damage);
    }

    maxGuardRanking.sort((a, b) => b.defense - a.defense);
    maxSpiritRanking.sort((a, b) => b.hp - a.hp);
}


// Trigger data load
window.onload = () => {
    Promise.all([
        fetch('./PokemonStats/pokemon.json').then(res => res.json()),
        fetch('./PokemonStats/cp_multiplier_table.json').then(res => res.json()),
        fetch('./PokemonStats/dynamax_pokemon.json').then(res => res.json())
    ])
    .then(([pokemonList, cpTable, dynamaxList]) => {
        pokemonList.forEach(entry => {
            pokemonData[entry["Pokémon"]] = {
                hp: Number(entry["HP"]),
                attack: Number(entry["Attack"]),
                defense: Number(entry["Defense"])
            };
        });

        cpMultiplierTable = cpTable;
        dynamaxEntries = dynamaxList;
        dynamaxNames = dynamaxList.map(e => e.Name);
        pokemonNames = dynamaxNames; // Filter suggestions only to these

        buildDynamaxInstances();
        buildTypeRankings();
    })
    .catch(err => {
        console.error("Failed to load data:", err);
        alert("Error loading data files.");
    });
};
