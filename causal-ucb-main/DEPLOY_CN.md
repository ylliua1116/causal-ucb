# CAUSAL-UCB V11：GitHub Pages 网页部署与替换步骤

**目标网站**：`https://ylliua1116.github.io/causal-ucb/`（在仓库 `ylliua1116/causal-ucb` 使用 GitHub Pages 的 `main` → `/docs` 配置时）。

## A. 最省事：用完整包更新仓库

1. 下载、解压 `CAUSAL_UCB_ProjectSite_V11_Full.zip`。
2. 打开解压后的 `causal-ucb-main/`。**将里面的文件复制到现有 `causal-ucb` 仓库根目录**，不要把 `causal-ucb-main/` 整个当成新一层目录传上去。`docs/index.html` 必须仍然位于 `<repo>/docs/index.html`。
3. 使用 GitHub Desktop：克隆仓库 → 在 Finder/文件管理器里覆盖对应文件 → GitHub Desktop 检查 Changed files → 填写提交消息 `Update CAUSAL-UCB manuscript-aligned site V11` → Commit to main → Push origin。
4. 检查 GitHub → **Settings → Pages → Build and deployment**：Source 设为 `Deploy from a branch`，Branch 选 `main`，Folder 选 `/docs`。若原来已这样设置，无须修改。
5. 打开项目网址，强制刷新（Mac: `Cmd + Shift + R`；Windows: `Ctrl + F5`）。核对 9 个图表入口、PDF、海报及实验区。

## B. 只想覆盖网页：用补丁包

下载 `CAUSAL_UCB_ProjectSite_V11_WebPatch.zip`，解压后会得到与原仓库相同的目录层级，按原路径覆盖现有仓库中的文件，提交并推送。`src/` 完全不需要替换。

**必须覆盖/新增**：

- `docs/index.html` — 替换顶部论文文字、正文/附录按钮、图注、海报卡片
- `docs/science-v5.js` — 修正图号、点击切换和 PDF 页码
- `docs/site-config.js` — 将 arXiv 改为 `https://arxiv.org/abs/2611.09665`，`paper` 指向 `assets/paper/CAUSAL_UCB_2026_Latest_66p.pdf`
- `docs/site-v11.css`（新增）— 扩大按钮真实点击范围和响应式布局
- `docs/v11.js`（新增）— 键盘切换
- `docs/assets/paper-figures/paper-figure-3.png` 至 `paper-figure-7.png` — 全部替换
- `docs/assets/paper-audit-figures/Fig26_Optimism_vs_Greedy_p60.png` — 替换
- `docs/assets/paper-audit-figures/Fig27_Paired_Regret_18_Cells_p60.png` — 新增
- `docs/assets/paper-audit-figures/Fig28_Full_Path_Coverage_p61.png` — 新增
- `docs/assets/paper-audit-figures/Fig31_Hidden_Misspecification_p62.png` — 新增
- `docs/assets/paper/CAUSAL_UCB_2026_Latest_66p.pdf` — 新增
- `docs/assets/poster-preview.jpg` 和 `docs/assets/poster/` — 新增
- `docs/FIGURE_PROVENANCE_V11.json` — 图号和来源清单

**可删的旧图（防止误用）**：`Fig27_Full_Path_Coverage_p60.png`、`Fig31_Hidden_Misspecification_p63.png`。这些文件不再被 V11 页面引用。

## C. 使用终端提交（可选）

在本地已克隆的 Git 仓库根目录覆盖好补丁后运行：

```bash
git status
git add -A
git commit -m "Update CAUSAL-UCB manuscript-aligned website V11"
git push origin main
```

若仓库实际默认分支不是 `main`，请用你当前的分支名，并同步检查 Pages 的 Source 设置。

## D. 上传后自查（重要）

1. 首页 `Paper` 应打开本站的 **66 页修订稿**；`arXiv` 应打开 `https://arxiv.org/abs/2611.09665`，即 **64 页 v1**。两个文件不同，不能混用页码。
2. 主图按钮 Fig. 3/4/5/6/7 均能点击，且正确显示论文图。
3. 附录标签应为 **Fig. 28 / Full-path coverage；Fig. 26 / Optimism sensitivity；Fig. 27 / 18-cell regret forest；Fig. 31 / Hidden violations**。
4. 源页链接应分别跳转到本地 PDF 的第 **61/60/60/62** 页。
5. 点击海报预览可打开 PDF，并可下载 editable PPTX。
6. 平板/手机上按钮应有较大的点击区；聚焦标签后按左右箭头可以换图。
7. 原来的 `Run Lab`、`GitHub Code`、`Reproducibility` 应能正常导航；但浏览器的 Live Lab 需要网络访问 Pyodide CDN，不是完整的论文实验复现。

## E. 常见问题

- **更新后还是旧图**：优先用强制刷新或无痕窗口；确保上传了新 CSS、JS 和 PNG，不只是 index.html。
- **按钮有字却不切换**：检查 `science-v5.js` 与 `v11.js` 是否被同步部署。不能只替换图片。
- **论文 PDF 404**：检查路径 `docs/assets/paper/CAUSAL_UCB_2026_Latest_66p.pdf`，不要遗漏目录层级或改动文件名。
- **海报无法打开**：确认 `docs/assets/poster` 中 PDF 和 PPTX 都成功推送，GitHub Pages build 正常完成。
- **GitHub 限制单个文件大小**：本次文件均低于 GitHub 常见的 100 MB 单文件限制；仍以实际 GitHub 配额和仓库规则为准。

## F. 本次交付的验证边界

V11 原有 Python 测试 9 项通过；按钮切换逻辑在两种模拟屏宽（1440 和 390）下通过独立 Chromium DOM 验证。由于当前执行环境禁止浏览器直接访问本地文件/HTTP 地址，无法声称完整项目已在线上通过端到端测试；上线后应按 D 节自行验收。
