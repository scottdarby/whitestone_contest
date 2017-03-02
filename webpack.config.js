module.exports = {

    entry: {
        javascript: "./src/js/main.js"
    },

    output: {
        filename: "app.js",
        path: __dirname + "/dist",
    },

    module: {
      loaders: [
        {
          test: /\.js$/,
          loader: 'babel-loader',
          exclude: /node_modules/
        }
      ]
    },

};
