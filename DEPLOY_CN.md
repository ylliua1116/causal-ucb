# GitHub 网页上传与部署

这个仓库可以仅使用浏览器上传，不需要安装 GitHub Desktop。

## 上传代码

1. 解压下载的 ZIP，进入 `causal-ucb` 文件夹内部。
2. 打开 GitHub 上的 `causal-ucb` 仓库。空仓库点击 **uploading an existing file**；已有文件则点击 **Add file → Upload files**。
3. 将文件夹内部的所有内容拖入上传区域，保持 `README.md`、`requirements.txt`、`src/` 和 `docs/` 位于仓库根目录。不要把外层 `causal-ucb` 文件夹一起拖入。
4. 确认文件路径以 `docs/`、`src/` 或根目录文件名开头，再点击 **Commit changes**，提交到 `main` 分支。

GitHub 网页单次上传存在文件数量和单文件大小限制。如果遇到限制，可以分批上传，但应保持每个文件原来的相对路径。

## 开启 GitHub Pages

1. 进入仓库 **Settings → Pages**。
2. 在 **Build and deployment** 中将 Source 设为 **Deploy from a branch**。
3. Branch 选择 `main`，Folder 选择 `/docs`，点击 **Save**。
4. 部署后通过 `https://ylliua1116.github.io/causal-ucb/` 访问网页。

## 本地运行 Python 实验

```bash
python -m pip install -r requirements.txt
python -m unittest discover -s src/tests -v
python src/fast_compare.py --out results_smoke --seeds 1 --T 35 --scenarios high_mismatch
```

`docs/` 是网页；`src/` 是研究代码。网页中的历史实验数据与浏览器即时运行的实验相互独立，详情见项目首页 `README.md`。
