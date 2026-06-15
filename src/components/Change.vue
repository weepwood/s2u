<template>
  <div class="box">
    <div class="tool-card">
      <!-- Header -->
      <div class="tool-card-header">
        <h1 class="tool-title">{{ isShowHistory ? "HISTORY" : title }}</h1>
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
          本页面将在 <strong class="countdown-num">{{ countDown }}</strong> 秒后自动关闭
        </p>
        <p class="close-sub">
          需要创建链接请访问
          <a class="text-link" @click="changeUrl(origin)">{{ origin }}</a>
        </p>
      </div>

      <!-- History mode -->
      <div v-else-if="isShowHistory" class="section history-section">
        <div v-if="history.length === 0" class="history-empty">
          <p>暂无历史记录</p>
        </div>
        <div v-for="item in history" :key="item.scheme" class="history-item">
          <div class="history-scheme" @click="toHistoryUrl(item.scheme)">
            <span :title="item.scheme">{{ truncateString(item.scheme, 30) }}</span>
          </div>
          <div class="history-meta">
            <span class="count-badge">{{ item.count }}</span>
            <span class="history-date" :title="formatDate(item.recently).data">
              {{ formatDate(item.recently).info }}
            </span>
          </div>
        </div>
        <div class="history-footer">
          <button class="clear-btn" @click="invalidHistory">清空记录</button>
          <span class="history-note"
            >所有记录均存放在本地，
            <a href="https://github.com/weepwood/weepwood-scheme-to-url" target="_blank" rel="noopener">源代码</a></span
          >
        </div>
      </div>

      <!-- Normal input mode -->
      <div v-else class="section input-section">
        <div class="input-row">
          <label for="url" class="sr-only">需要跳转的地址</label>
          <input
            id="url"
            ref="urlInput"
            v-model="url"
            class="text-input"
            placeholder="需要跳转的地址"
            @keydown.enter="copy"
          />
          <button class="copy-btn" :class="{ copied: copyText !== 'Copy' }" @click="copy">
            {{ copyText }}
          </button>
        </div>

        <!-- Generated URL display -->
        <div v-if="url" class="url-display">
          <span class="url-label">Generated URL</span>
          <span class="url-text" @click="gotoUrl(toUrl)">
            {{ decodeURI(toUrl) }}
          </span>
        </div>

        <!-- Recently copied URLs -->
        <div v-if="urlList.length" class="copied-list">
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
  components: {},

  data() {
    return {
      time: Date.now(),
      url: "",
      urlList: [],
      targetScheme: window.location.hash.substring(1),
      isShowLink: false,
      isShowHistory: false,
      history: [],
      msg: "",
      copyText: "Copy",
      countDown: "5",
      showCloseMsg: false,
      origin: window.location.origin,
      title: "HELLO",
      countdownTimer: null,
    };
  },

  created() {},
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
  },
  beforeUnmount() {
    if (this.countdownTimer) {
      clearInterval(this.countdownTimer);
      this.countdownTimer = null;
    }
  },
  methods: {
    changeUrl(url) {
      if (url) {
        window.location.replace(url);
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
      window.open(url);
    },
    updateHistory(scheme) {
      let time = Date.now();
      let scheme_history = this.history;
      if (!scheme_history || scheme_history.length === 0) {
        const scheme_info = {
          scheme: scheme,
          count: 1,
          recently: time,
        };
        this.history = [scheme_info];
        localStorage.setItem("scheme_history", JSON.stringify([scheme_info]));
      } else {
        let scheme_index = scheme_history.findIndex((obj) => obj.scheme === scheme);
        if (scheme_index === -1) {
          scheme_history.push({ scheme: scheme, count: 1, recently: time });
        } else {
          scheme_history[scheme_index].count++;
          scheme_history[scheme_index].recently = time;
        }
        this.history = this.sortByTime(scheme_history);
        localStorage.setItem("scheme_history", JSON.stringify(this.history));
      }
    },
    invalidHistory() {
      localStorage.removeItem("scheme_history");
      location.reload();
    },
    formatDate(timestamp) {
      function addLeadingZero(number) {
        if (number < 10) {
          return `0${number}`;
        }
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
          info: `${year}/${month}/${day} 今天`,
          data: `${year}/${month}/${day} ${hour}:${min}:${second}`,
        };
      } else if (daysAgo === 1) {
        return {
          info: `${year}/${month}/${day} 昨天`,
          data: `${year}/${month}/${day} ${hour}:${min}:${second}`,
        };
      }
      return {
        info: `${year}/${month}/${day} ${daysAgo}天前`,
        data: `${year}/${month}/${day} ${hour}:${min}:${second}`,
      };
    },
    truncateString(str, num) {
      if (str.length <= num) {
        return str;
      }
      return str.slice(0, num) + "...";
    },
    sortByTime(history) {
      if (history) {
        history = [...history].sort((a, b) => b.recently - a.recently);
      }
      return history || [];
    },
    copy() {
      const scheme = this.url;
      navigator.clipboard
        .writeText(this.toUrl)
        .then(() => {
          this.copyText = "Copied!";
          this.urlList.unshift(window.location.origin + "/#" + scheme);
          this.updateHistory(scheme);
          this.url = "";
          setTimeout(() => {
            this.copyText = "Copy";
          }, 1200);
        })
        .catch(() => {});
    },
  },
  watch: {
    $route: function (to) {
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
  },
};
</script>

<style scoped>
/* ─── Layout ─── */
.box {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-height: 100vh;
  padding: 32px 16px;
}

/* ─── Tool Card ─── */
.tool-card {
  width: 100%;
  max-width: 560px;
  background: #ffffff;
  border-radius: 12px;
  padding: 32px;
  color: #141413;
  box-shadow: 0 1px 4px rgba(20, 20, 19, 0.06);
}

/* ─── Header ─── */
.tool-card-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  margin-bottom: 28px;
}

.tool-title {
  font-family: 'Cormorant Garamond', 'Times New Roman', serif;
  font-size: 28px;
  font-weight: 400;
  letter-spacing: -0.02em;
  color: #141413;
  margin: 0;
  cursor: pointer;
  position: relative;
}

.tool-title::after {
  content: '';
  display: block;
  width: 48px;
  height: 3px;
  background: #5b7fab;
  margin-top: 6px;
}

/* ─── Mode Toggle ─── */
.mode-toggle {
  font-family: 'Inter', sans-serif;
  font-size: 12px;
  font-weight: 500;
  letter-spacing: 0.04em;
  text-transform: uppercase;
  color: #8e8b82;
  background: transparent;
  border: 1px solid #e6dfd8;
  border-radius: 9999px;
  padding: 4px 14px;
  cursor: pointer;
  transition: all 0.2s ease;
  white-space: nowrap;
  margin-top: 4px;
}

.mode-toggle:hover {
  color: #141413;
  border-color: #c4bfb6;
}

.mode-toggle.active {
  color: #5b7fab;
  border-color: #5b7fab;
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
  color: #3d3d3a;
  margin-bottom: 8px;
}

.countdown-num {
  font-family: 'JetBrains Mono', monospace;
  font-weight: 500;
  color: #5b7fab;
  font-size: 20px;
}

.close-sub {
  font-family: 'Inter', sans-serif;
  font-size: 14px;
  line-height: 1.55;
  color: #8e8b82;
}

/* ─── Input Row ─── */
.input-row {
  display: flex;
  gap: 10px;
  align-items: center;
}

.text-input {
  flex: 1;
  height: 40px;
  padding: 0 14px;
  background: #faf9f5;
  border: 1px solid #e6dfd8;
  border-radius: 8px;
  font-family: 'Inter', sans-serif;
  font-size: 15px;
  color: #141413;
  outline: none;
  transition: border-color 0.2s ease;
}

.text-input::placeholder {
  color: #8e8b82;
}

.text-input:focus {
  border-color: #5b7fab;
}

/* ─── Copy Button ─── */
.copy-btn {
  height: 40px;
  padding: 0 20px;
  border: none;
  border-radius: 8px;
  background: #5b7fab;
  color: #ffffff;
  font-family: 'Inter', sans-serif;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: background 0.2s ease, transform 0.1s ease;
  white-space: nowrap;
  flex-shrink: 0;
}

.copy-btn:hover {
  background: #43658a;
}

.copy-btn:active {
  transform: scale(0.97);
}

.copy-btn.copied {
  background: #5db872;
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
  color: #8e8b82;
}

.url-text {
  font-family: 'JetBrains Mono', monospace;
  font-size: 13px;
  line-height: 1.5;
  color: #5b7fab;
  cursor: pointer;
  word-break: break-all;
  padding: 8px 12px;
  background: #faf9f5;
  border-radius: 8px;
  transition: background 0.15s ease;
}

.url-text:hover {
  background: #f5f0e8;
  text-decoration: underline;
}

/* ─── Copied URL List ─── */
.copied-list {
  margin-top: 20px;
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.copied-item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 12px;
  background: #faf9f5;
  border-radius: 8px;
  cursor: pointer;
  transition: background 0.15s ease;
}

.copied-item:hover {
  background: #f5f0e8;
}

.copied-icon {
  font-family: 'Inter', sans-serif;
  font-size: 12px;
  color: #5b7fab;
  flex-shrink: 0;
}

.copied-text {
  font-family: 'JetBrains Mono', monospace;
  font-size: 12px;
  line-height: 1.5;
  color: #8e8b82;
  word-break: break-all;
}

.copied-item:hover .copied-text {
  color: #141413;
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
  color: #8e8b82;
}

.history-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 10px 12px;
  background: #faf9f5;
  border-radius: 8px;
  margin-bottom: 4px;
  cursor: pointer;
  transition: background 0.15s ease;
}

.history-item:hover {
  background: #f5f0e8;
}

.history-scheme {
  flex: 1;
  min-width: 0;
  font-family: 'JetBrains Mono', monospace;
  font-size: 13px;
  color: #141413;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.history-meta {
  display: flex;
  align-items: center;
  gap: 10px;
  flex-shrink: 0;
}

.count-badge {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 22px;
  height: 20px;
  padding: 0 6px;
  background: #e6dfd8;
  border-radius: 9999px;
  font-family: 'Inter', sans-serif;
  font-size: 11px;
  font-weight: 500;
  color: #6c6a64;
}

.history-date {
  font-family: 'Inter', sans-serif;
  font-size: 12px;
  color: #8e8b82;
  white-space: nowrap;
}

/* ─── History Footer ─── */
.history-footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-top: 16px;
  padding-top: 16px;
  border-top: 1px solid #e6dfd8;
}

.clear-btn {
  background: transparent;
  border: 1px solid #e6dfd8;
  border-radius: 8px;
  padding: 6px 16px;
  font-family: 'Inter', sans-serif;
  font-size: 13px;
  font-weight: 500;
  color: #8e8b82;
  cursor: pointer;
  transition: all 0.2s ease;
}

.clear-btn:hover {
  color: #141413;
  border-color: #c4bfb6;
}

.history-note {
  font-family: 'Inter', sans-serif;
  font-size: 12px;
  color: #8e8b82;
}

.history-note a {
  color: #5b7fab;
  text-decoration: none;
}

.history-note a:hover {
  text-decoration: underline;
}

/* ─── Text Link ─── */
.text-link {
  color: #5b7fab;
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

  .history-footer {
    flex-direction: column;
    gap: 12px;
    align-items: flex-start;
  }
}
</style>
