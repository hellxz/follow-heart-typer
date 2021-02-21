class HellxzUtil {
    constructor(){}
    /**
     * 保留两位小数，不四舍五入，向下取整
     * @param num 待处理小数
     */
    static numFloor(num) {
        return Math.floor(num * 100) / 100
    }
    
    /**
     * 保留两位小数，四舍五入
     * @param num 待处理小数
     */
    static numToFixed(num){
        return parseFloat(num.toFixed(2))
    }

    /**
     * 时间戳值转秒
     */
    static timestampToSeconds(timestamp){
        return timestamp / 1000
    }

    /**
     * 时间戳值转分
     */
    static timestampToMinutes(timestamp){
        return timestamp / 1000 / 60
    }
}

module.exports = HellxzUtil