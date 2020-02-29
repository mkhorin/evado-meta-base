/**
 * @copyright Copyright (c) 2020 Maxim Khorin <maksimovichu@gmail.com>
 */
'use strict';

const {expect} = require('chai');
const MetaHelper = require('../../../helper/MetaHelper');

describe('MetaHelper', ()=> {

    it('resolveInteger', ()=> {
        expect(MetaHelper.resolveInteger(5, 10)).to.eql(5);
        expect(MetaHelper.resolveInteger(null, 10)).to.eql(10);
        expect(MetaHelper.resolveInteger(20, 10, 15)).to.eql(15);
    });
});