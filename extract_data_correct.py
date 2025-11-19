#!/usr/bin/env python3
# -*- coding: utf-8 -*-

import subprocess

# Gitから元ファイルを取得
result = subprocess.run(
    ['git', 'show', 'HEAD:src/components/04_settings.jsx'],
    capture_output=True,
    text=True,
    encoding='utf-8'
)

lines = result.stdout.split('\n')

# 3058行目から5578行目まで抽出（0-indexed なので 3057-5577）
start_line = 3057  # 0-indexed
end_line = 5577    # 0-indexed (5578行目まで含む)

extracted_lines = lines[start_line:end_line+1]

# インデント調整：20スペースのベースインデントを12スペースに
adjusted_lines = []
for line in extracted_lines:
    if line.strip():  # 空行でない場合
        original_indent_count = len(line) - len(line.lstrip())
        base_indent = 20  # 元のファイルでのベースインデント

        if original_indent_count >= base_indent:
            # ベースインデントを引いて、新しいベース（12スペース）を追加
            relative_indent = original_indent_count - base_indent
            new_indent = ' ' * (8 + relative_indent)  # 8スペースのベース
            adjusted_lines.append(new_indent + line.lstrip())
        else:
            # ベースインデント未満の場合はそのまま
            adjusted_lines.append(line)
    else:
        adjusted_lines.append('')

# ファイルに書き出し
header = """import React from 'react';
import toast from 'react-hot-toast';

// ===== データタブコンポーネント =====
const DataTab = ({
    userId,
    handleExportData,
    handleClearData,
    showConfirm
}) => {
    const Icon = window.Icon;

    return (
"""

footer = """    );
};

export default DataTab;
"""

with open('C:/Users/yourc/yourcoach_new/src/components/04_settings_data.jsx', 'w', encoding='utf-8') as f:
    f.write(header)
    for line in adjusted_lines:
        f.write(line + '\n')
    f.write(footer)

print("04_settings_data.jsx recreated successfully")
