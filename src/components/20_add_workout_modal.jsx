import React, { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import { STORAGE_KEYS } from '../config.js';
import { normalizeForSearch } from '../kanjiReadingMap.js';
import { Icon } from './01_common.jsx';

// ===== 運動記録専用モーダル =====
const AddItemView = ({ type, selectedDate, onClose, onAdd, onUpdate, userProfile, unlockedFeatures, user, currentRoutine, usageDays, dailyRecord, editingTemplate, editingWorkout, isTemplateMode = false }) => {
            // 運動記録用のstate（フックは条件分岐の前に配置する必要がある）
            const [selectedExercise, setSelectedExercise] = useState(null);
            const [exerciseTab, setExerciseTab] = useState('strength'); // 'strength' or 'cardio' or 'stretch'
            const [selectedExerciseCategory, setSelectedExerciseCategory] = useState('胸'); // 運動のカテゴリフィルタ
            const [showWorkoutInfoModal, setShowWorkoutInfoModal] = useState(false); // 運動記録の使い方モーダル
            const [hiddenStandardTrainings, setHiddenStandardTrainings] = useState([]);
            const [hiddenTrainingCategories, setHiddenTrainingCategories] = useState([]);
            const [workoutName, setWorkoutName] = useState('トレーニング'); // 運動名
            const [isEditingWorkoutName, setIsEditingWorkoutName] = useState(false); // 運動名編集モード
            const [exercises, setExercises] = useState([]);
            const [currentExercise, setCurrentExercise] = useState(null);
            const [sets, setSets] = useState([]);
            const [isFromTemplate, setIsFromTemplate] = useState(false); // テンプレートから読み込んだか
            const [currentSet, setCurrentSet] = useState({
                weight: 50,
                reps: 10,
                distance: 0.5,
                tut: 30,
                restInterval: 90,
                duration: 5
            });
            const [workoutTemplates, setWorkoutTemplates] = useState([]);
            const [searchTerm, setSearchTerm] = useState(''); // 運動検索用
            const [showSearchModal, setShowSearchModal] = useState(false); // 検索モーダル表示
            const [templateName, setTemplateName] = useState(''); // テンプレート名
            const [mealName, setMealName] = useState(''); // 運動名（保存時用）
            const [showCustomExerciseForm, setShowCustomExerciseForm] = useState(false);
            const [workoutInfoModal, setWorkoutInfoModal] = useState({ show: false, title: '', content: '' });
            const [showAdvancedTraining, setShowAdvancedTraining] = useState(false);
            // 削除されていたState変数を復元
            const [showTemplates, setShowTemplates] = useState(false);
            const [showTemplateInfoModal, setShowTemplateInfoModal] = useState(false);
            const [editingTemplateId, setEditingTemplateId] = useState(null);
            const [editingTemplateObj, setEditingTemplateObj] = useState(null);
            // カスタム種目（renderWorkoutInput内から移動）
            const [customExercises, setCustomExercises] = useState([]);
            const [exerciseSaveMethod, setExerciseSaveMethod] = useState('database'); // 'database' or 'addToList'
            const [showExerciseSaveMethodInfo, setShowExerciseSaveMethodInfo] = useState(false); // 保存方法説明モーダル
            const [customExerciseData, setCustomExerciseData] = useState({
                name: '',
                category: '胸',
                subcategory: 'コンパウンド',
                exerciseType: 'anaerobic',
                jointType: 'single',
                defaultDistance: 0.5,
                defaultTutPerRep: 3,
                exerciseFactor: 1.0,
                epocRate: 0.15,
                intervalMultiplier: 1.3,
                equipment: '',
                difficulty: '初級',
                primaryMuscles: [],
                secondaryMuscles: []
            });

            // 非表示設定をFirestoreから読み込み（運動用）
            useEffect(() => {
                const loadHiddenTrainings = async () => {
                    const currentUser = firebase.auth().currentUser;
                    if (!currentUser || !currentUser.uid) return;

                    try {
                        // 非表示運動アイテムを読み込み
                        const itemsDoc = await firebase.firestore()
                            .collection('users')
                            .doc(currentUser.uid)
                            .collection('settings')
                            .doc('hiddenStandardTrainings')
                            .get();

                        if (itemsDoc.exists) {
                            setHiddenStandardTrainings(itemsDoc.data().items || []);
                        }

                        // 非表示運動カテゴリを読み込み
                        const categoriesDoc = await firebase.firestore()
                            .collection('users')
                            .doc(currentUser.uid)
                            .collection('settings')
                            .doc('hiddenTrainingCategories')
                            .get();

                        if (categoriesDoc.exists) {
                            setHiddenTrainingCategories(categoriesDoc.data().categories || []);
                        }
                    } catch (error) {
                        console.error('[AddItemView] Failed to load hidden trainings:', error);
                    }
                };

                const unsubscribe = firebase.auth().onAuthStateChanged((user) => {
                    if (user) {
                        loadHiddenTrainings();
                    } else {
                        setHiddenStandardTrainings([]);
                        setHiddenTrainingCategories([]);
                    }
                });

                return () => unsubscribe();
            }, []);

            // 運動テンプレート編集モードの初期化
            useEffect(() => {
                if (editingTemplate && editingTemplate.exercises) {
                    setExercises(editingTemplate.exercises);
                    setWorkoutName(editingTemplate.name || 'トレーニング');
                }
            }, [editingTemplate]);

            // テンプレート読み込み関数（トップレベルで定義）
            const loadTemplates = async () => {
                if (!user?.uid) return; // userがない場合はスキップ
                console.log('[20_add_workout_modal] テンプレート読み込み開始');
                const templates = await DataService.getWorkoutTemplates(user.uid);
                console.log('[20_add_workout_modal] 読み込んだテンプレート数:', templates.length);

                console.log("[20_add_workout_modal] テンプレートデータ（isTrialCreated確認用）:", templates.map(t => ({id: t.id, name: t.name, isTrialCreated: t.isTrialCreated})));
                setWorkoutTemplates(templates);
            };

            // テンプレート・編集モード・ルーティン初期化
            useEffect(() => {
                if (!user?.uid) return; // userがない場合はスキップ
                loadTemplates();

                // 編集モード時の初期値設定
                if (editingWorkout) {
                    if (editingWorkout.exercises && Array.isArray(editingWorkout.exercises)) {
                        setExercises(JSON.parse(JSON.stringify(editingWorkout.exercises)));
                    }
                    return; // 編集モード時はルーティン読み込みをスキップ
                }

                // ルーティンからワークアウト自動読み込み
                if (currentRoutine && !currentRoutine.isRestDay && currentRoutine.exercises) {
                    // ルーティンの最初の種目を自動選択
                    if (currentRoutine.exercises.length > 0) {
                        const firstExercise = currentRoutine.exercises[0];
                        setCurrentExercise(firstExercise.exercise);
                        if (firstExercise.sets && firstExercise.sets.length > 0) {
                            setSets(firstExercise.sets.map(set => ({
                                ...set,
                                duration: set.duration || 0
                            })));
                        }
                    }
                }
            }, []);

            // カスタム種目をFirestoreから読み込み（トップレベルに移動）
            useEffect(() => {
                const loadCustomExercises = async () => {
                    if (!user?.uid) return;

                    try {
                        const customExercisesSnapshot = await firebase.firestore()
                            .collection('users')
                            .doc(user.uid)
                            .collection('customExercises')
                            .get();

                        const exercises = customExercisesSnapshot.docs.map(doc => ({
                            ...doc.data(),
                            firestoreId: doc.id
                        }));
                        setCustomExercises(exercises);
                    } catch (error) {
                        console.error('[AddWorkoutModal] Failed to load custom exercises:', error);
                    }
                };

                loadCustomExercises();
            }, [user]);

            const renderWorkoutInput = () => {
                // 編集モード判定（食事モーダルと同じ仕様）
                const isEditMode = !!editingWorkout;

                const fuzzyMatch = (text, query) => {
                    if (!query || query.trim() === '') return true;
                    const normalizedQuery = query
                        .toLowerCase()
                        .replace(/[\u30a1-\u30f6]/g, (m) => String.fromCharCode(m.charCodeAt(0) - 0x60))
                        .replace(/\s+/g, '');
                    const normalizedText = normalizeForSearch(text);
                    return normalizedText.includes(normalizedQuery);
                };

                const saveAsTemplate = async () => {
                    if (exercises.length === 0) {
                        toast('運動を追加してください');
                        return;
                    }

                    // 無料会員の枠制限チェック（7日目以降）
                    const isFreeUser = userProfile?.subscriptionStatus !== 'active' && usageDays >= 7;
                    if (isFreeUser && workoutTemplates.length >= 1) {
                        toast.error('無料会員は運動テンプレートを1枠まで作成できます。既存のテンプレートを削除してから新しいテンプレートを作成するか、Premium会員にアップグレードしてください。');
                        return;
                    }

                    // デフォルト値：最初の運動名または空文字
                    const defaultName = exercises.length > 0 && exercises[0].exercise ? exercises[0].exercise.name : '';
                    const inputName = prompt('テンプレート名を入力してください', defaultName);
                    if (!inputName || !inputName.trim()) {
                        return;
                    }

                    // トライアル期間中（0-6日目）かどうかを判定
                    const isTrialPeriod = usageDays < 7;
                    console.log("[20_add_workout_modal] テンプレート保存:", {usageDays, isTrialPeriod, isFreeUser, templatesCount: workoutTemplates.length});

                    // undefinedを再帰的に除去する関数
                    const removeUndefined = (obj) => {
                        if (Array.isArray(obj)) {
                            return obj.map(item => removeUndefined(item));
                        } else if (obj !== null && typeof obj === 'object') {
                            const cleaned = {};
                            Object.keys(obj).forEach(key => {
                                if (obj[key] !== undefined) {
                                    cleaned[key] = removeUndefined(obj[key]);
                                }
                            });
                            return cleaned;
                        }
                        return obj;
                    };

                    // exercises配列全体からundefinedを除去
                    const cleanedExercises = removeUndefined(exercises);

                    const template = {
                        id: Date.now().toString(), // 一意のIDを生成
                        name: inputName.trim(),
                        exercises: cleanedExercises, // クリーンアップした運動データを保存
                        createdAt: new Date().toISOString(),
                        isTrialCreated: isTrialPeriod, // トライアル期間中に作成されたかを記録
                    };

                    try {
                        if (!window.DataService) {
                            console.error('[20_add_workout_modal] DataService is not available on window object');
                            console.log('[20_add_workout_modal] Available window objects:', Object.keys(window).filter(k => k.includes('Service') || k.includes('Data')));
                            toast.error('DataServiceが利用できません。ページを再読み込みしてください。');
                            return;
                        }

                        // DataService経由でテンプレートを保存
                        await window.DataService.saveWorkoutTemplate(user.uid, template);

                        // テンプレート一覧を再読み込み
                        const templates = await window.DataService.getWorkoutTemplates(user.uid);
                        setWorkoutTemplates(templates || []);
                        toast.success('テンプレートを保存しました');
                    } catch (error) {
                        console.error('テンプレート保存エラー:', error);
                        toast.error('テンプレートの保存に失敗しました: ' + error.message);
                    }
                };

                const loadTemplate = (template) => {
                    console.log('[20_add_workout_modal] テンプレート編集モード開始:', template);
                    // 新形式（複数種目）と旧形式（単一種目）の両方に対応
                    if (template.exercises && Array.isArray(template.exercises)) {
                        // 新形式：複数種目を読み込み（ディープコピー）
                        const copiedExercises = JSON.parse(JSON.stringify(template.exercises));
                        setExercises(copiedExercises);
                        setCurrentExercise(null);
                        setSets([]);
                    } else if (template.exercise) {
                        // 旧形式：単一種目を読み込み
                        setCurrentExercise(template.exercise);
                        setSets(template.sets || []);
                    }

                    // 編集モード設定
                    setEditingTemplateId(template.id);
                    setEditingTemplateObj(template);
                    setIsFromTemplate(true); // テンプレートから読み込んだことをマーク
                    setShowTemplates(false);
                    console.log('[20_add_workout_modal] 編集モード設定完了 - テンプレートID:', template.id);
                };

                const deleteTemplate = async (templateId) => {
                    try {
                        // Firestoreからルーティンを取得
                        const routinesSnapshot = await firebase.firestore()
                            .collection('users')
                            .doc(user.uid)
                            .collection('routines')
                            .get();

                        const routines = routinesSnapshot.docs.map(doc => ({
                            ...doc.data(),
                            firestoreId: doc.id
                        }));

                        const usingRoutines = routines.filter(routine =>
                            (routine.workoutTemplates || []).includes(templateId)
                        );

                        let confirmMessage = 'このテンプレートを削除しますか？';
                        if (usingRoutines.length > 0) {
                            const routineNames = usingRoutines.map(r => r.name).join('、');
                            confirmMessage = `このテンプレートは以下のルーティンで使用されています：\n${routineNames}\n\n削除すると、これらのルーティンからも削除されます。よろしいですか？`;
                        }

                        window.showGlobalConfirm('テンプレート削除の確認', confirmMessage, async () => {
                            try {
                                // Firestoreのルーティンからテンプレートを削除
                                if (usingRoutines.length > 0) {
                                    const batch = firebase.firestore().batch();
                                    usingRoutines.forEach(routine => {
                                        const docRef = firebase.firestore()
                                            .collection('users')
                                            .doc(user.uid)
                                            .collection('routines')
                                            .doc(routine.firestoreId);

                                        batch.update(docRef, {
                                            workoutTemplates: (routine.workoutTemplates || []).filter(id => id !== templateId)
                                        });
                                    });
                                    await batch.commit();
                                }

                                // テンプレートを削除
                                await DataService.deleteWorkoutTemplate(user.uid, templateId);
                                loadTemplates();
                            } catch (error) {
                                console.error('[AddWorkoutModal] Failed to delete template:', error);
                                toast.error('テンプレートの削除に失敗しました');
                            }
                        });
                    } catch (error) {
                        console.error('[AddWorkoutModal] Failed to load routines:', error);
                        toast.error('ルーティンの取得に失敗しました');
                    }
                };

                const handleWorkoutSave = async () => {
                    if (exercises.length === 0) {
                        toast('運動を追加してください');
                        return;
                    }

                    // テンプレート編集モードの場合
                    if (editingTemplate) {
                        const updatedTemplate = {
                            ...editingTemplate,
                            exercises: exercises,
                            name: mealName || editingTemplate.name
                        };
                        await DataService.saveWorkoutTemplate(user.uid, updatedTemplate);
                        toast('テンプレートを更新しました');
                        onClose();
                        return;
                    }

                    // テンプレート作成モードの場合（新規）
                    if (isTemplateMode) {
                        if (!templateName.trim()) {
                            toast('テンプレート名を入力してください');
                            return;
                        }
                        const template = {
                            id: Date.now(),
                            name: templateName,
                            exercises: exercises,
                            createdAt: new Date().toISOString()
                        };
                        await DataService.saveWorkoutTemplate(user.uid, template);
                        toast.success('テンプレートを保存しました');
                        onClose();
                        return;
                    }

                    // 通常の記録モード
                    // 全ての種目を1つのworkoutオブジェクトにまとめる
                    const workoutData = {
                        id: Date.now(),
                        time: new Date().toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit' }),
                        name: workoutName, // ユーザーが編集可能な運動名を使用
                        category: exercises[0].exercise?.category || exercises[0].category,
                        isTemplate: isFromTemplate, // テンプレートから読み込んだ場合はtrueを付与
                        date: selectedDate, // 記録対象の日付を明示的に保存
                        exercises: exercises.map(ex => {
                            // 有酸素・ストレッチの場合
                            if (ex.exerciseType === 'aerobic' || ex.exerciseType === 'stretch') {
                                return {
                                    exercise: {
                                        name: ex.name || ex.exercise?.name,
                                        category: ex.category || ex.exercise?.category,
                                        exerciseType: ex.exerciseType
                                    },
                                    name: ex.name || ex.exercise?.name,  // ダッシュボード表示用
                                    exerciseType: ex.exerciseType,
                                    duration: ex.duration,
                                    totalDuration: ex.totalDuration || ex.duration
                                };
                            }

                            // 筋トレの場合
                            return {
                                exercise: ex.exercise,
                                exerciseType: ex.exercise?.exerciseType || 'anaerobic',
                                name: ex.name || ex.exercise?.name,  // ダッシュボード表示用
                                sets: ex.sets
                            };
                        })
                    };

                    // 1つのworkoutとして追加
                    onAdd(workoutData);
                    onClose();
                };

                // exerciseDBとカスタム種目をマージ（window.exerciseDBはservices.jsで定義）
                const exerciseDBData = window.exerciseDB || [];
                const allExercises = [...exerciseDBData, ...customExercises];

                const filteredExercises = allExercises.filter(ex => {
                    // 非表示アイテムまたはカテゴリをスキップ
                    if (hiddenStandardTrainings.includes(ex.name) || hiddenTrainingCategories.includes(ex.category)) {
                        return false;
                    }
                    // 検索フィルタ
                    return fuzzyMatch(ex.name, searchTerm) || fuzzyMatch(ex.category, searchTerm);
                });

                // セット単位では体積のみを記録
                const calculateSetVolume = (set) => {
                    const weight = set.weight || 0;
                    const reps = set.reps || 0;
                    return weight * reps; // 総体積 (kg × reps)
                };

                return (
                    <div className="space-y-4">
                        {/* ①どうやって記録しますか？ */}
                        {!currentExercise && !showCustomExerciseForm && (
                            <div className="space-y-2">
                                {/* 一覧から検索（白背景、グレー枠） */}
                                <button
                                    type="button"
                                    onClick={() => setShowSearchModal(true)}
                                    className="w-full px-4 py-3 bg-white border-2 border-gray-300 hover:border-blue-500 hover:bg-blue-50 rounded-lg font-semibold transition"
                                >
                                    <Icon name="Search" size={16} className="inline mr-1" />
                                    一覧から検索
                                </button>

                                {/* カスタム作成（白背景、グレー枠） */}
                                <button
                                    type="button"
                                    onClick={() => setShowCustomExerciseForm(true)}
                                    className="w-full px-4 py-3 bg-white border-2 border-gray-300 hover:border-green-500 hover:bg-green-50 rounded-lg font-semibold transition"
                                >
                                    <Icon name="PlusCircle" size={16} className="inline mr-1" />
                                    カスタム作成
                                </button>

                                {/* テンプレート - 初日から開放 */}
                                <button
                                    type="button"
                                    onClick={() => setShowTemplates(!showTemplates)}
                                    className="w-full px-4 py-3 bg-purple-50 border-2 border-purple-400 text-purple-700 rounded-lg font-semibold hover:bg-purple-100 transition"
                                >
                                    <Icon name="BookTemplate" size={16} className="inline mr-1" />
                                    テンプレート
                                </button>
                            </div>
                        )}

                        {/* テンプレートモーダル */}
                        {showTemplates && (
                            <div className="fixed inset-0 bg-black bg-opacity-60 z-[60] flex items-center justify-center p-4">
                                <div className="bg-white rounded-2xl w-full max-w-md max-h-[70vh] overflow-hidden flex flex-col">
                                    {/* ヘッダー */}
                                    <div className="bg-purple-600 text-white p-4 flex justify-between items-center">
                                        <h3 className="text-lg font-bold flex items-center gap-2">
                                            <Icon name="BookMarked" size={20} />
                                            テンプレートから選択
                                        </h3>
                                        <div className="flex items-center gap-1">
                                            <button
                                                onClick={() => setShowTemplateInfoModal(true)}
                                                className="p-2 hover:bg-white hover:bg-opacity-20 rounded-full transition"
                                                title="テンプレートについて"
                                            >
                                                <Icon name="HelpCircle" size={16} className="text-[#4A9EFF]" />
                                            </button>
                                            <button
                                                onClick={() => setShowTemplates(false)}
                                                className="p-2 hover:bg-white hover:bg-opacity-20 rounded-full"
                                            >
                                                <Icon name="X" size={20} />
                                            </button>
                                        </div>
                                    </div>

                                    {/* テンプレート一覧 */}
                                    <div className="flex-1 overflow-y-auto p-4">
                                        {workoutTemplates.length === 0 ? (
                                            <div className="text-center py-12">
                                                <Icon name="BookMarked" size={48} className="mx-auto mb-3 opacity-30 text-purple-600" />
                                                <p className="text-gray-900 font-semibold mb-2">まだテンプレートがありません</p>
                                                <p className="text-sm text-gray-600 px-4">
                                                    種目を追加後に「保存」ボタンで保存するか、<br/>
                                                    ダッシュボードのテンプレートボタンから作成できます
                                                </p>
                                            </div>
                                        ) : (
                                            <div className="space-y-2">
                                                {workoutTemplates.map((template, index) => {
                                                    // 種目数、総セット数、総重量、総時間を計算
                                                    const exerciseCount = template.exercises?.length || 0;
                                                    let totalSets = 0;
                                                    let totalVolume = 0;
                                                    let totalDuration = 0;

                                                    template.exercises?.forEach(exercise => {
                                                        totalSets += exercise.sets?.length || 0;
                                                        exercise.sets?.forEach(set => {
                                                            totalVolume += (set.weight || 0) * (set.reps || 0);
                                                            totalDuration += set.duration || 0;
                                                        });
                                                    });

                                                    // ロック判定：無料会員は1枠目（index 0）のみ使用可能
                                                    const isLocked = userProfile?.subscriptionStatus !== 'active' && index !== 0;
                                                    console.log('[20_add_workout_modal] テンプレートロック判定:', {templateName: template.name, index, subscriptionStatus: userProfile?.subscriptionStatus, isLocked});

                                                    return (
                                                        <details key={template.id} className={`border-2 rounded-lg group ${isLocked ? 'bg-gray-100 border-gray-300 opacity-60' : 'bg-gray-50 border-gray-200'}`}>
                                                            <summary className="p-3 cursor-pointer list-none">
                                                                <div className="flex items-center justify-between mb-2">
                                                                    <div className="flex items-center gap-2">
                                                                        <div className="font-semibold text-gray-900">{template.name}</div>
                                                                        {isLocked && (
                                                                            <Icon name="Lock" size={16} className="text-amber-600" title="無料会員は1枠目のみ使用可能" />
                                                                        )}
                                                                    </div>
                                                                    <div className="flex items-center gap-2">
                                                                        <button
                                                                            onClick={(e) => {
                                                                                e.preventDefault();
                                                                                e.stopPropagation();
                                                                                if (isLocked) {
                                                                                    toast.error('このテンプレートは使用できません。無料会員は1枠目のテンプレートのみ使用可能です。Premium会員にアップグレードすると全てのテンプレートが使用できます。');
                                                                                    return;
                                                                                }
                                                                                loadTemplate(template);
                                                                                setShowTemplates(false);
                                                                            }}
                                                                            className={`w-10 h-10 rounded-lg shadow-md flex items-center justify-center transition border-2 ${
                                                                                isLocked
                                                                                ? 'bg-gray-200 text-gray-400 border-gray-300 cursor-not-allowed'
                                                                                : 'bg-white text-blue-600 hover:bg-blue-50 border-blue-500'
                                                                            }`}
                                                                            title={isLocked ? 'トライアル期間中作成のため利用不可' : '編集'}
                                                                        >
                                                                            <Icon name="Edit" size={18} />
                                                                        </button>
                                                                        <button
                                                                            onClick={(e) => {
                                                                                e.preventDefault();
                                                                                e.stopPropagation();
                                                                                window.showGlobalConfirm('テンプレート削除の確認', `テンプレート「${template.name}」を削除しますか？`, () => {
                                                                                    deleteTemplate(template.id);
                                                                                });
                                                                            }}
                                                                            className="w-10 h-10 rounded-lg bg-white shadow-md flex items-center justify-center text-red-600 hover:bg-red-50 transition border-2 border-red-500"
                                                                            title="削除"
                                                                        >
                                                                            <Icon name="Trash2" size={18} />
                                                                        </button>
                                                                    </div>
                                                                </div>
                                                                <div className="text-xs text-gray-600 mb-2">
                                                                    {exerciseCount}種目
                                                                </div>
                                                                <div className="text-xs mb-3 flex items-center justify-between">
                                                                    <div className="flex items-center gap-2">
                                                                        <span className="text-orange-600 font-semibold">{totalSets}セット</span>
                                                                        {totalVolume > 0 && (
                                                                            <>
                                                                                <span className="text-gray-400">|</span>
                                                                                <span className="text-orange-600 font-semibold">{totalVolume}kg</span>
                                                                            </>
                                                                        )}
                                                                        {totalDuration > 0 && (
                                                                            <>
                                                                                <span className="text-gray-400">|</span>
                                                                                <span className="text-orange-600 font-semibold">{totalDuration}分</span>
                                                                            </>
                                                                        )}
                                                                    </div>
                                                                    <Icon name="ChevronRight" size={16} className="text-gray-600 group-open:rotate-90 transition-transform" />
                                                                </div>

                                                                <button
                                                                    onClick={(e) => {
                                                                        e.preventDefault();
                                                                        e.stopPropagation();
                                                                        if (isLocked) {
                                                                            toast.error('このテンプレートは使用できません。無料会員は1枠目のテンプレートのみ使用可能です。Premium会員にアップグレードすると全てのテンプレートが使用できます。');
                                                                            return;
                                                                        }
                                                                        const workoutData = {
                                                                            name: template.name,
                                                                            timestamp: new Date().toISOString(),
                                                                            time: new Date().toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit' }),
                                                                            exercises: template.exercises,
                                                                            isTemplate: true,
                                                                            date: selectedDate // 記録対象の日付を明示的に保存
                                                                        };
                                                                        onAdd(workoutData);
                                                                        setShowTemplates(false);
                                                                        onClose();
                                                                    }}
                                                                    className={`w-full px-4 py-2 rounded-lg font-bold transition text-sm ${
                                                                        isLocked
                                                                        ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                                                                        : 'bg-[#4A9EFF] text-white hover:bg-[#3b8fef]'
                                                                    }`}
                                                                >
                                                                    記録
                                                                </button>
                                                            </summary>

                                                            <div className="px-3 pb-3 border-t border-gray-300">
                                                                <div className="text-xs font-medium text-gray-600 mt-2 mb-2">内訳を表示</div>
                                                                <div className="space-y-2">
                                                                    {template.exercises?.map((exercise, exIdx) => (
                                                                        <div key={exIdx} className="bg-white p-2 rounded text-xs border border-gray-200">
                                                                            <div className="font-semibold">{exercise.name}</div>
                                                                            <div className="text-gray-600 mt-1 space-y-1">
                                                                                {exercise.sets?.map((set, setIdx) => (
                                                                                    <div key={setIdx}>
                                                                                        セット{setIdx + 1}: {set.weight || 0}kg × {set.reps || 0}回
                                                                                        {set.duration > 0 && ` (${set.duration}分)`}
                                                                                    </div>
                                                                                ))}
                                                                            </div>
                                                                        </div>
                                                                    ))}
                                                                </div>
                                                            </div>
                                                        </details>
                                                    );
                                                })}
                                            </div>
                                        )}
                                    </div>

                                    {/* フッター */}
                                    <div className="border-t p-4">
                                        <button
                                            onClick={() => setShowTemplates(false)}
                                            className="w-full px-4 py-3 bg-gray-200 text-gray-700 rounded-lg font-semibold hover:bg-gray-300 transition"
                                        >
                                            閉じる
                                        </button>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* テンプレート仕様説明モーダル */}
                        {showTemplateInfoModal && (
                            <div className="fixed inset-0 bg-black bg-opacity-60 z-[70] flex items-center justify-center p-4">
                                <div className="bg-white rounded-2xl w-full max-w-md max-h-[80vh] overflow-y-auto">
                                    {/* ヘッダー */}
                                    <div className="bg-[#4A9EFF] text-white p-4 flex justify-between items-center sticky top-0">
                                        <h3 className="text-lg font-bold flex items-center gap-2">
                                            <Icon name="HelpCircle" size={16} />
                                            テンプレートについて
                                        </h3>
                                        <button
                                            onClick={() => setShowTemplateInfoModal(false)}
                                            className="p-2 hover:bg-white hover:bg-opacity-20 rounded-full transition"
                                        >
                                            <Icon name="X" size={20} />
                                        </button>
                                    </div>

                                    {/* 内容 */}
                                    <div className="p-6 space-y-6">
                                        {/* テンプレートとは */}
                                        <div>
                                            <h4 className="font-bold text-gray-900 mb-3 flex items-center gap-2">
                                                <Icon name="BookMarked" size={18} className="text-[#4A9EFF]" />
                                                テンプレートとは
                                            </h4>
                                            <p className="text-sm text-gray-700 leading-relaxed">
                                                よく行うトレーニングメニューを登録しておくことで、毎回同じ種目・セット数を設定する手間を省くことができます。
                                            </p>
                                        </div>

                                        {/* 無料会員の制限 */}
                                        <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
                                            <h4 className="font-bold text-gray-900 mb-3 flex items-center gap-2">
                                                <Icon name="User" size={18} className="text-orange-600" />
                                                無料会員の制限
                                            </h4>
                                            <div className="space-y-2 text-sm text-gray-700">
                                                <div className="flex items-start gap-2">
                                                    <Icon name="Lock" size={16} className="text-orange-600 flex-shrink-0 mt-0.5" />
                                                    <div>
                                                        <div className="font-semibold">1枠のみ使用可能</div>
                                                        <div className="text-xs text-gray-600 mt-1">
                                                            無料会員は<span className="font-bold text-orange-600">最初に作成したテンプレート（1枠目）のみ</span>使用できます。2枠目以降はロックされます。
                                                        </div>
                                                    </div>
                                                </div>
                                                <div className="flex items-start gap-2">
                                                    <Icon name="Edit" size={16} className="text-orange-600 flex-shrink-0 mt-0.5" />
                                                    <div>
                                                        <div className="font-semibold">編集・削除は可能</div>
                                                        <div className="text-xs text-gray-600 mt-1">
                                                            1枠目のテンプレートは自由に編集・削除できます。削除後に新しいテンプレートを作成することも可能です。
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>

                                        {/* Premium会員の特典 */}
                                        <div className="bg-amber-100 border border-amber-300 rounded-lg p-4">
                                            <h4 className="font-bold text-gray-900 mb-3 flex items-center gap-2">
                                                <Icon name="Crown" size={18} className="text-amber-600" />
                                                Premium会員の特典
                                            </h4>
                                            <div className="space-y-2 text-sm text-gray-700">
                                                <div className="flex items-start gap-2">
                                                    <Icon name="Unlock" size={16} className="text-amber-600 flex-shrink-0 mt-0.5" />
                                                    <div>
                                                        <div className="font-semibold">無制限で使用可能</div>
                                                        <div className="text-xs text-gray-600 mt-1">
                                                            Premium会員は<span className="font-bold text-amber-600">何個でもテンプレートを作成・使用</span>できます。
                                                        </div>
                                                    </div>
                                                </div>
                                                <div className="flex items-start gap-2">
                                                    <Icon name="Star" size={16} className="text-amber-600 flex-shrink-0 mt-0.5" />
                                                    <div>
                                                        <div className="font-semibold">解約後の制限</div>
                                                        <div className="text-xs text-gray-600 mt-1">
                                                            Premium会員を解約すると、2枠目以降のテンプレートはロックされ、1枠目のみ使用可能になります。
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>

                                        {/* 使い方 */}
                                        <div>
                                            <h4 className="font-bold text-gray-900 mb-3 flex items-center gap-2">
                                                <Icon name="Lightbulb" size={18} className="text-[#4A9EFF]" />
                                                使い方
                                            </h4>
                                            <div className="space-y-3 text-sm text-gray-700">
                                                <div className="flex items-start gap-2">
                                                    <div className="bg-[#4A9EFF] text-white w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 mt-0.5">1</div>
                                                    <div>
                                                        <div className="font-semibold">テンプレートの作成</div>
                                                        <div className="text-xs text-gray-600 mt-1">
                                                            運動を追加後、「テンプレートとして保存」ボタンで保存できます。
                                                        </div>
                                                    </div>
                                                </div>
                                                <div className="flex items-start gap-2">
                                                    <div className="bg-[#4A9EFF] text-white w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 mt-0.5">2</div>
                                                    <div>
                                                        <div className="font-semibold">テンプレートの使用</div>
                                                        <div className="text-xs text-gray-600 mt-1">
                                                            「テンプレートから選択」ボタンから、保存したテンプレートを呼び出せます。
                                                        </div>
                                                    </div>
                                                </div>
                                                <div className="flex items-start gap-2">
                                                    <div className="bg-[#4A9EFF] text-white w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 mt-0.5">3</div>
                                                    <div>
                                                        <div className="font-semibold">テンプレートの管理</div>
                                                        <div className="text-xs text-gray-600 mt-1">
                                                            設定 → データ管理 → テンプレート管理から、全てのテンプレートを編集・削除できます。
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    {/* フッター */}
                                    <div className="border-t p-4 bg-gray-50">
                                        <button
                                            onClick={() => setShowTemplateInfoModal(false)}
                                            className="w-full px-4 py-3 bg-[#4A9EFF] text-white rounded-lg font-semibold hover:bg-[#3B82F6] transition"
                                        >
                                            閉じる
                                        </button>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* 検索モーダル */}
                        {showSearchModal && (
                            <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50 p-4">
                                <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[70vh] overflow-hidden flex flex-col">
                                    {/* ヘッダー */}
                                    <div className="sticky top-0 bg-orange-600 text-white p-4 rounded-t-2xl z-10">
                                        <div className="flex justify-between items-center mb-3">
                                            <h3 className="text-lg font-bold flex items-center gap-2">
                                                <Icon name="Search" size={20} />
                                                種目を検索
                                            </h3>
                                            <button
                                                onClick={() => setShowSearchModal(false)}
                                                className="p-2 hover:bg-white hover:bg-opacity-20 rounded-full transition"
                                            >
                                                <Icon name="X" size={20} />
                                            </button>
                                        </div>

                                        {/* 検索欄 */}
                                        <input
                                            type="text"
                                            value={searchTerm}
                                            onChange={(e) => setSearchTerm(e.target.value)}
                                            placeholder="種目を検索..."
                                            className="w-full px-4 py-2 rounded-lg text-gray-800 focus:ring-2 focus:ring-white focus:outline-none"
                                        />

                                        {/* 筋トレ/有酸素/ストレッチ タブ */}
                                        <div className="grid grid-cols-3 mt-3 gap-2">
                                            <button
                                                onClick={() => setExerciseTab('strength')}
                                                className={`py-2 px-3 rounded-lg font-medium transition flex items-center justify-center gap-1 text-sm ${
                                                    exerciseTab === 'strength'
                                                        ? 'bg-white text-orange-600'
                                                        : 'bg-white bg-opacity-20 text-white hover:bg-opacity-30'
                                                }`}
                                            >
                                                <Icon name="Dumbbell" size={16} />
                                                筋トレ
                                            </button>
                                            <button
                                                onClick={() => setExerciseTab('cardio')}
                                                className={`py-2 px-3 rounded-lg font-medium transition flex items-center justify-center gap-1 text-sm ${
                                                    exerciseTab === 'cardio'
                                                        ? 'bg-white text-blue-600'
                                                        : 'bg-white bg-opacity-20 text-white hover:bg-opacity-30'
                                                }`}
                                            >
                                                <Icon name="Heart" size={16} />
                                                有酸素
                                            </button>
                                            <button
                                                onClick={() => setExerciseTab('stretch')}
                                                className={`py-2 px-3 rounded-lg font-medium transition flex items-center justify-center gap-1 text-sm ${
                                                    exerciseTab === 'stretch'
                                                        ? 'bg-white text-green-600'
                                                        : 'bg-white bg-opacity-20 text-white hover:bg-opacity-30'
                                                }`}
                                            >
                                                <Icon name="Wind" size={16} />
                                                ストレッチ
                                            </button>
                                        </div>
                                    </div>

                                    {/* カテゴリフィルタ（筋トレの場合のみ） */}
                                    {exerciseTab === 'strength' && (() => {
                                        const strengthCategories = ['胸', '背中', '脚', '肩', '腕', '腹筋・体幹', '尻', 'ウエイトリフティング', 'カスタム'];
                                        return (
                                            <div className="px-4 py-3 border-b bg-gray-50">
                                                <div className="flex flex-wrap gap-2">
                                                    {strengthCategories.map(cat => (
                                                        <button
                                                            key={cat}
                                                            onClick={() => setSelectedExerciseCategory(cat)}
                                                            className={`px-3 py-1 rounded-full text-xs font-medium transition ${
                                                                (selectedExerciseCategory || '胸') === cat
                                                                    ? 'bg-orange-600 text-white'
                                                                    : 'bg-gray-200 text-gray-600 hover:bg-gray-300'
                                                            }`}
                                                        >
                                                            {cat}
                                                        </button>
                                                    ))}
                                                </div>
                                            </div>
                                        );
                                    })()}

                                    {/* コンテンツエリア */}
                                    <div className="flex-1 overflow-y-auto p-4">
                                        {(() => {
                                            // タブに応じてフィルタリング
                                            const strengthCategories = ['胸', '背中', '脚', '肩', '腕', '腹筋・体幹', '尻', 'ウエイトリフティング', 'カスタム'];
                                            const cardioCategories = ['有酸素運動'];
                                            const stretchCategories = ['ストレッチ'];

                                            let displayedExercises = filteredExercises.filter(ex => {
                                                if (exerciseTab === 'strength') {
                                                    // 筋トレタブ
                                                    const targetCategory = selectedExerciseCategory || '胸';

                                                    // カスタムアイテムの場合、exerciseTabが'strength'のものだけ表示
                                                    if (ex.category === 'カスタム') {
                                                        return ex.exerciseTab === 'strength' && targetCategory === 'カスタム';
                                                    }

                                                    return strengthCategories.includes(ex.category) && ex.category === targetCategory;
                                                } else if (exerciseTab === 'cardio') {
                                                    // 有酸素タブ
                                                    // カスタムアイテムの場合、exerciseTabが'cardio'のものだけ表示
                                                    if (ex.category === 'カスタム') {
                                                        return ex.exerciseTab === 'cardio';
                                                    }
                                                    return cardioCategories.includes(ex.category);
                                                } else if (exerciseTab === 'stretch') {
                                                    // ストレッチタブ
                                                    // カスタムアイテムの場合、exerciseTabが'stretch'のものだけ表示
                                                    if (ex.category === 'カスタム') {
                                                        return ex.exerciseTab === 'stretch';
                                                    }
                                                    return stretchCategories.includes(ex.category);
                                                }
                                                return false;
                                            });

                                            if (displayedExercises.length === 0) {
                                                return (
                                                    <div className="text-center py-12 text-gray-600">
                                                        <Icon name="Search" size={48} className="mx-auto mb-3 opacity-30" />
                                                        <p className="text-sm">種目が見つかりませんでした</p>
                                                    </div>
                                                );
                                            }

                                            return (
                                                <div className="grid grid-cols-1 gap-2">
                                                    {displayedExercises.map(exercise => (
                                                        <button
                                                            key={exercise.id}
                                                            onClick={() => {
                                                                setCurrentExercise(exercise);
                                                                // 種目切り替え時にcurrentSetを初期値にリセット
                                                                setCurrentSet({
                                                                    weight: 50,
                                                                    reps: 10,
                                                                    distance: 0.5,
                                                                    tut: 30,
                                                                    restInterval: 90,
                                                                    duration: 5
                                                                });
                                                                setSets([]);  // セットリストもクリア
                                                                setShowSearchModal(false);
                                                            }}
                                                            className="w-full text-left p-3 bg-white hover:bg-orange-50 transition border border-gray-200 hover:border-orange-300 rounded-lg"
                                                        >
                                                            <div className="flex justify-between items-center">
                                                                <p className="font-medium text-sm text-gray-900 flex-1">{exercise.name}</p>
                                                                {exercise.subcategory && (
                                                                    <span className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded-full whitespace-nowrap ml-2 flex-shrink-0">
                                                                        {exercise.subcategory}
                                                                    </span>
                                                                )}
                                                            </div>
                                                        </button>
                                                    ))}
                                                </div>
                                            );
                                        })()}
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* カスタム種目作成フォーム */}
                        {showCustomExerciseForm && (
                            <div className="fixed inset-0 bg-black bg-opacity-60 z-[60] flex items-center justify-center p-4">
                                <div className="bg-white rounded-2xl w-full max-w-lg max-h-[80vh] overflow-y-auto">
                                    {/* ヘッダー */}
                                    <div className="sticky top-0 bg-orange-600 text-white p-4 rounded-t-2xl flex justify-between items-center z-10">
                                        <h3 className="text-lg font-bold flex items-center gap-2">
                                            <Icon name="PlusCircle" size={20} />
                                            カスタム種目を作成
                                        </h3>
                                        <button
                                            onClick={() => {
                                                setShowCustomExerciseForm(false);
                                                setCustomExerciseData({ name: '', exerciseTab: 'strength', subcategory: 'コンパウンド' });
                                                setExerciseSaveMethod('database');
                                            }}
                                            className="p-2 hover:bg-white hover:bg-opacity-20 rounded-full transition"
                                        >
                                            <Icon name="X" size={20} />
                                        </button>
                                    </div>

                                    {/* コンテンツ */}
                                    <div className="p-6 space-y-4">
                                    {/* 種目名 */}
                                    <div>
                                        <label className="block text-sm font-medium text-gray-600 mb-1">種目名</label>
                                        <input
                                            type="text"
                                            value={customExerciseData.name}
                                            onChange={(e) => setCustomExerciseData({...customExerciseData, name: e.target.value})}
                                            placeholder="例: マイトレーニング"
                                            className="w-full px-3 py-2 text-sm border rounded-lg focus:ring-2 focus:ring-orange-500 focus:outline-none"
                                        />
                                    </div>

                                    {/* タブ選択（筋トレ/有酸素/ストレッチ） */}
                                    <div>
                                        <label className="block text-sm font-medium text-gray-600 mb-1">タブ</label>
                                        <select
                                            value={customExerciseData.exerciseTab || 'strength'}
                                            onChange={(e) => setCustomExerciseData({...customExerciseData, exerciseTab: e.target.value})}
                                            className="w-full px-3 py-2 text-sm border rounded-lg focus:ring-2 focus:ring-orange-500 focus:outline-none"
                                        >
                                            <option value="strength">筋トレ</option>
                                            <option value="cardio">有酸素</option>
                                            <option value="stretch">ストレッチ</option>
                                        </select>
                                    </div>

                                    {/* 種類 */}
                                    <div>
                                        <label className="block text-sm font-medium text-gray-600 mb-1">種類</label>
                                        <select
                                            value={customExerciseData.subcategory}
                                            onChange={(e) => setCustomExerciseData({...customExerciseData, subcategory: e.target.value})}
                                            className="w-full px-3 py-2 text-sm border rounded-lg focus:ring-2 focus:ring-orange-500 focus:outline-none"
                                        >
                                            <option value="コンパウンド">コンパウンド</option>
                                            <option value="アイソレーション">アイソレーション</option>
                                            <option value="持久系">持久系</option>
                                            <option value="HIIT">HIIT</option>
                                            <option value="ダイナミックストレッチ">ダイナミックストレッチ</option>
                                            <option value="スタティックストレッチ">スタティックストレッチ</option>
                                        </select>
                                    </div>

                                    {/* 保存方法選択 */}
                                    <div>
                                        <div className="flex items-center gap-2 mb-2">
                                            <label className="text-sm font-medium text-gray-600">保存方法</label>
                                            <button
                                                type="button"
                                                onClick={() => setShowExerciseSaveMethodInfo(true)}
                                                className="text-[#4A9EFF] hover:text-[#3b8fef]"
                                            >
                                                <Icon name="HelpCircle" size={16} />
                                            </button>
                                        </div>
                                        <div className="space-y-2">
                                            <label className={`flex items-start gap-3 p-3 border-2 rounded-lg cursor-pointer transition ${
                                                exerciseSaveMethod === 'database'
                                                    ? 'border-orange-500 bg-orange-50'
                                                    : 'border-gray-200 hover:border-orange-300 hover:bg-gray-50'
                                            }`}>
                                                <input
                                                    type="radio"
                                                    name="exerciseSaveMethod"
                                                    value="database"
                                                    checked={exerciseSaveMethod === 'database'}
                                                    onChange={(e) => setExerciseSaveMethod(e.target.value)}
                                                    className="mt-0.5"
                                                />
                                                <div className="flex-1">
                                                    <div className="font-medium text-sm text-gray-900">データベースに保存</div>
                                                    <div className="text-xs text-gray-600 mt-0.5">後で検索して使用できます</div>
                                                </div>
                                            </label>
                                            <label className={`flex items-start gap-3 p-3 border-2 rounded-lg cursor-pointer transition ${
                                                exerciseSaveMethod === 'addToList'
                                                    ? 'border-orange-500 bg-orange-50'
                                                    : 'border-gray-200 hover:border-orange-300 hover:bg-gray-50'
                                            }`}>
                                                <input
                                                    type="radio"
                                                    name="exerciseSaveMethod"
                                                    value="addToList"
                                                    checked={exerciseSaveMethod === 'addToList'}
                                                    onChange={(e) => setExerciseSaveMethod(e.target.value)}
                                                    className="mt-0.5"
                                                />
                                                <div className="flex-1">
                                                    <div className="font-medium text-sm text-gray-900">リストに追加</div>
                                                    <div className="text-xs text-gray-600 mt-0.5">今すぐ種目選択されます</div>
                                                </div>
                                            </label>
                                        </div>
                                    </div>

                                    {/* ボタン */}
                                    <div className="flex gap-3 pt-2">
                                        <button
                                            onClick={() => {
                                                setShowCustomExerciseForm(false);
                                                setCustomExerciseData({ name: '', exerciseTab: 'strength', subcategory: 'コンパウンド' });
                                                setExerciseSaveMethod('database');
                                            }}
                                            className="flex-1 px-4 py-3 bg-gray-200 text-gray-700 font-semibold rounded-lg hover:bg-gray-300 transition"
                                        >
                                            キャンセル
                                        </button>
                                        <button
                                            onClick={async () => {
                                                if (!customExerciseData.name.trim()) {
                                                    toast('種目名を入力してください');
                                                    return;
                                                }

                                                // exerciseTabに応じてcategoryを設定（すべて「カスタム」だが、タブ表示用にexerciseTabを保存）
                                                const customExercise = {
                                                    id: Date.now(),
                                                    name: customExerciseData.name,
                                                    category: 'カスタム',
                                                    exerciseTab: customExerciseData.exerciseTab || 'strength', // タブ情報を保存
                                                    subcategory: customExerciseData.subcategory,
                                                    exerciseType: 'anaerobic',
                                                    isCustom: true
                                                };

                                                // Firestoreにカスタム種目を保存
                                                try {
                                                    if (!user) {
                                                        toast.error('ユーザー情報が見つかりません');
                                                        return;
                                                    }

                                                    const docRef = await firebase.firestore()
                                                        .collection('users')
                                                        .doc(user.uid)
                                                        .collection('customExercises')
                                                        .add(customExercise);

                                                    // カスタム運動をstateに追加
                                                    setCustomExercises(prev => [...prev, { ...customExercise, firestoreId: docRef.id }]);

                                                    console.log('カスタム種目を保存:', customExercise);
                                                } catch (error) {
                                                    console.error('カスタム種目の保存に失敗:', error);
                                                    toast.error('カスタム種目の保存に失敗しました');
                                                    return;
                                                }

                                                // 保存方法に応じて処理を分岐
                                                if (exerciseSaveMethod === 'addToList') {
                                                    // リストに追加: 種目を選択状態にする
                                                    setCurrentExercise(customExercise);
                                                    // 種目切り替え時にcurrentSetを初期値にリセット
                                                    setCurrentSet({
                                                        weight: 50,
                                                        reps: 10,
                                                        distance: 0.5,
                                                        tut: 30,
                                                        restInterval: 90,
                                                        duration: 5
                                                    });
                                                    setSets([]);  // セットリストもクリア
                                                    toast.success('カスタム種目を作成し、選択しました！');
                                                } else {
                                                    // データベースに保存のみ
                                                    toast.success('カスタム種目を保存しました！種目検索から追加できます。');
                                                }

                                                setShowCustomExerciseForm(false);
                                                setCustomExerciseData({ name: '', exerciseTab: 'strength', subcategory: 'コンパウンド' });
                                                setExerciseSaveMethod('database'); // デフォルトに戻す
                                            }}
                                            className="flex-1 px-4 py-3 bg-[#4A9EFF] text-white font-bold rounded-lg hover:bg-[#3b8fef] transition"
                                        >
                                            保存
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>
                        )}

                        {/* 保存方法説明モーダル */}
                        {showExerciseSaveMethodInfo && (
                            <div className="fixed inset-0 bg-black bg-opacity-50 z-[10003] flex items-center justify-center p-4">
                                <div className="bg-white rounded-lg w-full max-w-md max-h-[80vh] overflow-y-auto">
                                    <div className="sticky top-0 bg-[#4A9EFF] text-white p-4 rounded-t-lg flex justify-between items-center z-10">
                                        <h3 className="font-bold">保存方法について</h3>
                                        <button
                                            onClick={() => setShowExerciseSaveMethodInfo(false)}
                                            className="p-1 hover:bg-white hover:bg-opacity-20 rounded"
                                        >
                                            <Icon name="X" size={20} />
                                        </button>
                                    </div>
                                    <div className="p-4 space-y-4">
                                        <div className="border-l-4 border-blue-500 pl-4 py-2">
                                            <h4 className="font-semibold text-gray-900 mb-1">データベースに保存</h4>
                                            <p className="text-sm text-gray-700">
                                                カスタム種目をデータベースに保存します。今すぐ記録には追加されませんが、次回以降、種目検索から簡単に見つけて使用できます。
                                            </p>
                                            <p className="text-xs text-gray-600 mt-2">
                                                <strong>使用例：</strong>よく行う自己流トレーニングを登録しておきたい場合
                                            </p>
                                        </div>

                                        <div className="border-l-4 border-green-500 pl-4 py-2">
                                            <h4 className="font-semibold text-gray-900 mb-1">リストに追加</h4>
                                            <p className="text-sm text-gray-700">
                                                カスタム種目をデータベースに保存し、同時に種目選択状態にします。今すぐ記録したい場合に便利です。
                                            </p>
                                            <p className="text-xs text-gray-600 mt-2">
                                                <strong>使用例：</strong>新しい種目を作成してすぐに記録したい場合
                                            </p>
                                        </div>

                                        <button
                                            onClick={() => setShowExerciseSaveMethodInfo(false)}
                                            className="w-full bg-[#4A9EFF] text-white font-bold py-3 px-6 rounded-lg hover:bg-[#3b8fef] shadow-lg transition"
                                        >
                                            閉じる
                                        </button>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* 種目選択後の入力フォーム */}
                        {currentExercise && (
                            <div className="space-y-4">
                                <div className="bg-orange-50 p-4 rounded-lg border border-orange-200">
                                    <div className="flex justify-between items-start mb-2">
                                        <div>
                                            <h4 className="font-bold text-lg">{currentExercise.name}</h4>
                                            <p className="text-sm text-gray-600">{currentExercise.category}</p>
                                        </div>
                                        <button
                                            onClick={() => {
                                                setCurrentExercise(null);
                                                setSets([]);
                                            }}
                                            className="text-gray-500 hover:text-gray-700"
                                        >
                                            <Icon name="X" size={20} />
                                        </button>
                                    </div>
                                </div>

                                {/* ストレッチ・有酸素種目の場合：時間のみ入力 */}
                                {(currentExercise.exerciseType === 'stretch' || currentExercise.exerciseType === 'aerobic') ? (
                                    <div className="space-y-3">
                                        {/* 総時間入力 */}
                                        <div>
                                            <label className="block text-sm font-medium mb-1 flex items-center gap-2">
                                                総時間 (分)
                                            </label>
                                            <input
                                                type="number"
                                                value={currentSet.duration || 0}
                                                onChange={(e) => setCurrentSet({...currentSet, duration: Number(e.target.value)})}
                                                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"
                                            />
                                            <div className="my-3">
                                                <input
                                                    type="range"
                                                    min="0"
                                                    max="120"
                                                    step="1"
                                                    value={currentSet.duration || 0}
                                                    onChange={(e) => setCurrentSet({...currentSet, duration: Number(e.target.value)})}
                                                    className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
                                                    style={{
                                                        background: `linear-gradient(to right, #2563eb 0%, #2563eb ${((currentSet.duration || 0)/120)*100}%, #e5e7eb ${((currentSet.duration || 0)/120)*100}%, #e5e7eb 100%)`
                                                    }}
                                                />
                                                <div className="flex justify-between text-xs text-gray-500 mt-1">
                                                    <span onClick={() => setCurrentSet({...currentSet, duration: 0})} className="cursor-pointer hover:text-blue-600 hover:font-bold transition">0分</span>
                                                    <span onClick={() => setCurrentSet({...currentSet, duration: 30})} className="cursor-pointer hover:text-blue-600 hover:font-bold transition">30分</span>
                                                    <span onClick={() => setCurrentSet({...currentSet, duration: 60})} className="cursor-pointer hover:text-blue-600 hover:font-bold transition">60分</span>
                                                    <span onClick={() => setCurrentSet({...currentSet, duration: 90})} className="cursor-pointer hover:text-blue-600 hover:font-bold transition">90分</span>
                                                    <span onClick={() => setCurrentSet({...currentSet, duration: 120})} className="cursor-pointer hover:text-blue-600 hover:font-bold transition">120分</span>
                                                </div>
                                            </div>
                                        </div>

                                        {/* セット追加ボタン */}
                                        <button
                                            type="button"
                                            onClick={() => {
                                                if (!currentSet.duration || currentSet.duration === 0) {
                                                    toast('時間を入力してください');
                                                    return;
                                                }
                                                setSets([...sets, {...currentSet}]);
                                                setCurrentSet({ duration: currentSet.duration });
                                            }}
                                            className="w-full py-3 bg-[#4A9EFF] text-white font-bold px-6 rounded-lg hover:bg-[#3b8fef] shadow-lg transition flex items-center justify-center gap-2"
                                        >
                                            <Icon name="Plus" size={18} />
                                            追加
                                        </button>

                                        {/* 追加済みセットリスト */}
                                        {sets.length > 0 && (
                                            <div className="p-3 rounded-lg border-2" style={{backgroundColor: '#EFF6FF', borderColor: '#4A9EFF'}}>
                                                <p className="text-xs font-bold mb-2" style={{color: '#4A9EFF'}}>追加済み（{sets.length}セット）</p>
                                                <div className="space-y-1">
                                                    {sets.map((set, idx) => (
                                                        <div key={idx} className="flex justify-between items-center text-sm bg-white p-2 rounded">
                                                            <span className="font-medium">セット{idx + 1}</span>
                                                            <span className="text-gray-600">{set.duration}分</span>
                                                            <button
                                                                onClick={() => setSets(sets.filter((_, i) => i !== idx))}
                                                                className="text-red-500 hover:text-red-700"
                                                            >
                                                                <Icon name="X" size={16} />
                                                            </button>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                ) : (
                                    <div className="space-y-3">
                                        {/* 通常の運動：重量・回数・可動距離入力 */}
                                        {/* 重量入力 */}
                                        <div>
                                        <label className="block text-sm font-medium mb-1 flex items-center gap-2">
                                            重量 (kg)
                                            </label>
                                            {/* 入力欄 */}
                                            <input
                                                type="number"
                                                value={currentSet.weight === '' ? '' : (currentSet.weight || 0)}
                                                onChange={(e) => setCurrentSet({...currentSet, weight: e.target.value})}
                                                onBlur={(e) => {
                                                    // フォーカスが外れた際に空文字列なら0にする
                                                    if (e.target.value === '') {
                                                        setCurrentSet({...currentSet, weight: 0});
                                                    }
                                                }}
                                                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:outline-none"
                                            />
                                            {/* スライダー - 重量 */}
                                            <div className="my-3">
                                                <input
                                                    type="range"
                                                    min="0"
                                                    max="500"
                                                    step="2.5"
                                                    value={currentSet.weight || 0}
                                                    onChange={(e) => setCurrentSet({...currentSet, weight: e.target.value === '' ? 0 : Number(e.target.value)})}
                                                    className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-orange-600"
                                                    style={{
                                                        background: `linear-gradient(to right, #ea580c 0%, #ea580c ${((currentSet.weight || 0)/500)*100}%, #e5e7eb ${((currentSet.weight || 0)/500)*100}%, #e5e7eb 100%)`
                                                    }}
                                                />
                                                <div className="flex justify-between text-xs text-gray-500 mt-1">
                                                    <span onClick={() => setCurrentSet({...currentSet, weight: 0})} className="cursor-pointer hover:text-orange-600 hover:font-bold transition">0kg</span>
                                                    <span onClick={() => setCurrentSet({...currentSet, weight: 100})} className="cursor-pointer hover:text-orange-600 hover:font-bold transition">100kg</span>
                                                    <span onClick={() => setCurrentSet({...currentSet, weight: 200})} className="cursor-pointer hover:text-orange-600 hover:font-bold transition">200kg</span>
                                                    <span onClick={() => setCurrentSet({...currentSet, weight: 300})} className="cursor-pointer hover:text-orange-600 hover:font-bold transition">300kg</span>
                                                    <span onClick={() => setCurrentSet({...currentSet, weight: 400})} className="cursor-pointer hover:text-orange-600 hover:font-bold transition">400kg</span>
                                                    <span onClick={() => setCurrentSet({...currentSet, weight: 500})} className="cursor-pointer hover:text-orange-600 hover:font-bold transition">500kg</span>
                                                </div>
                                            </div>
                                            {/* 増減ボタン */}
                                            <div className="grid grid-cols-6 gap-1 mt-2">
                                                <button
                                                    type="button"
                                                    onClick={() => setCurrentSet({...currentSet, weight: Math.max(0, Number(currentSet.weight) - 10)})}
                                                    className="py-1.5 bg-red-100 text-red-600 rounded text-xs hover:bg-red-200 font-medium"
                                                >
                                                    -10
                                                </button>
                                                <button
                                                    type="button"
                                                    onClick={() => setCurrentSet({...currentSet, weight: Math.max(0, Number(currentSet.weight) - 5)})}
                                                    className="py-1.5 bg-red-50 text-red-600 rounded text-xs hover:bg-red-100 font-medium"
                                                >
                                                    -5
                                                </button>
                                                <button
                                                    type="button"
                                                    onClick={() => setCurrentSet({...currentSet, weight: Math.max(0, Number(currentSet.weight) - 2.5)})}
                                                    className="py-1.5 bg-red-50 text-red-600 rounded text-xs hover:bg-red-100 font-medium"
                                                >
                                                    -2.5
                                                </button>
                                                <button
                                                    type="button"
                                                    onClick={() => setCurrentSet({...currentSet, weight: Number(currentSet.weight) + 2.5})}
                                                    className="py-1.5 bg-green-50 text-green-600 rounded text-xs hover:bg-green-100 font-medium"
                                                >
                                                    +2.5
                                                </button>
                                                <button
                                                    type="button"
                                                    onClick={() => setCurrentSet({...currentSet, weight: Number(currentSet.weight) + 5})}
                                                    className="py-1.5 bg-green-50 text-green-600 rounded text-xs hover:bg-green-100 font-medium"
                                                >
                                                    +5
                                                </button>
                                                <button
                                                    type="button"
                                                    onClick={() => setCurrentSet({...currentSet, weight: Number(currentSet.weight) + 10})}
                                                    className="py-1.5 bg-green-100 text-green-600 rounded text-xs hover:bg-green-200 font-medium"
                                                >
                                                    +10
                                                </button>
                                            </div>
                                    </div>

                                    {/* 回数入力 */}
                                    <div>
                                        <label className="block text-sm font-medium mb-1">
                                            回数
                                        </label>
                                            {/* 入力欄 */}
                                            <input
                                                type="number"
                                                value={currentSet.reps === '' ? '' : (currentSet.reps || 1)}
                                                onChange={(e) => setCurrentSet({...currentSet, reps: e.target.value})}
                                                onBlur={(e) => {
                                                    // フォーカスが外れた際に空文字列または0以下なら1にする
                                                    const val = Number(e.target.value);
                                                    if (e.target.value === '' || val < 1) {
                                                        setCurrentSet({...currentSet, reps: 1});
                                                    }
                                                }}
                                                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:outline-none"
                                            />
                                            {/* スライダー - 回数 */}
                                            <div className="my-2">
                                                <input
                                                    type="range"
                                                    min="1"
                                                    max="50"
                                                    step="1"
                                                    value={currentSet.reps || 1}
                                                    onChange={(e) => setCurrentSet({...currentSet, reps: e.target.value === '' ? 1 : Number(e.target.value)})}
                                                    className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-orange-600"
                                                    style={{
                                                        background: `linear-gradient(to right, #ea580c 0%, #ea580c ${((currentSet.reps || 1)/50)*100}%, #e5e7eb ${((currentSet.reps || 1)/50)*100}%, #e5e7eb 100%)`
                                                    }}
                                                />
                                                <div className="flex justify-between text-xs text-gray-500 mt-1">
                                                    <span onClick={() => setCurrentSet({...currentSet, reps: 1})} className="cursor-pointer hover:text-orange-600 hover:font-bold transition">1回</span>
                                                    <span onClick={() => setCurrentSet({...currentSet, reps: 10})} className="cursor-pointer hover:text-orange-600 hover:font-bold transition">10回</span>
                                                    <span onClick={() => setCurrentSet({...currentSet, reps: 20})} className="cursor-pointer hover:text-orange-600 hover:font-bold transition">20回</span>
                                                    <span onClick={() => setCurrentSet({...currentSet, reps: 30})} className="cursor-pointer hover:text-orange-600 hover:font-bold transition">30回</span>
                                                    <span onClick={() => setCurrentSet({...currentSet, reps: 40})} className="cursor-pointer hover:text-orange-600 hover:font-bold transition">40回</span>
                                                    <span onClick={() => setCurrentSet({...currentSet, reps: 50})} className="cursor-pointer hover:text-orange-600 hover:font-bold transition">50回</span>
                                                </div>
                                            </div>
                                            {/* 増減ボタン */}
                                            <div className="grid grid-cols-6 gap-1 mt-2">
                                                <button
                                                    type="button"
                                                    onClick={() => setCurrentSet({...currentSet, reps: Math.max(1, Number(currentSet.reps) - 5)})}
                                                    className="py-1.5 bg-red-100 text-red-600 rounded text-xs hover:bg-red-200 font-medium"
                                                >
                                                    -5
                                                </button>
                                                <button
                                                    type="button"
                                                    onClick={() => setCurrentSet({...currentSet, reps: Math.max(1, Number(currentSet.reps) - 3)})}
                                                    className="py-1.5 bg-red-50 text-red-600 rounded text-xs hover:bg-red-100 font-medium"
                                                >
                                                    -3
                                                </button>
                                                <button
                                                    type="button"
                                                    onClick={() => setCurrentSet({...currentSet, reps: Math.max(1, Number(currentSet.reps) - 1)})}
                                                    className="py-1.5 bg-red-50 text-red-600 rounded text-xs hover:bg-red-100 font-medium"
                                                >
                                                    -1
                                                </button>
                                                <button
                                                    type="button"
                                                    onClick={() => setCurrentSet({...currentSet, reps: Number(currentSet.reps) + 1})}
                                                    className="py-1.5 bg-green-50 text-green-600 rounded text-xs hover:bg-green-100 font-medium"
                                                >
                                                    +1
                                                </button>
                                                <button
                                                    type="button"
                                                    onClick={() => setCurrentSet({...currentSet, reps: Number(currentSet.reps) + 3})}
                                                    className="py-1.5 bg-green-50 text-green-600 rounded text-xs hover:bg-green-100 font-medium"
                                                >
                                                    +3
                                                </button>
                                                <button
                                                    type="button"
                                                    onClick={() => setCurrentSet({...currentSet, reps: Number(currentSet.reps) + 5})}
                                                    className="py-1.5 bg-green-100 text-green-600 rounded text-xs hover:bg-green-200 font-medium"
                                                >
                                                    +5
                                                </button>
                                            </div>
                                    </div>

                                    {/* RM更新記録（構造化） */}
                                    <div>
                                        <label className="block text-sm font-medium mb-1 flex items-center gap-2">
                                            RM更新記録（任意）
                                            <button
                                                type="button"
                                                onClick={() => setWorkoutInfoModal({
                                                    show: true,
                                                    title: 'RM更新記録とは？',
                                                    content: `この種目で自己ベスト（RM: Repetition Maximum）を更新した場合に記録します。

【RMとは】
• 1RM: 1回だけ挙げられる最大重量
• 5RM: 5回だけ挙げられる最大重量
• 10RM: 10回だけ挙げられる最大重量

【記録例】
• ベンチプレス 1RM × 100kg
• スクワット 5RM × 120kg
• デッドリフト 3RM × 150kg

【活用方法】
履歴画面でRM更新の記録を確認でき、筋力の成長を可視化できます。目標達成のモチベーション維持に役立ちます。

【入力方法】
RM回数と重量を別々に入力してください。`
                                                })}
                                                className="text-[#4A9EFF] hover:text-[#3b8fef]"
                                            >
                                                <Icon name="HelpCircle" size={16} />
                                            </button>
                                        </label>
                                        <div className="grid grid-cols-2 gap-2">
                                            <div>
                                                <label className="text-xs text-gray-600 block mb-1">RM回数</label>
                                                <input
                                                    type="number"
                                                    value={currentSet.rm || ''}
                                                    onChange={(e) => setCurrentSet({...currentSet, rm: e.target.value === '' ? '' : Number(e.target.value)})}
                                                    placeholder="1, 3, 5..."
                                                    className="w-full px-3 py-2 border rounded-lg text-sm"
                                                />
                                            </div>
                                            <div>
                                                <label className="text-xs text-gray-600 block mb-1">重量 (kg)</label>
                                                <input
                                                    type="number"
                                                    value={currentSet.rmWeight || ''}
                                                    onChange={(e) => setCurrentSet({...currentSet, rmWeight: e.target.value === '' ? '' : Number(e.target.value)})}
                                                    placeholder="100"
                                                    className="w-full px-3 py-2 border rounded-lg text-sm"
                                                />
                                            </div>
                                        </div>
                                    </div>

                                    {/* 総時間（常設） */}
                                    <div>
                                        <label className="block text-sm font-medium mb-1 flex items-center gap-2">
                                            総時間 (分)
                                            <button
                                                type="button"
                                                onClick={() => setWorkoutInfoModal({
                                                    show: true,
                                                    title: '総時間とは？',
                                                    content: `この種目に費やした総時間を分単位で入力します。ウォームアップからクールダウンまでの全体時間です。

【入力の目安】
• 筋トレ: 5～15分/種目（セット間休憩含む）
• 有酸素運動: 実施した時間（例: ランニング30分）
• ストレッチ: 実施した時間

【意図】
総時間は、セット間の休憩時間や準備動作も含めた総合的な運動時間を把握するための指標です。特に有酸素運動や持久系トレーニングでは重要な入力項目となります。

【オプション】
この項目は任意入力です。空欄の場合は他のパラメータから消費カロリーを算出します。`
                                                })}
                                                className="text-[#4A9EFF] hover:text-[#3b8fef]"
                                            >
                                                <Icon name="HelpCircle" size={16} />
                                            </button>
                                        </label>
                                        <input
                                            type="number"
                                            value={currentSet.duration}
                                            onChange={(e) => setCurrentSet({...currentSet, duration: e.target.value === '' ? '' : Number(e.target.value)})}
                                            placeholder="この種目にかかった時間"
                                            className="w-full px-3 py-2 border rounded-lg"
                                        />
                                    </div>

                                    {/* セット追加ボタン（筋トレのみ：アップセット/メインセット） */}
                                    {currentExercise.exerciseType === 'anaerobic' ? (
                                        <div className="grid grid-cols-2 gap-2">
                                            <button
                                                onClick={() => {
                                                    setSets([...sets, { ...currentSet, setType: 'warmup' }]);
                                                }}
                                                className="bg-blue-100 text-blue-700 font-bold py-3 px-6 rounded-lg hover:bg-blue-200 shadow-lg transition"
                                            >
                                                アップ追加
                                            </button>
                                            <button
                                                onClick={() => {
                                                    setSets([...sets, { ...currentSet, setType: 'main' }]);
                                                }}
                                                className="bg-orange-100 text-orange-700 font-bold py-3 px-6 rounded-lg hover:bg-orange-200 shadow-lg transition"
                                            >
                                                メイン追加
                                            </button>
                                        </div>
                                    ) : (
                                        <button
                                            onClick={() => {
                                                setSets([...sets, { ...currentSet }]);
                                            }}
                                            className="w-full px-4 py-2 bg-[#4A9EFF] text-white font-bold rounded-lg hover:bg-[#3b8fef] shadow-lg transition flex items-center justify-center gap-2"
                                        >
                                            <Icon name="Plus" size={20} />
                                            <span>追加</span>
                                        </button>
                                    )}

                                    {sets.length > 0 && (
                                        <div className="bg-gray-50 p-3 rounded-lg">
                                            <p className="text-sm font-medium mb-2">セット一覧</p>
                                            {sets.map((set, index) => (
                                                <div key={index} className="border-b border-gray-200 py-2 text-sm last:border-0">
                                                    <div className="flex justify-between items-center mb-1">
                                                        <div className="flex items-center gap-2">
                                                            <span className="font-medium">Set {index + 1}</span>
                                                            {currentExercise.exerciseType === 'anaerobic' && (
                                                                <>
                                                                    {set.setType === 'warmup' ? (
                                                                        <span className="px-2 py-0.5 bg-blue-100 text-blue-700 rounded text-xs font-medium">
                                                                            アップ
                                                                        </span>
                                                                    ) : (
                                                                        <span className="px-2 py-0.5 bg-orange-100 text-orange-700 rounded text-xs font-medium">
                                                                            メイン
                                                                        </span>
                                                                    )}
                                                                </>
                                                            )}
                                                        </div>
                                                        <button
                                                            onClick={() => setSets(sets.filter((_, i) => i !== index))}
                                                            className="text-red-500 hover:text-red-700 p-1"
                                                        >
                                                            <Icon name="Trash2" size={16} />
                                                        </button>
                                                    </div>
                                                    <div className="text-xs text-gray-600 space-y-0.5">
                                                        {currentExercise.exerciseType === 'anaerobic' ? (
                                                            <>
                                                                <div><span>重量: {set.weight}kg</span></div>
                                                                <div><span>回数: {set.reps}回</span></div>
                                                                <div><span>体積: {calculateSetVolume(set)} kg×reps</span></div>
                                                                {set.rm && set.rmWeight && (
                                                                    <div className="text-orange-600 font-medium">
                                                                        <span>🏆 RM更新: {set.rm}RM × {set.rmWeight}kg</span>
                                                                    </div>
                                                                )}
                                                            </>
                                                        ) : (
                                                            <div><span>時間: {set.duration || 0}分</span></div>
                                                        )}
                                                    </div>
                                                </div>
                                            ))}
                                            {currentExercise.exerciseType === 'anaerobic' && (
                                                <div className="border-t mt-2 pt-2 space-y-1">
                                                    <div className="flex justify-between text-sm text-gray-600">
                                                        <span>総体積</span>
                                                        <span>{sets.reduce((sum, s) => sum + calculateSetVolume(s), 0)} kg×reps</span>
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </div>
                                )}

                                <button
                                    onClick={() => {
                                        if (sets.length === 0) return;

                                        // 有酸素・ストレッチの場合は、種目名と総時間のみ記録
                                        let newExercise;
                                        if (currentExercise.exerciseType === 'aerobic' || currentExercise.exerciseType === 'stretch') {
                                            // 総時間を計算
                                            const totalDuration = sets.reduce((sum, set) => sum + (set.duration || 0), 0);
                                            newExercise = {
                                                exercise: {
                                                    ...currentExercise,
                                                    name: currentExercise.name || currentExercise.exercise?.name
                                                },
                                                name: currentExercise.name || currentExercise.exercise?.name,  // 種目名を直接保存
                                                duration: totalDuration, // 総時間のみ
                                                totalDuration: totalDuration,
                                                exerciseType: currentExercise.exerciseType
                                            };
                                        } else {
                                            // 筋トレの場合は従来通り（セット詳細を含む）
                                            newExercise = {
                                                exercise: {
                                                    ...currentExercise,
                                                    name: currentExercise.name || currentExercise.exercise?.name
                                                },
                                                name: currentExercise.name || currentExercise.exercise?.name,  // 種目名を直接保存
                                                sets: sets,
                                                exerciseType: currentExercise.exerciseType
                                            };
                                        }

                                        setExercises([...exercises, newExercise]);
                                        setCurrentExercise(null);
                                        setSets([]);
                                    }}
                                    disabled={sets.length === 0}
                                    className="w-full bg-[#4A9EFF] text-white font-bold py-3 px-6 rounded-lg hover:bg-[#3b8fef] shadow-lg transition disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    {editingTemplateId ? '種目を追加' : '種目追加'}
                                </button>
                            </div>
                        )}

                        {/* 追加済み種目リスト */}
                        {exercises.length > 0 && !currentExercise && (
                            <div className="p-4 rounded-lg border-2" style={{backgroundColor: '#EFF6FF', borderColor: '#4A9EFF'}}>
                                {/* ヘッダー：タイトル + 保存ボタン */}
                                <div className="flex justify-between items-center mb-3">
                                    <p className="text-sm font-bold" style={{color: '#4A9EFF'}}>追加済み（{exercises.length}種目）</p>
                                    {!editingTemplateId && (
                                        <button
                                            onClick={saveAsTemplate}
                                            className="px-3 bg-purple-50 text-purple-700 border-2 border-purple-500 rounded-lg font-semibold hover:bg-purple-100 transition flex flex-col items-center justify-center"
                                        >
                                            <Icon name="BookTemplate" size={16} className="mb-1" />
                                            <span className="text-xs whitespace-nowrap">保存</span>
                                        </button>
                                    )}
                                </div>

                                {/* 種目一覧 */}
                                <div className="space-y-2 mb-3">
                                    {exercises.map((ex, index) => {
                                        // 有酸素・ストレッチの場合は総時間のみ、筋トレの場合は総重量も計算
                                        const isCardioOrStretch = ex.exerciseType === 'aerobic' || ex.exerciseType === 'stretch';

                                        let totalVolume = 0;
                                        let totalDuration = 0;

                                        if (isCardioOrStretch) {
                                            // 有酸素・ストレッチ: durationのみ
                                            totalDuration = ex.duration || 0;
                                        } else {
                                            // 筋トレ: setsから計算
                                            totalVolume = ex.sets.reduce((sum, set) => {
                                                return sum + (set.weight || 0) * (set.reps || 0);
                                            }, 0);
                                            totalDuration = ex.sets.reduce((sum, set) => {
                                                return sum + (set.duration || 0);
                                            }, 0);
                                        }

                                        // RM更新があるかチェック
                                        const rmUpdates = !isCardioOrStretch && ex.sets ? ex.sets.filter(set => set.rm && set.rmWeight) : [];

                                        return (
                                            <div key={index} className="bg-white p-3 rounded-lg border border-gray-200">
                                                <div className="flex justify-between items-start mb-1">
                                                    <div className="flex-1">
                                                        <p className="font-medium text-sm">{ex.exercise.name}</p>
                                                        {isCardioOrStretch ? (
                                                            <p className="text-xs text-gray-600">{totalDuration}分</p>
                                                        ) : (
                                                            <>
                                                                <p className="text-xs text-gray-600">{ex.sets.length}セット - {totalVolume}kg</p>
                                                                {rmUpdates.length > 0 && (
                                                                    <p className="text-xs text-orange-600 font-medium">
                                                                        🏆 {rmUpdates.map(s => `${s.rm}RM×${s.rmWeight}kg`).join(', ')}
                                                                    </p>
                                                                )}
                                                            </>
                                                        )}
                                                    </div>
                                                    <div className="flex gap-2">
                                                        <button
                                                            onClick={() => {
                                                                // 編集：該当種目をcurrentExerciseに戻す
                                                                setCurrentExercise(ex.exercise);
                                                                if (isCardioOrStretch) {
                                                                    // 有酸素・ストレッチは時間を1セットとして扱う
                                                                    setSets([{ duration: ex.duration }]);
                                                                } else {
                                                                    setSets(ex.sets);
                                                                }
                                                                setExercises(exercises.filter((_, i) => i !== index));
                                                            }}
                                                            className="w-10 h-10 rounded-lg bg-white shadow-md flex items-center justify-center text-blue-600 hover:bg-blue-50 transition border-2 border-blue-500"
                                                        >
                                                            <Icon name="Edit" size={18} />
                                                        </button>
                                                        <button
                                                            onClick={() => setExercises(exercises.filter((_, i) => i !== index))}
                                                            className="w-10 h-10 rounded-lg bg-white shadow-md flex items-center justify-center text-red-600 hover:bg-red-50 transition border-2 border-red-500"
                                                        >
                                                            <Icon name="Trash2" size={18} />
                                                        </button>
                                                    </div>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>

                                {/* 総重量・総時間の表示 */}
                                <div className="grid grid-cols-2 gap-4 p-3 bg-white rounded-lg border border-gray-200 mb-3">
                                    {/* 総重量: 筋トレのみ表示 */}
                                    {exercises.some(ex => ex.exerciseType === 'anaerobic') && (
                                        <div className="text-center">
                                            <p className="text-xs text-gray-600 mb-1">総重量</p>
                                            <p className="text-lg font-bold text-orange-600">
                                                {exercises.reduce((sum, ex) => {
                                                    if (ex.exerciseType === 'anaerobic' && ex.sets) {
                                                        return sum + ex.sets.reduce((setSum, set) => {
                                                            return setSum + (set.weight || 0) * (set.reps || 0);
                                                        }, 0);
                                                    }
                                                    return sum;
                                                }, 0)}kg
                                            </p>
                                        </div>
                                    )}
                                    {/* 総時間: すべての種目で表示 */}
                                    <div className="text-center">
                                        <p className="text-xs text-gray-600 mb-1">総時間</p>
                                        <p className="text-lg font-bold text-orange-600">
                                            {exercises.reduce((sum, ex) => {
                                                if (ex.exerciseType === 'aerobic' || ex.exerciseType === 'stretch') {
                                                    // 有酸素・ストレッチ: durationを直接加算
                                                    return sum + (ex.duration || 0);
                                                } else if (ex.sets) {
                                                    // 筋トレ: setsから計算
                                                    return sum + ex.sets.reduce((setSum, set) => {
                                                        return setSum + (set.duration || 0);
                                                    }, 0);
                                                }
                                                return sum;
                                            }, 0)}分
                                        </p>
                                    </div>
                                </div>

                                {/* 種目を追加ボタン */}
                                <button
                                    onClick={() => setShowSearchModal(true)}
                                    className="w-full bg-[#4A9EFF] text-white font-bold py-3 px-6 rounded-lg hover:bg-[#3b8fef] shadow-lg transition mb-2"
                                >
                                    追加
                                </button>

                                {/* テンプレート名入力（編集モード時） */}
                                {editingTemplateId && (
                                    <div className="mb-3">
                                        <label className="block text-sm font-medium mb-2">テンプレート名</label>
                                        <input
                                            type="text"
                                            value={editingTemplateObj?.name || ''}
                                            onChange={(e) => setEditingTemplateObj({...editingTemplateObj, name: e.target.value})}
                                            placeholder="例: 胸トレ1"
                                            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:outline-none"
                                        />
                                    </div>
                                )}

                                {/* 記録ボタン */}
                                <div className="grid grid-cols-2 gap-2">
                                    <button
                                        onClick={editingTemplateId ? async () => {
                                            // テンプレート更新処理
                                            if (!editingTemplateObj?.name || !editingTemplateObj.name.trim()) {
                                                toast.error('テンプレート名を入力してください');
                                                return;
                                            }

                                            const updatedTemplate = {
                                                ...editingTemplateObj,
                                                name: editingTemplateObj.name.trim(),
                                                exercises: exercises,
                                                updatedAt: new Date().toISOString()
                                            };

                                            try {
                                                await window.DataService.saveWorkoutTemplate(user.uid, updatedTemplate);
                                                const templates = await window.DataService.getWorkoutTemplates(user.uid);
                                                setWorkoutTemplates(templates || []);
                                                toast.success('テンプレートを更新しました');

                                                // 編集モード解除
                                                setEditingTemplateId(null);
                                                setEditingTemplateObj(null);
                                                setExercises([]);
                                                onClose();
                                            } catch (error) {
                                                console.error('テンプレート更新エラー:', error);
                                                toast.error('テンプレートの更新に失敗しました');
                                            }
                                        } : isEditMode ? async () => {
                                            // 運動記録更新処理（食事モーダルと同じ仕様）
                                            const updatedWorkout = {
                                                ...editingWorkout,
                                                exercises: exercises,
                                                timestamp: editingWorkout.timestamp,
                                                updatedAt: new Date().toISOString()
                                            };

                                            if (onUpdate) {
                                                onUpdate(updatedWorkout);
                                                onClose();
                                            }
                                        } : handleWorkoutSave}
                                        className="bg-[#4A9EFF] text-white font-bold py-3 px-6 rounded-lg hover:bg-[#3b8fef] shadow-lg transition"
                                    >
                                        {editingTemplateId ? '更新' : isEditMode ? '更新' : '記録'}
                                    </button>
                                    <button
                                        onClick={onClose}
                                        className="bg-gray-300 text-gray-700 font-bold py-3 rounded-lg hover:bg-gray-400 transition"
                                    >
                                        キャンセル
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                );
            };

// ========== 運動記録コンポーネント終了 ==========

            // 運動専用モーダル：type !== 'workout' の場合はエラー
            if (type !== 'workout') {
                return (
                    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[10000]">
                        <div className="bg-white rounded-lg p-6 max-w-md">
                            <h2 className="text-xl font-bold mb-4 text-red-600">エラー</h2>
                            <p className="mb-4">このモーダルは運動記録専用です。type='{type}' は対応していません。</p>
                            <button onClick={onClose} className="bg-blue-500 text-white px-4 py-2 rounded">閉じる</button>
                        </div>
                    </div>
                );
            }

            return (
                <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-2xl w-full max-w-md max-h-[80vh] overflow-hidden slide-up flex flex-col">
                        <div className="bg-white border-b p-4 flex justify-between items-center flex-shrink-0">
                            {/* 運動名（編集可能） */}
                            {type === 'workout' ? (
                                <div className="flex-1 min-w-0 mr-2">
                                    {isEditingWorkoutName ? (
                                        <input
                                            type="text"
                                            value={workoutName}
                                            onChange={(e) => setWorkoutName(e.target.value)}
                                            onBlur={() => {
                                                if (!workoutName.trim()) {
                                                    setWorkoutName('トレーニング');
                                                }
                                                setIsEditingWorkoutName(false);
                                            }}
                                            onKeyDown={(e) => {
                                                if (e.key === 'Enter') {
                                                    if (!workoutName.trim()) {
                                                        setWorkoutName('トレーニング');
                                                    }
                                                    setIsEditingWorkoutName(false);
                                                }
                                            }}
                                            className="text-lg font-bold border border-gray-300 rounded-lg px-2 py-1 focus:outline-none focus:border-blue-500 w-full"
                                            autoFocus
                                        />
                                    ) : (
                                        <h3 className="text-lg font-bold truncate">{workoutName}</h3>
                                    )}
                                </div>
                            ) : null}
                            <div className="flex items-center gap-2">
                                {/* 運動名編集ボタン */}
                                {type === 'workout' && !isEditingWorkoutName && (
                                    <button
                                        onClick={() => setIsEditingWorkoutName(true)}
                                        className="min-w-[44px] min-h-[44px] rounded-lg bg-white shadow-md flex items-center justify-center text-[#4A9EFF] hover:bg-blue-50 transition border-2 border-[#4A9EFF]"
                                        title="編集"
                                    >
                                        <Icon name="Edit" size={18} />
                                    </button>
                                )}
                                {type === 'workout' && (
                                    <button
                                        onClick={() => setShowWorkoutInfoModal(true)}
                                        className="p-1.5 hover:bg-gray-100 rounded-full transition"
                                        title="使い方"
                                        style={{color: '#4A9EFF'}}
                                    >
                                        <Icon name="HelpCircle" size={16} />
                                    </button>
                                )}
                                <button onClick={() => {
                                    // 運動記録中に種目を選択している場合は、まず検索リストに戻る
                                    if (currentExercise) {
                                        setCurrentExercise(null);
                                    } else {
                                        onClose();
                                    }
                                }} className="p-2 hover:bg-gray-100 rounded-full">
                                    <Icon name="X" size={20} />
                                </button>
                            </div>
                        </div>
                        <div className="p-6 overflow-y-auto flex-1">
                            {renderWorkoutInput()}
                        </div>
                    </div>


                    {/* 運動記録の使い方モーダル */}
                    {showWorkoutInfoModal && (
                        <div className="fixed inset-0 bg-black bg-opacity-50 z-[10002] flex items-center justify-center p-4">
                            <div className="bg-white rounded-2xl w-full max-w-3xl max-h-[90vh] overflow-y-auto">
                                {/* ヘッダー */}
                                <div className="sticky top-0 bg-orange-600 text-white p-4 rounded-t-2xl flex justify-between items-center z-10">
                                    <h3 className="text-lg font-bold flex items-center gap-2">
                                        <Icon name="Dumbbell" size={20} />
                                        運動記録の使い方
                                    </h3>
                                    <button
                                        onClick={() => setShowWorkoutInfoModal(false)}
                                        className="p-2 hover:bg-white hover:bg-opacity-20 rounded-full transition"
                                    >
                                        <Icon name="X" size={20} />
                                    </button>
                                </div>

                                <div className="p-6 space-y-6">
                                    {/* 記録方法 */}
                                    <div className="space-y-4">
                                        <h4 className="font-bold text-gray-800 text-lg flex items-center gap-2">
                                            <Icon name="Plus" size={20} className="text-orange-600" />
                                            運動の記録方法
                                        </h4>
                                        <div className="space-y-3">
                                            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                                                <p className="font-semibold text-blue-900 mb-2 flex items-center gap-2">
                                                    <Icon name="Search" size={18} />
                                                    方法1: 検索して記録
                                                </p>
                                                <p className="text-sm text-blue-800 mb-2">
                                                    種目名で検索してデータベースから選択します。
                                                </p>
                                                <p className="text-xs text-blue-700">
                                                    💡 100種類以上の運動種目データベース
                                                </p>
                                            </div>
                                            <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
                                                <p className="font-semibold text-amber-900 mb-2 flex items-center gap-2">
                                                    <Icon name="Edit" size={18} />
                                                    方法2: 手動で作成
                                                </p>
                                                <p className="text-sm text-amber-800 mb-2">
                                                    カスタム種目を自分で作成します。オリジナルの運動を記録できます。
                                                </p>
                                                <p className="text-xs text-amber-700">
                                                    💡 一度作成すると保存され、次回から簡単に使用可能
                                                </p>
                                            </div>
                                        </div>
                                    </div>

                                    {/* 入力項目 */}
                                    <div className="space-y-3">
                                        <h4 className="font-bold text-gray-800 text-lg flex items-center gap-2">
                                            <Icon name="Edit3" size={20} className="text-purple-600" />
                                            入力項目
                                        </h4>
                                        <div className="space-y-2">
                                            <div className="bg-purple-50 border border-purple-200 rounded-lg p-3">
                                                <p className="font-semibold text-purple-900 mb-1">種目・セット</p>
                                                <p className="text-sm text-purple-800">
                                                    運動の種目名と実施したセット数を入力します。
                                                </p>
                                            </div>
                                            <div className="bg-purple-50 border border-purple-200 rounded-lg p-3">
                                                <p className="font-semibold text-purple-900 mb-1">重量・回数</p>
                                                <p className="text-sm text-purple-800 mb-2">
                                                    筋トレの場合は、使用重量（kg）と回数を入力します。自重トレーニングの場合は、自分の体重（kg）を記入します。
                                                </p>
                                                <p className="text-xs text-purple-700">
                                                    💡 総重量 = 重量 × 回数 × セット数
                                                </p>
                                            </div>
                                            <div className="bg-purple-50 border border-purple-200 rounded-lg p-3">
                                                <p className="font-semibold text-purple-900 mb-1">時間</p>
                                                <p className="text-sm text-purple-800">
                                                    運動の実施時間（分）を入力します。筋トレ、有酸素運動、ストレッチなど、すべての運動で記録できます。
                                                </p>
                                            </div>
                                        </div>
                                    </div>

                                    {/* RM値について */}
                                    <div className="space-y-3">
                                        <h4 className="font-bold text-gray-800 text-lg flex items-center gap-2">
                                            <Icon name="TrendingUp" size={20} className="text-green-600" />
                                            RM値とは
                                        </h4>
                                        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                                            <p className="font-semibold text-green-900 mb-2">
                                                Repetition Maximum（最大挙上重量）
                                            </p>
                                            <p className="text-sm text-green-800 mb-3">
                                                RM値は、その重量で何回できるかを示す指標です。例えば、100kgで10回できる場合、「10RM = 100kg」となります。
                                            </p>
                                            <div className="bg-white rounded p-3 text-sm text-gray-700 border border-green-300">
                                                <p className="font-semibold mb-2">RM値の計算式:</p>
                                                <p className="text-xs mb-2">1RM（最大挙上重量） = 使用重量 × (1 + 回数 ÷ 40)</p>
                                                <p className="text-xs text-green-700">
                                                    例: 80kg × 10回 → 1RM = 100kg
                                                </p>
                                            </div>
                                        </div>
                                    </div>

                                    {/* 総重量と総時間 */}
                                    <div className="space-y-3">
                                        <h4 className="font-bold text-gray-800 text-lg flex items-center gap-2">
                                            <Icon name="BarChart3" size={20} className="text-[#4A9EFF]" />
                                            総重量と総時間の表示
                                        </h4>
                                        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                                            <p className="font-semibold text-blue-900 mb-2">
                                                運動セクションの見出し横に表示
                                            </p>
                                            <p className="text-sm text-blue-800 mb-3">
                                                その日の筋トレ総重量（kg）と全運動の総時間（分）が自動で集計されて表示されます。
                                            </p>
                                            <div className="bg-white rounded p-3 text-sm text-gray-700 border border-blue-300 space-y-1">
                                                <p className="text-xs"><strong>総重量:</strong> すべての筋トレ種目の「重量×回数×セット数」の合計</p>
                                                <p className="text-xs"><strong>総時間:</strong> すべての運動の時間の合計</p>
                                            </div>
                                        </div>
                                    </div>

                                    {/* 閉じるボタン */}
                                    <div className="pt-4 border-t">
                                        <button
                                            onClick={() => setShowWorkoutInfoModal(false)}
                                            className="w-full bg-orange-600 text-white font-bold py-3 rounded-lg hover:bg-orange-700 transition"
                                        >
                                            閉じる
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* WorkoutInfoModal */}
                    {workoutInfoModal.show && (
                        <div className="fixed inset-0 bg-black bg-opacity-50 z-[10001] flex items-center justify-center p-4">
                            <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full max-h-[80vh] overflow-y-auto">
                                <div className="sticky top-0 bg-white border-b px-6 py-4 flex items-center justify-between z-10">
                                    <h3 className="text-lg font-bold">{workoutInfoModal.title}</h3>
                                    <button onClick={() => setWorkoutInfoModal({ show: false, title: '', content: '' })} className="text-gray-400 hover:text-gray-600">
                                        <Icon name="X" size={24} />
                                    </button>
                                </div>
                                <div className="p-6">
                                    <p className="text-sm text-gray-700 whitespace-pre-wrap">{workoutInfoModal.content}</p>
                                </div>
                                <div className="p-6 border-t">
                                    <button
                                        onClick={() => setWorkoutInfoModal({ show: false, title: '', content: '' })}
                                        className="w-full bg-[#4A9EFF] text-white font-bold py-3 px-6 rounded-lg hover:bg-[#3b8fef] shadow-lg transition"
                                    >
                                        閉じる
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            );
        };


// AddWorkoutModalコンポーネントの定義（運動記録専用）
const AddWorkoutModal = (props) => {
    return <AddItemView {...props} type="workout" />;
};

// グローバルに公開
window.AddItemView = AddItemView;
window.AddWorkoutModal = AddWorkoutModal;

export default AddWorkoutModal;
