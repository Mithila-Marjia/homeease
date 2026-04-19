/**
 * Upload a service cover image to the service-images bucket (path: {uid}/{serviceId}/cover.{ext}).
 */
(function () {
  "use strict";

  function extFromFile(file) {
    var rawExt = (file.name.split(".").pop() || "jpg").toLowerCase();
    if (rawExt === "jpg" || rawExt === "jpeg" || rawExt === "png" || rawExt === "webp") {
      return rawExt === "jpeg" ? "jpg" : rawExt;
    }
    return "jpg";
  }

  /**
   * @returns {Promise<{ publicUrl: string } | { error: { message: string } }>}
   */
  window.homeEaseUploadServiceCover = async function (sb, uid, serviceId, file) {
    if (!sb || !uid || !serviceId || !file) {
      return { error: { message: "Missing upload parameters" } };
    }
    var ext = extFromFile(file);
    var path = uid + "/" + serviceId + "/cover." + ext;
    var up = await sb.storage.from("service-images").upload(path, file, {
      upsert: true,
      contentType: file.type || "image/jpeg",
    });
    if (up.error) {
      var msg = up.error.message || "";
      if (/bucket not found/i.test(msg)) {
        msg +=
          " The Storage bucket `service-images` is missing. In Supabase: open SQL Editor and run the file supabase/migrations/20260424130000_service_images_storage.sql (or run `supabase db push` from this project).";
      } else if (/row-level security|violates.*policy/i.test(msg)) {
        msg +=
          " Re-run storage policies: in SQL Editor run supabase/migrations/20260427120000_service_images_storage_rls_fix.sql (or `supabase db push`).";
      }
      return { error: { message: msg } };
    }
    var pub = sb.storage.from("service-images").getPublicUrl(path);
    var publicUrl = pub.data && pub.data.publicUrl;
    if (!publicUrl) {
      return { error: { message: "Could not resolve public URL" } };
    }
    return { publicUrl: publicUrl };
  };
})();
