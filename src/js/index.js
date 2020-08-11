const { app, ipcRenderer } = require('electron')
window.$ = window.jQuery = require('jquery');

$(function(){

    //速度：瞬时速度，单位 字/min
    let speed = 0
    //击键：每秒击键数
    let typeCountPerSecond = 0
    //码长：打每个字平均击键数
    let keyLong = 0
    //键准：未知
    let typeAccuracy = 0
    //当前文章打字数
    let currentSessionTypeCount = 0
    //当前文章总字数
    let currentArticleWordsCount = 0
    //错字数
    let typeFalseCount = 0
    //本日打字数
    let typeTodaySum = 0
    //历史打字总数
    let typeHistorySum = 0
    //当前跟打状态
    let isTyping = false
    //当前文章
    let currentArticle = ''
    //当前文章Map
    let currentArticleMap = new Map();
    //当前文章分段总数
    let currentSectionSum = 0
    //当前文章发文段数
    let currentSendingSection = 1
    //当前对照区最多可发的字数(span数)
    let maxSpanSumPerScreen = 0
    //发文状态：自动/手动下一段
    let sendArticleAutomic = true
    //是否自动发送成绩
    let sendTypeResultAutomic = false
    //中文输入状态
    let chineseInput = false


    //初始化
    ipcRenderer.on('main-window-ready', () => {
        $('#duizhaoqu-div')[0].innerHTML = '<span id="default-duizhao-words">欢迎使用随心跟打器，祝您跟打愉快！</span>'
    })

    /**
     * 键盘输入事件处理
     */
    $("#wrapper-box").on("keyup", (e) => {
        switch(e.keyCode){
            case 115:
                //载文事件不处理
                break;
            case 17:
                //Control键不操作
                break;
            default:
                //默认跟打
                genda(e);
        }
    })

    document.getElementById('genda').addEventListener('compositionstart', (e) => {
        this.chineseInput = true
        console.log("正在打中文，还没打完呢！")
    }, false);

    document.getElementById('genda').addEventListener('input', (e) => {
        if(! this.chineseInput){
            console.log("在打英文")
            refreshTypeStatus()
        }
    },false);

    document.getElementById('genda').addEventListener('compositionend', (e) => {
        console.log("打完中文了")
        refreshTypeStatus()
        this.chineseInput = false
    }, false);

    ipcRenderer.on('zaiwen', () => {
        console.log("载文事件触发")
        loadArticleFromClipboard()
    })

    ipcRenderer.on('fawen', () => {
        console.log("发文事件触发")
        sendArticleFromSqlLite()
    })

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
        this.currentArticle = '听见你说：朝阳起又落，晴雨难测，道路是脚步多，我已习惯，你突然间的自我，挥挥洒洒，将自然看通透~那就不要留时光一过不再有，你远眺的天空，挂更多的彩虹，我会轻轻地，将你豪情放在心头，在寒冬时候，就回忆你湿柔。听见你说：朝阳起又落，晴雨难测，道路是脚步多，我已习惯，你突然间的自我，挥挥洒洒，将自然看通透~那就不要留时光一过不再有，你远眺的天空，挂更多的彩虹，我会轻轻地，将你豪情放在心头，在寒冬时候，就回忆你湿柔。'
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
        this.maxSpanSumPerScreen = horizontalSpanCount * verticalSpanCount
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

        putSectionOnScreen(1)
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

    /**
     * 跟打（看打）
     * @param {键盘输入事件} event 
     */
    const genda = (event) => {
        // console.log(event.keyCode)
        //记录开始时间
        //记录击键数
        //更新错误数/回改数(退格键数)
        //更新已打
        //打完屏幕结尾更新文段上屏，下一段
        //更新当前段数
        //记录结束时间
        //计算成绩
    }

    /**
     * 更新跟打判定
     */
    const refreshTypeStatus = () => {
        console.log('更新判定执行')
        let defaultDiv = document.getElementById("default-duizhao-words")
        if(defaultDiv !== null){
            alert("开始跟打请先载文或发文")
            $("#genda").empty()
            $("#genda").focusout() //引入新bug，首次清空标
            return false
        }
        
        let articleArray = this.currentArticleMap.get(this.currentSendingSection)
        let typeContent = document.getElementById("genda").innerText

        for(let i in articleArray){
            let span = $('#duizhaoqu-div').children()[i]
            if($(span).attr('class') !== 'type-none'){
                $(span).removeClass()
                $(span).addClass('type-none')
            }
        }

        for(let i=0; i< typeContent.length; i++){
            let span = $('#duizhaoqu-div').children()[i]
            let originClassName = $(span).attr('class')
            if(articleArray[i] === typeContent[i]){
                $(span).removeClass()
                $(span).addClass('type-true')
                continue
            }
            if(originClassName !== 'type-false'){
                $(span).removeClass()
                $(span).addClass('type-false')
                console.log('改错误状态')
            }
        }
        //TODO 记录错字
        //TODO 翻页实现
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
