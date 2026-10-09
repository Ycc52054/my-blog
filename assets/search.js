// 浏览器端全文搜索：加载 search.json，全部在本地匹配，不需要服务器
(function () {
  var input = document.getElementById("q");
  var results = document.getElementById("results");
  var hint = document.getElementById("hint");
  if (!input || !results) return;

  var notes = [];

  fetch("search.json")
    .then(function (r) {
      return r.json();
    })
    .then(function (data) {
      notes = data;
      var q = new URLSearchParams(location.search).get("q");
      if (q) input.value = q;
      render(q || "");
    })
    .catch(function () {
      hint.textContent = "搜索索引加载失败，先运行 node build.js 再试。";
    });

  function escapeHtml(s) {
    return String(s).replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
    });
  }

  function escapeReg(s) {
    return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  }

  function highlight(text, terms) {
    var out = text;
    terms.forEach(function (t) {
      out = out.replace(new RegExp(escapeReg(t), "gi"), function (m) {
        return "\u0001" + m + "\u0002";
      });
    });
    return escapeHtml(out).replace(/\u0001/g, "<mark>").replace(/\u0002/g, "</mark>");
  }

  function snippet(text, terms) {
    var lower = text.toLowerCase();
    var at = -1;
    terms.forEach(function (t) {
      var pos = lower.indexOf(t);
      if (pos >= 0 && (at < 0 || pos < at)) at = pos;
    });
    if (at < 0) return escapeHtml(text.slice(0, 120));
    var start = Math.max(0, at - 40);
    return (start > 0 ? "…" : "") + highlight(text.slice(start, start + 160), terms) + "…";
  }

  function render(q) {
    var terms = q.toLowerCase().split(/\s+/).filter(Boolean);
    if (!terms.length) {
      results.innerHTML = "";
      hint.textContent = "共 " + notes.length + " 篇笔记。多个词用空格分隔，需要全都出现。";
      return;
    }

    var hits = notes.filter(function (n) {
      var hay = (n.title + " " + n.tags.join(" ") + " " + n.text).toLowerCase();
      return terms.every(function (t) {
        return hay.indexOf(t) >= 0;
      });
    });

    hint.textContent = hits.length
      ? "找到 " + hits.length + " 篇"
      : "没找到。换个词试试，或者新建一篇笔记。";

    results.innerHTML = hits
      .map(function (n) {
        return (
          '<li class="result">' +
          '<h2><a href="' +
          n.url +
          '">' +
          highlight(n.title, terms) +
          "</a></h2>" +
          '<p class="meta">' +
          escapeHtml(n.date || "") +
          (n.tags.length ? " · " + escapeHtml(n.tags.join(" / ")) : "") +
          "</p>" +
          '<p class="summary">' +
          snippet(n.text, terms) +
          "</p>" +
          "</li>"
        );
      })
      .join("");
  }

  var timer;
  input.addEventListener("input", function () {
    clearTimeout(timer);
    timer = setTimeout(function () {
      var q = input.value;
      history.replaceState(null, "", q ? "?q=" + encodeURIComponent(q) : location.pathname);
      render(q);
    }, 120);
  });
})();
