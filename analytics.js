/*
  USA Connected TV — site analytics (Google Analytics 4)
  Paste your GA4 Measurement ID below (looks like G-AB12CD34EF).
  Until a real ID is set, nothing is sent to Google; events are only logged
  to the browser console so the pages can be tested.

  Events sent:
    homepage_solutions_click  industry = "all" or the chip clicked
    industry_tab_click        industry = slug of the tab clicked
    industry_visit            industry, visit_source = card | website | other
    solutions_cta_click       industry, method = phone | email
*/
(function () {
  var GA_ID = "G-XXXXXXXXXX";
  var enabled = /^G-[A-Z0-9]{6,}$/.test(GA_ID) && GA_ID !== "G-XXXXXXXXXX";
  window.dataLayer = window.dataLayer || [];
  window.gtag = window.gtag || function () { window.dataLayer.push(arguments); };
  if (enabled) {
    var s = document.createElement("script");
    s.async = true;
    s.src = "https://www.googletagmanager.com/gtag/js?id=" + GA_ID;
    document.head.appendChild(s);
    window.gtag("js", new Date());
    window.gtag("config", GA_ID);
  }
  window.usaTrack = function (name, params) {
    params = params || {};
    if (enabled) window.gtag("event", name, params);
    else if (window.console) console.log("[analytics off]", name, params);
  };
})();
