#!/usr/bin/env python3
"""用微软 Edge 神经语音（edge-tts）生成 audio/ms/<韩文>.mp3。

用法：
    python3 scripts/gen_audio_ms.py            # 生成所有缺失的音频（已存在的跳过）
    python3 scripts/gen_audio_ms.py 가 불      # 只处理指定的音节/单词（已存在仍跳过）
    python3 scripts/gen_audio_ms.py --force 가 # 强制重新生成指定音频（覆盖）

不需要 API key。生成内容与 gen_audio.py（ElevenLabs）完全一致。
如果设置了 HTTPS_PROXY 环境变量，会自动走代理。
"""

import argparse
import asyncio
import os
import sys
import time
from pathlib import Path

import edge_tts

from audio_items import select_items

VOICE = "ko-KR-InJoonNeural"  # 男声
RATE = "-10%"

REQUEST_INTERVAL = 0.5  # 每个请求之间间隔（秒）
RETRIES = 2             # 失败后自动重试次数

ROOT = Path(__file__).resolve().parent.parent
AUDIO_DIR = ROOT / "audio" / "ms"
SERVICE_HOST = "speech.platform.bing.com"


def proxy_from_env():
    # aiohttp 默认不读代理环境变量，这里手动传给 edge-tts
    for name in ("HTTPS_PROXY", "https_proxy", "ALL_PROXY", "all_proxy"):
        if os.environ.get(name):
            return os.environ[name]
    return None


async def synth_once(text, proxy):
    communicate = edge_tts.Communicate(text, VOICE, rate=RATE, proxy=proxy)
    chunks = []
    async for chunk in communicate.stream():
        if chunk["type"] == "audio":
            chunks.append(chunk["data"])
    data = b"".join(chunks)
    if not data:
        raise RuntimeError("没有收到音频数据")
    return data


def is_connection_error(e):
    text = f"{type(e).__name__} {e}"
    return any(s in text for s in ("Cannot connect", "DNS", "Name or service", "ClientConnector"))


def synth(text, proxy):
    """返回 (mp3 字节, None, 是否连接失败) 或 (None, 错误信息, 是否连接失败)。"""
    last_error = "未知错误"
    for attempt in range(RETRIES + 1):
        if attempt > 0:
            time.sleep(REQUEST_INTERVAL * (attempt + 1))
        try:
            return asyncio.run(synth_once(text, proxy)), None, False
        except Exception as e:  # edge-tts 会抛出多种网络/协议异常
            last_error = f"{type(e).__name__}: {str(e)[:200]}"
            if is_connection_error(e):
                return None, last_error, True
    return None, last_error, False


def main():
    parser = argparse.ArgumentParser(description="用微软 Edge 神经语音生成韩语 40 音音频")
    parser.add_argument("only", nargs="*", help="只处理这些音节/单词（默认全部）")
    parser.add_argument("--force", action="store_true", help="覆盖已存在的文件")
    args = parser.parse_args()

    items, unknown = select_items(args.only)
    if unknown:
        print("不在生成列表里：" + " ".join(unknown))
        sys.exit(2)

    AUDIO_DIR.mkdir(parents=True, exist_ok=True)
    proxy = proxy_from_env()
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
        data, err, conn_failed = synth(text, proxy)
        if data:
            tmp = out.with_suffix(".mp3.part")
            tmp.write_bytes(data)
            tmp.replace(out)
            ok.append(name)
            print(f"✓ {len(data) // 1024} KB")
            continue

        print(f"✗ {err}")
        failed.append((name, err))
        if conn_failed:
            # 连不上服务就不再逐个重试，直接结束
            print(f"\n无法连接 {SERVICE_HOST}，请检查网络（或代理/防火墙是否放行该域名）。")
            remaining = [n for n, _ in items[items.index((name, text)) + 1:]
                         if not (AUDIO_DIR / f"{n}.mp3").exists() or args.force]
            failed.extend((n, "未尝试（连接失败）") for n in remaining)
            break

    print("\n========== 结果 ==========")
    print(f"声音：{VOICE}，语速 {RATE}")
    print(f"成功 {len(ok)}：" + (" ".join(ok) if ok else "-"))
    print(f"跳过（已存在）{len(skipped)}：" + (" ".join(skipped) if skipped else "-"))
    print(f"失败 {len(failed)}：" + (" ".join(n for n, _ in failed) if failed else "-"))
    for n, e in failed:
        print(f"  {n}: {e}")
    sys.exit(1 if failed else 0)


if __name__ == "__main__":
    main()
