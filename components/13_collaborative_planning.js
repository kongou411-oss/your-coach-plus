// ===== Collaborative AI Planning System =====
// AIコーチとの協働プランニング（指示書の代わりにドラフトを提示）

const CollaborativePlanningView = ({ onClose, userId, userProfile, dailyRecord, analysis }) => {
    const [planDraft, setPlanDraft] = useState(null);
    const [isGenerating, setIsGenerating] = useState(false);
    const [isEditing, setIsEditing] = useState(false);
    const [editedPlan, setEditedPlan] = useState(null);

    useEffect(() => {
        generatePlanDraft();
    }, []);

    // プランドラフトを生成
    const generatePlanDraft = async () => {
        setIsGenerating(true);

        try {
            const prompt = `あなたは経験豊富なフィットネスコーチです。以下のデータに基づいて、明日のトレーニング・食事プランの「叩き台」を提案してください。

【重要】
- これは命令ではなく、ユーザーが編集できる「提案」です
- ユーザーが自分で考え、調整する余地を残してください
- 押し付けがましくなく、協力的なトーンで

【ユーザープロフィール】
- LBM: ${userProfile.leanBodyMass}kg
- 目標: ${userProfile.purpose}
- 体重: ${userProfile.weight}kg

【今日の実績】
- カロリー: ${analysis?.actual?.calories || 0}kcal / 目標${analysis?.target?.calories || 0}kcal
- タンパク質: ${analysis?.actual?.protein || 0}g / 目標${analysis?.target?.protein || 0}g
- トレーニング: ${dailyRecord?.workouts?.length || 0}セッション

【提案フォーマット】
以下のJSON形式で出力してください：

{
  "planType": "training" または "nutrition" または "recovery",
  "title": "明日のプラン案",
  "summary": "プランの概要（1-2文）",
  "sections": [
    {
      "type": "training" | "meal" | "supplement" | "rest",
      "title": "セクションタイトル",
      "items": [
        {
          "description": "具体的な内容",
          "timing": "推奨タイミング",
          "rationale": "なぜこれが良いか（簡潔に）"
        }
      ],
      "isOptional": true/false,
      "alternatives": ["代替案1", "代替案2"] // オプション
    }
  ],
  "coachNote": "コーチからの一言（励ましの言葉）"
}

JSONのみを出力し、他のテキストは含めないでください。`;

            const response = await GeminiAPI.sendMessage(prompt, [], userProfile, 'gemini-2.5-pro');

            if (response.success) {
                let jsonText = response.text.trim();
                jsonText = jsonText.replace(/```json\n?/g, '').replace(/```\n?/g, '');

                const draft = JSON.parse(jsonText);
                setPlanDraft(draft);
                setEditedPlan(draft);
            } else {
                throw new Error(response.error);
            }

        } catch (error) {
            console.error('Plan generation error:', error);
            // フォールバックプラン
            setPlanDraft(generateFallbackPlan());
            setEditedPlan(generateFallbackPlan());
        } finally {
            setIsGenerating(false);
        }
    };

    // フォールバックプラン（AI失敗時）
    const generateFallbackPlan = () => {
        const proteinDeficit = (analysis?.target?.protein || 0) - (analysis?.actual?.protein || 0);

        return {
            planType: proteinDeficit > 20 ? "nutrition" : "training",
            title: proteinDeficit > 20 ? "明日の食事プラン案" : "明日のトレーニングプラン案",
            summary: proteinDeficit > 20
                ? `今日はタンパク質が${Math.round(proteinDeficit)}g不足しています。明日は意識的に増やしましょう。`
                : "今日の記録を元に、明日のトレーニングプランを提案します。",
            sections: [
                {
                    type: proteinDeficit > 20 ? "meal" : "training",
                    title: proteinDeficit > 20 ? "タンパク質を増やす食事" : "推奨トレーニング",
                    items: [
                        {
                            description: proteinDeficit > 20
                                ? `鶏むね肉 ${Math.round(proteinDeficit / 0.23)}g を追加`
                                : "ベンチプレス 3セット × 8-12回",
                            timing: proteinDeficit > 20 ? "昼食または夕食" : "午後〜夕方",
                            rationale: proteinDeficit > 20
                                ? "タンパク質不足を補うため"
                                : "大胸筋の発達を促すため"
                        }
                    ],
                    isOptional: false
                }
            ],
            coachNote: "無理せず、できる範囲で取り組みましょう！"
        };
    };

    // プランセクションを編集
    const editSection = (sectionIndex, field, value) => {
        const updated = { ...editedPlan };
        updated.sections[sectionIndex][field] = value;
        setEditedPlan(updated);
    };

    // アイテムを編集
    const editItem = (sectionIndex, itemIndex, field, value) => {
        const updated = { ...editedPlan };
        updated.sections[sectionIndex].items[itemIndex][field] = value;
        setEditedPlan(updated);
    };

    // アイテムを削除
    const removeItem = (sectionIndex, itemIndex) => {
        const updated = { ...editedPlan };
        updated.sections[sectionIndex].items.splice(itemIndex, 1);
        setEditedPlan(updated);
    };

    // プランを保存
    const savePlan = async () => {
        try {
            const tomorrow = new Date();
            tomorrow.setDate(tomorrow.getDate() + 1);
            const tomorrowStr = tomorrow.toISOString().split('T')[0];

            // プランをlocalStorageに保存
            const savedPlans = localStorage.getItem('yourCoachBeta_collaborativePlans') || '{}';
            const plans = JSON.parse(savedPlans);
            plans[tomorrowStr] = {
                ...editedPlan,
                createdAt: new Date().toISOString(),
                userEdited: isEditing
            };

            localStorage.setItem('yourCoachBeta_collaborativePlans', JSON.stringify(plans));

            showFeedback('明日のプランを保存しました！', 'success');
            onClose();

        } catch (error) {
            console.error('Plan save error:', error);
            showFeedback('プランの保存に失敗しました', 'error');
        }
    };

    if (isGenerating) {
        return (
            <div className="fixed inset-0 bg-white z-50 flex items-center justify-center">
                <div className="text-center">
                    <Icon name="Loader" size={48} className="animate-spin text-sky-600 mx-auto mb-4" />
                    <p className="text-gray-600">AIが明日のプランを作成中...</p>
                    <p className="text-sm text-gray-500 mt-2">あなたの目標と今日の記録を分析しています</p>
                </div>
            </div>
        );
    }

    if (!planDraft) {
        return null;
    }

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl w-full max-w-3xl max-h-[90vh] overflow-y-auto">
                {/* ヘッダー */}
                <div className="sticky top-0 bg-gradient-to-r from-sky-600 to-sky-700 text-white p-4 rounded-t-2xl flex justify-between items-center z-10">
                    <div>
                        <h3 className="text-lg font-bold flex items-center gap-2">
                            <Icon name="Lightbulb" size={20} />
                            {editedPlan.title}
                        </h3>
                        <p className="text-sm opacity-90">一緒に計画を立てましょう</p>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 hover:bg-white hover:bg-opacity-20 rounded-full transition"
                    >
                        <Icon name="X" size={20} />
                    </button>
                </div>

                <div className="p-6 space-y-6">
                    {/* 概要 */}
                    <div className="bg-sky-50 border border-sky-200 rounded-xl p-4">
                        <p className="text-sky-900">{editedPlan.summary}</p>
                    </div>

                    {/* 編集モード切替 */}
                    <div className="flex items-center justify-between">
                        <h4 className="font-bold">プラン内容</h4>
                        <button
                            onClick={() => setIsEditing(!isEditing)}
                            className={`px-4 py-2 rounded-lg font-medium transition flex items-center gap-2 ${
                                isEditing
                                    ? 'bg-sky-600 text-white'
                                    : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                            }`}
                        >
                            <Icon name={isEditing ? "Check" : "Edit2"} size={16} />
                            {isEditing ? '編集中' : '編集する'}
                        </button>
                    </div>

                    {/* セクション */}
                    <div className="space-y-4">
                        {editedPlan.sections.map((section, sectionIndex) => (
                            <PlanSection
                                key={sectionIndex}
                                section={section}
                                sectionIndex={sectionIndex}
                                isEditing={isEditing}
                                onEditSection={editSection}
                                onEditItem={editItem}
                                onRemoveItem={removeItem}
                            />
                        ))}
                    </div>

                    {/* コーチからの一言 */}
                    <div className="bg-gradient-to-r from-yellow-50 to-orange-50 border border-yellow-200 rounded-xl p-4">
                        <div className="flex items-start gap-3">
                            <Icon name="MessageCircle" size={24} className="text-yellow-600 flex-shrink-0" />
                            <div>
                                <p className="text-sm font-medium text-yellow-900 mb-1">コーチより</p>
                                {isEditing ? (
                                    <textarea
                                        value={editedPlan.coachNote}
                                        onChange={(e) => setEditedPlan({...editedPlan, coachNote: e.target.value})}
                                        className="w-full px-3 py-2 border rounded-lg text-sm"
                                        rows="2"
                                    />
                                ) : (
                                    <p className="text-yellow-800">{editedPlan.coachNote}</p>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* アクションボタン */}
                    <div className="flex gap-3">
                        <button
                            onClick={generatePlanDraft}
                            className="flex-1 bg-gray-200 text-gray-700 font-bold py-3 rounded-lg hover:bg-gray-300 transition flex items-center justify-center gap-2"
                        >
                            <Icon name="RefreshCw" size={18} />
                            別のプランを提案
                        </button>
                        <button
                            onClick={savePlan}
                            className="flex-1 bg-gradient-to-r from-green-600 to-emerald-600 text-white font-bold py-3 rounded-lg hover:from-green-700 hover:to-emerald-700 transition flex items-center justify-center gap-2"
                        >
                            <Icon name="Save" size={18} />
                            このプランで決定
                        </button>
                    </div>

                    {/* ヒント */}
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                        <h5 className="font-bold text-blue-900 mb-2 flex items-center gap-2">
                            <Icon name="Info" size={16} />
                            使い方のヒント
                        </h5>
                        <ul className="text-sm text-blue-800 space-y-1">
                            <li>• 「編集する」ボタンで内容を自由に変更できます</li>
                            <li>• 不要な項目は削除ボタンで消せます</li>
                            <li>• 「別のプランを提案」で新しいアイデアを得られます</li>
                            <li>• 最終的な決定権はあなたにあります</li>
                        </ul>
                    </div>
                </div>
            </div>
        </div>
    );
};

// プランセクションコンポーネント
const PlanSection = ({ section, sectionIndex, isEditing, onEditSection, onEditItem, onRemoveItem }) => {
    const typeIcons = {
        training: 'Dumbbell',
        meal: 'Utensils',
        supplement: 'Pill',
        rest: 'Moon'
    };

    const typeColors = {
        training: 'red',
        meal: 'green',
        supplement: 'sky',
        rest: 'blue'
    };

    const icon = typeIcons[section.type] || 'Circle';
    const color = typeColors[section.type] || 'gray';

    return (
        <div className={`bg-${color}-50 border border-${color}-200 rounded-xl p-4`}>
            <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-2">
                    <Icon name={icon} size={20} className={`text-${color}-600`} />
                    {isEditing ? (
                        <input
                            type="text"
                            value={section.title}
                            onChange={(e) => onEditSection(sectionIndex, 'title', e.target.value)}
                            className="font-bold px-2 py-1 border rounded"
                        />
                    ) : (
                        <h5 className="font-bold">{section.title}</h5>
                    )}
                </div>
                {section.isOptional && (
                    <span className="text-xs bg-white px-2 py-1 rounded-full text-gray-600">
                        オプション
                    </span>
                )}
            </div>

            <div className="space-y-3">
                {section.items.map((item, itemIndex) => (
                    <div key={itemIndex} className="bg-white rounded-lg p-3 border border-gray-200">
                        <div className="flex justify-between items-start gap-3">
                            <div className="flex-1 space-y-2">
                                {isEditing ? (
                                    <>
                                        <input
                                            type="text"
                                            value={item.description}
                                            onChange={(e) => onEditItem(sectionIndex, itemIndex, 'description', e.target.value)}
                                            className="w-full px-2 py-1 border rounded text-sm"
                                            placeholder="内容"
                                        />
                                        <input
                                            type="text"
                                            value={item.timing}
                                            onChange={(e) => onEditItem(sectionIndex, itemIndex, 'timing', e.target.value)}
                                            className="w-full px-2 py-1 border rounded text-xs"
                                            placeholder="タイミング"
                                        />
                                        <textarea
                                            value={item.rationale}
                                            onChange={(e) => onEditItem(sectionIndex, itemIndex, 'rationale', e.target.value)}
                                            className="w-full px-2 py-1 border rounded text-xs"
                                            placeholder="理由"
                                            rows="2"
                                        />
                                    </>
                                ) : (
                                    <>
                                        <p className="font-medium">{item.description}</p>
                                        <div className="flex items-center gap-2 text-xs text-gray-600">
                                            <Icon name="Clock" size={12} />
                                            {item.timing}
                                        </div>
                                        <p className="text-xs text-gray-600 italic">{item.rationale}</p>
                                    </>
                                )}
                            </div>
                            {isEditing && (
                                <button
                                    onClick={() => onRemoveItem(sectionIndex, itemIndex)}
                                    className="flex-shrink-0 bg-red-100 text-red-600 p-2 rounded-full hover:bg-red-200 transition"
                                >
                                    <Icon name="X" size={14} />
                                </button>
                            )}
                        </div>
                    </div>
                ))}
            </div>

            {/* 代替案 */}
            {section.alternatives && section.alternatives.length > 0 && (
                <div className="mt-3 pt-3 border-t border-gray-200">
                    <p className="text-xs font-medium text-gray-600 mb-2">代替案</p>
                    <div className="space-y-1">
                        {section.alternatives.map((alt, index) => (
                            <p key={index} className="text-xs text-gray-600 flex items-start gap-2">
                                <span>•</span>
                                <span>{alt}</span>
                            </p>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
};
