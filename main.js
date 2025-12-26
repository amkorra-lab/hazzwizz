         
         
         $(function () {
          renderCharacterSelect();
          loadActiveCharacter();
			 render();
         });
            const STORAGE_KEY = "rpg-characters";
         
         function getStore() {
          let store = JSON.parse(localStorage.getItem(STORAGE_KEY));
          if (!store) {
            store = {
              activeId: "char-1",
              characters: {
                "char-1": { name: "New Hero", level: 1, class: "", isDead: false, Rank: {}, Modifyer: {},  Bonus: {}, customSkills:{0:{ id:0, label:"", stat:"int/wis","type":"Lore/Profession"},
																																	1:{ id:1, label:"", stat:"int/wis","type":"Lore/Profession"},
																																	2:{ id:2, label:"", stat:"int/wis","type":"Lore/Profession"},
																																	3:{ id:3, label:"", stat:"int/wis","type":"Lore/Profession"}} }
              }
            };
            localStorage.setItem(STORAGE_KEY, JSON.stringify(store));
          }
          return store;
         }
         
         function saveStore(store) {
          localStorage.setItem(STORAGE_KEY, JSON.stringify(store));
         }
         
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
         
         
         function loadActiveCharacter() {
          const store = getStore();
          const char = store.characters[store.activeId];
			 
			computeDerivedStats(char);
          $('[data-attrib]').each(function () {
            const key = $(this).data('attrib');
            const value = getByPath(char, key);
         
            if (this.type === 'checkbox') {
              $(this).prop('checked', value);
            }
            else if (this.tagName === 'INPUT' || this.tagName === 'SELECT') {
              $(this).val(value);
            }
            else {
              $(this).text(value === true ? 'Yes' : value);
            }
          });
			 
         const portrait = char.portrait || '';
         $('#charPortrait').attr('src', portrait);
         }
         
                 
         $(document).on('input change', '[data-attrib]', function () {
          const store = getStore();
          const char = store.characters[store.activeId];
          const key = $(this).data('attrib');
         
          let value;
          if (this.type === 'checkbox') {
            value = $(this).is(':checked');
          } else {
            value = $(this).val();
          }
         
          setByPath(char, key, normalizeValue(value));
          saveStore(store);
         
          // Update sheet live
          $('[data-attrib="' + key + '"]').not(':input, select').text(
            value === true ? 'Yes' : value
          );
         
 		 
		  computeDerivedStats(char);
          renderCharacterSelect(); // updates name if renamed
         });
         
         
         $('#characterSelect').on('change', function () {
          const store = getStore();
          store.activeId = this.value;
          saveStore(store);
          loadActiveCharacter();
         });
         
         
         $('#newCharBtn').on('click', function () {
          const store = getStore();
          const id = 'char-' + Date.now();
         
          store.characters[id] = {
            name: 'New Hero',
            level: 1,
            class: '',
			  con:0,
			  str:0,
			  dex:0,
			  int:0,
			  wis:0,
			  cha:0,
			Rank:{acrobatics:0},
			Bonus:{acrobatics:0},
			Modifyer:{},
            isDead: false
          };
         
          store.activeId = id;
          saveStore(store);
         
          renderCharacterSelect();
          loadActiveCharacter();
		
		computeDerivedStats( store.characters[id]);
         });
         // Open editor
          $('#editBtn').on('click', function () {         
            $('#editOverlay').fadeIn(150);
          });
         $('#closeBtn').on('click', function () {
            $('#editOverlay').fadeOut(150);
          });
 //Save numbers as numbers        
    function normalizeValue(val) {
  if (val === "" || val === null) return 0;
  if (!isNaN(val)) return Number(val);
  return val;
}        
            
            
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
         
              // Scale to fill (cover)
              const scale = Math.max(
                TARGET_W / img.width,
                TARGET_H / img.height
              );
         
              const scaledW = img.width * scale;
              const scaledH = img.height * scale;
         
              const offsetX = (TARGET_W - scaledW) / 2;
              const offsetY = (TARGET_H - scaledH) / 2;
         
              ctx.drawImage(
                img,
                offsetX,
                offsetY,
                scaledW,
                scaledH
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
         
          processPortrait(file, function (base64) {
            const store = getStore();
            const char = store.characters[store.activeId];
         
            char.portrait = base64;
            saveStore(store);
         
            $('#charPortrait').attr('src', base64);
          });
         
          this.value = ''; // allow re-uploading same file
         });

function computeDerivedStats(sheetData) {
  document.querySelectorAll("[data-formula]").forEach(el => {
    const formula = el.dataset.formula;

    try {
      const result = Function(
        "data",
        `
        with (data) {
          return Number(${formula});
        }
        `
      )(sheetData);

      el.textContent = Number.isFinite(result) ? result : 0;
    } catch {
      el.textContent = 0;
    }
  });
}

function setByPath(obj, path, value) {
  const parts = path.split('.');
  let current = obj;

  for (let i = 0; i < parts.length - 1; i++) {
    const key = parts[i];
    if (!current[key] || typeof current[key] !== 'object') {
      current[key] = {};
    }
    current = current[key];
  }

  current[parts[parts.length - 1]] = value;
}

function getByPath(obj, path) {
  return path.split('.').reduce((acc, key) => {
    return acc && acc[key] !== undefined ? acc[key] : undefined;
  }, obj);
}

function renderPinnedSkills(container) {
  container.empty();

  SKILLS
    .filter(s => getByPath(char, `Pinned.${s.key}`))
    .forEach(skill => {
      container.append `
        <div class="row">
          <div class="col-22 r">${skill.label}</div>
          <div class="col-4 c r">
            <span data-attrib="Mod.${skill.key}"></span>
          </div>
        </div>
      `);
    });
}
function renderSkillSheet(container) {
  container.empty();

  SKILLS.forEach(skill => {
    container.append( `
      <div class="row">
        <div class="col-22 r">${skill.label} (${skill.stat.toUpperCase()})</div>
        <div class="col-4 c r"><span data-attrib="${skill.stat}"></span></div>
        <div class="col-4 c r"><span data-attrib="Rank.${skill.key}"></span></div>
        <div class="col-4 c r"><span data-attrib="Bonus.${skill.key}"></span></div>
        <div class="col-4 c r">
          <span
            data-attrib="Mod.${skill.key}"
            data-formula="${skill.stat} + Rank.${skill.key}">
          </span>
        </div>
      </div>
    `);
  });
	 (char.customSkills || []).forEach(skill => {
    container.append( `
      <div class="row">
        <div class="col-22 r">${skill.type}: ${skill.label} (${skill.stat.toUpperCase()})</div>
        <div class="col-4 c r"><span data-attrib="${skill.stat}"></span></div>
        <div class="col-4 c r"><input type="number" data-attrib="Rank.${skill.id}"></div>
        <div class="col-4 c r"><input type="number" data-attrib="Bonus.${skill.id}"></div>
        <div class="col-4 c r">
          <span data-attrib="Mod.${skill.id}"
                data-formula="${skill.stat} + Rank.${skill.id} + Bonus.${skill.id}">
          </span>
        </div>
      </div>
    `);
  });
}
function renderCustomSkills(container) {
  container.empty();

  (char.customSkills || []).forEach(skill => {
    container.append( `
      <div class="row">
        <div class="col-22 r">${skill.type}: ${skill.label} (${skill.stat.toUpperCase()})</div>
        <div class="col-4 c r"><span data-attrib="${skill.stat}"></span></div>
        <div class="col-4 c r"><input type="number" data-attrib="Rank.${skill.id}"></div>
        <div class="col-4 c r"><input type="number" data-attrib="Bonus.${skill.id}"></div>
        <div class="col-4 c r">
          <span data-attrib="Mod.${skill.id}"
                data-formula="${skill.stat} + Rank.${skill.id} + Bonus.${skill.id}">
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
        <div class="col-4 c r"><span data-attrib="Mod.${skill.key}" data-formula="${skill.stat} + Rank.${skill.key}"></span>
        </div>
        <div class="col-8 c r">
          <input type="checkbox" data-attrib="Pinned.${skill.key}">
        </div>
      </div>
    `);
	  
  });
  
	  //add Custom Skills last
 (char.customSkills || []).forEach(skill => {
    container.append( `
      <div class="row">
        <div class="col-22 r">${skill.type}: ${skill.label} (${skill.stat.toUpperCase()})</div>
        <div class="col-4 c r"><span data-attrib="${skill.stat}"></span></div>
        <div class="col-4 c r"><input type="number" data-attrib="Rank.${skill.id}"></div>
        <div class="col-4 c r"><input type="number" data-attrib="Bonus.${skill.id}"></div>
        <div class="col-4 c r">
          <span data-attrib="Mod.${skill.id}"
                data-formula="${skill.stat} + Rank.${skill.id}">
          </span>
        </div>
      </div>
    `);
  });
}
function render(){
	renderSkillForm($("#skillForm"));	
	renderSkillSheet($("#skillSheet"));	
	renderPinnedSkills($(".pinnedSkills"));	
}
