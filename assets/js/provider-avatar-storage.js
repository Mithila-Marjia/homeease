/**
 * Upload provider face photo to bucket provider-avatars at {uid}/face.{ext}
 */
(function () {
  "use strict";

  var BUCKET = "provider-avatars";

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
  window.homeEaseUploadProviderAvatar = async function (sb, userId, file) {
    if (!sb || !userId || !file) {
      return { error: { message: "Missing upload parameters" } };
    }
    var ext = extFromFile(file);
    var path = userId + "/face." + ext;
    var up = await sb.storage.from(BUCKET).upload(path, file, {
      upsert: true,
      contentType: file.type || "image/jpeg",
    });
    if (up.error) {
      return { error: up.error };
    }
    var pub = sb.storage.from(BUCKET).getPublicUrl(path);
    var publicUrl = pub.data && pub.data.publicUrl;
    if (!publicUrl) {
      return { error: { message: "Could not resolve public URL" } };
    }
    return { publicUrl: publicUrl };
  };
})();
