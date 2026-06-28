/**
 * Dify Chat 机器人 - 主应用逻辑
 */

// ============ 全局状态 ============
const config = {
  baseUrl: localStorage.getItem('dify_baseUrl') || 'https://api.dify.ai/v1',
  apiKey: localStorage.getItem('dify_apiKey') || 'app-eOcN4IAacPJDgAeoJ8RBugyJ',
  user: localStorage.getItem('dify_user') || 'user-123',
};

let dify = new DifyAPI(config.baseUrl, config.apiKey, config.user);

const state = {
  currentConversationId: '',
  conversations: [],
  messages: [],
  isGenerating: false,
  currentTaskId: '',
  pendingFiles: [], // 待发送的文件 [{file, fileId, preview, type}]
  appParameters: null,
  appMeta: null,
  inputVariables: {}, // 用户填写的输入变量值
  // 录音相关
  mediaRecorder: null,
  audioChunks: [],
  recordingStream: null,
};

// ============ DOM 元素引用 ============
const $ = (id) => document.getElementById(id);
const dom = {
  sidebar: $('sidebar'),
  conversationList: $('conversationList'),
  btnNewChat: $('btnNewChat'),
  btnSettings: $('btnSettings'),
  btnToggleSidebar: $('btnToggleSidebar'),
  chatTitle: $('chatTitle'),
  btnAppInfo: $('btnAppInfo'),
  messagesContainer: $('messagesContainer'),
  welcomeScreen: $('welcomeScreen'),
  messagesList: $('messagesList'),
  typingIndicator: $('typingIndicator'),
  messageInput: $('messageInput'),
  btnSend: $('btnSend'),
  btnStop: $('btnStop'),
  btnAttach: $('btnAttach'),
  btnMic: $('btnMic'),
  fileInput: $('fileInput'),
  filePreviewList: $('filePreviewList'),
  inputVariables: $('inputVariables'),
  // 弹窗
  settingsModal: $('settingsModal'),
  appInfoModal: $('appInfoModal'),
  recordingModal: $('recordingModal'),
  settingBaseUrl: $('settingBaseUrl'),
  settingApiKey: $('settingApiKey'),
  settingUser: $('settingUser'),
  btnSaveSettings: $('btnSaveSettings'),
  appInfoBody: $('appInfoBody'),
  toastContainer: $('toastContainer'),
  audioPlayer: $('audioPlayer'),
  btnStopRecording: $('btnStopRecording'),
  btnCancelRecording: $('btnCancelRecording'),
  btnFinishRecording: $('btnFinishRecording'),
  recordingStatus: $('recordingStatus'),
  welcomeTitle: $('welcomeTitle'),
  welcomeDesc: $('welcomeDesc'),
};

// ============ 工具函数 ============
function showToast(message, type = 'info', duration = 3000) {
  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  const icons = { success: '✅', error: '❌', info: 'ℹ️', warning: '⚠️' };
  toast.innerHTML = `<span>${icons[type] || ''}</span><span>${message}</span>`;
  dom.toastContainer.appendChild(toast);
  setTimeout(() => {
    toast.style.animation = 'slideIn 0.2s ease reverse';
    setTimeout(() => toast.remove(), 200);
  }, duration);
}

function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

function renderMarkdown(text) {
  try {
    marked.setOptions({ breaks: true, gfm: true });
    let html = marked.parse(text);
    // 代码高亮
    const temp = document.createElement('div');
    temp.innerHTML = html;
    temp.querySelectorAll('pre code').forEach(block => {
      try { hljs.highlightElement(block); } catch (e) {}
    });
    return temp.innerHTML;
  } catch (e) {
    return escapeHtml(text);
  }
}

function autoResizeTextarea() {
  const el = dom.messageInput;
  el.style.height = 'auto';
  el.style.height = Math.min(el.scrollHeight, 200) + 'px';
}

// ============ 测试辅助函数 ============
// 每个功能完成后，调用 testResult 记录测试结果
const testResults = {};
async function testFunctionality(name, testFn) {
  console.group(`🧪 测试功能：${name}`);
  try {
    const result = await testFn();
    testResults[name] = { status: 'PASS', detail: result };
    console.log(`✅ [${name}] 测试通过：`, result);
    showToast(`功能"${name}"测试通过 ✅`, 'success');
  } catch (err) {
    testResults[name] = { status: 'FAIL', detail: err.message };
    console.error(`❌ [${name}] 测试失败：`, err);
    showToast(`功能"${name}"测试失败 ❌: ${err.message}`, 'error', 5000);
  }
  console.groupEnd();
  return testResults[name];
}

// ============ 消息渲染 ============
function addMessageToUI(role, content, options = {}) {
  // 隐藏欢迎屏
  dom.welcomeScreen.style.display = 'none';

  const msgEl = document.createElement('div');
  msgEl.className = `message ${role === 'user' ? 'user' : 'bot'}`;
  if (options.messageId) msgEl.dataset.messageId = options.messageId;

  const avatar = role === 'user' ? '👤' : '🤖';
  const roleLabel = role === 'user' ? '你' : '助手';

  let filesHtml = '';
  if (options.files && options.files.length > 0) {
    filesHtml = '<div class="message-files">' + options.files.map(f => {
      if (f.type === 'image' || f.preview) {
        return `<img src="${f.preview || f.url}" alt="${f.name || ''}" onclick="window.open('${f.preview || f.url}', '_blank')" />`;
      }
      return `<div class="message-file">📎 ${escapeHtml(f.name || '文件')}</div>`;
    }).join('') + '</div>';
  }

  const contentHtml = role === 'user'
    ? escapeHtml(content).replace(/\n/g, '<br>')
    : renderMarkdown(content);

  let actionsHtml = '';
  if (role === 'bot' && options.messageId) {
    actionsHtml = `
      <div class="message-actions">
        <button class="msg-action-btn btn-copy" title="复制">📋 复制</button>
        <button class="msg-action-btn btn-tts" title="朗读">🔊 朗读</button>
        <button class="msg-action-btn btn-like" title="点赞">👍</button>
        <button class="msg-action-btn btn-dislike" title="点踩">👎</button>
      </div>`;
  }

  msgEl.innerHTML = `
    <div class="message-avatar">${avatar}</div>
    <div class="message-body">
      <div class="message-role">${roleLabel}</div>
      ${filesHtml}
      <div class="message-content">${contentHtml}</div>
      ${actionsHtml}
    </div>
  `;

  dom.messagesList.appendChild(msgEl);

  // 绑定操作按钮事件
  if (role === 'bot' && options.messageId) {
    bindMessageActions(msgEl, options.messageId, content);
  }

  // 滚动到底部
  scrollToBottom();
  return msgEl;
}

function bindMessageActions(msgEl, messageId, content) {
  const copyBtn = msgEl.querySelector('.btn-copy');
  const ttsBtn = msgEl.querySelector('.btn-tts');
  const likeBtn = msgEl.querySelector('.btn-like');
  const dislikeBtn = msgEl.querySelector('.btn-dislike');

  copyBtn.addEventListener('click', () => {
    navigator.clipboard.writeText(content).then(() => {
      showToast('已复制到剪贴板', 'success');
    });
  });

  ttsBtn.addEventListener('click', async () => {
    await playTextToSpeech(content, messageId);
  });

  likeBtn.addEventListener('click', async () => {
    const isActive = likeBtn.classList.contains('active');
    const rating = isActive ? null : 'like';
    likeBtn.classList.toggle('active', !isActive);
    dislikeBtn.classList.remove('active');
    await sendMessageFeedback(messageId, rating);
  });

  dislikeBtn.addEventListener('click', async () => {
    const isActive = dislikeBtn.classList.contains('active');
    const rating = isActive ? null : 'dislike';
    dislikeBtn.classList.toggle('active', !isActive);
    likeBtn.classList.remove('active');
    await sendMessageFeedback(messageId, rating);
  });
}

function scrollToBottom() {
  dom.messagesContainer.scrollTop = dom.messagesContainer.scrollHeight;
}

function updateLastBotMessage(text, msgEl) {
  const contentEl = msgEl.querySelector('.message-content');
  contentEl.innerHTML = renderMarkdown(text);
  scrollToBottom();
}

// ============ 功能1：发送对话消息（流式） ============
async function sendMessage() {
  const query = dom.messageInput.value.trim();
  if (!query && state.pendingFiles.length === 0) return;
  if (state.isGenerating) return;

  // 准备文件
  const files = state.pendingFiles.map(f => ({
    type: f.type || 'image',
    transfer_method: 'local_file',
    upload_file_id: f.fileId,
  }));

  // 显示用户消息
  addMessageToUI('user', query, {
    files: state.pendingFiles.map(f => ({
      type: f.type,
      name: f.name,
      preview: f.preview,
    })),
  });

  // 清空输入
  dom.messageInput.value = '';
  autoResizeTextarea();
  clearPendingFiles();

  // 设置生成状态
  state.isGenerating = true;
  dom.btnSend.style.display = 'none';
  dom.btnStop.style.display = 'flex';

  // 创建机器人消息占位
  const botMsgEl = addMessageToUI('bot', '');
  let fullResponse = '';
  let messageId = '';

  try {
    await dify.sendChatMessage({
      query,
      inputs: state.inputVariables,
      conversationId: state.currentConversationId,
      files,
      responseMode: 'streaming',
      onMessage: (data) => {
        fullResponse += data.answer || '';
        if (data.message_id) messageId = data.message_id;
        if (data.task_id) state.currentTaskId = data.task_id;
        if (data.conversation_id && !state.currentConversationId) {
          state.currentConversationId = data.conversation_id;
          // 新会话，刷新会话列表
          loadConversations();
        }
        updateLastBotMessage(fullResponse, botMsgEl);
      },
      onMessageEnd: (data) => {
        if (data.message_id) messageId = data.message_id;
        if (data.conversation_id) {
          state.currentConversationId = data.conversation_id;
        }
        botMsgEl.dataset.messageId = messageId;
        // 重新绑定操作按钮
        const actionsEl = botMsgEl.querySelector('.message-actions');
        if (!actionsEl) {
          const body = botMsgEl.querySelector('.message-body');
          body.insertAdjacentHTML('beforeend', `
            <div class="message-actions">
              <button class="msg-action-btn btn-copy" title="复制">📋 复制</button>
              <button class="msg-action-btn btn-tts" title="朗读">🔊 朗读</button>
              <button class="msg-action-btn btn-like" title="点赞">👍</button>
              <button class="msg-action-btn btn-dislike" title="点踩">👎</button>
            </div>`);
          bindMessageActions(botMsgEl, messageId, fullResponse);
        }
        // 更新会话列表名称
        loadConversations();
      },
      onError: (data) => {
        console.error('Stream error:', data);
        showToast(`错误: ${data.msg || data.message || '未知错误'}`, 'error', 5000);
      },
    });
  } catch (err) {
    if (err.name === 'AbortError') {
      showToast('已停止生成', 'info');
    } else {
      console.error('Send message error:', err);
      showToast(`发送失败: ${err.message}`, 'error', 5000);
      updateLastBotMessage(`❌ 错误：${err.message}`, botMsgEl);
    }
  } finally {
    state.isGenerating = false;
    state.currentTaskId = '';
    dom.btnSend.style.display = 'flex';
    dom.btnStop.style.display = 'none';
  }
}

// ============ 功能2：会话列表管理 ============
async function loadConversations() {
  try {
    const data = await dify.getConversations();
    state.conversations = data.data || [];
    renderConversationList();
    // 更新当前会话标题
    updateChatTitle();
    return state.conversations;
  } catch (err) {
    console.error('Load conversations error:', err);
    showToast(`加载会话列表失败: ${err.message}`, 'error');
    return [];
  }
}

function renderConversationList() {
  dom.conversationList.innerHTML = '';
  if (state.conversations.length === 0) {
    dom.conversationList.innerHTML = '<div style="padding:20px;text-align:center;color:var(--text-muted);font-size:13px;">暂无会话</div>';
    return;
  }
  state.conversations.forEach(conv => {
    const item = document.createElement('div');
    item.className = 'conversation-item' + (conv.id === state.currentConversationId ? ' active' : '');
    item.dataset.conversationId = conv.id;
    item.innerHTML = `
      <span class="conv-name">${escapeHtml(conv.name || '新对话')}</span>
      <button class="conv-delete" title="删除">🗑️</button>
    `;
    item.addEventListener('click', (e) => {
      if (e.target.classList.contains('conv-delete')) {
        e.stopPropagation();
        deleteConversation(conv.id);
      } else {
        switchConversation(conv.id);
      }
    });
    dom.conversationList.appendChild(item);
  });
}

function updateChatTitle() {
  const conv = state.conversations.find(c => c.id === state.currentConversationId);
  dom.chatTitle.textContent = conv ? (conv.name || '对话') : '新对话';
}

async function switchConversation(conversationId) {
  if (conversationId === state.currentConversationId) return;
  state.currentConversationId = conversationId;
  // 清空当前消息
  dom.messagesList.innerHTML = '';
  // 更新选中状态
  document.querySelectorAll('.conversation-item').forEach(el => {
    el.classList.toggle('active', el.dataset.conversationId === conversationId);
  });
  updateChatTitle();
  // 加载该会话的消息历史
  await loadMessageHistory(conversationId);
}

function newConversation() {
  state.currentConversationId = '';
  dom.messagesList.innerHTML = '';
  dom.welcomeScreen.style.display = 'block';
  dom.chatTitle.textContent = '新对话';
  document.querySelectorAll('.conversation-item').forEach(el => el.classList.remove('active'));
}

async function deleteConversation(conversationId) {
  if (!confirm('确定删除这个会话吗？')) return;
  try {
    await dify.deleteConversation(conversationId);
    showToast('会话已删除', 'success');
    if (conversationId === state.currentConversationId) {
      newConversation();
    }
    await loadConversations();
  } catch (err) {
    console.error('Delete conversation error:', err);
    showToast(`删除会话失败: ${err.message}`, 'error');
  }
}

// ============ 功能3：消息历史记录 ============
async function loadMessageHistory(conversationId) {
  try {
    const data = await dify.getMessages(conversationId);
    const messages = data.data || [];
    state.messages = messages;
    if (messages.length === 0) {
      dom.welcomeScreen.style.display = 'block';
      return;
    }
    dom.welcomeScreen.style.display = 'none';
    // 逆序显示（API 返回的是倒序，最新的在前）
    [...messages].reverse().forEach(msg => {
      // 用户消息
      addMessageToUI('user', msg.query, {
        files: msg.message_files ? msg.message_files.map(f => ({
          type: f.type,
          name: f.file_name,
          preview: f.url,
        })) : [],
      });
      // 机器人消息
      const botEl = addMessageToUI('bot', msg.answer, {
        messageId: msg.id,
      });
      // 设置已有的反馈状态
      if (msg.feedback && msg.feedback.rating) {
        const btn = msg.feedback.rating === 'like'
          ? botEl.querySelector('.btn-like')
          : botEl.querySelector('.btn-dislike');
        if (btn) btn.classList.add('active');
      }
    });
  } catch (err) {
    console.error('Load message history error:', err);
    showToast(`加载消息历史失败: ${err.message}`, 'error');
  }
}

// ============ 功能4：消息反馈（点赞/点踩） ============
async function sendMessageFeedback(messageId, rating) {
  try {
    await dify.messageFeedback(messageId, rating);
    const label = rating === 'like' ? '点赞' : rating === 'dislike' ? '点踩' : '取消反馈';
    showToast(`已${label}`, 'success');
  } catch (err) {
    console.error('Feedback error:', err);
    showToast(`反馈失败: ${err.message}`, 'error');
  }
}

// ============ 事件绑定 ============
function initEventListeners() {
  // 发送消息
  dom.btnSend.addEventListener('click', sendMessage);

  // Enter 发送
  dom.messageInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  });

  // 自动调整高度
  dom.messageInput.addEventListener('input', autoResizeTextarea);

  // 新建对话
  dom.btnNewChat.addEventListener('click', () => {
    newConversation();
  });

  // 切换侧边栏
  dom.btnToggleSidebar.addEventListener('click', () => {
    dom.sidebar.classList.toggle('collapsed');
  });

  // 设置
  dom.btnSettings.addEventListener('click', () => {
    dom.settingBaseUrl.value = config.baseUrl;
    dom.settingApiKey.value = config.apiKey;
    dom.settingUser.value = config.user;
    dom.settingsModal.style.display = 'flex';
  });

  dom.btnSaveSettings.addEventListener('click', () => {
    config.baseUrl = dom.settingBaseUrl.value.trim();
    config.apiKey = dom.settingApiKey.value.trim();
    config.user = dom.settingUser.value.trim();
    localStorage.setItem('dify_baseUrl', config.baseUrl);
    localStorage.setItem('dify_apiKey', config.apiKey);
    localStorage.setItem('dify_user', config.user);
    dify = new DifyAPI(config.baseUrl, config.apiKey, config.user);
    dom.settingsModal.style.display = 'none';
    showToast('设置已保存', 'success');
    // 重新初始化
    init();
  });

  // 关闭弹窗
  document.querySelectorAll('[data-close]').forEach(btn => {
    btn.addEventListener('click', () => {
      $(btn.dataset.close).style.display = 'none';
    });
  });

  // 弹窗背景点击关闭
  document.querySelectorAll('.modal-overlay').forEach(overlay => {
    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) overlay.style.display = 'none';
    });
  });

  // 文件上传
  dom.btnAttach.addEventListener('click', () => dom.fileInput.click());
  dom.fileInput.addEventListener('change', handleFileSelect);

  // 停止生成
  dom.btnStop.addEventListener('click', stopGeneration);

  // 应用信息
  dom.btnAppInfo.addEventListener('click', showAppInfo);

  // 语音输入
  dom.btnMic.addEventListener('click', startRecording);
  dom.btnCancelRecording.addEventListener('click', cancelRecording);
  dom.btnStopRecording.addEventListener('click', finishRecording);
  dom.btnFinishRecording.addEventListener('click', finishRecording);
}

// ============ 功能5：文件上传 ============
async function handleFileSelect(e) {
  const files = Array.from(e.target.files);
  for (const file of files) {
    try {
      // 判断文件类型
      const isImage = file.type.startsWith('image/');
      const fileType = isImage ? 'image' : 'document';
      // 上传文件
      const result = await dify.uploadFile(file);
      // 生成预览
      let preview = '';
      if (isImage) {
        preview = URL.createObjectURL(file);
      }
      state.pendingFiles.push({
        file,
        fileId: result.id,
        name: file.name,
        type: fileType,
        preview,
      });
      renderFilePreviewList();
      showToast(`文件 "${file.name}" 上传成功`, 'success');
    } catch (err) {
      console.error('Upload file error:', err);
      showToast(`文件上传失败: ${err.message}`, 'error');
    }
  }
  // 清空 input 以便重复选择同一文件
  e.target.value = '';
}

function renderFilePreviewList() {
  dom.filePreviewList.innerHTML = '';
  state.pendingFiles.forEach((f, index) => {
    const item = document.createElement('div');
    item.className = 'file-preview-item';
    if (f.preview && f.type === 'image') {
      item.innerHTML = `
        <img src="${f.preview}" alt="${escapeHtml(f.name)}" />
        <span class="file-name">${escapeHtml(f.name)}</span>
        <button class="file-remove" data-index="${index}">&times;</button>
      `;
    } else {
      item.innerHTML = `
        <span>📎</span>
        <span class="file-name">${escapeHtml(f.name)}</span>
        <button class="file-remove" data-index="${index}">&times;</button>
      `;
    }
    item.querySelector('.file-remove').addEventListener('click', () => {
      state.pendingFiles.splice(index, 1);
      renderFilePreviewList();
    });
    dom.filePreviewList.appendChild(item);
  });
}

function clearPendingFiles() {
  state.pendingFiles.forEach(f => {
    if (f.preview) URL.revokeObjectURL(f.preview);
  });
  state.pendingFiles = [];
  renderFilePreviewList();
}

// ============ 功能6：停止生成 ============
async function stopGeneration() {
  if (!state.currentTaskId) {
    showToast('没有正在进行的生成任务', 'warning');
    return;
  }
  try {
    await dify.stopGenerate(state.currentTaskId);
    showToast('已停止生成', 'info');
  } catch (err) {
    console.error('Stop generation error:', err);
    showToast(`停止失败: ${err.message}`, 'error');
  }
}

// ============ 功能7：获取应用参数 ============
async function loadAppParameters() {
  try {
    const params = await dify.getParameters();
    state.appParameters = params;
    // 设置欢迎语
    if (params.opening_statement) {
      dom.welcomeTitle.textContent = '欢迎使用';
      dom.welcomeDesc.textContent = params.opening_statement;
    }
    // 渲染输入变量
    if (params.user_input_form && params.user_input_form.length > 0) {
      renderInputVariables(params.user_input_form);
    }
    // 显示开场白建议问题
    if (params.suggested_questions && params.suggested_questions.length > 0) {
      renderSuggestedQuestions(params.suggested_questions);
    }
    return params;
  } catch (err) {
    console.error('Load app parameters error:', err);
    showToast(`加载应用参数失败: ${err.message}`, 'error');
    return null;
  }
}

function renderInputVariables(formItems) {
  dom.inputVariables.innerHTML = '';
  formItems.forEach(item => {
    const key = Object.keys(item)[0];
    const config = item[key];
    const wrapper = document.createElement('div');
    wrapper.className = 'input-variable';
    wrapper.innerHTML = `
      <label>${escapeHtml(config.label || key)}</label>
      <input type="text" data-var-key="${key}" placeholder="${escapeHtml(config.placeholder || '')}" value="${escapeHtml(config.default || '')}" />
    `;
    dom.inputVariables.appendChild(wrapper);
    state.inputVariables[key] = config.default || '';
  });
  // 监听变化
  dom.inputVariables.querySelectorAll('input').forEach(input => {
    input.addEventListener('change', (e) => {
      state.inputVariables[e.target.dataset.varKey] = e.target.value;
    });
  });
}

function renderSuggestedQuestions(questions) {
  // 在欢迎屏下方添加建议问题
  const existing = dom.welcomeScreen.querySelector('.suggested-questions');
  if (existing) existing.remove();
  const container = document.createElement('div');
  container.className = 'suggested-questions';
  container.style.cssText = 'display:flex;flex-wrap:wrap;gap:8px;justify-content:center;margin-top:20px;';
  questions.forEach(q => {
    const btn = document.createElement('button');
    btn.textContent = q;
    btn.style.cssText = 'padding:8px 16px;background:var(--bg-tertiary);border:1px solid var(--border-color);border-radius:20px;color:var(--text-primary);cursor:pointer;font-size:13px;transition:all 0.2s;';
    btn.addEventListener('mouseenter', () => { btn.style.borderColor = 'var(--accent)'; });
    btn.addEventListener('mouseleave', () => { btn.style.borderColor = 'var(--border-color)'; });
    btn.addEventListener('click', () => {
      dom.messageInput.value = q;
      sendMessage();
    });
    container.appendChild(btn);
  });
  dom.welcomeScreen.appendChild(container);
}

// ============ 功能8：获取应用元信息 ============
async function showAppInfo() {
  dom.appInfoBody.innerHTML = '<p>加载中...</p>';
  dom.appInfoModal.style.display = 'flex';
  try {
    // 获取参数和元信息
    const [params, meta] = await Promise.all([
      dify.getParameters(),
      dify.getMeta(),
    ]);
    state.appParameters = params;
    state.appMeta = meta;

    let html = '';

    // 应用参数信息
    if (params) {
      html += '<div class="info-section"><h3>开场白</h3><p>' + escapeHtml(params.opening_statement || '无') + '</p></div>';

      if (params.suggested_questions && params.suggested_questions.length > 0) {
        html += '<div class="info-section"><h3>建议问题</h3><ul style="padding-left:20px;">';
        params.suggested_questions.forEach(q => {
          html += `<li>${escapeHtml(q)}</li>`;
        });
        html += '</ul></div>';
      }

      if (params.user_input_form && params.user_input_form.length > 0) {
        html += '<div class="info-section"><h3>输入变量</h3><ul style="padding-left:20px;">';
        params.user_input_form.forEach(item => {
          const key = Object.keys(item)[0];
          const config = item[key];
          html += `<li><strong>${escapeHtml(config.label || key)}</strong> (${escapeHtml(key)}) - ${escapeHtml(config.type || 'text')}</li>`;
        });
        html += '</ul></div>';
      }

      if (params.file_upload && params.file_upload.enabled) {
        html += '<div class="info-section"><h3>文件上传</h3><p>已启用</p></div>';
      }
    }

    // 工具图标信息
    if (meta && meta.tool_icons && Object.keys(meta.tool_icons).length > 0) {
      html += '<div class="info-section"><h3>工具</h3><div class="info-tools">';
      for (const [name, iconUrl] of Object.entries(meta.tool_icons)) {
        html += `<div class="info-tool"><img src="${iconUrl}" alt="${name}" />${escapeHtml(name)}</div>`;
      }
      html += '</div></div>';
    }

    dom.appInfoBody.innerHTML = html || '<p>暂无应用信息</p>';
  } catch (err) {
    console.error('Show app info error:', err);
    dom.appInfoBody.innerHTML = `<p style="color:var(--danger);">加载失败: ${escapeHtml(err.message)}</p>`;
  }
}

// ============ 功能9：文字转语音 ============
async function playTextToSpeech(text, messageId) {
  try {
    showToast('正在生成语音...', 'info');
    const blob = await dify.textToAudio(text, messageId);
    const url = URL.createObjectURL(blob);
    dom.audioPlayer.src = url;
    await dom.audioPlayer.play();
    showToast('语音播放中', 'success');
  } catch (err) {
    console.error('Text to speech error:', err);
    showToast(`语音生成失败: ${err.message}`, 'error');
  }
}

// ============ 功能10：语音转文字 ============
async function startRecording() {
  try {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    state.recordingStream = stream;
    state.audioChunks = [];
    const mimeType = MediaRecorder.isTypeSupported('audio/webm') ? 'audio/webm' : '';
    state.mediaRecorder = new MediaRecorder(stream, mimeType ? { mimeType } : {});
    state.mediaRecorder.ondataavailable = (e) => {
      if (e.data.size > 0) state.audioChunks.push(e.data);
    };
    state.mediaRecorder.start();
    dom.recordingModal.style.display = 'flex';
    dom.recordingStatus.textContent = '录音中...';
  } catch (err) {
    console.error('Start recording error:', err);
    showToast(`无法访问麦克风: ${err.message}`, 'error');
  }
}

function finishRecording() {
  if (!state.mediaRecorder || state.mediaRecorder.state === 'inactive') {
    dom.recordingModal.style.display = 'none';
    return;
  }
  state.mediaRecorder.onstop = async () => {
    dom.recordingStatus.textContent = '正在识别...';
    const audioBlob = new Blob(state.audioChunks, { type: 'audio/webm' });
    const audioFile = new File([audioBlob], 'recording.webm', { type: 'audio/webm' });
    try {
      const result = await dify.audioToText(audioFile);
      if (result.text) {
        dom.messageInput.value = result.text;
        autoResizeTextarea();
        dom.messageInput.focus();
        showToast('语音识别完成', 'success');
      } else {
        showToast('未识别到内容', 'warning');
      }
    } catch (err) {
      console.error('Audio to text error:', err);
      showToast(`语音识别失败: ${err.message}`, 'error');
    }
    // 停止所有轨道
    if (state.recordingStream) {
      state.recordingStream.getTracks().forEach(t => t.stop());
    }
    dom.recordingModal.style.display = 'none';
  };
  state.mediaRecorder.stop();
}

function cancelRecording() {
  if (state.mediaRecorder && state.mediaRecorder.state === 'recording') {
    state.mediaRecorder.stop();
  }
  if (state.recordingStream) {
    state.recordingStream.getTracks().forEach(t => t.stop());
  }
  dom.recordingModal.style.display = 'none';
}

// ============ 初始化 ============
async function init() {
  initEventListeners();
  // 加载应用参数（开场白）
  await loadAppParameters();
  // 加载会话列表
  await loadConversations();
  // 显示欢迎语
  if (state.appParameters && state.appParameters.opening_statement) {
    dom.welcomeTitle.textContent = '欢迎使用';
    dom.welcomeDesc.textContent = state.appParameters.opening_statement;
  }
}

// 启动应用
init();
