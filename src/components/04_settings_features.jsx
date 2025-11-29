import React from 'react';
import toast from 'react-hot-toast';
import { STORAGE_KEYS, DEFAULT_ROUTINES } from '../config.js';
import NotificationSettings from './21_notification_settings.jsx';

// ===== 機能タブコンポーネント =====
const FeaturesTab = ({
    unlockedFeatures,
    shortcuts,
    onUpdateShortcuts,
    userId,
    userProfile,
    usageDays,
    mealTemplates,
    workoutTemplates,
    onOpenAddView,
    localRoutines,
    setLocalRoutines,
    showConfirm,
    showTemplateEditModal,
    setShowTemplateEditModal,
    templateEditType,
    setTemplateEditType,
    selectedTemplate,
    setSelectedTemplate,
    loadTemplates,
    loadRoutines
}) => {
    const Icon = window.Icon;

    return (
        <div className="space-y-3">
            {/* ショートカット - 初回分析後に開放 */}
            {unlockedFeatures.includes('shortcut') && (
            <details className="border rounded-lg">
                <summary className="cursor-pointer p-4 hover:bg-gray-50 font-medium flex items-center gap-2">
                    <Icon name="Zap" size={18} className="text-blue-600" />
                    ショートカット
                    <Icon name="ChevronDown" size={16} className="ml-auto text-gray-400" />
                </summary>
                <div className="p-4 pt-0 border-t">
                    <p className="text-sm text-gray-600 mb-4">画面左右のショートカットボタンをカスタマイズできます。各項目の表示位置と項目を変更できます。</p>

                    {/* 表示/非表示分析切替*/}
                    <div className="space-y-2 mb-4 p-3 bg-gray-50 rounded-lg">
                        <label className="flex items-center gap-2 cursor-pointer">
                            <input
                                type="checkbox"
                                defaultChecked={(() => {
                                    const saved = localStorage.getItem('chevronShortcutsVisibility');
                                    return saved ? JSON.parse(saved).left : true;
                                })()}
                                onChange={(e) => {
                                    const saved = localStorage.getItem('chevronShortcutsVisibility');
                                    const visibility = saved ? JSON.parse(saved) : { left: true, right: true };
                                    visibility.left = e.target.checked;
                                    localStorage.setItem('chevronShortcutsVisibility', JSON.stringify(visibility));
                                    window.dispatchEvent(new CustomEvent('shortcutsVisibilityUpdated', { detail: visibility }));
                                }}
                                className="w-4 h-4"
                            />
                            <Icon name="ChevronRight" size={16} className="text-blue-600" />
                            <span className="text-sm font-medium">左側を表示</span>
                        </label>
                        <label className="flex items-center gap-2 cursor-pointer">
                            <input
                                type="checkbox"
                                defaultChecked={(() => {
                                    const saved = localStorage.getItem('chevronShortcutsVisibility');
                                    return saved ? JSON.parse(saved).right : true;
                                })()}
                                onChange={(e) => {
                                    const saved = localStorage.getItem('chevronShortcutsVisibility');
                                    const visibility = saved ? JSON.parse(saved) : { left: true, right: true };
                                    visibility.right = e.target.checked;
                                    localStorage.setItem('chevronShortcutsVisibility', JSON.stringify(visibility));
                                    window.dispatchEvent(new CustomEvent('shortcutsVisibilityUpdated', { detail: visibility }));
                                }}
                                className="w-4 h-4"
                            />
                            <Icon name="ChevronLeft" size={16} className="text-blue-600" />
                            <span className="text-sm font-medium">右側を表示</span>
                        </label>
                    </div>

                    {/* 左側ショートカット */}
                    <div className="mb-6">
                        <h4 className="font-bold text-gray-800 mb-3 flex items-center gap-2">
                            <Icon name="ChevronRight" size={16} className="text-blue-600" />
                            左側
                        </h4>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-3 p-3 bg-gray-50 rounded-lg">
                            <div>
                                <label className="block text-sm font-medium text-gray-600 mb-1">位置</label>
                                <select
                                    value={shortcuts.find(s => s.side === 'left')?.position || 'middle'}
                                    onChange={(e) => {
                                        const updated = shortcuts.map(s =>
                                            s.side === 'left' ? { ...s, position: e.target.value } : s
                                        );
                                        onUpdateShortcuts(updated);
                                    }}
                                    className="w-full px-3 py-2 border rounded-lg text-sm"
                                >
                                    <option value="top">上</option>
                                    <option value="middle">中</option>
                                    <option value="bottom">下</option>
                                </select>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-600 mb-1">サイズ</label>
                                <select
                                    value={shortcuts.find(s => s.side === 'left')?.size || 'small'}
                                    onChange={(e) => {
                                        const updated = shortcuts.map(s =>
                                            s.side === 'left' ? { ...s, size: e.target.value } : s
                                        );
                                        onUpdateShortcuts(updated);
                                    }}
                                    className="w-full px-3 py-2 border rounded-lg text-sm"
                                >
                                    <option value="small">小</option>
                                    <option value="medium">中</option>
                                    <option value="large">大</option>
                                </select>
                            </div>
                        </div>

                        <div className="space-y-2">
                            {(() => {
                                const allItems = [
                                    { action: 'open_body_composition', label: '体組成', icon: 'Activity', color: 'text-teal-600' },
                                    { action: 'open_meal', label: '食事', icon: 'Utensils', color: 'text-green-600' },
                                    { action: 'open_meal_photo', label: '写真解析', icon: 'Camera', color: 'text-green-600' },
                                    { action: 'open_workout', label: '運動', icon: 'Dumbbell', color: 'text-orange-600' },
                                    { action: 'open_condition', label: 'コンディション', icon: 'HeartPulse', color: 'text-red-600' },
                                    { action: 'open_idea', label: '閃き', icon: 'Lightbulb', color: 'text-yellow-500' },
                                    { action: 'open_analysis', label: '分析', icon: 'PieChart', color: 'text-indigo-600' },
                                    { action: 'open_history', label: '履歴', icon: 'TrendingUp', color: 'text-blue-600' },
                                    { action: 'open_pgbase', label: 'PGBASE', icon: 'BookOpen', color: 'text-cyan-600' },
                                    { action: 'open_community', label: 'COMY', icon: 'Users', color: 'text-blue-600' },
                                    { action: 'open_settings', label: '設定', icon: 'Settings', color: 'text-gray-600' }
                                ];

                                // 左側の項目リストを取得
                                const leftShortcuts = shortcuts
                                    .filter(s => s.side === 'left' && s.enabled)
                                    .sort((a, b) => (a.order || 0) - (b.order || 0));

                                const [draggedIndex, setDraggedIndex] = React.useState(null);

                                return (
                                    <>
                                        {leftShortcuts.map((shortcut, index) => {
                                            const item = allItems.find(i => i.action === shortcut.action);
                                            if (!item) return null;
                                            const isDragging = draggedIndex === index;

                                            return (
                                                <div
                                                    key={`${shortcut.action}-${index}`}
                                                    draggable
                                                    onDragStart={(e) => {
                                                        setDraggedIndex(index);
                                                        e.dataTransfer.effectAllowed = 'move';
                                                    }}
                                                    onDragOver={(e) => {
                                                        e.preventDefault();
                                                        e.dataTransfer.dropEffect = 'move';
                                                    }}
                                                    onDrop={(e) => {
                                                        e.preventDefault();
                                                        if (draggedIndex === null || draggedIndex === index) return;

                                                        const updated = [...shortcuts];
                                                        const leftItems = updated.filter(s => s.side === 'left' && s.enabled);
                                                        const [draggedItem] = leftItems.splice(draggedIndex, 1);
                                                        leftItems.splice(index, 0, draggedItem);

                                                        // order値を更新
                                                        leftItems.forEach((item, i) => {
                                                            const idx = updated.findIndex(s => s === item);
                                                            if (idx !== -1) updated[idx].order = i;
                                                        });

                                                        onUpdateShortcuts(updated);
                                                        setDraggedIndex(null);
                                                    }}
                                                    onDragEnd={() => setDraggedIndex(null)}
                                                    className={`flex items-center gap-3 p-2 bg-white border rounded-lg ${
                                                        isDragging ? 'opacity-50' : ''
                                                    }`}
                                                >
                                                    <Icon name="GripHorizontal" size={16} className="text-gray-400 cursor-move" />
                                                    <Icon name={item.icon} size={18} className={item.color} />
                                                    <span className="flex-1 text-sm font-medium text-gray-800">
                                                        {item.label}
                                                    </span>
                                                    <button
                                                        onClick={() => {
                                                            const updated = shortcuts.map(s =>
                                                                s === shortcut ? { ...s, enabled: false } : s
                                                            );
                                                            onUpdateShortcuts(updated);
                                                        }}
                                                        className="p-1 text-red-500 hover:text-red-700 hover:bg-red-50 rounded transition"
                                                    >
                                                        <Icon name="X" size={16} />
                                                    </button>
                                                </div>
                                            );
                                        })}

                                        {/* 項目を追加ボタン */}
                                        <div className="flex items-center gap-2 p-2 bg-gray-50 border border-dashed rounded-lg">
                                            <Icon name="Plus" size={16} className="text-gray-400" />
                                            <select
                                                onChange={(e) => {
                                                    if (!e.target.value) return;
                                                    const action = e.target.value;
                                                    const maxOrder = Math.max(...shortcuts.filter(s => s.side === 'left' && s.enabled).map(s => s.order || 0), -1);

                                                    // 既存の項目を探す
                                                    const existingIndex = shortcuts.findIndex(s => s.action === action);
                                                    let updated;

                                                    if (existingIndex !== -1) {
                                                        // 既存項目を有効化
                                                        updated = shortcuts.map((s, i) =>
                                                            i === existingIndex ? { ...s, side: 'left', enabled: true, order: maxOrder + 1 } : s
                                                        );
                                                    } else {
                                                        // 新規追加
                                                        updated = [...shortcuts, {
                                                            action,
                                                            side: 'left',
                                                            enabled: true,
                                                            order: maxOrder + 1,
                                                            position: 'middle',
                                                            size: 'small'
                                                        }];
                                                    }

                                                    onUpdateShortcuts(updated);
                                                    e.target.value = '';
                                                }}
                                                className="flex-1 px-3 py-1.5 text-sm border-none bg-transparent text-gray-600 cursor-pointer"
                                                defaultValue=""
                                            >
                                                <option value="">項目を追加...</option>
                                                {allItems.map(item => (
                                                    <option key={item.action} value={item.action}>
                                                        {item.label}
                                                    </option>
                                                ))}
                                            </select>
                                        </div>
                                    </>
                                );
                            })()}
                        </div>
                    </div>

                    {/* 右側ショートカット */}
                    <div className="mb-4">
                        <h4 className="font-bold text-gray-800 mb-3 flex items-center gap-2">
                            <Icon name="ChevronLeft" size={16} className="text-blue-600" />
                            右側
                        </h4>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-3 p-3 bg-gray-50 rounded-lg">
                            <div>
                                <label className="block text-sm font-medium text-gray-600 mb-1">位置</label>
                                <select
                                    value={shortcuts.find(s => s.side === 'right')?.position || 'middle'}
                                    onChange={(e) => {
                                        const updated = shortcuts.map(s =>
                                            s.side === 'right' ? { ...s, position: e.target.value } : s
                                        );
                                        onUpdateShortcuts(updated);
                                    }}
                                    className="w-full px-3 py-2 border rounded-lg text-sm"
                                >
                                    <option value="top">上</option>
                                    <option value="middle">中</option>
                                    <option value="bottom">下</option>
                                </select>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-600 mb-1">サイズ</label>
                                <select
                                    value={shortcuts.find(s => s.side === 'right')?.size || 'small'}
                                    onChange={(e) => {
                                        const updated = shortcuts.map(s =>
                                            s.side === 'right' ? { ...s, size: e.target.value } : s
                                        );
                                        onUpdateShortcuts(updated);
                                    }}
                                    className="w-full px-3 py-2 border rounded-lg text-sm"
                                >
                                    <option value="small">小</option>
                                    <option value="medium">中</option>
                                    <option value="large">大</option>
                                </select>
                            </div>
                        </div>

                        <div className="space-y-2">
                            {(() => {
                                const allItems = [
                                    { action: 'open_body_composition', label: '体組成', icon: 'Activity', color: 'text-teal-600' },
                                    { action: 'open_meal', label: '食事', icon: 'Utensils', color: 'text-green-600' },
                                    { action: 'open_meal_photo', label: '写真解析', icon: 'Camera', color: 'text-green-600' },
                                    { action: 'open_workout', label: '運動', icon: 'Dumbbell', color: 'text-orange-600' },
                                    { action: 'open_condition', label: 'コンディション', icon: 'HeartPulse', color: 'text-red-600' },
                                    { action: 'open_idea', label: '閃き', icon: 'Lightbulb', color: 'text-yellow-500' },
                                    { action: 'open_analysis', label: '分析', icon: 'PieChart', color: 'text-indigo-600' },
                                    { action: 'open_history', label: '履歴', icon: 'TrendingUp', color: 'text-blue-600' },
                                    { action: 'open_pgbase', label: 'PGBASE', icon: 'BookOpen', color: 'text-cyan-600' },
                                    { action: 'open_community', label: 'COMY', icon: 'Users', color: 'text-blue-600' },
                                    { action: 'open_settings', label: '設定', icon: 'Settings', color: 'text-gray-600' }
                                ];

                                // 右側の項目リストを取得
                                const rightShortcuts = shortcuts
                                    .filter(s => s.side === 'right' && s.enabled)
                                    .sort((a, b) => (a.order || 0) - (b.order || 0));

                                const [draggedIndex, setDraggedIndex] = React.useState(null);

                                return (
                                    <>
                                        {rightShortcuts.map((shortcut, index) => {
                                            const item = allItems.find(i => i.action === shortcut.action);
                                            if (!item) return null;
                                            const isDragging = draggedIndex === index;

                                            return (
                                                <div
                                                    key={`${shortcut.action}-${index}`}
                                                    draggable
                                                    onDragStart={(e) => {
                                                        setDraggedIndex(index);
                                                        e.dataTransfer.effectAllowed = 'move';
                                                    }}
                                                    onDragOver={(e) => {
                                                        e.preventDefault();
                                                        e.dataTransfer.dropEffect = 'move';
                                                    }}
                                                    onDrop={(e) => {
                                                        e.preventDefault();
                                                        if (draggedIndex === null || draggedIndex === index) return;

                                                        const updated = [...shortcuts];
                                                        const rightItems = updated.filter(s => s.side === 'right' && s.enabled);
                                                        const [draggedItem] = rightItems.splice(draggedIndex, 1);
                                                        rightItems.splice(index, 0, draggedItem);

                                                        // order値を更新
                                                        rightItems.forEach((item, i) => {
                                                            const idx = updated.findIndex(s => s === item);
                                                            if (idx !== -1) updated[idx].order = i;
                                                        });

                                                        onUpdateShortcuts(updated);
                                                        setDraggedIndex(null);
                                                    }}
                                                    onDragEnd={() => setDraggedIndex(null)}
                                                    className={`flex items-center gap-3 p-2 bg-white border rounded-lg ${
                                                        isDragging ? 'opacity-50' : ''
                                                    }`}
                                                >
                                                    <Icon name="GripHorizontal" size={16} className="text-gray-400 cursor-move" />
                                                    <Icon name={item.icon} size={18} className={item.color} />
                                                    <span className="flex-1 text-sm font-medium text-gray-800">
                                                        {item.label}
                                                    </span>
                                                    <button
                                                        onClick={() => {
                                                            const updated = shortcuts.map(s =>
                                                                s === shortcut ? { ...s, enabled: false } : s
                                                            );
                                                            onUpdateShortcuts(updated);
                                                        }}
                                                        className="p-1 text-red-500 hover:text-red-700 hover:bg-red-50 rounded transition"
                                                    >
                                                        <Icon name="X" size={16} />
                                                    </button>
                                                </div>
                                            );
                                        })}

                                        {/* 項目を追加ボタン */}
                                        <div className="flex items-center gap-2 p-2 bg-gray-50 border border-dashed rounded-lg">
                                            <Icon name="Plus" size={16} className="text-gray-400" />
                                            <select
                                                onChange={(e) => {
                                                    if (!e.target.value) return;
                                                    const action = e.target.value;
                                                    const maxOrder = Math.max(...shortcuts.filter(s => s.side === 'right' && s.enabled).map(s => s.order || 0), -1);

                                                    // 既存の項目を探す
                                                    const existingIndex = shortcuts.findIndex(s => s.action === action);
                                                    let updated;

                                                    if (existingIndex !== -1) {
                                                        // 既存項目を有効化
                                                        updated = shortcuts.map((s, i) =>
                                                            i === existingIndex ? { ...s, side: 'right', enabled: true, order: maxOrder + 1 } : s
                                                        );
                                                    } else {
                                                        // 新規追加
                                                        updated = [...shortcuts, {
                                                            action,
                                                            side: 'right',
                                                            enabled: true,
                                                            order: maxOrder + 1,
                                                            position: 'middle',
                                                            size: 'small'
                                                        }];
                                                    }

                                                    onUpdateShortcuts(updated);
                                                    e.target.value = '';
                                                }}
                                                className="flex-1 px-3 py-1.5 text-sm border-none bg-transparent text-gray-600 cursor-pointer"
                                                defaultValue=""
                                            >
                                                <option value="">項目を追加...</option>
                                                {allItems.map(item => (
                                                    <option key={item.action} value={item.action}>
                                                        {item.label}
                                                    </option>
                                                ))}
                                            </select>
                                        </div>
                                    </>
                                );
                            })()}
                        </div>
                    </div>
                </div>
            </details>
            )}

            {/* テンプレート - 初日から開放 */}
            <details className="border rounded-lg">
                <summary className="cursor-pointer p-4 hover:bg-gray-50 font-medium flex items-center gap-2">
                    <Icon name="BookTemplate" size={18} className="text-blue-600" />
                    テンプレート                            <Icon name="ChevronDown" size={16} className="ml-auto text-gray-400" />
                </summary>
                <div className="p-4 pt-0 border-t">
                <div className="space-y-4">
                    <p className="text-sm text-gray-600">保存したテンプレートを管理できます。ルーティンに紐づけて使用することも可能です。</p>

                    {/* 無料会員の制限警告 */}
                    {userProfile?.subscriptionStatus !== 'active' && usageDays >= 7 && (
                        <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
                            <div className="flex items-start gap-2">
                                <Icon name="AlertCircle" size={18} className="text-amber-600 flex-shrink-0 mt-0.5" />
                                <div className="text-sm">
                                    <p className="font-medium text-amber-800 mb-1">無料会員の制限</p>
                                    <p className="text-amber-700 text-xs">
                                        食事・運動テンプレートは各1枠のみ作成可能です。既存のテンプレートを編集または削除すると、再度作成できます。
                                    </p>
                                    <p className="text-amber-700 text-xs mt-1">
                                        ⚠️ トライアル期間中に作成したテンプレートは、無料期間終了後は使用できません（Premium会員は制限なし）。
                                    </p>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* 食事テンプレート*/}
                    <div className="border rounded-lg p-4">
                        <div className="mb-3">
                            <h3 className="font-semibold text-green-800 mb-2">食事テンプレート</h3>
                            <div className="flex items-center justify-between">
                                <span className="text-sm text-gray-600">{mealTemplates.length}件</span>
                                <button
                                    onClick={() => onOpenAddView && onOpenAddView('meal')}
                                    className="px-3 py-1 bg-[#4A9EFF] text-white text-xs rounded-lg hover:bg-[#3b8fef] transition flex items-center gap-1"
                                >
                                    <Icon name="Plus" size={14} />
                                    作成
                                </button>
                            </div>
                        </div>
                        {mealTemplates.length === 0 ? (
                            <p className="text-sm text-gray-600">保存されたテンプレートはありません</p>
                        ) : (
                            <div className="space-y-2 mt-3">
                                {mealTemplates.map(template => {
                                    const totalCals = (template.items || []).reduce((sum, i) => sum + (i.calories || 0), 0);
                                    const totalProtein = (template.items || []).reduce((sum, i) => sum + (i.protein || 0), 0);
                                    const totalFat = (template.items || []).reduce((sum, i) => sum + (i.fat || 0), 0);
                                    const totalCarbs = (template.items || []).reduce((sum, i) => sum + (i.carbs || 0), 0);

                                    // トライアル中作成テンプレートのロック判定
                                    const isLocked = template.isTrialCreated && userProfile?.subscriptionStatus !== 'active' && usageDays >= 7;

                                    return (
                                        <details key={template.id} className={`p-3 rounded-lg ${isLocked ? 'bg-gray-100 opacity-60' : 'bg-gray-50'}`}>
                                            <summary className="flex items-center justify-between cursor-pointer hover:bg-gray-100 -m-3 p-3 rounded-lg">
                                                <div className="flex-1">
                                                    <div className="flex items-center gap-2">
                                                        <p className="font-medium text-sm">{template.name}</p>
                                                        {isLocked && (
                                                            <Icon name="Lock" size={14} className="text-amber-600" title="トライアル期間中作成のため利用不可" />
                                                        )}
                                                    </div>
                                                    <p className="text-xs text-gray-600">
                                                        {template.items?.length || 0}品目 | {Math.round(totalCals)}kcal
                                                    </p>
                                                </div>
                                                <div className="flex items-center gap-1">
                                                    <button
                                                        onClick={(e) => {
                                                            e.preventDefault();
                                                            setTemplateEditType('meal');
                                                            setShowTemplateEditModal(true);
                                                        }}
                                                        className="min-w-[44px] min-h-[44px] rounded-lg bg-white shadow-md flex items-center justify-center text-[#4A9EFF] hover:bg-blue-50 transition border-2 border-[#4A9EFF]"
                                                    >
                                                        <Icon name="Edit" size={18} />
                                                    </button>
                                                    <button
                                                        onClick={async (e) => {
                                                            e.preventDefault();

                                                            // ルーティンでの使用状況をチェック
                                                            const usingRoutines = localRoutines.filter(routine =>
                                                                (routine.mealTemplates || []).includes(template.id)
                                                            );

                                                            let confirmMessage = 'このテンプレートを削除しますか？';
                                                            if (usingRoutines.length > 0) {
                                                                const routineNames = usingRoutines.map(r => r.name).join('、');
                                                                confirmMessage = `このテンプレートは以下のルーティンで使用されています：\n${routineNames}\n\n削除すると、これらのルーティンからも削除されます。よろしいですか？`;
                                                            }

                                                            showConfirm('テンプレート削除の確認', confirmMessage, async () => {
                                                                try {
                                                                    // ルーティンからテンプレートIDを削除（Firestore）
                                                                    if (usingRoutines.length > 0) {
                                                                        const batch = firebase.firestore().batch();
                                                                        usingRoutines.forEach(routine => {
                                                                            const docRef = firebase.firestore()
                                                                                .collection('users')
                                                                                .doc(userId)
                                                                                .collection('routines')
                                                                                .doc(routine.firestoreId);

                                                                            batch.update(docRef, {
                                                                                mealTemplates: (routine.mealTemplates || []).filter(id => id !== template.id)
                                                                            });
                                                                        });
                                                                        await batch.commit();
                                                                    }

                                                                    // テンプレートを削除
                                                                    await window.DataService.deleteMealTemplate(userId, template.id);
                                                                    await loadTemplates();
                                                                    await loadRoutines();
                                                                } catch (error) {
                                                                    console.error('[FeaturesTab] Failed to delete meal template:', error);
                                                                    toast.error('削除に失敗しました');
                                                                }
                                                            });
                                                        }}
                                                        className="min-w-[44px] min-h-[44px] rounded-lg bg-white shadow-md flex items-center justify-center text-red-600 hover:bg-red-50 transition border-2 border-red-500"
                                                    >
                                                        <Icon name="Trash2" size={18} />
                                                    </button>
                                                </div>
                                            </summary>
                                            <div className="mt-3 space-y-2 border-t pt-3">
                                                <div className="text-xs bg-white p-2 rounded flex items-center justify-end gap-2">
                                                    <span className="text-blue-600 font-bold">{Math.round(totalCals)}kcal</span>
                                                    <span className="text-gray-400">|</span>
                                                    <span className="text-red-500 font-bold">P {totalProtein.toFixed(1)}g</span>
                                                    <span className="text-yellow-500 font-bold">F {totalFat.toFixed(1)}g</span>
                                                    <span className="text-green-500 font-bold">C {totalCarbs.toFixed(1)}g</span>
                                                </div>
                                                {(template.items || []).map((item, idx) => (
                                                    <div key={idx} className="text-xs bg-white p-2 rounded">
                                                        <div className="font-medium mb-1">{item.name} ({item.amount}g)</div>
                                                        <div className="text-gray-600">
                                                            <span className="text-blue-600 font-semibold">{Math.round(item.calories)}kcal</span> | <span className="text-red-500 font-semibold">P{item.protein.toFixed(1)}</span> <span className="text-yellow-500 font-semibold">F{item.fat.toFixed(1)}</span> <span className="text-green-500 font-semibold">C{item.carbs.toFixed(1)}</span>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        </details>
                                    );
                                })}
                            </div>
                        )}
                    </div>

                    {/* 運動テンプレート*/}
                    <div className="border rounded-lg p-4">
                        <div className="mb-3">
                            <h3 className="font-semibold text-orange-800 mb-2">運動テンプレート</h3>
                            <div className="flex items-center justify-between">
                                <span className="text-sm text-gray-600">{workoutTemplates.length}件</span>
                                <button
                                    onClick={() => onOpenAddView && onOpenAddView('workout')}
                                    className="px-3 py-1 bg-[#4A9EFF] text-white text-xs font-bold rounded-lg hover:bg-[#3b8fef] shadow-md transition flex items-center gap-1"
                                >
                                    <Icon name="Plus" size={14} />
                                    作成
                                </button>
                            </div>
                        </div>
                        {workoutTemplates.length === 0 ? (
                            <p className="text-sm text-gray-600">保存されたテンプレートはありません</p>
                        ) : (
                            <div className="space-y-2 mt-3">
                                {workoutTemplates.map(template => {
                                    // 新形式（複数種目）と旧形式（単一種目）の両方に対応
                                    const exercises = template.exercises || (template.exercise ? [{ exercise: template.exercise, sets: template.sets || [] }] : []);
                                    const exerciseCount = exercises.length;
                                    const totalSets = exercises.reduce((sum, ex) => sum + (ex.sets?.length || 0), 0);
                                    const totalDuration = exercises.reduce((sum, ex) => sum + (ex.sets || []).reduce((s, set) => s + (set.duration || 0), 0), 0);

                                    // トライアル中作成テンプレートのロック判定
                                    const isLocked = template.isTrialCreated && userProfile?.subscriptionStatus !== 'active' && usageDays >= 7;

                                    return (
                                        <details key={template.id} className={`p-3 rounded-lg ${isLocked ? 'bg-gray-100 opacity-60' : 'bg-gray-50'}`}>
                                            <summary className="flex items-center justify-between cursor-pointer hover:bg-gray-100 -m-3 p-3 rounded-lg">
                                                <div className="flex-1">
                                                    <div className="flex items-center gap-2">
                                                        <p className="font-medium text-sm">{template.name}</p>
                                                        {isLocked && (
                                                            <Icon name="Lock" size={14} className="text-amber-600" title="トライアル期間中作成のため利用不可" />
                                                        )}
                                                    </div>
                                                    <p className="text-xs text-gray-600">
                                                        {exerciseCount}種目 | {totalSets}セット | {totalDuration}分
                                                    </p>
                                                </div>
                                                <div className="flex items-center gap-1">
                                                    <button
                                                        onClick={(e) => {
                                                            e.preventDefault();
                                                            setTemplateEditType('workout');
                                                            setShowTemplateEditModal(true);
                                                        }}
                                                        className="min-w-[44px] min-h-[44px] rounded-lg bg-white shadow-md flex items-center justify-center text-[#4A9EFF] hover:bg-blue-50 transition border-2 border-[#4A9EFF]"
                                                    >
                                                        <Icon name="Edit" size={18} />
                                                    </button>
                                                    <button
                                                        onClick={async (e) => {
                                                            e.preventDefault();

                                                            // ルーティンでの使用状況をチェック
                                                            const usingRoutines = localRoutines.filter(routine =>
                                                                (routine.workoutTemplates || []).includes(template.id)
                                                            );

                                                            let confirmMessage = 'このテンプレートを削除しますか？';
                                                            if (usingRoutines.length > 0) {
                                                                const routineNames = usingRoutines.map(r => r.name).join('、');
                                                                confirmMessage = `このテンプレートは以下のルーティンで使用されています：\n${routineNames}\n\n削除すると、これらのルーティンからも削除されます。よろしいですか？`;
                                                            }

                                                            showConfirm('テンプレート削除の確認', confirmMessage, async () => {
                                                                try {
                                                                    // ルーティンからテンプレートIDを削除（Firestore）
                                                                    if (usingRoutines.length > 0) {
                                                                        const batch = firebase.firestore().batch();
                                                                        usingRoutines.forEach(routine => {
                                                                            const docRef = firebase.firestore()
                                                                                .collection('users')
                                                                                .doc(userId)
                                                                                .collection('routines')
                                                                                .doc(routine.firestoreId);

                                                                            batch.update(docRef, {
                                                                                workoutTemplates: (routine.workoutTemplates || []).filter(id => id !== template.id)
                                                                            });
                                                                        });
                                                                        await batch.commit();
                                                                    }

                                                                    // テンプレートを削除
                                                                    await window.DataService.deleteWorkoutTemplate(userId, template.id);
                                                                    await loadTemplates();
                                                                    await loadRoutines();
                                                                } catch (error) {
                                                                    console.error('[FeaturesTab] Failed to delete workout template:', error);
                                                                    toast.error('削除に失敗しました');
                                                                }
                                                            });
                                                        }}
                                                        className="min-w-[44px] min-h-[44px] rounded-lg bg-white shadow-md flex items-center justify-center text-red-600 hover:bg-red-50 transition border-2 border-red-500"
                                                    >
                                                        <Icon name="Trash2" size={18} />
                                                    </button>
                                                </div>
                                            </summary>
                                            <div className="mt-3 space-y-2 border-t pt-3">
                                                {/* 集計情報 */}
                                                {(() => {
                                                    const totalWeight = exercises.reduce((sum, ex) =>
                                                        sum + (ex.sets || []).reduce((s, set) => s + (set.weight || 0), 0), 0
                                                    );
                                                    const warmupSets = exercises.reduce((sum, ex) =>
                                                        sum + (ex.sets || []).filter(set => set.isWarmup).length, 0
                                                    );
                                                    const mainSets = exercises.reduce((sum, ex) =>
                                                        sum + (ex.sets || []).filter(set => !set.isWarmup).length, 0
                                                    );

                                                    return (
                                                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs bg-white p-2 rounded mb-2">
                                                            <div className="text-center">
                                                                <div className="font-medium text-gray-600">総目</div>
                                                                <div className="font-bold text-orange-600">{exerciseCount}種目</div>
                                                            </div>
                                                            <div className="text-center">
                                                                <div className="font-medium text-gray-600">総セット</div>
                                                                <div className="font-bold text-orange-600">
                                                                    {totalSets}セット
                                                                    <div className="text-xs text-gray-500">アップ: {warmupSets} / メイン: {mainSets}</div>
                                                                </div>
                                                            </div>
                                                            {totalWeight > 0 && (
                                                                <div className="text-center">
                                                                    <div className="font-medium text-gray-600">総重量</div>
                                                                    <div className="font-bold text-orange-600">{Math.round(totalWeight)} kg</div>
                                                                </div>
                                                            )}
                                                            {totalDuration > 0 && (
                                                                <div className="text-center">
                                                                    <div className="font-medium text-gray-600">総時間</div>
                                                                    <div className="font-bold text-orange-600">{totalDuration} 分</div>
                                                                </div>
                                                            )}
                                                        </div>
                                                    );
                                                })()}

                                                {/* 種目ごとの詳細 */}
                                                {exercises.map((ex, exIdx) => {
                                                    const exerciseName = typeof ex.exercise === 'string' ? ex.exercise : (ex.exercise?.name || '運動');
                                                    return (
                                                        <div key={exIdx} className="space-y-2">
                                                            <div className="text-xs font-semibold text-orange-600 bg-orange-50 p-2 rounded">
                                                                {exerciseName}
                                                            </div>
                                                            {(ex.sets || []).map((set, setIdx) => (
                                                                <div key={setIdx} className="text-xs bg-white p-2 rounded ml-2">
                                                                    <div className="font-medium mb-1">
                                                                        {set.isWarmup ? 'アップ' : 'メイン'}セット{setIdx + 1}
                                                                    </div>
                                                                    <div className="text-gray-600 text-xs flex flex-wrap gap-2">
                                                                        {set.weight > 0 && <span>{set.weight}kg</span>}
                                                                        {set.reps > 0 && <span>×{set.reps}回</span>}
                                                                        {set.duration > 0 && <span>{set.duration}分</span>}
                                                                    </div>
                                                                </div>
                                                            ))}
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        </details>
                                    );
                                })}
                            </div>
                        )}
                    </div>

                </div>
                </div>
            </details>

            {/* ルーティン - 初回分析後に開放 */}
            {false && (
            <details className="border rounded-lg">
                <summary className="cursor-pointer p-4 hover:bg-gray-50 font-medium flex items-center gap-2">
                    <Icon name="Package" size={18} className="text-blue-600" />
                    旧カスタムアイテム管理（削除予定）
                    <Icon name="ChevronDown" size={16} className="ml-auto text-gray-400" />
                </summary>
                <div className="p-4 pt-0 border-t">
                    <div className="space-y-4">
                        <p className="text-sm text-gray-600">手動で作成した食材・料理・サプリを管理できます。</p>

                        {(() => {
                            const [customItemTab, setCustomItemTab] = React.useState('food');
                            const [customFoods, setCustomFoods] = React.useState(() => {
                                const saved = localStorage.getItem('customFoods');
                                return saved ? JSON.parse(saved) : [];
                            });

                            const foodItems = customFoods.filter(item => item.itemType === 'food');
                            const recipeItems = customFoods.filter(item => item.itemType === 'recipe');
                            const supplementItems = customFoods.filter(item => item.itemType === 'supplement');

                            const deleteItem = (index) => {
                                showConfirm('アイテム削除の確認', 'このアイテムを削除しますか？', () => {
                                    const updated = customFoods.filter((_, i) => i !== index);
                                    setCustomFoods(updated);
                                    localStorage.setItem('customFoods', JSON.stringify(updated));
                                });
                            };

                            const deleteAllByType = (itemType) => {
                                const typeName = itemType === 'food' ? '食材' : itemType === 'recipe' ? '料理' : 'サプリ';
                                showConfirm('全削除の確認', `すべての${typeName}を削除しますか？`, () => {
                                    const updated = customFoods.filter(item => item.itemType !== itemType);
                                    setCustomFoods(updated);
                                    localStorage.setItem('customFoods', JSON.stringify(updated));
                                });
                            };

                            const editItem = (item, index) => {
                                // TODO: Open edit modal with the same form as custom creation
                                toast('編集機能は次の更新で実装予定です');
                            };

                            return (
                                <>
                                    {/* タブ切り替え */}
                                    <div className="flex gap-2 border-b">
                                        <button
                                            onClick={() => setCustomItemTab('food')}
                                            className={`px-4 py-2 font-medium transition ${
                                                customItemTab === 'food'
                                                    ? 'border-b-2 border-green-600 text-green-600'
                                                    : 'text-gray-600 hover:text-gray-600'
                                            }`}
                                        >
                                            食材 ({foodItems.length})
                                        </button>
                                        <button
                                            onClick={() => setCustomItemTab('recipe')}
                                            className={`px-4 py-2 font-medium transition ${
                                                customItemTab === 'recipe'
                                                    ? 'border-b-2 border-green-600 text-green-600'
                                                    : 'text-gray-600 hover:text-gray-600'
                                            }`}
                                        >
                                            料理 ({recipeItems.length})
                                        </button>
                                        <button
                                            onClick={() => setCustomItemTab('supplement')}
                                            className={`px-4 py-2 font-medium transition ${
                                                customItemTab === 'supplement'
                                                    ? 'border-b-2 border-blue-600 text-blue-600'
                                                    : 'text-gray-600 hover:text-gray-600'
                                            }`}
                                        >
                                            サプリ ({supplementItems.length})
                                        </button>
                                    </div>

                                    {/* アイテム一覧 */}
                                    <div className="space-y-2">
                                        {customItemTab === 'food' && (
                                            <>
                                                {foodItems.length === 0 ? (
                                                    <p className="text-sm text-gray-600 py-4 text-center">カスタム食材はありません</p>
                                                ) : (
                                                    <>
                                                        <div className="flex justify-end mb-2">
                                                            <button
                                                                onClick={() => deleteAllByType('food')}
                                                                className="px-3 py-1 bg-red-100 text-red-600 text-xs rounded-lg hover:bg-red-200 transition"
                                                            >
                                                                すべて削除
                                                            </button>
                                                        </div>
                                                        {foodItems.map((item, idx) => {
                                                            const actualIndex = customFoods.findIndex(f => f === item);
                                                            return (
                                                                <div key={idx} className="bg-gray-50 p-3 rounded-lg border flex justify-between items-center">
                                                                    <div className="flex-1">
                                                                        <p className="font-medium text-sm">{item.name}</p>
                                                                        <p className="text-xs text-gray-600">
                                                                            {item.servingSize}{item.servingUnit}あたり | <span className="text-blue-600 font-semibold">{item.calories}kcal</span> | <span className="text-red-500 font-semibold">P:{item.protein}g</span> <span className="text-yellow-500 font-semibold">F:{item.fat}g</span> <span className="text-green-500 font-semibold">C:{item.carbs}g</span>
                                                                        </p>
                                                                    </div>
                                                                    <div className="flex gap-1">
                                                                        <button
                                                                            onClick={() => editItem(item, actualIndex)}
                                                                            className="p-2 text-blue-500 hover:text-blue-700 hover:bg-blue-50 rounded transition"
                                                                        >
                                                                            <Icon name="Edit" size={16} />
                                                                        </button>
                                                                        <button
                                                                            onClick={() => deleteItem(actualIndex)}
                                                                            className="p-2 text-red-500 hover:text-red-700 hover:bg-red-50 rounded transition"
                                                                        >
                                                                            <Icon name="Trash2" size={16} />
                                                                        </button>
                                                                    </div>
                                                                </div>
                                                            );
                                                        })}
                                                    </>
                                                )}
                                            </>
                                        )}

                                        {customItemTab === 'recipe' && (
                                            <>
                                                {recipeItems.length === 0 ? (
                                                    <p className="text-sm text-gray-600 py-4 text-center">カスタム料理はありません</p>
                                                ) : (
                                                    <>
                                                        <div className="flex justify-end mb-2">
                                                            <button
                                                                onClick={() => deleteAllByType('recipe')}
                                                                className="px-3 py-1 bg-red-100 text-red-600 text-xs rounded-lg hover:bg-red-200 transition"
                                                            >
                                                                すべて削除
                                                            </button>
                                                        </div>
                                                        {recipeItems.map((item, idx) => {
                                                            const actualIndex = customFoods.findIndex(f => f === item);
                                                            return (
                                                                <div key={idx} className="bg-gray-50 p-3 rounded-lg border flex justify-between items-center">
                                                                    <div className="flex-1">
                                                                        <p className="font-medium text-sm">{item.name}</p>
                                                                        <p className="text-xs text-gray-600">
                                                                            {item.servingSize}{item.servingUnit}あたり | <span className="text-blue-600 font-semibold">{item.calories}kcal</span> | <span className="text-red-500 font-semibold">P:{item.protein}g</span> <span className="text-yellow-500 font-semibold">F:{item.fat}g</span> <span className="text-green-500 font-semibold">C:{item.carbs}g</span>
                                                                        </p>
                                                                    </div>
                                                                    <div className="flex gap-1">
                                                                        <button
                                                                            onClick={() => editItem(item, actualIndex)}
                                                                            className="p-2 text-blue-500 hover:text-blue-700 hover:bg-blue-50 rounded transition"
                                                                        >
                                                                            <Icon name="Edit" size={16} />
                                                                        </button>
                                                                        <button
                                                                            onClick={() => deleteItem(actualIndex)}
                                                                            className="p-2 text-red-500 hover:text-red-700 hover:bg-red-50 rounded transition"
                                                                        >
                                                                            <Icon name="Trash2" size={16} />
                                                                        </button>
                                                                    </div>
                                                                </div>
                                                            );
                                                        })}
                                                    </>
                                                )}
                                            </>
                                        )}

                                        {customItemTab === 'supplement' && (
                                            <>
                                                {supplementItems.length === 0 ? (
                                                    <p className="text-sm text-gray-600 py-4 text-center">カスタムサプリはありません</p>
                                                ) : (
                                                    <>
                                                        <div className="flex justify-end mb-2">
                                                            <button
                                                                onClick={() => deleteAllByType('supplement')}
                                                                className="px-3 py-1 bg-red-100 text-red-600 text-xs rounded-lg hover:bg-red-200 transition"
                                                            >
                                                                すべて削除
                                                            </button>
                                                        </div>
                                                        {supplementItems.map((item, idx) => {
                                                            const actualIndex = customFoods.findIndex(f => f === item);
                                                            return (
                                                                <div key={idx} className="bg-gray-50 p-3 rounded-lg border flex justify-between items-center">
                                                                    <div className="flex-1">
                                                                        <p className="font-medium text-sm">{item.name}</p>
                                                                        <p className="text-xs text-gray-600">
                                                                            {item.servingSize}{item.servingUnit}あたり | <span className="text-blue-600 font-semibold">{item.calories}kcal</span> | <span className="text-red-500 font-semibold">P:{item.protein}g</span> <span className="text-yellow-500 font-semibold">F:{item.fat}g</span> <span className="text-green-500 font-semibold">C:{item.carbs}g</span>
                                                                        </p>
                                                                    </div>
                                                                    <div className="flex gap-1">
                                                                        <button
                                                                            onClick={() => editItem(item, actualIndex)}
                                                                            className="p-2 text-blue-500 hover:text-blue-700 hover:bg-blue-50 rounded transition"
                                                                        >
                                                                            <Icon name="Edit" size={16} />
                                                                        </button>
                                                                        <button
                                                                            onClick={() => deleteItem(actualIndex)}
                                                                            className="p-2 text-red-500 hover:text-red-700 hover:bg-red-50 rounded transition"
                                                                        >
                                                                            <Icon name="Trash2" size={16} />
                                                                        </button>
                                                                    </div>
                                                                </div>
                                                            );
                                                        })}
                                                    </>
                                                )}
                                            </>
                                        )}
                                    </div>
                                </>
                            );
                        })()}
                    </div>
                </div>
            </details>
            )}

            {/* ルーティン - 初回分析後に開放 */}
            {unlockedFeatures.includes('routine') && (
            <details className="border rounded-lg">
                <summary className="cursor-pointer p-4 hover:bg-gray-50 font-medium flex items-center gap-2">
                    <Icon name="Repeat" size={18} className="text-blue-600" />
                    ルーティン
                    <Icon name="ChevronDown" size={16} className="ml-auto text-gray-400" />
                </summary>
                <div className="p-4 pt-0 border-t">
                    {/* ルーティン作成 */}
                    <div className="space-y-4">
                    <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
                        <h4 className="font-bold text-blue-900 mb-2">ルーティン管理</h4>
                        <p className="text-sm text-blue-700">
                            Day1~7のデフォルトルーティンと、最大5つまで追加可能な追加枠を設定できます。                                </p>
                    </div>

                    {(() => {
                        const [showRestartModal, setShowRestartModal] = React.useState(false);
                        const [selectedRestartDay, setSelectedRestartDay] = React.useState(1);

                        const saveRoutines = async (updated) => {
                            try {
                                // Firestoreに保存
                                const batch = firebase.firestore().batch();
                                updated.forEach(routine => {
                                    if (routine.firestoreId) {
                                        // 既存のルーティンを更新
                                        const docRef = firebase.firestore()
                                            .collection('users')
                                            .doc(userId)
                                            .collection('routines')
                                            .doc(routine.firestoreId);
                                        const { firestoreId, ...data } = routine;
                                        batch.set(docRef, data, { merge: true });
                                    } else {
                                        // 新規ルーティンを作成
                                        const docRef = firebase.firestore()
                                            .collection('users')
                                            .doc(userId)
                                            .collection('routines')
                                            .doc();
                                        batch.set(docRef, routine);
                                    }
                                });
                                await batch.commit();
                                await loadRoutines();
                            } catch (error) {
                                console.error('[FeaturesTab] Failed to save routines:', error);
                                toast.error('ルーティンの保存に失敗しました');
                            }
                        };

                        const updateRoutine = (id, updates) => {
                            const updated = localRoutines.map(r => r.id === id ? { ...r, ...updates } : r);
                            saveRoutines(updated);
                        };

                        const addRoutine = () => {
                            if (localRoutines.length >= 12) {
                                toast('ルーティンは最大12個（Day 1～7 + 追加5枠）まで設定できます');
                                return;
                            }
                            const nextId = Math.max(...localRoutines.map(r => r.id), 0) + 1;
                            const updated = [...localRoutines, {
                                id: nextId,
                                name: `Day ${nextId}`,
                                splitType: '',
                                isRestDay: false
                            }];
                            saveRoutines(updated);
                        };

                        const deleteRoutine = (id) => {
                            if (id <= 7) {
                                toast.error('Day 1～7は削除できません');
                                return;
                            }
                            showConfirm('追加枠削除の確認', 'この追加枠を削除しますか？', () => {
                                const updated = localRoutines.filter(r => r.id !== id);
                                saveRoutines(updated);
                            });
                        };

                        const resetToDefaultRoutine = async () => {
                            showConfirm(
                                'デフォルトルーティンに戻す',
                                'ルーティンをデフォルト（胸→背中→休み→肩→腕→脚→休み）に戻しますか？\n\n現在の設定は失われます。',
                                async () => {
                                    try {
                                        // Firestoreの既存ルーティンをすべて削除
                                        const routinesSnapshot = await firebase.firestore()
                                            .collection('users')
                                            .doc(userId)
                                            .collection('routines')
                                            .get();

                                        const batch = firebase.firestore().batch();
                                        routinesSnapshot.docs.forEach(doc => {
                                            batch.delete(doc.ref);
                                        });
                                        await batch.commit();

                                        // デフォルトルーティンを作成
                                        // Firestoreに保存
                                        const batch2 = firebase.firestore().batch();
                                        DEFAULT_ROUTINES.forEach(routine => {
                                            const docRef = firebase.firestore()
                                                .collection('users')
                                                .doc(userId)
                                                .collection('routines')
                                                .doc();
                                            batch2.set(docRef, routine);
                                        });
                                        await batch2.commit();

                                        // ルーティン設定を更新
                                        await firebase.firestore()
                                            .collection('users')
                                            .doc(userId)
                                            .set({
                                                routineStartDate: new Date().toISOString(),
                                                routineActive: true
                                            }, { merge: true });

                                        toast.success('デフォルトルーティンに戻しました');

                                        // ルーティンを再読み込み
                                        await loadRoutines();
                                    } catch (error) {
                                        console.error('[Settings] Failed to reset routine:', error);
                                        toast.error('リセットに失敗しました');
                                    }
                                }
                            );
                        };

                        return (
                            <div className="space-y-6">
                                {/* デフォルトルーティンに戻すボタン */}
                                <div className="bg-blue-50 border-l-4 border-blue-600 p-4 rounded">
                                    <div className="flex items-start justify-between gap-4">
                                        <div className="flex-1">
                                            <h4 className="font-bold text-blue-900 mb-1 flex items-center gap-2">
                                                <Icon name="RotateCcw" size={18} />
                                                デフォルトルーティンに戻す
                                            </h4>
                                            <p className="text-sm text-blue-800">
                                                ルーティンを初期設定（胸→背中→休み→肩→腕→脚→休み）に戻します。
                                            </p>
                                        </div>
                                        <button
                                            onClick={resetToDefaultRoutine}
                                            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition font-medium text-sm whitespace-nowrap flex items-center gap-2"
                                        >
                                            <Icon name="RotateCcw" size={16} />
                                            リセット
                                        </button>
                                    </div>
                                </div>

                                {/* Day1~7 */}
                                <div>
                                    <h3 className="font-semibold mb-3">Day 1～7（デフォルト）</h3>
                                    <div className="space-y-3">
                                        {localRoutines.filter(r => r.id <= 7).map((routine, index) => (
                                            <div key={`routine-${routine.id}-${routine.firestoreId || index}`} className="border rounded-lg p-4 bg-white">
                                                <div className="flex items-center gap-3 mb-3">
                                                    <input
                                                        type="text"
                                                        value={routine.name}
                                                        onChange={(e) => updateRoutine(routine.id, { name: e.target.value })}
                                                        className="font-bold text-[#4A9EFF] bg-transparent border-b border-blue-300 focus:outline-none w-32"
                                                    />
                                                    <label className="flex items-center gap-2 text-sm">
                                                        <input
                                                            type="checkbox"
                                                            checked={routine.isRestDay}
                                                            onChange={(e) => updateRoutine(routine.id, {
                                                                isRestDay: e.target.checked,
                                                                splitType: e.target.checked ? '' : routine.splitType
                                                            })}
                                                            className="rounded"
                                                        />
                                                        休養日
                                                    </label>
                                                </div>
                                                <div className="space-y-3">
                                                    {!routine.isRestDay && (
                                                        <div>
                                                            <label className="font-medium text-sm">分類</label>
                                                            {(() => {
                                                                const presetOptions = ["胸", "背中", "肩", "腕", "脚", "背", "尻", "腹筋・体幹", "上半身", "下半身", "全身", "プッシュ（押す）", "プル（引く）", "有酸素", "胸・三頭", "背中・二頭", "肩・腕"];
                                                                const isCustomValue = routine.splitType && !presetOptions.includes(routine.splitType);

                                                                return (
                                                                    <select
                                                                        value={isCustomValue ? '__custom_display__' : routine.splitType}
                                                                        onChange={(e) => {
                                                                            if (e.target.value === '__custom__') {
                                                                                const custom = prompt('分割法を入力してください（例：胸・三頭・肩）', routine.splitType);
                                                                                if (custom !== null && custom.trim() !== '') {
                                                                                    updateRoutine(routine.id, { splitType: custom.trim() });
                                                                                }
                                                                            } else {
                                                                                updateRoutine(routine.id, { splitType: e.target.value });
                                                                            }
                                                                        }}
                                                                        className="w-full mt-1 p-2 border rounded-lg"
                                                                    >
                                                                        <option value="">選択してください</option>
                                                                        <option value="胸">胸</option>
                                                                        <option value="背中">背中</option>
                                                                        <option value="肩">肩</option>
                                                                        <option value="腕">腕</option>
                                                                        <option value="脚">脚</option>
                                                                        <option value="背">背</option>
                                                                        <option value="尻">尻</option>
                                                                        <option value="腹筋・体幹">腹筋・体幹</option>
                                                                        <option value="上半身">上半身</option>
                                                                        <option value="下半身">下半身</option>
                                                                        <option value="全身">全身</option>
                                                                        <option value="プッシュ（押す）">プッシュ（押す）</option>
                                                                        <option value="プル（引く）">プル（引く）</option>
                                                                        <option value="有酸素">有酸素</option>
                                                                        <option value="胸・三頭">胸・三頭</option>
                                                                        <option value="背中・二頭">背中・二頭</option>
                                                                        <option value="肩・腕">肩・腕</option>
                                                                        {isCustomValue && (
                                                                            <option value="__custom_display__">{routine.splitType}</option>
                                                                        )}
                                                                        <option value="__custom__">カスタム入力..</option>
                                                                    </select>
                                                                );
                                                            })()}
                                                        </div>
                                                    )}

                                                    {/* テンプレート紐づけ*/}
                                                        <details className="bg-purple-50 border border-purple-200 rounded-lg p-3">
                                                            <summary className="font-medium text-sm text-purple-900 cursor-pointer flex items-center gap-2 hover:text-purple-700">
                                                                <Icon name="BookTemplate" size={14} />
                                                                テンプレート紐づけ
                                                                <Icon name="ChevronDown" size={14} className="ml-auto" />
                                                            </summary>
                                                            <div className="space-y-3 mt-3">
                                                                {/* 食事テンプレート */}
                                                                <div>
                                                                    <label className="text-xs font-medium text-gray-600">食事テンプレート</label>
                                                                    {mealTemplates.length > 0 ? (
                                                                        <>
                                                                            <div className="mt-2 space-y-2">
                                                                                {(routine.mealTemplates || []).map((templateId, index) => {
                                                                                    const template = mealTemplates.find(t => t.id === templateId);
                                                                                    return (
                                                                                        <div key={index} className="flex gap-2 items-center">
                                                                                            <span className="text-xs text-gray-500 w-6">[{index + 1}]</span>
                                                                                            <select
                                                                                                value={templateId}
                                                                                                onChange={(e) => {
                                                                                                    const current = routine.mealTemplates || [];
                                                                                                    const updated = [...current];
                                                                                                    updated[index] = parseInt(e.target.value) || e.target.value;
                                                                                                    updateRoutine(routine.id, { mealTemplates: updated });
                                                                                                }}
                                                                                                className="flex-1 p-2 border rounded text-sm"
                                                                                            >
                                                                                                {mealTemplates.map(t => (
                                                                                                    <option key={t.id} value={t.id}>{t.name}</option>
                                                                                                ))}
                                                                                            </select>
                                                                                            <button
                                                                                                onClick={() => {
                                                                                                    const current = routine.mealTemplates || [];
                                                                                                    const updated = [...current];
                                                                                                    updated.splice(index, 1);
                                                                                                    updateRoutine(routine.id, { mealTemplates: updated });
                                                                                                }}
                                                                                                className="px-2 py-2 text-red-600 hover:text-red-800"
                                                                                            >
                                                                                                <Icon name="X" size={16} />
                                                                                            </button>
                                                                                        </div>
                                                                                    );
                                                                                })}
                                                                            </div>
                                                                            <button
                                                                                onClick={() => {
                                                                                    const current = routine.mealTemplates || [];
                                                                                    const firstTemplateId = mealTemplates[0]?.id;
                                                                                    if (firstTemplateId !== undefined) {
                                                                                        updateRoutine(routine.id, { mealTemplates: [...current, firstTemplateId] });
                                                                                    }
                                                                                }}
                                                                                className="w-full mt-2 py-2 border border-dashed border-blue-400 rounded text-blue-600 hover:bg-blue-50 transition text-sm"
                                                                            >
                                                                                <Icon name="Plus" size={14} className="inline mr-1" />
                                                                                枠を追加
                                                                            </button>
                                                                        </>
                                                                    ) : (
                                                                        <p className="text-xs text-gray-600 mt-2">食事テンプレートがありません</p>
                                                                    )}
                                                                </div>

                                                                {/* 運動テンプレート */}
                                                                <div>
                                                                    <label className="text-xs font-medium text-gray-600">運動テンプレート</label>
                                                                    {workoutTemplates.length > 0 ? (
                                                                        <>
                                                                            <div className="mt-2 space-y-2">
                                                                                {(routine.workoutTemplates || []).map((templateId, index) => {
                                                                                    const template = workoutTemplates.find(t => t.id === templateId);
                                                                                    return (
                                                                                        <div key={index} className="flex gap-2 items-center">
                                                                                            <span className="text-xs text-gray-500 w-6">[{index + 1}]</span>
                                                                                            <select
                                                                                                value={templateId}
                                                                                                onChange={(e) => {
                                                                                                    const current = routine.workoutTemplates || [];
                                                                                                    const updated = [...current];
                                                                                                    updated[index] = parseInt(e.target.value) || e.target.value;
                                                                                                    updateRoutine(routine.id, { workoutTemplates: updated });
                                                                                                }}
                                                                                                className="flex-1 p-2 border rounded text-sm"
                                                                                            >
                                                                                                {workoutTemplates.map(t => (
                                                                                                    <option key={t.id} value={t.id}>{t.name}</option>
                                                                                                ))}
                                                                                            </select>
                                                                                            <button
                                                                                                onClick={() => {
                                                                                                    const current = routine.workoutTemplates || [];
                                                                                                    const updated = [...current];
                                                                                                    updated.splice(index, 1);
                                                                                                    updateRoutine(routine.id, { workoutTemplates: updated });
                                                                                                }}
                                                                                                className="px-2 py-2 text-red-600 hover:text-red-800"
                                                                                            >
                                                                                                <Icon name="X" size={16} />
                                                                                            </button>
                                                                                        </div>
                                                                                    );
                                                                                })}
                                                                            </div>
                                                                            <button
                                                                                onClick={() => {
                                                                                    const current = routine.workoutTemplates || [];
                                                                                    const firstTemplateId = workoutTemplates[0]?.id;
                                                                                    if (firstTemplateId !== undefined) {
                                                                                        updateRoutine(routine.id, { workoutTemplates: [...current, firstTemplateId] });
                                                                                    }
                                                                                }}
                                                                                className="w-full mt-2 py-2 border border-dashed border-blue-400 rounded text-blue-600 hover:bg-blue-50 transition text-sm"
                                                                            >
                                                                                <Icon name="Plus" size={14} className="inline mr-1" />
                                                                                枠を追加
                                                                            </button>
                                                                        </>
                                                                    ) : (
                                                                        <p className="text-xs text-gray-600 mt-2">運動テンプレートがありません</p>
                                                                    )}
                                                                </div>

                                                            </div>
                                                            <p className="text-xs text-yellow-700 mt-2">
                                                                ✨ 同じテンプレートを何回でも追加できます
                                                            </p>
                                                        </details>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                {/* 追加枠 */}
                                {localRoutines.filter(r => r.id > 7).length > 0 && (
                                    <div>
                                        <h3 className="font-semibold mb-3">追加枠（最大5つ）</h3>
                                        <div className="space-y-3">
                                            {localRoutines.filter(r => r.id > 7).map((routine, index) => (
                                                <div key={`routine-custom-${routine.id}-${routine.firestoreId || index}`} className="border rounded-lg p-4 bg-gray-50">
                                                    <div className="flex justify-between items-center mb-3">
                                                        <input
                                                            type="text"
                                                            value={routine.name}
                                                            onChange={(e) => updateRoutine(routine.id, { name: e.target.value })}
                                                            className="font-bold text-[#4A9EFF] bg-transparent border-b border-blue-300 focus:outline-none"
                                                        />
                                                        <button
                                                            onClick={() => deleteRoutine(routine.id)}
                                                            className="text-red-600 hover:text-red-800"
                                                        >
                                                            <Icon name="Trash2" size={18} />
                                                        </button>
                                                    </div>
                                                    <div className="flex items-center gap-3 mb-3">
                                                        <label className="flex items-center gap-2 text-sm">
                                                            <input
                                                                type="checkbox"
                                                                checked={routine.isRestDay}
                                                                onChange={(e) => updateRoutine(routine.id, {
                                                                    isRestDay: e.target.checked,
                                                                    splitType: e.target.checked ? '' : routine.splitType
                                                                })}
                                                                className="rounded"
                                                            />
                                                            休養日
                                                        </label>
                                                    </div>
                                                    <div className="space-y-3">
                                                        {!routine.isRestDay && (
                                                            <div>
                                                                <label className="font-medium text-sm">分類</label>
                                                                {(() => {
                                                                    const presetOptions = ["胸", "背中", "肩", "腕", "脚", "背", "尻", "腹筋・体幹", "上半身", "下半身", "全身", "プッシュ（押す）", "プル（引く）", "有酸素", "胸・三頭", "背中・二頭", "肩・腕"];
                                                                    const isCustomValue = routine.splitType && !presetOptions.includes(routine.splitType);

                                                                    return (
                                                                        <select
                                                                            value={isCustomValue ? '__custom_display__' : routine.splitType}
                                                                            onChange={(e) => {
                                                                                if (e.target.value === '__custom__') {
                                                                                    const custom = prompt('分割法を入力してください（例：胸・三頭・肩）', routine.splitType);
                                                                                    if (custom !== null && custom.trim() !== '') {
                                                                                        updateRoutine(routine.id, { splitType: custom.trim() });
                                                                                    }
                                                                                } else {
                                                                                    updateRoutine(routine.id, { splitType: e.target.value });
                                                                                }
                                                                            }}
                                                                            className="w-full mt-1 p-2 border rounded-lg"
                                                                        >
                                                                            <option value="">選択してください</option>
                                                                            <option value="胸">胸</option>
                                                                            <option value="背中">背中</option>
                                                                            <option value="肩">肩</option>
                                                                            <option value="腕">腕</option>
                                                                            <option value="脚">脚</option>
                                                                            <option value="背">背</option>
                                                                            <option value="尻">尻</option>
                                                                            <option value="腹筋・体幹">腹筋・体幹</option>
                                                                            <option value="上半身">上半身</option>
                                                                            <option value="下半身">下半身</option>
                                                                            <option value="全身">全身</option>
                                                                            <option value="プッシュ（押す）">プッシュ（押す）</option>
                                                                            <option value="プル（引く）">プル（引く）</option>
                                                                            <option value="有酸素">有酸素</option>
                                                                            <option value="胸・三頭">胸・三頭</option>
                                                                            <option value="背中・二頭">背中・二頭</option>
                                                                            <option value="肩・腕">肩・腕</option>
                                                                            {isCustomValue && (
                                                                                <option value="__custom_display__">{routine.splitType}</option>
                                                                            )}
                                                                            <option value="__custom__">カスタム入力..</option>
                                                                        </select>
                                                                    );
                                                                })()}
                                                            </div>
                                                        )}

                                                        {/* テンプレート紐づけ */}
                                                            <details className="bg-purple-50 border border-purple-200 rounded-lg p-3">
                                                                <summary className="font-medium text-sm text-purple-900 cursor-pointer flex items-center gap-2 hover:text-purple-700">
                                                                    <Icon name="BookTemplate" size={14} />
                                                                    テンプレート紐づけ
                                                                    <Icon name="ChevronDown" size={14} className="ml-auto" />
                                                                </summary>
                                                                <div className="space-y-3 mt-3">
                                                                    {/* 食事テンプレート */}
                                                                    <div>
                                                                        <label className="text-xs font-medium text-gray-600">食事テンプレート</label>
                                                                        {mealTemplates.length > 0 ? (
                                                                            <>
                                                                                <div className="mt-2 space-y-2">
                                                                                    {(routine.mealTemplates || []).map((templateId, index) => {
                                                                                        const template = mealTemplates.find(t => t.id === templateId);
                                                                                        return (
                                                                                            <div key={index} className="flex gap-2 items-center">
                                                                                                <span className="text-xs text-gray-500 w-6">[{index + 1}]</span>
                                                                                                <select
                                                                                                    value={templateId}
                                                                                                    onChange={(e) => {
                                                                                                        const current = routine.mealTemplates || [];
                                                                                                        const updated = [...current];
                                                                                                        updated[index] = parseInt(e.target.value) || e.target.value;
                                                                                                        updateRoutine(routine.id, { mealTemplates: updated });
                                                                                                    }}
                                                                                                    className="flex-1 p-2 border rounded text-sm"
                                                                                                >
                                                                                                    {mealTemplates.map(t => (
                                                                                                        <option key={t.id} value={t.id}>{t.name}</option>
                                                                                                    ))}
                                                                                                </select>
                                                                                                <button
                                                                                                    onClick={() => {
                                                                                                        const current = routine.mealTemplates || [];
                                                                                                        const updated = [...current];
                                                                                                        updated.splice(index, 1);
                                                                                                        updateRoutine(routine.id, { mealTemplates: updated });
                                                                                                    }}
                                                                                                    className="px-2 py-2 text-red-600 hover:text-red-800"
                                                                                                >
                                                                                                    <Icon name="X" size={16} />
                                                                                                </button>
                                                                                            </div>
                                                                                        );
                                                                                    })}
                                                                                </div>
                                                                                <button
                                                                                    onClick={() => {
                                                                                        const current = routine.mealTemplates || [];
                                                                                        const firstTemplateId = mealTemplates[0]?.id;
                                                                                        if (firstTemplateId !== undefined) {
                                                                                            updateRoutine(routine.id, { mealTemplates: [...current, firstTemplateId] });
                                                                                        }
                                                                                    }}
                                                                                    className="w-full mt-2 py-2 border border-dashed border-blue-400 rounded text-blue-600 hover:bg-blue-50 transition text-sm"
                                                                                >
                                                                                    <Icon name="Plus" size={14} className="inline mr-1" />
                                                                                    枠を追加
                                                                                </button>
                                                                            </>
                                                                        ) : (
                                                                            <p className="text-xs text-gray-600 mt-2">食事テンプレートがありません</p>
                                                                        )}
                                                                    </div>

                                                                    {/* 運動テンプレート */}
                                                                    <div>
                                                                        <label className="text-xs font-medium text-gray-600">運動テンプレート</label>
                                                                        {workoutTemplates.length > 0 ? (
                                                                            <>
                                                                                <div className="mt-2 space-y-2">
                                                                                    {(routine.workoutTemplates || []).map((templateId, index) => {
                                                                                        const template = workoutTemplates.find(t => t.id === templateId);
                                                                                        return (
                                                                                            <div key={index} className="flex gap-2 items-center">
                                                                                                <span className="text-xs text-gray-500 w-6">[{index + 1}]</span>
                                                                                                <select
                                                                                                    value={templateId}
                                                                                                    onChange={(e) => {
                                                                                                        const current = routine.workoutTemplates || [];
                                                                                                        const updated = [...current];
                                                                                                        updated[index] = parseInt(e.target.value) || e.target.value;
                                                                                                        updateRoutine(routine.id, { workoutTemplates: updated });
                                                                                                    }}
                                                                                                    className="flex-1 p-2 border rounded text-sm"
                                                                                                >
                                                                                                    {workoutTemplates.map(t => (
                                                                                                        <option key={t.id} value={t.id}>{t.name}</option>
                                                                                                    ))}
                                                                                                </select>
                                                                                                <button
                                                                                                    onClick={() => {
                                                                                                        const current = routine.workoutTemplates || [];
                                                                                                        const updated = [...current];
                                                                                                        updated.splice(index, 1);
                                                                                                        updateRoutine(routine.id, { workoutTemplates: updated });
                                                                                                    }}
                                                                                                    className="px-2 py-2 text-red-600 hover:text-red-800"
                                                                                                >
                                                                                                    <Icon name="X" size={16} />
                                                                                                </button>
                                                                                            </div>
                                                                                        );
                                                                                    })}
                                                                                </div>
                                                                                <button
                                                                                    onClick={() => {
                                                                                        const current = routine.workoutTemplates || [];
                                                                                        const firstTemplateId = workoutTemplates[0]?.id;
                                                                                        if (firstTemplateId !== undefined) {
                                                                                            updateRoutine(routine.id, { workoutTemplates: [...current, firstTemplateId] });
                                                                                        }
                                                                                    }}
                                                                                    className="w-full mt-2 py-2 border border-dashed border-blue-400 rounded text-blue-600 hover:bg-blue-50 transition text-sm"
                                                                                >
                                                                                    <Icon name="Plus" size={14} className="inline mr-1" />
                                                                                    枠を追加
                                                                                </button>
                                                                            </>
                                                                        ) : (
                                                                            <p className="text-xs text-gray-600 mt-2">運動テンプレートがありません</p>
                                                                        )}
                                                                    </div>

                                                                </div>
                                                                <p className="text-xs text-yellow-700 mt-2">
                                                                    ✨ 同じテンプレートを何回でも追加できます
                                                                </p>
                                                            </details>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                {/* 追加ボタン */}
                                {localRoutines.length < 12 && localRoutines.length >= 7 && (
                                    <button
                                        onClick={addRoutine}
                                        className="w-full py-3 border-2 border-dashed border-blue-300 rounded-lg text-blue-600 hover:bg-blue-50 transition font-medium"
                                    >
                                        <Icon name="Plus" size={18} className="inline mr-2" />
                                        追加枠を追加 ({localRoutines.length - 7}/5)
                                    </button>
                                )}

                                {/* 管理用ボタン */}
                                {localRoutines.length > 0 && (
                                    <div className="flex gap-3 pt-4 border-t">
                                        <button
                                            onClick={() => setShowRestartModal(true)}
                                            className="w-full px-4 py-3 bg-blue-50 text-[#4A9EFF] rounded-lg hover:bg-blue-100 transition font-medium border border-blue-200"
                                        >
                                            <Icon name="RotateCcw" size={18} className="inline mr-2" />
                                            任意の日から再開
                                        </button>

                                        {/* 再開モーダル */}
                                        {showRestartModal && (
                                            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[10000]" onClick={() => setShowRestartModal(false)}>
                                                <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4" onClick={(e) => e.stopPropagation()}>
                                                    <h3 className="text-lg font-bold mb-4">どの日から再開しますか？</h3>
                                                    <select
                                                        value={selectedRestartDay}
                                                        onChange={(e) => setSelectedRestartDay(parseInt(e.target.value))}
                                                        className="w-full p-3 border rounded-lg mb-4"
                                                    >
                                                        {localRoutines.map((routine, index) => (
                                                            <option key={routine.id} value={index + 1}>
                                                                {routine.name} {routine.splitType ? `(${routine.splitType})` : ''}
                                                            </option>
                                                        ))}
                                                    </select>
                                                    <div className="flex gap-3">
                                                        <button
                                                            onClick={() => setShowRestartModal(false)}
                                                            className="flex-1 px-4 py-2 bg-gray-200 rounded-lg hover:bg-gray-300 transition"
                                                        >
                                                            キャンセル
                                                        </button>
                                                        <button
                                                            onClick={async () => {
                                                                try {
                                                                    const today = new Date();
                                                                    today.setDate(today.getDate() - (selectedRestartDay - 1));

                                                                    // Firestoreに保存
                                                                    await firebase.firestore()
                                                                        .collection('users')
                                                                        .doc(userId)
                                                                        .set({
                                                                            routineStartDate: today.toISOString()
                                                                        }, { merge: true });

                                                                    toast.success('ルーティンを再開しました');
                                                                    setShowRestartModal(false);
                                                                } catch (error) {
                                                                    console.error('[FeaturesTab] Failed to restart routine:', error);
                                                                    toast.error('再開に失敗しました');
                                                                }
                                                            }}
                                                            className="flex-1 px-4 py-2 bg-[#4A9EFF] text-white rounded-lg hover:bg-[#3b8fef] transition font-bold"
                                                        >
                                                            再開
                                                        </button>
                                                    </div>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>
                        );
                    })()}
                    </div>
                </div>
            </details>
            )}

            {/* 通知設定 */}
            <details className="border rounded-lg">
                <summary className="cursor-pointer p-4 hover:bg-gray-50 font-medium flex items-center gap-2">
                    <Icon name="Bell" size={18} className="text-blue-600" />
                    通知設定
                    <Icon name="ChevronDown" size={16} className="ml-auto text-gray-400" />
                </summary>
                <div className="p-4 pt-0 border-t">
                    <NotificationSettings userId={userId} />
                </div>
            </details>
        </div>
    );
};

export default FeaturesTab;
