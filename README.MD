# 随心跟打器 (follow-heart-typer)

## 快速开始

> 暂未发布安装程式，待续

## 开发调试环境

本软件使用yarn作为node.js的包管理器，需提前装好node.js与npm，以下区分操作系统部分在前，通用部分在后

### Windows

以下为两种yarn安装方式：

#### 1、使用npm安装

npm全局安装yarn

```bash
npm install yarn -g
```

#### 2、使用exe安装，选择自动添加到path

### Linux

使用npm安装，与Windows平台一致

### 不区分平台共用部分

设置yarn缓存目录

```bash
yarn config set cache-folder "</path/to/path>"
```

> Windows平台做此步骤需：
>
> 1、删除 `用户变量`的 `PATH`中的 `C:\Users\用户名\AppData\Roaming\npm` 部分
>
> 2、如果 `用户变量` 中有yarn相关的变量也要删除
>
> 3、在`用户变量` 的 `PATH`后追加`;C:\Users\用户名\AppData\Local\Yarn\Data\global\node_modules\.bin  `

设置淘宝镜像

```bash
yarn config set registry "https://registry.npm.taobao.org"
```

克隆本项目

```bash
cd <path-you-want>
git clone https://gitee.com/hellxz/follow-heart-typer.git
```

安装依赖

```bash
cd follow-heart-typer
yarn install
```

启动项目

```bash
yarn start
```
