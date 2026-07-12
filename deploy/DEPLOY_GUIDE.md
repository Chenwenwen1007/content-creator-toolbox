# 🚀 阿里云ECS Docker部署保姆级教程

> **本教程保证照着敲命令就能成功，不需要懂任何技术！**
>
> 部署完成后，访问：http://你的服务器IP:18080

---

## 📋 开始前准备

### 你需要有：
1. 阿里云ECS服务器（已经买好了）
2. 服务器系统：**Ubuntu 20.04/22.04**（推荐，其他系统也可以）
3. 服务器安全组已经开放以下端口（阿里云控制台去开！）：
   - `22`：SSH连接（必须开，否则连不上服务器）
   - `18080`：Web应用访问端口

### 端口说明
- **对外访问端口**：`18080`（你在浏览器里访问的端口）
- **后端内部端口**：`17891`（Docker内部网络使用，**不需要映射到宿主机，也不需要在安全组开放**）

---

## 🔴 第一部分：连接服务器（解决 Permission denied 问题）

连接服务器有三种方式，**强烈推荐新手直接用方法A（Workbench）**，不需要配置密钥，打开浏览器就能用。

---

### ✅ 方法A：阿里云Workbench（最简单，推荐新手！）

不需要密钥、不需要配置任何东西，直接在浏览器里操作：

1. 登录阿里云控制台 → 云服务器ECS → 实例
2. 找到你的服务器实例，点击右侧的 **「远程连接」**
3. 连接方式选择 **「Workbench远程连接」**，点击「立即登录」
4. 用户名输入 `root`，输入你创建实例时设置的密码（如果是密钥创建的，直接点登录）
5. **成功进入黑色命令行界面！直接跳到「第二部分：安装Docker」继续操作**

> 💡 这个方法100%成功，不需要纠结SSH密钥问题。

---

### 方法B：用.pem密钥文件本地SSH连接（适合有经验的用户）

如果你想在本地PowerShell/终端里用密钥连接，按下面步骤来：

#### 步骤1：确认安全组开放22端口
登录阿里云控制台 → ECS → 实例 → 安全组 → 配置规则 → 入方向，确认有TCP 22端口、授权对象0.0.0.0/0的规则。如果没有就添加一条。

> ⚠️ **重要：连接超时/一直转圈圈 = 22端口没开；直接提示Permission denied = 密钥问题，和端口无关。**

#### 步骤2：确认密钥已绑定实例且服务器已重启（最容易踩坑！）
1. 登录阿里云控制台 → ECS → 左侧菜单「密钥对」
2. 找到你的密钥，确认「已绑定实例」里有你的服务器
3. **如果刚绑定密钥，必须重启ECS实例！不重启公钥不会写入服务器，一定会Permission denied！**
4. 确认密钥地域和服务器地域一致（比如都是华东1杭州），不一致绑定不上。

#### 步骤3：Windows系统修复pem文件权限（必做！）
Windows下pem文件权限过宽会导致SSH拒绝读取，**直接用图形界面改，不用命令行：**

1. 把你的`.pem`密钥文件放到一个容易找到的文件夹（比如`F:\AliYun\`）
2. 右键点击pem文件 → 属性 → 顶部【安全】标签 → 右下角【高级】
3. 顶部【所有者】点【更改】→ 输入你的Windows用户名 → 点「检查名称」→ 确定，把所有者改成你自己
4. 左下角点【禁用继承】→ 选择「从此对象中删除所有继承的权限」
5. 现在权限列表清空了，点【添加】→【选择主体】→ 输入你的Windows用户名 → 检查名称 → 确定
6. 给你的用户名**只勾选「读取」**，其他所有权限全部取消勾选
7. 再点一次【添加】，输入`SYSTEM`，也只勾选「读取」
8. 权限列表里只允许存在两个条目：你的用户名、SYSTEM，其他任何用户/组（比如Administrators、Users、Authenticated Users等）全部删除
9. 一路点【应用】→【确定】保存全部窗口

#### 步骤4：验证密钥权限和完整性
打开PowerShell，执行（替换成你自己的pem文件路径）：
```powershell
ssh-keygen -l -f "你的pem文件完整路径"
```
- ✅ 如果输出一串密钥指纹（比如`SHA256:xxxxxx`），没有`bad permissions`警告 = 权限修复成功，密钥文件完好
- ❌ 如果提示权限过宽，回到步骤3重新检查是否漏删了其他用户
- ❌ 如果报错说不是密钥文件，说明pem文件损坏，回到阿里云控制台重新创建密钥、重新下载、重新绑定、重启服务器

#### 步骤5：连接服务器
```powershell
ssh -i "你的pem文件完整路径" root@你的服务器公网IP
```

**Mac/Linux用户：**
```bash
# 1. 先给密钥设置权限（必须执行）
chmod 400 /path/to/你的密钥文件.pem

# 2. 验证密钥
ssh-keygen -l -f /path/to/你的密钥文件.pem

# 3. 连接
ssh -i /path/to/你的密钥文件.pem root@你的服务器公网IP
```

---

### 方法C：临时开启密码登录（应急用）

如果你还是连不上密钥，先用方法A的Workbench登录进去，然后执行以下命令开启密码登录：

```bash
# 1. 设置root密码（输入两次，输入时屏幕不显示，正常输就行）
passwd root

# 2. 修改SSH配置允许密码登录
sed -i 's/^PasswordAuthentication no/PasswordAuthentication yes/' /etc/ssh/sshd_config
sed -i 's/^#PasswordAuthentication yes/PasswordAuthentication yes/' /etc/ssh/sshd_config
sed -i 's/^PermitRootLogin.*/PermitRootLogin yes/' /etc/ssh/sshd_config

# 3. 重启SSH服务
systemctl restart sshd
```

之后就可以直接用密码登录了：
```bash
ssh root@你的服务器公网IP
```

---

### ❓ 连接问题排查总结

| 错误现象 | 原因 | 解决方法 |
|---------|------|---------|
| 连接超时/一直转圈没反应 | 22端口没开或防火墙挡了 | 阿里云安全组开放TCP 22端口 |
| Permission denied (publickey) | 1.密钥没绑定实例；2.绑定后没重启服务器；3.pem文件不对 | 确认密钥绑定、**重启实例**、验证密钥指纹 |
| WARNING: UNPROTECTED PRIVATE KEY FILE! / bad permissions | pem文件权限太宽 | 按方法B步骤3修复权限 |
| 密钥绑定页面找不到你的服务器 | 密钥地域和服务器地域不一致 | 在服务器相同地域创建密钥 |

> **90%的人卡在"绑定密钥后没重启服务器"这一步！！！**

---

## 🔧 第二部分：安装Docker和配置镜像加速

成功连接到服务器后（看到黑色命令行界面，前面有 `root@xxx:~#` 这样的提示符），开始安装Docker：

### 步骤1：安装Docker（一条命令搞定）

**复制下面整条命令，粘贴到服务器里按回车：**
```bash
curl -fsSL https://get.docker.com | bash -s docker --mirror Aliyun
```

> ⏳ 等它跑完，可能需要1-3分钟，看到 "Thank you for installing Docker!" 就成功了。

### 步骤2：配置Docker镜像加速器（国内服务器必做！否则镜像拉取失败）

国内服务器无法直连Docker Hub，必须配置镜像加速。**逐行执行以下命令：**

```bash
mkdir -p /etc/docker
```

```bash
tee /etc/docker/daemon.json <<-'EOF'
{
  "dns": ["114.114.114.114", "8.8.4.4"],
  "registry-mirrors": [
    "https://docker.xuanyuan.me",
    "https://docker.1ms.run",
    "https://docker.m.daocloud.io"
  ]
}
EOF
```

```bash
systemctl daemon-reload
```

```bash
systemctl restart docker
```

```bash
systemctl enable docker
```

> 💡 **说明**：镜像加速地址是Docker专用协议接口，**用浏览器打开会报错/无法访问，这是正常现象！** 不影响加速功能。
>
> 如果你有阿里云专属加速地址（登录阿里云容器镜像服务可以获取），可以加到上面的列表里，速度更快。

### 步骤3：验证安装成功
```bash
docker -v
docker compose version
```

看到版本号就说明安装成功了！

如果提示 `docker: 'compose' is not a docker command`，安装compose插件：
```bash
apt install -y docker-compose-plugin
```

---

## 📁 第三部分：上传代码到服务器

### 方式A：用Git拉取（推荐，最简单，方便后续更新）

如果你的代码已经推送到GitHub/Gitee：

```bash
# 1. 安装git（如果没装）
apt update && apt install -y git

# 2. 创建项目目录
mkdir -p /opt/projects
cd /opt/projects

# 3. 克隆代码（换成你自己的仓库地址！）
git clone 你的仓库地址 content-creator-toolbox

# 4. 进入项目目录
cd content-creator-toolbox
```

> ⚠️ **重要检查：** 输入 `ls` 命令，能看到 `docker-compose.yml`、`Dockerfile.backend`、`Dockerfile.frontend` 这些文件就对了！

### 方式B：在本地打包上传（不用Git的方法）

1. 在你Windows电脑上，把整个 `content-creator-toolbox` 文件夹压缩成 `toolbox.zip`
2. **回到阿里云Workbench**，点击顶部的「文件」→「上传文件」，把zip传上去
3. 或者用FinalShell/Xftp等工具上传到 `/opt/projects/` 目录
4. 在服务器里执行：
```bash
mkdir -p /opt/projects
cd /opt/projects
apt update && apt install -y unzip
unzip toolbox.zip -d content-creator-toolbox
cd content-creator-toolbox
```

---

## ⚙️ 第四部分：配置环境变量

```bash
# 1. 复制环境变量配置文件（项目根目录下有 .env.example）
cp .env.example .env

# 2. 确认.env文件存在
ls -la .env
```

看到 `.env` 文件就OK，默认配置已经可以直接使用，不需要修改！

> 💡 **说明**：`.env.example` 是项目自带的模板配置文件，里面包含了后端端口、CORS 等基础配置。对于大多数部署场景，直接复制使用即可，不需要额外修改。

---

## 🚢 第五部分：启动项目！

### 先手动预拉取基础镜像（推荐，避免BuildKit缓存失败问题）
```bash
docker pull python:3.11-slim
docker pull node:20-alpine
docker pull nginx:alpine
```

> 如果 `python:3.11-slim` 拉取失败，换成标准版：
> ```bash
> docker pull python:3.11
> ```
> 然后编辑 `Dockerfile.backend`，把第一行 `FROM python:3.11-slim` 改成 `FROM python:3.11`。

### 清理构建缓存（如果之前构建失败过）
```bash
docker builder prune -a -f
```

### 启动项目
```bash
docker compose up -d --build
```

> ⚠️ 如果提示 `version is obsolete` 警告，**直接忽略**！这是新版Docker Compose不再推荐写version字段，不影响任何功能。

> ⏳ **第一次启动会比较慢，需要5-15分钟**，因为要：
> - 下载基础镜像（如果上面pull过就很快）
> - 安装Python依赖（用清华源）
> - 安装npm依赖（用淘宝源）
> - 构建前端
> - 启动容器
>
> **不要关窗口！让它跑完！**

### 如果构建还是失败，禁用BuildKit兜底
```bash
DOCKER_BUILDKIT=0 docker compose up -d --build
```

### 等待过程中你可以看构建日志（可选）：
如果想看看进度，执行：
```bash
docker compose logs -f
```

按 `Ctrl+C` 可以退出日志查看，不影响服务运行。

---

## ✅ 第六部分：验证是否成功

### 步骤1：查看容器状态
```bash
docker compose ps
```

你应该看到两个容器都是 `Up` 状态：
- `toolbox-backend`
- `toolbox-frontend`

### 步骤2：测试后端是否正常（正确方式）

> ⚠️ **重要：17891端口只在Docker内部网络暴露，没有映射到宿主机！**
> 直接 `curl http://127.0.0.1:17891/health` 会Connection refused，**这是正常的安全设计**。

**正确验证方式：**
```bash
# 方式1：在后端容器内部验证
docker compose exec backend curl http://127.0.0.1:17891/health

# 方式2：通过前端Nginx代理验证（支持/health和/api/health两种路径）
curl http://127.0.0.1:18080/health
curl http://127.0.0.1:18080/api/health
```

返回类似 `{"status":"ok"}` 就说明后端正常！

### 步骤3：在浏览器访问

打开你的本地浏览器（不是服务器里的），输入：
```
http://你的服务器公网IP:18080
```

🎉 **能看到页面标题是"创作工具箱"就说明部署成功了！**

---

## 🔄 第七部分：本地修改代码后，如何同步更新到服务器

> **本章节根据实际部署经验整理，包含完整操作示例和踩坑点。**
>
> 每次你在本地修改代码、`git push` 推送到 GitHub 后，在服务器上按以下步骤更新。

### 完整更新流程（推荐顺序，照着做不会出错）

**步骤1：连接到服务器，进入项目目录**
```bash
cd /opt/projects/content-creator-toolbox
```

确认当前目录正确：
```bash
ls
```
你应该能看到 `docker-compose.yml`、`Dockerfile.backend`、`Dockerfile.frontend`、`web/`、`server/`、`.env.example` 等文件。

**步骤2：检查.env文件是否存在（首次部署或新服务器必做！）**
```bash
ls -la .env
```
- 如果提示 `ls: cannot access '.env': No such file or directory`，需要复制一份：
  ```bash
  cp .env.example .env
  ```
- 如果已经存在，跳过此步。**不要重复复制，否则会覆盖已有配置。**

> ⚠️ **踩坑记录**：如果直接执行 `docker compose up -d --build` 而没有 `.env` 文件，会报错：
> ```
> env file /opt/projects/content-creator-toolbox/.env not found: stat ... no such file or directory
> ```
> 这时候复制 `.env.example` 为 `.env` 即可。

**步骤3（可选但推荐）：预拉取基础镜像，避免构建时网络超时**
```bash
docker pull python:3.11-slim
docker pull node:20-alpine
docker pull nginx:alpine
```
> 如果提示 `Image is up to date` 说明本地已经是最新，跳过即可。
> 如果某个镜像拉取失败，可以多执行几次，或者参考第五部分改用非slim版本。

**步骤4：拉取最新代码**
```bash
git pull
```
看到 `Already up to date.` 说明已经是最新；看到文件变更列表说明拉取成功。

**步骤5：重新构建并启动**
```bash
docker compose up -d --build
```

> ⚠️ 如果提示 `version is obsolete` 警告，**直接忽略**！这是新版 Docker Compose 不再推荐写 version 字段，不影响任何功能。
>
> ⏳ 第一次构建或有依赖变更时会比较慢（1-5分钟），如果只改了业务代码则很快（几十秒）。

**步骤6：验证容器运行状态**
```bash
docker compose ps
```
你应该看到两个容器都是 `Up` 状态：
- `toolbox-backend`
- `toolbox-frontend`

如果某个容器状态不是 `Up`，查看日志排查：
```bash
docker compose logs backend   # 查看后端日志
docker compose logs frontend  # 查看前端日志
```

**步骤7：浏览器验证**

刷新浏览器 `http://你的服务器IP:18080`，按 `Ctrl+F5` 强制刷新清除缓存，确认新功能已生效。

---

### 更新流程速查表（熟悉后用）

```bash
cd /opt/projects/content-creator-toolbox
# 如果提示.env不存在，先执行: cp .env.example .env
git pull
docker compose up -d --build
docker compose ps
```

---

### 常见更新场景

**场景A：只改了前端代码（React/TSX/CSS）**
```bash
cd /opt/projects/content-creator-toolbox
git pull
docker compose up -d --build frontend
```
只重建前端，速度更快。

**场景B：只改了后端代码（Python）**
```bash
cd /opt/projects/content-creator-toolbox
git pull
docker compose up -d --build backend
```

**场景C：修改了 docker-compose.yml 或 Dockerfile**
必须全量重建：
```bash
docker compose up -d --build
```

**场景D：构建出现奇怪缓存问题（比如改了代码但页面没更新）**
```bash
docker builder prune -a -f
docker compose up -d --build
```

---

## 🔧 常用运维命令

### 查看运行日志
```bash
# 查看所有日志
docker compose logs -f

# 只看后端日志
docker compose logs -f backend

# 只看前端日志
docker compose logs -f frontend
```

### 停止服务
```bash
docker compose down
```

### 重启服务
```bash
docker compose restart
```

---

## ❓ 常见问题排查（必看！）

### ❌ 构建时报错 python:3.11-slim / not found / failed to resolve source metadata

**现象**：执行 `docker compose up -d --build` 时，提示 `failed to resolve source metadata for docker.io/library/python:3.11-slim: not found`

**原因**：国内网络无法访问Docker Hub，或镜像加速源失效，BuildKit缓存了失败记录。

**解决方案（按顺序尝试）**：

1. 确认你已经按第二部分步骤2配置了镜像加速器并重启了Docker
2. 清理BuildKit构建缓存：
```bash
docker builder prune -a -f
```
3. 手动预拉取镜像：
```bash
docker pull python:3.11-slim
```
4. 如果slim版拉取失败，改用标准版：
```bash
docker pull python:3.11
```
然后编辑 `Dockerfile.backend`，把 `FROM python:3.11-slim` 改成 `FROM python:3.11`
5. 最后兜底：禁用BuildKit构建
```bash
DOCKER_BUILDKIT=0 docker compose up -d --build
```

---

### ❌ 阿里云镜像仓库报 pull access denied / authorization failed

**现象**：Dockerfile写 `FROM registry.cn-xxx.aliyuncs.com/library/python:3.11` 时提示权限不足

**原因**：该路径不是阿里云公开镜像仓库地址，匿名访问无权限。

**解决方案**：不要修改Dockerfile中的镜像名，保持标准名称（`python:3.11`、`node:20-alpine`、`nginx:alpine`），通过配置 `/etc/docker/daemon.json` 镜像加速器来加速即可。

---

### ❌ curl 127.0.0.1:17891/health 提示 Connection refused

**现象**：执行 `curl http://127.0.0.1:17891/health` 提示连接被拒绝

**原因**：后端容器仅在Docker内部网络暴露17891端口，未映射到宿主机；设计上由前端Nginx容器通过内网反向代理，属于**正常安全设计**，不是bug！

**正确验证方式**：看第六部分步骤2，通过容器内exec或前端18080端口代理验证。

---

### ❌ 访问 /api/health 返回 404 Not Found

**现象**：访问 `http://你的IP:18080/api/health` 返回 `{"detail":"Not Found"}`

**原因**：后端健康检查接口路径是 `/health`（无/api前缀），只有业务接口（/api/parse、/api/download等）带/api前缀。本项目已在Nginx配置中添加了 `/api/health` 转发规则，拉取最新代码重新构建即可修复。

---

### ❌ 浏览器访问超时/连接被拒绝/一直转圈圈

**99%是这个原因：安全组没开18080端口！**

1. 登录阿里云控制台 → 云服务器ECS → 实例
2. 点击你的实例 → 「安全组」→ 「配置规则」→ 「入方向」
3. 点击「手动添加」：
   - 端口范围：`18080/18080`
   - 授权对象：`0.0.0.0/0`
   - 协议：TCP
4. 点击「保存」
5. 等1分钟再刷新浏览器

如果还是不行，检查服务器内部防火墙：
```bash
ufw allow 18080
ufw status
```

---

### ❌ 容器启动了但访问显示502 Bad Gateway

等1-2分钟再刷新！后端服务启动需要时间。如果还不行，看日志：
```bash
docker compose logs backend
```

---

### ❌ 端口被占用（Bind for 0.0.0.0:18080 failed: port is already allocated）

说明18080端口被其他项目占了。编辑 `docker-compose.yml`：
```bash
vi docker-compose.yml
```
找到：
```yaml
ports:
  - "18080:80"
```
把 `18080` 改成其他端口，比如 `18081`。然后：
```bash
docker compose up -d
```

**记得去阿里云安全组开放你改的新端口！**

---

## 📱 小程序对接（可选）

如果你还要用微信小程序：

1. 登录微信公众平台 → 开发 → 开发管理 → 开发设置 → 服务器域名
2. 把 `http://你的服务器IP:18080` 添加到「request合法域名」
3. 修改小程序代码里的 `config.js`：
```js
export default {
  baseUrl: 'http://你的服务器IP:18080',  // 这里是18080，不是17891！
};
```

> 💡 Nginx已经做了反向代理，小程序直接访问18080端口就行，/api请求会自动转发到后端。

---

## 🎉 完成！

至此部署全部完成！

**访问地址：** http://你的服务器IP:18080

**API文档地址：** http://你的服务器IP:18080/docs
