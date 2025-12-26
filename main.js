"use strict";

/********************************
 * GLOBAL STATE
 ********************************/
const STORAGE_KEY = "rpg-characters";
let sheetData = null; // ACTIVE CHARACTER ONLY

/********************************
 * STARTUP
 ********************************/
$(function () {
  renderCharacterSelect();
  loadActiveCharacter();
  render();
});

/********************************
 * STORE HELPERS
 ********************************/
function getStore() {
  let store = JSON.parse(localStorage.getItem(STORAGE_KEY));

  if (!store) {
    store = {
      activeId: "char-1",
      characters: {
        "char-1": createEmptyCharacter()
      }
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(store));
  }
  return store;
}

function saveStore(store) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(store));
}

/********************************
 * CHARACTER FACTORY
 ********************************/
function createEmptyCharacter() {
  return {
    name: "New Hero",
    level: 1,
    class: "",
    con: 0, str: 0, dex: 0, int: 0, wis: 0, cha: 0,
    Rank: {},
    Bonus: {},
    Mod: {},
    Pinned: {},
    customSkills: [],
    portrait: "",
    isDead: false
  };
}

/********************************
 * CHARACTER SELECTION + EDIT FORM
 ********************************/
function renderCharacterSelect() {
  const store = getStore();
  const select = $('#characterSelect').empty();

  Object.entries(store.characters).forEach(([id, char]) => {
    $('<option>')
      .val(id)
      .text(char.name || id)
      .prop('selected', id === store.activeId)
      .appendTo(select);
  });
}

$('#characterSelect').on('change', function () {
  const store = getStore();
  store.activeId = this.value;
  saveStore(store);
  loadActiveCharacter();
  render();
});
$('#editBtn').on('click', function () { $('#editOverlay').fadeIn(150); }); 
$('#closeBtn').on('click', function () { $('#editOverlay').fadeOut(150); });

/********************************
 * LOAD ACTIVE CHARACTER
 ********************************/
function loadActiveCharacter() {
  const store = getStore();
  sheetData = store.characters[store.activeId];

  updateSheetDisplay();
  computeDerivedStats(sheetData);

  $('#charPortrait').attr('src', sheetData.portrait || '');
}

/********************************
 * INPUT → DATA → SAVE
 ********************************/
$(document).on('input change', '[data-attrib]', function () {
  const store = getStore();
  const key = this.dataset.attrib;

  const value = this.type === 'checkbox'
    ? this.checked
    : normalizeValue(this.value);

  setByPath(sheetData, key, value);
  saveStore(store);

  computeDerivedStats(sheetData);
  updateSheetDisplay();
  renderCharacterSelect();
});

/********************************
 * NEW CHARACTER
 ********************************/
$('#newCharBtn').on('click', function () {
  const store = getStore();
  const id = 'char-' + Date.now();

  store.characters[id] = createEmptyCharacter();
  store.activeId = id;
  saveStore(store);

  renderCharacterSelect();
  loadActiveCharacter();
  render();
});

/********************************
 * PORTRAIT
 ********************************/
function processPortrait(file, callback) {
  const img = new Image();
  const reader = new FileReader();

  reader.onload = e => {
    img.onload = () => {
      const TARGET_W = 150;
      const TARGET_H = 190;

      const canvas = document.createElement('canvas');
      canvas.width = TARGET_W;
      canvas.height = TARGET_H;
      const ctx = canvas.getContext('2d');

      const scale = Math.max(
        TARGET_W / img.width,
        TARGET_H / img.height
      );

      const w = img.width * scale;
      const h = img.height * scale;

      ctx.drawImage(
        img,
        (TARGET_W - w) / 2,
        (TARGET_H - h) / 2,
        w,
        h
      );

      callback(canvas.toDataURL('image/png'));
    };
    img.src = e.target.result;
  };
  reader.readAsDataURL(file);
}

$('#portraitUpload').on('change', function () {
  const file = this.files[0];
  if (!file) return;

  processPortrait(file, base64 => {
    const store = getStore();
    sheetData.portrait = base64;
    saveStore(store);
    $('#charPortrait').attr('src', base64);
  });

  this.value = '';
});

/********************************
 * RENDERING
 ********************************/
function render() {
  renderSkillForm($("#skillForm"));
  renderSkillSheet($("#skillSheet"));
  renderPinnedSkills($(".pinnedSkills"));
}

/********************************
 * SKILL RENDERING
 ********************************/
function renderSkillSheet(container) {
  container.empty();

  SKILLS.forEach(skill => {
    container.append(`
      <div class="row">
        <div class="col-22 r">${skill.label} (${skill.stat.toUpperCase()})</div>
        <div class="col-4 c r"><span data-attrib="${skill.stat}"></span></div>
        <div class="col-4 c r"><span data-attrib="Rank.${skill.key}"></span></div>
        <div class="col-4 c r"><span data-attrib="Bonus.${skill.key}"></span></div>
        <div class="col-4 c r">
          <span data-attrib="Mod.${skill.key}"
                data-formula="${skill.stat} + Rank.${skill.key} + Bonus.${skill.key}">
          </span>
        </div>
      </div>
    `);
  });
}

function renderSkillForm(container) {
  container.empty();

  SKILLS.forEach(skill => {
    container.append(`
      <div class="row">
        <div class="col-22 r">${skill.label} (${skill.stat.toUpperCase()})</div>
        <div class="col-4 c r"><span data-attrib="${skill.stat}"></span></div>
        <div class="col-4 c r"><input type="number" data-attrib="Rank.${skill.key}"></div>
        <div class="col-4 c r"><input type="number" data-attrib="Bonus.${skill.key}"></div>
        <div class="col-4 c r">
          <span data-attrib="Mod.${skill.key}"
                data-formula="${skill.stat} + Rank.${skill.key} + Bonus.${skill.key}">
          </span>
        </div>
        <div class="col-8 c r">
          <input type="checkbox" data-attrib="Pinned.${skill.key}">
        </div>
      </div>
    `);
  });
}

function renderPinnedSkills(container) {
  container.empty();

  SKILLS
    .filter(s => getByPath(sheetData, `Pinned.${s.key}`))
    .forEach(skill => {
      container.append(`
        <div class="row">
          <div class="col-22 r">${skill.label}</div>
          <div class="col-4 c r">
            <span data-attrib="Mod.${skill.key}"></span>
          </div>
        </div>
      `);
    });
}

/********************************
 * FORMULA ENGINE
 ********************************/
function computeDerivedStats(data) {
  document.querySelectorAll("[data-formula]").forEach(el => {
    try {
      const result = Function(
        "d",
        `with(d){ return Number(${el.dataset.formula}) || 0 }`
      )(data);

      setByPath(data, el.dataset.attrib, result);
      el.textContent = result;
    } catch {
      el.textContent = 0;
    }
  });
}

/********************************
 * DATA HELPERS
 ********************************/
function normalizeValue(val) {
  if (val === "" || val == null) return 0;
  if (!isNaN(val)) return Number(val);
  return val;
}

function setByPath(obj, path, value) {
  const parts = path.split('.');
  let current = obj;

  for (let i = 0; i < parts.length - 1; i++) {
    if (!current[parts[i]]) current[parts[i]] = {};
    current = current[parts[i]];
  }
  current[parts.at(-1)] = value;
}

function getByPath(obj, path) {
  return path.split('.').reduce(
    (o, k) => (o && o[k] !== undefined ? o[k] : 0),
    obj
  );
}

function updateSheetDisplay() {
  document.querySelectorAll("[data-attrib]").forEach(el => {
    if (el.matches("input, select")) return;
    el.textContent = getByPath(sheetData, el.dataset.attrib) ?? "";
  });
}
