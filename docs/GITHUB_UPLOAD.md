# 把项目上传到 GitHub

## 一、在 GitHub 上新建仓库

1. 打开 [https://github.com/new](https://github.com/new)
2. 填写 **Repository name**（例如：`sys2` 或 `risk-monitor`）
3. 选择 **Public**，**不要**勾选 “Add a README file”（本地已有代码）
4. 点击 **Create repository**

## 二、在本地用 Git 上传

在项目根目录 `sys2` 下打开终端，按顺序执行：

### 1. 初始化 Git 并做第一次提交

```bash
cd /Users/chengzi/Desktop/sys2

# 初始化仓库
git init

# 添加所有文件（.gitignore 里的会自动忽略）
git add .

# 第一次提交
git commit -m "Initial commit: 企业风险监控系统"
```

### 2. 关联远程仓库并推送

把下面命令里的 `你的用户名` 和 `仓库名` 换成你在 GitHub 上创建的：

```bash
# 添加远程仓库（替换成你的 GitHub 用户名和仓库名）
git remote add origin https://github.com/你的用户名/仓库名.git

# 主分支命名为 main（若 GitHub 默认是 main）
git branch -M main

# 推送到 GitHub
git push -u origin main
```

**示例**：若你的 GitHub 用户名是 `zhangsan`，仓库名是 `sys2`，则：

```bash
git remote add origin https://github.com/zhangsan/sys2.git
git branch -M main
git push -u origin main
```

### 3. 若推送时要求登录

- **HTTPS**：会提示输入 GitHub 用户名和密码；密码处要填 **Personal Access Token**（不是登录密码）。
  - 创建 Token：GitHub → Settings → Developer settings → Personal access tokens → Generate new token，勾选 `repo` 权限。
- **SSH**：若已配置 SSH 密钥，可改用：
  ```bash
  git remote add origin git@github.com:你的用户名/仓库名.git
  git push -u origin main
  ```

## 三、之后日常更新

改完代码后：

```bash
git add .
git commit -m "简短描述本次修改"
git push
```

---

**说明**：根目录 `.gitignore` 已配置忽略 `node_modules/`、`venv/`、`backend/.env`、`data/` 等，这些不会上传到 GitHub。
