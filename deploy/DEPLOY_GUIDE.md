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
- **后端内部端口**：`17891`（Docker内部用，不用对外开放）

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
3. 顶部【所有者】点【更改】→ 输入你的Windows用户名（比如`你的用户名`）→ 点「检查名称」→ 确定，把所有者改成你自己
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

## 🔧 第二部分：安装Docker

成功连接到服务器后（看到黑色命令行界面，前面有 `root@xxx:~#` 这样的提示符），开始安装Docker：

### 步骤1：安装Docker（一条命令搞定）

**复制下面整条命令，粘贴到服务器里按回车：**
```bash
curl -fsSL https://get.docker.com | bash -s docker --mirror Aliyun
```

> ⏳ 等它跑完，可能需要1-3分钟，看到 "Thank you for installing Docker!" 就成功了。

### 步骤2：启动Docker并设置开机自启
```bash
systemctl start docker
systemctl enable docker
```

### 步骤3：验证安装成功
```bash
docker -v
```

看到类似 `Docker version 27.x.x` 就说明安装成功了！

---

## 📁 第三部分：上传代码到服务器

### 方式A：用Git拉取（推荐，最简单）

如果你的代码已经推送到Gitee/GitHub：

```bash
# 1. 安装git（如果没装）
apt update && apt install -y git

# 2. 进入opt目录
cd /opt

# 3. 克隆代码（换成你自己的仓库地址！）
# 比如：git clone https://gitee.com/你的用户名/content-creator-toolbox.git toolbox
# 也可以直接用我的：
# git clone https://github.com/Chenwenwen1007/content-creator-toolbox.git content-creator-toolbox
git clone 你的仓库地址 content-creator-toolbox

# 4. 进入项目目录
cd toolbox
```

### 方式B：在本地打包上传（不用Git的方法）

1. 在你Windows电脑上，把整个 `content-creator-toolbox` 文件夹压缩成 `toolbox.zip`
2. **回到阿里云Workbench**，点击顶部的「文件」→「上传文件」，把zip传上去
3. 或者用FinalShell/Xftp等工具上传到 `/opt/` 目录
4. 在服务器里执行：
```bash
cd /opt
apt update && apt install -y unzip
unzip toolbox.zip -d toolbox
cd toolbox
```

> ⚠️ **重要检查：** 输入 `ls` 命令，能看到 `docker-compose.yml`、`Dockerfile.backend` 这些文件就对了！

---

## ⚙️ 第四部分：配置环境变量

```bash
# 1. 复制生产环境配置文件
cp .env.production.example .env

# 2. 确认.env文件存在
ls -la .env
```

看到 `.env` 文件就OK，默认配置已经可以用了，不需要改！

---

## 🚢 第五部分：启动项目！

### 一条命令启动：
```bash
docker compose up -d --build
```

如果提示 `docker: 'compose' is not a docker command`，先安装compose插件：
```bash
apt install -y docker-compose-plugin
```
然后再执行上面的启动命令。

> ⏳ **第一次启动会比较慢，需要5-15分钟**，因为要：
> - 下载Python镜像
> - 下载Node.js镜像
> - 下载Nginx镜像
> - 安装Python依赖（用清华源）
> - 安装npm依赖（用淘宝源）
> - 构建前端
> - 启动容器
>
> **不要关窗口！让它跑完！**

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

### 步骤2：测试后端是否正常
```bash
curl http://127.0.0.1:17891/health
```

返回类似 `{"status":"ok"}` 就说明后端正常！

### 步骤3：在浏览器访问

打开你的本地浏览器（不是服务器里的），输入：
```
http://你的服务器公网IP:18080
```

🎉 **能看到页面就说明部署成功了！**

> 如果访问超时，**99%是安全组端口没开！** 看下面的常见问题第一条。

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

### 更新代码后重新部署
```bash
# 1. 进入项目目录
cd /opt/toolbox

# 2. 拉取最新代码（如果用git）
git pull

# 3. 重新构建并启动
docker compose up -d --build
```

---

## ❓ 常见问题排查

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
# Ubuntu系统
ufw allow 18080
ufw status
```

### ❌ 容器启动了但访问显示502 Bad Gateway

等1-2分钟再刷新！后端服务启动需要时间。如果还不行，看日志：
```bash
docker compose logs backend
```

### ❌ 构建过程中报错网络超时/TLS handshake timeout

国内网络问题，按 `Ctrl+C` 取消，重新执行构建命令：
```bash
docker compose up -d --build
```

多试几次就好。

### ❌ 端口被占用（Bind for 0.0.0.0:18080 failed: port is already allocated）

说明18080端口被你同事的其他项目占了。编辑 `docker-compose.yml`：
```bash
# 编辑配置文件
vi docker-compose.yml
```
找到：
```yaml
ports:
  - "18080:80"
```
把 `18080` 改成其他端口，比如 `18081`。然后：
```bash
# 重启
docker compose up -d
```

**记得去阿里云安全组开放你改的新端口！**

> vi不会用？最简单方法：把 `docker-compose.yml` 下载到本地，用记事本改完再上传覆盖。

### ❌ docker compose 命令找不到

执行：
```bash
apt update && apt install -y docker-compose-plugin
```

如果还是不行，用旧版命令：
```bash
docker-compose up -d --build
```

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
