const Store = require('electron-store')

class DataStore extends Store {
    constructor(settings){
        super(settings)
        this.record = this.get('record') || {"today": 0, "history": 0}
    }
    saveRecord(today, history){
        console.log("saveRecord: today=" + today +' history=' + history)
        this.record.today = today
        this.record.history = history
        this.set('record', this.record)
        return this
    }
    getRecord(){
        console.log("getRecord: " + this.get('record'))
        return this.get('record') //|| {"today": 0, "history": 0}
    }
}

//CommonJS规范，导出模块
module.exports = DataStore