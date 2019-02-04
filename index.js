const { basename, extname, resolve, relative } = require('path')
  , { by, str, key, extend, includes  } = require('utilise/pure')
  , ExtractTextPlugin = require('extract-text-webpack-plugin')
  , log = require('utilise/log')('[fero-resource-subscriber]')
  , deb = require('utilise/deb')('[fero-resource-subscriber]')
  , autolink = 'resources/components/**/!(*test).{css,js}'
  , copyplugin = require('copy-webpack-plugin')
  , promise = require('utilise/promise')
  , file = require('utilise/file')
  , memory = require('memory-fs')
  , webpack = require('webpack')
  , glob = require('glob').sync
  , rel = (dir, path) => 
      './' + relative(dir, path)
      .replace(/\\/g, '/')
  , fn = b => (new Function('module', 'exports', 'require'
                            ,'process', `module.exports = ${b}`))
  , mapping = type => 
              type == '.js'   ? 'application/javascript'
            : type == '.css' ? 'text/css'
            : 'text/plain'
  , namefn = path => basename(path)
                    .replace('.js', '')
                    .replace('.ts', '')
  , format = path => includes('.js')
                        (basename(path)) 
                        ? { 'format': 'cjs' }
                        : {}
  , resdir = path => f => resolve(path, f)


const toMem = mem => compiler => {
  compiler.outputFileSystem = mem
  return compiler
}

const runCompiler = p =>  compiler => {
  compiler.run((err, stats) => {
    if (err) p.reject(err)
    const result = fn(compiler.outputFileSystem.data['bundle.js'].toString())
    p.resolve(str(result))
  })
  return p
}

function getConfigs(regex){
  return (ext, path, dir, p) => {
    var configs = key(ext, d => {
      var files = glob(`webpack.config.js`, { cwd: dir })
                            .map(resdir(dir))
      if (!files.length)
        files= glob(`webpack.config.js`, { cwd: __dirname })
                  .map(resdir(__dirname))

      return files
    })({})
    
    return Promise.all(
      configs[ext]
        .map(require)
        .map(key('entry', extend( { bundle: path })))
        .map(key('resolve', extend({ modules: [resolve(dir, 'utils'), 'node_modules'] })))
        .map(key('output', extend({ filename: '[name].js', path: '/' })))
        .map(webpack)
        .map(toMem(new memory()))
        .map(runCompiler(p))
    )
  }
}

   

function createBundle(path, dir, wp){
  var p = promise()
  , ext = extname(path)
  , regex = `webpack.config.js`
  
  if (!wp){
    p.resolve(file(path))
    return p
  }
  
  
  switch(ext) {
    case '.js':
      getConfigs(regex)(ext, path, dir, p)
      break;
    case '.ts':
      regex = `weback.config${ext}.js`
      getConfigs(regex)(ext, path, dir, p)
      break;
    default:
      p.resolve(file(path))
  }
  return p
}

module.exports = async function subscribe(dir, { name = '', body = '', headers = {}, path }, { wp }){
  log(`SUBSCRIPTION REQUEST: ${basename(path)}`)
  const value = async () => {
    if (!!body){
      deb(`body exists: ${body}`)
      return str(body)
    }
    deb(`Creating bundle at ${path}`)
    return await createBundle(path, dir, wp)
  }
  , output = {
      name: name || namefn(path)
    , value: await value()
    , headers: extend(
        extend({
        'content-type': mapping(extname(path)) 
      })(format(path)))
        (headers)
  }

  deb(output)
  return output
}


