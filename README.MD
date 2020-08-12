# 随心跟打器 (follow-heart-typer)

## 🍄这是什么？

随心跟打器（follow-heart-typer) 是一款基于跨平台桌面应用技术Electron.js开发的跟打器。

跟打器的作用在于提升用户打字速度、准度，也可以作为休闲娱乐活动 :sweat_smile:

## ⛏快速开始

> 暂未发布安装程式，待续

## 🍳开发调试环境

本软件使用yarn作为node.js的包管理器，需提前装好node.js与npm，以下区分操作系统部分在前，通用部分在后

### 1、安装与配置Yarn

-   Windows：使用exe安装自动添加path 或 使用通用方式

-   通用方式：npm全局安装yarn `npm install yarn -g`

    -   配置yarn（仅通用方式）：

        -   设置缓存目录：`yarn config set cache-folder "/path/to/path"`

            >   1.  Windows环境需删除`用户变量`的`PATH`的`C:\Users\用户名\AppData\Roaming\npm` 部分
            >
            >   2.  如果有yarn相关的变量一并删除
            >   3.  `用户变量`的`PATH`后追加`;C:\Users\用户名\AppData\Local\Yarn\Data\global\node_modules\.bin  `

        -   设置淘宝镜像：`yarn config set registry "https://registry.npm.taobao.org"`

### 2、使用Electron国内镜像加速下载

>   在安装过程中，electron 模块会通过 electron-download 为您的平台下载 Electron 的来自Github的预编译二进制文件，需要单独设置下载源以加速

-   Windows：系统变量或用户变量中添加 `ELECTRON_MIRROR` 值为`https://npm.taobao.org/mirrors/electron/`

-   Linux/MacOS：将`export ELECTRON_MIRROR="https://npm.taobao.org/mirrors/electron/"`写在配置环境变量的文件中，这些位置有：

    -   `/etc/profile` （系统全局）
    -   `/etc/profile.d/` 下的shell文件（自定义系统全局）
    -   `~/.bashrc` （当前用户）

    修改之后 `source 修改的文件` 即可。

### 3、启动本项目

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

### 4、开发调试技巧、简单说明

-   项目运行后，会开启调式窗口

-   应用运行期间，可以修改代码，通过在调试窗口执行Ctrl+R以刷新页面（仅支持渲染页面）
-   electron会创建一个主窗口，它的权力是最大的，可以完成很多操作，如创建窗口等
-   其他渲染页面与主窗口使用IPC通信（主窗口执有`ipcMain`，渲染页面执有`ipcRenderer`，分别使用这两个对象进行监听事件）
-   修改窗口级代码，需要重运行项目才生效
-   临时想到这，etc