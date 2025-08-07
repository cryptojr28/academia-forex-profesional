const webpack = require('webpack');

module.exports = {
  webpack: {
    configure: (webpackConfig, { env }) => {
      // Only disable in production
      if (env === 'production') {
        // Remove React Refresh Plugin completely
        webpackConfig.plugins = webpackConfig.plugins.filter(plugin => {
          return plugin.constructor.name !== 'ReactRefreshWebpackPlugin';
        });
      }
      return webpackConfig;
    }
  },
  devServer: (devServerConfig, { env }) => {
    // Disable hot reload in production
    if (env === 'production') {
      devServerConfig.hot = false;
    }
    return devServerConfig;
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
