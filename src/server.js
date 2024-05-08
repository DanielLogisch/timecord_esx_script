const axios = require("axios");
const config = require("./config.json");
const ESX = exports["es_extended"].getSharedObject();

// Resource start and stop events
on("onResourceStart", (resourceName) => {
  if (GetCurrentResourceName() !== resourceName) {
    return;
  }
  
  console.log("TimeCord successfully started!");
});

on("onResourceStop", (resourceName) => {
  if (GetCurrentResourceName() !== resourceName) {
    return;
  }
  console.log("TimeCord successfully stopped.");
});

// Event handlers
onNet("timecord:dutyTrigger", (player, on) => {
  // CUSTOM TRIGGER
  let xPlayer = ESX.GetPlayerFromId(player);
  let jobs = Object.keys(config.api);
  let apiKeys = Object.values(config.api);

  for (let i = 0; i < jobs.length; i++) {
    if (xPlayer.job.name === jobs[i]) {
      emit("timecord:postPlayerRequest", xPlayer, getIdentifiers(player), on, apiKeys[i]);
    }
  }
});

onNet("esx:playerLoaded", (player, xPlayer, isNew) => {
  let jobs = Object.keys(config.api);
  let apiKeys = Object.values(config.api);

  for (let i = 0; i < jobs.length; i++) {
    if (xPlayer.job.name === jobs[i]) {
      emit("timecord:postPlayerRequest", xPlayer, getIdentifiers(player), true, apiKeys[i]);
    }
  }
});

onNet("esx:playerDropped", (playerId, reason) => {
  let xPlayer = ESX.GetPlayerFromId(playerId);
  let jobs = Object.keys(config.api);
  let apiKeys = Object.values(config.api);

  for (let i = 0; i < jobs.length; i++) {
    if (xPlayer.job.name === jobs[i]) {
      emit("timecord:postPlayerRequest", xPlayer, getIdentifiers(player), false, apiKeys[i]);
    }
  }
});

// Request Handler
on("timecord:postPlayerRequest", (xPlayer, identifiers, fresh, apiKey) => {
  const dataToSend = generatePlayerData(identifiers, xPlayer?.job, fresh, apiKey);
  const queryString = `https://timecord.dev/api/script?data=${encodeURIComponent(dataToSend)}`;

  axios
    .get(queryString)
    .then((result) => {
      if (result.status === 200) {
        if (fresh && config.esx_notify.enabled) xPlayer.showNotification(config.messages.player_onduty);
      } else {
        console.log("[ERROR] " + result.data.message || "Unknown error occurred.");
      }
    })
    .catch((err) => {
      console.error("[ERROR] ", err.toString());
    });
});

// Functions
function getIdentifiers(player) {
  let steamIdentifier = "";
  let discordIdentifier = "";

  for (let i = 0; i < GetNumPlayerIdentifiers(player); i++) {
    const identifier = GetPlayerIdentifier(player, i);

    if (identifier.includes("steam:")) {
      steamIdentifier = identifier;
    } else if (identifier.includes("discord:")) {
      discordIdentifier = identifier;
    }
  }

  return { steam: steamIdentifier, discord: discordIdentifier };
}

function generatePlayerData(identifiers, job, duty, apiKey) {
  let data = {
    key: apiKey,
    duty: duty,
    type: "player",
    user: {
      discord: identifiers?.discord.split(":")[1] || null,
      steam: identifiers?.steam.split(":")[1] || null,
    },
  };

  data.job = {
    label: job.label,
    grade: job.grade,
    grade_label: job.grade_label,
  };

  return JSON.stringify(data);
}
