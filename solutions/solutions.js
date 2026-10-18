/* USA Connected TV — Industry Solutions page logic */
(function () {
  var PHONE = "858-726-5524", PHONE_LINK = "tel:8587265524", EMAIL = "cory@usaconnectedtv.com";
  var list = window.USA_INDUSTRIES || [];
  var PREVIEW = !!window.USA_PREVIEW;          // set only in the chat preview
  var track = window.usaTrack || function () {};
  var tabsEl = document.getElementById("guideTabs");
  var panelEl = document.getElementById("panel");
  var current = null;

  function esc(s) { return String(s).replace(/[&<>"]/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]; }); }
  function find(slug) { for (var i = 0; i < list.length; i++) if (list[i].slug === slug) return list[i]; return null; }
  function href(slug) { return slug ? "/solutions/" + slug + "/" : "/solutions/"; }
  function slugFromPath() { var m = location.pathname.match(/\/solutions\/([^\/]+)/); return m ? m[1] : null; }

  function renderTabs() {
    tabsEl.innerHTML = list.map(function (ind) {
      var cur = current && current.slug === ind.slug ? ' aria-current="page"' : "";
      return '<a class="guide-tab" data-slug="' + ind.slug + '" href="' + href(ind.slug) + '"' + cur + ">" + esc(ind.name) + "</a>";
    }).join("");
    var on = tabsEl.querySelector('[aria-current="page"]');
    if (on) tabsEl.scrollLeft = on.offsetLeft - (tabsEl.clientWidth - on.offsetWidth) / 2;
  }

  function ctaAndPrivacy(slug) {
    return '<section class="cta-band" aria-labelledby="ctaTitle">' +
      '<div><h2 id="ctaTitle">Get a custom plan for your business</h2>' +
      "<p>Tell us your service area and goals. We’ll build your audience, show you where your commercial will run, and send you a plan.</p>" +
      '<p class="cta-incentive"><strong>Ask about our new advertiser incentive programs.</strong> New advertisers typically earn Amazon gift cards* based on investment level.</p></div>' +
      '<div class="cta-actions">' +
      '<a class="btn btn-primary" data-cta="phone" href="' + PHONE_LINK + '">Call ' + PHONE + "</a>" +
      '<a class="btn btn-ghost" data-cta="email" href="mailto:' + EMAIL + "?subject=" + encodeURIComponent("Custom plan request" + (slug ? " (" + slug + ")" : "")) + '">' + EMAIL + "</a>" +
      "</div></section>" +
      '<p class="privacy-note">Advertisers never see anyone’s personal information. Amazon matches ads to audiences on its side, and you get the results: views, completions, and actions taken.</p>' +
      '<p class="fine">*Amazon is not a sponsor of this promotion. Amazon gift cards are subject to Amazon’s gift card terms.</p>';
  }

  function renderPanel() {
    if (!current) {
      panelEl.innerHTML = '<h2 class="picker-title">Pick your industry</h2><div class="picker">' +
        list.map(function (ind) {
          return '<a class="pick" data-slug="' + ind.slug + '" href="' + href(ind.slug) + '"><h3>' + esc(ind.name) + "</h3><p>" + esc(ind.pitch) + '</p><span class="go">See your audience</span></a>';
        }).join("") + "</div>" + ctaAndPrivacy(null);
      document.title = "Industry Solutions | USA Connected TV";
      return;
    }
    var ind = current;
    panelEl.innerHTML =
      '<p class="pitch-label">' + esc(ind.name) + "</p>" +
      '<p class="pitch">' + esc(ind.pitch) + "</p>" +
      '<h2 class="reach-title">Who we’d reach for you</h2>' +
      '<p class="reach-sub">A starting point. We tailor every list to your business, your service area and the time of year.</p>' +
      '<div class="groups">' + ind.groups.map(function (g) {
        return '<div class="group"><h3>' + esc(g.title) + '</h3><div><p class="why">' + esc(g.why) + '</p><ul class="pills" aria-label="Example audiences">' +
          g.audiences.map(function (a) { return "<li>" + esc(a) + "</li>"; }).join("") + "</ul></div></div>";
      }).join("") + "</div>" +
      '<p class="pills-note">Gray tags are example audience names from Amazon Ads.</p>' +
      ctaAndPrivacy(ind.slug);
    document.title = ind.name + " Advertising on Streaming TV | USA Connected TV";
  }

  function show(slug, how) {
    current = find(slug);
    renderTabs();
    renderPanel();
    if (current && how) track("industry_visit", { industry: current.slug, visit_source: how });
    if (window.USA_onRoute) window.USA_onRoute(href(current ? current.slug : null));
  }

  function go(slug) {
    if (current && current.slug === slug) return;
    track("industry_tab_click", { industry: slug });
    if (!PREVIEW) history.pushState({ slug: slug }, "", href(slug));
    show(slug, "website");
    var guide = document.querySelector(".guide");
    if (guide && window.scrollY > guide.offsetTop) window.scrollTo({ top: guide.offsetTop, behavior: "smooth" });
  }

  document.addEventListener("click", function (e) {
    var a = e.target.closest ? e.target.closest("a[data-slug], a[data-cta]") : null;
    if (!a) return;
    if (a.hasAttribute("data-cta")) { track("solutions_cta_click", { industry: current ? current.slug : "none", method: a.getAttribute("data-cta") }); return; }
    if (e.metaKey || e.ctrlKey || e.shiftKey || e.button === 1) return;
    e.preventDefault();
    go(a.getAttribute("data-slug"));
  });

  window.addEventListener("popstate", function () { show(slugFromPath(), null); });

  // First load: where did this visit come from?
  var params = new URLSearchParams(location.search);
  var source = params.get("utm_source") === "card" ? "card"
    : (document.referrer && document.referrer.indexOf(location.host) > -1) ? "website" : "other";
  var startSlug = PREVIEW ? (window.USA_PREVIEW_START || null) : slugFromPath();
  if (startSlug && !find(startSlug) && !PREVIEW) { location.replace("/solutions/"); return; }
  show(startSlug, source);
  window.USA_go = go;
})();
