const { app, ipcRenderer, remote, shell } = require('electron')
const os = require('os')
window.$ = window.jQuery = require('jquery');

/* 当前跟打文章数据 */
//当前文章内容
let currentArticle = ''
//当前文章总字数
let currentArticleWordsCount = 0

//当前文章Map
let currentArticleMap = new Map();
//当前文章分段总数
let currentSectionSum = 0
//当前文章发文段数
let currentSendingSection = 0
//当前对照区最多可发的字数(span数)
let maxSpanSumPerScreen = 0


/* 跟打状态 */
//当前跟打状态
let isTyping = false
//停打
let stopTyping = false
//当前已打
let currentTypeCount = 0
//发文状态：自动/手动下一段 TODO
let sendArticleAutomic = true
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
let keyLong = 0
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
//暂停状态
let pauseState = false
//暂停次数
let pauseTimes = 0

/* 历史记录数据 */
//本日打字数，需查记录文件或数据库
let typeTodaySum = 0
//历史打字总数，需查记录文件或数据库
let typeHistorySum = 0

//初始化
ipcRenderer.on('main-window-ready', () => {
    addDefaultDuiZhaoDiv()
})

//窗口焦点消失
ipcRenderer.on('window-blur', () => {
    removeScoreTimer(scoreTimer)
})

ipcRenderer.on('chongda', () => {
    console.log("重打事件触发")
    //TODO 重置计时器、成绩
    startTime = 0
    removeScoreTimer(scoreTimer)
    //重置发文段、清空跟打区
    currentSendingSection = 1
    inputKeyCount = 0
    typeFalseCount = 0
    currentTypeCount = 0
    $(".progress-bar").css("width", "0%")
    clearGenda()
    putScoreOnScreen()
    subsectionArticlePutFirstSectionOnScreen()
})

ipcRenderer.on('zaiwen', () => {
    console.log("载文事件触发")
    loadArticleFromClipboard()
})

ipcRenderer.on('fawen', () => {
    console.log("发文事件触发")
    sendArticleFromSqlLite()
})

ipcRenderer.on('window-resize', () => {
    console.log("改变窗口size事件触发")
    let defaultDiv = document.getElementById("default-duizhao-words")
    if(defaultDiv === null){
        if(currentArticle === ''){
            addDefaultDuiZhaoDiv()
        }else{
            subsectionArticlePutFirstSectionOnScreen()
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
        console.log("正在打中文，还没打完呢！")
    })

    $('#genda').on('input', (e) => {
        if(! chineseInput){
            console.log("在打英文")
            refreshTypeStatus()
            //刚开始跟打时，启动成绩计算定时器
            openScoreTimerIfStartNow()
        }
    })

    $('#genda').on('keyup', (e) => {
        console.log("按键抬起")
        //更新回改数
        updateBackModifyCount(e.keyCode)
        //更新输入键数
        updateInputKeyCount()
    })

    $('#genda').on('compositionend', (e) => {
        console.log("打完中文了")
        refreshTypeStatus()
        chineseInput = false
        //刚开始跟打时，启动成绩计算定时器
        openScoreTimerIfStartNow()
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
    console.log('载文方法触发')
    const { clipboard } = require('electron')
    currentArticle = clipboard.readText('selection')
    subsectionArticlePutFirstSectionOnScreen()
}

/**
 * 数据库中选择文章，自动发文
 */
const sendArticleFromSqlLite = () => {
    //TODO 数据库读取文章，将赋值给currentArticle渲染上屏
    // ipcRenderer.send('read-article-from-sqllite') //示例，后续可能会通过子容器传递
    currentArticle = '听见你说：朝阳起又落，晴雨难测，道路是脚步多，我已习惯，你突然间的自我，挥挥洒洒，将自然看通透~那就不要留时光一过不再有，你远眺的天空，挂更多的彩虹，我会轻轻地，将你豪情放在心头，在寒冬时候，就回忆你温柔。听见你说：朝阳起又落，晴雨难测，道路是脚步多，我已习惯，你突然间的自我，挥挥洒洒，将自然看通透~那就不要留时光一过不再有，你远眺的天空，挂更多的彩虹，我会轻轻地，将你豪情放在心头，在寒冬时候，就回忆你温柔。听见你说：朝阳起又落，晴雨难测，道路是脚步多，我已习惯，你突然间的自我，挥挥洒洒，将自然看通透~那就不要留时光一过不再有，你远眺的天空，挂更多的彩虹，我会轻轻地，将你豪情放在心头，在寒冬时候，就回忆你温柔。'
    subsectionArticlePutFirstSectionOnScreen()
}

/**
 * QQ群载文上屏
 */
const loadArticleFromQQgroup = () => {
    //TODO c语言类库读取操作系统参数完成功能
    currentArticle = fromQQGroup()
    subsectionArticlePutFirstSectionOnScreen()
}

/**
 * 分段文章并上屏首段
 * 
 * TODO: 问题：为什么理论div宽度允许放下整好宽度的div，却会换行？ 
 *       示例：div宽320px，span宽32px，按理讲可放10个第一行，但是假如第9个span是个符号的（也是32px宽），第十列会换行！
 */
const subsectionArticlePutFirstSectionOnScreen = () => {
    //读取文字div长宽
    let duizhaoDiv = $("#duizhaoqu-div")
    let divWidth = parseInt(duizhaoDiv.width())
    let divHeight = parseInt(duizhaoDiv.height())
    let spanSize = computeSpanWhitchUnderDivSize('duizhaoqu-div')
    //计算对照区最多可装多少span，不考虑余数（只少不能多）
    let horizontalSpanCount = parseInt(divWidth / spanSize.width)
    let verticalSpanCount = parseInt(divHeight / spanSize.height)
    maxSpanSumPerScreen = horizontalSpanCount * verticalSpanCount //Mark:临时方案，每屏减5个span，为测试先不加
    console.log("当前div最多放"+ maxSpanSumPerScreen + "个span")

    //载文分段
    currentArticleMap = new Map()
    
    let articleArray = currentArticle.split('')

    let sectionCount = articleArray.length / maxSpanSumPerScreen

    if((tempCount = parseInt(sectionCount)) < sectionCount) {
        sectionCount = tempCount + 1
    }

    currentSectionSum = sectionCount
    currentSendingSection = 1

    let tempArray
    for(i=0; i<sectionCount; i++){
        //每次删除一段数量，使用返回被删部分数组保存map
        tempArray = articleArray.splice(0, maxSpanSumPerScreen)
        currentArticleMap.set(i+1, tempArray)
    }

    //上屏前清理当前屏幕上的历史映像，开启可输入状态
    putSectionOnScreen(1)
    clearGenda()
    $("#genda").attr('contenteditable', true)
}

/**
 * 渲染文章段，移除默认提示，载文上屏
 * @param {待上屏的段号} nextSection 
 */
const putSectionOnScreen = (nextSection) => {
    let nextSectionArray = currentArticleMap.get(nextSection)
    let spanHTML = ''
    for (var i in nextSectionArray) {
        spanHTML += '<span class="type-none">' + nextSectionArray[i] + '</span>'
    }
    $('#default-duizhao-words').remove();
    $("#duizhaoqu-div").html(spanHTML)
}

const clearGenda = () => {
    $("#genda").empty()
}

/**
 * 更新跟打判定
 */
const refreshTypeStatus = () => {
    console.log('更新判定执行')
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
    
    let articleArray = currentArticleMap.get(currentSendingSection)
    let typeContent = document.getElementById("genda").innerText
    let spans = $('#duizhaoqu-div').children()

    for(let i in articleArray){
        let span = spans[i]
        //确定当前对照区与跟打区对应的比对区间
        let gendaInputLength = 0
        if(currentSendingSection == 1){
            gendaInputLength = typeContent.length //首段
        }
        else{
            //非首段，应使用输入长度减去已翻页的部分
            gendaInputLength = typeContent.length - (currentSendingSection -1) * maxSpanSumPerScreen
        }
        //判定着色
        if(i < gendaInputLength) { //只判定当前新输入部分（忽略上n段与当前段没打的部分）
            //首段与非首段打对   TIPS:——>for in循环的下标i是字符串，另外首段后边的乘式为0，不影响结果
            let inputIndex = parseInt(i) + (currentSendingSection -1) * maxSpanSumPerScreen
            
            let duizhao = articleArray[i]
            let input = typeContent[inputIndex]

            let status1 = duizhao.charCodeAt(0) === 160 && input.charCodeAt(0) === 32
            let status2 = duizhao.charCodeAt(0) === 32 && input.charCodeAt(0) === 160

            if(duizhao === input || status1 || status2){
                $(span).removeClass()
                $(span).addClass('type-true')
                //$('#duizhaoqu-div .type-true').length
                continue
            }
            
            //防止回删等按键被记成错词
            if($(span).attr('class') !== 'type-false'){
                $(span).removeClass()
                $(span).addClass('type-false')
                console.log('有打错的哦~')
            }
        }
        //移除未跟打span着色(回改)
        else if($(span).attr('class') !== 'type-none'){
            $(span).removeClass()
            $(span).addClass('type-none')
        }
    }

    // 检查是否需要翻页
    checkIsLastOrTurn2NextPage()
}

/**
 * 检测到达页尾及翻页实现
 */
const checkIsLastOrTurn2NextPage = () =>{
    //未打完跳过
    if($("#duizhaoqu-div .type-none").length !== 0){
        return false
    }

    //判定是否有下一页，有则跳转下一页，无则限制跟打区输入
    let nextSendingSection = currentSendingSection + 1
    if(nextSendingSection <= currentSectionSum){
        //TODO 添加记录本页成绩功能
        typeFalseCount += $('#duizhaoqu-div .type-false').length
        currentTypeCount +=  $('#duizhaoqu-div').children().length

        putSectionOnScreen(nextSendingSection)
        currentSendingSection = nextSendingSection
    }
    else{
        //打字完成，限制跟打区输入
        $("#genda").attr('contenteditable', false)
        shell.beep()
        //停止定时器，结算最终成绩存文件或存库
        removeScoreTimer(scoreTimer)
        //TODO 存库上屏
        currentTypeCount +=  $('#duizhaoqu-div').children().length
    }
}

/**
 * 计算指定div下的span的offsetHeight与offsetWidth
 * @param {div的id} divElementId 
 */
const computeSpanWhitchUnderDivSize = (divElementId) => {
    let result = {}
    let testWord = '我'
    let span = document.createElement("span")
    span.id = 'testFontSizeSpan'
    span.style.visibility = "hidden";
    let element = document.getElementById(divElementId)
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
        console.log("当前回改数为" + backModifyCount)
    }
}

/**
 * 记录成绩并上屏
 * @param saveDB 是否保存到数据库
 */
const putScoreOnScreen = () =>{
    console.log('停一小会儿，掏小本本记成绩~')
    computScore()
    //记录当前成绩
    //记录开始时间
    //记录击键数：Linux可能会有点误差
    $("#type-count")[0].innerText = inputKeyCount
    //更新错误数/回改数(退格键数)
    $("#type-false")[0].innerText = typeFalseCount + $('#duizhaoqu-div .type-false').length
    //更新回改
    $("#type-back")[0].innerText = backModifyCount
    //更新已打
    let typed = $('#duizhaoqu-div').children().length - $('#duizhaoqu-div .type-none').length + currentTypeCount
    $("#typed-words")[0].innerText = typed
    //打完屏幕结尾更新文段上屏，下一段
    //更新当前段数
    //记录结束时间
    //计算成绩
    //更新进度条
    $(".progress-bar").css("width", typed / currentArticle.length * 100 + "%")
    
}

const computScore = () =>{
    
}

/**
 * 首次跟打或继续跟打开启定时器
 */
const openScoreTimerIfStartNow = () => {
    if(scoreTimer === 0){
        scoreTimer = window.setInterval(putScoreOnScreen, timerInterval)
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
const updateInputKeyCount = () =>{
    inputKeyCount += 1
}

