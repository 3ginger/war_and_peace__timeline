'use strict';

module.exports = function(data, parsedAssets) {
    var output = {},
        obj = parsedAssets;

    //remove path
    for (var key in obj) {
        var newkey = key.split('/').pop();
        obj[newkey] = obj[key];
        delete obj[key]
    }

    output.publicPath = data.publicPath;
    output.assetsByChunkName = data.assetsByChunkName;
    output.assets = obj;

    return output;
}