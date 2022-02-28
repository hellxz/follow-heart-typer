const Store = require('electron-store')
//uuid新引法，旧版本方式require('uuid/v4')在8.0版本已失效
const {v4: uuidv4} = require('uuid')

class DataStore extends Store {
    constructor(settings){
        super(settings)
        //tracks是一个音乐记录对象数组，包含id,path,track
        this.tracks = this.get('tracks') || []
    }
    saveTracks(){
        this.set('tracks', this.tracks)
        return this
    }
    getTracks(){
        return this.get('tracks') || []
    }
    addTracks(tracks){
        //不排除添加多条音乐文件的情况，遍历数组添加到音乐记录对象数组
        const tracksWithPops = tracks.map(track => {
            return {
                //定义音乐记录对象
                id: uuidv4(),
                path: track,
                fileName: path.basename(track)
            }
        }).filter(track => {
            //获取当前音乐文件路径，以检查是否添加重复，filter块中返回false则不添加到新数组里
            const currentTracks = this.getTracks().map(track => track.path)
            //es6的includes，返回布尔值，无法获得下标，需要下标使用indexOf
            console.log('当前音乐是否要更新:'+!currentTracks.includes(track.path))
            return !currentTracks.includes(track.path)
        })
        //合并数组
        this.tracks = [...this.tracks, ...tracksWithPops]
        return this.saveTracks()
    }
    removeTrack(id){
        // 数组去除指定对象的两种写法
        // this.tracks.splice(this.tracks.findIndex(item => item.id === id), 1)
        this.tracks = this.tracks.filter(track => track.id != id)
        return this.saveTracks()
    }
}

//CommonJS规范，导出模块
module.exports = DataStore