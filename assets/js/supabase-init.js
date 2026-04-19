/**
 * Single Supabase client for the whole static site.
 * Depends on: config.js (see config.example.js) + @supabase/supabase-js on the page.
 */
(function () {
  "use strict";

  var client = null;

  function create() {
    var url = window.HOMEEASE_SUPABASE_URL;
    var key = window.HOMEEASE_SUPABASE_ANON_KEY;
    if (!url || !key || url.indexOf("YOUR_") === 0 || key.indexOf("YOUR_") === 0) {
      console.warn(
        "[HomeEase] Set window.HOMEEASE_SUPABASE_URL and window.HOMEEASE_SUPABASE_ANON_KEY in assets/js/config.js (copy from config.example.js)."
      );
      return null;
    }
    var lib = window.supabase;
    if (!lib || typeof lib.createClient !== "function") {
      console.error("[HomeEase] Load @supabase/supabase-js before supabase-init.js");
      return null;
    }
    return lib.createClient(url, key);
  }

  window.homeEaseSupabase = function () {
    if (!client) {
      client = create();
    }
    return client;
  };
})();
