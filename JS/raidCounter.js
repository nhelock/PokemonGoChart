let dynamaxEntries = [];
let dynamaxNames = [];
let pokemonStats = {}; // key: Pokémon name, value: { attack, defense, hp }

const typeEffectiveness = {
  Normal:     { Fighting: 1.6, Ghost: 0 },
  Fire:       { Water: 1.6, Ground: 1.6, Rock: 1.6, Bug: 0.625, Steel: 0.625, Fire: 0.625, Grass: 0.625, Ice: 0.625, Fairy: 0.625 },
  Water:      { Electric: 1.6, Grass: 1.6, Fire: 0.625, Water: 0.625, Ice: 0.625, Steel: 0.625 },
  Electric:   { Ground: 1.6, Electric: 0.625, Flying: 0.625, Steel: 0.625 },
  Grass:      { Fire: 1.6, Ice: 1.6, Poison: 1.6, Flying: 1.6, Bug: 1.6, Water: 0.625, Electric: 0.625, Grass: 0.625, Ground: 0.625 },
  Ice:        { Fire: 1.6, Fighting: 1.6, Rock: 1.6, Steel: 1.6, Ice: 0.625 },
  Fighting:   { Flying: 1.6, Psychic: 1.6, Fairy: 1.6, Bug: 0.625, Rock: 0.625, Dark: 0.625 },
  Poison:     { Ground: 1.6, Psychic: 1.6, Fighting: 0.625, Poison: 0.625, Bug: 0.625, Fairy: 0.625 },
  Ground:     { Water: 1.6, Grass: 1.6, Ice: 1.6, Poison: 0.625, Rock: 0.625 },
  Flying:     { Electric: 1.6, Ice: 1.6, Rock: 1.6, Fighting: 0.625, Bug: 0.625, Grass: 0.625 },
  Psychic:    { Bug: 1.6, Ghost: 1.6, Dark: 1.6, Fighting: 0.625, Psychic: 0.625 },
  Bug:        { Fire: 1.6, Flying: 1.6, Rock: 1.6, Fighting: 0.625, Ground: 0.625, Grass: 0.625 },
  Rock:       { Water: 1.6, Grass: 1.6, Fighting: 1.6, Ground: 1.6, Steel: 1.6, Normal: 0.625, Fire: 0.625, Poison: 0.625, Flying: 0.625 },
  Ghost:      { Ghost: 1.6, Dark: 1.6, Normal: 0, Fighting: 0 },
  Dragon:     { Ice: 1.6, Dragon: 1.6, Fairy: 1.6 },
  Dark:       { Fighting: 1.6, Bug: 1.6, Fairy: 1.6, Ghost: 0.625, Dark: 0.625, Psychic: 0 },
  Steel:      { Fire: 1.6, Fighting: 1.6, Ground: 1.6, Normal: 0.625, Grass: 0.625, Ice: 0.625, Flying: 0.625, Psychic: 0.625, Bug: 0.625, Rock: 0.625, Dragon: 0.625, Steel: 0.625, Fairy: 0.625 },
  Fairy:      { Poison: 1.6, Steel: 1.6, Fighting: 0.625, Bug: 0.625, Dark: 0.625 }
};

function getDefensiveMultiplier(moveType, defenderType1, defenderType2) {
  const type1Multiplier = typeEffectiveness[defenderType1]?.[moveType] ?? 1;
  const type2Multiplier = defenderType2 ? (typeEffectiveness[defenderType2]?.[moveType] ?? 1) : 1;
  return type1Multiplier * type2Multiplier;
}

// Load data files
window.onload = () => {
  Promise.all([
    fetch('./PokemonStats/dynamax_pokemon.json').then(res => res.json()),
    fetch('./PokemonStats/pokemon.json').then(res => res.json())
  ])
  .then(([dynamaxData, pokemonData]) => {
    dynamaxEntries = dynamaxData;
    dynamaxNames = dynamaxEntries.map(e => e.Name);

    pokemonData.forEach(entry => {
      pokemonStats[entry.Pokémon] = {
        attack: Number(entry.Attack),
        defense: Number(entry.Defense),
        hp: Number(entry.HP)
      };
    });
  })
  .catch(err => console.error("Error loading JSON data:", err));

  document.getElementById('searchBar').addEventListener('keydown', function(event) {
    if (event.key === 'Enter') {
      event.preventDefault();
      calculateCounters();
      document.getElementById('suggestions').innerHTML = '';
    }
  });
};

document.addEventListener("click", e => {
  if (!e.target.closest("#searchBar") && !e.target.closest("#suggestions")) {
    document.getElementById("suggestions").innerHTML = '';
  }
});

function showSuggestions() {
  const input = document.getElementById("searchBar");
  const suggestionsBox = document.getElementById("suggestions");
  const query = input.value.toLowerCase();

  suggestionsBox.innerHTML = '';
  if (query.length === 0) return;

  const matches = dynamaxNames.filter(name => name.toLowerCase().startsWith(query)).slice(0, 5);

  matches.forEach(name => {
    const div = document.createElement("div");
    div.classList.add("suggestionItem");
    div.innerText = name;
    div.onclick = () => {
      input.value = name;
      suggestionsBox.innerHTML = '';
      calculateCounters();
    };
    suggestionsBox.appendChild(div);
  });
}

function calculateCounters() {
  const input = document.getElementById('searchBar').value.trim();
  const resultBox = document.getElementById('resultBox');
  if (!input) {
    resultBox.innerHTML = '<p>Please enter a raid boss name.</p>';
    return;
  }

  const bossEntry = dynamaxEntries.find(p => p.Name.toLowerCase() === input.toLowerCase());
  if (!bossEntry) {
    resultBox.innerHTML = `<p>No raid boss found with name "${input}".</p>`;
    return;
  }

  const defenderType1 = bossEntry.Type1;
  const defenderType2 = bossEntry.Type2 || null;

  const defenderStats = pokemonStats[bossEntry.Name];
  if (!defenderStats) {
    resultBox.innerHTML = `<p>No stats found for raid boss "${bossEntry.Name}".</p>`;
    return;
  }

  const attackers = [];

  dynamaxEntries.forEach(attacker => {
    const attackerStats = pokemonStats[attacker.Name];
    if (!attackerStats) return;

    const moveTypes = Object.keys(typeEffectiveness).filter(t => attacker[t]);

    function calcBestDamage(movePower) {
      let bestDamage = 0;
      moveTypes.forEach(moveType => {
        const stab = (attacker.Type1 === moveType || attacker.Type2 === moveType) ? 1.2 : 1;
        const effectiveness = getDefensiveMultiplier(moveType, defenderType1, defenderType2);
        if (effectiveness === 0) return; // immune
        const damage = 0.5 * movePower * (attackerStats.attack / defenderStats.defense) * effectiveness * stab;
        if (damage > bestDamage) bestDamage = damage;
      });
      return bestDamage;
    }

    if (attacker['G-max']) {
      attackers.push({
        name: `${attacker.Name} (G-Max)`,
        movePower: 450,
        bestDamage: calcBestDamage(450)
      });
    }

    if (attacker['D-max']) {
      attackers.push({
        name: `${attacker.Name} (D-Max)`,
        movePower: 350,
        bestDamage: calcBestDamage(350)
      });
    }

    // Only add base form if it's not a G-max or D-max form
    if (!attacker['D-max'] && !attacker['G-max']) {
      attackers.push({
        name: attacker.Name,
        movePower: 300,
        bestDamage: calcBestDamage(300)
      });
    }
  });

  attackers.sort((a, b) => b.bestDamage - a.bestDamage);
  const topAttackers = attackers.slice(0, 10);

  let html = `
    <h2>Top 10 Counters vs. ${bossEntry.Name} (${defenderType1}${defenderType2 ? ' / ' + defenderType2 : ''})</h2>
    <table class="ranking-table">
      <thead>
        <tr><th>Rank</th><th>Pokémon</th><th>Damage</th></tr>
      </thead>
      <tbody>
  `;

  topAttackers.forEach((att, i) => {
    html += `
      <tr>
        <td>${i + 1}</td>
        <td>${att.name}</td>
        <td>${att.bestDamage.toFixed(1)}</td>
      </tr>
    `;
  });

  html += `</tbody></table>`;
  resultBox.innerHTML = html;
}

