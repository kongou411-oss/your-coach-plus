const fs = require('fs');

// Read the file
const content = fs.readFileSync('./src/foodDatabase.js', 'utf-8');

// Extract foodDatabase object
const match = content.match(/const foodDatabase = ({[\s\S]*?^});/m);
if (!match) {
    console.error('Could not find foodDatabase');
    process.exit(1);
}

// Evaluate the object
const foodDatabase = eval('(' + match[1] + ')');

const highCarbNoGI = [];
const midCarbNoGI = [];
const lowCarbNoGI = [];

for (const category in foodDatabase) {
    const items = foodDatabase[category];
    for (const itemName in items) {
        const item = items[itemName];
        const carbs = item.carbs || 0;
        const gi = item.gi;

        // GIが未定義またはnullまたは0で、炭水化物が0より大きい
        if (carbs > 0 && (gi === undefined || gi === null || gi === 0)) {
            const itemInfo = {
                name: itemName,
                category: category,
                carbs: carbs,
                gi: gi === undefined ? 'undefined' : (gi === null ? 'null' : '0')
            };

            if (carbs >= 10) {
                highCarbNoGI.push(itemInfo);
            } else if (carbs >= 5) {
                midCarbNoGI.push(itemInfo);
            } else {
                lowCarbNoGI.push(itemInfo);
            }
        }
    }
}

// Sort by carbs descending
highCarbNoGI.sort((a, b) => b.carbs - a.carbs);
midCarbNoGI.sort((a, b) => b.carbs - a.carbs);
lowCarbNoGI.sort((a, b) => b.carbs - a.carbs);

// Output all low carb items
console.log("### 低糖質（carbs < 5g）でGI未定義 - 全リスト\n");
lowCarbNoGI.forEach((item, index) => {
    console.log(`${index + 1}. ${item.name}: ${item.category}`);
    console.log(`   - carbs: ${item.carbs}g`);
    console.log(`   - gi: ${item.gi}\n`);
});

console.log(`\n合計: ${lowCarbNoGI.length}件`);
