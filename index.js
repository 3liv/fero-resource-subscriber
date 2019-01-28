const { basename, extname, resolve, relative } = require('path')
  , ExtractTextPlugin = require('extract-text-webpack-plugin')
  , autolink = 'resources/components/**/!(*test).{css,js}'
  , log = require('utilise/log')('fero-component')
  , copyplugin = require('copy-webpack-plugin')
  , includes = require('utilise/includes')
  , promise = require('utilise/promise')
  , extend = require('utilise/extend')
  , file = require('utilise/file')
  , memory = require('memory-fs')
  , webpack = require('webpack')
  , str = require('utilise/str')
  , glob = require('glob').sync
  , by = require('utilise/by')
  , rel = (dir, path) => 
      './' + relative(dir, path)
      .replace(/\\/g, '/')
  , mapping = type => 
              type == '.js'   ? 'application/javascript'
            : type == '.css' ? 'text/css'
            : 'text/plain'
  , name = path => basename(path)
                    .replace('.js', '')
  , format = path => includes('.js')
                        (basename(path)) 
                        ? { 'format': 'cjs' }
                        : {}

   

function createBundle(path, dir){
  var p = promise()

  if (includes('.js')(extname(path))){
    const compiler = webpack({
      target: 'node'
    , entry: path
    , output: {
        filename:'bundle.js'
      , path: '/'
      , publicPath: '/assets/'
      }
    , mode: 'development'
    , resolve: {
        modules:[resolve(dir, 'utils'), 'node_modules']
      }
    })
    , fn = b => (new Function('module', 'exports', 'require'
                            , 'process', `module.exports = ${b}`))

    compiler.outputFileSystem = new memory()

    compiler.run((err, stats) => {
        if (err) p.reject(err)
        const result = fn(compiler.outputFileSystem.data['bundle.js'].toString())
        p.resolve(str(result))
      })
    
    return p
  }
  // else if (includes('.css')(extname(path))){
  //   const fn = require('./webpack.config.css')
  //   , compiler = webpack(fn(path))
  //
  //   compiler.outputFileSystem = new memory()
  //
  //   compiler.run((err, stats) => {
  //       if (err) p.reject(err)
  //       try {
  //         const result = compiler.outputFileSystem.data['bundle.js'].toString()
  //         p.resolve(result)
  //       } catch(error){
  //         log(error)
  //       }
  //     })
  //
  //   return p
  // }
  else p.resolve(file(path))
  return p
}

module.exports = async function subscribe(req, path, dir = __dirname){
  log(`SUBSCRIPTION REQUEST: ${basename(path)}`)
  return {
    name: name(path)
  , value: await createBundle(path, dir)
  , headers: extend({
      'content-type': mapping(extname(path)) 
    })(format(path))
  }
}


