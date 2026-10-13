const state = {
  data: null,
  year: 2014,
  current: 0,
  answers: {},
  bookmarks: {},
  startedAt: null,
  deadline: null,
  finished: false,
  reviewIndex: null,
  reviewTab: "explanation",
  mode: "exam",
  yearChosen: false,
  topicFromHome: false,
  topicId: null,
  topicScope: "year",
  allYearQuestions: null,
  topicQuestions: [],
  classification: null
};

const $ = s => document.querySelector(s);

const storageKey = () => state.mode === "topic" ? `pdr-oabt-${state.topicScope === "all" ? "all" : state.year}-topic-${state.topicId}-v1` : `pdr-oabt-${state.year}-${state.mode}-v4`;
const activeQuestions = () => state.mode === "topic" ? state.topicQuestions : state.data.questions;
const questionCount = () => activeQuestions().length;

const els = {
  welcome: $("#welcomeView"),
  exam: $("#examView"),
  results: $("#resultsView"),
  topic: $("#topic"),
  number: $("#questionNumber"),
  question: $("#questionText"),
  visual: $("#questionVisual"),
  options: $("#options"),
  prev: $("#prevButton"),
  next: $("#nextButton"),
  bookmark: $("#bookmark"),
  grid: $("#questionGrid"),
  bar: $("#progressBar"),
  progressLabel: $("#progressLabel"),
  answeredLabel: $("#answeredLabel"),
  timer: $("#timer"),
  optic: $("#opticPanel"),
  finishHint: $("#finishHint"),
  modal: $("#finishModal"),
  toast: $("#toast")
};

// VERİ KAYDETME

function save() {
  localStorage.setItem(
    storageKey(),
    JSON.stringify({
      current: state.current,
      answers: state.answers,
      bookmarks: state.bookmarks,
      startedAt: state.startedAt,
      deadline: state.deadline,
      finished: state.finished
    })
  );
}

function load() {
  Object.assign(state, {
    current: 0,
    answers: {},
    bookmarks: {},
    startedAt: null,
    deadline: null,
    finished: false,
    reviewIndex: null
  });

  try {
    Object.assign(
      state,
      JSON.parse(localStorage.getItem(storageKey())) || {}
    );
  } catch (_) {}
}

function q() {
  return activeQuestions()[state.current];
}

// EKRAN YÖNETİMİ

let activeView = "welcome";
let navigationInitialized = false;
function show(view, fromHistory = false) {
  if (navigationInitialized && !fromHistory && view !== activeView) {
    history.pushState({pdrOabtView:view}, "", location.pathname + location.search);
  }
  activeView = view;
  els.welcome.hidden = view !== "welcome";
  $("#modeView").hidden = view !== "mode";
  $("#topicView").hidden = view !== "topic";
  els.exam.hidden = view !== "exam";
  els.results.hidden = view !== "results";

  window.scrollTo(0, 0);
}

function toast(message) {
  els.toast.textContent = message;
  els.toast.classList.add("show");

  clearTimeout(toast.t);

  toast.t = setTimeout(() => {
    els.toast.classList.remove("show");
  }, 1900);
}

// YIL SEÇİMİ

function applyYearLabels() {
  const y = state.year;

  // Karşılama tüm arşivi tanıtır; seçili yıl burada gösterilmez.

  const examYearLabel = $("#examYearLabel");
  if (examYearLabel) examYearLabel.textContent = `${y} sınavı`;
  $("#opticYear").textContent = y;

  $("#resultYearLabel").textContent = `${y} PDR ÖABT sonucu`;

  document.querySelectorAll("[data-year]").forEach(b => {
    b.classList.toggle(
      "active",
      Number(b.dataset.year) === y
    );
  });

  const hasProgress =
    Object.keys(state.answers).length > 0 && !state.finished;

  $("#resumeExam").hidden = !hasProgress;
}

async function selectYear(year, initial = false) {
  state.year = Number(year);

  try {
    const response = await fetch(`data/${state.year}.json`);

    if (!response.ok) {
      throw new Error("Soru verileri yüklenemedi.");
    }

    state.data = await response.json();

    load();
    applyYearLabels();

    state.yearChosen = !initial;
    document.querySelectorAll("[data-mode-year]").forEach(b => { const chosen = !initial && Number(b.dataset.modeYear) === state.year; b.classList.toggle("active", chosen); b.setAttribute("aria-pressed", String(chosen)); });
    $("#modeYear").textContent = `${state.year} PDR ÖABT`;
    $("#modeSelectedYear").hidden = initial;
    $("#modeYearPicker").hidden = !initial;
    // Sayfa yenilendiğinde daima giriş ekranında kal.
    // Kaydedilmiş sınav cevapları ve sonuçlar silinmez.
    if (initial) {
      show("welcome");
    } else {
      // Bitmiş bir sınav seçilse bile önce çözüm modu ekranı gösterilir.
      show("mode");
    }

  } catch (error) {
    console.error(error);
    toast("Bu yıla ait sorular yüklenemedi.");
  }
}


async function openTopicSelection(scope = "year") {
  state.topicScope = scope;
  try {
    if (!state.classification) {
      const response = await fetch("data/topic-classification-draft.json");
      if (!response.ok) throw new Error("Konu verisi indirilemedi");
      state.classification = await response.json();
    }
    if (scope === "all" && !state.allYearQuestions) {
      const years = Array.from({length: 13}, (_, i) => 2014 + i);
      const datasets = await Promise.all(years.map(async year => {
        const response = await fetch(`data/${year}.json`);
        if (!response.ok) throw new Error(`${year} soru dosyası alınamadı`);
        return response.json();
      }));
      state.allYearQuestions = datasets.flatMap((data, i) => data.questions.map(q => ({...q, year: years[i]})));
    }
    $("#topicScopeYear").classList.toggle("active", scope === "year");
    $("#topicScopeAll").classList.toggle("active", scope === "all");
    $("#topicScopeYear").setAttribute("aria-pressed", String(scope === "year"));
    $("#topicScopeAll").setAttribute("aria-pressed", String(scope === "all"));
    $("#topicBack").textContent = state.topicFromHome ? "← Yıllara dön" : "← Çözüm modlarına dön";
    $("#topicYearHeading").textContent = (scope === "all" ? "2014–2026 · TÜM YILLAR" : state.year + " PDR ÖABT") + " · KONU MODU";
    const rows = state.classification.questions.filter(row => (scope === "all" || row.year === state.year) && row.category);
    const list = $("#topicList");
    list.replaceChildren();
    state.classification.categories.forEach((category, index) => {
      const related = rows.filter(row => row.category === category);
      const reviewed = related.filter(row => row.status === "question_text_reviewed").length;
      const provisional = related.length - reviewed;
      const button = document.createElement("button");
      button.type = "button";
      button.className = "topic-choice";
      button.disabled = related.length === 0;
      const title = document.createElement("strong");
      title.textContent = category;
      const counts = document.createElement("span");
      counts.textContent = related.length + " soru" + (provisional ? " · " + provisional + " ön eşleştirme" : "");
      button.append(title, counts);
      if (related.length) button.onclick = () => {
        const ids = new Set(related.map(row => row.id));
        state.mode = "topic";
        state.topicId = index;
        state.topicQuestions = (scope === "all" ? state.allYearQuestions : state.data.questions).filter(q => ids.has(q.id));
        if (!state.topicQuestions.length) { toast("Bu konu için soru bulunamadı."); return; }
        load();
        begin(!state.startedAt || state.finished);
      };
      list.appendChild(button);
    });
    const unassigned = state.classification.questions.filter(row => (scope === "all" || row.year === state.year) && !row.category).length;
    $("#topicUnassigned").textContent = unassigned ? unassigned + " sınıflandırılmamış soru konu moduna dahil edilmedi." : "Soru sayıları bu yılın mevcut eşleştirmelerine dayanmaktadır.";
    show("topic");
  } catch (error) {
    console.error(error);
    toast("Konu listesi yüklenemedi.");
  }
}

// SINAVI BAŞLATMA

function begin(fresh = false) {
  if (fresh) {
    Object.assign(state, {
      current: 0,
      answers: {},
      bookmarks: {},
      finished: false,
      startedAt: Date.now()
    });

    state.deadline =
      state.startedAt +
      state.data.durationMinutes * 60 * 1000;

  } else if (!state.startedAt) {
    state.startedAt = Date.now();

    state.deadline =
      state.startedAt +
      state.data.durationMinutes * 60 * 1000;
  }

  els.exam.classList.remove("exam-finished");
  els.optic.classList.remove("open");
  els.grid.setAttribute("aria-label", "Soru numaraları");
  $("#finishExam").hidden = false;
  const legend = els.optic.querySelector(".optic-legend");
  legend.innerHTML = '<span><i class="answered"></i> Yanıtlandı</span><span><i class="flagged"></i> İşaretli</span>';
  const restart = $("#restartFromOptic");
  if (restart) restart.hidden = true;
  $("#timer").closest(".timer").hidden = (state.mode === "practice" || state.mode === "topic");
  $("#examBackHint").textContent = state.mode === "topic" ? "Konu seçimine dön" : "Mod seçimine dön";
  show("exam");
  renderQuestion();
  save();
}

// SORULARI GÖSTERME

function renderQuestion() {
  const item = q();

  els.topic.textContent = state.mode === "practice" ? "Çalışma Modu" : state.mode === "topic" ? state.classification.categories[state.topicId] : "";

  els.number.textContent =
    String(item.number).padStart(2, "0");

  // Tüm yılların kırpılmış görselleri assets/questions klasöründe.

  els.question.textContent = "";
  els.question.hidden = true;

  // ORİJİNAL SORU GÖRSELİ

  els.visual.hidden = false;

  els.visual.classList.toggle(
    "source-sheet",
    true
  );

  els.visual.src = `assets/questions/${item.year || state.year}/${String(item.number).padStart(2, "0")}.jpg`;
  els.visual.alt = `${item.year || state.year} yılı ${item.number}. soru`;
  $("#questionYearSource").textContent = `${item.year || state.year} · ${item.number}. soru`;

  // SORUYU İŞARETLEME

  els.bookmark.setAttribute(
    "aria-pressed",
    String(!!state.bookmarks[item.id])
  );

  els.bookmark.textContent = state.bookmarks[item.id]
    ? "♥ İşaretlendi"
    : "♡ Sonra bak";

  // CEVAP BUTONLARI

  els.options.innerHTML = "";

  item.options.forEach(opt => {
    const b = document.createElement("button");

    b.type = "button";

    b.className =
      "option" +
      (state.answers[item.id] === opt.key
        ? " selected"
        : "");

    b.setAttribute("role", "radio");

    b.setAttribute(
      "aria-checked",
      String(state.answers[item.id] === opt.key)
    );

    // Görsel sorularda sadece A B C D E.
    // Metin sorularda seçenek metinleri de görünür.

    b.innerHTML = `<span class="option-key">${opt.key}</span>`;

    // CEVAP BUTONUNU ÇALIŞTIRAN BÖLÜM

    b.disabled = state.finished || ((state.mode === "practice" || state.mode === "topic") && !!state.answers[item.id]);
    if (state.finished || ((state.mode === "practice" || state.mode === "topic") && !!state.answers[item.id])) {
      b.classList.toggle("review-correct", opt.key === item.answer);
      b.classList.toggle("review-wrong", opt.key === state.answers[item.id] && opt.key !== item.answer);
    }
    b.onclick = () => {
      if (state.finished || ((state.mode === "practice" || state.mode === "topic") && state.answers[item.id])) return;
      state.answers[item.id] = opt.key;
      renderQuestion();
    };

    els.options.appendChild(b);
  });

  // ÖNCEKİ / SONRAKİ SORU

  els.prev.disabled = state.current === 0;

  els.next.textContent =
    state.current === questionCount() - 1
      ? "Optik forma dön →"
      : "Sonraki soru →";

  renderProgress();
  if (!state.finished) renderGrid();
  save();
}

// İLERLEME ÇUBUĞU

function renderProgress() {
  const count = Object.keys(state.answers).length;

  const remaining =
    questionCount() - count;

  els.progressLabel.textContent =
    `Soru ${state.current + 1} / ${questionCount()}`;

  els.answeredLabel.textContent =
    `${count} yanıtlandı`;

  $("#opticTriggerCount").textContent = `${count} / ${questionCount()} yanıtlandı · Tüm soruları gör`;

  els.bar.style.width =
    `${count / questionCount() * 100}%`;

  els.finishHint.textContent = remaining
    ? `${remaining} soru kaldı`
    : "Tümü yanıtlandı";
}

// SORU NUMARALARI

function renderGrid() {
  els.grid.innerHTML = "";

  activeQuestions().forEach((item, i) => {
    const b = document.createElement("button");

    b.type = "button";
    b.className = "grid-button";
    b.textContent = item.number;
    b.title = `${item.year || state.year} · ${item.number}. soru`;

    if (state.answers[item.id]) {
      b.classList.add("answered");
    }

    if (state.bookmarks[item.id]) {
      b.classList.add("flagged");
    }

    if (i === state.current) {
      b.classList.add("current");
    }

    b.onclick = () => {
      state.current = i;
      renderQuestion();
      els.optic.classList.remove("open");
    };

    els.grid.appendChild(b);
  });
}

// SINAVI BİTİRME

function tryFinish() {
  const remaining =
    questionCount() -
    Object.keys(state.answers).length;

  els.modal.hidden = false;
}

function finish() {
  state.finished = true;

  save();

  els.modal.hidden = true;

  show("exam");
  renderResults();
}

// SONUÇ HESAPLAMA

function resultStats() {
  let correct = 0;
  let wrong = 0;
  let blank = 0;

  activeQuestions().forEach(item => {
    const answer = state.answers[item.id];

    if (!answer) {
      blank++;
    } else if (answer === item.answer) {
      correct++;
    } else {
      wrong++;
    }
  });

  return { correct, wrong, blank };
}

// SONUÇ EKRANI

function renderResults() {
  els.exam.classList.add("exam-finished");
  els.exam.classList.remove("result-reviewing");
  $("#examBackHint").textContent = state.mode === "topic" ? "Konu seçimine dön" : "Mod seçimine dön";
  els.optic.classList.add("open");
  els.grid.innerHTML = "";
  els.grid.setAttribute("aria-label", "Sınav sonucu optik formu");
  const stats = resultStats();
  els.finishHint.textContent = `${stats.correct} doğru · ${stats.wrong} yanlış · ${stats.blank} boş`;
  $("#finishExam").hidden = true;
  let restart = $("#restartFromOptic");
  if (!restart) {
    restart = document.createElement("button");
    restart.id = "restartFromOptic";
    restart.type = "button";
    restart.className = "button secondary";
    restart.textContent = "Sınavı yeniden çöz";
    restart.onclick = () => {
      if (confirm("Bu sınavın cevaplarını silip yeniden başlamak istiyor musun?")) begin(true);
    };
    els.optic.appendChild(restart);
  }
  restart.hidden = false;
  const legend = els.optic.querySelector(".optic-legend");
  legend.innerHTML = '<span><i class="result-correct"></i> Doğru</span><span><i class="result-wrong"></i> Yanlış</span><span><i class="result-blank"></i> Boş</span>';
  activeQuestions().forEach(item => {
    const selected = state.answers[item.id];
    const isCorrect = selected === item.answer;
    const cell = document.createElement("button");
    cell.type = "button";
    cell.className = "grid-button result-cell " + (!selected ? "result-blank" : isCorrect ? "result-correct" : "result-wrong");
    const number = document.createElement("span");
    number.className = "result-number";
    number.textContent = state.mode === "topic" && state.topicScope === "all" ? `${item.year} · ${item.number}` : item.number;
    const choice = document.createElement("strong");
    choice.className = "result-choice";
    choice.textContent = selected || "—";
    cell.append(number, choice);
    if (selected && !isCorrect) {
      const correct = document.createElement("small");
      correct.textContent = "Doğru " + item.answer;
      cell.appendChild(correct);
    }
    cell.title = selected ? `${item.year || state.year} soru ${item.number}: işaretlenen ${selected}, doğru ${item.answer}` : `${item.year || state.year} soru ${item.number}: boş, doğru cevap ${item.answer}`;
    cell.onclick = () => {
      const index = activeQuestions().findIndex(q => q.id === item.id);
      if (index < 0) return;
      state.current = index;
      els.exam.classList.add("result-reviewing");
      $("#examBackHint").textContent = "Sonuç optiğine dön";
      renderQuestion();
      window.scrollTo(0, 0);
    };
    els.grid.appendChild(cell);
  });
  let back = $("#backToResultOptic");
  if (!back) {
    back = document.createElement("button");
    back.type = "button";
    back.id = "backToResultOptic";
    back.className = "button secondary";
    back.textContent = "← Sonuç optiğine dön";
    back.onclick = () => { renderResults(); window.scrollTo(0, 0); };
    document.querySelector(".exam-controls").prepend(back);
  }
}
// CEVAP İNCELEME

function openReview(index, button) {
  state.reviewIndex = index;
  state.reviewTab = "explanation";

  document.querySelectorAll(".result-button").forEach(b => {
    b.classList.remove("active");
  });

  button.classList.add("active");

  document.querySelectorAll("[data-review-tab]").forEach((b, i) => {
    b.classList.toggle("active", i === 0);
  });

  $("#reviewEmpty").hidden = true;
  $("#reviewContent").hidden = false;

  renderReview();
}

function renderReview() {
  const item = activeQuestions()[state.reviewIndex];

  const user = state.answers[item.id] || "Boş";

  const visual = $("#reviewVisual");

  $("#reviewTopic").textContent = item.topic;

  $("#reviewNumber").textContent =
    `${item.number}. soru`;

  const reviewQuestion = $("#reviewQuestion");

  reviewQuestion.textContent = "";
  reviewQuestion.hidden = true;

  visual.hidden = false;

  visual.classList.toggle(
    "source-sheet",
    !!item.imageOnly
  );

  visual.src = `assets/questions/${item.year || state.year}/${String(item.number).padStart(2, "0")}.jpg`;

  $("#answerComparison").innerHTML =
    `Senin cevabın: <b>${user}</b>
     &nbsp;·&nbsp;
     Doğru cevap: <b>${item.answer}</b>`;

  $("#reviewText").textContent =
    item[state.reviewTab] || "";
}

// BUTON OLAYLARI

els.prev.onclick = () => {
  if (state.current > 0) {
    state.current--;
    renderQuestion();
  }
};

els.next.onclick = () => {
  if (state.current < questionCount() - 1) {
    state.current++;
    renderQuestion();
  } else {
    els.optic.classList.add("open");
  }
};

els.bookmark.onclick = () => {
  const id = q().id;

  state.bookmarks[id] = !state.bookmarks[id];

  renderQuestion();
};

$("#allTopicsFromHome").onclick = async () => {
  state.topicFromHome = true;
  await openTopicSelection("all");
};
$("#modeChangeYear").onclick = () => {
  $("#modeYearPicker").hidden = false;
  $("#modeSelectedYear").hidden = true;
};
document.querySelectorAll("[data-mode-year]").forEach(b => b.onclick = () => selectYear(Number(b.dataset.modeYear)));
$("#modeBack").onclick = () => show("welcome");
$("#examBack").onclick = () => {
  if (state.finished && els.exam.classList.contains("result-reviewing")) {
    renderResults();
    return;
  }
  if (!state.finished) save();
  els.optic.classList.remove("open");
  els.modal.hidden = true;
  $("#modeYear").textContent = state.year + " PDR ÖABT";
  show(state.mode === "topic" ? "topic" : "mode");
};
$("#resultsBack").onclick = () => show("mode");

$("#modeHome").onclick = e => { e.preventDefault(); show("welcome"); };
document.querySelectorAll("[data-mode]").forEach(button => button.onclick = () => {
  if (!state.yearChosen) {
    toast("Başlamak için önce bir sınav yılı seç.");
    document.querySelector(".mode-year-option")?.focus();
    return;
  }
  if (button.dataset.mode === "topic") { state.topicFromHome = false; openTopicSelection(); return; }
  state.mode = button.dataset.mode;
  state.topicQuestions = [];
  load();
  // Geri dönen kullanıcı, aynı moddaki kaydedilmiş cevaplarıyla devam eder.
  begin(!state.startedAt || state.finished);
});

$("#topicBack").onclick = () => show(state.topicFromHome ? "welcome" : "mode");
$("#topicScopeYear").onclick = () => openTopicSelection("year");
$("#topicScopeAll").onclick = () => openTopicSelection("all");
$("#topicHome").onclick = e => { e.preventDefault(); show("welcome"); };
$("#resumeExam").onclick = () => { state.yearChosen = true; begin(false); };

$("#homeButton").onclick = e => {
  e.preventDefault();
  applyYearLabels();
  show("welcome");
};

$("#openOptic").onclick = () => {
  els.optic.classList.add("open");
};

$("#closeOptic").onclick = () => {
  els.optic.classList.remove("open");
};

$("#finishExam").onclick = tryFinish;

$("#cancelFinish").onclick = () => {
  els.modal.hidden = true;
};

$("#confirmFinish").onclick = finish;

$("#restartExam").onclick = () => {
  if (
    confirm(
      "Mevcut sonuçların silinip sınav yeniden başlatılsın mı?"
    )
  ) {
    begin(true);
  }
};

document.querySelectorAll("[data-year]").forEach(b => {
  b.onclick = () => selectYear(b.dataset.year);
});

document.querySelectorAll("[data-review-tab]").forEach(b => {
  b.onclick = () => {
    document.querySelectorAll("[data-review-tab]").forEach(x => {
      x.classList.remove("active");
    });

    b.classList.add("active");

    state.reviewTab = b.dataset.reviewTab;

    renderReview();
  };
});

// SINAV SAYACI

setInterval(() => {
  if (!state.startedAt || state.finished || state.mode === "practice" || state.mode === "topic") {
    return;
  }

  const left = Math.max(
    0,
    state.deadline - Date.now()
  );

  const m = String(
    Math.floor(left / 60000)
  ).padStart(2, "0");

  const s = String(
    Math.floor(left % 60000 / 1000)
  ).padStart(2, "0");

  els.timer.textContent = `${m}:${s}`;

  if (left === 0) {
    state.finished = true;
    save();
    show("exam");
    renderResults();
  }

}, 1000);

// Tarayıcı geri/ileri tuşları uygulama ekranları arasında hareket eder.
history.replaceState({pdrOabtView:"welcome"}, "", location.pathname + location.search);
window.addEventListener("popstate", e => {
  const view = e.state && e.state.pdrOabtView;
  if (!view) { show("welcome", true); return; }
  if (view === "exam" && state.finished && !els.exam.classList.contains("result-reviewing")) renderResults();
  show(view, true);
});
// UYGULAMAYI BAŞLAT
selectYear(2014, true).then(() => { navigationInitialized = true; });