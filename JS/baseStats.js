let pokemonData = {};
let cpMultiplierTable = {};
let pokemonNames = [];         // All Pokémon names from pokemon.json
let dynamaxEntries = [];
let dynamaxNames = [];         // Names from dynamax_pokemon.json

let chart = null;
let dynamaxChart = null;
let dynamaxMode = 'attack'; // default
let gmaxMode = 'dmax';      // 'dmax' or 'gmax'

const isDynamaxPage = window.location.pathname.includes("dynamax.html");

// Load data on page load
window.onload = () => {
    const promises = [
        fetch('./PokemonStats/pokemon.json').then(res => res.json()),
        fetch('./PokemonStats/cp_multiplier_table.json').then(res => res.json())
    ];

    if (isDynamaxPage) {
        promises.push(fetch('./PokemonStats/dynamax_pokemon.json').then(res => res.json()));
    }

    Promise.all(promises)
        .then(([pokemonList, cpTable, dynamaxList]) => {
            // Load base Pokémon stats
            pokemonList.forEach(entry => {
                pokemonData[entry["Pokémon"]] = {
                    hp: Number(entry["HP"]),
                    attack: Number(entry["Attack"]),
                    defense: Number(entry["Defense"])
                };
            });
            cpMultiplierTable = cpTable;

            // If we're on the Dynamax page, load and prepare additional data
            if (isDynamaxPage && dynamaxList) {
                dynamaxEntries = dynamaxList;
                dynamaxNames = dynamaxList.map(e => e.Name);
                pokemonNames = dynamaxNames;

                buildDynamaxInstances();
                buildTypeRankings();

                // Call populate AFTER rankings are built
                populateRankingSections();
            } else {
                pokemonNames = Object.keys(pokemonData);
            }

            // Set up event listener for Enter key in search bar
            const input = document.getElementById("searchBar");
            if (input) {
                input.addEventListener("keydown", function (event) {
                    if (event.key === "Enter") {
                        const suggestions = document.querySelectorAll(".suggestionItem");
                        if (suggestions.length > 0) {
                            input.value = suggestions[0].innerText;
                        }
                        document.getElementById("suggestions").innerHTML = '';

                        if (isDynamaxPage && typeof displayPokemonRanking === "function") {
                            displayPokemonRanking();
                        } else {
                            searchPokemon();
                        }
                    }
                });
            }
        })
        .catch(err => {
            console.error("Failed to load JSON data:", err);
            alert("Error loading data files.");
        });
};


function showSuggestions() {
    const input = document.getElementById("searchBar").value.toLowerCase();
    const suggestionsBox = document.getElementById("suggestions");
    suggestionsBox.innerHTML = '';

    if (input.length === 0) return;

    const sourceNames = isDynamaxPage ? dynamaxNames : pokemonNames;

    const matches = sourceNames.filter(name =>
        name.toLowerCase().startsWith(input)
    ).slice(0, 5);

    matches.forEach(name => {
        const div = document.createElement("div");
        div.classList.add("suggestionItem");
        div.innerText = name;
        div.onclick = () => {
            document.getElementById("searchBar").value = name;
            suggestionsBox.innerHTML = '';

            if (isDynamaxPage) {
                displayPokemonRanking();
            } else {
                searchPokemon();
            }
        };
        suggestionsBox.appendChild(div);
    });
}

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
    const ctx = document.getElementById('dynamaxChart')?.getContext('2d');
    if (!ctx) return;
    if (dynamaxChart) dynamaxChart.destroy();

    if (dynamaxMode === 'attack') {
        const defenseInput = document.getElementById("defenseBaseline");
        if (!defenseInput) return;
        const defenseBaseline = parseInt(defenseInput.value);
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

document.addEventListener("click", function (e) {
    if (!e.target.closest("#searchBar") && !e.target.closest(".suggestionsBox")) {
        document.getElementById("suggestions").innerHTML = '';
    }
});

// Dynamax Page Section

let allDynamaxInstances = [];
let typeRankings = {};
let maxGuardRanking = [];
let maxSpiritRanking = [];

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
                types: [entry.Type1],
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

function displayPokemonRanking() {
    const input = document.getElementById("searchBar");
    const resultBox = document.getElementById("resultBox");
    if (!input || !resultBox) return;

    const name = input.value.trim();
    resultBox.innerHTML = '';

    const matches = allDynamaxInstances.filter(p => p.name.toLowerCase() === name.toLowerCase());
    if (matches.length === 0) {
        resultBox.innerHTML = `<p>No Dynamax data found for "${name}".</p>`;
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
function populateRankingSections() {
    const typeContent = document.getElementById("typeAttackersContent");
    const overallContent = document.getElementById("overallAttackersContent");
    const maxGuardContent = document.getElementById("maxGuardContent");
    const maxSpiritContent = document.getElementById("maxSpiritContent");
    const bulkContent = document.getElementById("bulkContent");

    if (!typeContent || !overallContent || !maxGuardContent || !maxSpiritContent || !bulkContent) return;

    // Clear all contents first
    typeContent.innerHTML = '';
    overallContent.innerHTML = '';
    maxGuardContent.innerHTML = '';
    maxSpiritContent.innerHTML = '';
    bulkContent.innerHTML = '';

    // ----- TYPE GROUP COLLAPSIBLE (Outer) -----
    const typeGroupBtn = document.createElement("button");
    typeGroupBtn.className = "collapsible";
    typeGroupBtn.innerText = "Attacker Ranking by Type";

    const typeGroupContent = document.createElement("div");
    typeGroupContent.className = "content";

    typeContent.appendChild(typeGroupBtn);
    typeContent.appendChild(typeGroupContent);

    // ----- Inner Type Buttons -----
    for (const type in typeRankings) {
        if (type === "Overall") continue;

        const btn = document.createElement("button");
        btn.className = "collapsible";
        btn.innerText = `${type} Attackers`;

        const innerContent = document.createElement("div");
        innerContent.className = "content";

        const table = document.createElement("table");
        table.className = "ranking-table";

        const thead = document.createElement("thead");
        thead.innerHTML = "<tr><th>Place</th><th>Name</th><th>Damage</th>";
        table.appendChild(thead);

        const tbody = document.createElement("tbody");

        typeRankings[type].forEach((pkmn, index) => {
            const row = document.createElement("tr");
            row.innerHTML = `<td>${index + 1}</td><td>${pkmn.label}</td><td>${pkmn.damage} dmg</td>`;
            tbody.appendChild(row);
        });

        table.appendChild(tbody);
        innerContent.appendChild(table);
        typeGroupContent.appendChild(btn);
        typeGroupContent.appendChild(innerContent);
    }

    // ----- Overall Attacker Rankings -----
    const overallTable = document.createElement("table");
    overallTable.className = "ranking-table";

    overallTable.innerHTML = `
        <thead><tr><th>Place</th><th>Name</th><th>Damage</th></tr></thead>
        <tbody>
            ${typeRankings["Overall"]?.map((pkmn, i) => `
                <tr><td>${i + 1}</td><td>${pkmn.label}</td><td>${pkmn.damage} dmg</td></tr>
            `).join("")}
        </tbody>
    `;
    overallContent.appendChild(overallTable);

    // ----- Max Guard Rankings -----
    const guardTable = document.createElement("table");
    guardTable.className = "ranking-table";

    guardTable.innerHTML = `
        <thead><tr><th>Place</th><th>Name</th><th>Defense</th></tr></thead>
        <tbody>
            ${maxGuardRanking.map((pkmn, i) => `
                <tr><td>${i + 1}</td><td>${pkmn.label}</td><td>${Math.round(pkmn.defense)}</td></tr>
            `).join("")}
        </tbody>
    `;
    maxGuardContent.appendChild(guardTable);

    // ----- Max Spirit Rankings -----
    const spiritTable = document.createElement("table");
    spiritTable.className = "ranking-table";

    spiritTable.innerHTML = `
        <thead><tr><th>Place</th><th>Name</th><th>HP Bonus</th></tr></thead>
        <tbody>
            ${maxSpiritRanking.map((pkmn, i) => `
                <tr><td>${i + 1}</td><td>${pkmn.label}</td><td>+${Math.floor(pkmn.hp / 100 * 16)} HP</td></tr>
            `).join("")}
        </tbody>
    `;
    maxSpiritContent.appendChild(spiritTable);

    // ----- Bulk Rankings -----
    const bulkSorted = [...allDynamaxInstances].sort((a, b) => (b.hp * b.defense) - (a.hp * a.defense));
    const bulkTable = document.createElement("table");
    bulkTable.className = "ranking-table";

    bulkTable.innerHTML = `
        <thead><tr><th>Place</th><th>Name</th><th>Bulk</th></tr></thead>
        <tbody>
            ${bulkSorted.map((pkmn, i) => {
                const bulk = Math.round(pkmn.hp * pkmn.defense);
                return `<tr><td>${i + 1}</td><td>${pkmn.label}</td><td>${bulk}</td></tr>`;
            }).join("")}
        </tbody>
    `;
    bulkContent.appendChild(bulkTable);

    // ----- Setup All Collapsibles -----
    setTimeout(() => {
        document.querySelectorAll(".collapsible").forEach(btn => {
            btn.addEventListener("click", function () {
                this.classList.toggle("active");
                const content = this.nextElementSibling;
                if (!content) return;

                if (content.style.maxHeight) {
                    content.style.maxHeight = null;
                } else {
                    content.style.maxHeight = content.scrollHeight + "px";

                    const parentContent = this.closest(".content");
                    if (parentContent && parentContent.style.maxHeight) {
                        parentContent.style.maxHeight = parentContent.scrollHeight + "px";
                    }
                }
            });
        });
    }, 0);
}







