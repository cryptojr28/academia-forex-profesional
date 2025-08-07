const webpack = require('webpack');

module.exports = {
  webpack: {
    configure: (webpackConfig) => {
      // Completely disable React Fast Refresh in production
      if (process.env.NODE_ENV === 'production') {
        // Remove React Refresh plugin
        webpackConfig.plugins = webpackConfig.plugins.filter(
          plugin => 
            plugin.constructor.name !== 'ReactRefreshWebpackPlugin' &&
            !plugin.constructor.name.includes('ReactRefresh')
        );

        // Remove React Refresh loader
        webpackConfig.module.rules.forEach(rule => {
          if (rule.oneOf) {
            rule.oneOf.forEach(oneOfRule => {
              if (oneOfRule.use && Array.isArray(oneOfRule.use)) {
                oneOfRule.use = oneOfRule.use.filter(
                  useEntry => 
                    !useEntry.loader || 
                    !useEntry.loader.includes('react-refresh')
                );
              }
            });
          }
        });

        // Add define plugin to completely disable fast refresh
        webpackConfig.plugins.push(
          new webpack.DefinePlugin({
            'process.env.FAST_REFRESH': 'false'
          })
        );
      }
      return webpackConfig;
    }
  },
  devServer: {
    hot: false,
    liveReload: false
  },
  style: {
    postcss: {
      plugins: [
        require('tailwindcss'),
        require('autoprefixer')
      ]
    }
  }
};
