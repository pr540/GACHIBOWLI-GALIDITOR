package com.splitops.ggsplitops;

import android.app.Activity;
import android.app.AlertDialog;
import android.content.Context;
import android.content.DialogInterface;
import android.content.SharedPreferences;
import android.graphics.Bitmap;
import android.net.ConnectivityManager;
import android.net.NetworkInfo;
import android.os.Bundle;
import android.view.View;
import android.webkit.WebChromeClient;
import android.webkit.WebResourceError;
import android.webkit.WebResourceRequest;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import android.widget.EditText;
import android.widget.ProgressBar;
import android.widget.Toast;

public class MainActivity extends Activity {

    private static final String PREFS_NAME = "ggsplitops_prefs";
    private static final String KEY_SERVER_URL = "server_url";
    private static final String OFFLINE_URL = "file:///android_asset/www/index.html";

    private WebView webView;
    private ProgressBar progressBar;
    private SharedPreferences prefs;
    private String currentUrl;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        setContentView(R.layout.activity_main);

        prefs = getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE);
        currentUrl = prefs.getString(KEY_SERVER_URL, getString(R.string.default_server_url));

        webView = findViewById(R.id.webView);
        progressBar = findViewById(R.id.progressBar);

        setupWebView();
        loadInitialUrl();
    }

    private void setupWebView() {
        WebSettings settings = webView.getSettings();
        settings.setJavaScriptEnabled(true);
        settings.setDomStorageEnabled(true);
        settings.setDatabaseEnabled(true);
        settings.setUseWideViewPort(true);
        settings.setLoadWithOverviewMode(true);
        settings.setAllowFileAccess(true);
        settings.setAllowContentAccess(true);
        settings.setSupportZoom(false);
        settings.setBuiltInZoomControls(false);
        settings.setDisplayZoomControls(false);

        // Modern WebView Dark Mode
        webView.setBackgroundColor(0xFF0B0E0D);

        webView.setWebViewClient(new WebViewClient() {
            @Override
            public void onPageStarted(WebView view, String url, Bitmap favicon) {
                progressBar.setVisibility(View.VISIBLE);
            }

            @Override
            public void onPageFinished(WebView view, String url) {
                progressBar.setVisibility(View.GONE);
            }

            // Offline-first: any failed online load drops back to the bundle.
            private void fallBackToOffline(WebView view) {
                String url = view.getUrl();
                if (url == null || !url.equals(OFFLINE_URL)) {
                    Toast.makeText(MainActivity.this, "Offline mode activated", Toast.LENGTH_SHORT).show();
                    view.loadUrl(OFFLINE_URL);
                }
            }

            @Override
            public void onReceivedError(WebView view, WebResourceRequest request, WebResourceError error) {
                if (request != null && request.isForMainFrame()) {
                    fallBackToOffline(view);
                }
            }

            @Override
            public void onReceivedHttpError(WebView view, WebResourceRequest request, android.webkit.WebResourceResponse errorResponse) {
                // Cloudflare/CDN failure pages (e.g. tunnel Error 1033) load with
                // an HTTP error status instead of a network error — without this
                // the tester would stare at the error page instead of the app.
                if (request != null && request.isForMainFrame()) {
                    fallBackToOffline(view);
                }
            }
        });

        webView.setWebChromeClient(new WebChromeClient() {
            @Override
            public void onProgressChanged(WebView view, int newProgress) {
                if (newProgress < 100) {
                    progressBar.setVisibility(View.VISIBLE);
                    progressBar.setProgress(newProgress);
                } else {
                    progressBar.setVisibility(View.GONE);
                }
            }
        });

        // Long click anywhere to configure URL
        webView.setOnLongClickListener(new View.OnLongClickListener() {
            @Override
            public boolean onLongClick(View v) {
                showServerUrlDialog();
                return true;
            }
        });
    }

    private void loadInitialUrl() {
        if (isNetworkAvailable()) {
            webView.loadUrl(currentUrl);
        } else {
            webView.loadUrl(OFFLINE_URL);
        }
    }

    private boolean isNetworkAvailable() {
        ConnectivityManager cm = (ConnectivityManager) getSystemService(Context.CONNECTIVITY_SERVICE);
        if (cm != null) {
            NetworkInfo activeNetwork = cm.getActiveNetworkInfo();
            return activeNetwork != null && activeNetwork.isConnected();
        }
        return false;
    }

    public void showServerUrlDialog() {
        AlertDialog.Builder builder = new AlertDialog.Builder(this);
        builder.setTitle("Configure Server URL");
        builder.setMessage("Enter the IP or deployed URL for ggsplitops:");

        final EditText input = new EditText(this);
        input.setText(currentUrl);
        builder.setView(input);

        builder.setPositiveButton("Connect", new DialogInterface.OnClickListener() {
            @Override
            public void onClick(DialogInterface dialog, int which) {
                String newUrl = input.getText().toString().trim();
                if (!newUrl.isEmpty()) {
                    currentUrl = newUrl;
                    prefs.edit().putString(KEY_SERVER_URL, currentUrl).apply();
                    webView.loadUrl(currentUrl);
                }
            }
        });

        builder.setNeutralButton("Use Offline Mode", new DialogInterface.OnClickListener() {
            @Override
            public void onClick(DialogInterface dialog, int which) {
                webView.loadUrl(OFFLINE_URL);
            }
        });

        builder.setNegativeButton("Cancel", new DialogInterface.OnClickListener() {
            @Override
            public void onClick(DialogInterface dialog, int which) {
                dialog.cancel();
            }
        });
        builder.show();
    }

    @Override
    public void onBackPressed() {
        if (webView.canGoBack()) {
            webView.goBack();
        } else {
            super.onBackPressed();
        }
    }
}
