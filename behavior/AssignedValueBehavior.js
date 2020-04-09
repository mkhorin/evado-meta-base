/**
 * @copyright Copyright (c) 2020 Maxim Khorin (maksimovichu@gmail.com)
 */
'use strict';

const Base = require('./Behavior');

module.exports = class AssignedValueBehavior extends Base {

    afterInsert () { // need to save backref changes
        if (this.onCreate) {
            return this.execute();
        }
    }

    afterUpdate () {
        if (this.onUpdate) {
            return this.execute();
        }
    }

    async execute () {
        let data = this.expression;
        if (typeof data.Class === 'string') {
            data = this.owner.class.meta.resolveSpawn(data);
        }
        if (!data) {
            return null;
        }
        let attr = this.getClassAttr();
        let value = null;
        if (data.Class) {
            const expression = this.spawn(data, {attr});
            value = await expression.resolve(this.owner);
        } else {
            const calc = attr.spawnCalc(data);
            value = await calc.resolve(this.owner);
        }
        this.owner.set(attr.name, value);
        return this.owner.findSelf().update({[attr.name]: value});
    }
};