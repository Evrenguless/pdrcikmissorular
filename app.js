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
  mode: "exam"
};

const $ = s => document.querySelector(s);

const storageKey = () => `pdr-oabt-${state.year}-${state.mode}-v4`;

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
  return state.data.questions[state.current];
}

// EKRAN YÖNETİMİ

function show(view) {
  els.welcome.hidden = view !== "welcome";
  $("#modeView").hidden = view !== "mode";
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
  const c = state.data.questionCount;
  const d = state.data.durationMinutes;

  $("#welcomeYearLabel").textContent = `Çıkmış sorular · ${y}`;
  $("#welcomeQuestionCount").textContent = c;
  $("#welcomeDuration").textContent = d;

  $("#examYearLabel").textContent = `${y} sınavı`;
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

    if (state.finished) {
      show("exam");
      renderResults();
    } else {
      $("#modeYear").textContent = `${state.year} PDR ÖABT`;
      show(initial ? "welcome" : "mode");
    }

  } catch (error) {
    console.error(error);
    toast("Bu yıla ait sorular yüklenemedi.");
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
  $("#timer").closest(".timer").hidden = state.mode === "practice";
  $("#examBackHint").textContent = "Mod seçimine dön";
  show("exam");
  renderQuestion();
  save();
}

// SORULARI GÖSTERME

function renderQuestion() {
  const item = q();

  els.topic.textContent = state.mode === "practice" ? "Çalışma Modu" : "";

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

  els.visual.src = `assets/questions/${state.year}/${String(item.number).padStart(2, "0")}.jpg`;
  els.visual.alt = `${state.year} yılı ${item.number}. soru`;

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

    b.disabled = state.finished || (state.mode === "practice" && !!state.answers[item.id]);
    if (state.finished || (state.mode === "practice" && !!state.answers[item.id])) {
      b.classList.toggle("review-correct", opt.key === item.answer);
      b.classList.toggle("review-wrong", opt.key === state.answers[item.id] && opt.key !== item.answer);
    }
    b.onclick = () => {
      if (state.finished || (state.mode === "practice" && state.answers[item.id])) return;
      state.answers[item.id] = opt.key;
      renderQuestion();
    };

    els.options.appendChild(b);
  });

  // ÖNCEKİ / SONRAKİ SORU

  els.prev.disabled = state.current === 0;

  els.next.textContent =
    state.current === state.data.questionCount - 1
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
    state.data.questionCount - count;

  els.progressLabel.textContent =
    `Soru ${state.current + 1} / ${state.data.questionCount}`;

  els.answeredLabel.textContent =
    `${count} yanıtlandı`;

  els.bar.style.width =
    `${count / state.data.questionCount * 100}%`;

  els.finishHint.textContent = remaining
    ? `${remaining} soru kaldı`
    : "Tümü yanıtlandı";
}

// SORU NUMARALARI

function renderGrid() {
  els.grid.innerHTML = "";

  state.data.questions.forEach((item, i) => {
    const b = document.createElement("button");

    b.type = "button";
    b.className = "grid-button";
    b.textContent = item.number;

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
    state.data.questionCount -
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

  state.data.questions.forEach(item => {
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
  $("#examBackHint").textContent = "Mod seçimine dön";
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
  state.data.questions.forEach(item => {
    const selected = state.answers[item.id];
    const isCorrect = selected === item.answer;
    const cell = document.createElement("button");
    cell.type = "button";
    cell.className = "grid-button result-cell " + (!selected ? "result-blank" : isCorrect ? "result-correct" : "result-wrong");
    const number = document.createElement("span");
    number.className = "result-number";
    number.textContent = item.number;
    const choice = document.createElement("strong");
    choice.className = "result-choice";
    choice.textContent = selected || "—";
    cell.append(number, choice);
    if (selected && !isCorrect) {
      const correct = document.createElement("small");
      correct.textContent = "Doğru " + item.answer;
      cell.appendChild(correct);
    }
    cell.title = selected ? `Soru ${item.number}: işaretlenen ${selected}, doğru ${item.answer}` : `Soru ${item.number}: boş, doğru cevap ${item.answer}`;
    cell.onclick = () => {
      const index = state.data.questions.findIndex(q => q.id === item.id);
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
  const item = state.data.questions[state.reviewIndex];

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

  visual.src = `assets/questions/${state.year}/${String(item.number).padStart(2, "0")}.jpg`;

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
  if (state.current < state.data.questionCount - 1) {
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

$("#startExam").onclick = () => show("mode");
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
  show("mode");
};
$("#resultsBack").onclick = () => show("mode");

$("#modeHome").onclick = e => { e.preventDefault(); show("welcome"); };
document.querySelectorAll("[data-mode]").forEach(button => button.onclick = () => {
  if (button.dataset.mode === "topic") {
    toast("Konu eşleştirmeleri doğrulanıyor; henüz açılmadı.");
    return;
  }
  state.mode = button.dataset.mode;
  load();
  // Geri dönen kullanıcı, aynı moddaki kaydedilmiş cevaplarıyla devam eder.
  begin(!state.startedAt || state.finished);
});

$("#resumeExam").onclick = () => begin(false);

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
  if (!state.startedAt || state.finished || state.mode === "practice") {
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

// UYGULAMAYI BAŞLAT

selectYear(2014, true);