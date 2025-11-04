import React from 'react';
// ===== Community Growth Features =====
// コミュニティ育成システム（メンター制度、ベストアンサー、テーマスペース）

// メンター制度
const MentorSystem = {
    // メンターになるための条件
    canBecomeMentor: (userProfile, userStats) => {
        return (
            userStats.usageDays >= 30 && // 30日以上の利用
            userStats.helpfulAnswers >= 10 && // 10回以上の有益な回答
            userStats.averageScore >= 80 // 平均分析スコア80点以上
        );
    },

    // メンター申請
    applyForMentor: async (userId, userProfile) => {
        const application = {
            userId: userId,
            appliedAt: new Date().toISOString(),
            status: 'pending',
            motivation: '', // ユーザーが入力
            expertise: [], // 得意分野
            profile: userProfile
        };

        // LocalStorageに保存（実際はFirestoreへ）
        const applications = JSON.parse(localStorage.getItem('mentor_applications') || '[]');
        applications.push(application);
        localStorage.setItem('mentor_applications', JSON.stringify(applications));

        showFeedback('メンター申請を送信しました。承認までしばらくお待ちください。', 'success');
    },

    // メンターバッジを取得
    getMentorBadge: (mentorLevel) => {
        const badges = {
            bronze: { icon: '🥉', name: 'ブロンズメンター', color: 'orange' },
            silver: { icon: '🥈', name: 'シルバーメンター', color: 'gray' },
            gold: { icon: '🥇', name: 'ゴールドメンター', color: 'yellow' }
        };
        return badges[mentorLevel] || null;
    }
};

// ベストアンサー機能
const BestAnswerSystem = {
    // ベストアンサーを選択
    markAsBestAnswer: async (postId, answerId, questionAuthorId) => {
        // 投稿のデータを取得
        const posts = JSON.parse(localStorage.getItem(STORAGE_KEYS.COMMUNITY_POSTS) || '[]');
        const post = posts.find(p => p.id === postId);

        if (post && post.userId === questionAuthorId) {
            // ベストアンサーをマーク
            post.bestAnswerId = answerId;
            localStorage.setItem(STORAGE_KEYS.COMMUNITY_POSTS, JSON.stringify(posts));

            // 回答者にポイントを付与
            BestAnswerSystem.awardPoints(answerId, 10);

            showFeedback('ベストアンサーを選択しました！', 'success');
        }
    },

    // ポイントを付与
    awardPoints: (userId, points) => {
        const userPoints = JSON.parse(localStorage.getItem('user_points') || '{}');
        userPoints[userId] = (userPoints[userId] || 0) + points;
        localStorage.setItem('user_points', JSON.stringify(userPoints));
    },

    // ユーザーのポイントを取得
    getUserPoints: (userId) => {
        const userPoints = JSON.parse(localStorage.getItem('user_points') || '{}');
        return userPoints[userId] || 0;
    }
};

// テーマ別スペース（サークル機能）
const ThemeSpaces = {
    // スペース一覧
    spaces: [
        {
            id: 'bulk',
            name: 'バルクアップ部',
            description: '筋肉を増やして体を大きくしたい人たちの集まり',
            icon: '💪',
            color: 'blue',
            memberCount: 0
        },
        {
            id: 'diet',
            name: 'ダイエット部',
            description: '脂肪を落として引き締めたい人たちの集まり',
            icon: '🔥',
            color: 'red',
            memberCount: 0
        },
        {
            id: 'strength',
            name: 'パワーリフティング部',
            description: 'BIG3の記録を伸ばしたい人たちの集まり',
            icon: '⚡',
            color: 'yellow',
            memberCount: 0
        },
        {
            id: 'nutrition',
            name: '栄養学部',
            description: '食事とサプリメントについて深く学びたい人たちの集まり',
            icon: '🥗',
            color: 'green',
            memberCount: 0
        },
        {
            id: 'beginners',
            name: '初心者の部屋',
            description: 'トレーニング初心者が安心して質問できる場所',
            icon: '🌱',
            color: 'emerald',
            memberCount: 0
        },
        {
            id: 'women',
            name: '女性専用スペース',
            description: '女性特有の悩みや目標について話せる場所',
            icon: '👩',
            color: 'pink',
            memberCount: 0
        }
    ],

    // スペースに参加
    joinSpace: async (userId, spaceId) => {
        const memberships = JSON.parse(localStorage.getItem('space_memberships') || '{}');
        if (!memberships[userId]) {
            memberships[userId] = [];
        }

        if (!memberships[userId].includes(spaceId)) {
            memberships[userId].push(spaceId);
            localStorage.setItem('space_memberships', JSON.stringify(memberships));

            showFeedback('スペースに参加しました！', 'success');
        }
    },

    // スペースから退出
    leaveSpace: async (userId, spaceId) => {
        const memberships = JSON.parse(localStorage.getItem('space_memberships') || '{}');
        if (memberships[userId]) {
            memberships[userId] = memberships[userId].filter(id => id !== spaceId);
            localStorage.setItem('space_memberships', JSON.stringify(memberships));

            showFeedback('スペースから退出しました', 'success');
        }
    },

    // ユーザーの参加スペースを取得
    getUserSpaces: (userId) => {
        const memberships = JSON.parse(localStorage.getItem('space_memberships') || '{}');
        return memberships[userId] || [];
    },

    // スペースのメンバー数を更新
    updateMemberCounts: () => {
        const memberships = JSON.parse(localStorage.getItem('space_memberships') || '{}');
        const counts = {};

        Object.values(memberships).forEach(spaces => {
            spaces.forEach(spaceId => {
                counts[spaceId] = (counts[spaceId] || 0) + 1;
            });
        });

        ThemeSpaces.spaces.forEach(space => {
            space.memberCount = counts[space.id] || 0;
        });
    }
};

// スペース選択画面コンポーネント
const ThemeSpaceSelector = ({ userId, onClose }) => {
    const [userSpaces, setUserSpaces] = useState(ThemeSpaces.getUserSpaces(userId));

    useEffect(() => {
        ThemeSpaces.updateMemberCounts();
    }, []);

    const toggleSpace = async (spaceId) => {
        if (userSpaces.includes(spaceId)) {
            await ThemeSpaces.leaveSpace(userId, spaceId);
            setUserSpaces(prev => prev.filter(id => id !== spaceId));
        } else {
            await ThemeSpaces.joinSpace(userId, spaceId);
            setUserSpaces(prev => [...prev, spaceId]);
        }
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
                <div className="sticky top-0 bg-gradient-to-r from-purple-600 to-indigo-600 text-white p-4 rounded-t-2xl flex justify-between items-center z-10">
                    <h3 className="text-lg font-bold flex items-center gap-2">
                        <Icon name="Users" size={20} />
                        テーマ別スペース
                    </h3>
                    <button
                        onClick={onClose}
                        className="p-2 hover:bg-white hover:bg-opacity-20 rounded-full transition"
                    >
                        <Icon name="X" size={20} />
                    </button>
                </div>

                <div className="p-6 space-y-6">
                    <div className="text-center space-y-2">
                        <p className="text-gray-600">
                            共通の目標を持つ仲間と交流しましょう
                        </p>
                        <p className="text-sm text-gray-500">
                            複数のスペースに参加できます
                        </p>
                    </div>

                    <div className="grid gap-4">
                        {ThemeSpaces.spaces.map(space => {
                            const isMember = userSpaces.includes(space.id);
                            return (
                                <button
                                    key={space.id}
                                    onClick={() => toggleSpace(space.id)}
                                    className={`p-4 rounded-xl border-2 text-left transition hover:shadow-lg ${
                                        isMember
                                            ? `border-${space.color}-500 bg-${space.color}-50`
                                            : 'border-gray-200 hover:border-gray-300'
                                    }`}
                                >
                                    <div className="flex items-start justify-between">
                                        <div className="flex items-start gap-3 flex-1">
                                            <span className="text-3xl">{space.icon}</span>
                                            <div>
                                                <h4 className="font-bold text-lg flex items-center gap-2">
                                                    {space.name}
                                                    {isMember && (
                                                        <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full">
                                                            参加中
                                                        </span>
                                                    )}
                                                </h4>
                                                <p className="text-sm text-gray-600 mt-1">{space.description}</p>
                                                <p className="text-xs text-gray-500 mt-2">
                                                    <Icon name="Users" size={12} className="inline mr-1" />
                                                    {space.memberCount}人が参加中
                                                </p>
                                            </div>
                                        </div>
                                        <Icon
                                            name={isMember ? "Check" : "Plus"}
                                            size={20}
                                            className={isMember ? "text-green-600" : "text-gray-400"}
                                        />
                                    </div>
                                </button>
                            );
                        })}
                    </div>

                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                        <h5 className="font-bold text-blue-900 mb-2 flex items-center gap-2">
                            <Icon name="Info" size={16} />
                            スペースでできること
                        </h5>
                        <ul className="text-sm text-blue-800 space-y-1">
                            <li>• 同じ目標を持つ仲間と質問・回答</li>
                            <li>• 成果報告や進捗の共有</li>
                            <li>• メンバー限定のTips共有</li>
                            <li>• モチベーションの維持</li>
                        </ul>
                    </div>
                </div>
            </div>
        </div>
    );
};

// メンター申請画面コンポーネント
const MentorApplicationForm = ({ userId, userProfile, userStats, onClose }) => {
    const [motivation, setMotivation] = useState('');
    const [expertise, setExpertise] = useState([]);

    const expertiseOptions = [
        '筋力トレーニング',
        '有酸素運動',
        '食事管理',
        'サプリメント',
        'ダイエット',
        'バルクアップ',
        'ボディメイク',
        '初心者サポート'
    ];

    const canApply = MentorSystem.canBecomeMentor(userProfile, userStats);

    const submitApplication = () => {
        if (!motivation.trim()) {
            showFeedback('志望動機を入力してください', 'error');
            return;
        }

        if (expertise.length === 0) {
            showFeedback('得意分野を1つ以上選択してください', 'error');
            return;
        }

        MentorSystem.applyForMentor(userId, {
            ...userProfile,
            motivation,
            expertise
        });

        onClose();
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
                <div className="sticky top-0 bg-gradient-to-r from-yellow-600 to-orange-600 text-white p-4 rounded-t-2xl flex justify-between items-center z-10">
                    <h3 className="text-lg font-bold flex items-center gap-2">
                        <Icon name="Award" size={20} />
                        メンター申請
                    </h3>
                    <button
                        onClick={onClose}
                        className="p-2 hover:bg-white hover:bg-opacity-20 rounded-full transition"
                    >
                        <Icon name="X" size={20} />
                    </button>
                </div>

                <div className="p-6 space-y-6">
                    {!canApply ? (
                        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                            <h4 className="font-bold text-yellow-900 mb-3">メンターになるための条件</h4>
                            <ul className="space-y-2 text-sm text-yellow-800">
                                <li className="flex items-center gap-2">
                                    <Icon
                                        name={userStats.usageDays >= 30 ? "CheckCircle" : "Circle"}
                                        size={16}
                                        className={userStats.usageDays >= 30 ? "text-green-600" : "text-gray-400"}
                                    />
                                    30日以上の利用 （現在: {userStats.usageDays}日）
                                </li>
                                <li className="flex items-center gap-2">
                                    <Icon
                                        name={userStats.helpfulAnswers >= 10 ? "CheckCircle" : "Circle"}
                                        size={16}
                                        className={userStats.helpfulAnswers >= 10 ? "text-green-600" : "text-gray-400"}
                                    />
                                    10回以上の有益な回答 （現在: {userStats.helpfulAnswers}回）
                                </li>
                                <li className="flex items-center gap-2">
                                    <Icon
                                        name={userStats.averageScore >= 80 ? "CheckCircle" : "Circle"}
                                        size={16}
                                        className={userStats.averageScore >= 80 ? "text-green-600" : "text-gray-400"}
                                    />
                                    平均分析スコア80点以上 （現在: {userStats.averageScore}点）
                                </li>
                            </ul>
                            <p className="mt-4 text-sm text-yellow-800">
                                条件を満たすと申請できるようになります。引き続き頑張りましょう！
                            </p>
                        </div>
                    ) : (
                        <>
                            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                                <p className="text-green-800 flex items-center gap-2">
                                    <Icon name="CheckCircle" size={18} />
                                    メンター申請の条件を満たしています！
                                </p>
                            </div>

                            <div>
                                <label className="block text-sm font-medium mb-2">志望動機 *</label>
                                <textarea
                                    value={motivation}
                                    onChange={(e) => setMotivation(e.target.value)}
                                    className="w-full px-4 py-3 border rounded-lg"
                                    rows="5"
                                    placeholder="なぜメンターになりたいのか、どのようにコミュニティに貢献したいかを教えてください"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium mb-2">得意分野 *（複数選択可）</label>
                                <div className="flex flex-wrap gap-2">
                                    {expertiseOptions.map(option => (
                                        <button
                                            key={option}
                                            onClick={() => {
                                                setExpertise(prev =>
                                                    prev.includes(option)
                                                        ? prev.filter(e => e !== option)
                                                        : [...prev, option]
                                                );
                                            }}
                                            className={`px-3 py-2 rounded-lg border-2 text-sm font-medium transition ${
                                                expertise.includes(option)
                                                    ? 'border-indigo-500 bg-indigo-50 text-indigo-700'
                                                    : 'border-gray-200 hover:border-gray-300'
                                            }`}
                                        >
                                            {option}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                                <h5 className="font-bold text-blue-900 mb-2">メンターの役割</h5>
                                <ul className="text-sm text-blue-800 space-y-1">
                                    <li>• 初心者や困っている人への丁寧なサポート</li>
                                    <li>• 科学的根拠に基づいたアドバイス</li>
                                    <li>• コミュニティの雰囲気作り</li>
                                    <li>• 継続的な学習と成長</li>
                                </ul>
                            </div>

                            <button
                                onClick={submitApplication}
                                className="w-full bg-gradient-to-r from-yellow-600 to-orange-600 text-white font-bold py-3 rounded-lg hover:from-yellow-700 hover:to-orange-700 transition"
                            >
                                申請を送信
                            </button>
                        </>
                    )}
                </div>
            </div>
        </div>
    );
};


// グローバルに公開
window.MentorSystem = MentorSystem;
window.ThemeSpaceSelector = ThemeSpaceSelector;
window.MentorApplicationForm = MentorApplicationForm;
