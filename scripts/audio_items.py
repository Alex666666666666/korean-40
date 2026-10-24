"""两套音频共用的生成列表（与 data.js 保持一致）。"""

import unicodedata

# 例字：辅音配 ㅏ、元音配 ㅇ
SYLLABLES = (
    "가 까 나 다 따 라 마 바 빠 사 싸 아 자 짜 차 카 타 파 하 "
    "아 야 어 여 오 요 우 유 으 이 애 얘 에 예 와 왜 외 워 웨 위 의"
).split()

# 对比练习单词
WORDS = "불 풀 뿔 달 탈 딸 자다 차다 짜다 비다 피다 삐다 사다 싸다".split()


def nfc(s):
    return unicodedata.normalize("NFC", s)


def build_items():
    """返回 [(韩文, 请求文本)]，去重且保持顺序。单个音节末尾加句号，单词不加。"""
    items, seen = [], set()
    for s in SYLLABLES:
        s = nfc(s)
        if s not in seen:
            seen.add(s)
            items.append((s, s + "."))
    for w in WORDS:
        w = nfc(w)
        if w not in seen:
            seen.add(w)
            items.append((w, w))
    return items


def select_items(only):
    """按命令行参数筛选；有未知文字时返回 (None, 未知列表)。"""
    items = build_items()
    if not only:
        return items, []
    wanted = [nfc(x) for x in only]
    known = {k for k, _ in items}
    unknown = [w for w in wanted if w not in known]
    if unknown:
        return None, unknown
    return [it for it in items if it[0] in wanted], []
