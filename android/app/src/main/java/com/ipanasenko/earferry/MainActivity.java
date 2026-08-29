package com.ipanasenko.earferry;

import android.app.Activity;
import android.content.Intent;
import android.net.Uri;
import android.os.Bundle;
import android.widget.Toast;

public final class MainActivity extends Activity {
  private static final String APP_URL = "https://earferry.com/";

  @Override
  protected void onCreate(Bundle savedInstanceState) {
    super.onCreate(savedInstanceState);
    forward(getIntent());
  }

  @Override
  protected void onNewIntent(Intent intent) {
    super.onNewIntent(intent);
    setIntent(intent);
    forward(intent);
  }

  private void forward(Intent intent) {
    String destination = APP_URL;
    if (Intent.ACTION_SEND.equals(intent.getAction()) && "text/plain".equals(intent.getType())) {
      String sharedText = intent.getStringExtra(Intent.EXTRA_TEXT);
      String videoUrl = ShareUrl.firstYouTubeUrl(sharedText);
      if (videoUrl == null) {
        Toast.makeText(this, R.string.invalid_share, Toast.LENGTH_LONG).show();
      } else {
        destination += "?add=" + Uri.encode(videoUrl);
      }
    }

    Intent browser = new Intent(Intent.ACTION_VIEW, Uri.parse(destination));
    browser.addCategory(Intent.CATEGORY_BROWSABLE);
    startActivity(browser);
    finish();
  }
}
