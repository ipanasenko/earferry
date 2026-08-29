package com.ipanasenko.earferry;

import java.net.URI;
import java.util.Locale;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

final class ShareUrl {
  private static final Pattern HTTP_URL = Pattern.compile("https?://[^\\s<>]+", Pattern.CASE_INSENSITIVE);
  private static final Pattern TRAILING_PUNCTUATION = Pattern.compile("[),.;!?]+$");

  private ShareUrl() {}

  static String firstYouTubeUrl(String sharedText) {
    if (sharedText == null) return null;
    Matcher matcher = HTTP_URL.matcher(sharedText);
    while (matcher.find()) {
      String candidate = TRAILING_PUNCTUATION.matcher(matcher.group()).replaceFirst("");
      try {
        URI uri = URI.create(candidate);
        String host = uri.getHost();
        if (host == null) continue;
        host = host.toLowerCase(Locale.ROOT);
        if (host.equals("youtu.be") || host.equals("youtube.com") || host.endsWith(".youtube.com") || host.equals("youtube-nocookie.com") || host.endsWith(".youtube-nocookie.com")) {
          return candidate;
        }
      } catch (IllegalArgumentException ignored) {
        // Continue looking when shared text contains a malformed URL.
      }
    }
    return null;
  }
}
