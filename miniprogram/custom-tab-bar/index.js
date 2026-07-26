const tabs = [
  { pagePath: '/pages/cultivate/cultivate', text: '修炼', icon: '/assets/tabbar/cultivate.png', activeIcon: '/assets/tabbar/cultivate-active.png' },
  { pagePath: '/pages/explore/explore', text: '游历', icon: '/assets/tabbar/explore.png', activeIcon: '/assets/tabbar/explore-active.png' },
  { pagePath: '/pages/inventory/inventory', text: '行囊', icon: '/assets/tabbar/inventory.png', activeIcon: '/assets/tabbar/inventory-active.png' },
  { pagePath: '/pages/profile/profile', text: '人物', icon: '/assets/tabbar/profile.png', activeIcon: '/assets/tabbar/profile-active.png' },
  { pagePath: '/pages/more/more', text: '更多', icon: '/assets/tabbar/more.png', activeIcon: '/assets/tabbar/more-active.png' }
]

Component({
  data: { selected: 0, tabs },

  lifetimes: {
    attached() { this.syncSelected() }
  },

  pageLifetimes: {
    show() { this.syncSelected() }
  },

  methods: {
    syncSelected() {
      const pages = getCurrentPages()
      const route = pages.length ? `/${pages[pages.length - 1].route}` : ''
      const selected = tabs.findIndex((item) => item.pagePath === route)
      if (selected >= 0 && selected !== this.data.selected) this.setData({ selected })
    },

    switchTab(event) {
      const index = Number(event.currentTarget.dataset.index)
      const tab = tabs[index]
      if (!tab || index === this.data.selected) return
      this.setData({ selected: index })
      wx.switchTab({
        url: tab.pagePath,
        fail: () => this.syncSelected()
      })
    }
  }
})
