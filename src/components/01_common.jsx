import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
// ===== Common Components =====
// Icon, MarkdownRenderer, AnimatedButton, AnimatedModal, AnimatedList, CountUpNumber, Confetti

// ===== Icon Component =====
// Lucide icon wrapper with dynamic rendering
// Usage: <Icon name="ChevronDown" size={24} className="my-class" />
const Icon = ({ name, className = '', size = 24, fill = 'none', ...otherProps }) => {
    const containerRef = React.useRef(null);

    React.useEffect(() => {
        if (!containerRef.current || !window.lucide) return;

        const kebabName = name.split('').map((char) => {
            if (char === char.toUpperCase() && char !== char.toLowerCase()) {
                return '-' + char.toLowerCase();
            }
            return char;
        }).join('').replace(/^-/, '');

        containerRef.current.innerHTML = '';
        const iconElement = document.createElement('i');
        iconElement.setAttribute('data-lucide', kebabName);
        containerRef.current.appendChild(iconElement);

        window.lucide.createIcons({
            icons: window.lucide,
            attrs: {
                'stroke-width': 2,
                width: size,
                height: size,
                fill: fill
            }
        });

        return () => {
            if (containerRef.current) {
                containerRef.current.innerHTML = '';
            }
        };
    }, [name, size, fill]);

    return <span ref={containerRef} className={className} style={{ display: 'inline-flex', alignItems: 'center' }} {...otherProps} />;
};

// ===== MarkdownRenderer Component =====
// Simple markdown to HTML converter
// Supports: **bold**, *italic*, and line breaks
// Usage: <MarkdownRenderer text="**Bold** and *italic* text" />
const MarkdownRenderer = ({ text }) => {
    if (!text) return null;
    const html = text
        .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>') // Bold
        .replace(/\*(.*?)\*/g, '<em>$1</em>'); // Italic
    return <div dangerouslySetInnerHTML={{ __html: html.replace(/\n/g, '<br />') }} />;
};


// ===== AnimatedButton Component =====
// ボタンのマイクロインタラクション（ホバー、タップ、リップル）
// Usage: <AnimatedButton onClick={...}>Submit</AnimatedButton>
const AnimatedButton = ({ children, className = '', onClick, disabled = false, variant = 'primary', ...props }) => {
    return (
        <motion.button
            className={className}
            onClick={onClick}
            disabled={disabled}
            whileHover={{ scale: disabled ? 1 : 1.05 }}
            whileTap={{ scale: disabled ? 1 : 0.95 }}
            transition={{ type: 'spring', stiffness: 400, damping: 17 }}
            {...props}
        >
            {children}
        </motion.button>
    );
};

// ===== AnimatedModal Component =====
// モーダル開閉アニメーション（スライドイン + フェード + バックドロップブラー）
// Usage: <AnimatedModal isOpen={...} onClose={...}>Content</AnimatedModal>
const AnimatedModal = ({ isOpen, onClose, children, className = '' }) => {
    return (
        <AnimatePresence>
            {isOpen && (
                <motion.div
                    className="fixed inset-0 flex items-center justify-center z-50"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.2 }}
                    onClick={onClose}
                >
                    {/* バックドロップ（ブラー） */}
                    <motion.div
                        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                    />

                    {/* モーダルコンテンツ */}
                    <motion.div
                        className={`relative ${className}`}
                        initial={{ y: 50, opacity: 0, scale: 0.95 }}
                        animate={{ y: 0, opacity: 1, scale: 1 }}
                        exit={{ y: 50, opacity: 0, scale: 0.95 }}
                        transition={{ type: 'spring', stiffness: 300, damping: 30 }}
                        onClick={(e) => e.stopPropagation()}
                    >
                        {children}
                    </motion.div>
                </motion.div>
            )}
        </AnimatePresence>
    );
};

// ===== AnimatedList Component =====
// リスト項目の追加・削除アニメーション
// Usage: <AnimatedList items={items} renderItem={(item) => <div>{item}</div>} />
const AnimatedList = ({ items, renderItem, className = '' }) => {
    return (
        <div className={className}>
            <AnimatePresence>
                {items.map((item, index) => (
                    <motion.div
                        key={item.id || index}
                        initial={{ opacity: 0, y: -20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, x: -100 }}
                        transition={{ duration: 0.3 }}
                        layout
                    >
                        {renderItem(item, index)}
                    </motion.div>
                ))}
            </AnimatePresence>
        </div>
    );
};

// ===== CountUpNumber Component =====
// スコアのカウントアップアニメーション
// Usage: <CountUpNumber value={100} duration={1000} />
const CountUpNumber = ({ value, duration = 1000, className = '', decimals = 0 }) => {
    const [displayValue, setDisplayValue] = React.useState(0);
    const startTimeRef = React.useRef(null);
    const rafRef = React.useRef(null);

    React.useEffect(() => {
        const startValue = displayValue;
        const difference = value - startValue;

        const animate = (currentTime) => {
            if (!startTimeRef.current) startTimeRef.current = currentTime;
            const elapsed = currentTime - startTimeRef.current;
            const progress = Math.min(elapsed / duration, 1);

            // イージング関数（easeOutExpo）
            const easeOutExpo = progress === 1 ? 1 : 1 - Math.pow(2, -10 * progress);

            setDisplayValue(startValue + difference * easeOutExpo);

            if (progress < 1) {
                rafRef.current = requestAnimationFrame(animate);
            } else {
                setDisplayValue(value);
            }
        };

        rafRef.current = requestAnimationFrame(animate);

        return () => {
            if (rafRef.current) cancelAnimationFrame(rafRef.current);
            startTimeRef.current = null;
        };
    }, [value, duration]);

    return <span className={className}>{displayValue.toFixed(decimals)}</span>;
};

// ===== Confetti Component =====
// 紙吹雪エフェクト（スコア達成時など）
// Usage: <Confetti isActive={showConfetti} />
const Confetti = ({ isActive, duration = 3000, particleCount = 50 }) => {
    const [particles, setParticles] = React.useState([]);

    React.useEffect(() => {
        if (!isActive) {
            setParticles([]);
            return;
        }

        // パーティクル生成
        const newParticles = Array.from({ length: particleCount }, (_, i) => ({
            id: i,
            x: Math.random() * 100,
            y: -10,
            rotation: Math.random() * 360,
            color: ['#FF6B6B', '#4ECDC4', '#45B7D1', '#FFA07A', '#98D8C8'][Math.floor(Math.random() * 5)],
            delay: Math.random() * 0.3,
            scale: 0.5 + Math.random() * 0.5
        }));

        setParticles(newParticles);

        const timer = setTimeout(() => {
            setParticles([]);
        }, duration);

        return () => clearTimeout(timer);
    }, [isActive, particleCount, duration]);

    if (particles.length === 0) return null;

    return (
        <div className="fixed inset-0 pointer-events-none z-[9999] overflow-hidden">
            {particles.map((particle) => (
                <motion.div
                    key={particle.id}
                    className="absolute w-3 h-3 rounded-sm"
                    style={{
                        left: `${particle.x}%`,
                        backgroundColor: particle.color,
                        transform: `scale(${particle.scale})`
                    }}
                    initial={{ y: particle.y, opacity: 1, rotate: 0 }}
                    animate={{
                        y: '110vh',
                        opacity: 0,
                        rotate: particle.rotation + 720
                    }}
                    transition={{
                        duration: 2 + Math.random(),
                        delay: particle.delay,
                        ease: 'easeIn'
                    }}
                />
            ))}
        </div>
    );
};

// ES Modulesとしてエクスポート
export { Icon, MarkdownRenderer, AnimatedButton, AnimatedModal, AnimatedList, CountUpNumber, Confetti };

// グローバルに公開（後方互換性のため）
window.Icon = Icon;
window.MarkdownRenderer = MarkdownRenderer;
window.AnimatedButton = AnimatedButton;
window.AnimatedModal = AnimatedModal;
window.AnimatedList = AnimatedList;
window.CountUpNumber = CountUpNumber;
window.Confetti = Confetti;
