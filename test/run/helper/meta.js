/**
 * @copyright Copyright (c) 2020 Maxim Khorin <maksimovichu@gmail.com>
 */
'use strict';

const {expect} = require('chai');
const MetaHelper = require('../../../helper/MetaHelper');

describe('MetaHelper', ()=> {

    it('resolveInteger', ()=> {
        const defaultValue = 10;
        const maxValue = 15;
        expect(MetaHelper.resolveInteger(5, defaultValue)).to.eql(5);
        expect(MetaHelper.resolveInteger(null, defaultValue)).to.eql(defaultValue);
        expect(MetaHelper.resolveInteger(20, defaultValue, maxValue)).to.eql(maxValue);
    });
});