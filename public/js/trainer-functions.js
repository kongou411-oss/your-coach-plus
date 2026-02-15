// ========== Firebase Init ==========
firebase.initializeApp(FIREBASE_CONFIG);
const auth = firebase.auth();
const db = firebase.firestore();
const functions = firebase.app().functions('asia-northeast2');

// ========== Trainer Auth (Custom Claims) ==========
let currentTrainerOrg = null;

auth.onAuthStateChanged(async (user) => {
    if (!user) {
        window.location.href = '/trainer-login.html';
        return;
    }
    try {
        const idTokenResult = await user.getIdTokenResult(true);
        if (idTokenResult.claims.role !== 'trainer' || !idTokenResult.claims.organizationName) {
            await auth.signOut();
            window.location.href = '/trainer-login.html';
            return;
        }
        currentTrainerOrg = idTokenResult.claims.organizationName;
        document.getElementById('user-info').textContent = user.email;
        document.getElementById('trainer-org-label').textContent = currentTrainerOrg;
        await initPage();
    } catch (e) {
        console.error('Auth check error:', e);
        await auth.signOut();
        window.location.href = '/trainer-login.html';
    }
});

function logout() { auth.signOut().then(() => { window.location.href = '/trainer-login.html'; }); }

// ========== Global State ==========
let cachedTemplates = [];
let loadedUserProfile = null;
let loadedUserUid = null;
let loadedUserCustomFoods = [];
let loadedRoutinePatterns = {};
let templateItems = [];
let selectedFoodCategory = 'all';
let leftFilterType = 'ALL';
let drawerMode = 'create';
let editingTemplateId = null;
let orgClients = [];

// ========== Init ==========
async function initPage() {
    await Promise.all([loadTemplates(), loadOrgClients()]);
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    document.getElementById('cq-assign-date').value = tomorrow.toISOString().split('T')[0];
    onTemplateTypeChange();
}

// ========== Load Org Clients ==========
async function loadOrgClients() {
    try {
        const getTrainerUserList = functions.httpsCallable('getTrainerUserList');
        const result = await getTrainerUserList();
        if (result.data.success) {
            orgClients = result.data.users || [];
            renderClientDropdown();
        }
    } catch (e) {
        console.error('Load org clients error:', e);
        document.getElementById('cq-client-dropdown').innerHTML = '<option value="">クライアント取得エラー</option>';
    }
}

function renderClientDropdown() {
    const sel = document.getElementById('cq-client-dropdown');
    let html = '<option value="">-- クライアントを選択 --</option>';
    orgClients.forEach(c => {
        const label = (c.displayName || c.email || c.id.substring(0, 8) + '...');
        html += `<option value="${c.id}">${escapeHtml(label)}</option>`;
    });
    sel.innerHTML = html;
}

// ========== Utility ==========
function escapeHtml(str) {
    if (!str) return '';
    return str.replace(/[&<>"']/g, (m) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[m]));
}
// ========== Calorie Calculations (r1, r2, scaleMap, scaleTemplateForSlot are in cq-databases.js) ==========
const TRAINING_CLASS = { SSS: 400, S: 250, A: 100, REFERENCE_LBM: 60 };
function getTrainingBonus(splitType, isRestDay, lbm) {
    if (isRestDay || !splitType || splitType === '休み') return 0;
    let cls;
    switch (splitType) {
        case '脚': case '全身': case '下半身': cls = TRAINING_CLASS.SSS; break;
        case '腕': case '腹筋・体幹': cls = TRAINING_CLASS.A; break;
        default: cls = TRAINING_CLASS.S; break;
    }
    return Math.round(cls * ((lbm || TRAINING_CLASS.REFERENCE_LBM) / TRAINING_CLASS.REFERENCE_LBM));
}

function calculateUserTargetCalories(profile, splitType, isRestDay) {
    const weight = profile.weight || 70;
    const bodyFatPct = profile.bodyFatPercentage || 15;
    const activityLevel = profile.activityLevel || 'MODERATE';
    const goal = profile.goal || 'MAINTAIN';
    const fatMass = weight * (bodyFatPct / 100);
    const lbm = weight - fatMass;
    const bmr = 370 + (21.6 * lbm) + (fatMass * 4.5);
    const activityMultipliers = { 'DESK_WORK': 1.2, 'STANDING_WORK': 1.4, 'PHYSICAL_LABOR': 1.6, 'SEDENTARY': 1.2, 'LIGHT': 1.375, 'MODERATE': 1.55, 'ACTIVE': 1.725, 'VERY_ACTIVE': 1.9 };
    const tdee = bmr * (activityMultipliers[activityLevel] || 1.55);
    const goalAdjustments = { 'LOSE_WEIGHT': -300, 'MAINTAIN': 0, 'GAIN_MUSCLE': 300 };
    const calorieAdjustment = goalAdjustments[goal] || 0;
    const trainingBonus = getTrainingBonus(splitType, isRestDay, lbm);
    return Math.round(tdee + calorieAdjustment + trainingBonus);
}

function calculateSlotTargetCalories(profile, slotKey, totalCalories) {
    const mealSlotConfig = profile.mealSlotConfig || {};
    const slots = mealSlotConfig.slots || [];
    const mealsPerDay = mealSlotConfig.mealsPerDay || profile.mealsPerDay || 3;
    let preWorkoutCals = 0, postWorkoutCals = 0;
    const prePFC = profile.preWorkoutMacros || {};
    const postPFC = profile.postWorkoutMacros || {};
    if (prePFC.protein || prePFC.fat || prePFC.carbs) preWorkoutCals = (prePFC.protein || 0) * 4 + (prePFC.fat || 0) * 9 + (prePFC.carbs || 0) * 4;
    if (postPFC.protein || postPFC.fat || postPFC.carbs) postWorkoutCals = (postPFC.protein || 0) * 4 + (postPFC.fat || 0) * 9 + (postPFC.carbs || 0) * 4;
    const slot = slots.find(s => s.slotNumber === parseInt(slotKey.replace('meal_', ''))) || {};
    const relTime = slot.relativeTime || '';
    if (relTime.startsWith('training-')) return preWorkoutCals || Math.round(totalCalories / mealsPerDay);
    if (relTime === 'training+0' || relTime.startsWith('training+')) return postWorkoutCals || Math.round(totalCalories / mealsPerDay);
    let trainingSlots = 0;
    slots.forEach(s => { const rt = s.relativeTime || ''; if (rt.startsWith('training-') || rt === 'training+0' || rt.startsWith('training+')) trainingSlots++; });
    const normalSlots = mealsPerDay - trainingSlots;
    const remainingCals = totalCalories - preWorkoutCals - postWorkoutCals;
    return normalSlots > 0 ? Math.round(remainingCals / normalSlots) : Math.round(totalCalories / mealsPerDay);
}

// ========== Timeline ==========
function parseTimeToMin(t) { if (!t) return null; const p = t.split(':'); if (p.length !== 2) return null; return parseInt(p[0]) * 60 + parseInt(p[1]); }
function minToTime(m) { const nm = ((m % 1440) + 1440) % 1440; return String(Math.floor(nm / 60)).padStart(2, '0') + ':' + String(nm % 60).padStart(2, '0'); }
function calcSlotTimes(mealsPerDay, trainingAfterMeal, wakeMin, trainingMin, sleepMin, absoluteTimes) {
    const result = {};
    for (let num = 1; num <= mealsPerDay; num++) {
        if (absoluteTimes && absoluteTimes[num]) { const parsed = parseTimeToMin(absoluteTimes[num]); if (parsed != null) { result[num] = parsed; continue; } }
        let time = null;
        if (num === 1) time = wakeMin;
        else if (trainingAfterMeal && num === trainingAfterMeal) time = trainingMin != null ? trainingMin - 120 : null;
        else if (trainingAfterMeal && num === trainingAfterMeal + 1) time = trainingMin;
        else if (trainingAfterMeal && num === trainingAfterMeal + 2) time = result[num - 1] != null ? result[num - 1] + 60 : null;
        else time = result[num - 1] != null ? result[num - 1] + 180 : null;
        if (time != null) result[num] = time;
    }
    return result;
}

// ========== Drawer (Glassmorphism) ==========
function openDrawer(mode, templateId) {
    drawerMode = mode;
    editingTemplateId = templateId || null;
    const drawer = document.getElementById('cq-drawer');
    const overlay = document.getElementById('cq-drawer-overlay');
    const title = document.getElementById('cq-drawer-title');
    const saveBtn = document.getElementById('cq-drawer-save-btn');
    if (mode === 'edit' && templateId) {
        const tpl = cachedTemplates.find(t => t.id === templateId);
        if (tpl) {
            title.textContent = 'テンプレート編集';
            saveBtn.textContent = '変更を保存';
            document.getElementById('cq-tpl-title').value = tpl.title;
            document.getElementById('cq-tpl-type').value = tpl.type;
            templateItems = (tpl.items || []).map(i => ({ ...i }));
            onTemplateTypeChange();
            renderTemplateItems();
        }
    } else {
        title.textContent = 'テンプレート作成';
        saveBtn.textContent = 'テンプレートを保存';
        document.getElementById('cq-tpl-title').value = '';
        document.getElementById('cq-tpl-type').value = 'MEAL';
        templateItems = [];
        onTemplateTypeChange();
        renderTemplateItems();
    }
    drawer.classList.add('open');
    overlay.classList.add('open');
}

function closeDrawer() {
    document.getElementById('cq-drawer').classList.remove('open');
    document.getElementById('cq-drawer-overlay').classList.remove('open');
}

document.addEventListener('keydown', (e) => { if (e.key === 'Escape') closeDrawer(); });

function handleDrawerSave() {
    if (drawerMode === 'edit' && editingTemplateId) {
        saveTemplateEditsFromDrawer(editingTemplateId);
    } else {
        createTemplate();
    }
}

// ========== Left Pane Filter ==========
function setLeftFilter(type) {
    leftFilterType = type;
    document.querySelectorAll('.cq-left-filter').forEach(btn => {
        btn.classList.toggle('cq-cat-active', btn.getAttribute('data-filter') === type);
    });
    renderTemplateList();
}

// ========== Template Type Change / Category Filter ==========
function isWorkoutMode() { return document.getElementById('cq-tpl-type').value === 'WORKOUT'; }

function onTemplateTypeChange() {
    const workout = isWorkoutMode();
    const catTabs = document.getElementById('cq-category-tabs');
    if (workout) {
        document.getElementById('cq-meal-inputs').classList.add('hidden');
        document.getElementById('cq-workout-inputs').classList.remove('hidden');
        catTabs.innerHTML = `<button onclick="setFoodCategory('all')" class="cq-cat-btn cq-cat-active" data-cat="all">すべて</button>` +
            Object.keys(EXERCISE_DATABASE).map(cat => `<button onclick="setFoodCategory('${cat}')" class="cq-cat-btn" data-cat="${cat}">${EXERCISE_EMOJI[cat]||''} ${cat}</button>`).join('');
        selectedExerciseCategory = '';
        updateExerciseFields();
    } else {
        document.getElementById('cq-meal-inputs').classList.remove('hidden');
        document.getElementById('cq-workout-inputs').classList.add('hidden');
        document.getElementById('cq-tpl-item-label').textContent = '食品名';
        catTabs.innerHTML = `<button onclick="setFoodCategory('all')" class="cq-cat-btn cq-cat-active" data-cat="all">すべて</button>` +
            Object.keys(FOOD_DATABASE).map(cat => `<button onclick="setFoodCategory('${cat}')" class="cq-cat-btn" data-cat="${cat}">${CATEGORY_EMOJI[cat]||''} ${cat.replace('豆類・ナッツ','豆類').replace('サプリメント','サプリ')}</button>`).join('') +
            (loadedUserCustomFoods.length > 0 ? `<button onclick="setFoodCategory('カスタム食品')" class="cq-cat-btn" data-cat="カスタム食品">⭐ カスタム</button>` : '');
        document.getElementById('cq-tpl-food-unit').innerHTML = ['g','個','ml','杯','枚','本','丁','粒'].map(u => `<option value="${u}">${u}</option>`).join('');
    }
    selectedFoodCategory = 'all';
    filterFoodList();
}

function setFoodCategory(cat) {
    selectedFoodCategory = cat;
    document.querySelectorAll('#cq-category-tabs .cq-cat-btn').forEach(btn => { btn.classList.toggle('cq-cat-active', btn.getAttribute('data-cat') === cat); });
    if (isWorkoutMode() && cat !== 'all') { selectedExerciseCategory = cat; updateExerciseFields(); }
    filterFoodList();
    getActiveDropdown().classList.remove('hidden');
}

function getItemDatabase() { return isWorkoutMode() ? EXERCISE_DATABASE : FOOD_DATABASE; }
function getItemEmoji() { return isWorkoutMode() ? EXERCISE_EMOJI : CATEGORY_EMOJI; }
function getFoodList() {
    const db2 = getItemDatabase();
    if (selectedFoodCategory === 'all') {
        const result = [];
        for (const [cat, items] of Object.entries(db2)) { items.forEach(f => result.push({ name: f, category: cat })); }
        if (!isWorkoutMode() && loadedUserCustomFoods.length > 0) { loadedUserCustomFoods.forEach(cf => result.push({ name: cf.name, category: 'カスタム食品' })); }
        return result;
    } else if (selectedFoodCategory === 'カスタム食品') { return loadedUserCustomFoods.map(cf => ({ name: cf.name, category: 'カスタム食品' })); }
    return (db2[selectedFoodCategory] || []).map(f => ({ name: f, category: selectedFoodCategory }));
}
function getActiveSearchInput() { return isWorkoutMode() ? document.getElementById('cq-tpl-exercise-search') : document.getElementById('cq-tpl-food-search'); }
function getActiveDropdown() { return isWorkoutMode() ? document.getElementById('cq-exercise-dropdown') : document.getElementById('cq-food-dropdown'); }
function showFoodDropdown() { filterFoodList(); getActiveDropdown().classList.remove('hidden'); }

function filterFoodList() {
    const searchInput = getActiveSearchInput();
    const dropdown = getActiveDropdown();
    const query = searchInput.value.trim().toLowerCase();
    const allFoods = getFoodList();
    const emojiMap = getItemEmoji();
    const filtered = query ? allFoods.filter(f => f.name.toLowerCase().includes(query)) : allFoods;
    if (filtered.length === 0) { dropdown.innerHTML = '<div class="px-3 py-2 text-gray-400 text-sm">該当なし</div>'; }
    else {
        let html = ''; let lastCat = '';
        filtered.slice(0, 80).forEach(f => {
            if (f.category !== lastCat) { lastCat = f.category; html += `<div class="px-3 py-1 text-xs font-bold text-gray-500 bg-gray-100 sticky top-0">${emojiMap[f.category]||''} ${f.category}</div>`; }
            let indicators = '';
            if (!isWorkoutMode()) {
                const nut = FOOD_NUTRIENTS_PER_100G[f.name];
                if (nut) {
                    if (nut.gi > 0) indicators += nut.gi >= 70 ? '<span class="text-[9px] bg-red-100 text-red-600 px-0.5 rounded ml-1">高GI</span>' : nut.gi >= 55 ? '<span class="text-[9px] bg-yellow-100 text-yellow-700 px-0.5 rounded ml-1">中GI</span>' : '<span class="text-[9px] bg-green-100 text-green-700 px-0.5 rounded ml-1">低GI</span>';
                    indicators += `<span class="text-[9px] text-gray-400 ml-1">P${r1(nut.protein)} F${r1(nut.fat)} C${r1(nut.carbs)}</span>`;
                }
            }
            html += `<div class="px-3 py-1.5 text-sm cursor-pointer hover:bg-teal-50" onmousedown="selectFood('${escapeHtml(f.name)}','${escapeHtml(f.category)}')">${escapeHtml(f.name)}${indicators}</div>`;
        });
        if (filtered.length > 80) html += '<div class="px-3 py-2 text-xs text-gray-400">...他 ' + (filtered.length - 80) + ' 件</div>';
        dropdown.innerHTML = html;
    }
    dropdown.classList.remove('hidden');
}

function selectFood(name, category) {
    if (isWorkoutMode()) {
        document.getElementById('cq-tpl-exercise-search').value = name;
        document.getElementById('cq-exercise-dropdown').classList.add('hidden');
        selectedExerciseCategory = category || '';
        updateExerciseFields();
    } else {
        document.getElementById('cq-tpl-food-search').value = name;
        document.getElementById('cq-food-dropdown').classList.add('hidden');
        const serving = FOOD_SERVING_SIZES[name];
        const unitSelect = document.getElementById('cq-tpl-food-unit');
        const amountInput = document.getElementById('cq-tpl-food-amount');
        if (serving) { const du = Object.keys(serving)[0]; unitSelect.value = du; amountInput.value = du === 'g' ? '100' : '1'; }
        else { unitSelect.value = 'g'; amountInput.value = '100'; }
        amountInput.focus();
    }
}

document.addEventListener('click', function(e) {
    ['cq-tpl-food-search', 'cq-food-dropdown', 'cq-tpl-exercise-search', 'cq-exercise-dropdown'].forEach((id, i) => {
        if (i % 2 === 0) return;
        const search = document.getElementById(['cq-tpl-food-search','cq-food-dropdown','cq-tpl-exercise-search','cq-exercise-dropdown'][i-1]);
        const dd = document.getElementById(id);
        if (search && dd && !search.contains(e.target) && !dd.contains(e.target)) dd.classList.add('hidden');
    });
});

// ========== Add Template Item ==========
function addTemplateItem() { if (isWorkoutMode()) addWorkoutTemplateItem(); else addMealTemplateItem(); }

function addMealTemplateItem() {
    const foodName = document.getElementById('cq-tpl-food-search').value.trim();
    const amount = parseFloat(document.getElementById('cq-tpl-food-amount').value);
    const unit = document.getElementById('cq-tpl-food-unit').value;
    if (!foodName) { alert('食品を選択してください'); return; }
    if (!amount || amount <= 0) { alert('量を入力してください'); return; }
    let grams = amount;
    if (unit !== 'g') { const serving = FOOD_SERVING_SIZES[foodName]; if (serving && serving[unit]) grams = amount * serving[unit]; }
    const ratio = grams / 100;
    let nutrients = FOOD_NUTRIENTS_PER_100G[foodName];
    if (!nutrients) { const cf = loadedUserCustomFoods.find(c => c.name === foodName); if (cf) nutrients = cf.nutrientsPer100g || cf; }
    let item = { foodName, amount, unit, calories: 0, protein: 0, fat: 0, carbs: 0, fiber: 0, solubleFiber: 0, insolubleFiber: 0, sugar: 0, saturatedFat: 0, monounsaturatedFat: 0, polyunsaturatedFat: 0, diaas: 0, gi: 0, vitamins: {}, minerals: {} };
    if (nutrients) {
        item.calories = Math.round(nutrients.calories * ratio); item.protein = r1(nutrients.protein * ratio); item.fat = r1(nutrients.fat * ratio); item.carbs = r1(nutrients.carbs * ratio);
        item.fiber = r1((nutrients.fiber||0)*ratio); item.solubleFiber = r1((nutrients.solubleFiber||0)*ratio); item.insolubleFiber = r1((nutrients.insolubleFiber||0)*ratio);
        item.sugar = r1((nutrients.sugar||0)*ratio); item.saturatedFat = r2((nutrients.saturatedFat||0)*ratio); item.monounsaturatedFat = r2((nutrients.monounsaturatedFat||0)*ratio); item.polyunsaturatedFat = r2((nutrients.polyunsaturatedFat||0)*ratio);
        item.diaas = nutrients.diaas||0; item.gi = nutrients.gi||0; item.vitamins = scaleMap(nutrients.vitamins||{}, ratio); item.minerals = scaleMap(nutrients.minerals||{}, ratio);
    }
    templateItems.push(item); renderTemplateItems();
    document.getElementById('cq-tpl-food-search').value = ''; document.getElementById('cq-tpl-food-amount').value = ''; document.getElementById('cq-tpl-food-search').focus();
}

function addWorkoutTemplateItem() {
    const foodName = document.getElementById('cq-tpl-exercise-search').value.trim();
    if (!foodName) { alert('種目を選択してください'); return; }
    const exType = getExerciseType(selectedExerciseCategory);
    let item = { foodName, amount: 0, unit: 'セット', calories: 0, protein: 0, fat: 0, carbs: 0, fiber: 0, solubleFiber: 0, insolubleFiber: 0, sugar: 0, saturatedFat: 0, monounsaturatedFat: 0, polyunsaturatedFat: 0, diaas: 0, gi: 0, vitamins: {}, minerals: {}, category: selectedExerciseCategory, sets: null, reps: null, weight: null, duration: null, distance: null, rmPercentMin: null, rmPercentMax: null };
    if (exType === 'strength') {
        const sets = parseInt(document.getElementById('cq-ex-sets').value)||0; const reps = parseInt(document.getElementById('cq-ex-reps').value)||0;
        const weight = parseFloat(document.getElementById('cq-ex-weight').value)||0; const duration = parseInt(document.getElementById('cq-ex-duration-strength').value)||0;
        const rmMin = parseFloat(document.getElementById('cq-ex-rm-min').value)||0; const rmMax = parseFloat(document.getElementById('cq-ex-rm-max').value)||0;
        if (sets <= 0 && reps <= 0) { alert('セット数または回数を入力してください'); return; }
        item.sets = sets; item.reps = reps; item.weight = weight; item.duration = duration; item.amount = sets; item.unit = 'セット';
        if (rmMin > 0 || rmMax > 0) { item.rmPercentMin = rmMin > 0 ? rmMin : null; item.rmPercentMax = rmMax > 0 ? rmMax : null; }
    } else if (exType === 'cardio') {
        const duration = parseInt(document.getElementById('cq-ex-duration-cardio').value)||0; const distance = parseFloat(document.getElementById('cq-ex-distance').value)||0;
        if (duration <= 0) { alert('時間（分）を入力してください'); return; }
        item.duration = duration; item.distance = distance > 0 ? distance : null; item.amount = duration; item.unit = '分';
    } else {
        const duration = parseInt(document.getElementById('cq-ex-duration-stretch').value)||0;
        if (duration <= 0) { alert('時間（分）を入力してください'); return; }
        item.duration = duration; item.amount = duration; item.unit = '分';
    }
    templateItems.push(item); renderTemplateItems();
    ['cq-tpl-exercise-search','cq-ex-sets','cq-ex-reps','cq-ex-weight','cq-ex-duration-strength','cq-ex-duration-cardio','cq-ex-distance','cq-ex-duration-stretch','cq-ex-rm-min','cq-ex-rm-max'].forEach(id => { document.getElementById(id).value = ''; });
    document.getElementById('cq-tpl-exercise-search').focus();
}

function removeTemplateItem(index) { templateItems.splice(index, 1); renderTemplateItems(); }

function formatWorkoutItemDisplay(item) {
    const parts = [];
    if (item.sets) parts.push(item.sets + 'セット');
    if (item.reps) parts.push(item.reps + '回');
    if (item.rmPercentMin || item.rmPercentMax) { parts.push('1RM' + (item.rmPercentMin||'') + '-' + (item.rmPercentMax||'') + '%'); }
    else if (item.weight) parts.push(item.weight + 'kg');
    if (item.duration) parts.push(item.duration + '分');
    if (item.distance) parts.push(item.distance + 'km');
    return parts.join(' x ');
}

function updateMealItemAmount(index, newAmount) {
    const item = templateItems[index];
    if (!item || newAmount <= 0) return;
    item.amount = newAmount;
    let grams = newAmount;
    if (item.unit !== 'g') { const serving = FOOD_SERVING_SIZES[item.foodName]; if (serving && serving[item.unit]) grams = newAmount * serving[item.unit]; }
    const ratio = grams / 100;
    let nutrients = FOOD_NUTRIENTS_PER_100G[item.foodName];
    if (!nutrients) { const cf = loadedUserCustomFoods.find(c => c.name === item.foodName); if (cf) nutrients = cf.nutrientsPer100g || cf; }
    if (nutrients) {
        item.calories = Math.round(nutrients.calories * ratio); item.protein = r1(nutrients.protein * ratio); item.fat = r1(nutrients.fat * ratio); item.carbs = r1(nutrients.carbs * ratio);
        item.fiber = r1((nutrients.fiber||0)*ratio); item.solubleFiber = r1((nutrients.solubleFiber||0)*ratio); item.insolubleFiber = r1((nutrients.insolubleFiber||0)*ratio);
        item.sugar = r1((nutrients.sugar||0)*ratio); item.saturatedFat = r2((nutrients.saturatedFat||0)*ratio); item.monounsaturatedFat = r2((nutrients.monounsaturatedFat||0)*ratio); item.polyunsaturatedFat = r2((nutrients.polyunsaturatedFat||0)*ratio);
        item.vitamins = scaleMap(nutrients.vitamins||{}, ratio); item.minerals = scaleMap(nutrients.minerals||{}, ratio);
    }
    renderTemplateItems();
}

function updateMealItemUnit(index, newUnit) {
    const item = templateItems[index];
    if (!item) return;
    item.unit = newUnit;
    updateMealItemAmount(index, item.amount);
}

function updateWorkoutItemField(index, field, value) {
    const item = templateItems[index];
    if (!item) return;
    const num = parseFloat(value) || 0;
    item[field] = num > 0 ? num : null;
    if (field === 'sets') item.amount = num;
    if (field === 'duration' && (CARDIO_CATEGORIES.includes(item.category) || STRETCH_CATEGORIES.includes(item.category))) item.amount = num;
    renderTemplateItems();
}

function renderTemplateItems() {
    const container = document.getElementById('cq-tpl-item-list');
    if (templateItems.length === 0) { container.innerHTML = '<span class="text-gray-400">アイテムを追加してください</span>'; return; }
    const unitOptions = ['g','個','ml','杯','枚','本','丁','粒'];
    let html = templateItems.map((item, i) => {
        const isEx = item.sets != null || item.duration != null || item.distance != null;
        let detailHtml;
        if (isEx) {
            const exType = getExerciseType(item.category || '');
            let fields = '';
            if (exType === 'strength') {
                fields = `<input type="number" value="${item.sets||''}" min="0" step="1" style="width:42px" class="border border-gray-300 rounded px-1 py-0.5 text-xs text-center" onchange="updateWorkoutItemField(${i},'sets',this.value)"><span class="text-[10px] text-gray-500">set</span>`;
                fields += `<input type="number" value="${item.reps||''}" min="0" step="1" style="width:42px" class="border border-gray-300 rounded px-1 py-0.5 text-xs text-center" onchange="updateWorkoutItemField(${i},'reps',this.value)"><span class="text-[10px] text-gray-500">rep</span>`;
                fields += `<input type="number" value="${item.weight||''}" min="0" step="0.5" style="width:50px" class="border border-gray-300 rounded px-1 py-0.5 text-xs text-center" onchange="updateWorkoutItemField(${i},'weight',this.value)"><span class="text-[10px] text-gray-500">kg</span>`;
                fields += `<input type="number" value="${item.duration||''}" min="0" step="1" style="width:42px" class="border border-gray-300 rounded px-1 py-0.5 text-xs text-center" onchange="updateWorkoutItemField(${i},'duration',this.value)"><span class="text-[10px] text-gray-500">分</span>`;
                fields += `<input type="number" value="${item.rmPercentMin||''}" min="0" max="100" step="5" style="width:42px" class="border border-orange-300 rounded px-1 py-0.5 text-xs text-center" onchange="updateWorkoutItemField(${i},'rmPercentMin',this.value)"><span class="text-[10px] text-gray-500">-</span>`;
                fields += `<input type="number" value="${item.rmPercentMax||''}" min="0" max="100" step="5" style="width:42px" class="border border-orange-300 rounded px-1 py-0.5 text-xs text-center" onchange="updateWorkoutItemField(${i},'rmPercentMax',this.value)"><span class="text-[10px] text-orange-500">%RM</span>`;
            } else if (exType === 'cardio') {
                fields = `<input type="number" value="${item.duration||''}" min="0" step="1" style="width:50px" class="border border-gray-300 rounded px-1 py-0.5 text-xs text-center" onchange="updateWorkoutItemField(${i},'duration',this.value)"><span class="text-[10px] text-gray-500">分</span>`;
                fields += `<input type="number" value="${item.distance||''}" min="0" step="0.1" style="width:50px" class="border border-gray-300 rounded px-1 py-0.5 text-xs text-center" onchange="updateWorkoutItemField(${i},'distance',this.value)"><span class="text-[10px] text-gray-500">km</span>`;
            } else {
                fields = `<input type="number" value="${item.duration||''}" min="0" step="1" style="width:50px" class="border border-gray-300 rounded px-1 py-0.5 text-xs text-center" onchange="updateWorkoutItemField(${i},'duration',this.value)"><span class="text-[10px] text-gray-500">分</span>`;
            }
            detailHtml = `<div class="flex items-center gap-1 flex-wrap">${fields}</div>`;
        } else {
            const unitOpts = unitOptions.map(u => `<option value="${u}"${u===item.unit?' selected':''}>${u}</option>`).join('');
            const macro = item.calories > 0 ? `<span class="text-[10px] text-gray-500 ml-1">(${item.calories}kcal P${item.protein} F${item.fat} C${item.carbs})</span>` : '';
            detailHtml = `<span class="inline-flex items-center gap-1"><input type="number" value="${item.amount}" min="0" step="0.1" style="width:60px" class="border border-gray-300 rounded px-1 py-0.5 text-xs text-center" onchange="updateMealItemAmount(${i},parseFloat(this.value)||0)"><select class="border border-gray-300 rounded px-1 py-0.5 text-xs" onchange="updateMealItemUnit(${i},this.value)">${unitOpts}</select>${macro}</span>`;
        }
        return `<div class="flex items-center justify-between py-1.5 px-2 rounded ${i%2===0?'bg-teal-50':''}"><div class="flex-1 min-w-0"><div class="text-sm font-bold truncate">${escapeHtml(item.foodName)}</div>${detailHtml}</div><button onclick="removeTemplateItem(${i})" class="text-red-400 hover:text-red-600 text-sm ml-2 flex-shrink-0">x</button></div>`;
    }).join('');
    const totals = templateItems.reduce((acc, i) => ({ calories: acc.calories+(i.calories||0), protein: acc.protein+(i.protein||0), fat: acc.fat+(i.fat||0), carbs: acc.carbs+(i.carbs||0), fiber: acc.fiber+(i.fiber||0) }), { calories:0, protein:0, fat:0, carbs:0, fiber:0 });
    html += `<div class="mt-2 pt-2 border-t border-gray-200 text-sm font-bold text-gray-700">合計: ${totals.calories}kcal | P${r1(totals.protein)}g F${r1(totals.fat)}g C${r1(totals.carbs)}g</div>`;
    container.innerHTML = html;
}

// ========== Template CRUD ==========
async function createTemplate() {
    const title = document.getElementById('cq-tpl-title').value.trim();
    const type = document.getElementById('cq-tpl-type').value;
    if (!title) { alert('テンプレート名を入力してください'); return; }
    if (templateItems.length === 0) { alert('アイテムを1つ以上追加してください'); return; }
    try {
        const totals = templateItems.reduce((acc, item) => {
            acc.calories += (item.calories||0); acc.protein += (item.protein||0); acc.fat += (item.fat||0); acc.carbs += (item.carbs||0); acc.fiber += (item.fiber||0);
            for (const k of Object.keys(item.vitamins||{})) acc.vitamins[k] = (acc.vitamins[k]||0) + (item.vitamins[k]||0);
            for (const k of Object.keys(item.minerals||{})) acc.minerals[k] = (acc.minerals[k]||0) + (item.minerals[k]||0);
            return acc;
        }, { calories:0, protein:0, fat:0, carbs:0, fiber:0, vitamins:{}, minerals:{} });
        const rv = {}; for (const [k,v] of Object.entries(totals.vitamins)) rv[k] = r2(v);
        const rm = {}; for (const [k,v] of Object.entries(totals.minerals)) rm[k] = r2(v);
        await db.collection('quest_templates').add({
            ownerId: auth.currentUser.uid, title, type, items: templateItems.map(i => ({...i})),
            totalMacros: { protein: r1(totals.protein), fat: r1(totals.fat), carbs: r1(totals.carbs), calories: totals.calories, fiber: r1(totals.fiber), vitamins: rv, minerals: rm },
            isActive: true, organizationName: currentTrainerOrg, createdAt: firebase.firestore.FieldValue.serverTimestamp()
        });
        document.getElementById('cq-tpl-message').innerHTML = '<span class="text-green-600">保存しました</span>';
        document.getElementById('cq-tpl-title').value = ''; templateItems = []; renderTemplateItems();
        await loadTemplates();
        setTimeout(closeDrawer, 800);
    } catch (e) { document.getElementById('cq-tpl-message').innerHTML = '<span class="text-red-500">エラー: ' + e.message + '</span>'; }
}

async function saveTemplateEditsFromDrawer(templateId) {
    const title = document.getElementById('cq-tpl-title').value.trim();
    if (!title) { alert('テンプレート名を入力してください'); return; }
    try {
        const totals = templateItems.reduce((acc, item) => {
            acc.calories += (item.calories||0); acc.protein += (item.protein||0); acc.fat += (item.fat||0); acc.carbs += (item.carbs||0); acc.fiber += (item.fiber||0);
            for (const k of Object.keys(item.vitamins||{})) acc.vitamins[k] = (acc.vitamins[k]||0) + (item.vitamins[k]||0);
            for (const k of Object.keys(item.minerals||{})) acc.minerals[k] = (acc.minerals[k]||0) + (item.minerals[k]||0);
            return acc;
        }, { calories:0, protein:0, fat:0, carbs:0, fiber:0, vitamins:{}, minerals:{} });
        const rv = {}; for (const [k,v] of Object.entries(totals.vitamins)) rv[k] = r2(v);
        const rm = {}; for (const [k,v] of Object.entries(totals.minerals)) rm[k] = r2(v);
        await db.collection('quest_templates').doc(templateId).update({
            title, items: templateItems.map(i => ({...i})),
            totalMacros: { protein: r1(totals.protein), fat: r1(totals.fat), carbs: r1(totals.carbs), calories: totals.calories, fiber: r1(totals.fiber), vitamins: rv, minerals: rm }
        });
        document.getElementById('cq-tpl-message').innerHTML = '<span class="text-green-600">保存しました</span>';
        await loadTemplates();
        setTimeout(closeDrawer, 800);
    } catch (e) { document.getElementById('cq-tpl-message').innerHTML = '<span class="text-red-500">エラー: ' + e.message + '</span>'; }
}

async function deleteTemplate(templateId) {
    if (!confirm('このテンプレートを削除しますか？')) return;
    try { await db.collection('quest_templates').doc(templateId).update({ isActive: false }); await loadTemplates(); } catch (e) { alert('エラー: ' + e.message); }
}

async function loadTemplates() {
    // 2クエリ: グローバル(organizationName==null) + 自社org
    try {
        const [globalSnap, orgSnap] = await Promise.all([
            db.collection('quest_templates').where('isActive', '==', true).where('organizationName', '==', null).get(),
            db.collection('quest_templates').where('isActive', '==', true).where('organizationName', '==', currentTrainerOrg).get()
        ]);
        const templates = [];
        const seen = new Set();
        globalSnap.forEach(doc => { if (!seen.has(doc.id)) { seen.add(doc.id); templates.push({ id: doc.id, ...doc.data() }); } });
        orgSnap.forEach(doc => { if (!seen.has(doc.id)) { seen.add(doc.id); templates.push({ id: doc.id, ...doc.data() }); } });
        templates.sort((a, b) => { const aT = a.createdAt?.toMillis ? a.createdAt.toMillis() : 0; const bT = b.createdAt?.toMillis ? b.createdAt.toMillis() : 0; return bT - aT; });
        cachedTemplates = templates;
        document.getElementById('cq-template-count').textContent = templates.length;
        renderTemplateList();
        refreshInlineTemplateDropdowns();
    } catch (e) { document.getElementById('cq-template-list').innerHTML = '<p class="text-red-500 text-sm">エラー: ' + e.message + '</p>'; }
}

// ========== Left Pane Template List ==========
function renderTemplateList() {
    const searchText = (document.getElementById('cq-tpl-search')?.value || '').trim().toLowerCase();
    const sortKey = document.getElementById('cq-tpl-sort')?.value || 'newest';
    let filtered = cachedTemplates.filter(t => {
        if (leftFilterType !== 'ALL' && t.type !== leftFilterType) return false;
        if (searchText && !t.title.toLowerCase().includes(searchText)) return false;
        return true;
    });
    filtered.sort((a, b) => {
        switch (sortKey) {
            case 'newest': return (b.createdAt?.toMillis?b.createdAt.toMillis():0) - (a.createdAt?.toMillis?a.createdAt.toMillis():0);
            case 'oldest': return (a.createdAt?.toMillis?a.createdAt.toMillis():0) - (b.createdAt?.toMillis?b.createdAt.toMillis():0);
            case 'name-asc': return a.title.localeCompare(b.title, 'ja');
            case 'cal-desc': return (b.totalMacros?.calories||0) - (a.totalMacros?.calories||0);
            case 'cal-asc': return (a.totalMacros?.calories||0) - (b.totalMacros?.calories||0);
            default: return 0;
        }
    });
    if (filtered.length === 0) { document.getElementById('cq-template-list').innerHTML = '<p class="text-gray-400 text-sm py-4 text-center">テンプレートなし</p>'; return; }
    let html = '';
    filtered.forEach(t => {
        const typeClass = t.type === 'MEAL' ? 'tpl-card-meal' : 'tpl-card-workout';
        const typeBadge = t.type === 'MEAL' ? '<span class="text-[9px] bg-green-100 text-green-700 px-1 rounded">MEAL</span>' : '<span class="text-[9px] bg-blue-100 text-blue-700 px-1 rounded">WORKOUT</span>';
        const orgBadge = t.organizationName ? `<span class="text-[9px] bg-teal-100 text-teal-700 px-1 rounded">${escapeHtml(t.organizationName)}</span>` : '<span class="text-[9px] bg-gray-100 text-gray-500 px-1 rounded">共通</span>';
        const m = t.totalMacros || {};
        const pfcLine = m.calories ? `<div class="text-[10px] font-mono text-gray-500 mt-1">${Math.round(m.calories)}kcal P${r1(m.protein||0)} F${r1(m.fat||0)} C${r1(m.carbs||0)}</div>` : '';
        const items = (t.items||[]).slice(0, 3).map(i => escapeHtml(i.foodName)).join(', ');
        const moreCount = (t.items||[]).length > 3 ? ` +${(t.items||[]).length - 3}` : '';
        const canEdit = t.organizationName === currentTrainerOrg;
        const editBtn = canEdit ? `<button onclick="event.stopPropagation();deleteTemplate('${t.id}')" class="text-[10px] text-red-400 hover:text-red-600">削除</button>` : '';
        html += `<div class="tpl-card ${typeClass}" onclick="openDrawer('edit','${t.id}')">
            <div class="flex items-center justify-between"><span class="font-bold text-sm truncate">${escapeHtml(t.title)}</span><div class="flex gap-1">${typeBadge} ${orgBadge}</div></div>
            ${pfcLine}
            <div class="text-[10px] text-gray-400 mt-1 truncate">${items}${moreCount}</div>
            ${editBtn ? `<div class="flex gap-1 mt-2">${editBtn}</div>` : ''}
        </div>`;
    });
    document.getElementById('cq-template-list').innerHTML = html;
}

function refreshInlineTemplateDropdowns() {
    document.querySelectorAll('[id^="cq-bulk-tpl-"]').forEach(sel => {
        const slotKey = sel.id.replace('cq-bulk-tpl-', '');
        const slotType = slotKey === 'workout' ? 'workout' : 'meal';
        const currentVal = sel.value;
        let opts = '<option value="">-- 未選択 --</option>';
        cachedTemplates.forEach(t => {
            if (slotType === 'workout' && t.type !== 'WORKOUT') return;
            if (slotType === 'meal' && t.type !== 'MEAL') return;
            const m = t.totalMacros || {};
            const pfcLabel = m.calories ? ` (${Math.round(m.calories)}kcal)` : '';
            opts += `<option value="${t.id}"${t.id===currentVal?' selected':''}>${escapeHtml(t.title)}${pfcLabel}</option>`;
        });
        sel.innerHTML = opts;
    });
}

// ========== PFC Real-time Visualization ==========
function renderPfcBars(profile, existingAssignments, targetCalories) {
    const container = document.getElementById('pfc-bars-container');
    document.getElementById('pfc-target-label').textContent = `目標: ${targetCalories}kcal/日`;
    let totalCal = 0, totalP = 0, totalF = 0, totalC = 0;
    Object.values(existingAssignments).forEach(a => {
        const m = a.macros || {};
        totalCal += (m.calories || 0); totalP += (m.protein || 0); totalF += (m.fat || 0); totalC += (m.carbs || 0);
    });
    const pRatio = (profile.proteinRatioPercent || 35) / 100;
    const fRatio = (profile.fatRatioPercent || 15) / 100;
    const cRatio = (profile.carbRatioPercent || 50) / 100;
    const targetP = targetCalories * pRatio / 4;
    const targetF = targetCalories * fRatio / 9;
    const targetC = targetCalories * cRatio / 4;
    function getBarColor(pct) {
        if (pct >= 95 && pct <= 105) return '#0d9488';
        if (pct < 70) return '#ef4444';
        if (pct < 95) return '#f97316';
        return '#8b5cf6';
    }
    function barHtml(label, actual, target, unit) {
        const pct = target > 0 ? (actual / target * 100) : 0;
        const clampedPct = Math.min(pct, 100);
        const color = getBarColor(pct);
        const overMarker = pct > 105 ? `<span class="absolute right-1 top-0 text-[9px] text-purple-700 font-bold">${Math.round(pct)}%</span>` : '';
        return `<div class="pfc-bar-bg relative"><span class="pfc-bar-label">${label}</span><div class="pfc-bar-fill" style="width:${clampedPct}%;background:${color}"></div><span class="pfc-bar-value">${Math.round(actual)}/${Math.round(target)}${unit}</span>${overMarker}</div>`;
    }
    container.innerHTML = barHtml('Cal', totalCal, targetCalories, 'kcal') + barHtml('P', totalP, targetP, 'g') + barHtml('F', totalF, targetF, 'g') + barHtml('C', totalC, targetC, 'g');
}

// ========== User Slots (Main Load) ==========
async function loadUserSlots() {
    const uid = document.getElementById('cq-client-dropdown').value;
    if (!uid) { alert('クライアントを選択してください'); return; }
    const container = document.getElementById('cq-assign-slot-container');
    const infoEl = document.getElementById('cq-assign-user-info');
    container.innerHTML = '<span class="text-gray-400 text-sm">読み込み中...</span>';
    try {
        const userDoc = await db.collection('users').doc(uid).get();
        if (!userDoc.exists) { container.innerHTML = '<span class="text-red-500 text-sm">ユーザーが見つかりません</span>'; return; }
        const userData = userDoc.data();
        const displayName = userData.displayName || userData.email || uid;
        const profile = userData.profile || {};
        const mealSlotConfig = profile.mealSlotConfig || {};
        const mealsPerDay = mealSlotConfig.mealsPerDay || profile.mealsPerDay || 5;
        const slots = mealSlotConfig.slots || [];
        loadedUserProfile = profile; loadedUserUid = uid;
        const targetCalories = calculateUserTargetCalories(profile);
        infoEl.innerHTML = `<strong>${escapeHtml(displayName)}</strong> | 食事${mealsPerDay}回 | 目標 <strong>${targetCalories}kcal/日</strong>`;

        document.getElementById('cq-bento-container').classList.remove('hidden');

        // Profile editor values
        document.getElementById('cq-prof-wake').value = profile.wakeUpTime || '07:00';
        document.getElementById('cq-prof-sleep').value = profile.sleepTime || '23:00';
        document.getElementById('cq-prof-meals').value = mealsPerDay;
        document.getElementById('cq-prof-training-time').value = profile.trainingTime || '17:00';
        document.getElementById('cq-prof-training-after').value = profile.trainingAfterMeal || '';
        document.getElementById('cq-prof-training-dur').value = profile.trainingDuration || 120;
        document.getElementById('cq-prof-style').value = profile.trainingStyle || 'PUMP';
        toggleTrainingFields();
        document.getElementById('cq-prof-nickname').value = profile.nickname || '';
        document.getElementById('cq-prof-age').value = profile.age || '';
        document.getElementById('cq-prof-gender').value = profile.gender || 'MALE';
        document.getElementById('cq-prof-height').value = profile.height || '';
        document.getElementById('cq-prof-weight').value = profile.weight || '';
        document.getElementById('cq-prof-bodyfat').value = profile.bodyFatPercentage || '';
        document.getElementById('cq-prof-ideal-weight').value = profile.idealWeight || '';
        document.getElementById('cq-prof-ideal-bodyfat').value = profile.idealBodyFatPercentage || '';
        document.getElementById('cq-prof-goal').value = profile.goal || 'MAINTAIN';
        document.getElementById('cq-prof-activity').value = profile.activityLevel || 'DESK_WORK';
        document.getElementById('cq-prof-cal-adjust').value = profile.calorieAdjustment || 0;
        document.getElementById('cq-prof-budget').value = profile.budgetTier || 2;
        document.getElementById('cq-prof-prot-ratio').value = profile.proteinRatioPercent || 35;
        document.getElementById('cq-prof-fat-ratio').value = profile.fatRatioPercent || 15;
        document.getElementById('cq-prof-carb-ratio').value = profile.carbRatioPercent || 50;
        document.getElementById('cq-prof-pre-p').value = profile.preWorkoutProtein ?? 20;
        document.getElementById('cq-prof-pre-f').value = profile.preWorkoutFat ?? 1;
        document.getElementById('cq-prof-pre-c').value = profile.preWorkoutCarbs ?? 25;
        document.getElementById('cq-prof-post-p').value = profile.postWorkoutProtein ?? 20;
        document.getElementById('cq-prof-post-f').value = profile.postWorkoutFat ?? 1;
        document.getElementById('cq-prof-post-c').value = profile.postWorkoutCarbs ?? 25;
        document.getElementById('cq-prof-prot-sources').value = (profile.preferredProteinSources || []).join(', ');
        document.getElementById('cq-prof-carb-sources').value = (profile.preferredCarbSources || []).join(', ');
        document.getElementById('cq-prof-fat-sources').value = (profile.preferredFatSources || []).join(', ');
        document.getElementById('cq-prof-avoid-foods').value = (profile.avoidFoods || []).join(', ');
        document.getElementById('cq-prof-allergies').value = (profile.allergies || []).join(', ');
        document.getElementById('cq-prof-fav-foods').value = profile.favoriteFoods || '';
        document.getElementById('cq-prof-ng-foods').value = profile.ngFoods || '';

        document.getElementById('cq-user-panels').classList.remove('hidden');
        renderUserProfilePanel(profile, userData);
        renderUserRoutinePanel(uid, profile);
        renderUserCustomItemsPanel(uid);
        loadConditionRecords();

        // Timeline
        const absoluteTimes = {};
        slots.forEach(s => { if (s.absoluteTime) absoluteTimes[s.slotNumber] = s.absoluteTime; });
        const wakeMin = parseTimeToMin(profile.wakeUpTime || '07:00');
        const trainingMin = parseTimeToMin(profile.trainingTime || '17:00');
        const sleepMin = parseTimeToMin(profile.sleepTime || '23:00');
        const trainingAfterMeal = profile.trainingAfterMeal || null;
        const slotTimes = calcSlotTimes(mealsPerDay, trainingAfterMeal, wakeMin, trainingMin, sleepMin, absoluteTimes);
        renderSlotTimeline(mealsPerDay, slotTimes, absoluteTimes);

        // Existing assignments
        const isPersistent = document.getElementById('cq-assign-persistent').checked;
        const selectedDate = isPersistent ? '_default' : (document.getElementById('cq-assign-date').value || new Date().toISOString().split('T')[0]);
        let existingAssignments = {};
        try {
            const fetches = [db.collection('users').doc(uid).collection('custom_quests').doc('_default').get()];
            if (!isPersistent && selectedDate !== '_default') fetches.push(db.collection('users').doc(uid).collection('custom_quests').doc(selectedDate).get());
            const results = await Promise.all(fetches);
            if (results[0].exists) { const ds = results[0].data().slots || {}; Object.entries(ds).forEach(([k, v]) => { existingAssignments[k] = { title: v.title, macros: v.totalMacros || {}, templateId: v.templateId || '', source: '永続' }; }); }
            if (results[1] && results[1].exists) { const ds = results[1].data().slots || {}; Object.entries(ds).forEach(([k, v]) => { existingAssignments[k] = { title: v.title, macros: v.totalMacros || {}, templateId: v.templateId || '', source: selectedDate }; }); }
        } catch (e) { console.warn('割当取得エラー:', e); }

        renderPfcBars(profile, existingAssignments, targetCalories);

        function buildTplOpts(slotType, selectedId) {
            let opts = '<option value="">-- 未選択 --</option>';
            cachedTemplates.forEach(t => {
                if (slotType === 'workout' && t.type !== 'WORKOUT') return;
                if (slotType === 'meal' && t.type !== 'MEAL') return;
                const m = t.totalMacros || {};
                const pfcLabel = m.calories ? ` (${Math.round(m.calories)}kcal)` : '';
                opts += `<option value="${t.id}"${t.id===selectedId?' selected':''}>${escapeHtml(t.title)}${pfcLabel}</option>`;
            });
            return opts;
        }

        let html = '<div class="space-y-2">';
        for (let i = 1; i <= mealsPerDay; i++) {
            const slot = slots.find(s => s.slotNumber === i) || {};
            const relTime = slot.relativeTime || '';
            const timeStr = slotTimes[i] != null ? minToTime(slotTimes[i]) : '--:--';
            const slotKey = 'meal_' + i;
            const slotTargetCals = calculateSlotTargetCalories(profile, slotKey, targetCalories);
            const assign = existingAssignments[slotKey];
            let badge = '';
            if (relTime.startsWith('training-')) badge = '<span class="text-[9px] bg-orange-100 text-orange-700 px-1 rounded">トレ前</span>';
            else if (relTime === 'training+0') badge = '<span class="text-[9px] bg-red-100 text-red-700 px-1 rounded">トレ直後</span>';
            else if (relTime.startsWith('training+')) badge = '<span class="text-[9px] bg-orange-100 text-orange-700 px-1 rounded">トレ後</span>';
            const assignInfo = assign ? `<span class="text-[9px] text-green-700 font-bold">✓${escapeHtml(assign.title)}</span>` : '';
            html += `<div class="flex items-center gap-2">
                <div class="min-w-[90px] text-center"><span class="font-bold text-sm">食事${i}</span><br><span class="text-[10px] text-teal-600">${timeStr}</span> ${badge}<br><span class="text-[9px] text-gray-400">${slotTargetCals}kcal</span>${assignInfo ? '<br>'+assignInfo : ''}</div>
                <select id="cq-bulk-tpl-${slotKey}" class="flex-1 border border-gray-300 rounded-lg px-2 py-1.5 text-sm" onchange="onSlotTemplateChange()">${buildTplOpts('meal', assign?.templateId||'')}</select>
            </div>`;
        }
        const workoutAssign = existingAssignments['workout'];
        html += `<div class="flex items-center gap-2">
            <div class="min-w-[90px] text-center"><span class="font-bold text-sm">運動</span><br><span class="text-[10px] text-teal-600">${profile.trainingTime||'17:00'}</span>${workoutAssign?'<br><span class="text-[9px] text-green-700 font-bold">✓'+escapeHtml(workoutAssign.title)+'</span>':''}</div>
            <select id="cq-bulk-tpl-workout" class="flex-1 border border-gray-300 rounded-lg px-2 py-1.5 text-sm" onchange="onSlotTemplateChange()">${buildTplOpts('workout', workoutAssign?.templateId||'')}</select>
        </div>`;
        html += '</div>';
        container.innerHTML = html;
        await loadUserAssignments();
    } catch (e) { container.innerHTML = '<span class="text-red-500 text-sm">エラー: ' + e.message + '</span>'; console.error(e); }
}

function onSlotTemplateChange() {
    if (!loadedUserProfile || !loadedUserUid) return;
    const assignments = {};
    document.querySelectorAll('[id^="cq-bulk-tpl-"]').forEach(sel => {
        const slotKey = sel.id.replace('cq-bulk-tpl-', '');
        const tplId = sel.value;
        if (tplId) {
            const tpl = cachedTemplates.find(t => t.id === tplId);
            if (tpl) assignments[slotKey] = { macros: tpl.totalMacros || {} };
        }
    });
    const targetCalories = calculateUserTargetCalories(loadedUserProfile);
    renderPfcBars(loadedUserProfile, assignments, targetCalories);
}

function renderSlotTimeline(mealsPerDay, slotTimes, absoluteTimes) {
    const container = document.getElementById('cq-slot-timeline');
    let html = '';
    for (let i = 1; i <= mealsPerDay; i++) {
        const calcTime = slotTimes[i] != null ? minToTime(slotTimes[i]) : '';
        const absTime = absoluteTimes[i] || '';
        html += `<div class="flex flex-col items-center gap-0.5"><span class="text-[10px] font-bold">食事${i}</span><input type="time" id="cq-slot-time-${i}" value="${absTime||calcTime}" class="border ${absTime?'border-teal-400 bg-teal-50':'border-gray-300'} rounded px-1 py-0.5 text-xs w-20 text-center" onchange="onSlotTimeChange(${i})"><span class="text-[9px] text-gray-400">${absTime?'手動':'自動'}</span></div>`;
    }
    container.innerHTML = html;
}

function onSlotTimeChange(slotNum) {
    const input = document.getElementById('cq-slot-time-' + slotNum);
    if (input.value) { input.classList.add('border-teal-400', 'bg-teal-50'); input.classList.remove('border-gray-300'); }
}

// ========== Assign All Slots ==========
async function assignAllSlots() {
    const uid = document.getElementById('cq-client-dropdown').value;
    const isPersistent = document.getElementById('cq-assign-persistent').checked;
    const date = isPersistent ? '_default' : document.getElementById('cq-assign-date').value;
    const msgEl = document.getElementById('cq-bulk-assign-message');
    if (!uid) { alert('クライアントを選択してください'); return; }
    if (!isPersistent && !date) { alert('日付を指定してください'); return; }
    const slotSelections = [];
    document.querySelectorAll('[id^="cq-bulk-tpl-"]').forEach(sel => { const sk = sel.id.replace('cq-bulk-tpl-', ''); if (sel.value) slotSelections.push({ slotKey: sk, templateId: sel.value }); });
    if (slotSelections.length === 0) { alert('少なくとも1つのスロットでテンプレートを選択してください'); return; }
    msgEl.innerHTML = '<span class="text-gray-500">保存中...</span>';
    try {
        const docRef = db.collection('users').doc(uid).collection('custom_quests').doc(date);
        const existing = await docRef.get();
        const updatePayload = {};
        for (const { slotKey, templateId } of slotSelections) {
            const tplDoc = await db.collection('quest_templates').doc(templateId).get();
            if (!tplDoc.exists) continue;
            const tpl = tplDoc.data();
            updatePayload[`slots.${slotKey}`] = { templateId, title: tpl.title, type: tpl.type, items: tpl.items, totalMacros: tpl.totalMacros || { protein: 0, fat: 0, carbs: 0, calories: 0, fiber: 0, vitamins: {}, minerals: {} } };
        }
        if (existing.exists) { await docRef.update(updatePayload); }
        else { const slotsObj = {}; Object.entries(updatePayload).forEach(([k,v]) => { slotsObj[k.replace('slots.','')] = v; }); await docRef.set({ date, assignedBy: auth.currentUser.uid, isCustom: true, slots: slotsObj, createdAt: firebase.firestore.FieldValue.serverTimestamp() }); }
        msgEl.innerHTML = `<span class="text-green-600">${slotSelections.length}スロット保存完了</span>`;
        await loadUserSlots();
    } catch (e) { msgEl.innerHTML = '<span class="text-red-500">エラー: ' + e.message + '</span>'; }
}

// ========== Assignment List ==========
async function loadUserAssignments() {
    const uid = document.getElementById('cq-client-dropdown').value;
    if (!uid) return;
    const listEl = document.getElementById('cq-assign-list');
    const titleEl = document.getElementById('cq-assign-list-title');
    listEl.innerHTML = '<span class="text-gray-400">読み込み中...</span>';
    try {
        const snapshot = await db.collection('users').doc(uid).collection('custom_quests').orderBy('date', 'desc').limit(30).get();
        if (snapshot.empty) { listEl.innerHTML = '<span class="text-gray-400">割当なし</span>'; titleEl.textContent = '割当履歴(0)'; return; }
        titleEl.textContent = `割当履歴(${snapshot.size})`;
        let html = '';
        snapshot.forEach(doc => {
            const data = doc.data(); const date = data.date || doc.id; const slots2 = data.slots || {};
            const isPers = doc.id === '_default';
            const slotDetails = Object.keys(slots2).map(k => { const s = slots2[k]; return `${k==='workout'?'運動':k.replace('meal_','食事')}: ${escapeHtml(s.title||'?')}`; }).join(' | ');
            html += `<div class="p-2 border ${isPers?'border-teal-400 bg-teal-50':'border-gray-200'} rounded-lg mb-1"><div class="flex items-center justify-between"><span class="font-bold">${isPers?'永続':date}</span><button onclick="deleteAssignment('${uid}','${doc.id}')" class="text-[10px] text-red-400 hover:text-red-600">削除</button></div><div class="text-[10px] text-gray-600 mt-0.5">${slotDetails}</div></div>`;
        });
        listEl.innerHTML = html;
    } catch (e) { listEl.innerHTML = '<span class="text-red-500 text-sm">エラー: ' + e.message + '</span>'; }
}

async function deleteAssignment(uid, docId) {
    if (!confirm(`${docId === '_default' ? '永続クエスト' : docId} を削除しますか？`)) return;
    try { await db.collection('users').doc(uid).collection('custom_quests').doc(docId).delete(); await loadUserAssignments(); } catch (e) { alert('エラー: ' + e.message); }
}

// ========== Profile ==========
function switchProfileMode(mode) {
    const viewEl = document.getElementById('cq-profile-view');
    const editEl = document.getElementById('cq-profile-edit-container');
    document.querySelectorAll('.prof-mode-btn').forEach(b => {
        b.classList.remove('bg-teal-100', 'text-teal-700');
        b.classList.add('text-gray-500');
    });
    const activeBtn = document.getElementById('prof-mode-' + mode);
    if (activeBtn) {
        activeBtn.classList.add('bg-teal-100', 'text-teal-700');
        activeBtn.classList.remove('text-gray-500');
    }
    if (mode === 'view') {
        viewEl.classList.remove('hidden');
        editEl.classList.add('hidden');
    } else {
        viewEl.classList.add('hidden');
        editEl.classList.remove('hidden');
        document.querySelectorAll('.cq-prof-panel').forEach(p => p.classList.add('hidden'));
        const panel = document.getElementById('cq-panel-' + mode);
        if (panel) panel.classList.remove('hidden');
    }
}

function toggleTrainingFields() {
    const val = document.getElementById('cq-prof-training-after').value;
    document.getElementById('cq-training-fields').classList.toggle('hidden', !val);
}

function onMealsPerDayChange() {
    const mealsPerDay = parseInt(document.getElementById('cq-prof-meals').value) || 5;
    const wakeMin = parseTimeToMin(document.getElementById('cq-prof-wake').value) || 420;
    const trainingMin = parseTimeToMin(document.getElementById('cq-prof-training-time').value);
    const sleepMin = parseTimeToMin(document.getElementById('cq-prof-sleep').value) || 1380;
    const trainingAfterMeal = parseInt(document.getElementById('cq-prof-training-after').value) || null;
    const slotTimes = calcSlotTimes(mealsPerDay, trainingAfterMeal, wakeMin, trainingMin, sleepMin, {});
    renderSlotTimeline(mealsPerDay, slotTimes, {});
}

function resetAllProfileDefaults() {
    document.getElementById('cq-prof-wake').value = '07:00'; document.getElementById('cq-prof-sleep').value = '23:00';
    document.getElementById('cq-prof-meals').value = '5'; document.getElementById('cq-prof-training-after').value = '';
    document.getElementById('cq-prof-training-time').value = '17:00'; document.getElementById('cq-prof-training-dur').value = '120';
    document.getElementById('cq-prof-style').value = 'PUMP'; document.getElementById('cq-prof-nickname').value = '';
    document.getElementById('cq-prof-age').value = ''; document.getElementById('cq-prof-gender').value = 'MALE';
    document.getElementById('cq-prof-height').value = ''; document.getElementById('cq-prof-weight').value = '';
    document.getElementById('cq-prof-bodyfat').value = '';
    document.getElementById('cq-prof-ideal-weight').value = ''; document.getElementById('cq-prof-ideal-bodyfat').value = '';
    document.getElementById('cq-prof-goal').value = 'MAINTAIN'; document.getElementById('cq-prof-activity').value = 'DESK_WORK';
    document.getElementById('cq-prof-cal-adjust').value = '0'; document.getElementById('cq-prof-budget').value = '2';
    document.getElementById('cq-prof-prot-ratio').value = '35'; document.getElementById('cq-prof-fat-ratio').value = '15';
    document.getElementById('cq-prof-carb-ratio').value = '50';
    document.getElementById('cq-prof-pre-p').value = '20'; document.getElementById('cq-prof-pre-f').value = '1'; document.getElementById('cq-prof-pre-c').value = '25';
    document.getElementById('cq-prof-post-p').value = '20'; document.getElementById('cq-prof-post-f').value = '1'; document.getElementById('cq-prof-post-c').value = '25';
    document.getElementById('cq-prof-prot-sources').value = ''; document.getElementById('cq-prof-carb-sources').value = '';
    document.getElementById('cq-prof-fat-sources').value = ''; document.getElementById('cq-prof-avoid-foods').value = '';
    document.getElementById('cq-prof-allergies').value = ''; document.getElementById('cq-prof-fav-foods').value = ''; document.getElementById('cq-prof-ng-foods').value = '';
    toggleTrainingFields(); onMealsPerDayChange();
}

async function saveUserProfile() {
    const uid = loadedUserUid;
    if (!uid) { alert('ユーザーが選択されていません'); return; }
    const msgEl = document.getElementById('cq-profile-save-msg');
    msgEl.classList.remove('hidden'); msgEl.innerHTML = '<span class="text-gray-500">保存中...</span>';
    try {
        const mealsPerDay = parseInt(document.getElementById('cq-prof-meals').value) || 5;
        const wakeUpTime = document.getElementById('cq-prof-wake').value || '07:00';
        const sleepTime = document.getElementById('cq-prof-sleep').value || '23:00';
        const trainingTime = document.getElementById('cq-prof-training-time').value || '17:00';
        const tav = document.getElementById('cq-prof-training-after').value;
        const trainingAfterMeal = tav ? parseInt(tav) : null;
        const trainingDuration = parseInt(document.getElementById('cq-prof-training-dur').value) || 120;
        const trainingStyle = document.getElementById('cq-prof-style').value || 'PUMP';
        const slotsData = [];
        const wakeMin = parseTimeToMin(wakeUpTime); const trainingMin = parseTimeToMin(trainingTime); const sleepMin = parseTimeToMin(sleepTime);
        for (let num = 1; num <= mealsPerDay; num++) {
            let relativeTime = null;
            if (num === 1) relativeTime = 'wake+0';
            else if (trainingAfterMeal && num === trainingAfterMeal) relativeTime = 'training-120';
            else if (trainingAfterMeal && num === trainingAfterMeal + 1) relativeTime = 'training+0';
            else if (trainingAfterMeal && num === trainingAfterMeal + 2) relativeTime = `meal${num-1}+60`;
            else relativeTime = `meal${num-1}+180`;
            const timeInput = document.getElementById('cq-slot-time-' + num);
            const inputVal = timeInput ? timeInput.value : '';
            const autoTimes = calcSlotTimes(mealsPerDay, trainingAfterMeal, wakeMin, trainingMin, sleepMin, {});
            const autoTime = autoTimes[num] != null ? minToTime(autoTimes[num]) : '';
            const absoluteTime = (inputVal && inputVal !== autoTime) ? inputVal : null;
            const slotObj = { slotNumber: num, relativeTime };
            if (absoluteTime) slotObj.absoluteTime = absoluteTime;
            slotsData.push(slotObj);
        }
        const nickname = document.getElementById('cq-prof-nickname').value.trim() || null;
        const age = parseInt(document.getElementById('cq-prof-age').value) || null;
        const gender = document.getElementById('cq-prof-gender').value || null;
        const height = parseFloat(document.getElementById('cq-prof-height').value) || null;
        const weight = parseFloat(document.getElementById('cq-prof-weight').value) || null;
        const bodyFatPercentage = parseFloat(document.getElementById('cq-prof-bodyfat').value) || null;
        const idealWeight = parseFloat(document.getElementById('cq-prof-ideal-weight').value) || null;
        const idealBodyFatPercentage = parseFloat(document.getElementById('cq-prof-ideal-bodyfat').value) || null;
        const goal = document.getElementById('cq-prof-goal').value || null;
        const activityLevel = document.getElementById('cq-prof-activity').value || null;
        const calorieAdjustment = parseInt(document.getElementById('cq-prof-cal-adjust').value) || 0;
        const budgetTier = parseInt(document.getElementById('cq-prof-budget').value) || 2;
        const proteinRatioPercent = parseInt(document.getElementById('cq-prof-prot-ratio').value) || 35;
        const fatRatioPercent = parseInt(document.getElementById('cq-prof-fat-ratio').value) || 15;
        const carbRatioPercent = parseInt(document.getElementById('cq-prof-carb-ratio').value) || 50;
        const preWorkoutProtein = parseInt(document.getElementById('cq-prof-pre-p').value) || 20;
        const preWorkoutFat = parseInt(document.getElementById('cq-prof-pre-f').value) || 1;
        const preWorkoutCarbs = parseInt(document.getElementById('cq-prof-pre-c').value) || 25;
        const postWorkoutProtein = parseInt(document.getElementById('cq-prof-post-p').value) || 20;
        const postWorkoutFat = parseInt(document.getElementById('cq-prof-post-f').value) || 1;
        const postWorkoutCarbs = parseInt(document.getElementById('cq-prof-post-c').value) || 25;
        const preferredProteinSources = document.getElementById('cq-prof-prot-sources').value.split(',').map(s=>s.trim()).filter(s=>s);
        const preferredCarbSources = document.getElementById('cq-prof-carb-sources').value.split(',').map(s=>s.trim()).filter(s=>s);
        const preferredFatSources = document.getElementById('cq-prof-fat-sources').value.split(',').map(s=>s.trim()).filter(s=>s);
        const avoidFoods = document.getElementById('cq-prof-avoid-foods').value.split(',').map(s=>s.trim()).filter(s=>s);
        const allergies = document.getElementById('cq-prof-allergies').value.split(',').map(s=>s.trim()).filter(s=>s);
        const favoriteFoods = document.getElementById('cq-prof-fav-foods').value.trim() || null;
        const ngFoods = document.getElementById('cq-prof-ng-foods').value.trim() || null;
        const updateData = {
            'profile.nickname': nickname, 'profile.age': age, 'profile.gender': gender, 'profile.height': height, 'profile.weight': weight,
            'profile.bodyFatPercentage': bodyFatPercentage, 'profile.idealWeight': idealWeight, 'profile.idealBodyFatPercentage': idealBodyFatPercentage,
            'profile.goal': goal, 'profile.activityLevel': activityLevel, 'profile.calorieAdjustment': calorieAdjustment, 'profile.budgetTier': budgetTier,
            'profile.proteinRatioPercent': proteinRatioPercent, 'profile.fatRatioPercent': fatRatioPercent, 'profile.carbRatioPercent': carbRatioPercent,
            'profile.preWorkoutProtein': preWorkoutProtein, 'profile.preWorkoutFat': preWorkoutFat, 'profile.preWorkoutCarbs': preWorkoutCarbs,
            'profile.postWorkoutProtein': postWorkoutProtein, 'profile.postWorkoutFat': postWorkoutFat, 'profile.postWorkoutCarbs': postWorkoutCarbs,
            'profile.preferredProteinSources': preferredProteinSources, 'profile.preferredCarbSources': preferredCarbSources, 'profile.preferredFatSources': preferredFatSources,
            'profile.avoidFoods': avoidFoods, 'profile.allergies': allergies, 'profile.favoriteFoods': favoriteFoods, 'profile.ngFoods': ngFoods,
            'profile.wakeUpTime': wakeUpTime, 'profile.sleepTime': sleepTime, 'profile.trainingTime': trainingTime, 'profile.trainingDuration': trainingDuration, 'profile.trainingStyle': trainingStyle,
            'profile.mealsPerDay': mealsPerDay, 'profile.mealSlotConfig': { mealsPerDay, slots: slotsData },
            'profile.trainingCalorieBonuses': firebase.firestore.FieldValue.delete()
        };
        if (trainingAfterMeal != null) updateData['profile.trainingAfterMeal'] = trainingAfterMeal;
        else updateData['profile.trainingAfterMeal'] = firebase.firestore.FieldValue.delete();
        await db.collection('users').doc(uid).update(updateData);
        msgEl.innerHTML = '<span class="text-green-600">保存しました</span>';
        await loadUserSlots();
    } catch (e) { msgEl.innerHTML = '<span class="text-red-500">エラー: ' + e.message + '</span>'; }
}

// ========== Render User Info Panels ==========
function renderUserProfilePanel(profile, userData) {
    const el = document.getElementById('cq-user-profile-content');
    const p = profile || {};
    const weight = p.weight || 0; const bodyFatPct = p.bodyFatPercentage || 0;
    const lbm = weight && bodyFatPct ? r1(weight * (1 - bodyFatPct / 100)) : '-';
    const height = p.height || 0; const age = p.age || (p.birthYear ? new Date().getFullYear() - p.birthYear : null);
    let bmr = '-';
    if (weight && bodyFatPct && bodyFatPct > 0 && bodyFatPct < 100) {
        const lbmVal = weight * (1 - bodyFatPct / 100);
        bmr = Math.round(370 + 21.6 * lbmVal);
    } else if (height && weight && age && p.gender) { const g = p.gender; if (g === 'MALE') bmr = Math.round(10*weight+6.25*height-5*age+5); else if (g === 'FEMALE') bmr = Math.round(10*weight+6.25*height-5*age-161); else bmr = Math.round(10*weight+6.25*height-5*age-78); }
    const actMulti = { 'DESK_WORK': 1.2, 'STANDING_WORK': 1.4, 'PHYSICAL_LABOR': 1.6, 'SEDENTARY': 1.2, 'LIGHT': 1.375, 'MODERATE': 1.55, 'ACTIVE': 1.725, 'VERY_ACTIVE': 1.9 };
    const tdee = bmr !== '-' ? Math.round(bmr * (actMulti[p.activityLevel] || 1.2)) : '-';
    const goalLabels = { 'LOSE_WEIGHT': 'ダイエット', 'MAINTAIN': 'メンテナンス・リコンプ', 'GAIN_MUSCLE': 'バルクアップ' };
    const genderLabels = { 'MALE': '男性', 'FEMALE': '女性', 'OTHER': 'その他' };
    function row(l, v) { return `<div class="flex justify-between py-0.5 border-b border-gray-100"><span class="text-gray-500">${l}</span><span class="font-mono font-bold">${v??'-'}</span></div>`; }
    let html = '';
    html += row('ニックネーム', escapeHtml(p.nickname)) + row('性別', genderLabels[p.gender]||'-') + row('年齢', age?`${age}歳`:'-') + row('身長', height?`${height}cm`:'-') + row('体重', weight?`${weight}kg`:'-') + row('体脂肪率', bodyFatPct?`${bodyFatPct}%`:'-');
    html += row('LBM', typeof lbm==='number'?`${lbm}kg`:lbm) + row('BMR', bmr!=='-'?`${bmr}kcal`:'-') + row('TDEE', tdee!=='-'?`${tdee}kcal`:'-');
    html += row('目標', goalLabels[p.goal]||'-') + row('PFC', `P${p.proteinRatioPercent||35}% F${p.fatRatioPercent||15}% C${p.carbRatioPercent||50}%`);
    if (typeof lbm === 'number' && lbm > 0) {
        const lbmVal = typeof lbm === 'string' ? parseFloat(lbm) : lbm;
        const classSSS = Math.round(400 * (lbmVal / 60));
        const classS = Math.round(250 * (lbmVal / 60));
        const classA = Math.round(100 * (lbmVal / 60));
        html += row('トレ加算(自動)', `SSS+${classSSS} / S+${classS} / A+${classA} kcal`);
    }
    el.innerHTML = html;
}

const ROUTINE_SPLIT_OPTIONS = ['胸', '背中', '肩', '腕', '脚', '休み', '全身', '上半身', '下半身', 'プッシュ', 'プル', '胸・三頭', '背中・二頭', '肩・腕', '腹筋・体幹'];

async function renderUserRoutinePanel(uid, profile) {
    const el = document.getElementById('cq-user-routine-content');
    el.innerHTML = '<span class="text-gray-400">読み込み中...</span>';
    try {
        const snap = await db.collection('users').doc(uid).collection('routinePatterns').get();
        if (snap.empty) { el.innerHTML = '<span class="text-gray-400">ルーティン未設定</span>'; return; }
        loadedRoutinePatterns = {};
        let html = '';
        snap.forEach(doc => {
            const d = doc.data(); loadedRoutinePatterns[doc.id] = JSON.parse(JSON.stringify(d));
            const activeBadge = d.isActive ? '<span class="text-[9px] bg-green-200 text-green-800 px-1 rounded ml-1">Active</span>' : '';
            html += `<div class="mb-2 border border-gray-200 rounded p-2"><div class="flex items-center justify-between mb-1"><span class="font-bold text-xs">${escapeHtml(d.name||doc.id)}${activeBadge}</span><div class="flex gap-1"><button onclick="saveRoutinePattern('${doc.id}')" class="bg-teal-500 text-white px-2 py-0.5 rounded text-[9px]">保存</button><button onclick="resetRoutinePattern('${doc.id}')" class="bg-gray-400 text-white px-2 py-0.5 rounded text-[9px]">リセット</button></div></div>`;
            const days = d.days || [];
            if (days.length > 0) {
                html += '<div class="grid grid-cols-7 gap-1 text-center">';
                days.forEach((day, idx) => {
                    const isRest = day.isRestDay || day.splitType === '休み';
                    let opts = ROUTINE_SPLIT_OPTIONS.map(opt => `<option value="${opt}"${(isRest&&opt==='休み')||(!isRest&&opt===day.splitType)?' selected':''}>${opt}</option>`).join('');
                    html += `<div class="rounded px-0.5 py-1 text-[10px] border border-gray-200"><div class="font-bold mb-0.5">${escapeHtml(day.name||'Day'+day.dayNumber)}</div><select id="routine-${doc.id}-day-${idx}" class="w-full border border-gray-300 rounded text-[9px] px-0.5">${opts}</select></div>`;
                });
                html += '</div>';
            }
            html += '<div id="routine-msg-'+doc.id+'" class="text-[9px] mt-1 hidden"></div></div>';
        });
        el.innerHTML = html;
    } catch (e) { el.innerHTML = `<span class="text-red-500">エラー: ${e.message}</span>`; }
}

async function saveRoutinePattern(patternId) {
    const uid = loadedUserUid; if (!uid) return;
    const msgEl = document.getElementById('routine-msg-' + patternId);
    msgEl.classList.remove('hidden'); msgEl.innerHTML = '<span class="text-gray-500">保存中...</span>';
    try {
        const cached = loadedRoutinePatterns[patternId]; if (!cached) throw new Error('キャッシュなし');
        const days = (cached.days||[]).map((day, idx) => { const sel = document.getElementById(`routine-${patternId}-day-${idx}`); const st = sel ? sel.value : day.splitType; return { ...day, splitType: st==='休み'?'休み':st, isRestDay: st==='休み' }; });
        await db.collection('users').doc(uid).collection('routinePatterns').doc(patternId).update({ days });
        loadedRoutinePatterns[patternId].days = JSON.parse(JSON.stringify(days));
        msgEl.innerHTML = '<span class="text-green-600">保存</span>';
    } catch (e) { msgEl.innerHTML = `<span class="text-red-500">${e.message}</span>`; }
}

function resetRoutinePattern(patternId) {
    const cached = loadedRoutinePatterns[patternId]; if (!cached) return;
    (cached.days||[]).forEach((day, idx) => { const sel = document.getElementById(`routine-${patternId}-day-${idx}`); if (sel) sel.value = (day.isRestDay||day.splitType==='休み') ? '休み' : (day.splitType||'胸'); });
}

async function renderUserCustomItemsPanel(uid) {
    const el = document.getElementById('cq-user-custom-items-content');
    el.innerHTML = '<span class="text-gray-400">読み込み中...</span>';
    try {
        const [foodSnap, exSnap] = await Promise.all([db.collection('users').doc(uid).collection('customFoods').get(), db.collection('users').doc(uid).collection('customExercises').get()]);
        document.getElementById('cq-info-tab-custom').textContent = `カスタム(${foodSnap.size+exSnap.size})`;
        loadedUserCustomFoods = [];
        foodSnap.forEach(doc => { loadedUserCustomFoods.push({ id: doc.id, ...doc.data() }); });
        let html = '';
        if (foodSnap.size > 0) { html += '<div class="mb-2"><div class="text-[10px] font-bold bg-rose-100 px-2 py-0.5 rounded mb-1">カスタム食品</div>'; loadedUserCustomFoods.forEach(d => { const n = d.nutrientsPer100g||d; html += `<div class="text-[10px] border-b border-gray-100 py-0.5">${escapeHtml(d.name)} ${Math.round(n.calories||0)}kcal P${r1(n.protein||0)} F${r1(n.fat||0)} C${r1(n.carbs||0)}</div>`; }); html += '</div>'; }
        if (exSnap.size > 0) { html += '<div><div class="text-[10px] font-bold bg-blue-100 px-2 py-0.5 rounded mb-1">カスタム種目</div>'; exSnap.forEach(doc => { const d = doc.data(); html += `<div class="text-[10px] border-b border-gray-100 py-0.5">${escapeHtml(d.name)} ${d.category||''}</div>`; }); html += '</div>'; }
        if (!html) html = '<span class="text-gray-400">なし</span>';
        el.innerHTML = html;
    } catch (e) { el.innerHTML = `<span class="text-red-500">${e.message}</span>`; }
}

// ========== Condition Records ==========
const CONDITION_LABELS = { sleepHours: '睡眠時間', sleepQuality: '睡眠の質', digestion: '消化', focus: '集中力', stress: 'ストレス' };
const CONDITION_COLORS = { sleepHours: '#3b82f6', sleepQuality: '#8b5cf6', digestion: '#22c55e', focus: '#f59e0b', stress: '#ef4444' };

async function loadConditionRecords() {
    const uid = loadedUserUid;
    const el = document.getElementById('cq-condition-content');
    if (!uid) { el.innerHTML = '<span class="text-gray-400">クライアントを選択してください</span>'; return; }
    el.innerHTML = '<span class="text-gray-400">読み込み中...</span>';
    const days = parseInt(document.getElementById('cq-condition-days').value) || 30;
    try {
        const endDate = new Date();
        const startDate = new Date();
        startDate.setDate(startDate.getDate() - days);
        const startStr = startDate.toISOString().split('T')[0];
        const endStr = endDate.toISOString().split('T')[0];
        const snap = await db.collection('dailyRecords').doc(uid).collection('records')
            .where(firebase.firestore.FieldPath.documentId(), '>=', startStr)
            .where(firebase.firestore.FieldPath.documentId(), '<=', endStr)
            .orderBy(firebase.firestore.FieldPath.documentId(), 'desc')
            .get();
        const records = [];
        snap.forEach(doc => {
            const d = doc.data();
            if (d.conditions && Object.keys(d.conditions).length > 0) {
                records.push({ date: doc.id, conditions: d.conditions, weight: d.weight || null });
            }
        });
        renderConditionRecords(records);
    } catch (e) { el.innerHTML = `<span class="text-red-500">エラー: ${e.message}</span>`; console.error(e); }
}

function renderConditionRecords(records) {
    const el = document.getElementById('cq-condition-content');
    if (records.length === 0) { el.innerHTML = '<span class="text-gray-400">コンディション記録なし</span>'; return; }
    // Trend summary (latest 7 records average vs previous 7)
    const recent = records.slice(0, Math.min(7, records.length));
    const older = records.slice(7, Math.min(14, records.length));
    function avgScore(recs) {
        if (recs.length === 0) return null;
        let total = 0;
        recs.forEach(r => {
            const c = r.conditions;
            total += ((c.sleepHours||0)+(c.sleepQuality||0)+(c.digestion||0)+(c.focus||0)+(c.stress||0)) / 5 * 20;
        });
        return Math.round(total / recs.length);
    }
    const recentAvg = avgScore(recent);
    const olderAvg = avgScore(older);
    let trendHtml = '';
    if (recentAvg !== null) {
        const scoreColor = recentAvg >= 70 ? '#22c55e' : recentAvg >= 50 ? '#f59e0b' : '#ef4444';
        trendHtml += `<div class="flex items-center gap-3 mb-3 p-2 rounded-lg" style="background:${scoreColor}10;border:1px solid ${scoreColor}30">`;
        trendHtml += `<div class="text-center"><div class="text-2xl font-black" style="color:${scoreColor}">${recentAvg}</div><div class="text-[9px] text-gray-500">直近平均</div></div>`;
        if (olderAvg !== null) {
            const diff = recentAvg - olderAvg;
            const arrow = diff > 0 ? '↑' : diff < 0 ? '↓' : '→';
            const diffColor = diff > 0 ? '#22c55e' : diff < 0 ? '#ef4444' : '#6b7280';
            trendHtml += `<div class="text-center"><span style="color:${diffColor}" class="font-bold">${arrow}${diff > 0 ? '+' : ''}${diff}</span><div class="text-[9px] text-gray-500">前週比</div></div>`;
        }
        trendHtml += `<div class="text-[9px] text-gray-400 ml-auto">${records.length}件</div>`;
        trendHtml += '</div>';
    }
    // Daily list
    let listHtml = '';
    records.forEach(r => {
        const c = r.conditions;
        const score = Math.round(((c.sleepHours||0)+(c.sleepQuality||0)+(c.digestion||0)+(c.focus||0)+(c.stress||0)) / 5 * 20);
        const scoreColor = score >= 70 ? '#22c55e' : score >= 50 ? '#f59e0b' : '#ef4444';
        listHtml += `<div class="border-b border-gray-100 py-1.5">`;
        listHtml += `<div class="flex items-center justify-between mb-1"><span class="font-bold text-gray-700">${r.date}</span>`;
        listHtml += `<span class="font-bold text-sm" style="color:${scoreColor}">${score}点</span></div>`;
        listHtml += '<div class="flex gap-1">';
        for (const [key, label] of Object.entries(CONDITION_LABELS)) {
            const val = c[key] || 0;
            const color = CONDITION_COLORS[key];
            const pct = val / 5 * 100;
            listHtml += `<div class="flex-1 text-center"><div class="text-[8px] text-gray-500 mb-0.5">${label}</div><div class="h-1.5 rounded-full bg-gray-200 overflow-hidden"><div class="h-full rounded-full" style="width:${pct}%;background:${color}"></div></div><div class="text-[9px] font-bold mt-0.5" style="color:${color}">${val}/5</div></div>`;
        }
        if (r.weight) listHtml += `<div class="flex-1 text-center"><div class="text-[8px] text-gray-500 mb-0.5">体重</div><div class="text-[10px] font-bold text-gray-700 mt-1">${r.weight}kg</div></div>`;
        listHtml += '</div></div>';
    });
    el.innerHTML = trendHtml + listHtml;
}
