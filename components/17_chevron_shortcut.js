// ========== ChevronShortcut コンポーネント ==========

const ChevronShortcut = ({ shortcuts, onShortcutClick }) => {
    const [expandedSide, setExpandedSide] = React.useState(null); // 'left' or 'right'
    const [visibility, setVisibility] = React.useState(() => {
        const saved = localStorage.getItem('chevronShortcutsVisibility');
        return saved ? JSON.parse(saved) : { left: true, right: true };
    });

    // 表示可能な項目のみフィルタリング（enabled: true のみ）
    const leftShortcuts = shortcuts.filter(s => s.side === 'left' && s.enabled !== false);
    const rightShortcuts = shortcuts.filter(s => s.side === 'right' && s.enabled !== false);

    // 表示/非表示更新イベントリスナー
    React.useEffect(() => {
        const handleVisibilityUpdate = (e) => {
            setVisibility(e.detail);
        };
        window.addEventListener('shortcutsVisibilityUpdated', handleVisibilityUpdate);
        return () => window.removeEventListener('shortcutsVisibilityUpdated', handleVisibilityUpdate);
    }, []);

    const handleButtonClick = (side) => {
        setExpandedSide(expandedSide === side ? null : side);
    };

    const handleShortcutItemClick = (action) => {
        onShortcutClick(action);
        setExpandedSide(null);
    };

    // メニュー外クリックで閉じる
    React.useEffect(() => {
        const handleClickOutside = (e) => {
            if (!e.target.closest('.chevron-shortcut-container')) {
                setExpandedSide(null);
            }
        };
        document.addEventListener('click', handleClickOutside);
        return () => document.removeEventListener('click', handleClickOutside);
    }, []);

    const getIconColor = (action) => {
        const colorMap = {
            'open_body_composition': 'text-teal-600',
            'open_condition': 'text-red-600',
            'open_meal': 'text-green-600',
            'open_meal_photo': 'text-green-600',
            'open_workout': 'text-orange-600',
            'open_analysis': 'text-indigo-600',
            'open_history': 'text-purple-600',
            'open_pgbase': 'text-cyan-600',
            'open_community': 'text-fuchsia-600',
            'open_settings': 'text-gray-600'
        };
        return colorMap[action] || 'text-gray-700';
    };

    // 位置に応じたスタイルを取得
    const getPositionStyle = (position) => {
        const positions = {
            'top': 'top-[25%]',      // ルーティンを避ける
            'middle': 'top-1/2',     // 中央
            'bottom': 'top-[85%]'    // タブバーを避ける
        };
        return positions[position] || positions['middle'];
    };

    // サイズに応じたスタイルを取得（丸型）
    const getSizeStyle = (size) => {
        const sizes = {
            'small': { width: 'w-10', height: 'h-10', iconSize: 14 },
            'medium': { width: 'w-12', height: 'h-12', iconSize: 16 },
            'large': { width: 'w-14', height: 'h-14', iconSize: 18 }
        };
        return sizes[size] || sizes['large'];
    };

    // 左右のショートカット設定を取得
    const leftConfig = shortcuts.find(s => s.side === 'left') || { position: 'middle', size: 'medium' };
    const rightConfig = shortcuts.find(s => s.side === 'right') || { position: 'middle', size: 'medium' };

    const leftSize = getSizeStyle(leftConfig.size);
    const rightSize = getSizeStyle(rightConfig.size);

    return (
        <>
            {/* Left Shortcut */}
            {visibility.left && leftShortcuts.length > 0 && (
            <div className={`chevron-shortcut-container fixed left-0 ${getPositionStyle(leftConfig.position)} -translate-y-1/2 z-[9998]`}>
                <button
                    onClick={() => handleButtonClick('left')}
                    className={`${leftSize.width} ${leftSize.height} bg-white rounded-r-full shadow-lg
                               flex items-center justify-center
                               hover:bg-gray-50 transition-all hover:scale-110
                               border border-gray-200 border-l-0
                               cursor-pointer px-2 -ml-3`}
                >
                    <Icon
                        name="ChevronRight"
                        size={leftSize.iconSize}
                        className={`text-gray-700 transition-transform duration-300 ${expandedSide === 'left' ? 'rotate-180' : ''} pointer-events-none`}
                    />
                </button>

                {expandedSide === 'left' && leftShortcuts.length > 0 && (
                    <div className="absolute left-12 top-1/2 -translate-y-1/2 bg-white rounded-lg shadow-xl p-3 w-48 border border-gray-200">
                        <div className="space-y-2">
                            {leftShortcuts.map((shortcut, index) => (
                                <button
                                    key={index}
                                    onClick={() => handleShortcutItemClick(shortcut.action)}
                                    className="w-full flex items-center gap-3 px-3 py-2.5 hover:bg-gray-100 rounded-lg text-left transition"
                                >
                                    <Icon name={shortcut.icon} size={18} className={getIconColor(shortcut.action)} />
                                    <span className="text-sm font-medium">{shortcut.label}</span>
                                </button>
                            ))}
                        </div>
                    </div>
                )}
            </div>
            )}

            {/* Right Shortcut */}
            {visibility.right && rightShortcuts.length > 0 && (
            <div className={`chevron-shortcut-container fixed right-0 ${getPositionStyle(rightConfig.position)} -translate-y-1/2 z-[9998]`}>
                <button
                    onClick={() => handleButtonClick('right')}
                    className={`${rightSize.width} ${rightSize.height} bg-white rounded-l-full shadow-lg
                               flex items-center justify-center
                               hover:bg-gray-50 transition-all hover:scale-110
                               border border-gray-200 border-r-0
                               cursor-pointer px-2 -mr-3`}
                >
                    <Icon
                        name="ChevronLeft"
                        size={rightSize.iconSize}
                        className={`text-gray-700 transition-transform duration-300 ${expandedSide === 'right' ? 'rotate-180' : ''} pointer-events-none`}
                    />
                </button>

                {expandedSide === 'right' && rightShortcuts.length > 0 && (
                    <div className="absolute right-12 top-1/2 -translate-y-1/2 bg-white rounded-lg shadow-xl p-3 w-48 border border-gray-200">
                        <div className="space-y-2">
                            {rightShortcuts.map((shortcut, index) => (
                                <button
                                    key={index}
                                    onClick={() => handleShortcutItemClick(shortcut.action)}
                                    className="w-full flex items-center gap-3 px-3 py-2.5 hover:bg-gray-100 rounded-lg text-left transition"
                                >
                                    <Icon name={shortcut.icon} size={18} className={getIconColor(shortcut.action)} />
                                    <span className="text-sm font-medium">{shortcut.label}</span>
                                </button>
                            ))}
                        </div>
                    </div>
                )}
            </div>
            )}
        </>
    );
};

// デフォルトのショートカット設定（App.jsで管理されているため使用されていない）
// このDEFAULT_SHORTCUTSは削除予定
