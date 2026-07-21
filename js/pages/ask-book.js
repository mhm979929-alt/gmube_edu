// ============================================
// صفحة "اسأل كتابك"
// ============================================

async function renderAskBook() {
  console.log("✅ renderAskBook تم استدعاؤها");
  
  updateBottomNav("ask-book");
  document.title = "اسأل كتابك | GMube Edu";
  
  const session = Auth ? Auth.get() : null;

  // التحقق من تسجيل الدخول
  if (!session) {
    renderPage(`
      <div class="page-ask-book">
        <div class="ask-login-required">
          <i data-feather="lock" style="width:48px;height:48px;color:#555570;"></i>
          <h2>⛔ يرجى تسجيل الدخول</h2>
          <p>للاستفادة من خاصية اسأل كتابك، يرجى تسجيل الدخول أولاً</p>
          <button class="btn-primary" onclick="navigateTo('/login')">
            <i data-feather="log-in"></i>
            تسجيل الدخول
          </button>
        </div>
      </div>
    `);
    featherRefresh();
    return;
  }

  renderPage(`
    <div class="page-ask-book">
      <!-- الهيدر -->
      <div class="ask-header">
        <button class="back-btn" onclick="navigateTo('/home')">
          <i data-feather="arrow-right"></i>
        </button>
        <h1>📖 اسأل <span>كتابك</span></h1>
        <button class="menu-btn" onclick="toggleAskDrawer()">
          <i data-feather="menu"></i>
        </button>
      </div>

      <!-- المحتوى -->
      <div class="ask-content">
        <div class="ask-subtitle">
          <strong>🔍</strong> اطرح سؤالك واحصل على إجابة من كتابك
        </div>

        <div class="ask-input-group">
          <input type="text" id="askQuestionInput" placeholder="اكتب سؤالك هنا..." 
                 onkeypress="if(event.key=='Enter') askBookQuestion()">
          <button class="ask-submit-btn" id="askSubmitBtn" onclick="askBookQuestion()">
            <i data-feather="send"></i>
            اسأل
          </button>
        </div>

        <div id="askLoadingIndicator" class="ask-loading">
          <div class="spinner"></div>
          <span>جاري البحث في كتابك...</span>
        </div>

        <div id="askAnswerContainer" class="ask-answer-box">
          <span class="ask-placeholder">📚 ستظهر الإجابة من كتابك هنا</span>
        </div>

        <div class="ask-footer">
          <strong>GMube Edu</strong> — جميع الحقوق محفوظة
        </div>
      </div>
    </div>
  `);

  featherRefresh();

  // ============================================
  // إعدادات API
  // ============================================
  const SUPABASE_URL = 'https://omcdeuyumsyrwhtkvono.supabase.co';
  const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9tY2RldXl1bXN5cndodGt2b25vIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODQ0ODUwOTcsImV4cCI6MjEwMDA2MTA5N30.-HWniBIpRDxvpwugATN8TWsVaaOrxbH-P4KJC77w7Bc';
  const GROQ_KEY = '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';

  // ============================================
  // عناصر الصفحة
  // ============================================
  const questionInput = document.getElementById('askQuestionInput');
  const submitBtn = document.getElementById('askSubmitBtn');
  const loadingIndicator = document.getElementById('askLoadingIndicator');
  const answerContainer = document.getElementById('askAnswerContainer');

  // ============================================
  // إدارة التاريخ (Local Storage)
  // ============================================
  let conversationHistory = [];

  function loadAskHistory() {
    const saved = localStorage.getItem('askbook_history');
    if (saved) {
      try {
        conversationHistory = JSON.parse(saved);
      } catch (e) {
        conversationHistory = [];
      }
      renderAskDrawerHistory();
    }
  }

  function saveAskHistory() {
    localStorage.setItem('askbook_history', JSON.stringify(conversationHistory));
    renderAskDrawerHistory();
  }

  function addToAskHistory(question, answer) {
    conversationHistory.push({
      question: question,
      answer: answer,
      timestamp: new Date().toLocaleString('ar-EG')
    });
    if (conversationHistory.length > 50) {
      conversationHistory = conversationHistory.slice(-50);
    }
    saveAskHistory();
  }

  function renderAskDrawerHistory() {
    const drawerBody = document.getElementById('askDrawerBody');
    if (!drawerBody) return;

    if (conversationHistory.length === 0) {
      drawerBody.innerHTML = '<div class="ask-empty-history">لا توجد أسئلة سابقة</div>';
      return;
    }

    drawerBody.innerHTML = conversationHistory.map((item, index) => {
      const shortQ = item.question.length > 35 ? item.question.substring(0, 35) + '...' : item.question;
      return `
        <div class="ask-history-item" onclick="loadAskQuestion(${index})">
          <span class="ask-q-text">${shortQ}</span>
          <span class="ask-q-time">${item.timestamp}</span>
        </div>
      `;
    }).join('');
  }

  window.loadAskQuestion = function(index) {
    const item = conversationHistory[index];
    if (!item) return;
    questionInput.value = item.question;
    answerContainer.innerHTML = item.answer.replace(/\n/g, '<br>');
    answerContainer.classList.add('has-answer');
    toggleAskDrawer();
  };

  window.clearAskHistory = function() {
    if (confirm('مسح جميع الأسئلة السابقة؟')) {
      conversationHistory = [];
      saveAskHistory();
      renderAskDrawerHistory();
      answerContainer.innerHTML = '<span class="ask-placeholder">📚 ستظهر الإجابة من كتابك هنا</span>';
      answerContainer.classList.remove('has-answer');
      if (document.getElementById('askDrawer').classList.contains('open')) toggleAskDrawer();
    }
  };

  // ============================================
  // الشريط الجانبي (Drawer)
  // ============================================
  window.toggleAskDrawer = function() {
    const drawer = document.getElementById('askDrawer');
    const overlay = document.getElementById('askDrawerOverlay');
    if (drawer) {
      drawer.classList.toggle('open');
      overlay.classList.toggle('open');
    }
  };

  // إضافة الـ Drawer إلى الصفحة
  const drawerHTML = `
    <div id="askDrawerOverlay" class="ask-drawer-overlay" onclick="toggleAskDrawer()"></div>
    <div id="askDrawer" class="ask-drawer">
      <div class="ask-drawer-header">
        <h2><i data-feather="clock"></i> سجلي</h2>
        <button class="ask-drawer-close" onclick="toggleAskDrawer()">✕</button>
      </div>
      <div class="ask-drawer-body" id="askDrawerBody">
        <div class="ask-empty-history">لا توجد أسئلة سابقة</div>
      </div>
      <div class="ask-drawer-footer">
        <button onclick="clearAskHistory()">🗑️ مسح الكل</button>
      </div>
    </div>
  `;

  // إضافة الـ Drawer بعد الـ container
  const container = document.querySelector('.page-ask-book');
  if (container) {
    container.insertAdjacentHTML('beforeend', drawerHTML);
    featherRefresh();
  }

  // ============================================
  // البحث في Supabase
  // ============================================
  async function searchSupabase(query) {
    const words = query.split(' ').filter(w => w.length > 2);
    let allResults = [];

    for (let word of words) {
      try {
        const url = `${SUPABASE_URL}/rest/v1/knowledge_base?select=chunk_text&chunk_text=ilike.*${encodeURIComponent(word)}*&limit=3`;
        const response = await fetch(url, {
          headers: {
            'apikey': SUPABASE_KEY,
            'Authorization': `Bearer ${SUPABASE_KEY}`
          }
        });
        if (!response.ok) continue;
        const data = await response.json();
        allResults = [...allResults, ...data.map(item => item.chunk_text)];
      } catch (e) {
        console.error('Search error:', e);
      }
    }

    return [...new Set(allResults)].slice(0, 5);
  }

  // ============================================
  // الاتصال بـ Groq
  // ============================================
  async function askGroq(question, context, history) {
    let historyText = '';
    if (history.length > 0) {
      const lastQuestions = history.slice(-3);
      historyText = 'المحادثة السابقة:\n';
      lastQuestions.forEach((item, idx) => {
        historyText += `السؤال ${idx+1}: ${item.question}\nالإجابة: ${item.answer.substring(0, 150)}...\n`;
      });
      historyText += '\n';
    }

    const prompt = `أنت مساعد ذكي متخصص في المنهج الدراسي. مهمتك هي الإجابة على أسئلة الطلاب بناءً على النص المرفق فقط.

تعليمات مهمة جداً:
1. اقرأ النص بعناية.
2. إذا وجدت الإجابة في النص، قدمها بوضوح واجتهد في شرحها بأسلوب مبسط.
3. إذا لم تجد إجابة مباشرة، حاول الربط بين الأفكار الموجودة في النص لتقديم إجابة قريبة.
4. إذا كان السؤال خارج النص تماماً، قل: "عذراً، لم أجد إجابة لهذا السؤال في الكتاب المقرر."
5. لا تخترع معلومات من عندك.
6. استخدم لغة عربية سليمة ومبسطة.
7. استخدم السياق السابق لفهم السؤال الحالي وربطه بما سبق.

${historyText}

النص المرفق:
${context}

سؤال الطالب: ${question}

الإجابة:`;

    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${GROQ_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'llama-3.3-70b-versatile',
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.3
      })
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(`Groq error: ${error.error?.message || response.status}`);
    }

    const data = await response.json();
    return data.choices[0].message.content;
  }

  // ============================================
  // الدالة الرئيسية للسؤال
  // ============================================
  window.askBookQuestion = async function() {
    const question = questionInput.value.trim();

    if (!question) {
      answerContainer.innerHTML = '<div class="ask-error">⚠️ اكتب سؤالاً أولاً</div>';
      return;
    }

    submitBtn.disabled = true;
    loadingIndicator.classList.add('show');
    answerContainer.innerHTML = '';
    answerContainer.classList.remove('has-answer');

    try {
      const results = await searchSupabase(question);

      if (results.length === 0) {
        const noAnswer = '📚 عذراً، لم أجد إجابة لهذا السؤال في الكتاب المقرر.';
        answerContainer.innerHTML = noAnswer;
        answerContainer.classList.add('has-answer');
        addToAskHistory(question, noAnswer);
        return;
      }

      const context = results.join('\n\n');
      const answer = await askGroq(question, context, conversationHistory);

      answerContainer.innerHTML = answer.replace(/\n/g, '<br>');
      answerContainer.classList.add('has-answer');
      addToAskHistory(question, answer);

    } catch (error) {
      console.error(error);
      answerContainer.innerHTML = `<div class="ask-error">⚠️ حدث خطأ: ${error.message}</div>`;
    } finally {
      submitBtn.disabled = false;
      loadingIndicator.classList.remove('show');
    }
  };

  // تحميل التاريخ
  loadAskHistory();

  // إضافة حدث Enter
  if (questionInput) {
    questionInput.addEventListener('keypress', function(e) {
      if (e.key === 'Enter') {
        window.askBookQuestion();
      }
    });
  }
}

// جعل الدالة متاحة عالمياً
window.renderAskBook = renderAskBook;

console.log("✅ تم تحميل صفحة ask-book.js");