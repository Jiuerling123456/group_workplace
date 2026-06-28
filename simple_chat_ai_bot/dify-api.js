/**
 * Dify API 客户端封装
 * 文档：https://docs.dify.ai/zh-hans/api-reference
 */
class DifyAPI {
  constructor(baseUrl = 'https://api.dify.ai/v1', apiKey = '', user = 'user-123') {
    this.baseUrl = baseUrl.replace(/\/$/, '');
    this.apiKey = apiKey;
    this.user = user;
  }

  /** 构建请求头 */
  _headers(json = true) {
    const h = { 'Authorization': `Bearer ${this.apiKey}` };
    if (json) h['Content-Type'] = 'application/json';
    return h;
  }

  /** 统一错误处理 */
  _handleError(resp) {
    if (!resp.ok && resp.status >= 400) {
      return resp.json().then(err => {
        const msg = err?.message || err?.error || `HTTP ${resp.status}`;
        throw new Error(msg);
      }).catch(e => {
        if (e instanceof Error) throw e;
        throw new Error(`HTTP ${resp.status}`);
      });
    }
    return resp;
  }

  /**
   * 1. 发送对话消息（支持流式）
   * POST /chat-messages
   */
  async sendChatMessage({ query, inputs = {}, conversationId = '', files = [], responseMode = 'streaming', onMessage, onMessageEnd, onMessageReplace, onError, onTts, signal }) {
    const body = {
      query,
      inputs,
      response_mode: responseMode,
      conversation_id: conversationId,
      user: this.user,
    };
    if (files && files.length > 0) {
      body.files = files.map(f => ({
        type: f.type || 'image',
        transfer_method: f.transfer_method || 'local_file',
        url: f.url || '',
        upload_file_id: f.upload_file_id || '',
      }));
    }

    if (responseMode === 'blocking') {
      const resp = await fetch(`${this.baseUrl}/chat-messages`, {
        method: 'POST',
        headers: this._headers(),
        body: JSON.stringify(body),
        signal,
      });
      await this._handleError(resp);
      return await resp.json();
    }

    // 流式模式
    const resp = await fetch(`${this.baseUrl}/chat-messages`, {
      method: 'POST',
      headers: this._headers(),
      body: JSON.stringify(body),
      signal,
    });
    await this._handleError(resp);

    const reader = resp.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop();

      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed || !trimmed.startsWith('data:')) continue;
        const dataStr = trimmed.slice(5).trim();
        if (!dataStr) continue;
        try {
          const data = JSON.parse(dataStr);
          switch (data.event) {
            case 'message':
              onMessage?.(data);
              break;
            case 'message_end':
              onMessageEnd?.(data);
              break;
            case 'message_replace':
              onMessageReplace?.(data);
              break;
            case 'error':
              onError?.(data);
              break;
            case 'tts_message':
              onTts?.(data);
              break;
            case 'tts_message_end':
              break;
            default:
              console.log('Unhandled SSE event:', data.event, data);
          }
        } catch (e) {
          console.error('Parse SSE error:', e, dataStr);
        }
      }
    }
  }

  /**
   * 2. 停止生成
   * POST /chat-messages/{task_id}/stop
   */
  async stopGenerate(taskId) {
    const resp = await fetch(`${this.baseUrl}/chat-messages/${taskId}/stop`, {
      method: 'POST',
      headers: this._headers(),
      body: JSON.stringify({ user: this.user }),
    });
    await this._handleError(resp);
    return await resp.json();
  }

  /**
   * 3. 获取会话列表
   * GET /conversations
   */
  async getConversations(lastId = null, limit = 20) {
    const params = new URLSearchParams({ user: this.user, limit: String(limit) });
    if (lastId) params.set('last_id', lastId);
    const resp = await fetch(`${this.baseUrl}/conversations?${params}`, {
      headers: this._headers(),
    });
    await this._handleError(resp);
    return await resp.json();
  }

  /**
   * 4. 删除会话
   * DELETE /conversations/{conversation_id}
   */
  async deleteConversation(conversationId) {
    const resp = await fetch(`${this.baseUrl}/conversations/${conversationId}`, {
      method: 'DELETE',
      headers: this._headers(),
      body: JSON.stringify({ user: this.user }),
    });
    await this._handleError(resp);
    return await resp.json();
  }

  /**
   * 5. 获取消息历史
   * GET /messages
   */
  async getMessages(conversationId, firstId = null, limit = 20) {
    const params = new URLSearchParams({
      user: this.user,
      conversation_id: conversationId,
      limit: String(limit),
    });
    if (firstId) params.set('first_id', firstId);
    const resp = await fetch(`${this.baseUrl}/messages?${params}`, {
      headers: this._headers(),
    });
    await this._handleError(resp);
    return await resp.json();
  }

  /**
   * 6. 消息反馈（点赞/点踩）
   * POST /messages/{message_id}/feedbacks
   */
  async messageFeedback(messageId, rating) {
    const resp = await fetch(`${this.baseUrl}/messages/${messageId}/feedbacks`, {
      method: 'POST',
      headers: this._headers(),
      body: JSON.stringify({ rating, user: this.user }),
    });
    await this._handleError(resp);
    return await resp.json();
  }

  /**
   * 7. 文件上传
   * POST /files/upload
   */
  async uploadFile(file) {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('user', this.user);
    const resp = await fetch(`${this.baseUrl}/files/upload`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${this.apiKey}` },
      body: formData,
    });
    await this._handleError(resp);
    return await resp.json();
  }

  /**
   * 8. 获取应用参数（开场白、变量配置等）
   * GET /parameters
   */
  async getParameters() {
    const resp = await fetch(`${this.baseUrl}/parameters?user=${encodeURIComponent(this.user)}`, {
      headers: this._headers(),
    });
    await this._handleError(resp);
    return await resp.json();
  }

  /**
   * 9. 获取应用基本信息（工具图标等）
   * GET /meta
   */
  async getMeta() {
    const resp = await fetch(`${this.baseUrl}/meta?user=${encodeURIComponent(this.user)}`, {
      headers: this._headers(),
    });
    await this._handleError(resp);
    return await resp.json();
  }

  /**
   * 10. 文字转语音
   * POST /text-to-audio
   * 返回 Blob（音频文件）
   */
  async textToAudio(text, messageId = null) {
    const body = { text, user: this.user };
    if (messageId) body.message_id = messageId;
    const resp = await fetch(`${this.baseUrl}/text-to-audio`, {
      method: 'POST',
      headers: this._headers(),
      body: JSON.stringify(body),
    });
    await this._handleError(resp);
    return await resp.blob();
  }

  /**
   * 11. 语音转文字
   * POST /audio-to-text
   */
  async audioToText(file) {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('user', this.user);
    const resp = await fetch(`${this.baseUrl}/audio-to-text`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${this.apiKey}` },
      body: formData,
    });
    await this._handleError(resp);
    return await resp.json();
  }
}
