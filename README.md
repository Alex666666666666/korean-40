# 韩语 40 音

按「4 套 5 基」体系整理的韩语 40 音学习网页：纯静态（`index.html` + `style.css` + `app.js` + `data.js`），无需构建，可直接部署到 GitHub Pages，主要面向 iPad Safari 和 Mac 浏览器。

## 功能

- **三个分区**：辅音 / 元音 / 对比练习
- **辅音**
  - 四套辅音表（双唇 ㅂㅍㅃ、舌尖 ㄷㅌㄸ、舌根 ㄱㅋㄲ、舌尖前 ㅈㅊㅉ），三列「松音 / 送气音 / 紧音」用不同浅色区分
  - 点击行标题（如「双唇」）依次播放该行三个音节，间隔 0.8 秒，播放中的卡片高亮
  - 其他辅音：ㅅ ㅆ ㄴ ㅁ ㄹ ㅇ ㅎ
- **元音**：5 个基本元音、i+ 系列、+i 系列、u+ 系列、其他；每个系列标题下有组合规则小字，组合元音卡片正面显示组合（如 i+a）
- **对比练习**：불/풀/뿔、달/탈/딸、자다/차다/짜다、비다/피다/삐다、사다/싸다，点击单词播放并显示中文意思，每组有「依次播放」按钮
- **卡片**：正面大号字母；点击后 3D 翻转，背面显示罗马音、例字、字母名并播放读音；默认 3 秒后自动翻回，翻转中再点一次会重播并重新计时
- **设置**：右上角可选自动翻回 2 / 3 / 5 秒（保存在 localStorage，只存这一项）
- **音频**：使用 `audio/<韩文>.mp3`（ElevenLabs 男声 Dongjae 生成）；只在点击时播放（符合 iOS 限制），进入某分区时预加载该分区音频
- **回退**：某个 mp3 缺失或加载失败时，自动改用浏览器的 speechSynthesis（ko-KR，语速 0.8），右下角会有小字提示
- 支持横竖屏、深色模式；iPad 竖屏一行可放 4 张卡

## 开启 GitHub Pages

1. 先把这个 PR 合并到 `main`
2. 打开仓库 **Settings → Pages**
3. **Build and deployment → Source** 选 **Deploy from a branch**
4. **Branch** 选 `main`，目录选 `/ (root)`，点 **Save**
5. 等一两分钟，页面地址为 `https://<你的用户名>.github.io/<仓库名>/`

所有资源都使用相对路径，所以在 `/<仓库名>/` 子路径下可以正常工作。仓库根目录的 `.nojekyll` 让 Pages 原样发布文件（不经过 Jekyll 处理）。

> 本地预览：在仓库目录运行 `python3 -m http.server`，然后打开 http://localhost:8000 。直接双击 `index.html` 也能用，但建议用本地服务器。

## 在 Mac 上运行音频脚本

音频已经生成并提交在 `audio/` 里，**一般不需要重新运行**。如果想替换某些音频，按下面操作。

### 1. 安装依赖（只需一次）

```bash
cd 仓库所在目录
python3 -m venv .venv
source .venv/bin/activate
pip install -r scripts/requirements.txt
```

### 2. 设置 API key

在当前终端里设置环境变量（只对这个终端窗口有效，不会写进任何文件）：

```bash
export ELEVENLABS_API_KEY='你的 ElevenLabs API key'
```

或者在仓库根目录建一个 `.env` 文件，内容为 `ELEVENLABS_API_KEY=你的key`。`.env` 已加入 `.gitignore`，不会被提交。

### 3. 生成音频

```bash
python3 scripts/gen_audio.py
```

- 已存在的文件会自动跳过，只生成缺失的
- 每个请求间隔 0.5 秒，失败会自动重试 2 次，结束时打印成功 / 跳过 / 失败清单
- 声音：Dongjae（voice_id `M7AHsCtFdpWTIL58I3ap`），模型 `eleven_v4`；如果该模型报错，脚本会自动改用 `eleven_multilingual_v2` 并在输出中提示
- 单个音节的请求文本末尾会加句号（如「가.」），减少怪语调；单词不加

## 重新生成单个音频

任选一种方式：

```bash
# 方式一：删掉不满意的文件，再跑一遍脚本（只会补缺失的）
rm audio/가.mp3
python3 scripts/gen_audio.py

# 方式二：直接指定要重做的音节/单词，--force 表示覆盖已有文件
python3 scripts/gen_audio.py --force 가 불
```

每次生成的语调会略有不同，不满意可以多试几次。生成后提交并推送即可：

```bash
git add audio
git commit -m "重新生成部分音频"
git push
```

## 文件结构

```
index.html            页面结构
style.css             样式（含深色模式、横竖屏适配）
app.js                渲染与交互（翻转、播放、依次播放、回退、设置）
data.js               罗马音、字母名、例字、分组、对比词
audio/                53 个 mp3，文件名即韩文（网页中用 encodeURIComponent 引用）
scripts/gen_audio.py  ElevenLabs 音频生成脚本
scripts/requirements.txt
```

## 修改内容

所有文字数据都在 `data.js`。如果新增或修改了例字/单词，也要同步修改 `scripts/gen_audio.py` 里的 `SYLLABLES` / `WORDS` 列表，再运行脚本生成新音频。
