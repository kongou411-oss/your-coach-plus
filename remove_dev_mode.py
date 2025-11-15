import re

def remove_dev_mode_blocks(filepath):
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()

    # if (DEV_MODE) { ... } ブロックを削除するパターン
    # ネストした括弧に対応するため、より詳細なマッチング
    lines = content.split('\n')
    result_lines = []
    i = 0

    while i < len(lines):
        line = lines[i]

        # if (DEV_MODE) を見つけた場合
        if 'if (DEV_MODE)' in line:
            # このブロックの開始
            brace_count = 0
            skip_lines = []
            j = i

            # ブロックの終わりを見つける
            while j < len(lines):
                current_line = lines[j]
                skip_lines.append(current_line)

                # 括弧をカウント
                brace_count += current_line.count('{')
                brace_count -= current_line.count('}')

                j += 1

                # ブロックが終了した
                if brace_count == 0 and '{' in ''.join(skip_lines):
                    break

            # このDEV_MODEブロックをスキップ
            i = j
            continue

        result_lines.append(line)
        i += 1

    # ファイルに書き戻す
    with open(filepath, 'w', encoding='utf-8') as f:
        f.write('\n'.join(result_lines))

    print(f"Processed: {filepath}")

# 実行
remove_dev_mode_blocks('C:/Users/yourc/yourcoach_new/src/services.js')
remove_dev_mode_blocks('C:/Users/yourc/yourcoach_new/src/notificationSound.js')
print("DEV_MODE blocks removed successfully!")
