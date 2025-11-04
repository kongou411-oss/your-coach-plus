import React from 'react';
// ===== Common Components =====
// Icon, MarkdownRenderer

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
