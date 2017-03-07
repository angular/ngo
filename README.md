    $ npm run build
    # in other project
    $ npm install ../ngo/dist
    # in webpack config
    "module": {
      "rules": [
        {
          "test": /\.js$/,
          "loader": "ngo-loader"
        },
        ...
      ]
    }
