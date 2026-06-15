<template>
  <div class="box" :class="{ dark: darkMode }" @keydown="handleKeydown" tabindex="-1">
    <!-- Dark mode toggle -->
    <button class="theme-toggle" @click="darkMode = !darkMode" :aria-label="darkMode ? '切换到浅色模式' : '切换到深色模式'">
      {{ darkMode ? '☀' : '☾' }}
    </button>

    <div class="tool-card">
      <!-- Header -->
      <div class="tool-card-header">
        <div class="title-group">
          <h1 class="tool-title" @click="isShowHistory = !isShowHistory">
            {{ isShowHistory ? "HISTORY" : title }}
          </h1>
          <p class="tool-subtitle" v-if="!isShowHistory && !showCloseMsg">
            将链接或 URL Scheme（如 <strong>weixin://open</strong> / <strong>baidu.com</strong>）转换为可分享的跳转链接
          </p>
        </div>
        <button
          class="mode-toggle"
          :class="{ active: isShowHistory }"
          @click="isShowHistory = !isShowHistory"
          :aria-label="isShowHistory ? '返回创建链接' : '查看历史记录'"
        >
          {{ isShowHistory ? "Create" : "History" }}
        </button>
      </div>

      <!-- Auto-redirect message -->
      <div v-if="showCloseMsg" class="section close-msg">
        <p class="close-text">
          正在跳转，页面将在 <strong class="countdown-num">{{ countDown }}</strong> 秒后自动关闭
        </p>
        <p class="close-sub">
          需要创建链接请访问
          <a class="text-link" @click="changeUrl(origin)">{{ origin }}</a>
        </p>
      </div>

      <!-- History mode -->
      <div v-else-if="isShowHistory" class="section history-section">
        <!-- Search -->
        <div class="search-row" v-if="history.length > 0">
          <input
            v-model="searchQuery"
            class="search-input"
            placeholder="搜索历史记录…"
            aria-label="搜索历史记录"
          />
        </div>

        <div v-if="filteredHistory.length === 0" class="history-empty">
          <p>{{ searchQuery ? '无匹配记录' : '暂无历史记录' }}</p>
        </div>
        <div v-for="item in filteredHistory" :key="item.scheme" class="history-item">
          <div class="history-scheme" @click="toHistoryUrl(item.scheme)">
            <span :title="item.scheme">{{ truncateString(item.scheme, 30) }}</span>
          </div>
          <div class="history-meta">
            <span class="count-badge">{{ item.count }}</span>
            <span class="history-date" :title="formatDate(item.recently).data">
              {{ formatDate(item.recently).info }}
            </span>
            <button
              class="delete-item-btn"
              @click.stop="deleteHistoryItem(item.scheme)"
              title="删除此记录"
              aria-label="删除此记录"
            >
              ×
            </button>
          </div>
        </div>
        <div class="history-footer">
          <div class="history-footer-left">
            <button class="clear-btn" @click="invalidHistory">清空记录</button>
            <button class="outline-btn" @click="exportHistory">导出</button>
            <button class="outline-btn" @click="importHistory">导入</button>
            <button class="outline-btn" @click="showSettings = !showSettings">
              {{ showSettings ? '关闭' : '⚙' }}
            </button>
            <input ref="importInput" type="file" accept=".json" class="sr-only" @change="onImportFile" />
          </div>
          <span class="history-note"
            >所有记录均存放在本地，
            <a href="https://github.com/weepwood/weepwood-scheme-to-url" target="_blank" rel="noopener">源代码</a></span
          >
        </div>

        <!-- Cloud Sync Settings -->
        <div v-if="showSettings" class="settings-panel">
          <div class="settings-header">GitHub Gist 同步</div>
          <div class="settings-row">
            <input
              v-model="cloudToken"
              class="text-input settings-input"
              type="password"
              placeholder="GitHub Personal Access Token (gist scope)"
              :disabled="syncStatus === 'connected'"
            />
          </div>
          <div class="settings-row settings-actions">
            <button
              v-if="syncStatus !== 'connected'"
              class="copy-btn"
              style="height:32px;font-size:13px;padding:0 14px"
              @click="connectGist"
              :disabled="syncStatus === 'connecting' || !cloudToken.trim()"
            >
              {{ syncStatus === 'connecting' ? '连接中…' : '连接' }}
            </button>
            <button
              v-else
              class="clear-btn"
              @click="disconnectGist"
            >
              断开
            </button>
            <span class="sync-status" :class="syncStatus">
              <span v-if="syncStatus === 'connected'">● 已连接</span>
              <span v-else-if="syncStatus === 'connecting'">⟳ 连接中…</span>
              <span v-else-if="syncStatus === 'error'">⚠ {{ syncError }}</span>
              <span v-else>○ 未连接</span>
            </span>
          </div>
          <div v-if="syncStatus === 'connected'" class="settings-row settings-info">
            <span v-if="lastSyncTime">上次同步：{{ formatDate(lastSyncTime).data }}</span>
            <button class="text-link" style="font-size:13px;background:none;border:none;cursor:pointer;padding:0" @click="syncToGist(history)">立即同步</button>
          </div>
        </div>
      </div>

      <!-- Normal input mode -->
      <div v-else class="section input-section">
        <div class="input-row">
          <label for="url" class="sr-only">需要跳转的地址</label>
          <div class="input-wrap" :class="{ error: urlError }">
            <input
              id="url"
              ref="urlInput"
              v-model="url"
              class="text-input"
              :class="{ 'input-error': urlError }"
              placeholder="例如 weixin://open、baidu.com、https://example.com"
              @keydown.enter="copy"
              @input="urlError = ''"
            />
            <span v-if="urlError" class="input-error-msg">{{ urlError }}</span>
          </div>
          <button
            class="copy-btn"
            :class="{ copied: copyText === 'Copied!', failed: copyText === 'Failed' }"
            @click="copy"
            :disabled="!url.trim()"
          >
            {{ copyText }}
          </button>
        </div>

        <!-- Generated URL display -->
        <div v-if="url && !urlError" class="url-display">
          <span class="url-label">Generated URL</span>
          <span class="url-text" @click="gotoUrl(toUrl)">
            {{ decodeURI(toUrl) }}
          </span>
        </div>

        <!-- Recently copied URLs -->
        <div v-if="urlList.length" class="copied-list">
          <div class="copied-header">
            <span class="url-label">最近复制</span>
          </div>
          <div v-for="item in urlList" :key="item" class="copied-item" @click="gotoUrl(item)">
            <span class="copied-icon">→</span>
            <span class="copied-text">{{ decodeURI(item) }}</span>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
export default {
  name: "ChangeView",

  data() {
    return {
      url: "",
      urlList: [],
      targetScheme: window.location.hash.substring(1),
      isShowHistory: false,
      history: [],
      copyText: "Copy",
      countDown: "5",
      showCloseMsg: false,
      origin: window.location.origin,
      title: "HELLO",
      countdownTimer: null,
      darkMode: false,
      searchQuery: "",
      urlError: "",
      cloudToken: "",
      cloudGistId: "",
      syncStatus: "", // '' | 'connecting' | 'connected' | 'error'
      syncError: "",
      syncTimer: null,
      lastSyncTime: null,
      showSettings: false,
    };
  },

  mounted() {
    if (this.targetScheme) {
      this.changeUrl(this.targetScheme);
    }
    try {
      const stored = JSON.parse(localStorage.getItem("scheme_history"));
      this.history = this.sortByTime(stored);
    } catch {
      this.history = [];
    }
    this.$nextTick(() => {
      if (this.$refs.urlInput) {
        this.$refs.urlInput.focus();
      }
    });
    // 加载云端配置并拉取数据
    this.loadCloudConfig();
  },
  beforeUnmount() {
    if (this.countdownTimer) {
      clearInterval(this.countdownTimer);
      this.countdownTimer = null;
    }
  },
  methods: {
    // 将输入归一化为可跳转的 URL：补上 https://
    normalizeUrl(url) {
      if (!url) return url;
      // 已有协议或为 URL Scheme → 原样返回
      if (/^[a-zA-Z][a-zA-Z0-9+.-]*:\/\//.test(url)) return url;
      // 裸域名 或 localhost → 补 https://
      return "https://" + url;
    },
    changeUrl(url) {
      // 防止定时器泄漏
      if (this.countdownTimer) {
        clearInterval(this.countdownTimer);
        this.countdownTimer = null;
      }
      const normalizedUrl = this.normalizeUrl(url);
      if (normalizedUrl) {
        window.location.replace(normalizedUrl);
        this.updateHistory(url);
      }
      if (window.location.hash.substring(1)) {
        this.showCloseMsg = true;
        this.title = "GOTO";
        this.countDown = 5;
        this.countdownTimer = setInterval(() => {
          this.countDown--;
          if (this.countDown <= 0) {
            clearInterval(this.countdownTimer);
            this.countdownTimer = null;
            try {
              window.close();
            } catch (e) {
              // 非脚本打开的窗口无法关闭，忽略
            }
          }
        }, 1000);
      }
    },
    gotoUrl(url) {
      navigator.clipboard.writeText(url).catch(() => {});
      window.open(url);
    },
    toHistoryUrl(url) {
      navigator.clipboard.writeText(window.location.origin + "/#" + url).catch(() => {});
      window.open(this.normalizeUrl(url));
    },
    updateHistory(scheme) {
      let time = Date.now();
      let scheme_history = this.history;
      if (!scheme_history || scheme_history.length === 0) {
        this.history = [{ scheme, count: 1, recently: time }];
        localStorage.setItem("scheme_history", JSON.stringify(this.history));
      } else {
        let scheme_index = scheme_history.findIndex((obj) => obj.scheme === scheme);
        if (scheme_index === -1) {
          scheme_history.push({ scheme, count: 1, recently: time });
        } else {
          scheme_history[scheme_index].count++;
          scheme_history[scheme_index].recently = time;
        }
        this.history = this.sortByTime(scheme_history);
        localStorage.setItem("scheme_history", JSON.stringify(this.history));
      }
      this.autoSync();
    },
    deleteHistoryItem(scheme) {
      this.history = this.history.filter((item) => item.scheme !== scheme);
      localStorage.setItem("scheme_history", JSON.stringify(this.history));
      this.autoSync();
    },
    invalidHistory() {
      if (!confirm("确定清空所有历史记录？此操作不可撤销。")) return;
      this.history = [];
      localStorage.setItem("scheme_history", JSON.stringify([]));
      this.autoSync();
    },
    exportHistory() {
      const data = JSON.stringify(this.history, null, 2);
      const blob = new Blob([data], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `scheme-history-${new Date().toISOString().slice(0, 10)}.json`;
      a.click();
      URL.revokeObjectURL(url);
    },
    importHistory() {
      this.$refs.importInput.click();
    },
    onImportFile(e) {
      const file = e.target.files[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = (ev) => {
        try {
          const imported = JSON.parse(ev.target.result);
          if (!Array.isArray(imported)) throw new Error("格式错误");
          // 合并：新增的追加，已有的保留计数较高的
          const merged = [...this.history];
          for (const item of imported) {
            if (!item.scheme) continue;
            const idx = merged.findIndex((m) => m.scheme === item.scheme);
            if (idx === -1) {
              merged.push({ scheme: item.scheme, count: item.count || 1, recently: item.recently || Date.now() });
            } else {
              merged[idx].count = Math.max(merged[idx].count, item.count || 1);
              merged[idx].recently = Math.max(merged[idx].recently, item.recently || 0);
            }
          }
          this.history = this.sortByTime(merged);
          localStorage.setItem("scheme_history", JSON.stringify(this.history));
        } catch {
          alert("导入失败：文件格式不正确");
        }
      };
      reader.readAsText(file);
      e.target.value = "";
    },
    // ─── GitHub Gist Sync ───
    GIST_FILENAME: "scheme-history.json",
    loadCloudConfig() {
      try {
        const raw = localStorage.getItem("cloud_config");
        if (raw) {
          const cfg = JSON.parse(raw);
          this.cloudToken = cfg.token || "";
          this.cloudGistId = cfg.gistId || "";
          if (this.cloudToken && this.cloudGistId) {
            this.syncStatus = "connected";
            this.syncFromGist();
          }
        }
      } catch {
        // ignore
      }
    },
    saveCloudConfig() {
      localStorage.setItem(
        "cloud_config",
        JSON.stringify({ token: this.cloudToken, gistId: this.cloudGistId })
      );
    },
    async connectGist() {
      const token = this.cloudToken.trim();
      if (!token) return;
      this.syncStatus = "connecting";
      this.syncError = "";
      try {
        // 验证 token
        const userRes = await fetch("https://api.github.com/user", {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!userRes.ok) throw new Error("Token 无效或已过期");
        // 查找已有 Gist 或创建新的
        let gistId = this.cloudGistId;
        if (!gistId) {
          const createRes = await fetch("https://api.github.com/gists", {
            method: "POST",
            headers: {
              Authorization: `Bearer ${token}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              description: "Scheme to URL - History Sync",
              public: false,
              files: {
                [this.GIST_FILENAME]: { content: JSON.stringify(this.history, null, 2) },
              },
            }),
          });
          if (!createRes.ok) throw new Error("Gist 创建失败");
          const gist = await createRes.json();
          gistId = gist.id;
        }
        this.cloudGistId = gistId;
        this.saveCloudConfig();
        this.syncStatus = "connected";
        this.lastSyncTime = Date.now();
        // 如果已有 gistId 但首次连接，先拉取再推
        if (this.cloudGistId && this.history.length === 0) {
          await this.syncFromGist();
        } else {
          await this.syncToGist(this.history);
        }
      } catch (e) {
        this.syncStatus = "error";
        this.syncError = e.message || "连接失败";
      }
    },
    disconnectGist() {
      this.cloudToken = "";
      this.cloudGistId = "";
      this.syncStatus = "";
      this.syncError = "";
      this.lastSyncTime = null;
      localStorage.removeItem("cloud_config");
    },
    async syncToGist(data) {
      if (!this.cloudToken || !this.cloudGistId) return;
      try {
        const res = await fetch(`https://api.github.com/gists/${this.cloudGistId}`, {
          method: "PATCH",
          headers: {
            Authorization: `Bearer ${this.cloudToken}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            files: {
              [this.GIST_FILENAME]: { content: JSON.stringify(data, null, 2) },
            },
          }),
        });
        if (!res.ok) throw new Error("同步失败");
        this.syncStatus = "connected";
        this.lastSyncTime = Date.now();
      } catch (e) {
        this.syncStatus = "error";
        this.syncError = e.message || "同步失败";
      }
    },
    async syncFromGist() {
      if (!this.cloudToken || !this.cloudGistId) return;
      try {
        const res = await fetch(`https://api.github.com/gists/${this.cloudGistId}`, {
          headers: { Authorization: `Bearer ${this.cloudToken}` },
        });
        if (!res.ok) throw new Error("拉取失败");
        const gist = await res.json();
        const remoteContent = gist.files?.[this.GIST_FILENAME]?.content;
        if (remoteContent) {
          const remote = JSON.parse(remoteContent);
          if (Array.isArray(remote)) {
            this.mergeHistory(remote);
            this.syncStatus = "connected";
            this.lastSyncTime = Date.now();
          }
        }
      } catch (e) {
        this.syncStatus = "error";
        this.syncError = e.message || "拉取失败";
      }
    },
    mergeHistory(remote) {
      if (!Array.isArray(remote) || remote.length === 0) return;
      const local = this.history;
      const map = new Map();
      for (const item of local) {
        map.set(item.scheme, item);
      }
      for (const item of remote) {
        if (!item.scheme) continue;
        const existing = map.get(item.scheme);
        if (!existing) {
          map.set(item.scheme, { ...item });
        } else {
          existing.count = Math.max(existing.count, item.count || 1);
          existing.recently = Math.max(existing.recently, item.recently || 0);
        }
      }
      this.history = this.sortByTime([...map.values()]);
      localStorage.setItem("scheme_history", JSON.stringify(this.history));
      // 推回云端合并后的结果
      this.syncToGist(this.history);
    },
    autoSync() {
      if (!this.cloudToken || !this.cloudGistId) return;
      if (this.syncTimer) clearTimeout(this.syncTimer);
      this.syncTimer = setTimeout(() => {
        this.syncToGist(this.history);
      }, 2000);
    },
    formatDate(timestamp) {
      function addLeadingZero(number) {
        if (number < 10) return `0${number}`;
        return number;
      }

      const date = new Date(timestamp);
      const now = new Date();

      const year = date.getFullYear();
      const month = addLeadingZero(date.getMonth() + 1);
      const day = addLeadingZero(date.getDate());
      const hour = addLeadingZero(date.getHours());
      const min = addLeadingZero(date.getMinutes());
      const second = addLeadingZero(date.getSeconds());

      const daysAgo = Math.floor((now - date) / (1000 * 60 * 60 * 24));

      if (daysAgo === 0) {
        return {
          info: `今天 ${hour}:${min}`,
          data: `${year}/${month}/${day} ${hour}:${min}:${second}`,
        };
      } else if (daysAgo === 1) {
        return {
          info: `昨天 ${hour}:${min}`,
          data: `${year}/${month}/${day} ${hour}:${min}:${second}`,
        };
      } else if (daysAgo <= 30) {
        return {
          info: `${month}/${day} ${daysAgo}天前`,
          data: `${year}/${month}/${day} ${hour}:${min}:${second}`,
        };
      }
      return {
        info: `${year}/${month}/${day}`,
        data: `${year}/${month}/${day} ${hour}:${min}:${second}`,
      };
    },
    truncateString(str, num) {
      if (str.length <= num) return str;
      return str.slice(0, num) + "...";
    },
    sortByTime(history) {
      if (history) {
        history = [...history].sort((a, b) => b.recently - a.recently);
      }
      return history || [];
    },
    validateUrl(val) {
      if (!val.trim()) return "";
      // 允许 URL Scheme（weixin://）、完整 URL（https://）、或裸域名（baidu.com）
      if (/^[a-zA-Z][a-zA-Z0-9+.-]*:\/\//.test(val)) return "";
      if (/^[a-zA-Z0-9][-a-zA-Z0-9]*\.[a-zA-Z]{2,}(\/|$|:)/.test(val)) return "";
      if (/^localhost(:\d+)?(\/|$)/.test(val)) return "";
      return "请输入有效的 URL、域名或 URL Scheme";
    },
    copy() {
      const scheme = this.url;

      // 空输入守卫
      if (!scheme.trim()) return;

      // 输入验证
      const error = this.validateUrl(scheme);
      if (error) {
        this.urlError = error;
        return;
      }

      navigator.clipboard
        .writeText(this.toUrl)
        .then(() => {
          this.copyText = "Copied!";
          // urlList 去重 + 上限 20
          const fullUrl = window.location.origin + "/#" + scheme;
          this.urlList = this.urlList.filter((u) => u !== fullUrl);
          this.urlList.unshift(fullUrl);
          if (this.urlList.length > 20) this.urlList.pop();

          this.updateHistory(scheme);
          this.url = "";
          setTimeout(() => {
            this.copyText = "Copy";
          }, 1200);
        })
        .catch(() => {
          this.copyText = "Failed";
          setTimeout(() => {
            this.copyText = "Copy";
          }, 1500);
        });
    },
    handleKeydown(e) {
      // Cmd/Ctrl + Enter → 复制
      if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
        e.preventDefault();
        this.copy();
      }
      // Escape → 清空输入
      if (e.key === "Escape" && !this.isShowHistory) {
        this.url = "";
        this.urlError = "";
        this.$refs.urlInput?.focus();
      }
      // H → 切换历史
      if (e.key === "h" || e.key === "H") {
        if (!e.metaKey && !e.ctrlKey && !e.altKey) {
          this.isShowHistory = !this.isShowHistory;
        }
      }
    },
  },
  watch: {
    url(val) {
      if (val && this.urlError) {
        this.urlError = this.validateUrl(val);
      }
    },
    $route(to) {
      const hash = to.hash.substring(1);
      if (hash) {
        this.targetScheme = hash;
        this.changeUrl(hash);
      }
    },
  },
  computed: {
    toUrl() {
      return encodeURI(window.location.origin + "/#" + this.url);
    },
    filteredHistory() {
      if (!this.searchQuery.trim()) return this.history;
      const q = this.searchQuery.toLowerCase();
      return this.history.filter((item) => item.scheme.toLowerCase().includes(q));
    },
  },
};
</script>

<style scoped>
/* ─── CSS Custom Properties (Light — default) ─── */
.box {
  --card-bg: #efe9de;
  --card-text: #141413;
  --card-text-soft: #3d3d3a;
  --card-text-muted: #8e8b82;
  --surface-soft: #f5f0e8;
  --surface-elevated: #faf9f5;
  --hairline: #e6dfd8;
  --hairline-strong: #c4bfb6;
  --accent: #5b7fab;
}

/* ─── Dark Mode ─── */
.box.dark {
  --card-bg: #181715;
  --card-text: #faf9f5;
  --card-text-soft: #a09d96;
  --card-text-muted: #6c6a64;
  --surface-soft: #1f1e1b;
  --surface-elevated: #252320;
  --hairline: #3d3d3a;
  --hairline-strong: #6c6a64;
  --accent: #5b7fab;
}

/* ─── Layout ─── */
.box {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-height: 100vh;
  padding: 32px 16px;
  position: relative;
  outline: none;
  transition: background 0.3s ease;
  background: #faf9f5;
}

.box.dark {
  background: #131210;
}

/* ─── Theme Toggle ─── */
.theme-toggle {
  position: fixed;
  top: 16px;
  right: 16px;
  width: 36px;
  height: 36px;
  border-radius: 50%;
  border: 1px solid var(--hairline);
  background: var(--card-bg);
  color: var(--card-text);
  font-size: 16px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s ease;
  z-index: 10;
}

.theme-toggle:hover {
  border-color: var(--accent);
}

/* ─── Tool Card ─── */
.tool-card {
  width: 100%;
  max-width: 560px;
  background: var(--card-bg);
  border-radius: 12px;
  padding: 32px;
  color: var(--card-text);
  transition: background 0.3s ease, color 0.3s ease;
}

/* ─── Header ─── */
.tool-card-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  margin-bottom: 24px;
  gap: 12px;
}

.title-group {
  flex: 1;
  min-width: 0;
}

.tool-title {
  font-family: 'Cormorant Garamond', 'Times New Roman', serif;
  font-size: 28px;
  font-weight: 400;
  letter-spacing: -0.04em;
  color: var(--card-text);
  margin: 0;
  cursor: pointer;
  position: relative;
}

.tool-title::after {
  content: '';
  display: block;
  width: 48px;
  height: 3px;
  background: var(--accent);
  margin-top: 6px;
}

.tool-subtitle {
  font-family: 'Inter', sans-serif;
  font-size: 13px;
  line-height: 1.5;
  color: var(--card-text-muted);
  margin: 8px 0 0;
}

.tool-subtitle strong {
  font-weight: 500;
  color: var(--accent);
}

/* ─── Mode Toggle ─── */
.mode-toggle {
  font-family: 'Inter', sans-serif;
  font-size: 12px;
  font-weight: 500;
  letter-spacing: 0.04em;
  text-transform: uppercase;
  color: var(--card-text-muted);
  background: transparent;
  border: 1px solid var(--hairline);
  border-radius: 9999px;
  padding: 4px 14px;
  cursor: pointer;
  transition: all 0.2s ease;
  white-space: nowrap;
  margin-top: 4px;
  flex-shrink: 0;
}

.mode-toggle:hover {
  color: var(--card-text);
  border-color: var(--hairline-strong);
}

.mode-toggle.active {
  color: var(--accent);
  border-color: var(--accent);
}

/* ─── Sections ─── */
.section {
  animation: fadeIn 0.2s ease;
}

@keyframes fadeIn {
  from {
    opacity: 0;
    transform: translateY(4px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

/* ─── Close Message ─── */
.close-msg {
  text-align: center;
  padding: 24px 0 8px;
}

.close-text {
  font-family: 'Inter', sans-serif;
  font-size: 16px;
  line-height: 1.55;
  color: var(--card-text-soft);
  margin-bottom: 8px;
}

.countdown-num {
  font-family: 'JetBrains Mono', monospace;
  font-weight: 500;
  color: var(--accent);
  font-size: 20px;
}

.close-sub {
  font-family: 'Inter', sans-serif;
  font-size: 14px;
  line-height: 1.55;
  color: var(--card-text-muted);
}

/* ─── Input Row ─── */
.input-row {
  display: flex;
  gap: 10px;
  align-items: flex-start;
}

.input-wrap {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.text-input {
  width: 100%;
  height: 40px;
  padding: 0 14px;
  background: var(--surface-elevated);
  border: 1px solid var(--hairline);
  border-radius: 8px;
  font-family: 'Inter', sans-serif;
  font-size: 15px;
  color: var(--card-text);
  outline: none;
  transition: border-color 0.2s ease, background 0.3s ease, color 0.3s ease;
}

.text-input::placeholder {
  color: var(--card-text-muted);
}

.text-input:focus {
  border-color: var(--accent);
}

.text-input.input-error {
  border-color: #c64545;
}

.input-error-msg {
  font-family: 'Inter', sans-serif;
  font-size: 12px;
  color: #c64545;
  line-height: 1.4;
}

/* ─── Copy Button ─── */
.copy-btn {
  height: 40px;
  padding: 0 20px;
  border: none;
  border-radius: 8px;
  background: var(--accent);
  color: #ffffff;
  font-family: 'Inter', sans-serif;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: background 0.2s ease, transform 0.1s ease, opacity 0.2s ease;
  white-space: nowrap;
  flex-shrink: 0;
}

.copy-btn:hover:not(:disabled) {
  background: #43658a;
}

.copy-btn:active:not(:disabled) {
  transform: scale(0.97);
}

.copy-btn:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}

.copy-btn.copied {
  background: #5db872;
}

.copy-btn.failed {
  background: #c64545;
}

/* ─── Generated URL ─── */
.url-display {
  margin-top: 16px;
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.url-label {
  font-family: 'Inter', sans-serif;
  font-size: 11px;
  font-weight: 500;
  letter-spacing: 0.04em;
  text-transform: uppercase;
  color: var(--card-text-muted);
}

.url-text {
  font-family: 'JetBrains Mono', monospace;
  font-size: 13px;
  line-height: 1.5;
  color: var(--accent);
  cursor: pointer;
  word-break: break-all;
  padding: 8px 12px;
  background: var(--surface-elevated);
  border-radius: 8px;
  transition: background 0.15s ease;
}

.url-text:hover {
  background: var(--surface-soft);
  text-decoration: underline;
}

/* ─── Copied URL List ─── */
.copied-list {
  margin-top: 20px;
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.copied-header {
  margin-bottom: 2px;
}

.copied-item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 12px;
  background: var(--surface-elevated);
  border-radius: 8px;
  cursor: pointer;
  transition: background 0.15s ease;
}

.copied-item:hover {
  background: var(--surface-soft);
}

.copied-icon {
  font-family: 'Inter', sans-serif;
  font-size: 12px;
  color: var(--accent);
  flex-shrink: 0;
}

.copied-text {
  font-family: 'JetBrains Mono', monospace;
  font-size: 12px;
  line-height: 1.5;
  color: var(--card-text-muted);
  word-break: break-all;
}

.copied-item:hover .copied-text {
  color: var(--card-text);
}

/* ─── Search ─── */
.search-row {
  margin-bottom: 12px;
}

.search-input {
  width: 100%;
  height: 36px;
  padding: 0 12px;
  background: var(--surface-elevated);
  border: 1px solid var(--hairline);
  border-radius: 8px;
  font-family: 'Inter', sans-serif;
  font-size: 13px;
  color: var(--card-text);
  outline: none;
  transition: border-color 0.2s ease;
}

.search-input::placeholder {
  color: var(--card-text-muted);
}

.search-input:focus {
  border-color: var(--accent);
}

/* ─── History ─── */
.history-section {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.history-empty {
  text-align: center;
  padding: 32px 0;
  font-family: 'Inter', sans-serif;
  font-size: 14px;
  color: var(--card-text-muted);
}

.history-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  padding: 10px 12px;
  background: var(--surface-elevated);
  border-radius: 8px;
  margin-bottom: 4px;
  cursor: pointer;
  transition: background 0.15s ease;
}

.history-item:hover {
  background: var(--surface-soft);
}

.history-scheme {
  flex: 1;
  min-width: 0;
  font-family: 'JetBrains Mono', monospace;
  font-size: 13px;
  color: var(--card-text);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.history-meta {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-shrink: 0;
}

.count-badge {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 22px;
  height: 20px;
  padding: 0 6px;
  background: var(--hairline);
  border-radius: 9999px;
  font-family: 'Inter', sans-serif;
  font-size: 11px;
  font-weight: 500;
  color: var(--card-text-muted);
}

.history-date {
  font-family: 'Inter', sans-serif;
  font-size: 12px;
  color: var(--card-text-muted);
  white-space: nowrap;
}

/* ─── Delete Item Button ─── */
.delete-item-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 20px;
  height: 20px;
  border: none;
  border-radius: 50%;
  background: transparent;
  color: var(--hairline-strong);
  font-size: 14px;
  line-height: 1;
  cursor: pointer;
  opacity: 0;
  transition: all 0.15s ease;
  padding: 0;
}

.history-item:hover .delete-item-btn {
  opacity: 1;
}

.delete-item-btn:hover {
  background: #c64545;
  color: #ffffff;
}

/* ─── History Footer ─── */
.history-footer {
  display: flex;
  flex-direction: column;
  gap: 12px;
  margin-top: 16px;
  padding-top: 16px;
  border-top: 1px solid var(--hairline);
}

.history-footer-left {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}

.clear-btn,
.outline-btn {
  background: transparent;
  border: 1px solid var(--hairline);
  border-radius: 8px;
  padding: 6px 14px;
  font-family: 'Inter', sans-serif;
  font-size: 13px;
  font-weight: 500;
  color: var(--card-text-muted);
  cursor: pointer;
  transition: all 0.2s ease;
}

.clear-btn:hover,
.outline-btn:hover {
  color: var(--card-text);
  border-color: var(--hairline-strong);
}

.history-note {
  font-family: 'Inter', sans-serif;
  font-size: 12px;
  color: var(--card-text-muted);
}

.history-note a {
  color: var(--accent);
  text-decoration: none;
}

.history-note a:hover {
  text-decoration: underline;
}

/* ─── Settings Panel ─── */
.settings-panel {
  margin-top: 16px;
  padding: 16px;
  background: var(--surface-elevated);
  border-radius: 8px;
  display: flex;
  flex-direction: column;
  gap: 10px;
  animation: fadeIn 0.2s ease;
}

.settings-header {
  font-family: 'Inter', sans-serif;
  font-size: 13px;
  font-weight: 500;
  color: var(--card-text);
}

.settings-row {
  display: flex;
  align-items: center;
  gap: 10px;
}

.settings-input {
  height: 34px;
  font-size: 13px;
  width: 100%;
}

.settings-actions {
  flex-wrap: wrap;
}

.settings-info {
  font-family: 'Inter', sans-serif;
  font-size: 12px;
  color: var(--card-text-muted);
  gap: 12px;
  flex-wrap: wrap;
}

.sync-status {
  font-family: 'Inter', sans-serif;
  font-size: 12px;
  font-weight: 500;
}

.sync-status.connected {
  color: #5db872;
}

.sync-status.connecting {
  color: var(--accent);
}

.sync-status.error {
  color: #c64545;
}

/* ─── Text Link ─── */
.text-link {
  color: var(--accent);
  cursor: pointer;
  text-decoration: none;
}

.text-link:hover {
  text-decoration: underline;
}

/* ─── Screen Reader Only ─── */
.sr-only {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
  border: 0;
}

/* ─── Responsive ─── */
@media (max-width: 600px) {
  .box {
    padding: 16px 12px;
    justify-content: flex-start;
    padding-top: 48px;
  }

  .tool-card {
    padding: 24px 20px;
  }

  .tool-title {
    font-size: 24px;
  }

  .input-row {
    flex-direction: column;
    gap: 8px;
  }

  .text-input {
    width: 100%;
  }

  .copy-btn {
    width: 100%;
  }

  .history-item {
    flex-direction: column;
    align-items: flex-start;
    gap: 6px;
  }

  .history-meta {
    width: 100%;
    justify-content: space-between;
  }

  .history-footer-left {
    width: 100%;
    justify-content: stretch;
  }

  .clear-btn,
  .outline-btn {
    flex: 1;
    text-align: center;
  }
}
</style>
