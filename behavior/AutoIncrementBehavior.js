/**
 * @copyright Copyright (c) 2020 Maxim Khorin (maksimovichu@gmail.com)
 */
'use strict';

const Base = require('./Behavior');

module.exports = class AutoIncrementBehavior extends Base {

    static async normalize (view) {
        const configs = view.behaviors.getAllByClass(this);
        if (configs.length) {
            const owner = view.createModel();
            for (const config of configs) {
                await ClassHelper.spawn(config, {owner}).normalize();
            }
        }
    }

    constructor (config) {
        super({
            start: 1,
            step: 1,
            ...config
        });
    }

    async afterDefaultValues () {
        const query = this.getValueQuery();
        const current = await query.scalar('value');
        this.owner.set(this.attrName, this.getNextValue(current));
    }

    async beforeInsert () {
        const query = this.getValueQuery();
        const current = await query.scalar('value');
        this.value = this.getNextValue(current);
        if (!this.owner.has(this.attrName)) {
            this.owner.set(this.attrName, this.value);
        }
        await query.upsert({value: this.value});
    }

    getName () {
        return `${this.attrName}.${this.owner.class.id}`;
    }

    getExtremeValue () {
        return this.owner.class.createQuery().order({
            [this.attrName]: this.step > 0 ? -1 : 1
        }).scalar(this.attrName);
    }

    getNextValue (value) {
        return Number.isSafeInteger(value) ? (value + this.step) : this.start;
    }

    getTable () {
        return this.getMeta().autoIncrementTable;
    }

    getValueQuery () {
        return (new Query).db(this.owner.class.getDb())
            .from(this.getTable())
            .where({name: this.getName()});
    }

    async normalize () {
        const query = this.getValueQuery();
        const currentValue = await query.scalar('value');
        const value = await this.getExtremeValue();
        if (value !== undefined && (currentValue === undefined || value > currentValue)) {
            await query.upsert({value});
        }
    }

    dropData () {
        return this.getValueQuery().delete();
    }
};

const ClassHelper = require('areto/helper/ClassHelper');
const Query = require('areto/db/Query');