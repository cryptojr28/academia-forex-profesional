module.exports = {
  webpack: {
    configure: (webpackConfig) => {
      // Disable React Fast Refresh in production
      if (process.env.NODE_ENV === 'production') {
        webpackConfig.plugins = webpackConfig.plugins.filter(
          plugin => plugin.constructor.name !== 'ReactRefreshWebpackPlugin'
        );
      }
      return webpackConfig;
    }
  },
  devServer: {
    hot: process.env.NODE_ENV !== 'production',
    liveReload: process.env.NODE_ENV !== 'production'
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
