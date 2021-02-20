const { app, ipcRenderer, remote, shell } = require('electron')
const os = require('os')
window.$ = window.jQuery = require('jquery');

$(function(){

    /* 当前跟打文章数据 */
    //当前文章内容
    let currentArticle = ''
    //当前文章总字数
    let currentArticleWordsCount = 0
    //当前文章打字数
    let currentSessionTypeCount = 0
    
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
    //发文状态：自动/手动下一段 TODO
    let sendArticleAutomic = true
    //是否自动发送成绩
    let sendTypeResultAutomic = false
    //中文输入状态
    let chineseInput = false
    

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
    let typeFalseCount = 0
    //回改数
    let backModifyCount = 0
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

    /**
     * 以下三个事件作为互锁控制中文输入状态，减少中文输入中状态值取到字母的问题。
     * 经测试，不同平台上事件触发不同
     * - Windows平台上可正常触发compositionstart与compositionend事件，如不加中文输入状态控制，input事件也会被触发
     * - Linux平台输入法都是挂靠在输入引擎上的，所以只能得到input事件（中文输入状态的标识会失效）
     * - Mac平台未测
     */
    $('#genda').on('compositionstart', (e) => {
        this.chineseInput = true
        console.log("正在打中文，还没打完呢！")
    })

    $('#genda').on('input', (e) => {
        if(! this.chineseInput){
            console.log("在打英文")
            refreshTypeStatus()
        }
        if(e.keyCode === 8){ //退格键
            if(this.backModifyCount !== undefined){
                this.backModifyCount += 1
            }
            else{
                this.backModifyCount = 1
            }
            console.log("当前回改数为" + this.backModifyCount)
        }
    })

    //计算回改数
    $('#genda').on('keyup', (e) => {
        console.log("按键抬起")
        if(e.keyCode === 8){ //退格键
            if(this.backModifyCount !== undefined){
                this.backModifyCount += 1
            }
            else{
                this.backModifyCount = 1
            }
            console.log("当前回改数为" + this.backModifyCount)
        }
    })

    $('#genda').on('compositionend', (e) => {
        console.log("打完中文了")
        console.log(os.platform())
        refreshTypeStatus()
        this.chineseInput = false
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
            if(this.currentArticle === ''){
                addDefaultDuiZhaoDiv()
            }else{
                subsectionArticlePutFirstSectionOnScreen()
            }
        }
    })

    //添加默认对照区提示
    const addDefaultDuiZhaoDiv = () => {
        $('#duizhaoqu-div')[0].innerHTML = '<span id="default-duizhao-words">欢迎使用随心跟打器，祝您跟打愉快！发文请按F6，载文请按F4，调试请按F12</span>'
    }

    /**
     * 剪贴板载文上屏
     */
    const loadArticleFromClipboard = () => {
        console.log('载文方法触发')
        const { clipboard } = require('electron')
        this.currentArticle = clipboard.readText('selection')
        subsectionArticlePutFirstSectionOnScreen()
    }

    /**
     * 数据库中选择文章，自动发文
     */
    const sendArticleFromSqlLite = () => {
        //TODO 数据库读取文章，将赋值给this.currentArticle渲染上屏
        // ipcRenderer.send('read-article-from-sqllite') //示例，后续可能会通过子容器传递
        this.currentArticle = '听见你说：朝阳起又落，晴雨难测，道路是脚步多，我已习惯，你突然间的自我，挥挥洒洒，将自然看通透~那就不要留时光一过不再有，你远眺的天空，挂更多的彩虹，我会轻轻地，将你豪情放在心头，在寒冬时候，就回忆你温柔。听见你说：朝阳起又落，晴雨难测，道路是脚步多，我已习惯，你突然间的自我，挥挥洒洒，将自然看通透~那就不要留时光一过不再有，你远眺的天空，挂更多的彩虹，我会轻轻地，将你豪情放在心头，在寒冬时候，就回忆你温柔。听见你说：朝阳起又落，晴雨难测，道路是脚步多，我已习惯，你突然间的自我，挥挥洒洒，将自然看通透~那就不要留时光一过不再有，你远眺的天空，挂更多的彩虹，我会轻轻地，将你豪情放在心头，在寒冬时候，就回忆你温柔。'
        subsectionArticlePutFirstSectionOnScreen()
    }

    /**
     * QQ群载文上屏
     */
    const loadArticleFromQQgroup = () => {
        //TODO c语言类库读取操作系统参数完成功能
        this.currentArticle = fromQQGroup()
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
        this.maxSpanSumPerScreen = horizontalSpanCount * verticalSpanCount //Mark:临时方案，每屏减5个span，为测试先不加
        console.log("当前div最多放"+ this.maxSpanSumPerScreen + "个span")

        //载文分段
        this.currentArticleMap = new Map()
        
        let articleArray = this.currentArticle.split('')

        let sectionCount = articleArray.length / this.maxSpanSumPerScreen

        if((tempCount = parseInt(sectionCount)) < sectionCount) {
            sectionCount = tempCount + 1
        }

        this.currentSectionSum = sectionCount
        this.currentSendingSection = 1

        let tempArray
        for(i=0; i<sectionCount; i++){
            //每次删除一段数量，使用返回被删部分数组保存map
            tempArray = articleArray.splice(0, this.maxSpanSumPerScreen)
            this.currentArticleMap.set(i+1, tempArray)
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
        let nextSectionArray = this.currentArticleMap.get(nextSection)
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
        
        let articleArray = this.currentArticleMap.get(this.currentSendingSection)
        let typeContent = document.getElementById("genda").innerText
        let spans = $('#duizhaoqu-div').children()

        for(let i in articleArray){
            let span = spans[i]
            //确定当前对照区与跟打区对应的比对区间
            let gendaInputLength = 0
            if(this.currentSendingSection == 1){
                gendaInputLength = typeContent.length //首段
            }
            else{
                //非首段，应使用输入长度减去已翻页的部分
                gendaInputLength = typeContent.length - (this.currentSendingSection -1) * this.maxSpanSumPerScreen
            }
            //判定着色
            if(i < gendaInputLength) { //只判定当前新输入部分（忽略上n段与当前段没打的部分）
                // console.log(i)
                let originClassName = $(span).attr('class')
                
                //首段打对
                if(this.currentSendingSection === 1 && articleArray[i] === typeContent[i] ){
                    $(span).removeClass()
                    $(span).addClass('type-true')
                    continue
                }

                //非首段打对   TIPS:——>for in循环的下标是字符串
                let inputIndex = parseInt(i) + (this.currentSendingSection -1) * this.maxSpanSumPerScreen
                if(articleArray[i] === typeContent[inputIndex]){
                    $(span).removeClass()
                    $(span).addClass('type-true')
                    continue
                }

                //打错
                if(originClassName !== 'type-false'){
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
        
        //保存当前记录，打算由定时器实现成绩上屏
        //stopTheWorldSaveData()

        //判定是否有下一页，有则跳转下一页，无则限制跟打区输入
        let nextSendingSection = this.currentSendingSection + 1
        if(nextSendingSection <= this.currentSectionSum){
            putSectionOnScreen(nextSendingSection)
            this.currentSendingSection = nextSendingSection
        }
        else{
            //打字完成，限制跟打区输入
            $("#genda").attr('contenteditable', false)
            shell.beep()
            //停止定时器，结算最终成绩存文件或存库
            stopTheWorldSaveData()
        }
    }

    /**
     * 记录当前页跟打错字数
     * TODO: 使用定时器实现
     */
    const stopTheWorldSaveData = () =>{
        console.log('停一小会儿，掏小本本记成绩~')
        
        //TODO 暂停计时器
        //记录当前成绩
        //记录开始时间
        //记录击键数：Linux可能会有点误差
        //更新错误数/回改数(退格键数)
        //更新已打
        //打完屏幕结尾更新文段上屏，下一段
        //更新当前段数
        //记录结束时间
        //计算成绩
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

})
