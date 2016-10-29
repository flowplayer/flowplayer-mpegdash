'use strict';

var fs = require('fs')
  , path = require('path')
  , webpack = require('webpack')
  , console = require('console')
  , WrapperPlugin = require('wrapper-webpack-plugin')
  , headerComment = fs.readFileSync('./headConditionalComment.js')
  , footerComment = fs.readFileSync('./footConditionalComment.js')
  , exec = require('child_process').execSync
  , gitDesc
  , banner = ''
  , bannerAppend = false
  , lines = fs.readFileSync('./flowplayer.dashjs.js', 'utf8').split('\n');

try {
    gitDesc = exec('git describe').toString('utf8').trim();
} catch (ignore) {
    console.warn('unable to determine git revision');
}

lines.forEach(function (line) {
    if (line === '/*!') {
        bannerAppend = true;
    }
    if (bannerAppend) {
        bannerAppend = line.indexOf('$GIT_DESC$') < 0;
        if (gitDesc) {
            line = line.replace('$GIT_DESC$', gitDesc);
        }
        banner += line + (bannerAppend ? '\n' : '\n\n*/');
    }
});

module.exports = {
  entry: {'flowplayer.dashjs.min': ['./standalone.js']},
  externals: {
    flowplayer: 'flowplayer'
  },
  module: {
    loaders: [
      { test: /dashjs/, loader: 'babel', query: { presets: ['es2015'] } }
    ]
  },
  output: {
    path: path.join(__dirname, 'dist'),
    filename: '[name].js'
  },
  plugins: [
    new webpack.optimize.OccurrenceOrderPlugin(true),
    new webpack.optimize.UglifyJsPlugin({
      include: /\.min\.js$/,
      mangle: true,
      output: { comments: false }
    }),
    new webpack.NormalModuleReplacementPlugin(/^webworkify$/, 'webworkify-webpack'),
    new WrapperPlugin({header: headerComment, footer: footerComment}),
    new webpack.BannerPlugin(banner, {raw: true})
  ]
};
