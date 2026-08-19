import Buff from "./buff";
import shrineDetailMap from "./data/shrineDetailMap.json";

class Shrine {
    constructor(hrid, level) {
        this.hrid = hrid;
        this.level = level;

        let gameShrine = shrineDetailMap[this.hrid];
        if (!gameShrine) {
            throw new Error("No shrine found for hrid: " + this.hrid);
        }

        this.buffs = [];
        if (gameShrine.buffs) {
            for (const shrineBuff of gameShrine.buffs) {
                let buff = new Buff(shrineBuff, level);
                this.buffs.push(buff);
            }
        }
    }
}

export default Shrine;
