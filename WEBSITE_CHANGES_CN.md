# CAUSAL-UCB 官网结构与文案优化说明

本次仅修改网页组织、视觉、交互和资源链接。**保留了 `src/` 中的科研代码和 `docs/assets/certified-benchmark/` 中的原始实验数据**；独立浏览器 Python 实验的模型逻辑保持原样。

1. **去掉网页公开展示的版本标签**：不再使用“Latest manuscript”、“V3/V7/V11”等网页修订代号。静态 CSS/JS 资源改用语义化名称。已有实验数据中的内部 `version` 字段作为解析协议标记保留，不改变科学数据。
2. **Poster 移到研究简介下方**：改为小型缩略图卡片，点击打开 PDF；删除网页的 `Editable` 字样、PPTX 下载入口及大型 Poster 区块。保留 `docs/assets/poster/research-poster.pdf`。
3. **Evidence 区域双视图**：正式实验为默认视图，支持 7 方法、24 个随机种子、记录曲线、指标切换、图表与 CSV 下载。浏览器实验通过同一位置的另一标签打开，支持 5 个已实现的条件模型策略与可调参数。
4. **避免误导**：两个视图是不同实验协议；没有将 7 方法的记录数据伪装成浏览器实时实验，也没有为 Python Lab 虚构额外方法。
5. **图表继续保留**：论文 Figure 3–7 原图仍可切换；附录独立审计图仍在，现作为可展开的研究深读模块，减少首页初始长度。
6. **减少防御式文案**：把反复的 “not a...” 改成简短说明，将必要的适用条件收入详情区域；保留可检验性相关限制。
7. **视频省流量开关**：原“LOW DATA”改为“SAVE DATA / PLAY VIDEOS”，进入省流量模式时释放已有视频资源并展示静态图片。
8. **Read Paper 官方来源**：网页内通用论文入口及图表的论文来源入口改为 `https://openreview.net/pdf?id=sO7mOWC5TC`。源图的原稿页码仍标注为 source manuscript 页面，避免假设公共 PDF 分页完全相同。

## 部署

将 ZIP 解压，将 `causal-ucb/` **内部**的 `docs/`、`src/`、`README.md` 等上传到现有 GitHub 仓库根目录。GitHub Pages 的分支仍设为 `main`，目录 `/docs`。部署或预览应通过 HTTP(S) 而不是直接以 `file://` 打开，因为图表需加载本地 JSON 文件。

## 验证

- `python -m unittest discover -s src/tests -v`：9/9 通过。
- JavaScript 语法检查、桌面与移动端交互、图表切换、七方法原始数据载入与链接检查：通过。
- 浏览器 Python 实验依赖 Pyodide CDN；本次离线环境无法完整执行远程运行时下载，所以不宣称已验证真实浏览器 Python 运算。
