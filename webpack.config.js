
module.exports = {
      target: 'node'
    , entry: './component.js'
    , output: {
        filename:'bundle.js'
      , path: '/'
      , publicPath: '/assets/'
      }
    , mode: 'development'
    , resolve: {
        modules:['node_modules']
      }
}


