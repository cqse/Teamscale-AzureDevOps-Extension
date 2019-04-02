import * as utils from '../utils'
import * as assert from 'assert';
import { isUndefined } from 'util';

describe('firstWildcardIndex', function() {
    it('should return null if no wildcards present', function() {
        assert.equal(utils.firstWildcardIndex(""), null);
        assert.equal(utils.firstWildcardIndex("test"), null);
    });

    it('should return index of first wildcard if present', function() {
        assert.equal(utils.firstWildcardIndex("test*"), 4);
        assert.equal(utils.firstWildcardIndex("test*?"), 4);
        assert.equal(utils.firstWildcardIndex("test?*"), 4);
        assert.equal(utils.firstWildcardIndex("*test"), 0);
    });
});
