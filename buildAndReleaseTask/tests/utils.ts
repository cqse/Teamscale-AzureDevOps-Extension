import * as utils from '../utils';
import * as assert from 'assert';

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


describe('resolveFiles', function() {
    it('should throw an exception if an absolutely specified file does not exist', function() {
        assert.throws(() => utils.resolveFiles("does/not/exist.xml"), /Not found/);
    });
    
    it('should throw an exception if pattern matches no files', function() {
        assert.throws(() => utils.resolveFiles("does/not/exist*.xml"), /Did not find/);
    });
});