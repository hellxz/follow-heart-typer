# 随心跟打器 (follow-heart-typer)

## :sparkles:这是什么？

随心跟打器（follow-heart-typer) 是一款基于跨平台桌面应用技术Electron.js开发的跟打器。

跟打器的作用在于提升用户打字速度、准度，也可以作为休闲娱乐活动 :sweat_smile:

目前仅适用于Linux平台，暂未测试其他平台。

## :key:快速开始

目前提供两种形式的程式：`tar.gz` 与 `deb`

如果是APT系的Linux发行版，如 Debian/Ubuntu及其子发行版，请下载 `deb` 格式程序

### 安装方式

deb 格式包

```bash
#使用dpkg包管理器 或 gdebi等安装器安装deb包
sudo dpkg -i follow-heart-typer-*.deb -y
#安装完成可直接使用以下命令 或 应用菜单快捷方式打开
follow-heart-typer
```

tar.gz 格式

```bash
#解压tar.gz
tar zxf follow-heart-typer-*.tar.gz
#进入解压目录
cd follow-heart-typer-linux-x64/
#执行二进制文件
./follow-heart-typer
```

### 使用方式
> 暂停仅对Linux平台进行了支持
#### Linux平台
1. 启动随心跟打器
2. 从QQ群等复制赛文段到文本编辑器
3. 从文本编辑器上复制赛文段
4. 点击载文
5. 鼠标点下跟打区（跟打器下半部分红框区）
6. 输入文字开始跟打
7. 跟打完成成绩自动复制到剪粘板，粘贴发送即可

> 注意：第3步在某些环境中是可以省略，作者使用docker版本的QQ，容器剪贴板和系统剪贴板不大一样，需要先贴到跟打器能识别的文本上才可以，使用者请自行测试

## :egg:开发调试环境

本软件使用yarn作为node.js的包管理器，需提前装好node.js与npm，以下区分操作系统部分在前，通用部分在后

### 1、安装Yarn

-   Windows：使用exe安装自动添加path 或 使用通用方式

-   通用方式：npm全局安装yarn `npm install yarn -g`

    

    

### 2、配置Yarn

-   设置缓存目录：

    ```bash
    yarn config set cache-folder "/path/to/path"
    ```

    >   1.  Windows环境需删除`用户变量`的`PATH`的`C:\Users\用户名\AppData\Roaming\npm` 部分
    >
    >   2.  如果有yarn相关的变量一并删除
    >   3.  `用户变量`的`PATH`后追加`;C:\Users\用户名\AppData\Local\Yarn\Data\global\node_modules\.bin  `

-   设置淘宝镜像：

    ```bash
    yarn config set registry "https://registry.npm.taobao.org"
    ```

### 3、使用Electron国内镜像加速下载

>   在安装过程中，electron 模块会通过 electron-download 为您的平台下载 Electron 的来自Github的预编译二进制文件，需要单独设置下载源以加速

-   Windows：系统变量或用户变量中添加 `ELECTRON_MIRROR` 值为`https://npm.taobao.org/mirrors/electron/`

-   Linux/MacOS：将`export ELECTRON_MIRROR="https://npm.taobao.org/mirrors/electron/"`写在配置环境变量的文件中，这些位置有：

    -   `/etc/profile` （系统全局）
    -   `/etc/profile.d/` 下的shell文件（自定义系统全局）
    -   `~/.bashrc` （当前用户）

    修改之后 `source 修改的文件` 即可。

### 4、启动本项目

项目克隆到本地

```bash
git clone https://gitee.com/hellxz/follow-heart-typer.git
cd follow-heart-typer
```

安装node依赖

```bash
yarn install
```

启动项目

```bash
yarn start
```

### 5、开发调试技巧、简单说明

-   项目运行后，会开启调式窗口
-   应用运行期间，可以修改代码，通过在调试窗口执行Ctrl+R以刷新页面（仅支持渲染页面）
-   electron会创建一个主窗口，它的权力是最大的，可以完成很多操作，如创建窗口等
-   其他渲染页面与主窗口使用IPC通信（主窗口执有`ipcMain`，渲染页面执有`ipcRenderer`，分别使用这两个对象进行监听事件）
-   修改窗口级代码，需要重运行项目才生效
-   暂时未提供打包的配置（无CI无配置平台）
-   临时想到这，etc

### 6、构建打包

随心跟打器使用 electron-forge 进行构建与打包，可以分开解释

#### 构建二进制

```bash
yarn package
```

>   自动根据平台进行打包，其他平台用户可以尝试

#### 打成 deb 包

```bash
yarn make
```

>   环境需要在 Debian/Ubuntu及子发行版下构建

