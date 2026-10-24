#!/usr/bin/env python3
"""用 ElevenLabs 文本转语音生成 audio/<韩文>.mp3。

用法：
    python3 scripts/gen_audio.py            # 生成所有缺失的音频（已存在的跳过）
    python3 scripts/gen_audio.py 가 불      # 只处理指定的音节/单词（已存在仍跳过）
    python3 scripts/gen_audio.py --force 가 # 强制重新生成指定音频（覆盖）

API key 从环境变量 ELEVENLABS_API_KEY 读取；若未设置，会尝试读取仓库根目录的 .env。
"""

import argparse
import os
import sys
import time
import unicodedata
from pathlib import Path

import requests

VOICE_ID = "M7AHsCtFdpWTIL58I3ap"  # Dongjae（男声）
MODEL_ID = "eleven_v4"
FALLBACK_MODEL_ID = "eleven_multilingual_v2"
OUTPUT_FORMAT = "mp3_44100_128"
API_URL = "https://api.elevenlabs.io/v1/text-to-speech/{voice_id}"

REQUEST_INTERVAL = 0.5  # 每个请求之间间隔（秒）
RETRIES = 2             # 失败后自动重试次数
TIMEOUT = 60

ROOT = Path(__file__).resolve().parent.parent
AUDIO_DIR = ROOT / "audio"

# 例字：辅音配 ㅏ、元音配 ㅇ（与 data.js 保持一致）
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


def load_api_key():
    key = os.environ.get("ELEVENLABS_API_KEY", "").strip()
    if key:
        return key
    env_file = ROOT / ".env"
    if env_file.exists():
        for line in env_file.read_text(encoding="utf-8").splitlines():
            line = line.strip()
            if line.startswith("export "):
                line = line[len("export "):]
            if line.startswith("ELEVENLABS_API_KEY="):
                return line.split("=", 1)[1].strip().strip('"').strip("'")
    return ""


def is_model_error(resp):
    """判断是不是模型本身不可用（而不是网络/限流/鉴权问题）。"""
    if resp.status_code in (401, 429) or resp.status_code >= 500:
        return False
    return resp.status_code >= 400 and "model" in resp.text.lower()


def short_error(resp):
    text = resp.text.strip().replace("\n", " ")
    return f"HTTP {resp.status_code}: {text[:200]}"


class Generator:
    def __init__(self, api_key):
        self.session = requests.Session()
        self.session.headers.update({
            "xi-api-key": api_key,
            "Accept": "audio/mpeg",
            "Content-Type": "application/json",
        })
        self.model = MODEL_ID
        self.fell_back = False

    def request(self, text):
        return self.session.post(
            API_URL.format(voice_id=VOICE_ID),
            params={"output_format": OUTPUT_FORMAT},
            json={"text": text, "model_id": self.model},
            timeout=TIMEOUT,
        )

    def synth(self, text):
        """返回 (mp3 字节, None) 或 (None, 错误信息)。"""
        last_error = "未知错误"
        attempt = 0
        while attempt <= RETRIES:
            if attempt > 0:
                time.sleep(REQUEST_INTERVAL * (attempt + 1))
            try:
                resp = self.request(text)
            except requests.RequestException as e:
                last_error = f"{type(e).__name__}: {e}"
                attempt += 1
                continue

            if resp.ok and resp.content:
                return resp.content, None

            if self.model == MODEL_ID and is_model_error(resp):
                print(f"\n⚠️  模型 {MODEL_ID} 报错（{short_error(resp)}）")
                print(f"⚠️  改用 {FALLBACK_MODEL_ID} 继续生成\n")
                self.model = FALLBACK_MODEL_ID
                self.fell_back = True
                continue  # 换模型后立即重试，不计入重试次数

            last_error = short_error(resp)
            attempt += 1
        return None, last_error


def main():
    parser = argparse.ArgumentParser(description="生成韩语 40 音音频")
    parser.add_argument("only", nargs="*", help="只处理这些音节/单词（默认全部）")
    parser.add_argument("--force", action="store_true", help="覆盖已存在的文件")
    args = parser.parse_args()

    items = build_items()
    if args.only:
        wanted = [nfc(x) for x in args.only]
        known = {k for k, _ in items}
        unknown = [w for w in wanted if w not in known]
        if unknown:
            print("不在生成列表里：" + " ".join(unknown))
            sys.exit(2)
        items = [it for it in items if it[0] in wanted]

    api_key = load_api_key()
    if not api_key:
        print("未找到 ELEVENLABS_API_KEY。请先：export ELEVENLABS_API_KEY='你的key'")
        sys.exit(1)

    AUDIO_DIR.mkdir(exist_ok=True)
    gen = Generator(api_key)
    ok, skipped, failed = [], [], []
    first_request = True

    for name, text in items:
        out = AUDIO_DIR / f"{name}.mp3"
        if out.exists() and out.stat().st_size > 0 and not args.force:
            skipped.append(name)
            continue

        if not first_request:
            time.sleep(REQUEST_INTERVAL)
        first_request = False

        print(f"生成 {name}（请求文本：{text}）… ", end="", flush=True)
        data, err = gen.synth(text)
        if data:
            tmp = out.with_suffix(".mp3.part")
            tmp.write_bytes(data)
            tmp.replace(out)
            ok.append(name)
            print(f"✓ {len(data) // 1024} KB")
        else:
            failed.append((name, err))
            print(f"✗ {err}")

    print("\n========== 结果 ==========")
    print(f"使用模型：{gen.model}" + ("（已从 eleven_v4 回退）" if gen.fell_back else ""))
    print(f"成功 {len(ok)}：" + (" ".join(ok) if ok else "-"))
    print(f"跳过（已存在）{len(skipped)}：" + (" ".join(skipped) if skipped else "-"))
    print(f"失败 {len(failed)}：" + (" ".join(n for n, _ in failed) if failed else "-"))
    for n, e in failed:
        print(f"  {n}: {e}")
    sys.exit(1 if failed else 0)


if __name__ == "__main__":
    main()
