// ========== Firebase Init ==========
firebase.initializeApp(FIREBASE_CONFIG);
const auth = firebase.auth();
const db = firebase.firestore();
const functions = firebase.app().functions('asia-northeast2');
const ADMIN_EMAILS = ['official@your-coach-plus.com'];

auth.onAuthStateChanged(async (user) => {
    if (!user || !ADMIN_EMAILS.includes(user.email)) {
        window.location.href = '/admin-login.html';
        return;
    }
    document.getElementById('user-info').textContent = user.email;
    await initPage();
});

function logout() { auth.signOut().then(() => { window.location.href = '/admin-login.html'; }); }

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

// ========== Init ==========
async function initPage() {
    await loadTemplates();
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    document.getElementById('cq-assign-date').value = tomorrow.toISOString().split('T')[0];
    renderRecentUsers();
    onTemplateTypeChange();
}

// ========== Utility ==========
function escapeHtml(str) {
    if (!str) return '';
    return str.replace(/[&<>"']/g, (m) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[m]));
}
// ========== Calorie Calculations (r1, r2, scaleMap, scaleTemplateForSlot are in cq-databases.js) ==========
function calculateUserTargetCalories(profile) {
    const weight = profile.weight || 70;
    const bodyFatPct = profile.bodyFatPercentage || 15;
    const activityLevel = profile.activityLevel || 'MODERATE';
    const goal = profile.goal || 'MAINTAIN';
    const trainingDays = profile.trainingDaysPerWeek || 3;
    const fatMass = weight * (bodyFatPct / 100);
    const lbm = weight - fatMass;
    const bmr = 370 + (21.6 * lbm) + (fatMass * 4.5);
    const activityMultipliers = { 'SEDENTARY': 1.2, 'LIGHT': 1.375, 'MODERATE': 1.55, 'ACTIVE': 1.725, 'VERY_ACTIVE': 1.9 };
    const tdee = bmr * (activityMultipliers[activityLevel] || 1.55);
    const goalAdjustments = { 'LOSE_FAST': -750, 'LOSE': -500, 'LOSE_SLOW': -250, 'MAINTAIN': 0, 'GAIN_SLOW': 250, 'GAIN': 500 };
    const calorieAdjustment = goalAdjustments[goal] || 0;
    const trainingBonus = (trainingDays >= 4) ? 100 : 0;
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

// ESC to close drawer
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

// ========== Template Type Change / Category Filter (getExerciseType, updateExerciseFields are in cq-databases.js) ==========
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
            html += `<div class="px-3 py-1.5 text-sm cursor-pointer hover:bg-yellow-50" onmousedown="selectFood('${escapeHtml(f.name)}','${escapeHtml(f.category)}')">${escapeHtml(f.name)}${indicators}</div>`;
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

// Close dropdowns on outside click
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

function renderTemplateItems() {
    const container = document.getElementById('cq-tpl-item-list');
    if (templateItems.length === 0) { container.innerHTML = '<span class="text-gray-400">アイテムを追加してください</span>'; return; }
    let html = templateItems.map((item, i) => {
        const isEx = item.sets != null || item.duration != null || item.distance != null;
        const detail = isEx ? formatWorkoutItemDisplay(item) : `${item.amount} ${escapeHtml(item.unit)}`;
        const macro = (!isEx && item.calories > 0) ? `<span class="text-xs text-gray-500 ml-1">(${item.calories}kcal P${item.protein} F${item.fat} C${item.carbs})</span>` : '';
        return `<div class="flex items-center justify-between py-1 px-2 rounded ${i%2===0?'bg-yellow-50':''}"><span class="text-sm"><strong>${escapeHtml(item.foodName)}</strong> ${detail}${macro}</span><button onclick="removeTemplateItem(${i})" class="text-red-400 hover:text-red-600 text-xs ml-2">x</button></div>`;
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
            isActive: true, createdAt: firebase.firestore.FieldValue.serverTimestamp()
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
    try {
        const snapshot = await db.collection('quest_templates').where('isActive', '==', true).get();
        const templates = [];
        snapshot.forEach(doc => { templates.push({ id: doc.id, ...doc.data() }); });
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
        const m = t.totalMacros || {};
        const pfcLine = m.calories ? `<div class="text-[10px] font-mono text-gray-500 mt-1">${Math.round(m.calories)}kcal P${r1(m.protein||0)} F${r1(m.fat||0)} C${r1(m.carbs||0)}</div>` : '';
        const items = (t.items||[]).slice(0, 3).map(i => escapeHtml(i.foodName)).join(', ');
        const moreCount = (t.items||[]).length > 3 ? ` +${(t.items||[]).length - 3}` : '';
        html += `<div class="tpl-card ${typeClass}" onclick="openDrawer('edit','${t.id}')">
            <div class="flex items-center justify-between"><span class="font-bold text-sm truncate">${escapeHtml(t.title)}</span>${typeBadge}</div>
            ${pfcLine}
            <div class="text-[10px] text-gray-400 mt-1 truncate">${items}${moreCount}</div>
            <div class="flex gap-1 mt-2"><button onclick="event.stopPropagation();deleteTemplate('${t.id}')" class="text-[10px] text-red-400 hover:text-red-600">削除</button></div>
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

// ========== Default Templates ==========
async function createDefaultTemplates() {
    const msgEl = document.getElementById('cq-default-tpl-msg');
    msgEl.innerHTML = '<span class="text-gray-500">作成中...</span>';
    try {
        function buildItems(foods) {
            return foods.map(f => {
                const nut = FOOD_NUTRIENTS_PER_100G[f.name];
                const grams = f.unit === 'g' ? f.amount : (FOOD_SERVING_SIZES[f.name]?.[f.unit]||1) * f.amount;
                const ratio = grams / 100;
                const item = { foodName: f.name, amount: f.amount, unit: f.unit, calories: 0, protein: 0, fat: 0, carbs: 0, fiber: 0, solubleFiber: 0, insolubleFiber: 0, sugar: 0, saturatedFat: 0, monounsaturatedFat: 0, polyunsaturatedFat: 0, diaas: 0, gi: 0, vitamins: {}, minerals: {} };
                if (nut) { item.calories = Math.round(nut.calories*ratio); item.protein = r1(nut.protein*ratio); item.fat = r1(nut.fat*ratio); item.carbs = r1(nut.carbs*ratio); item.fiber = r1((nut.fiber||0)*ratio); item.diaas = nut.diaas||0; item.gi = nut.gi||0; item.vitamins = scaleMap(nut.vitamins||{}, ratio); item.minerals = scaleMap(nut.minerals||{}, ratio); }
                return item;
            });
        }
        function calcTotals(items) {
            const t = items.reduce((acc, i) => { acc.calories += i.calories; acc.protein += i.protein; acc.fat += i.fat; acc.carbs += i.carbs; acc.fiber += i.fiber; for (const k of Object.keys(i.vitamins||{})) acc.vitamins[k] = (acc.vitamins[k]||0)+(i.vitamins[k]||0); for (const k of Object.keys(i.minerals||{})) acc.minerals[k] = (acc.minerals[k]||0)+(i.minerals[k]||0); return acc; }, { calories:0, protein:0, fat:0, carbs:0, fiber:0, vitamins:{}, minerals:{} });
            const rv = {}; for (const [k,v] of Object.entries(t.vitamins)) rv[k] = r2(v);
            const rm2 = {}; for (const [k,v] of Object.entries(t.minerals)) rm2[k] = r2(v);
            return { calories: t.calories, protein: r1(t.protein), fat: r1(t.fat), carbs: r1(t.carbs), fiber: r1(t.fiber), vitamins: rv, minerals: rm2 };
        }
        const DEFAULTS = [
            { title: '通常食A（鶏むね＋冷飯）', type: 'MEAL', foods: [{name:'鶏むね肉（皮なし生）',amount:150,unit:'g'},{name:'白米（冷やご飯・再加熱）',amount:150,unit:'g'},{name:'ブロッコリー（生）',amount:100,unit:'g'}] },
            { title: '通常食B（鮭＋冷飯）', type: 'MEAL', foods: [{name:'鮭（生）',amount:120,unit:'g'},{name:'白米（冷やご飯・再加熱）',amount:150,unit:'g'},{name:'ブロッコリー（生）',amount:100,unit:'g'}] },
            { title: '通常食C（牛赤身＋冷飯）', type: 'MEAL', foods: [{name:'牛もも肉（赤肉生）',amount:150,unit:'g'},{name:'白米（冷やご飯・再加熱）',amount:150,unit:'g'},{name:'ブロッコリー（生）',amount:100,unit:'g'}] },
            { title: '朝食（卵＋冷飯）', type: 'MEAL', foods: [{name:'鶏卵 L（64g）',amount:128,unit:'g'},{name:'白米（冷やご飯・再加熱）',amount:150,unit:'g'},{name:'ブロッコリー（生）',amount:80,unit:'g'}] },
            { title: 'トレ前食（低GI・低脂質）', type: 'MEAL', foods: [{name:'鶏むね肉（皮なし生）',amount:80,unit:'g'},{name:'白米（冷やご飯・再加熱）',amount:150,unit:'g'}] },
            { title: 'トレ直後（高GI＋ホエイ）', type: 'MEAL', foods: [{name:'餅（切り餅）',amount:100,unit:'g'},{name:'ホエイプロテイン',amount:30,unit:'g'}] },
            { title: 'トレ後食（高GI・炊飯直後白米）', type: 'MEAL', foods: [{name:'鶏むね肉（皮なし生）',amount:150,unit:'g'},{name:'白米（炊飯直後）',amount:200,unit:'g'},{name:'ブロッコリー（生）',amount:80,unit:'g'}] }
        ];
        const batch = db.batch();
        DEFAULTS.forEach(def => { const items = buildItems(def.foods); const totals = calcTotals(items); const ref = db.collection('quest_templates').doc(); batch.set(ref, { ownerId: auth.currentUser.uid, title: def.title, type: def.type, items, totalMacros: totals, isActive: true, createdAt: firebase.firestore.FieldValue.serverTimestamp() }); });
        await batch.commit();
        msgEl.innerHTML = `<span class="text-green-600">${DEFAULTS.length}件作成</span>`;
        await loadTemplates();
    } catch (e) { msgEl.innerHTML = `<span class="text-red-500">${e.message}</span>`; }
}

async function createDefaultWorkoutTemplates() {
    const msgEl = document.getElementById('cq-default-tpl-msg');
    msgEl.innerHTML = '<span class="text-gray-500">作成中...</span>';
    try {
        function buildExItem(name, category, sets, reps, duration, rmMin, rmMax) {
            return { foodName: name, amount: sets, unit: 'セット', calories: 0, protein: 0, fat: 0, carbs: 0, fiber: 0, solubleFiber: 0, insolubleFiber: 0, sugar: 0, saturatedFat: 0, monounsaturatedFat: 0, polyunsaturatedFat: 0, diaas: 0, gi: 0, vitamins: {}, minerals: {}, category, sets, reps, weight: null, duration, distance: null, rmPercentMin: rmMin, rmPercentMax: rmMax };
        }
        const emptyMacros = { calories: 0, protein: 0, fat: 0, carbs: 0, fiber: 0, vitamins: {}, minerals: {} };
        const WD = [
            { title: '脚パワー', items: [buildExItem('バーベルスクワット','脚',5,5,30,75,85), buildExItem('レッグプレス','脚',4,6,20,70,80), buildExItem('レッグエクステンション','脚',3,8,12,null,null), buildExItem('レッグカール','脚',3,8,12,null,null)] },
            { title: '脚パンプ', items: [buildExItem('バーベルスクワット','脚',4,10,20,null,null), buildExItem('レッグプレス','脚',3,12,15,null,null), buildExItem('レッグエクステンション','脚',3,15,12,null,null), buildExItem('レッグカール','脚',3,15,12,null,null)] },
            { title: '背中パワー', items: [buildExItem('デッドリフト','背中',5,3,35,80,90), buildExItem('ベントオーバーロウ','背中',4,5,20,70,80), buildExItem('懸垂（チンニング）','背中',4,6,15,null,null), buildExItem('シーテッドロー','背中',3,8,12,null,null)] },
            { title: '背中パンプ', items: [buildExItem('デッドリフト','背中',3,10,20,null,null), buildExItem('ベントオーバーロウ','背中',3,10,15,null,null), buildExItem('懸垂（チンニング）','背中',3,10,12,null,null), buildExItem('シーテッドロー','背中',3,12,12,null,null)] },
            { title: '胸パワー', items: [buildExItem('バーベルベンチプレス','胸',5,5,30,75,85), buildExItem('インクラインベンチプレス','胸',4,6,20,70,80), buildExItem('ディップス','胸',3,8,12,null,null), buildExItem('ダンベルフライ','胸',3,10,12,null,null)] },
            { title: '胸パンプ', items: [buildExItem('バーベルベンチプレス','胸',4,10,20,null,null), buildExItem('インクラインベンチプレス','胸',3,10,15,null,null), buildExItem('ディップス','胸',3,12,12,null,null), buildExItem('ダンベルフライ','胸',3,15,12,null,null)] },
            { title: '肩パワー', items: [buildExItem('ダンベルショルダープレス','肩',5,5,25,70,80), buildExItem('スミスバックプレス','肩',4,6,20,65,75), buildExItem('サイドレイズ','肩',4,10,12,null,null), buildExItem('フロントレイズ','肩',3,10,10,null,null)] },
            { title: '肩パンプ', items: [buildExItem('ダンベルショルダープレス','肩',4,10,15,null,null), buildExItem('スミスバックプレス','肩',3,12,12,null,null), buildExItem('サイドレイズ','肩',4,15,12,null,null), buildExItem('フロントレイズ','肩',3,15,10,null,null)] },
            { title: '腕パワー', items: [buildExItem('ナローベンチプレス','胸',4,5,20,75,85), buildExItem('バーベルカール','腕',4,6,15,70,80), buildExItem('フレンチプレス','腕',3,8,12,null,null), buildExItem('インクラインダンベルカール','腕',3,8,12,null,null)] },
            { title: '腕パンプ', items: [buildExItem('ナローベンチプレス','胸',3,10,15,null,null), buildExItem('バーベルカール','腕',3,12,12,null,null), buildExItem('フレンチプレス','腕',3,15,10,null,null), buildExItem('インクラインダンベルカール','腕',3,15,10,null,null)] }
        ];
        const batch = db.batch();
        WD.forEach(def => { const ref = db.collection('quest_templates').doc(); batch.set(ref, { ownerId: auth.currentUser.uid, title: def.title, type: 'WORKOUT', items: def.items, totalMacros: emptyMacros, isActive: true, createdAt: firebase.firestore.FieldValue.serverTimestamp() }); });
        await batch.commit();
        msgEl.innerHTML = `<span class="text-green-600">${WD.length}件作成</span>`;
        await loadTemplates();
    } catch (e) { msgEl.innerHTML = `<span class="text-red-500">${e.message}</span>`; }
}

// ========== PFC Real-time Visualization ==========
function renderPfcBars(profile, existingAssignments, targetCalories) {
    const container = document.getElementById('pfc-bars-container');
    document.getElementById('pfc-target-label').textContent = `目標: ${targetCalories}kcal/日`;
    // Calculate totals from assigned slots
    let totalCal = 0, totalP = 0, totalF = 0, totalC = 0;
    Object.values(existingAssignments).forEach(a => {
        const m = a.macros || {};
        totalCal += (m.calories || 0); totalP += (m.protein || 0); totalF += (m.fat || 0); totalC += (m.carbs || 0);
    });
    // Target PFC
    const pRatio = (profile.proteinRatioPercent || 30) / 100;
    const fRatio = (profile.fatRatioPercent || 25) / 100;
    const cRatio = (profile.carbRatioPercent || 45) / 100;
    const targetP = targetCalories * pRatio / 4;
    const targetF = targetCalories * fRatio / 9;
    const targetC = targetCalories * cRatio / 4;

    function getBarColor(pct) {
        if (pct >= 95 && pct <= 105) return '#d1d5db';
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
    const uid = document.getElementById('cq-assign-uid').value.trim();
    if (!uid) { alert('ユーザーIDを入力してください'); return; }
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
        saveRecentUser(uid, displayName);

        // Show bento grid
        document.getElementById('cq-bento-container').classList.remove('hidden');

        // Profile editor values
        document.getElementById('cq-profile-editor').classList.remove('hidden');
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
        document.getElementById('cq-prof-target-weight').value = profile.targetWeight || '';
        document.getElementById('cq-prof-ideal-weight').value = profile.idealWeight || '';
        document.getElementById('cq-prof-ideal-bodyfat').value = profile.idealBodyFatPercentage || '';
        document.getElementById('cq-prof-goal').value = profile.goal || 'MAINTAIN';
        document.getElementById('cq-prof-activity').value = profile.activityLevel || 'DESK_WORK';
        document.getElementById('cq-prof-cal-adjust').value = profile.calorieAdjustment || 0;
        document.getElementById('cq-prof-budget').value = profile.budgetTier || 2;
        document.getElementById('cq-prof-prot-ratio').value = profile.proteinRatioPercent || 30;
        document.getElementById('cq-prof-fat-ratio').value = profile.fatRatioPercent || 25;
        document.getElementById('cq-prof-carb-ratio').value = profile.carbRatioPercent || 45;
        document.getElementById('cq-prof-pre-p').value = profile.preWorkoutProtein ?? 20;
        document.getElementById('cq-prof-pre-f').value = profile.preWorkoutFat ?? 5;
        document.getElementById('cq-prof-pre-c').value = profile.preWorkoutCarbs ?? 50;
        document.getElementById('cq-prof-post-p').value = profile.postWorkoutProtein ?? 30;
        document.getElementById('cq-prof-post-f').value = profile.postWorkoutFat ?? 5;
        document.getElementById('cq-prof-post-c').value = profile.postWorkoutCarbs ?? 60;
        document.getElementById('cq-prof-prot-sources').value = (profile.preferredProteinSources || []).join(', ');
        document.getElementById('cq-prof-carb-sources').value = (profile.preferredCarbSources || []).join(', ');
        document.getElementById('cq-prof-fat-sources').value = (profile.preferredFatSources || []).join(', ');
        document.getElementById('cq-prof-avoid-foods').value = (profile.avoidFoods || []).join(', ');
        document.getElementById('cq-prof-allergies').value = (profile.allergies || []).join(', ');
        document.getElementById('cq-prof-fav-foods').value = profile.favoriteFoods || '';
        document.getElementById('cq-prof-ng-foods').value = profile.ngFoods || '';

        // Render panels
        document.getElementById('cq-user-panels').classList.remove('hidden');
        renderUserProfilePanel(profile, userData);
        renderUserRoutinePanel(uid, profile);
        renderUserTemplatesPanel(uid);
        renderUserCustomItemsPanel(uid);

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

        // PFC Bars
        renderPfcBars(profile, existingAssignments, targetCalories);

        // Slot dropdowns
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
                <div class="min-w-[90px] text-center"><span class="font-bold text-sm">食事${i}</span><br><span class="text-[10px] text-blue-600">${timeStr}</span> ${badge}<br><span class="text-[9px] text-gray-400">${slotTargetCals}kcal</span>${assignInfo ? '<br>'+assignInfo : ''}</div>
                <select id="cq-bulk-tpl-${slotKey}" class="flex-1 border border-gray-300 rounded-lg px-2 py-1.5 text-sm" onchange="onSlotTemplateChange()">${buildTplOpts('meal', assign?.templateId||'')}</select>
            </div>`;
        }
        // Workout slot
        const workoutAssign = existingAssignments['workout'];
        html += `<div class="flex items-center gap-2">
            <div class="min-w-[90px] text-center"><span class="font-bold text-sm">運動</span><br><span class="text-[10px] text-blue-600">${profile.trainingTime||'17:00'}</span>${workoutAssign?'<br><span class="text-[9px] text-green-700 font-bold">✓'+escapeHtml(workoutAssign.title)+'</span>':''}</div>
            <select id="cq-bulk-tpl-workout" class="flex-1 border border-gray-300 rounded-lg px-2 py-1.5 text-sm" onchange="onSlotTemplateChange()">${buildTplOpts('workout', workoutAssign?.templateId||'')}</select>
        </div>`;
        html += '</div>';
        container.innerHTML = html;
        await loadUserAssignments();
    } catch (e) { container.innerHTML = '<span class="text-red-500 text-sm">エラー: ' + e.message + '</span>'; console.error(e); }
}

function onSlotTemplateChange() {
    // Recalculate PFC from slot selections
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
        html += `<div class="flex flex-col items-center gap-0.5"><span class="text-[10px] font-bold">食事${i}</span><input type="time" id="cq-slot-time-${i}" value="${absTime||calcTime}" class="border ${absTime?'border-orange-400 bg-orange-50':'border-gray-300'} rounded px-1 py-0.5 text-xs w-20 text-center" onchange="onSlotTimeChange(${i})"><span class="text-[9px] text-gray-400">${absTime?'手動':'自動'}</span></div>`;
    }
    container.innerHTML = html;
}

function onSlotTimeChange(slotNum) {
    const input = document.getElementById('cq-slot-time-' + slotNum);
    if (input.value) { input.classList.add('border-orange-400', 'bg-orange-50'); input.classList.remove('border-gray-300'); }
}

// ========== Assign All Slots ==========
async function assignAllSlots() {
    const uid = document.getElementById('cq-assign-uid').value.trim();
    const isPersistent = document.getElementById('cq-assign-persistent').checked;
    const date = isPersistent ? '_default' : document.getElementById('cq-assign-date').value;
    const msgEl = document.getElementById('cq-bulk-assign-message');
    if (!uid) { alert('ユーザーIDを入力してください'); return; }
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

// ========== Recent Users ==========
function getRecentUsers() { try { return JSON.parse(localStorage.getItem('cq_recent_users') || '[]'); } catch { return []; } }
function saveRecentUser(uid, displayName) {
    let users = getRecentUsers().filter(u => u.uid !== uid);
    users.unshift({ uid, displayName, timestamp: Date.now() });
    if (users.length > 10) users = users.slice(0, 10);
    localStorage.setItem('cq_recent_users', JSON.stringify(users));
    renderRecentUsers();
}
function renderRecentUsers() {
    const users = getRecentUsers();
    const container = document.getElementById('cq-recent-users');
    if (users.length === 0) { container.innerHTML = '<span class="text-gray-400 text-xs">履歴なし</span>'; return; }
    container.innerHTML = users.map(u => `<button onclick="switchToUser('${u.uid}')" class="text-xs border border-gray-300 rounded-full px-3 py-1 hover:bg-yellow-50 hover:border-yellow-400 transition">${escapeHtml(u.displayName || u.uid.substring(0,8)+'...')}</button>`).join('');
}
async function switchToUser(uid) { document.getElementById('cq-assign-uid').value = uid; await loadUserSlots(); }

// ========== Assignment List ==========
async function loadUserAssignments() {
    const uid = document.getElementById('cq-assign-uid').value.trim();
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
            html += `<div class="p-2 border ${isPers?'border-yellow-400 bg-yellow-50':'border-gray-200'} rounded-lg mb-1"><div class="flex items-center justify-between"><span class="font-bold">${isPers?'永続':date}</span><button onclick="deleteAssignment('${uid}','${doc.id}')" class="text-[10px] text-red-400 hover:text-red-600">削除</button></div><div class="text-[10px] text-gray-600 mt-0.5">${slotDetails}</div></div>`;
        });
        listEl.innerHTML = html;
    } catch (e) { listEl.innerHTML = '<span class="text-red-500 text-sm">エラー: ' + e.message + '</span>'; }
}

async function deleteAssignment(uid, docId) {
    if (!confirm(`${docId === '_default' ? '永続クエスト' : docId} を削除しますか？`)) return;
    try { await db.collection('users').doc(uid).collection('custom_quests').doc(docId).delete(); await loadUserAssignments(); } catch (e) { alert('エラー: ' + e.message); }
}

// ========== Profile ==========
function toggleProfileEditor() {
    const editor = document.getElementById('cq-profile-editor');
    editor.classList.toggle('hidden');
}

function switchProfileTab(tabName) {
    document.querySelectorAll('.cq-prof-panel').forEach(p => p.classList.add('hidden'));
    document.querySelectorAll('.prof-tab').forEach(t => t.classList.remove('active'));
    const panel = document.getElementById('cq-panel-' + tabName);
    const tab = document.getElementById('cq-tab-' + tabName);
    if (panel) panel.classList.remove('hidden');
    if (tab) tab.classList.add('active');
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
    document.getElementById('cq-prof-bodyfat').value = ''; document.getElementById('cq-prof-target-weight').value = '';
    document.getElementById('cq-prof-ideal-weight').value = ''; document.getElementById('cq-prof-ideal-bodyfat').value = '';
    document.getElementById('cq-prof-goal').value = 'MAINTAIN'; document.getElementById('cq-prof-activity').value = 'DESK_WORK';
    document.getElementById('cq-prof-cal-adjust').value = '0'; document.getElementById('cq-prof-budget').value = '2';
    document.getElementById('cq-prof-prot-ratio').value = '35'; document.getElementById('cq-prof-fat-ratio').value = '15';
    document.getElementById('cq-prof-carb-ratio').value = '50';
    document.getElementById('cq-prof-pre-p').value = '20'; document.getElementById('cq-prof-pre-f').value = '5'; document.getElementById('cq-prof-pre-c').value = '50';
    document.getElementById('cq-prof-post-p').value = '30'; document.getElementById('cq-prof-post-f').value = '5'; document.getElementById('cq-prof-post-c').value = '60';
    document.getElementById('cq-prof-prot-sources').value = '鶏むね肉, 鮭'; document.getElementById('cq-prof-carb-sources').value = '白米, 玄米';
    document.getElementById('cq-prof-fat-sources').value = 'オリーブオイル, アボカド'; document.getElementById('cq-prof-avoid-foods').value = '';
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
        const targetWeightVal = parseFloat(document.getElementById('cq-prof-target-weight').value) || null;
        const idealWeight = parseFloat(document.getElementById('cq-prof-ideal-weight').value) || null;
        const idealBodyFatPercentage = parseFloat(document.getElementById('cq-prof-ideal-bodyfat').value) || null;
        const goal = document.getElementById('cq-prof-goal').value || null;
        const activityLevel = document.getElementById('cq-prof-activity').value || null;
        const calorieAdjustment = parseInt(document.getElementById('cq-prof-cal-adjust').value) || 0;
        const budgetTier = parseInt(document.getElementById('cq-prof-budget').value) || 2;
        const proteinRatioPercent = parseInt(document.getElementById('cq-prof-prot-ratio').value) || 30;
        const fatRatioPercent = parseInt(document.getElementById('cq-prof-fat-ratio').value) || 25;
        const carbRatioPercent = parseInt(document.getElementById('cq-prof-carb-ratio').value) || 45;
        const preWorkoutProtein = parseInt(document.getElementById('cq-prof-pre-p').value) || 20;
        const preWorkoutFat = parseInt(document.getElementById('cq-prof-pre-f').value) || 5;
        const preWorkoutCarbs = parseInt(document.getElementById('cq-prof-pre-c').value) || 50;
        const postWorkoutProtein = parseInt(document.getElementById('cq-prof-post-p').value) || 30;
        const postWorkoutFat = parseInt(document.getElementById('cq-prof-post-f').value) || 5;
        const postWorkoutCarbs = parseInt(document.getElementById('cq-prof-post-c').value) || 60;
        const preferredProteinSources = document.getElementById('cq-prof-prot-sources').value.split(',').map(s=>s.trim()).filter(s=>s);
        const preferredCarbSources = document.getElementById('cq-prof-carb-sources').value.split(',').map(s=>s.trim()).filter(s=>s);
        const preferredFatSources = document.getElementById('cq-prof-fat-sources').value.split(',').map(s=>s.trim()).filter(s=>s);
        const avoidFoods = document.getElementById('cq-prof-avoid-foods').value.split(',').map(s=>s.trim()).filter(s=>s);
        const allergies = document.getElementById('cq-prof-allergies').value.split(',').map(s=>s.trim()).filter(s=>s);
        const favoriteFoods = document.getElementById('cq-prof-fav-foods').value.trim() || null;
        const ngFoods = document.getElementById('cq-prof-ng-foods').value.trim() || null;
        let targetCalories = null, targetProtein = null, targetFat = null, targetCarbs = null;
        if (height && weight && age && gender) {
            let bmr; if (gender === 'MALE') bmr = 10*weight+6.25*height-5*age+5; else if (gender === 'FEMALE') bmr = 10*weight+6.25*height-5*age-161; else bmr = 10*weight+6.25*height-5*age-78;
            const actMulti = { 'DESK_WORK': 1.2, 'STANDING_WORK': 1.4, 'PHYSICAL_LABOR': 1.6 };
            const tdee = bmr * (actMulti[activityLevel] || 1.2);
            targetCalories = Math.round(tdee + calorieAdjustment);
            targetProtein = targetCalories * proteinRatioPercent / 100 / 4; targetFat = targetCalories * fatRatioPercent / 100 / 9; targetCarbs = targetCalories * carbRatioPercent / 100 / 4;
        }
        const updateData = {
            'profile.nickname': nickname, 'profile.age': age, 'profile.gender': gender, 'profile.height': height, 'profile.weight': weight,
            'profile.bodyFatPercentage': bodyFatPercentage, 'profile.targetWeight': targetWeightVal, 'profile.idealWeight': idealWeight, 'profile.idealBodyFatPercentage': idealBodyFatPercentage,
            'profile.goal': goal, 'profile.activityLevel': activityLevel, 'profile.calorieAdjustment': calorieAdjustment, 'profile.budgetTier': budgetTier,
            'profile.proteinRatioPercent': proteinRatioPercent, 'profile.fatRatioPercent': fatRatioPercent, 'profile.carbRatioPercent': carbRatioPercent,
            'profile.targetCalories': targetCalories, 'profile.targetProtein': targetProtein, 'profile.targetFat': targetFat, 'profile.targetCarbs': targetCarbs,
            'profile.preWorkoutProtein': preWorkoutProtein, 'profile.preWorkoutFat': preWorkoutFat, 'profile.preWorkoutCarbs': preWorkoutCarbs,
            'profile.postWorkoutProtein': postWorkoutProtein, 'profile.postWorkoutFat': postWorkoutFat, 'profile.postWorkoutCarbs': postWorkoutCarbs,
            'profile.preferredProteinSources': preferredProteinSources, 'profile.preferredCarbSources': preferredCarbSources, 'profile.preferredFatSources': preferredFatSources,
            'profile.avoidFoods': avoidFoods, 'profile.allergies': allergies, 'profile.favoriteFoods': favoriteFoods, 'profile.ngFoods': ngFoods,
            'profile.wakeUpTime': wakeUpTime, 'profile.sleepTime': sleepTime, 'profile.trainingTime': trainingTime, 'profile.trainingDuration': trainingDuration, 'profile.trainingStyle': trainingStyle,
            'profile.mealsPerDay': mealsPerDay, 'profile.mealSlotConfig': { mealsPerDay, slots: slotsData }
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
    if (height && weight && age && p.gender) { const g = p.gender; if (g === 'MALE') bmr = Math.round(10*weight+6.25*height-5*age+5); else if (g === 'FEMALE') bmr = Math.round(10*weight+6.25*height-5*age-161); else bmr = Math.round(10*weight+6.25*height-5*age-78); }
    const actMulti = { 'DESK_WORK': 1.2, 'STANDING_WORK': 1.4, 'PHYSICAL_LABOR': 1.6, 'SEDENTARY': 1.2, 'LIGHT': 1.375, 'MODERATE': 1.55, 'ACTIVE': 1.725, 'VERY_ACTIVE': 1.9 };
    const tdee = bmr !== '-' ? Math.round(bmr * (actMulti[p.activityLevel] || 1.2)) : '-';
    const goalLabels = { 'LOSE_FAST': '急速減量', 'LOSE': '減量', 'LOSE_SLOW': 'ゆるやか減量', 'MAINTAIN': '維持', 'GAIN_SLOW': 'ゆるやか増量', 'GAIN': '増量' };
    const genderLabels = { 'MALE': '男性', 'FEMALE': '女性', 'OTHER': 'その他' };
    function row(l, v) { return `<div class="flex justify-between py-0.5 border-b border-gray-100"><span class="text-gray-500">${l}</span><span class="font-mono font-bold">${v??'-'}</span></div>`; }
    let html = '';
    html += row('ニックネーム', escapeHtml(p.nickname)) + row('性別', genderLabels[p.gender]||'-') + row('年齢', age?`${age}歳`:'-') + row('身長', height?`${height}cm`:'-') + row('体重', weight?`${weight}kg`:'-') + row('体脂肪率', bodyFatPct?`${bodyFatPct}%`:'-');
    html += row('LBM', typeof lbm==='number'?`${lbm}kg`:lbm) + row('BMR', bmr!=='-'?`${bmr}kcal`:'-') + row('TDEE', tdee!=='-'?`${tdee}kcal`:'-');
    html += row('目標', goalLabels[p.goal]||'-') + row('PFC', `P${p.proteinRatioPercent||30}% F${p.fatRatioPercent||25}% C${p.carbRatioPercent||45}%`);
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

async function renderUserTemplatesPanel(uid) {
    const el = document.getElementById('cq-user-templates-content');
    el.innerHTML = '<span class="text-gray-400">読み込み中...</span>';
    try {
        const [mealSnap, workoutSnap] = await Promise.all([db.collection('users').doc(uid).collection('mealTemplates').get(), db.collection('users').doc(uid).collection('workoutTemplates').get()]);
        document.getElementById('cq-info-tab-templates').textContent = `テンプレート(${mealSnap.size+workoutSnap.size})`;
        let html = '';
        if (mealSnap.size > 0) { html += '<div class="mb-2"><div class="text-[10px] font-bold bg-amber-100 px-2 py-0.5 rounded mb-1">食事</div>'; mealSnap.forEach(doc => { const d = doc.data(); const m = d.totalMacros||{}; html += `<div class="mb-1 border border-gray-200 rounded p-1"><strong>${escapeHtml(d.title||doc.id)}</strong> <span class="text-[10px] text-gray-500">${Math.round(m.calories||0)}kcal P${r1(m.protein||0)} F${r1(m.fat||0)} C${r1(m.carbs||0)}</span></div>`; }); html += '</div>'; }
        if (workoutSnap.size > 0) { html += '<div><div class="text-[10px] font-bold bg-blue-100 px-2 py-0.5 rounded mb-1">運動</div>'; workoutSnap.forEach(doc => { const d = doc.data(); html += `<div class="mb-1 border border-gray-200 rounded p-1"><strong>${escapeHtml(d.title||doc.id)}</strong></div>`; }); html += '</div>'; }
        if (!html) html = '<span class="text-gray-400">なし</span>';
        el.innerHTML = html;
    } catch (e) { el.innerHTML = `<span class="text-red-500">${e.message}</span>`; }
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
