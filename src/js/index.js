const { app, ipcRenderer } = require('electron')
window.$ = window.jQuery = require('jquery');

$(function(){

    //速度：瞬时速度，单位 字/min
    window.speed = 0
    //击键：每秒击键数
    window.typeCountPerSecond = 0
    //码长：打每个字平均击键数
    window.keyLong = 0
    //键准：未知
    window.typeAccuracy = 0
    //当前文章打字数
    window.currentSessionTypeCount = 0
    //当前文章总字数
    window.currentArticleWordsCount = 0
    //错字数
    window.typeFalseCount = 0
    //本日打字数
    window.typeTodaySum = 0
    //历史打字总数
    window.typeHistorySum = 0
    //当前跟打状态
    window.isTyping = false
    //当前文章
    window.currentArticle = ''
    //当前文章数组，用于提高跟打判定效率
    window.currentArticleArray = []
    //当前文章Map
    window.currentArticleMap = new Map();
    //当前文章分段总数
    window.currentSectionSum = 0
    //当前文章发文段数
    window.currentSendingSection = 1
    //当前对照区最多可发的字数(span数)
    window.maxSpanSumPerScreen = 0
    //发文状态：自动/手动下一段
    window.sendArticleAutomic = true
    //是否自动发送成绩
    window.sendTypeResultAutomic = false


    //初始化
    ipcRenderer.on('main-window-ready', () => {
        console.log("初始化方法执行")
        $('#duizhaoqu-div')[0].innerHTML = '<span id="default-duizhao-words">欢迎使用随心跟打器，祝您跟打愉快！</span>'
    })

    /**
     * 键盘输入事件处理
     */
    $("#wrapper-box").on("keyup", (e) => {
        console.log('键盘事件入口' + e.keyCode)
        //TODO：判断是否是快捷键对应的keyCode，如果是正常跟打时的计算键数，进行处理，否则处理事件
        switch(e.keyCode){
            case 115:
                //载文事件不处理
                break;
            case 17:
                //Control键不操作
                break;
            //省略……
            default:
                //默认跟打
                genda(e);
        }
    })

    $("#genda").on('keyup', () => {
        console.log('keyup事件被触发，更新跟打状态')
        refreshTypeStatus()
    })

    ipcRenderer.on('zaiwen', () => {
        console.log("载文事件触发")
        loadArticleFromClipboard()
    })

    ipcRenderer.on('fawen', () => {
        console.log("发文事件触发")
        sendArticleFromSqlLite()
    })

    /**
     * 剪贴板载文
     */
    const loadArticleFromClipboard = () => {
        console.log('载文方法触发')
        const { clipboard } = require('electron')
        window.currentArticle = clipboard.readText('selection')
        //上屏
        subsectionArticlePutFirstSectionOnScreen()
    }

    /**
     * 发文，选择文章，配置，自动发文
     */
    const sendArticleFromSqlLite = () => {
        //读取SqlLite进行载文，不自动立即发下一段
        //TODO读取文章，复制到剪贴板，使用剪贴板载文
        // ipcRenderer.send('read-article-from-sqllite') //示例，后续可能会通过子容器传递
        window.currentArticle = '听见你说：朝阳起又落，晴雨难测，道路是脚步多，我已习惯，你突然间的自我，挥挥洒洒，将自然看通透~那就不要留时光一过不再有，你远眺的天空，挂更多的彩虹，我会轻轻地，将你豪情放在心头，在寒冬时候，就回忆你湿柔。听见你说：朝阳起又落，晴雨难测，道路是脚步多，我已习惯，你突然间的自我，挥挥洒洒，将自然看通透~那就不要留时光一过不再有，你远眺的天空，挂更多的彩虹，我会轻轻地，将你豪情放在心头，在寒冬时候，就回忆你湿柔。'
        subsectionArticlePutFirstSectionOnScreen()
    }

    /**
     * QQ群载文
     */
    const loadArticleFromQQgroup = () => {
        //TODO c语言类库读取操作系统参数完成功能
        window.currentArticle = fromQQGroup()
        //上屏
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
        window.maxSpanSumPerScreen = horizontalSpanCount * verticalSpanCount
        console.log("当前div最多放"+ window.maxSpanSumPerScreen + "个span")

        //载文分段
        window.currentArticleMap = new Map()
        
        let articleArray = window.currentArticle.split('')
        // debugger
        window.currentArticleArray = articleArray

        let sectionCount = articleArray.length / window.maxSpanSumPerScreen

        if((tempCount = parseInt(sectionCount)) < sectionCount) {
            sectionCount = tempCount + 1
        }

        window.currentSectionSum = sectionCount
        window.currentSendingSection = 1

        let tempArray
        for(i=0; i<sectionCount; i++){
            //每次删除一段数量，使用返回被删部分数组保存map
            tempArray = articleArray.splice(0, window.maxSpanSumPerScreen)
            window.currentArticleMap.set(i+1, tempArray)
        }
        
        //上屏
        putSectionOnScreen(1)
    }

    /**
     * 渲染文章段，上屏
     * @param {待上屏的段号} nextSection 
     */
    const putSectionOnScreen = (nextSection) => {
        console.log(window.currentArticleMap)
        let nextSectionArray = window.currentArticleMap.get(nextSection)
        //移除默认提示，载文上屏
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
        console.log(event.keyCode)
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
        debugger
        //获取当前跟打区字符数
        //使用字符数值+1访问数组对应下标，进行快速判定
        let articleArray = window.currentArticleArray
        let currWaitRefreshSection = window.currentSendingSection
        let totalSection = window.currentSectionSum
        let maxWordsOneSection = window.maxSpanSumPerScreen
        let typeContent = $("#genda").val()
        if(currWaitRefreshSection === 1){
            for(let i=0; i< maxWordsOneSection; i++){
                if(articleArray[i] === typeContent[i]){
                    $($('#genda').children()[i]).removeClass()
                    $($('#genda').children()[i]).addClass('type-ture')
                }
            }
        }
        else{
            let waitRefreshStart = (currWaitRefreshSection - 1) * maxWordsOneSection + 1
            let waitRefreshEnd = currWaitRefreshSection * maxWordsOneSection
            for(let i = waitRefreshStart; i < waitRefreshEnd; i++){
                if(articleArray[i] === typeContent[i]){
                    $($('#genda').children()[i]).removeClass()
                    $($('#genda').children()[i]).addClass('type-ture')
                }
                else{
                    $($('#genda').children()[i]).removeClass()
                    $($('#genda').children()[i]).addClass('type-false')
                }
            }
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


})
