import React, { useState, useEffect } from 'react';
import { Icon } from './01_common.jsx';
import { showFeedback } from './10_feedback.jsx';
import toast from 'react-hot-toast';

// ===== Community Growth Features =====
// コミュニティ育成システム（メンター制度、ベストアンサー、テーマスペース、フォロー機能）

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
        const posts = JSON.parse(localStorage.getItem('community_posts') || '[]');
        const post = posts.find(p => p.id === postId);

        if (post && post.userId === questionAuthorId) {
            // ベストアンサーをマーク
            post.bestAnswerId = answerId;
            localStorage.setItem('community_posts', JSON.stringify(posts));

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
            color: 'sky',
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
                <div className="sticky top-0 bg-gradient-to-r from-sky-600 to-sky-600 text-white p-4 rounded-t-2xl flex justify-between items-center z-10">
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
                        <p className="text-sm text-gray-600">
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
                                                <p className="text-xs text-gray-600 mt-2">
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
                            <Icon name="HelpCircle" size={16} />
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
                                                    ? 'border-sky-500 bg-sky-50 text-sky-700'
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


// ===== ユーザープロフィールモーダル =====
const UserProfileModal = ({ targetUserId, currentUserId, onClose }) => {
    const [profile, setProfile] = useState(null);
    const [posts, setPosts] = useState([]);
    const [isFollowing, setIsFollowing] = useState(false);
    const [loading, setLoading] = useState(true);
    const [followLoading, setFollowLoading] = useState(false);
    const [activeTab, setActiveTab] = useState('posts'); // 'posts' | 'followers' | 'following'
    const [followers, setFollowers] = useState([]);
    const [following, setFollowing] = useState([]);

    useEffect(() => {
        loadProfile();
    }, [targetUserId]);

    const loadProfile = async () => {
        setLoading(true);
        try {
            // プロフィール取得
            const profileData = await DataService.getUserPublicProfile(targetUserId);
            setProfile(profileData);

            // 投稿取得
            const userPosts = await DataService.getUserPosts(targetUserId);
            setPosts(userPosts);

            // フォロー状態確認
            if (currentUserId && currentUserId !== targetUserId) {
                const following = await DataService.isFollowing(currentUserId, targetUserId);
                setIsFollowing(following);
            }
        } catch (error) {
            console.error('Error loading profile:', error);
            toast.error('プロフィールの読み込みに失敗しました');
        }
        setLoading(false);
    };

    const loadFollowers = async () => {
        const data = await DataService.getFollowers(targetUserId);
        setFollowers(data);
    };

    const loadFollowing = async () => {
        const data = await DataService.getFollowing(targetUserId);
        setFollowing(data);
    };

    useEffect(() => {
        if (activeTab === 'followers') {
            loadFollowers();
        } else if (activeTab === 'following') {
            loadFollowing();
        }
    }, [activeTab]);

    const handleFollow = async () => {
        if (!currentUserId || followLoading) return;

        setFollowLoading(true);
        try {
            if (isFollowing) {
                const result = await DataService.unfollowUser(currentUserId, targetUserId);
                if (result.success) {
                    setIsFollowing(false);
                    setProfile(prev => ({
                        ...prev,
                        followerCount: Math.max(0, (prev.followerCount || 0) - 1)
                    }));
                    toast.success('フォローを解除しました');
                } else {
                    toast.error(result.error || 'フォロー解除に失敗しました');
                }
            } else {
                const result = await DataService.followUser(currentUserId, targetUserId);
                if (result.success) {
                    setIsFollowing(true);
                    setProfile(prev => ({
                        ...prev,
                        followerCount: (prev.followerCount || 0) + 1
                    }));
                    toast.success('フォローしました');
                } else {
                    toast.error(result.error || 'フォローに失敗しました');
                }
            }
        } catch (error) {
            console.error('Follow error:', error);
            toast.error('エラーが発生しました');
        }
        setFollowLoading(false);
    };

    if (loading) {
        return (
            <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center">
                <div className="bg-white rounded-2xl p-8">
                    <div className="animate-spin w-8 h-8 border-4 border-fuchsia-600 border-t-transparent rounded-full mx-auto"></div>
                    <p className="mt-4 text-gray-600">読み込み中...</p>
                </div>
            </div>
        );
    }

    if (!profile) {
        return (
            <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
                <div className="bg-white rounded-2xl p-8 text-center">
                    <Icon name="UserX" size={48} className="mx-auto mb-4 text-gray-400" />
                    <p className="text-gray-600">ユーザーが見つかりません</p>
                    <button
                        onClick={onClose}
                        className="mt-4 px-6 py-2 bg-gray-200 rounded-lg hover:bg-gray-300 transition"
                    >
                        閉じる
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl w-full max-w-lg max-h-[90vh] overflow-hidden flex flex-col">
                {/* ヘッダー */}
                <div className="bg-gradient-to-r from-fuchsia-600 to-teal-600 text-white p-4 flex justify-between items-center">
                    <h3 className="text-lg font-bold">プロフィール</h3>
                    <button
                        onClick={onClose}
                        className="p-2 hover:bg-white hover:bg-opacity-20 rounded-full transition"
                    >
                        <Icon name="X" size={20} />
                    </button>
                </div>

                {/* プロフィール情報 */}
                <div className="p-6 border-b">
                    <div className="flex items-center gap-4">
                        {/* アバター */}
                        <div className="w-20 h-20 bg-gradient-to-br from-fuchsia-500 to-teal-500 rounded-full flex items-center justify-center text-white text-2xl font-bold">
                            {profile.nickname?.[0] || 'U'}
                        </div>

                        <div className="flex-1">
                            <h4 className="text-xl font-bold text-gray-800">{profile.nickname}</h4>
                            {profile.goal && (
                                <p className="text-sm text-gray-600 mt-1">
                                    <Icon name="Target" size={14} className="inline mr-1" />
                                    {profile.goal}
                                </p>
                            )}
                            <div className="flex items-center gap-1 mt-1">
                                <span className="text-xs bg-gradient-to-r from-yellow-400 to-orange-500 text-white px-2 py-0.5 rounded-full font-medium">
                                    Lv.{profile.level || 1}
                                </span>
                            </div>
                        </div>
                    </div>

                    {/* フォロー数 */}
                    <div className="flex gap-6 mt-4 justify-center">
                        <button
                            onClick={() => setActiveTab('followers')}
                            className="text-center hover:bg-gray-100 px-4 py-2 rounded-lg transition"
                        >
                            <p className="text-xl font-bold text-gray-800">{profile.followerCount || 0}</p>
                            <p className="text-xs text-gray-600">フォロワー</p>
                        </button>
                        <button
                            onClick={() => setActiveTab('following')}
                            className="text-center hover:bg-gray-100 px-4 py-2 rounded-lg transition"
                        >
                            <p className="text-xl font-bold text-gray-800">{profile.followingCount || 0}</p>
                            <p className="text-xs text-gray-600">フォロー中</p>
                        </button>
                        <div className="text-center px-4 py-2">
                            <p className="text-xl font-bold text-gray-800">{posts.length}</p>
                            <p className="text-xs text-gray-600">投稿</p>
                        </div>
                    </div>

                    {/* フォローボタン */}
                    {currentUserId && currentUserId !== targetUserId && (
                        <button
                            onClick={handleFollow}
                            disabled={followLoading}
                            className={`w-full mt-4 py-3 rounded-xl font-bold transition flex items-center justify-center gap-2 ${
                                isFollowing
                                    ? 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                                    : 'bg-gradient-to-r from-fuchsia-600 to-teal-600 text-white hover:from-fuchsia-700 hover:to-teal-700'
                            }`}
                        >
                            {followLoading ? (
                                <div className="animate-spin w-5 h-5 border-2 border-current border-t-transparent rounded-full"></div>
                            ) : isFollowing ? (
                                <>
                                    <Icon name="UserCheck" size={18} />
                                    フォロー中
                                </>
                            ) : (
                                <>
                                    <Icon name="UserPlus" size={18} />
                                    フォローする
                                </>
                            )}
                        </button>
                    )}
                </div>

                {/* タブ */}
                <div className="flex border-b">
                    <button
                        onClick={() => setActiveTab('posts')}
                        className={`flex-1 py-3 text-sm font-medium transition border-b-2 ${
                            activeTab === 'posts'
                                ? 'border-fuchsia-600 text-fuchsia-600'
                                : 'border-transparent text-gray-600'
                        }`}
                    >
                        投稿
                    </button>
                    <button
                        onClick={() => setActiveTab('followers')}
                        className={`flex-1 py-3 text-sm font-medium transition border-b-2 ${
                            activeTab === 'followers'
                                ? 'border-fuchsia-600 text-fuchsia-600'
                                : 'border-transparent text-gray-600'
                        }`}
                    >
                        フォロワー
                    </button>
                    <button
                        onClick={() => setActiveTab('following')}
                        className={`flex-1 py-3 text-sm font-medium transition border-b-2 ${
                            activeTab === 'following'
                                ? 'border-fuchsia-600 text-fuchsia-600'
                                : 'border-transparent text-gray-600'
                        }`}
                    >
                        フォロー中
                    </button>
                </div>

                {/* コンテンツ */}
                <div className="flex-1 overflow-y-auto p-4">
                    {activeTab === 'posts' && (
                        <div className="space-y-3">
                            {posts.length === 0 ? (
                                <p className="text-center text-gray-500 py-8">まだ投稿がありません</p>
                            ) : (
                                posts.map(post => (
                                    <div key={post.id} className="bg-gray-50 rounded-lg p-3">
                                        <p className="text-sm text-gray-800 line-clamp-3">{post.content}</p>
                                        <div className="flex items-center gap-4 mt-2 text-xs text-gray-500">
                                            <span className="flex items-center gap-1">
                                                <Icon name="Heart" size={12} />
                                                {post.likes || 0}
                                            </span>
                                            <span className="flex items-center gap-1">
                                                <Icon name="MessageCircle" size={12} />
                                                {post.commentCount || 0}
                                            </span>
                                            <span>
                                                {new Date(post.timestamp).toLocaleDateString('ja-JP')}
                                            </span>
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    )}

                    {activeTab === 'followers' && (
                        <div className="space-y-2">
                            {followers.length === 0 ? (
                                <p className="text-center text-gray-500 py-8">フォロワーはいません</p>
                            ) : (
                                followers.map(user => (
                                    <div key={user.id} className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                                        <div className="w-10 h-10 bg-gradient-to-br from-pink-500 to-orange-500 rounded-full flex items-center justify-center text-white font-bold">
                                            {user.nickname?.[0] || 'U'}
                                        </div>
                                        <div className="flex-1">
                                            <p className="font-medium text-gray-800">{user.nickname || 'ユーザー'}</p>
                                            <p className="text-xs text-gray-500">Lv.{user.level || 1}</p>
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    )}

                    {activeTab === 'following' && (
                        <div className="space-y-2">
                            {following.length === 0 ? (
                                <p className="text-center text-gray-500 py-8">フォロー中のユーザーはいません</p>
                            ) : (
                                following.map(user => (
                                    <div key={user.id} className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                                        <div className="w-10 h-10 bg-gradient-to-br from-pink-500 to-orange-500 rounded-full flex items-center justify-center text-white font-bold">
                                            {user.nickname?.[0] || 'U'}
                                        </div>
                                        <div className="flex-1">
                                            <p className="font-medium text-gray-800">{user.nickname || 'ユーザー'}</p>
                                            <p className="text-xs text-gray-500">Lv.{user.level || 1}</p>
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

// ===== フォローボタンコンポーネント =====
const FollowButton = ({ targetUserId, currentUserId, compact = false }) => {
    const [isFollowing, setIsFollowing] = useState(false);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        checkFollowStatus();
    }, [targetUserId, currentUserId]);

    const checkFollowStatus = async () => {
        if (!currentUserId || currentUserId === targetUserId) {
            setLoading(false);
            return;
        }
        const following = await DataService.isFollowing(currentUserId, targetUserId);
        setIsFollowing(following);
        setLoading(false);
    };

    const handleFollow = async (e) => {
        e.stopPropagation();
        if (!currentUserId || loading) return;

        setLoading(true);
        try {
            if (isFollowing) {
                const result = await DataService.unfollowUser(currentUserId, targetUserId);
                if (result.success) {
                    setIsFollowing(false);
                    toast.success('フォローを解除しました');
                }
            } else {
                const result = await DataService.followUser(currentUserId, targetUserId);
                if (result.success) {
                    setIsFollowing(true);
                    toast.success('フォローしました');
                }
            }
        } catch (error) {
            console.error('Follow error:', error);
        }
        setLoading(false);
    };

    // 自分自身の場合は表示しない
    if (!currentUserId || currentUserId === targetUserId) {
        return null;
    }

    if (compact) {
        return (
            <button
                onClick={handleFollow}
                disabled={loading}
                className={`px-3 py-1 rounded-full text-xs font-medium transition ${
                    isFollowing
                        ? 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                        : 'bg-fuchsia-600 text-white hover:bg-fuchsia-700'
                }`}
            >
                {loading ? '...' : isFollowing ? 'フォロー中' : 'フォロー'}
            </button>
        );
    }

    return (
        <button
            onClick={handleFollow}
            disabled={loading}
            className={`px-4 py-2 rounded-lg font-medium transition flex items-center gap-1 ${
                isFollowing
                    ? 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                    : 'bg-gradient-to-r from-fuchsia-600 to-teal-600 text-white hover:from-fuchsia-700 hover:to-teal-700'
            }`}
        >
            {loading ? (
                <div className="animate-spin w-4 h-4 border-2 border-current border-t-transparent rounded-full"></div>
            ) : (
                <>
                    <Icon name={isFollowing ? "UserCheck" : "UserPlus"} size={16} />
                    {isFollowing ? 'フォロー中' : 'フォロー'}
                </>
            )}
        </button>
    );
};

// グローバルに公開
window.MentorSystem = MentorSystem;
window.ThemeSpaceSelector = ThemeSpaceSelector;
window.MentorApplicationForm = MentorApplicationForm;
window.UserProfileModal = UserProfileModal;
window.FollowButton = FollowButton;
