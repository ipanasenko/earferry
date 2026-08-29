package com.ipanasenko.earferry;

public final class ShareUrlTest {
  public static void main(String[] args) {
    expect("https://youtu.be/abcdefghijk", ShareUrl.firstYouTubeUrl("Watch this https://youtu.be/abcdefghijk"));
    expect("https://www.youtube.com/watch?v=abcdefghijk", ShareUrl.firstYouTubeUrl("https://www.youtube.com/watch?v=abcdefghijk)."));
    expect(null, ShareUrl.firstYouTubeUrl("https://notyoutube.com/watch?v=abcdefghijk"));
    expect(null, ShareUrl.firstYouTubeUrl("No URL here"));
  }

  private static void expect(String expected, String actual) {
    if (expected == null ? actual != null : !expected.equals(actual)) {
      throw new AssertionError("Expected " + expected + " but got " + actual);
    }
  }
}
