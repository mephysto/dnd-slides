const fs = require("fs");
const path = require("path");

let configPath = null;
let _config = {};

function init(userDataPath) {
  configPath = path.join(userDataPath, "config.json");
  try {
    _config = JSON.parse(fs.readFileSync(configPath, "utf8"));
  } catch {
    _config = {};
  }
}

function save() {
  if (!configPath) return;
  fs.writeFileSync(configPath, JSON.stringify(_config, null, 2));
}

function getMonstersDir(fallback) {
  return _config.monstersDir || fallback;
}

function getEnvironmentsDir(fallback) {
  return _config.environmentsDir || fallback;
}

function setMonstersDir(dir) {
  _config.monstersDir = dir;
  save();
}

function setEnvironmentsDir(dir) {
  _config.environmentsDir = dir;
  save();
}

module.exports = { init, getMonstersDir, getEnvironmentsDir, setMonstersDir, setEnvironmentsDir };
