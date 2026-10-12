// app.js
App({
  globalData: {
    highScore: 0
  },
  onLaunch() {
    try {
      const hs = wx.getStorageSync('tetris_high_score');
      if (hs) this.globalData.highScore = hs;
    } catch (e) {
      // 忽略读取失败
    }
  }
});
