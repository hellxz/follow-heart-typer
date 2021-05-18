const { app, ipcRenderer, remote } = require('electron')
const os = require('os')
const HellxzUtil = require('./js/util')
const { clipboard } = require('electron')
window.$ = window.jQuery = require('jquery');

/* 当前跟打文章数据 */
//当前文章内容
let currentArticle = ''
//当前文章Map
let currentArticleMap = new Map();
//当前文章分页总数
let currentPagingSum = 0
//当前文章发文页数
let currentTypingPage = 0
//当前对照区最多可发的字数(span数)
let maxSpanSumPerScreen = 0


/* 跟打状态 */
//当前已打
let currentTypeCount = 0
//是否自动发送成绩
let sendTypeResultAutomic = false
//中文输入状态
let chineseInput = false
//定时器间隔：ms
let timerInterval = 500
//成绩定时器
let scoreTimer = 0



/* 当前成绩 */
//速度：瞬时速度，单位 字/min
let speed = 0
//击键：每秒击键数
let typeCountPerSecond = 0
//码长：打每个字平均击键数
let typeLong = 0
//键准：未知
let typeAccuracy = 0
//错字数
var typeFalseCount = 0
//回改数
let backModifyCount = 0
//输入键数
let inputKeyCount = 0
//开始时间
let startTime = 0
//持续时间
let duration = 0
//上次计算duration的时间
let lastTimekeeping = 0
//暂停状态
let pauseState = false
//暂停次数
let pauseTimes = 0
//发送成绩前缀
let scoreStrPrefix = ''
//跟打状态:0-非完成状态，1-完成
let gendaStatus = 0


/* 历史记录数据 */
//本日打字数，需查记录文件或数据库
let typeTodaySum = 0
//历史打字总数，需查记录文件或数据库
let typeHistorySum = 0

/* 调试 */
let debug = true

//初始化
ipcRenderer.on('main-window-ready', () => {
    addDefaultDuiZhaoDiv()
})

//窗口焦点消失
ipcRenderer.on('window-blur', () => {
    pauseGenda()
})

ipcRenderer.on('chongda', () => {
    debugLoging("重打事件触发")
    //首页上屏
    renderedPage2Screen(1)
    //清理成绩和进度条
    clearScoreAndProgress()
    //清理跟打区记录,设置可读写
    clearGenda()
})

ipcRenderer.on('zaiwen', () => {
    debugLoging("载文事件触发")
    loadArticleFromClipboard()
})

ipcRenderer.on('fawen', () => {
    debugLoging("发文事件触发")
    sendArticleFromSqlLite()
})

ipcRenderer.on('window-resize', () => {
    debugLoging("改变窗口size事件触发")
    let defaultDiv = document.getElementById("default-duizhao-words")
    if(defaultDiv === null){
        if(currentArticle === ''){
            addDefaultDuiZhaoDiv()
        }else{
            //重新计算分页，首页上屏
            pagingAndRenderedFirstPage2Screen()
        }
    }
})

$(function(){

    /**
     * 以下三个事件作为互锁控制中文输入状态，减少中文输入中状态值取到字母的问题。
     * 经测试，不同平台上事件触发不同
     * - Windows平台上可正常触发compositionstart与compositionend事件，如不加中文输入状态控制，input事件也会被触发
     * - Linux平台输入法都是挂靠在输入引擎上的，所以只能得到input事件（中文输入状态的标识会失效）
     * - Mac平台未测
     */
    $('#genda').on('compositionstart', (e) => {
        chineseInput = true
        debugLoging("正在打中文，还没打完呢！")
    })

    $('#genda').on('input', (e) => {
        if(! chineseInput){
            debugLoging("在打英文")
            //刚开始跟打时，启动成绩计算定时器
            openScoreTimerIfAbsent()
            refreshTypeStatus()
        }
    })

    $('#genda').on('keyup', (e) => {
        debugLoging("按键抬起")
        //更新回改数
        updateBackModifyCount(e.keyCode)
        //更新输入键数
        updateInputKeyCount(e.keyCode)
    })

    $('#genda').on('compositionend', (e) => {
        debugLoging("打完中文了")
        //刚开始跟打时，启动成绩计算定时器
        openScoreTimerIfAbsent()
        refreshTypeStatus()
        chineseInput = false
    })

    $('#copy-score').on('click', (e) => {
        if(gendaStatus === 1){
            sendCompleteToClipboard()
        }
    })

    $('#reset-default-screen').on('click', (e) => {
        //清理成绩和进度条
        clearScoreAndProgress()
        //清理跟打区记录,设置可读写
        clearGenda()
        addDefaultDuiZhaoDiv()
    })

})

//添加默认对照区提示
const addDefaultDuiZhaoDiv = () => {
    $('#duizhaoqu-div')[0].innerHTML = '<span id="default-duizhao-words">欢迎使用随心跟打器，祝您跟打愉快！发文请按F6，载文请按F4，重打请按F3，调试请按F12</span>'
}

/**
 * 剪贴板载文上屏
 */
const loadArticleFromClipboard = () => {
    debugLoging('载文方法触发')
    //载文时重置发文前缀字符串
    scoreStrPrefix = ''
    //处理赛文段
    currentArticle = contestArticleHandle(clipboard.readText('selection'))
    pagingAndRenderedFirstPage2Screen()
}

/**
 * 向剪贴板复制成绩
 */
const sendCompleteToClipboard = () => {
    debugLoging('向剪贴板复制成绩')
    let score = "速度" + speed
                + " 击键" + typeCountPerSecond
                + " 码长" + typeLong
                + " 字数" + currentArticle.length
                + " 回改" + backModifyCount
                + " 错字" + typeFalseCount
                + " 键数" + inputKeyCount
    if(scoreStrPrefix != ''){
        clipboard.writeText(scoreStrPrefix+' '+score)
    }
    else{
        clipboard.writeText(score)
    }
}

/**
 * 数据库中选择文章，自动发文
 */
const sendArticleFromSqlLite = () => {
    //TODO 数据库读取文章，将赋值给currentArticle渲染上屏
    // ipcRenderer.send('read-article-from-sqllite') //示例，后续可能会通过子容器传递
    currentArticle = '听见你说：朝阳起又落，晴雨难测，道路是脚步多，我已习惯，你突然间的自我，挥挥洒洒，将自然看通透~那就不要留时光一过不再有，你远眺的天空，挂更多的彩虹，我会轻轻地，将你豪情放在心头，在寒冬时候，就回忆你温柔。听见你说：朝阳起又落，晴雨难测，道路是脚步多，我已习惯，你突然间的自我，挥挥洒洒，将自然看通透~那就不要留时光一过不再有，你远眺的天空，挂更多的彩虹，我会轻轻地，将你豪情放在心头，在寒冬时候，就回忆你温柔。听见你说：朝阳起又落，晴雨难测，道路是脚步多，我已习惯，你突然间的自我，挥挥洒洒，将自然看通透~那就不要留时光一过不再有，你远眺的天空，挂更多的彩虹，我会轻轻地，将你豪情放在心头，在寒冬时候，就回忆你温柔。'
    pagingAndRenderedFirstPage2Screen()
}

/**
 * QQ群载文上屏
 */
const loadArticleFromQQgroup = () => {
    //TODO c语言类库读取操作系统参数完成功能
    currentArticle = fromQQGroup()
    //TODO 未对群载文进行语法分析
    pagingAndRenderedFirstPage2Screen()
}

/**
 * 分页文章并首页文字上屏
 * 
 * TODO: 问题：为什么理论div宽度允许放下整好宽度的div，却会换行？ 
 *       示例：div宽320px，span宽32px，按理讲可放10个第一行，但是假如第9个span是个符号的（也是32px宽），第十列会换行！
 */
const pagingAndRenderedFirstPage2Screen = () => {
    //读取文字div长宽
    let duizhaoDiv = $("#duizhaoqu-div")
    let divWidth = parseInt(duizhaoDiv.width())
    let divHeight = parseInt(duizhaoDiv.height())
    let spanSize = computeDivChildrenSpanSize('duizhaoqu-div')
    //计算对照区最多可装多少span，不考虑余数（只少不能多）
    let horizontalSpanCount = parseInt(divWidth / spanSize.width)
    let verticalSpanCount = parseInt(divHeight / spanSize.height)
    maxSpanSumPerScreen = horizontalSpanCount * verticalSpanCount //Mark:临时方案，每屏减5个span，为测试先不加
    debugLoging("当前div最多放"+ maxSpanSumPerScreen + "个span")

    //载文分页
    currentArticleMap = new Map()
    
    let articleArray = currentArticle.split('')

    let sectionCount = articleArray.length / maxSpanSumPerScreen

    if((tempCount = parseInt(sectionCount)) < sectionCount) {
        sectionCount = tempCount + 1
    }

    currentPagingSum = sectionCount
    currentTypingPage = 1

    let tempArray
    for(i=0; i<sectionCount; i++){
        //每次删除一段数量，使用返回被删部分数组保存map
        tempArray = articleArray.splice(0, maxSpanSumPerScreen)
        currentArticleMap.set(i+1, tempArray)
    }

    //首页上屏
    renderedPage2Screen(1)
    //清理成绩和进度条
    clearScoreAndProgress()
    //清理跟打区并开启可输入状态
    clearGenda()
}

/**
 * 渲染文章段，移除默认提示，载文上屏
 * @param nextPage 待上屏的页码，从1开始
 */
const renderedPage2Screen = (nextPage) => {
    let nextPageArray = currentArticleMap.get(nextPage)
    let spanHTML = ''
    for (var i in nextPageArray) {
        spanHTML += '<span class="type-none">' + nextPageArray[i] + '</span>'
    }
    $('#default-duizhao-words').remove();
    $("#duizhaoqu-div").html(spanHTML)
}

/**
 * 清理跟打区,设置可写状态
 */
const clearGenda = () => {
    $("#genda").empty()
    $("#genda").attr('contenteditable', true)
}

/**
 * 更新跟打判定
 */
const refreshTypeStatus = () => {
    debugLoging('更新判定执行')
    let defaultDiv = document.getElementById("default-duizhao-words")
    if(defaultDiv !== null){
        clearGenda()
        remote.dialog.showErrorBox('错误提示','请先载文或发文再进行跟打');
        return false
    }

    //设置起始时间
    if(startTime === 0){
        startTime = new Date().getTime()
    }
    
    let articleArray = currentArticleMap.get(currentTypingPage)
    let typeContent = document.getElementById("genda").innerText
    let spans = $('#duizhaoqu-div').children()

    for(let i in articleArray){
        let span = spans[i]
        //确定当前对照区与跟打区对应的比对区间
        let gendaInputLength = 0
        if(currentTypingPage == 1){
            gendaInputLength = typeContent.length //首段
        }
        else{
            //非首段，应使用输入长度减去已翻页的部分
            gendaInputLength = typeContent.length - (currentTypingPage -1) * maxSpanSumPerScreen
        }
        //判定着色
        if(i < gendaInputLength) { //只判定当前新输入部分（忽略上n段与当前段没打的部分）
            //首段与非首段打对   TIPS:——>for in循环的下标i是字符串，另外首段后边的乘式为0，不影响结果
            let inputIndex = parseInt(i) + (currentTypingPage -1) * maxSpanSumPerScreen
            
            let duizhao = articleArray[i]
            let input = typeContent[inputIndex]

            //对特殊空格进行判断，只要对照与跟打输入的都是空格，即认定为相同
            let scene1 = duizhao.charCodeAt(0) === 160 && input.charCodeAt(0) === 32
            let scene2 = duizhao.charCodeAt(0) === 32 && input.charCodeAt(0) === 160

            //对照区与跟打区相等，判对直接跳过循环
            if(duizhao === input || scene1 || scene2){
                $(span).removeClass()
                $(span).addClass('type-true')
                continue
            }
            
            //判错，只对非错误标识的文字进行变色
            if($(span).attr('class') !== 'type-false'){
                $(span).removeClass()
                $(span).addClass('type-false')
                debugLoging('有打错的哦~')
            }
        }
        //移除未跟打span着色(回改)
        else if($(span).attr('class') !== 'type-none'){
            $(span).removeClass()
            $(span).addClass('type-none')
        }
    }

    // 检查是否需要翻页
    checkIfLastOrTurn2NextPage()
}

/**
 * 检测到达页尾及翻页实现
 */
const checkIfLastOrTurn2NextPage = () =>{
    //未打完跳过
    if($("#duizhaoqu-div .type-none").length !== 0){
        return false
    }

    //判定是否有下一页，有则跳转下一页，无则限制跟打区输入
    let nextPage = currentTypingPage + 1
    if(nextPage <= currentPagingSum){
        //TODO 添加记录本页成绩功能
        typeFalseCount += $('#duizhaoqu-div .type-false').length

        renderedPage2Screen(nextPage)
        currentTypingPage = nextPage
    }
    else{
        //打字完成，限制跟打区输入
        $("#genda").attr('contenteditable', false)
        //停止定时器，结算最终成绩存文件或存库
        removeScoreTimer()
        $($('#genda-status')[0]).text('跟打完成')
        $($('#genda-status')[0]).removeClass('btn-outline-secondary')
        $($('#genda-status')[0]).addClass('btn-outline-success')
        $($('#copy-score')[0]).addClass('active')
        gendaStatus = 1
        //TODO 存库上屏
        // currentTypeCount +=  $('#duizhaoqu-div').children().length
        inputKeyCount += 1 //击键数在停止时会漏1次
        calculateAndRenderScore2Screen()
        typeFalseCount = $("#type-false")[0].innerText
        //复制成绩到剪贴板
        sendCompleteToClipboard()
    }
}

/**
 * 计算指定div下的span的offsetHeight与offsetWidth
 * @param divId div的id
 */
const computeDivChildrenSpanSize = (divId) => {
    let result = {}
    let testWord = '我'
    let span = document.createElement("span")
    span.id = 'testFontSizeSpan'
    span.style.visibility = "hidden";
    let element = document.getElementById(divId)
    span.style.fontSize = window.getComputedStyle(element).fontSize
    span.style.fontFamily = window.getComputedStyle(element).fontFamily
    element.appendChild(span)
    if(typeof span.textContent != "undefined"){
        span.textContent = testWord;
    }else{
        span.innerText = testWord;
    }
    result.width = span.offsetWidth
    result.height = span.offsetHeight
    span.remove()
    return result
}

/**
 * 更新回改数
 * @param keyCode 按键Ascii编码
 */
const updateBackModifyCount = (keyCode) => {
    if(keyCode === 8){ //退格键
        backModifyCount += 1
        debugLoging("当前回改数为" + backModifyCount)
    }
}

/**
 * 记录成绩并上屏
 */
const calculateAndRenderScore2Screen = () =>{
    debugLoging('停一小会儿，掏小本本记成绩~当前定时器id:'+scoreTimer)
    //记录当前成绩
    //记录开始时间
    //记录击键数：Linux可能会有点误差
    $("#type-count")[0].innerText = inputKeyCount
    //更新错误数/回改数(退格键数)
    $("#type-false")[0].innerText = typeFalseCount + $('#duizhaoqu-div .type-false').length
    //更新回改
    $("#type-back")[0].innerText = backModifyCount
    //更新已打，前几页已打全部 + 上屏数
    currentTypeCount = (currentTypingPage -1) * maxSpanSumPerScreen + ($('#duizhaoqu-div').children().length - $('#duizhaoqu-div .type-none').length)
    $("#typed-words")[0].innerText = currentTypeCount
    //计算跟打持续时间
    let currentTime = new Date().getTime()
    if(pauseTimes === 0){
        duration = currentTime - startTime
        debugLoging("--------无暂停记录，duration=" + duration)
    }
    else {
        //lastTimekeeping为上一次计算duration的时间，暂停后的恢复由恢复操作重新赋值
        duration += currentTime - lastTimekeeping
        // duration += timerInterval
        debugLoging("--------有暂停记录，duration=" + duration)
    }
    debugLoging("startTime:" + startTime + " 当前时间：" + currentTime + " duration:" + duration + " lastTimekeeping:" + lastTimekeeping)
    lastTimekeeping = currentTime

    //计算速度并上屏，速度 = 已打字数 / 打字时间（分）
    speed = HellxzUtil.numToFixed(currentTypeCount / HellxzUtil.timestampToMinutes(duration))
    $("#type-speed")[0].innerText = speed
    
    //计算击键并上屏，总击键数 / 打字时间（秒）
    typeCountPerSecond =  HellxzUtil.numToFixed(inputKeyCount / HellxzUtil.timestampToSeconds(duration))
    $("#type-per-seconds")[0].innerText = typeCountPerSecond
    
    //计算码长并上屏，总按键数 / 已打字数
    typeLong = HellxzUtil.numToFixed(inputKeyCount / currentTypeCount)
    $("#type-long")[0].innerText = typeLong

    //更新进度条
    $(".progress-bar").css("width", currentTypeCount / currentArticle.length * 100 + "%")
    
}

/**
 * 清理记分与进度条，恢复跟打开始前状态
 */
const clearScoreAndProgress = () =>{
    //重置计时器、成绩
    removeScoreTimer()
    //重置发文段、清空跟打区
    speed = 0
    typeCountPerSecond = 0
    typeLong = 0
    currentTypingPage = 1
    inputKeyCount = 0
    typeFalseCount = 0
    currentTypeCount = 0
    backModifyCount = 0

    pauseTimes = 0
    pauseState = false
    lastTimekeeping = 0
    startTime = 0
    duration = 0
    gendaStatus = 0

    //上屏
    $("#type-speed")[0].innerText = speed
    $("#type-per-seconds")[0].innerText = typeCountPerSecond
    $("#type-long")[0].innerText = typeLong
    $("#type-count")[0].innerText = inputKeyCount
    $("#type-false")[0].innerText = typeFalseCount
    $("#type-back")[0].innerText = backModifyCount
    $("#typed-words")[0].innerText = currentTypeCount
    $(".progress-bar").css("width", "0%")
    $($('#genda-status')[0]).text('暂未跟打')
    $($('#genda-status')[0]).removeClass('btn-outline-danger')
    $($('#genda-status')[0]).removeClass('btn-outline-success')
    $($('#genda-status')[0]).addClass('btn-outline-secondary')
    $($('#copy-score')[0]).removeClass('active')
}

/**
 * 暂停跟打
 * 步骤：
 * 1、结束成绩上屏定时器
 * 2、设置暂停状态
 * 3、设置暂停次数
 */
const pauseGenda = () =>{
    debugLoging("暂停跟打~我累了")
    if(gendaStatus === 0){
        $($('#genda-status')[0]).text('跟打暂停')
        $($('#genda-status')[0]).removeClass('btn-outline-secondary')
        $($('#genda-status')[0]).addClass('btn-outline-danger')
    }
    removeScoreTimer()
    pauseState = true
    pauseTimes += 1
}

/**
 * 首次跟打或继续跟打开启定时器
 */
const openScoreTimerIfAbsent = () => {
    if(scoreTimer === 0){
        $($('#genda-status')[0]).text('正在跟打')
        //恢复跟打
        if(pauseState){
            lastTimekeeping = new Date().getTime()
            pauseState = false
            $($('#genda-status')[0]).removeClass('btn-outline-danger')
            $($('#genda-status')[0]).addClass('btn-outline-secondary')
        }
        scoreTimer = window.setInterval(calculateAndRenderScore2Screen, timerInterval)
        debugLoging("创建新的定时器，id:" + scoreTimer)
    }
}

/**
 * 当跟打结束或暂停跟打时，使用此方法去除定时器
 */
const removeScoreTimer = () =>{
    if(scoreTimer !== 0){
        window.clearInterval(scoreTimer)
        scoreTimer = 0
    }
}

/**
 * 更新输入键数
 */
const updateInputKeyCount = (keyCode) =>{
    //排除F1~F12计算键数
    if(keyCode < 112 || keyCode > 123){
        inputKeyCount += 1
    }
}

/**
 * debug日志输出，关闭debug时不再输出日志内容
 * @param 消息串 msg 
 */
const debugLoging = (msg) =>{
    if(debug){
        console.log(msg)
    }
}

/**
 * 处理赛文段，移除首尾无须跟打部分内容，去除换行符、空格等字符，记录段号
 * @param contestArticle 未处理的赛文段
 */
const contestArticleHandle = (contestArticle) =>{
    //换行符
    if(contestArticle.indexOf('\n') != -1){
        if(contestArticle.indexOf("赛文") != -1 || contestArticle.indexOf("联赛") != -1){
            //移除赛文头部无用信息
            contestArticle = contestArticle.slice(contestArticle.indexOf('\n')+1)
            //记录赛文段号，发成绩时使用
            let prefixIndex = contestArticle.search(/第\d{3}段/)
            scoreStrPrefix = contestArticle.slice(prefixIndex, prefixIndex+5)
            //移除赛文段号标识，无需跟打此部分
            contestArticle = contestArticle.slice(0, contestArticle.lastIndexOf('\n'))
        }
        contestArticle = contestArticle.replace('\n','')
    }
    contestArticle = contestArticle.replace(' ','')
    debugLoging(contestArticle)
    return contestArticle
}