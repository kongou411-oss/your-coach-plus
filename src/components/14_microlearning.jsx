// ===== Contextual Micro-Learning System =====
// 文脈的マイクロラーニング（ユーザーの課題に応じた学習コンテンツを提案）

const MicroLearningPopup = ({ content, onClose, onComplete }) => {
    const [currentStep, setCurrentStep] = useState(0);

    const completeStep = () => {
        if (currentStep < content.steps.length - 1) {
            setCurrentStep(currentStep + 1);
        } else {
            onComplete();
            onClose();
        }
    };

    const step = content.steps[currentStep];

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-[90] flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl w-full max-w-lg max-h-[80vh] overflow-y-auto slide-up">
                {/* ヘッダー */}
                <div className="sticky top-0 bg-gradient-to-r from-blue-600 to-cyan-600 text-white p-4 rounded-t-2xl flex justify-between items-center z-10">
                    <div>
                        <h3 className="text-lg font-bold flex items-center gap-2">
                            <Icon name="BookOpen" size={20} />
                            {content.title}
                        </h3>
                        <p className="text-sm opacity-90">{currentStep + 1} / {content.steps.length}</p>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 hover:bg-white hover:bg-opacity-20 rounded-full transition"
                    >
                        <Icon name="X" size={20} />
                    </button>
                </div>

                <div className="p-6 space-y-6">
                    {/* ステップコンテンツ */}
                    <MicroLearningStep step={step} />

                    {/* プログレスバー */}
                    <div className="flex gap-2">
                        {content.steps.map((_, index) => (
                            <div
                                key={index}
                                className={`flex-1 h-2 rounded-full transition ${
                                    index <= currentStep ? 'bg-blue-600' : 'bg-gray-200'
                                }`}
                            />
                        ))}
                    </div>

                    {/* ナビゲーションボタン */}
                    <div className="flex gap-3">
                        {currentStep > 0 && (
                            <button
                                onClick={() => setCurrentStep(currentStep - 1)}
                                className="flex-1 bg-gray-200 text-gray-700 font-bold py-3 rounded-lg hover:bg-gray-300 transition"
                            >
                                戻る
                            </button>
                        )}
                        <button
                            onClick={completeStep}
                            className="flex-1 bg-gradient-to-r from-blue-600 to-cyan-600 text-white font-bold py-3 rounded-lg hover:from-blue-700 hover:to-cyan-700 transition"
                        >
                            {currentStep < content.steps.length - 1 ? '次へ' : '完了'}
                        </button>
                    </div>

                    {/* スキップボタン */}
                    <button
                        onClick={onClose}
                        className="w-full text-sm text-gray-500 hover:text-gray-700"
                    >
                        後で学習する
                    </button>
                </div>
            </div>
        </div>
    );
};

// マイクロラーニングステップコンポーネント
const MicroLearningStep = ({ step }) => {
    return (
        <div className="space-y-4">
            {/* タイトル */}
            <h4 className="text-xl font-bold">{step.title}</h4>

            {/* コンテンツタイプに応じた表示 */}
            {step.type === 'text' && (
                <div className="prose prose-sm max-w-none">
                    <p className="text-gray-700 leading-relaxed whitespace-pre-wrap">{step.content}</p>
                </div>
            )}

            {step.type === 'video' && (
                <div className="aspect-video bg-gray-100 rounded-lg flex items-center justify-center">
                    {step.videoUrl ? (
                        <iframe
                            src={step.videoUrl}
                            className="w-full h-full rounded-lg"
                            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                            allowFullScreen
                        ></iframe>
                    ) : (
                        <div className="text-center text-gray-500">
                            <Icon name="Play" size={48} className="mx-auto mb-2" />
                            <p>動画コンテンツ</p>
                            {step.youtubeLink && (
                                <a
                                    href={step.youtubeLink}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-blue-600 hover:underline text-sm mt-2 inline-block"
                                >
                                    YouTubeで視聴
                                </a>
                            )}
                        </div>
                    )}
                </div>
            )}

            {step.type === 'infographic' && (
                <div className="bg-gradient-to-br from-blue-50 to-cyan-50 rounded-lg p-6 border border-blue-200">
                    {step.infographicData && (
                        <div className="space-y-4">
                            {step.infographicData.map((item, index) => (
                                <div key={index} className="flex items-start gap-3">
                                    <div className="flex-shrink-0 w-8 h-8 bg-blue-600 text-white rounded-full flex items-center justify-center font-bold">
                                        {index + 1}
                                    </div>
                                    <div>
                                        <h5 className="font-bold text-blue-900">{item.title}</h5>
                                        <p className="text-sm text-blue-800">{item.description}</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            )}

            {step.type === 'list' && (
                <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                    <ul className="space-y-2">
                        {step.listItems.map((item, index) => (
                            <li key={index} className="flex items-start gap-2">
                                <Icon name="CheckCircle" size={16} className="text-green-600 mt-0.5 flex-shrink-0" />
                                <span className="text-gray-700">{item}</span>
                            </li>
                        ))}
                    </ul>
                </div>
            )}

            {step.type === 'quiz' && (
                <QuizStep quiz={step.quiz} />
            )}

            {/* 補足説明 */}
            {step.note && (
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                    <p className="text-sm text-yellow-800 flex items-start gap-2">
                        <Icon name="Info" size={16} className="flex-shrink-0 mt-0.5" />
                        <span>{step.note}</span>
                    </p>
                </div>
            )}
        </div>
    );
};

// クイズステップコンポーネント
const QuizStep = ({ quiz }) => {
    const [selectedAnswer, setSelectedAnswer] = useState(null);
    const [showResult, setShowResult] = useState(false);

    const checkAnswer = () => {
        setShowResult(true);
    };

    return (
        <div className="space-y-4">
            <p className="font-medium text-gray-700">{quiz.question}</p>

            <div className="space-y-2">
                {quiz.options.map((option, index) => (
                    <button
                        key={index}
                        onClick={() => setSelectedAnswer(index)}
                        disabled={showResult}
                        className={`w-full p-3 rounded-lg border-2 text-left transition ${
                            showResult
                                ? index === quiz.correctAnswer
                                    ? 'border-green-500 bg-green-50'
                                    : index === selectedAnswer
                                        ? 'border-red-500 bg-red-50'
                                        : 'border-gray-200 bg-gray-50'
                                : selectedAnswer === index
                                    ? 'border-blue-500 bg-blue-50'
                                    : 'border-gray-200 hover:border-gray-300'
                        }`}
                    >
                        {option}
                    </button>
                ))}
            </div>

            {!showResult && selectedAnswer !== null && (
                <button
                    onClick={checkAnswer}
                    className="w-full bg-blue-600 text-white font-bold py-3 rounded-lg hover:bg-blue-700 transition"
                >
                    答えを確認
                </button>
            )}

            {showResult && (
                <div className={`p-4 rounded-lg ${
                    selectedAnswer === quiz.correctAnswer
                        ? 'bg-green-50 border border-green-200'
                        : 'bg-red-50 border border-red-200'
                }`}>
                    <p className={`font-bold mb-2 ${
                        selectedAnswer === quiz.correctAnswer ? 'text-green-900' : 'text-red-900'
                    }`}>
                        {selectedAnswer === quiz.correctAnswer ? '正解！' : '不正解'}
                    </p>
                    <p className="text-sm text-gray-700">{quiz.explanation}</p>
                </div>
            )}
        </div>
    );
};

// マイクロラーニングコンテンツライブラリ
const MicroLearningLibrary = {
    // タンパク質不足時
    proteinDeficiency: {
        title: 'タンパク質が不足しています',
        trigger: (analysis) => analysis.achievementRates.protein < 80,
        steps: [
            {
                type: 'text',
                title: 'なぜタンパク質が重要なのか？',
                content: 'タンパク質は筋肉を作る材料です。\n\nトレーニングで筋繊維を破壊し、タンパク質で修復することで筋肉が成長します。\n\n不足すると筋肉が分解されてしまいます。',
                note: 'LBM（除脂肪体重）1kgあたりの推奨量\n• 一般：1.2g\n• ボディメイカー：2.2g'
            },
            {
                type: 'video',
                title: 'タンパク質の効果的な摂取方法',
                youtubeLink: 'https://www.youtube.com/watch?v=example', // 実際のリンクに置き換え
                content: '動画で学ぶ：プロテインの最適な摂取タイミング'
            },
            {
                type: 'list',
                title: 'タンパク質が豊富な食品トップ5',
                listItems: [
                    '鶏むね肉: 100gあたり23g（低脂肪・高タンパク）',
                    'サーモン: 100gあたり20g（オメガ3も豊富）',
                    '卵: 1個あたり6g（完全栄養食品）',
                    'ギリシャヨーグルト: 100gあたり10g（カルシウムも豊富）',
                    'プロテインパウダー: 1スクープ約20-30g（最も効率的）'
                ],
                note: 'これらの食品を組み合わせて、1日の目標を達成しましょう'
            },
            {
                type: 'quiz',
                title: '理解度チェック',
                quiz: {
                    question: 'LBM 60kgのボディメイカーは、1日に何gのタンパク質が必要でしょうか？',
                    options: [
                        '72g（60kg × 1.2）',
                        '120g（60kg × 2.0）',
                        '132g（60kg × 2.2）',
                        '168g（60kg × 2.8）'
                    ],
                    correctAnswer: 2,
                    explanation: '正解は132gです。\nボディメイカーのタンパク質係数は目的に関わらず2.2なので、\n60kg × 2.2 = 132gとなります。'
                }
            }
        ]
    },

    // 炭水化物不足時
    carbDeficiency: {
        title: '炭水化物が不足しています',
        trigger: (analysis) => analysis.achievementRates.carbs < 70,
        steps: [
            {
                type: 'text',
                title: '炭水化物はトレーニングの燃料',
                content: '炭水化物は筋肉のエネルギー源（グリコーゲン）として貯蔵されます。\n\n不足するとパワーが出ず、トレーニング強度が下がり、筋肉の成長が妨げられます。',
                note: 'バルクアップには十分な炭水化物が不可欠です'
            },
            {
                type: 'infographic',
                title: 'GI値による炭水化物の選び方',
                infographicData: [
                    {
                        title: '高GI（トレーニング直後）',
                        description: '白米、バナナ、マルトデキストリン → 素早くエネルギー補給'
                    },
                    {
                        title: '中GI（トレーニング前）',
                        description: 'オートミール、全粒粉パン → 持続的なエネルギー'
                    },
                    {
                        title: '低GI（通常時）',
                        description: 'さつまいも、玄米、そば → 血糖値の安定'
                    }
                ]
            },
            {
                type: 'list',
                title: '炭水化物が豊富な食品',
                listItems: [
                    '白米: 100gあたり37g',
                    'オートミール: 100gあたり66g',
                    'バナナ: 1本あたり27g',
                    'さつまいも: 100gあたり30g',
                    '全粒粉パン: 1枚あたり20g'
                ]
            }
        ]
    },

    // 睡眠不足時
    sleepDeficiency: {
        title: '睡眠時間が不足しています',
        trigger: (dailyRecord) => dailyRecord?.conditions?.sleepHours < 7,
        steps: [
            {
                type: 'text',
                title: '睡眠は最強の回復方法',
                content: '筋肉の成長は睡眠中に起こります。\n\n成長ホルモンは深い睡眠時に最も多く分泌されます。\n\n7-9時間の睡眠が理想です。',
                note: '睡眠不足はテストステロンを減少させ、筋肉の成長を妨げます'
            },
            {
                type: 'list',
                title: '睡眠の質を上げる5つの方法',
                listItems: [
                    '就寝2時間前にブルーライトを避ける',
                    '室温を18-20°Cに保つ',
                    '就寝前のカフェイン摂取を避ける（6時間前まで）',
                    '毎日同じ時間に寝起きする',
                    'マグネシウムサプリメントを摂取する'
                ]
            }
        ]
    }
};

// マイクロラーニングトリガーシステム
const triggerMicroLearning = (context) => {
    const { dailyRecord, analysis, userProfile } = context;

    // 各コンテンツのトリガーをチェック
    for (const [key, content] of Object.entries(MicroLearningLibrary)) {
        if (content.trigger) {
            const shouldTrigger = content.trigger(analysis || dailyRecord);
            if (shouldTrigger) {
                // 既に表示済みかチェック
                const shown = localStorage.getItem(`microlearning_shown_${key}`);
                const lastShownDate = shown ? new Date(shown) : null;
                const today = new Date();

                // 同じコンテンツは7日間表示しない
                if (!lastShownDate || (today - lastShownDate) / (1000 * 60 * 60 * 24) > 7) {
                    localStorage.setItem(`microlearning_shown_${key}`, today.toISOString());
                    return content;
                }
            }
        }
    }

    return null;
};
